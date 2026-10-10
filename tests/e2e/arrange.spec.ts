import { expect, type Page, test } from "@playwright/test";
import { createNode, dragRelationship, freshApp, SCREENSHOT_DIR } from "./helpers";

/** Antal par av relationer som korsar varandra på ritytan, mätt på nodernas mittpunkter. */
async function crossings(page: Page): Promise<number> {
  return page.evaluate(() => {
    const centers = new Map<string, { x: number; y: number }>();
    for (const el of document.querySelectorAll("[data-ref^='node:'][data-part='body']")) {
      const circle = el.querySelector("[data-part='node-circle']");
      if (!circle) continue;
      const r = circle.getBoundingClientRect();
      centers.set(el.getAttribute("data-ref")?.slice(5) ?? "", {
        x: r.x + r.width / 2,
        y: r.y + r.height / 2,
      });
    }
    // Varje relation går mellan de två noder vars mittpunkter ligger närmast linjens ändar.
    const nearest = (x: number, y: number) =>
      [...centers.entries()].sort(
        (a, b) => Math.hypot(a[1].x - x, a[1].y - y) - Math.hypot(b[1].x - x, b[1].y - y),
      )[0]?.[0] ?? "";
    const edges: [string, string][] = [];
    for (const el of document.querySelectorAll("[data-ref^='relationship:'][data-part='body']")) {
      const path = el.querySelector("path");
      if (!(path instanceof SVGPathElement)) continue;
      const length = path.getTotalLength();
      const matrix = path.getScreenCTM();
      if (!matrix) continue;
      const at = (d: number) => path.getPointAtLength(d).matrixTransform(matrix);
      const a = at(0);
      const b = at(length);
      edges.push([nearest(a.x, a.y), nearest(b.x, b.y)]);
    }
    const side = (
      p: { x: number; y: number },
      q: { x: number; y: number },
      r: { x: number; y: number },
    ) => Math.sign((q.x - p.x) * (r.y - p.y) - (q.y - p.y) * (r.x - p.x));
    let count = 0;
    for (let i = 0; i < edges.length; i++) {
      for (let j = i + 1; j < edges.length; j++) {
        const [a, b] = edges[i] as [string, string];
        const [c, d] = edges[j] as [string, string];
        if (new Set([a, b, c, d]).size < 4) continue;
        const pa = centers.get(a);
        const pb = centers.get(b);
        const pc = centers.get(c);
        const pd = centers.get(d);
        if (!pa || !pb || !pc || !pd) continue;
        if (side(pa, pb, pc) !== side(pa, pb, pd) && side(pc, pd, pa) !== side(pc, pd, pb)) count++;
      }
    }
    return count;
  });
}

test.describe("automatisk placering", () => {
  test("Arrange tar bort korsningar, flyttar knutna anteckningar med och går att ångra", async ({
    page,
  }) => {
    await freshApp(page);
    // En fyrkant där båda diagonalerna och två sidor är relationer: diagonalerna korsar varandra.
    await createNode(page, 250, 220, "A");
    await createNode(page, 650, 220, "B");
    await createNode(page, 650, 520, "C");
    await createNode(page, 250, 520, "D");
    await dragRelationship(page, { x: 250, y: 220 }, { x: 650, y: 520 }, "AC");
    await dragRelationship(page, { x: 650, y: 220 }, { x: 250, y: 520 }, "BD");
    await dragRelationship(page, { x: 250, y: 220 }, { x: 650, y: 220 }, "AB");
    await page.keyboard.press("Escape");
    // En anteckning knuten till A.
    await page.getByTestId("canvas").click({ position: { x: 250, y: 220 } });
    await page.getByTestId("add-note").click();
    await page.getByTestId("inline-editor").fill("Hör till A");
    await page.keyboard.press("Enter");
    await page.keyboard.press("Escape");
    expect(await crossings(page)).toBe(1);
    await page.screenshot({ path: `${SCREENSHOT_DIR}/arrange-before.png`, animations: "disabled" });

    const note = page.locator("[data-ref^='note:'] > rect").first();
    const circleA = page.locator("[data-part='node-circle']").first();
    const offset = async () => {
      const n = await note.boundingBox();
      const a = await circleA.boundingBox();
      return { x: (n?.x ?? 0) - (a?.x ?? 0), y: (n?.y ?? 0) - (a?.y ?? 0) };
    };
    const before = await offset();

    await page.getByTestId("arrange").click();
    await expect(page.getByText("crossing relationships went from 1 to 0")).toBeVisible();
    await expect(page.getByTestId("canvas")).toHaveCSS("transform", "none");
    expect(await crossings(page)).toBe(0);
    await expect(page.locator("[data-part='node-circle']")).toHaveCount(4);
    // Anteckningen sitter kvar på samma avstånd från sin nod (vyn kan ha zoomats: jämför riktning).
    const after = await offset();
    expect(Math.sign(after.x)).toBe(Math.sign(before.x));
    await expect(page.getByTestId("canvas").locator("[data-part='note-link']")).toHaveCount(1);
    // Anteckningen ligger inte ovanpå någon nod.
    const noteBox = await note.boundingBox();
    if (!noteBox) throw new Error("anteckning saknas");
    for (const circle of await page.locator("[data-part='node-circle']").all()) {
      const c = await circle.boundingBox();
      if (!c) continue;
      const apart =
        c.x + c.width <= noteBox.x ||
        noteBox.x + noteBox.width <= c.x ||
        c.y + c.height <= noteBox.y ||
        noteBox.y + noteBox.height <= c.y;
      expect(apart).toBe(true);
    }
    await page.screenshot({ path: `${SCREENSHOT_DIR}/arrange-after.png`, animations: "disabled" });

    // En gång till: inget kvar att förbättra, bilden lämnas orörd.
    await page.getByTestId("arrange").click();
    await expect(page.getByText("No relationships cross each other")).toBeVisible();

    // Hela flytten är ett steg att ångra.
    await page.getByRole("button", { name: "Undo" }).click();
    expect(await crossings(page)).toBe(1);
  });

  test("Arrange flyttar bara de markerade noderna när minst två är markerade", async ({ page }) => {
    await freshApp(page);
    await createNode(page, 250, 220, "A");
    await createNode(page, 650, 220, "B");
    await createNode(page, 650, 520, "C");
    await createNode(page, 250, 520, "D");
    await createNode(page, 120, 620, "Utanför");
    await dragRelationship(page, { x: 250, y: 220 }, { x: 650, y: 520 }, "AC");
    await dragRelationship(page, { x: 650, y: 220 }, { x: 250, y: 520 }, "BD");
    await page.keyboard.press("Escape");
    const outside = page
      .getByTestId("canvas")
      .locator("text")
      .filter({ hasText: /^Utanför$/ });
    const zoom = page.getByTitle("Reset zoom");
    // Markera fyrkantens fyra noder med en ram.
    const box = await page.getByTestId("canvas").boundingBox();
    if (!box) throw new Error("canvas saknas");
    await page.mouse.move(box.x + 170, box.y + 140);
    await page.keyboard.down("Control");
    await page.mouse.down();
    await page.mouse.move(box.x + 740, box.y + 590, { steps: 6 });
    await page.mouse.up();
    await page.keyboard.up("Control");
    await page.getByTestId("arrange").click();
    await expect(page.getByText("went from 1 to 0")).toBeVisible();
    expect(await crossings(page)).toBe(0);
    // Noden utanför markeringen finns kvar och ingår inte i flytten.
    await expect(outside).toHaveCount(1);
    await expect(zoom).toBeVisible();
  });

  test("den stora testmodellen får färre korsningar", async ({ page }) => {
    test.setTimeout(60_000);
    await freshApp(page);
    await page.goto("/?open=test-model-200.json");
    await expect(page.getByLabel("Model name")).toHaveValue("Test model – 200 nodes");
    await page.getByRole("tab", { name: "Layers" }).click();
    await page.getByTestId("properties-visibility").click();
    const before = await crossings(page);
    await page.getByTestId("arrange").click();
    await expect(page.getByText(/crossing relationships went from \d+ to \d+/)).toBeVisible({
      timeout: 30_000,
    });
    await expect(page.getByTestId("canvas")).toHaveCSS("transform", "none");
    const after = await crossings(page);
    expect(after).toBeLessThan(before);
    await page.screenshot({ path: `${SCREENSHOT_DIR}/arrange-large.png`, animations: "disabled" });
  });
});

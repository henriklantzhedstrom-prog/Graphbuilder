import { expect, test } from "@playwright/test";
import { captionText, createNode, freshApp } from "./helpers";

test.describe("rityta", () => {
  test("knappen Add node skapar en nod; dubbelklick på tom yta gör det inte", async ({ page }) => {
    await freshApp(page);
    await page.getByTestId("canvas").dblclick({ position: { x: 300, y: 300 } });
    await expect(page.locator("[data-ref^='node:'][data-part='body']")).toHaveCount(0);
    await page.getByTestId("add-node").click();
    await page.getByTestId("inline-editor").fill("Från knappen");
    await page.getByTestId("inline-editor").press("Enter");
    await expect(page.locator("[data-ref^='node:'][data-part='body']")).toHaveCount(1);
    await page.getByTestId("add-node").click();
    await page.getByTestId("inline-editor").press("Escape");
    const nodes = page.locator("[data-ref^='node:'][data-part='body']");
    await expect(nodes).toHaveCount(2);
    const [a, b] = await nodes.evaluateAll((els) =>
      els.map((el) => el.querySelector("circle:not(.gb-halo)")?.getAttribute("cx")),
    );
    expect(a).not.toBe(b);
  });

  test("ny nod får rubrik", async ({ page }) => {
    await freshApp(page);
    await createNode(page, 300, 300, "Person");
    await expect(page.locator("[data-ref^='node:']").first()).toBeVisible();
  });

  test("dra från ringen skapar relation till ny nod", async ({ page }) => {
    await freshApp(page);
    await createNode(page, 300, 300, "A");
    const halo = page.locator("[data-part='halo']").first();
    const box = await halo.boundingBox();
    if (!box) throw new Error("halo saknas");
    // Ringen ligger strax utanför cirkeln (radie 50): starta dragningen 5 px innanför ringens ytterkant.
    const startX = box.x + box.width - 5;
    const startY = box.y + box.height / 2;
    await page.mouse.move(startX, startY);
    await page.mouse.down();
    await page.mouse.move(startX + 100, startY, { steps: 5 });
    await page.mouse.move(startX + 250, startY, { steps: 5 });
    await page.mouse.up();
    await expect(page.locator("[data-ref^='relationship:']")).toHaveCount(1);
    await expect(page.locator("[data-ref^='node:'][data-part='body']")).toHaveCount(2);
    const editor = page.getByTestId("inline-editor");
    await expect(editor).toBeVisible();
    await editor.fill("B");
    await editor.press("Enter");
    await page.locator("[data-ref^='relationship:']").first().dblclick();
    const typeEditor = page.getByTestId("inline-editor");
    await typeEditor.fill("KNOWS");
    await typeEditor.press("Enter");
    await expect(page.locator("svg text", { hasText: "KNOWS" })).toBeVisible();
  });

  test("dubbelklick på en nod öppnar redigering av rubriken", async ({ page }) => {
    await freshApp(page);
    await createNode(page, 300, 300, "Före");
    await page.getByTestId("canvas").dblclick({ position: { x: 300, y: 300 } });
    await page.getByTestId("inline-editor").fill("Efter");
    await page.getByTestId("inline-editor").press("Enter");
    await expect(captionText(page, "Efter")).toBeVisible();
  });

  test("flytta nod, ångra och gör om", async ({ page }) => {
    await freshApp(page);
    await createNode(page, 300, 300, "Flytt");
    const node = page.locator("[data-ref^='node:'][data-part='body'] circle").nth(1);
    const before = await node.boundingBox();
    if (!before) throw new Error("nod saknas");
    await page.mouse.move(before.x + before.width / 2, before.y + before.height / 2);
    await page.mouse.down();
    await page.mouse.move(before.x + before.width / 2 + 150, before.y + before.height / 2 + 60, {
      steps: 8,
    });
    await page.mouse.up();
    const after = await node.boundingBox();
    expect(after && after.x - before.x).toBeGreaterThan(140);
    await page.keyboard.press("Control+z");
    const undone = await node.boundingBox();
    expect(undone && Math.abs(undone.x - before.x)).toBeLessThan(2);
    await page.keyboard.press("Control+Shift+z");
    const redone = await node.boundingBox();
    expect(redone && redone.x - before.x).toBeGreaterThan(140);
  });

  test("rammarkering och radering", async ({ page }) => {
    await freshApp(page);
    await createNode(page, 250, 250, "X");
    await createNode(page, 450, 250, "Y");
    await page.keyboard.press("Escape");
    await page.mouse.move(150, 150);
    await page.mouse.down();
    await page.mouse.move(600, 400, { steps: 5 });
    await page.mouse.up();
    await page.keyboard.press("Delete");
    await expect(page.locator("[data-ref^='node:'][data-part='body']")).toHaveCount(0);
    await expect(
      page.getByText("Click “Add node” in the side panel to create a node"),
    ).toBeVisible();
  });

  test("modellen sparas och finns kvar efter omladdning", async ({ page }) => {
    await freshApp(page);
    await createNode(page, 300, 300, "Kvar");
    await page.waitForTimeout(800);
    await page.reload();
    await expect(captionText(page, "Kvar")).toBeVisible();
  });
});

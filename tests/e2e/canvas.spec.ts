import { expect, test } from "@playwright/test";
import { captionText, createNode, freshApp, SCREENSHOT_DIR } from "./helpers";

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

  test("dra i bakgrunden flyttar hela ytan utan att ändra modellen", async ({ page }) => {
    await freshApp(page);
    await createNode(page, 300, 300, "Fast");
    const node = page.locator(
      "[data-ref^='node:'][data-part='body'] > circle:not(.gb-halo):not([fill='none'])",
    );
    const before = await node.boundingBox();
    const model = () =>
      page.evaluate(() =>
        document.querySelector("[data-ref^='node:'] > circle:not(.gb-halo)")?.getAttribute("cx"),
      );
    const cxBefore = await model();
    const canvas = await page.getByTestId("canvas").boundingBox();
    if (!before || !canvas) throw new Error("saknas");
    await page.mouse.move(canvas.x + 600, canvas.y + 500);
    await page.mouse.down();
    await page.mouse.move(canvas.x + 700, canvas.y + 560, { steps: 6 });
    await page.mouse.up();
    const after = await node.boundingBox();
    expect(after && after.x - before.x).toBeCloseTo(100, 0);
    expect(after && after.y - before.y).toBeCloseTo(60, 0);
    expect(await model()).toBe(cxBefore);
    await expect(page.getByText("Nothing selected", { exact: true })).toBeVisible();
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

  test("Ctrl+dra på bakgrunden markerar allt inom rektangeln", async ({ page }) => {
    await freshApp(page);
    await createNode(page, 250, 250, "X");
    await createNode(page, 450, 250, "Y");
    await createNode(page, 700, 500, "Utanför");
    await page.keyboard.press("Escape");
    const canvas = page.getByTestId("canvas");
    const box = await canvas.boundingBox();
    if (!box) throw new Error("canvas saknas");
    const drag = async (modifier: "Control" | "Meta" | "Shift", from: number[], to: number[]) => {
      await page.mouse.move(box.x + (from[0] ?? 0), box.y + (from[1] ?? 0));
      await page.keyboard.down(modifier);
      await page.mouse.down();
      await page.mouse.move(box.x + (to[0] ?? 0), box.y + (to[1] ?? 0), { steps: 6 });
      // Rektangeln ritas medan man drar.
      await expect(canvas.locator("rect[stroke-dasharray]").last()).toBeVisible();
      await page.mouse.up();
      await page.keyboard.up(modifier);
    };
    const inspector = page.getByTestId("inspector");

    // Rektangel runt X och Y: de två markeras, ytan flyttas inte.
    await drag("Control", [150, 150], [560, 360]);
    await expect(inspector).toContainText("2 elements selected");
    const x = await canvas.locator("text").filter({ hasText: /^X$/ }).boundingBox();
    expect(Math.abs((x?.x ?? 0) + (x?.width ?? 0) / 2 - (box.x + 250))).toBeLessThan(3);

    // En ny rektangel ersätter markeringen (här bara den tredje noden) …
    await drag("Control", [600, 400], [820, 620]);
    await expect(inspector).toContainText("1 element selected");
    // … medan Shift lägger till i det som redan är markerat.
    await drag("Shift", [150, 150], [560, 360]);
    await expect(inspector).toContainText("3 elements selected");
    // Cmd fungerar som Ctrl (Mac).
    await drag("Meta", [150, 150], [330, 360]);
    await expect(inspector).toContainText("1 element selected");

    // De markerade går att flytta tillsammans.
    await drag("Control", [150, 150], [560, 360]);
    await page.mouse.move(box.x + 250, box.y + 250);
    await page.mouse.down();
    await page.mouse.move(box.x + 250, box.y + 400, { steps: 6 });
    await page.mouse.up();
    const y = await canvas.locator("text").filter({ hasText: /^Y$/ }).first().boundingBox();
    expect(Math.abs((y?.y ?? 0) + (y?.height ?? 0) / 2 - (box.y + 400))).toBeLessThan(4);
  });

  test("rammarkering och radering", async ({ page }) => {
    await freshApp(page);
    await createNode(page, 250, 250, "X");
    await createNode(page, 450, 250, "Y");
    await page.keyboard.press("Escape");
    await page.mouse.move(150, 150);
    await page.keyboard.down("Shift");
    await page.mouse.down();
    await page.mouse.move(600, 400, { steps: 5 });
    await page.mouse.up();
    await page.keyboard.up("Shift");
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

  test("zoomen glider mjukt: ett hack på mushjulet ger ett lagom steg, inte ett hopp", async ({
    page,
  }) => {
    await freshApp(page);
    await createNode(page, 400, 300, "Mitten");
    const level = page.getByTitle("Reset zoom");
    await expect(level).toHaveText("100 %");

    // Hjulet zoomar direkt, utan någon tangent. Ett hack (100 px) ger ca 25 %.
    await page.mouse.move(400, 400);
    await page.mouse.wheel(0, -100);
    await expect(level).toHaveText("125 %");
    // Ett snabbsnurrande hjul (många hack i en händelse) ger ändå bara ett steg.
    await level.click();
    await expect(level).toHaveText("100 %");
    await page.mouse.move(400, 400);
    await page.mouse.wheel(0, -900);
    await expect(level).toHaveText("125 %");
    // Hjulet flyttar inte ytan i sidled: zoomnivån är det enda som ändras av sidrullning.
    await level.click();
    await expect(level).toHaveText("100 %");
    await page.mouse.move(400, 400);
    await page.mouse.wheel(300, 0);
    await page.waitForTimeout(300);
    await expect(level).toHaveText("100 %");
    await expect(captionText(page, "Mitten")).toBeInViewport();
    // Ctrl+hjul (och nypning på styrplatta) zoomar också.
    await page.keyboard.down("Control");
    await page.mouse.wheel(0, -100);
    await page.keyboard.up("Control");
    await expect(level).toHaveText("125 %");

    // Knapparna tar ett steg i taget och landar på jämna nivåer.
    await level.click();
    await expect(level).toHaveText("100 %");
    await page.getByRole("button", { name: "Zoom in" }).click();
    await expect(level).toHaveText("120 %");

    // Vägen dit går via mellanlägen (glidning), inte i ett enda hopp.
    const seen = await page.evaluate(async () => {
      const el = document.querySelector('[title="Reset zoom"]');
      const values = new Set<string>();
      const observer = new MutationObserver(() => values.add(el?.textContent ?? ""));
      if (el) observer.observe(el, { childList: true, characterData: true, subtree: true });
      (document.querySelector('[aria-label="Zoom in"]') as HTMLButtonElement).click();
      await new Promise((resolve) => setTimeout(resolve, 600));
      observer.disconnect();
      return [...values];
    });
    expect(seen.length).toBeGreaterThan(2);
    await expect(level).toHaveText("144 %");
  });

  test("under zoom flyttas den färdiga ytan; innehållet ritas om när vyn landat", async ({
    page,
  }) => {
    await freshApp(page);
    await createNode(page, 400, 300, "Mitten");
    await page.keyboard.press("Escape");
    const canvas = page.getByTestId("canvas");
    const box = await canvas.boundingBox();
    if (!box) throw new Error("canvas saknas");
    // Zooma in med pekaren på noden och klicka direkt, mitt i glidningen: noden ligger kvar
    // under pekaren och går att markera.
    await page.mouse.move(box.x + 400, box.y + 300);
    await page.mouse.wheel(0, -100);
    await page.mouse.click(box.x + 400, box.y + 300);
    await expect(page.getByTestId("inspector")).toContainText("1 element selected");
    // När vyn landat är ytan tillbaka på plats och innehållet ritat i den nya skalan.
    await expect(page.getByTitle("Reset zoom")).toHaveText("125 %");
    await expect(canvas).toHaveCSS("transform", "none");
    await expect(canvas.locator("> g")).toHaveAttribute("transform", /scale\(1\.2[45]/);
    const node = await captionText(page, "Mitten").boundingBox();
    if (!node) throw new Error("nod saknas");
    expect(Math.abs(node.x + node.width / 2 - (box.x + 400))).toBeLessThan(3);
    expect(Math.abs(node.y + node.height / 2 - (box.y + 300))).toBeLessThan(3);
  });

  test("testmodellen med 200 noder öppnas via länk och visas i sin helhet", async ({ page }) => {
    await freshApp(page);
    await page.goto("/?open=test-model-200.json");
    await expect(page.getByLabel("Model name")).toHaveValue("Test model – 200 nodes");
    await expect(page).toHaveURL(/\/$/);
    await page.getByRole("tab", { name: "Layers" }).click();
    await expect(page.getByTestId("layer-row")).toHaveCount(10);
    await expect(page.getByTestId("layer-row").first()).toContainText("Customers");
    // Hela modellen ryms i vyn: zoomen har anpassats (under 100 %).
    await expect(page.getByTitle("Reset zoom")).not.toHaveText("100 %");
    await expect(page.getByTestId("canvas")).toHaveCSS("transform", "none");
    await page.screenshot({ path: `${SCREENSHOT_DIR}/test-model-200.png`, animations: "disabled" });
    // Modellen ligger bland "My models" och finns kvar efter omladdning.
    await page.waitForTimeout(900);
    await page.reload();
    await expect(page.getByLabel("Model name")).toHaveValue("Test model – 200 nodes");
  });
});

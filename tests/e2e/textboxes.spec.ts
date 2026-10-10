import { expect, test } from "@playwright/test";
import { createNode, dragRelationship, freshApp, SCREENSHOT_DIR } from "./helpers";

/** Avstånd i px mellan textens kanter och rutans kanter (vänster, höger). */
async function margins(page: import("@playwright/test").Page, textContent: string) {
  return page.evaluate((needle) => {
    const text = [...document.querySelectorAll("[data-testid='canvas'] text")].find(
      (t) => t.textContent === needle,
    ) as SVGTextElement | undefined;
    const rect = text?.previousElementSibling as SVGRectElement | null;
    if (!text || !rect) return null;
    const tb = text.getBBox();
    const rb = rect.getBBox();
    return { left: tb.x - rb.x, right: rb.x + rb.width - (tb.x + tb.width) };
  }, textContent);
}

test("rutan runt labels och relationstyper har samma marginal oavsett text", async ({ page }) => {
  await freshApp(page);
  const labels = ["III", "WWW", "Person", "VeryLongLabelName"];
  await createNode(page, 450, 300, "Node");
  for (const label of labels) {
    await page.getByPlaceholder("New label").fill(label);
    await page.getByPlaceholder("New label").press("Enter");
  }
  for (const label of labels) {
    const m = await margins(page, label);
    expect(m, label).not.toBeNull();
    expect(Math.abs((m?.left ?? 0) - 8), `${label} vänster`).toBeLessThan(1.5);
    expect(Math.abs((m?.right ?? 0) - 8), `${label} höger`).toBeLessThan(1.5);
  }
  await createNode(page, 450, 550, "Other");
  await dragRelationship(page, { x: 450, y: 300 }, { x: 450, y: 550 }, "WORKS_WITH_MANY");
  const m = await margins(page, "WORKS_WITH_MANY");
  expect(Math.abs((m?.left ?? 0) - 5)).toBeLessThan(1.5);
  expect(Math.abs((m?.right ?? 0) - 5)).toBeLessThan(1.5);
});

test("egenskaper är vänsterställda i sin ruta", async ({ page }) => {
  await freshApp(page);
  await createNode(page, 450, 300, "Node");
  await page.getByPlaceholder("Key").fill("a");
  await page.getByPlaceholder("Key").press("Enter");
  await page.getByPlaceholder("Key").fill("description");
  await page.getByPlaceholder("Key").press("Enter");
  await page.getByLabel("Value").nth(2).fill("A much longer property value");
  await page.keyboard.press("Escape");
  const rows = page.locator("[data-part='property-text'] tspan");
  await expect(rows).toHaveCount(3);
  const background = await page.locator("[data-part='property-background']").boundingBox();
  const boxes = await Promise.all([0, 1, 2].map((i) => rows.nth(i).boundingBox()));
  if (!background || boxes.some((b) => !b)) throw new Error("egenskaper saknas");
  const lefts = boxes.map((b) => b?.x ?? 0);
  const widths = boxes.map((b) => b?.width ?? 0);
  // Raderna är olika långa men börjar vid samma vänsterkant, strax innanför rutans kant.
  expect(Math.max(...widths) - Math.min(...widths)).toBeGreaterThan(50);
  expect(Math.max(...lefts) - Math.min(...lefts)).toBeLessThan(1);
  expect((lefts[0] ?? 0) - background.x).toBeGreaterThan(3);
  expect((lefts[0] ?? 0) - background.x).toBeLessThan(10);
  // Rutan ligger fortfarande mitt under noden.
  const node = await page.locator("[data-ref^='node:'] circle").first().boundingBox();
  if (!node) throw new Error("nod saknas");
  expect(Math.abs(background.x + background.width / 2 - (node.x + node.width / 2))).toBeLessThan(2);
  await page.screenshot({
    path: `${SCREENSHOT_DIR}/properties-left-aligned.png`,
    animations: "disabled",
    clip: { x: 250, y: 200, width: 400, height: 260 },
  });
});

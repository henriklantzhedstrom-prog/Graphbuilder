import { expect, test } from "@playwright/test";
import { createNode, dragRelationship, freshApp } from "./helpers";

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

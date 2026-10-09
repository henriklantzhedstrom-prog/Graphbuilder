import { expect, test } from "@playwright/test";
import { createNode, dragRelationship, freshApp, SCREENSHOT_DIR } from "./helpers";

test.use({ viewport: { width: 1280, height: 800 } });

test("skärmdump: graf med tre noder och två relationer", async ({ page }) => {
  await freshApp(page);
  await createNode(page, 300, 300, "Person");
  await createNode(page, 650, 300, "Company");
  await createNode(page, 475, 540, "City");
  await dragRelationship(page, { x: 300, y: 300 }, { x: 650, y: 300 }, "WORKS_AT");
  await dragRelationship(page, { x: 300, y: 300 }, { x: 475, y: 540 }, "LIVES_IN");
  await expect(page.locator("[data-ref^='relationship:']")).toHaveCount(2);
  await page.getByTestId("canvas").click({ position: { x: 300, y: 300 } });
  await page.screenshot({ path: `${SCREENSHOT_DIR}/canvas-graph.png` });
});

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

test("skärmdump: egenskapspanel och lagerpanel", async ({ page }) => {
  await freshApp(page);
  await createNode(page, 300, 300, "Person");
  await createNode(page, 650, 300, "Company");
  await dragRelationship(page, { x: 300, y: 300 }, { x: 650, y: 300 }, "WORKS_AT");
  await page.getByTestId("canvas").click({ position: { x: 300, y: 300 } });
  await page.getByPlaceholder("Ny label").fill("Person");
  await page.getByPlaceholder("Ny label").press("Enter");
  await page.getByPlaceholder("Nyckel").fill("name");
  await page.getByPlaceholder("Nyckel").press("Enter");
  await page.getByLabel("Värde").fill("Alice");
  await page.getByTitle("#a9c9f5").click();
  await page.screenshot({ path: `${SCREENSHOT_DIR}/inspector-node.png` });
  await page.getByRole("tab", { name: "Lager" }).click();
  await page.getByTestId("add-layer").click();
  await createNode(page, 475, 540, "City");
  await page.getByTestId("layer-row").nth(0).getByTestId("layer-name").dblclick();
  await page.getByLabel("Lagrets namn").fill("Platser");
  await page.getByLabel("Lagrets namn").press("Enter");
  await page.screenshot({ path: `${SCREENSHOT_DIR}/layers-panel.png` });
});

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

test("skärmdump: anteckning och bakgrundsbild i lager", async ({ page }) => {
  await freshApp(page);
  const chooser = page.waitForEvent("filechooser");
  await page.getByRole("button", { name: "Bild…" }).click();
  await (await chooser).setFiles({
    name: "karta.png",
    mimeType: "image/png",
    buffer: Buffer.from(
      "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==",
      "base64",
    ),
  });
  await expect(page.locator("[data-ref^='image:'] image")).toHaveCount(1);
  await page.getByLabel("Bredd").fill("700");
  await page.getByLabel("Höjd").fill("420");
  await page.getByLabel("Opacitet").fill("0.25");
  await page.getByRole("button", { name: "Lägg i lagret Bakgrund" }).click();
  await page.keyboard.press("Escape");
  await createNode(page, 300, 300, "Person");
  await createNode(page, 650, 300, "Company");
  await dragRelationship(page, { x: 300, y: 300 }, { x: 650, y: 300 }, "WORKS_AT");
  await page.getByRole("button", { name: "Anteckning" }).click();
  await page.getByTestId("canvas").click({ position: { x: 420, y: 470 } });
  await page.getByTestId("inline-editor").fill("Att göra: lägg till adress på Company");
  await page.getByTestId("canvas").click({ position: { x: 800, y: 650 } });
  await page.locator("[data-ref^='note:'] > rect").click();
  await page.getByTitle("#ffcc80").click();
  await page.getByRole("tab", { name: "Lager" }).click();
  await page.screenshot({ path: `${SCREENSHOT_DIR}/notes-and-image.png` });
});

test("skärmdump: exportdialog med Cypher", async ({ page }) => {
  await freshApp(page);
  await createNode(page, 300, 300, "Person");
  await createNode(page, 650, 300, "Company");
  await dragRelationship(page, { x: 300, y: 300 }, { x: 650, y: 300 }, "WORKS_AT");
  await page.getByTestId("canvas").click({ position: { x: 300, y: 300 } });
  await page.getByPlaceholder("Ny label").fill("Person");
  await page.getByPlaceholder("Ny label").press("Enter");
  await page.keyboard.press("Control+e");
  await page.getByRole("tab", { name: "Cypher" }).click();
  await expect(page.getByTestId("export-preview")).toContainText("CREATE");
  await page.screenshot({ path: `${SCREENSHOT_DIR}/export-cypher.png` });
});

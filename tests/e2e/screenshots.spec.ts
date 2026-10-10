import { expect, test } from "@playwright/test";
import { createNode, dragRelationship, freshApp, SCREENSHOT_DIR } from "./helpers";

test.use({ viewport: { width: 1280, height: 800 } });

// Menyer och dialogrutor tonas in; bilden tas först när de har öppnats helt.
const SHOT = { animations: "disabled" } as const;

test("skärmdump: graf med tre noder och två relationer", async ({ page }) => {
  await freshApp(page);
  await createNode(page, 300, 300, "Person");
  await createNode(page, 650, 300, "Company");
  await createNode(page, 475, 540, "City");
  await dragRelationship(page, { x: 300, y: 300 }, { x: 650, y: 300 }, "WORKS_AT");
  await dragRelationship(page, { x: 300, y: 300 }, { x: 475, y: 540 }, "LIVES_IN");
  await expect(page.locator("[data-ref^='relationship:']")).toHaveCount(2);
  await page.getByTestId("canvas").click({ position: { x: 300, y: 300 } });
  await page.screenshot({ path: `${SCREENSHOT_DIR}/canvas-graph.png`, ...SHOT });
});

test("skärmdump: egenskapspanel och lagerpanel", async ({ page }) => {
  await freshApp(page);
  await createNode(page, 300, 300, "Person");
  await createNode(page, 650, 300, "Company");
  await dragRelationship(page, { x: 300, y: 300 }, { x: 650, y: 300 }, "WORKS_AT");
  await page.getByTestId("canvas").click({ position: { x: 300, y: 300 } });
  await page.getByPlaceholder("New label").fill("Person");
  await page.getByPlaceholder("New label").press("Enter");
  await page.getByPlaceholder("Key").fill("name");
  await page.getByPlaceholder("Key").press("Enter");
  await page.getByLabel("Value").fill("Alice");
  await page.locator("[data-field='Fill']").getByTitle("#0a84ff").click();
  await page.screenshot({ path: `${SCREENSHOT_DIR}/inspector-node.png`, ...SHOT });
  await page.getByRole("tab", { name: "Layers" }).click();
  await page.getByTestId("add-layer").click();
  await createNode(page, 475, 540, "City");
  await page.getByTestId("layer-row").nth(0).getByTestId("layer-name").dblclick();
  await page.getByLabel("Layer name").fill("Platser");
  await page.getByLabel("Layer name").press("Enter");
  await page.screenshot({ path: `${SCREENSHOT_DIR}/layers-panel.png`, ...SHOT });
});

test("skärmdump: anteckning och bakgrundsbild i lager", async ({ page }) => {
  await freshApp(page);
  const chooser = page.waitForEvent("filechooser");
  await page.getByRole("button", { name: "Image…" }).click();
  await (await chooser).setFiles({
    name: "karta.png",
    mimeType: "image/png",
    buffer: Buffer.from(
      "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==",
      "base64",
    ),
  });
  await expect(page.locator("[data-ref^='image:'] image")).toHaveCount(1);
  await page.getByLabel("Width").fill("700");
  await page.getByLabel("Height").fill("420");
  await page.getByLabel("Opacity").fill("0.25");
  await page.getByRole("button", { name: "Move to the Background layer" }).click();
  await page.keyboard.press("Escape");
  await createNode(page, 300, 300, "Person");
  await createNode(page, 650, 300, "Company");
  await dragRelationship(page, { x: 300, y: 300 }, { x: 650, y: 300 }, "WORKS_AT");
  await page.getByRole("button", { name: "Note" }).click();
  await page.getByTestId("canvas").click({ position: { x: 420, y: 470 } });
  await page.getByTestId("inline-editor").fill("Att göra: lägg till adress på Company");
  await page.getByTestId("canvas").click({ position: { x: 800, y: 650 } });
  await page.locator("[data-ref^='note:'] > rect").click();
  await page.locator("[data-field='Color']").getByTitle("#ff9500").click();
  await page.getByRole("tab", { name: "Layers" }).click();
  await page.screenshot({ path: `${SCREENSHOT_DIR}/notes-and-image.png`, ...SHOT });
});

test("skärmdump: exportdialog med Cypher", async ({ page }) => {
  await freshApp(page);
  await createNode(page, 300, 300, "Person");
  await createNode(page, 650, 300, "Company");
  await dragRelationship(page, { x: 300, y: 300 }, { x: 650, y: 300 }, "WORKS_AT");
  await page.getByTestId("canvas").click({ position: { x: 300, y: 300 } });
  await page.getByPlaceholder("New label").fill("Person");
  await page.getByPlaceholder("New label").press("Enter");
  await page.keyboard.press("Control+e");
  await page.getByRole("tab", { name: "Cypher" }).click();
  await expect(page.getByTestId("export-preview")).toContainText("CREATE");
  await page.screenshot({ path: `${SCREENSHOT_DIR}/export-cypher.png`, ...SHOT });
});

test.describe("mörkt tema", () => {
  // Datorn i mörkt läge: appen ska ändå starta ljust och bara bli mörk via knappen.
  test.use({ colorScheme: "dark" });
  test("skärmdump: mörkt tema", async ({ page }) => {
    await freshApp(page);
    await createNode(page, 300, 300, "Person");
    await createNode(page, 650, 300, "Company");
    await dragRelationship(page, { x: 300, y: 300 }, { x: 650, y: 300 }, "WORKS_AT");
    await page.getByRole("tab", { name: "Layers" }).click();
    await page.getByTestId("theme-toggle").click();
    await page.screenshot({ path: `${SCREENSHOT_DIR}/dark-theme.png`, ...SHOT });
  });
});

test("skärmdump: flera relationer mellan samma två noder", async ({ page }) => {
  await freshApp(page);
  await createNode(page, 200, 300, "A");
  await createNode(page, 700, 300, "B");
  await dragRelationship(page, { x: 200, y: 300 }, { x: 700, y: 300 }, "KNOWS");
  await dragRelationship(page, { x: 200, y: 300 }, { x: 700, y: 300 }, "WORKS_WITH");
  await dragRelationship(page, { x: 200, y: 300 }, { x: 700, y: 300 }, "LIKES");
  await expect(page.locator("[data-ref^='relationship:']")).toHaveCount(3);
  await page.keyboard.press("Escape");
  await page.screenshot({ path: `${SCREENSHOT_DIR}/parallel-relationships.png`, ...SHOT });
});

test("skärmdump: relation passerar bakom egenskaper", async ({ page }) => {
  await freshApp(page);
  await createNode(page, 200, 280, "A");
  await createNode(page, 650, 280, "B");
  await createNode(page, 425, 200, "Mitten");
  await page.getByPlaceholder("Key").fill("description");
  await page.getByPlaceholder("Key").press("Enter");
  await page.getByLabel("Value").nth(1).fill("A long property text");
  await dragRelationship(page, { x: 200, y: 280 }, { x: 650, y: 280 }, "PASSES");
  await page.keyboard.press("Escape");
  // Mitt på egenskapsraden ska bakgrunden ligga överst, inte relationen.
  const box = await page.locator("[data-part='property-background']").nth(2).boundingBox();
  if (!box) throw new Error("bakgrund saknas");
  const hit = await page.evaluate(
    ([x, y]) =>
      document
        .elementFromPoint(x ?? 0, y ?? 0)
        ?.closest("[data-ref]")
        ?.getAttribute("data-ref"),
    [box.x + 4, box.y + box.height / 2],
  );
  expect(hit?.startsWith("node:")).toBe(true);
  await page.screenshot({ path: `${SCREENSHOT_DIR}/property-background.png`, ...SHOT });
});

test("skärmdump: labels med olika längd", async ({ page }) => {
  await freshApp(page);
  await createNode(page, 450, 300, "Node");
  for (const label of ["III", "WWW", "Person", "VeryLongLabelName"]) {
    await page.getByPlaceholder("New label").fill(label);
    await page.getByPlaceholder("New label").press("Enter");
  }
  await page.keyboard.press("Escape");
  await page.screenshot({
    path: `${SCREENSHOT_DIR}/label-margins.png`,
    ...SHOT,
    clip: { x: 150, y: 180, width: 600, height: 120 },
  });
});

test("skärmdump: File-menyn och modellens standardstil", async ({ page }) => {
  await freshApp(page);
  await createNode(page, 300, 300, "Person");
  await page.keyboard.press("Escape");
  await expect(page.getByRole("heading", { name: "Model default style" })).toBeVisible();
  await page.getByRole("button", { name: "File" }).click();
  await expect(page.getByRole("menuitem", { name: "Save as file…" })).toBeVisible();
  await page.screenshot({ path: `${SCREENSHOT_DIR}/file-menu.png`, ...SHOT });
});

test("skärmdump: relation markerad i egenskapspanelen", async ({ page }) => {
  await freshApp(page);
  await createNode(page, 300, 300, "Person");
  await createNode(page, 650, 300, "Company");
  await dragRelationship(page, { x: 300, y: 300 }, { x: 650, y: 300 }, "WORKS_AT");
  await expect(page.getByTestId("inspector-type")).toHaveValue("WORKS_AT");
  await page.screenshot({ path: `${SCREENSHOT_DIR}/inspector-relationship.png`, ...SHOT });
});

test("skärmdump: mina modeller och kortkommandon", async ({ page }) => {
  await freshApp(page);
  await createNode(page, 300, 300, "Person");
  await page.getByRole("button", { name: "My models" }).click();
  await expect(page.getByTestId("document-row")).toHaveCount(1);
  await page.screenshot({ path: `${SCREENSHOT_DIR}/my-models.png`, ...SHOT });
  await page.keyboard.press("Escape");
  await page.getByRole("button", { name: "Keyboard shortcuts" }).click();
  await expect(page.getByRole("heading", { name: "Keyboard shortcuts" })).toBeVisible();
  await page.screenshot({ path: `${SCREENSHOT_DIR}/shortcuts.png`, ...SHOT });
});

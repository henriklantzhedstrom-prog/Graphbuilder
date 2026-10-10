import { expect, test } from "@playwright/test";
import { createNode, dragRelationship, freshApp, SCREENSHOT_DIR } from "./helpers";

test.describe("redigering direkt på ritytan", () => {
  test("dubbelklick på en nod: rubrik på plats, labels i en ruta ovanför och egenskaper under", async ({
    page,
  }) => {
    await freshApp(page);
    await createNode(page, 450, 320, "Alice");
    const canvas = page.getByTestId("canvas");
    const editor = page.getByTestId("details-editor");
    await expect(editor).toHaveCount(0);

    await canvas.dblclick({ position: { x: 450, y: 320 } });
    await expect(page.getByTestId("inline-editor")).toBeFocused();
    const labels = editor.locator("[data-details='labels']");
    const properties = editor.locator("[data-details='properties']");
    await expect(labels).toBeVisible();
    await expect(properties).toBeVisible();
    // Rutorna ligger mitt över respektive mitt under noden, utan att täcka den.
    const node = await page.locator("[data-part='node-circle']").boundingBox();
    const labelsBox = await labels.boundingBox();
    const propertiesBox = await properties.boundingBox();
    if (!node || !labelsBox || !propertiesBox) throw new Error("rutor saknas");
    expect(labelsBox.y + labelsBox.height).toBeLessThan(node.y);
    expect(propertiesBox.y).toBeGreaterThan(node.y + node.height);
    const center = node.x + node.width / 2;
    expect(Math.abs(labelsBox.x + labelsBox.width / 2 - center)).toBeLessThan(2);
    expect(Math.abs(propertiesBox.x + propertiesBox.width / 2 - center)).toBeLessThan(2);
    // Den ritade egenskapslistan ersätts av rutan medan man redigerar.
    await expect(canvas.locator("[data-part='property-text']")).toHaveCount(0);

    // Skriv om rubriken, gå vidare med Tab och fyll i labels och egenskaper utan musen.
    await page.keyboard.type("Alice Andersson");
    await page.keyboard.press("Tab");
    await expect(labels.getByPlaceholder("New label")).toBeFocused();
    await page.keyboard.type("Person");
    await page.keyboard.press("Enter");
    await page.keyboard.type("Employee");
    await page.keyboard.press("Enter");
    await expect(labels).toContainText("Person");
    await expect(labels).toContainText("Employee");
    await page.screenshot({ path: `${SCREENSHOT_DIR}/details-editor.png`, animations: "disabled" });

    await properties.getByPlaceholder("Key").click();
    await page.keyboard.type("age");
    await page.keyboard.press("Enter");
    await page.keyboard.type("42");
    await page.keyboard.press("Enter");
    await page.keyboard.type("city: Lund");
    await page.keyboard.press("Enter");

    // Esc avslutar; allt är sparat och ritas som vanligt igen.
    await page.keyboard.press("Escape");
    await expect(editor).toHaveCount(0);
    await expect(canvas.locator("[data-part='label-box'] + text")).toHaveText([
      "Person",
      "Employee",
    ]);
    await expect(canvas.locator("[data-part='property-text'] tspan")).toHaveText([
      "name: Alice Andersson",
      "age: 42",
      "city: Lund",
    ]);
  });

  test("dubbelklick på en label eller egenskap sätter markören där; klick utanför sparar", async ({
    page,
  }) => {
    await freshApp(page);
    await createNode(page, 450, 320, "A");
    await page.getByPlaceholder("New label").fill("Person");
    await page.getByPlaceholder("New label").press("Enter");
    await page.keyboard.press("Escape");
    const canvas = page.getByTestId("canvas");
    const editor = page.getByTestId("details-editor");

    // På en label: markören hamnar i labelfältet, rubriken står kvar som text.
    await canvas.locator("[data-part='label-box']").dblclick();
    await expect(
      editor.locator("[data-details='labels']").getByPlaceholder("New label"),
    ).toBeFocused();
    await expect(page.getByTestId("inline-editor")).toHaveCount(0);
    // Text som står kvar i fältet sparas när man klickar på ritytan.
    await page.keyboard.type("Manager");
    await canvas.click({ position: { x: 120, y: 520 } });
    await expect(editor).toHaveCount(0);
    await expect(canvas.locator("[data-part='label-box']")).toHaveCount(2);

    // På egenskaperna: markören hamnar i första värdet, färdigt att skriva över.
    await canvas.locator("[data-part='property-background']").dblclick();
    await expect(editor.locator("[data-property-value='name']")).toBeFocused();
    await page.keyboard.type("Anna");
    await page.keyboard.press("Enter");
    await page.keyboard.type("role: Lead");
    await canvas.click({ position: { x: 120, y: 520 } });
    await expect(canvas.locator("[data-part='property-text'] tspan")).toHaveText([
      "name: Anna",
      "role: Lead",
    ]);

    // Enter i rubriken är klart, precis som förut: allt stängs.
    await canvas.dblclick({ position: { x: 450, y: 320 } });
    await expect(editor).toBeVisible();
    await page.getByTestId("inline-editor").fill("Bea");
    await page.getByTestId("inline-editor").press("Enter");
    await expect(editor).toHaveCount(0);
    await expect(canvas.locator("text").filter({ hasText: /^Bea$/ })).toHaveCount(1);

    // En ny nod från knappen öppnar bara rubriken, så att det går fort att lägga till flera.
    await page.getByTestId("add-node").click();
    await expect(page.getByTestId("inline-editor")).toBeVisible();
    await expect(editor).toHaveCount(0);
  });

  test("dubbelklick på en relation: typen på plats och egenskaperna under den", async ({
    page,
  }) => {
    await freshApp(page);
    await createNode(page, 250, 300, "A");
    await createNode(page, 650, 300, "B");
    await dragRelationship(page, { x: 250, y: 300 }, { x: 650, y: 300 }, "KNOWS");
    await page.keyboard.press("Escape");
    const canvas = page.getByTestId("canvas");
    const editor = page.getByTestId("details-editor");

    await canvas.dblclick({ position: { x: 450, y: 300 } });
    await expect(page.getByTestId("inline-editor")).toBeFocused();
    await expect(editor.locator("[data-details='labels']")).toHaveCount(0);
    await expect(editor.locator("[data-details='properties']")).toBeVisible();
    await page.keyboard.press("Tab");
    await page.keyboard.type("since: 2019");
    await page.keyboard.press("Enter");
    await page.keyboard.press("Escape");
    await expect(editor).toHaveCount(0);
    await expect(
      canvas.locator("[data-ref^='relationship:'] [data-part='property-text']"),
    ).toHaveText("since: 2019");
  });

  test("lång egenskapslista rullar i rutan utan att ritytan zoomar", async ({ page }) => {
    await freshApp(page);
    await page.goto("/?open=test-model-200.json");
    await expect(page.getByLabel("Model name")).toHaveValue("Test model – 200 nodes");
    const level = page.getByTitle("Reset zoom");
    await expect(page.getByTestId("canvas")).toHaveCSS("transform", "none");
    const zoomBefore = await level.textContent();
    await page.locator("[data-part='node-circle']").first().dblclick();
    const properties = page.locator("[data-details='properties']");
    await expect(properties).toBeVisible();
    const box = await properties.boundingBox();
    if (!box) throw new Error("ruta saknas");
    await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2);
    await page.mouse.wheel(0, 300);
    await page.waitForTimeout(300);
    await expect(level).toHaveText(zoomBefore ?? "");
    expect(await properties.evaluate((el) => el.scrollTop)).toBeGreaterThan(0);
  });
});

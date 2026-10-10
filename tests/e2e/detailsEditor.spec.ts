import { expect, test } from "@playwright/test";
import { createNode, dragRelationship, freshApp, SCREENSHOT_DIR } from "./helpers";

test.describe("redigering direkt på ritytan", () => {
  test("dubbelklick på en nod: skriv labels och egenskaper direkt där de ritas", async ({
    page,
  }) => {
    await freshApp(page);
    await createNode(page, 450, 320, "Alice");
    await page.getByPlaceholder("New label").fill("Person");
    await page.getByPlaceholder("New label").press("Enter");
    await page.keyboard.press("Escape");
    const canvas = page.getByTestId("canvas");
    const editor = page.getByTestId("details-editor");
    await expect(editor).toHaveCount(0);

    // Var labeln och egenskapsraden ritas, före redigering.
    const drawnLabel = await canvas.locator("[data-part='label-box']").boundingBox();
    const drawnRow = await canvas.locator("[data-part='property-text'] tspan").boundingBox();
    if (!drawnLabel || !drawnRow) throw new Error("ritade delar saknas");

    await canvas.dblclick({ position: { x: 450, y: 320 } });
    await expect(page.getByTestId("inline-editor")).toBeFocused();
    const label = editor.getByLabel("Label", { exact: true });
    const row = editor.getByLabel("Property (key: value)");
    await expect(label).toHaveValue("Person");
    await expect(row).toHaveValue("name: Alice");
    // Fälten ligger på samma plats och har samma storlek som det ritade.
    const labelBox = await label.boundingBox();
    const rowBox = await row.boundingBox();
    if (!labelBox || !rowBox) throw new Error("fält saknas");
    expect(Math.abs(labelBox.x - drawnLabel.x)).toBeLessThan(3);
    expect(Math.abs(labelBox.y - drawnLabel.y)).toBeLessThan(3);
    expect(Math.abs(labelBox.height - drawnLabel.height)).toBeLessThan(3);
    expect(Math.abs(rowBox.x - drawnRow.x)).toBeLessThan(3);
    expect(Math.abs(rowBox.y - drawnRow.y)).toBeLessThan(4);
    // Det ritade ersätts av fälten medan man redigerar, så inget syns dubbelt.
    await expect(canvas.locator("[data-part='label-box']")).toHaveCount(0);
    await expect(canvas.locator("[data-part='property-text']")).toHaveCount(0);

    // Rubrik, Tab, och sedan allt med tangentbordet: Enter sparar och går till nästa fält.
    await page.keyboard.type("Alice Andersson");
    await page.keyboard.press("Tab");
    await expect(label).toBeFocused();
    await page.keyboard.type("Human");
    await page.keyboard.press("Enter");
    await expect(editor.getByLabel("Add label")).toBeFocused();
    await page.keyboard.type("Employee");
    await page.keyboard.press("Enter");
    await page.keyboard.type("Manager");
    await page.keyboard.press("Enter");
    await expect(label).toHaveCount(3);
    await page.keyboard.press("Tab");
    await expect(row.first()).toBeFocused();
    await page.keyboard.press("Enter");
    await expect(editor.getByLabel("Add property")).toBeFocused();
    await page.keyboard.type("age: 42");
    await page.keyboard.press("Enter");
    await page.keyboard.type("city: Lund");
    await page.keyboard.press("Enter");
    await expect(row).toHaveCount(3);
    await page.screenshot({ path: `${SCREENSHOT_DIR}/details-editor.png`, animations: "disabled" });

    // Esc avslutar; allt är sparat och ritas som vanligt igen.
    await page.keyboard.press("Escape");
    await expect(editor).toHaveCount(0);
    await expect(canvas.locator("[data-part='label-box'] + text")).toHaveText([
      "Human",
      "Employee",
      "Manager",
    ]);
    await expect(canvas.locator("[data-part='property-text'] tspan")).toHaveText([
      "name: Alice Andersson",
      "age: 42",
      "city: Lund",
    ]);
  });

  test("ändra, ta bort och felmeddelanden; klick utanför sparar", async ({ page }) => {
    await freshApp(page);
    await createNode(page, 250, 320, "A");
    await page.getByPlaceholder("New label").fill("Person");
    await page.getByPlaceholder("New label").press("Enter");
    await createNode(page, 650, 320, "B");
    const canvas = page.getByTestId("canvas");
    const editor = page.getByTestId("details-editor");
    const rows = canvas.locator("[data-part='property-text']").last().locator("tspan");

    // Dubbelklick på egenskaperna sätter markören i första raden, färdig att skriva över.
    await canvas.locator("[data-part='property-background']").last().dblclick();
    const row = editor.getByLabel("Property (key: value)");
    await expect(row.first()).toBeFocused();
    await expect(page.getByTestId("inline-editor")).toHaveCount(0);
    await page.keyboard.type("name: Bea");
    await page.keyboard.press("Enter");
    // Nyckel som redan finns, eller bara siffror, sparas inte och förklaras.
    await page.keyboard.type("name: again");
    await page.keyboard.press("Enter");
    await expect(page.getByTestId("details-error")).toContainText("already a property");
    await editor.getByLabel("Add property").fill("2024: x");
    await editor.getByLabel("Add property").press("Enter");
    await expect(page.getByTestId("details-error")).toContainText("only digits");
    await editor.getByLabel("Add property").fill("role: Lead");
    await editor.getByLabel("Add property").press("Enter");
    await expect(page.getByTestId("details-error")).toHaveCount(0);
    // Byt nyckel och värde på en befintlig rad; en tömd rad tas bort.
    await row.nth(1).fill("title: Head of design");
    await row.nth(1).press("Enter");
    await editor.getByLabel("Add property").fill("temp: 1");
    await editor.getByLabel("Add property").press("Enter");
    await row.nth(2).fill("");
    // Text som står kvar i ett fält sparas när man klickar på ritytan.
    await editor.getByLabel("Add property").fill("team: Blue");
    await canvas.click({ position: { x: 450, y: 560 } });
    await expect(editor).toHaveCount(0);
    await expect(rows).toHaveText(["name: Bea", "title: Head of design", "team: Blue"]);

    // Dubbelklick på en label sätter markören i den. Samma label som en annan nod stoppas.
    await canvas.dblclick({ position: { x: 650, y: 320 } });
    await editor.getByLabel("Add label").fill("Person");
    await editor.getByLabel("Add label").press("Enter");
    await expect(page.getByTestId("details-error")).toContainText("already has the labels");
    await editor.getByLabel("Add label").fill("Company");
    await editor.getByLabel("Add label").press("Enter");
    await page.keyboard.press("Escape");
    await canvas.locator("[data-part='label-box']").last().dblclick();
    await expect(editor.getByLabel("Label", { exact: true })).toBeFocused();
    await page.keyboard.type("Organisation");
    await page.keyboard.press("Escape");
    await expect(canvas.locator("[data-part='label-box'] + text")).toHaveText([
      "Person",
      "Organisation",
    ]);
    // En tömd label tas bort.
    await canvas.locator("[data-part='label-box']").last().dblclick();
    await editor.getByLabel("Label", { exact: true }).fill("");
    await page.keyboard.press("Escape");
    await expect(canvas.locator("[data-part='label-box']")).toHaveCount(1);
  });

  test("Enter i rubriken är klart; ny nod öppnar bara rubriken; relationer får egenskaper", async ({
    page,
  }) => {
    await freshApp(page);
    await createNode(page, 250, 300, "A");
    await createNode(page, 650, 300, "B");
    await dragRelationship(page, { x: 250, y: 300 }, { x: 650, y: 300 }, "KNOWS");
    await page.keyboard.press("Escape");
    const canvas = page.getByTestId("canvas");
    const editor = page.getByTestId("details-editor");

    await canvas.dblclick({ position: { x: 250, y: 300 } });
    await expect(editor).toBeVisible();
    await page.getByTestId("inline-editor").fill("Anna");
    await page.getByTestId("inline-editor").press("Enter");
    await expect(editor).toHaveCount(0);
    await expect(canvas.locator("text").filter({ hasText: /^Anna$/ })).toHaveCount(1);

    // Relation: typen redigeras på plats och egenskaperna direkt under den.
    await canvas.dblclick({ position: { x: 450, y: 300 } });
    await expect(page.getByTestId("inline-editor")).toBeFocused();
    await expect(editor.locator("[data-details='labels']")).toHaveCount(0);
    await page.keyboard.press("Tab");
    await expect(editor.getByLabel("Add property")).toBeFocused();
    await page.keyboard.type("since: 2019");
    await page.keyboard.press("Enter");
    await page.keyboard.press("Escape");
    await expect(
      canvas.locator("[data-ref^='relationship:'] [data-part='property-text']"),
    ).toHaveText("since: 2019");

    // En ny nod från knappen öppnar bara rubriken, så att det går fort att lägga till flera.
    await page.getByTestId("add-node").click();
    await expect(page.getByTestId("inline-editor")).toBeVisible();
    await expect(editor).toHaveCount(0);
  });

  test("fälten följer zoomen och stämmer med det ritade även inzoomat", async ({ page }) => {
    await freshApp(page);
    await createNode(page, 450, 320, "A");
    await page.keyboard.press("Escape");
    const canvas = page.getByTestId("canvas");
    await page.mouse.move(450, 400);
    await page.mouse.wheel(0, -100);
    await page.mouse.wheel(0, -100);
    await expect(canvas).toHaveCSS("transform", "none");
    const drawn = await canvas.locator("[data-part='property-text'] tspan").boundingBox();
    const node = await page.locator("[data-part='node-circle']").boundingBox();
    if (!drawn || !node) throw new Error("ritat saknas");
    await page.mouse.dblclick(node.x + node.width / 2, node.y + node.height / 2);
    const row = page.getByTestId("details-editor").getByLabel("Property (key: value)");
    const box = await row.boundingBox();
    if (!box) throw new Error("fält saknas");
    expect(Math.abs(box.x - drawn.x)).toBeLessThan(4);
    expect(Math.abs(box.y - drawn.y)).toBeLessThan(5);
    expect(Math.abs(box.height - drawn.height)).toBeLessThan(5);
  });
});

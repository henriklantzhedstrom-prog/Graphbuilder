import { expect, test } from "@playwright/test";
import { captionText, createNode, dragRelationship, freshApp } from "./helpers";

test.describe("egenskapspanel", () => {
  test("redigerar rubrik, label, egenskap och färg på en nod", async ({ page }) => {
    await freshApp(page);
    await createNode(page, 300, 300, "Alice");
    await page.getByTestId("canvas").click({ position: { x: 300, y: 300 } });
    const inspector = page.getByTestId("inspector");
    await expect(inspector).toBeVisible();

    // Rubriken från ritytan blir egenskapen "name", förkryssad som rubrik.
    await expect(page.getByTestId("inspector-caption")).toHaveCount(0);
    await expect(page.getByLabel("Use “name” as caption")).toBeChecked();
    await page.getByLabel("Value").first().fill("Alice Andersson");
    await expect(page.locator("svg text", { hasText: "Alice" }).first()).toBeVisible();

    await page.getByPlaceholder("New label").fill("Person");
    await page.getByPlaceholder("New label").press("Enter");
    await expect(page.locator("svg text", { hasText: "Person" })).toBeVisible();

    await page.getByPlaceholder("Key").fill("ålder");
    await page.getByPlaceholder("Key").press("Enter");
    await page.getByLabel("Value").nth(1).fill("42");
    await expect(page.locator("svg text", { hasText: "ålder: 42" })).toBeVisible();

    // Kryssa för en annan egenskap som rubrik: den visas i noden, name flyttar till listan.
    await page.getByLabel("Use “ålder” as caption").check();
    await expect(page.getByLabel("Use “name” as caption")).not.toBeChecked();
    // Både rubrikegenskapen och de andra står kvar i listan under noden.
    await expect(page.locator("svg text", { hasText: "name: Alice Andersson" })).toBeVisible();
    await expect(page.locator("svg text", { hasText: "ålder: 42" })).toBeVisible();
    // Avkryssad: ingen rubrik alls.
    await page.getByLabel("Use “ålder” as caption").uncheck();
    await expect(page.locator("svg text", { hasText: "ålder: 42" })).toBeVisible();
    await page.getByLabel("Use “name” as caption").check();

    await page.getByTitle("#ff3b30").click();
    await expect(page.locator("[data-ref^='node:'] circle[fill='#ff3b30']")).toHaveCount(1);
    await page.getByRole("button", { name: "Reset to model style" }).click();
    await expect(page.locator("[data-ref^='node:'] circle[fill='#ffffff']")).toHaveCount(1);
  });

  test("vänder relation och ändrar typ", async ({ page }) => {
    await freshApp(page);
    await createNode(page, 300, 300, "A");
    await createNode(page, 650, 300, "B");
    await dragRelationship(page, { x: 300, y: 300 }, { x: 650, y: 300 }, "LIKES");
    await page.locator("[data-ref^='relationship:']").first().click();
    await page.getByTestId("inspector-type").fill("LOVES");
    await expect(page.locator("svg text", { hasText: "LOVES" })).toBeVisible();
    const arrowBefore = await page
      .locator("[data-ref^='relationship:'] polygon")
      .getAttribute("points");
    await page.getByRole("button", { name: "Reverse direction" }).click();
    const arrowAfter = await page
      .locator("[data-ref^='relationship:'] polygon")
      .getAttribute("points");
    expect(arrowAfter).not.toBe(arrowBefore);
  });

  test("modellens standardstil ändrar alla noder", async ({ page }) => {
    await freshApp(page);
    await createNode(page, 300, 300, "A");
    await createNode(page, 650, 300, "B");
    await page.keyboard.press("Escape");
    await expect(page.getByRole("heading", { name: "Model default style" })).toBeVisible();
    await page.getByLabel("Radius").fill("30");
    await expect(page.locator("[data-ref^='node:'] circle[r='30']")).toHaveCount(2);
  });

  test("utan markering gäller stiländringen alla synliga noder, även de med egen stil", async ({
    page,
  }) => {
    await freshApp(page);
    await createNode(page, 250, 300, "A");
    await page.getByTitle("#ff3b30").click();
    await createNode(page, 600, 300, "B");
    await page.getByRole("tab", { name: "Layers" }).click();
    await page.getByTestId("add-layer").click();
    await createNode(page, 425, 500, "Dold");
    await page.getByRole("tab", { name: "Layers" }).click();
    await page.getByTestId("layer-row").nth(0).getByTestId("layer-visibility").click();
    await expect(captionText(page, "Dold")).toHaveCount(0);

    await page.keyboard.press("Escape");
    await page.getByRole("tab", { name: "Style" }).click();
    await expect(page.getByText("Nothing selected", { exact: true })).toBeVisible();
    await page.getByTitle("#34c759").click();
    // Båda synliga noderna blir gröna, även A som hade en egen röd färg.
    await expect(page.locator("[data-ref^='node:'] > circle[fill='#34c759']")).toHaveCount(2);
    await expect(page.locator("[data-ref^='node:'] > circle[fill='#ff3b30']")).toHaveCount(0);

    // Den dolda noden är oförändrad (vit) när lagret visas igen.
    await page.getByRole("tab", { name: "Layers" }).click();
    await page.getByTestId("layer-row").nth(0).getByTestId("layer-visibility").click();
    await expect(page.locator("[data-ref^='node:'] > circle[fill='#ffffff']")).toHaveCount(1);
    await expect(page.locator("[data-ref^='node:'] > circle[fill='#34c759']")).toHaveCount(2);
  });

  test("sifferfält går att tömma och skriva om, och håller sig inom gränserna", async ({
    page,
  }) => {
    await freshApp(page);
    await createNode(page, 300, 300, "A");
    await page.keyboard.press("Escape");
    const radius = page.getByLabel("Radius");
    const node = page.locator("[data-ref^='node:'] > circle").last();
    await expect(node).toHaveAttribute("r", "50");

    // Sudda siffra för siffra och skriv ett nytt värde.
    await radius.click();
    await radius.press("End");
    await radius.press("Backspace");
    await radius.press("Backspace");
    await expect(radius).toHaveValue("");
    await expect(node).toHaveAttribute("r", "50");
    await radius.pressSequentially("80");
    await expect(node).toHaveAttribute("r", "80");

    // Noll är för litet: noden ändras inte medan man skriver, och fältet rättas till minsta värdet.
    await radius.fill("0");
    await expect(node).toHaveAttribute("r", "80");
    await radius.press("Enter");
    await expect(radius).toHaveValue("10");
    await expect(node).toHaveAttribute("r", "10");

    // Tomt fält som lämnas återgår till det gällande värdet, och modellen går att öppna igen.
    await radius.fill("");
    await radius.press("Tab");
    await expect(radius).toHaveValue("10");
    await page.waitForTimeout(900);
    await page.reload();
    await expect(captionText(page, "A")).toBeVisible();
    await expect(page.locator("[data-ref^='node:'] > circle").last()).toHaveAttribute("r", "10");
  });

  test("rubriken går att läsa när noden får mörk fyllning", async ({ page }) => {
    await freshApp(page);
    await createNode(page, 300, 300, "Mörk");
    const caption = captionText(page, "Mörk");
    await expect(caption).toHaveAttribute("fill", "#000000");
    // Svart fyllning med svart rubrik syns inte: rubriken blir vit.
    await page.getByTitle("#000000").click();
    await expect(page.locator("[data-ref^='node:'] > circle[fill='#000000']")).toHaveCount(1);
    await expect(caption).toHaveAttribute("fill", "#ffffff");
    // Tillbaka till vit fyllning: rubriken blir svart igen.
    await page.getByTitle("#ffffff").click();
    await expect(caption).toHaveAttribute("fill", "#000000");
    // En klar färg går att läsa med svart text och ändrar inte rubriken.
    await page.getByTitle("#ffd60a").click();
    await expect(caption).toHaveAttribute("fill", "#000000");
  });

  test("av/på-val visar mellanläge när de markerade relationerna har olika värden", async ({
    page,
  }) => {
    await freshApp(page);
    await createNode(page, 200, 250, "A");
    await createNode(page, 600, 250, "B");
    await createNode(page, 400, 520, "C");
    await dragRelationship(page, { x: 200, y: 250 }, { x: 600, y: 250 }, "ONE");
    await page.getByLabel("Dashed line").check();
    await dragRelationship(page, { x: 200, y: 250 }, { x: 400, y: 520 }, "TWO");
    const dashed = page.getByLabel("Dashed line");
    await expect(dashed).not.toBeChecked();

    // Markera båda relationerna: den ena streckad, den andra inte.
    await page.keyboard.press("Escape");
    await page.getByTestId("canvas").click({ position: { x: 400, y: 250 } });
    await page.keyboard.down("Shift");
    await page.getByTestId("canvas").click({ position: { x: 300, y: 385 } });
    await page.keyboard.up("Shift");
    await expect(page.getByTestId("inspector")).toContainText("2 elements selected");
    await expect(dashed).toHaveJSProperty("indeterminate", true);
    await expect(dashed).toHaveAttribute("aria-checked", "mixed");
    // Samma värde för båda: inget mellanläge.
    await expect(page.getByLabel("Directed")).toHaveJSProperty("indeterminate", false);

    // Ett klick slår på valet för alla markerade.
    await dashed.click();
    await expect(dashed).toBeChecked();
    await expect(dashed).toHaveJSProperty("indeterminate", false);
    await expect(page.locator("[data-ref^='relationship:'] path[stroke-dasharray]")).toHaveCount(2);
  });

  test("Enter sparar labels och egenskaper och flyttar markören till nästa fält", async ({
    page,
  }) => {
    await freshApp(page);
    await createNode(page, 300, 300, "A");
    const canvas = page.getByTestId("canvas");

    // Label: skriv, Enter, skriv nästa direkt.
    await page.getByPlaceholder("New label").click();
    await page.keyboard.type("Person");
    await page.keyboard.press("Enter");
    await page.keyboard.type("Employee");
    await page.keyboard.press("Enter");
    await expect(canvas.locator("text").filter({ hasText: /^Person$/ })).toHaveCount(1);
    await expect(canvas.locator("text").filter({ hasText: /^Employee$/ })).toHaveCount(1);

    // Egenskap: nyckel, Enter, värde, Enter, nästa nyckel – utan att röra musen.
    await page.getByPlaceholder("Key").click();
    await page.keyboard.type("age");
    await page.keyboard.press("Enter");
    await page.keyboard.type("42");
    await page.keyboard.press("Enter");
    await page.keyboard.type("city");
    await page.keyboard.press("Enter");
    await page.keyboard.type("Lund");
    await page.keyboard.press("Enter");
    const properties = canvas.locator("[data-part='property-text'] tspan");
    await expect(properties).toHaveText(["name: A", "age: 42", "city: Lund"]);
    await expect(page.getByPlaceholder("Key")).toBeFocused();

    // "nyckel: värde" på en rad sparar båda på en gång.
    await page.keyboard.type("role: Head of design");
    await page.keyboard.press("Enter");
    await expect(properties).toHaveText([
      "name: A",
      "age: 42",
      "city: Lund",
      "role: Head of design",
    ]);

    // En nyckel som redan finns töms inte; markören går till dess värde.
    await page.keyboard.type("age");
    await page.keyboard.press("Enter");
    await expect(properties.nth(1)).toHaveText("age: 42");
    await expect(page.locator("[data-property-value='age']")).toBeFocused();

    // Bara siffror som namn stoppas med en förklaring.
    await page.getByPlaceholder("Key").fill("2024");
    await page.getByPlaceholder("Key").press("Enter");
    await expect(page.getByTestId("property-error")).toContainText("only digits");
    await expect(properties).toHaveCount(4);
    await page.getByPlaceholder("Key").fill("");

    // Det som står kvar i ett fält sparas också när man klickar någon annanstans.
    await page.getByPlaceholder("Key").fill("team: Blue");
    await page.getByPlaceholder("New label").fill("Manager");
    await canvas.click({ position: { x: 700, y: 550 } });
    await canvas.click({ position: { x: 300, y: 300 } });
    await expect(properties).toHaveCount(5);
    await expect(properties.nth(4)).toHaveText("team: Blue");
    await expect(canvas.locator("text").filter({ hasText: /^Manager$/ })).toHaveCount(1);

    // Byta namn till ett som redan används skriver inte över den andra egenskapen.
    const cityKey = page.getByLabel("Key", { exact: true }).nth(2);
    await expect(cityKey).toHaveValue("city");
    await cityKey.fill("age");
    await cityKey.press("Enter");
    await expect(page.getByTestId("property-error")).toContainText("already a property");
    await expect(properties).toHaveCount(5);
    await expect(properties.nth(2)).toHaveText("city: Lund");
  });
});

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

    await page.locator("[data-field='Fill']").getByTitle("#ff3b30").click();
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
    await expect(page.locator("[data-ref^='node:'] circle[data-radius='30']")).toHaveCount(2);
  });

  test("utan markering gäller stiländringen alla synliga noder, även de med egen stil", async ({
    page,
  }) => {
    await freshApp(page);
    await createNode(page, 250, 300, "A");
    await page.locator("[data-field='Fill']").getByTitle("#ff3b30").click();
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
    await page.locator("[data-field='Fill']").getByTitle("#34c759").click();
    // Båda synliga noderna blir gröna, även A som hade en egen röd färg.
    await expect(page.locator("[data-ref^='node:'] > circle[fill='#34c759']")).toHaveCount(2);
    await expect(page.locator("[data-ref^='node:'] > circle[fill='#ff3b30']")).toHaveCount(0);

    // Den dolda noden är oförändrad (vit) när lagret visas igen.
    await page.getByRole("tab", { name: "Layers" }).click();
    await page.getByTestId("layer-row").nth(0).getByTestId("layer-visibility").click();
    await expect(page.locator("[data-ref^='node:'] > circle[fill='#ffffff']")).toHaveCount(1);
    await expect(page.locator("[data-ref^='node:'] > circle[fill='#34c759']")).toHaveCount(2);
  });

  test("alla tal i panelen är skjutreglage med fasta gränser", async ({ page }) => {
    await freshApp(page);
    await createNode(page, 250, 300, "A");
    await createNode(page, 600, 300, "B");
    await dragRelationship(page, { x: 250, y: 300 }, { x: 600, y: 300 }, "REL");
    await page.keyboard.press("Escape");
    const inspector = page.locator("aside");
    // Varje reglage har ett fält bredvid sig där talet kan skrivas in.
    const sliders = await inspector.locator("input[type='range']").count();
    await expect(inspector.locator("input[type='number']")).toHaveCount(sliders);
    const limits: [string, string, string][] = [
      ["Border width", "0", "30"],
      ["Radius", "10", "250"],
      ["Caption size", "6", "100"],
      ["Label border width", "0", "10"],
      ["Label size", "6", "60"],
      ["Line width", "0", "30"],
      ["Arrow size", "0", "40"],
      ["Type size", "6", "60"],
    ];
    for (const [label, min, max] of limits) {
      const slider = page.getByLabel(label, { exact: true });
      await expect(slider, label).toHaveAttribute("type", "range");
      await expect(slider, label).toHaveAttribute("min", min);
      await expect(slider, label).toHaveAttribute("max", max);
    }
    await expect(page.getByLabel("Property size", { exact: true })).toHaveCount(2);

    // Reglagen går inte under sin gräns, så en modell kan aldrig få en storlek på noll.
    const caption = captionText(page, "A");
    const size = page.getByLabel("Caption size");
    await size.focus();
    await size.press("Home");
    await expect(caption).toHaveAttribute("font-size", "6");
    await size.press("ArrowLeft");
    await expect(caption).toHaveAttribute("font-size", "6");
    await size.press("ArrowRight");
    await expect(caption).toHaveAttribute("font-size", "7");

    // Halva steg visas med en decimal.
    const labelBorder = page.getByLabel("Label border width");
    await labelBorder.focus();
    await labelBorder.press("ArrowRight");
    await expect(
      page.locator("[data-field='Label border width'] input[type='number']"),
    ).toHaveValue("4.5");

    // Linjebredden ändrar relationen direkt, och modellen går att öppna igen.
    await page.getByLabel("Line width").fill("12");
    await expect(page.locator("[data-ref^='relationship:'] path[stroke-width='12']")).toHaveCount(
      1,
    );
    await page.waitForTimeout(900);
    await page.reload();
    await expect(captionText(page, "A")).toHaveAttribute("font-size", "7");
  });

  test("talet bredvid ett reglage går att skriva in, tömma och skriva om", async ({ page }) => {
    await freshApp(page);
    await createNode(page, 300, 300, "A");
    await page.keyboard.press("Escape");
    const circle = page.locator("[data-part='node-circle']");
    const slider = page.getByLabel("Radius");
    const field = page.locator("[data-field='Radius'] input[type='number']");
    await expect(field).toHaveValue("50");

    // Töm fältet och skriv ett nytt tal: noden och reglaget följer med.
    await field.selectText();
    await field.press("Backspace");
    await expect(field).toHaveValue("");
    await expect(circle).toHaveAttribute("data-radius", "50");
    await field.pressSequentially("80");
    await expect(circle).toHaveAttribute("data-radius", "80");
    await expect(slider).toHaveValue("80");

    // För litet tal slår inte igenom medan man skriver, och rättas till minsta värdet med Enter.
    await field.fill("3");
    await expect(circle).toHaveAttribute("data-radius", "80");
    await field.press("Enter");
    await expect(field).toHaveValue("10");
    await expect(circle).toHaveAttribute("data-radius", "10");

    // För stort tal rättas till största värdet när fältet lämnas.
    await field.fill("900");
    await field.press("Tab");
    await expect(field).toHaveValue("250");
    await expect(circle).toHaveAttribute("data-radius", "250");

    // Tomt fält som lämnas återgår till det gällande värdet.
    await field.fill("");
    await field.press("Tab");
    await expect(field).toHaveValue("250");

    // Dras reglaget följer talet i fältet med, och modellen går att öppna igen.
    await slider.focus();
    await slider.press("ArrowLeft");
    await expect(field).toHaveValue("249");
    await page.waitForTimeout(900);
    await page.reload();
    await expect(page.locator("[data-part='node-circle']")).toHaveAttribute("data-radius", "249");
  });

  test("nodens storlek ställs in med ett skjutreglage mellan 10 och 250", async ({ page }) => {
    await freshApp(page);
    await createNode(page, 300, 300, "A");
    const radius = page.getByLabel("Radius");
    const circle = page.locator("[data-part='node-circle']");
    await expect(radius).toHaveAttribute("type", "range");
    await expect(radius).toHaveAttribute("min", "10");
    await expect(radius).toHaveAttribute("max", "250");
    await expect(radius).toHaveValue("50");

    // Dra reglaget med tangenterna: noden växer direkt, och värdet visas bredvid.
    await radius.focus();
    await radius.press("ArrowRight");
    await expect(circle).toHaveAttribute("data-radius", "51");
    await radius.press("End");
    await expect(circle).toHaveAttribute("data-radius", "250");
    await expect(page.locator("[data-field='Radius'] input[type='number']")).toHaveValue("250");
    await radius.press("Home");
    await expect(circle).toHaveAttribute("data-radius", "10");

    // Dra med musen till mitten av reglaget: ungefär mitt emellan 10 och 250.
    const box = await radius.boundingBox();
    if (!box) throw new Error("reglage saknas");
    await page.mouse.click(box.x + box.width / 2, box.y + box.height / 2);
    const value = Number(await circle.getAttribute("data-radius"));
    expect(value).toBeGreaterThan(110);
    expect(value).toBeLessThan(150);

    // En hel dragning är ett enda steg att ångra, hur många mellanlägen den än passerar.
    await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2);
    await page.mouse.down();
    await page.mouse.move(box.x + box.width * 0.9, box.y + box.height / 2, { steps: 25 });
    await page.mouse.up();
    const dragged = Number(await circle.getAttribute("data-radius"));
    expect(dragged).toBeGreaterThan(200);
    await page.getByRole("button", { name: "Undo" }).click();
    await expect(circle).toHaveAttribute("data-radius", String(value));
  });

  test("rubriken går att läsa när noden får mörk fyllning", async ({ page }) => {
    await freshApp(page);
    await createNode(page, 300, 300, "Mörk");
    const caption = captionText(page, "Mörk");
    await expect(caption).toHaveAttribute("fill", "#000000");
    // Svart fyllning med svart rubrik syns inte: rubriken blir vit.
    await page.locator("[data-field='Fill']").getByTitle("#000000").click();
    await expect(page.locator("[data-ref^='node:'] > circle[fill='#000000']")).toHaveCount(1);
    await expect(caption).toHaveAttribute("fill", "#ffffff");
    // Tillbaka till vit fyllning: rubriken blir svart igen.
    await page.locator("[data-field='Fill']").getByTitle("#ffffff").click();
    await expect(caption).toHaveAttribute("fill", "#000000");
    // En klar färg går att läsa med svart text och ändrar inte rubriken.
    await page.locator("[data-field='Fill']").getByTitle("#ffd60a").click();
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

  test("nodens kant växer utåt: den fyllda ytan behåller sin storlek", async ({ page }) => {
    await freshApp(page);
    await createNode(page, 400, 300, "Kant");
    await page.getByPlaceholder("New label").fill("Label");
    await page.getByPlaceholder("New label").press("Enter");
    const circle = page.locator("[data-part='node-circle']");
    const label = page.locator("[data-part='label-box']");
    // Standard: radie 50 och kant 4. Fyllningen når 50 px ut, kantens ytterkant 54 px.
    await expect(circle).toHaveAttribute("r", "52");
    const before = await label.boundingBox();

    await page.getByLabel("Border width", { exact: true }).fill("20");
    // Fyllningen är fortfarande 50 px i radie; kanten ligger utanför (50–70 px).
    await expect(circle).toHaveAttribute("data-radius", "50");
    await expect(circle).toHaveAttribute("r", "60");
    await expect(circle).toHaveAttribute("stroke-width", "20");
    // Labeln flyttar upp lika mycket som kanten vuxit (16 px), så den täcks inte.
    const after = await label.boundingBox();
    if (!before || !after) throw new Error("label saknas");
    expect(before.y - after.y).toBeCloseTo(16, 0);
  });

  test("alla färgval har färgprickar, och Radius ligger överst", async ({ page }) => {
    await freshApp(page);
    await createNode(page, 250, 300, "A");
    await page.getByPlaceholder("New label").fill("Person");
    await page.getByPlaceholder("New label").press("Enter");
    await createNode(page, 600, 300, "B");
    await dragRelationship(page, { x: 250, y: 300 }, { x: 600, y: 300 }, "REL");
    await page.keyboard.press("Escape");
    const panel = page.locator("aside");
    // Inget markerat: bakgrund, åtta nodfärger och fem relationsfärger – alla med nio prickar.
    const colorFields = panel.locator("[data-field]:has(input[type='color'])");
    await expect(colorFields).toHaveCount(14);
    for (let i = 0; i < 14; i++) {
      await expect(colorFields.nth(i).locator("button[title^='#']")).toHaveCount(9);
    }
    // Radius är första inställningen under Nodes, före Fill.
    const nodeFields = panel
      .locator("section", { has: page.getByRole("heading", { name: "Nodes" }) })
      .locator("[data-field]");
    await expect(nodeFields.first()).toHaveAttribute("data-field", "Radius");
    await expect(nodeFields.nth(1)).toHaveAttribute("data-field", "Fill");

    // Prickarna fungerar för varje färg, inte bara fyllningen.
    await panel.locator("[data-field='Border color']").getByTitle("#ff3b30").click();
    await expect(page.locator("[data-part='node-circle'][stroke='#ff3b30']")).toHaveCount(2);
    await panel.locator("[data-field='Label background']").getByTitle("#ffd60a").click();
    await expect(page.locator("[data-part='label-box'][fill='#ffd60a']")).toHaveCount(1);
    await panel.locator("[data-field='Line color']").getByTitle("#0a84ff").click();
    await expect(page.locator("[data-ref^='relationship:'] path[stroke='#0a84ff']")).toHaveCount(1);
    await panel.locator("[data-field='Background color']").getByTitle("#8e8e93").click();
    await expect(page.getByTestId("canvas-container")).toHaveCSS(
      "background-color",
      "rgb(142, 142, 147)",
    );
    // Den valda pricken är markerad.
    await expect(panel.locator("[data-field='Border color']").getByTitle("#ff3b30")).toHaveClass(
      /ring-accent/,
    );
  });
});

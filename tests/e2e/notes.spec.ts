import { expect, test } from "@playwright/test";
import { createNode, dragRelationship, freshApp, SCREENSHOT_DIR } from "./helpers";

test.describe("anteckningar", () => {
  test("skapa med verktyget, skriv text, byt färg och ändra storlek", async ({ page }) => {
    await freshApp(page);
    await page.getByRole("button", { name: "Note", exact: true }).click();
    await page.getByTestId("canvas").click({ position: { x: 200, y: 200 } });
    const editor = page.getByTestId("inline-editor");
    await expect(editor).toBeVisible();
    await editor.fill("Kom ihåg att\nkolla detta");
    await page.getByTestId("canvas").click({ position: { x: 700, y: 600 } });
    await expect(page.locator("svg text", { hasText: "Kom ihåg att" })).toBeVisible();
    await expect(page.locator("[data-ref^='note:']")).toHaveCount(1);

    // Markera och byt färg i panelen
    await page.locator("[data-ref^='note:'] > rect").first().click();
    await page.locator("[data-field='Color']").getByTitle("#0a84ff").click();
    await expect(page.locator("[data-ref^='note:'] rect[fill='#0a84ff']")).toHaveCount(1);

    // Ändra storlek med sydöstra handtaget
    const handle = page.locator("[data-part='handle'][data-handle='se']");
    const box = await handle.boundingBox();
    if (!box) throw new Error("handtag saknas");
    await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2);
    await page.mouse.down();
    await page.mouse.move(box.x + 120, box.y + 80, { steps: 6 });
    await page.mouse.up();
    const rect = page.locator("[data-ref^='note:'] > rect").first();
    expect(Number(await rect.getAttribute("width"))).toBeGreaterThan(300);
  });

  test("dra ut en anteckning med valfri storlek (genväg N) och redigera via panelen", async ({
    page,
  }) => {
    await freshApp(page);
    await page.keyboard.press("n");
    const canvas = page.getByTestId("canvas");
    const cb = await canvas.boundingBox();
    if (!cb) throw new Error("canvas saknas");
    await page.mouse.move(cb.x + 100, cb.y + 100);
    await page.mouse.down();
    await page.mouse.move(cb.x + 400, cb.y + 250, { steps: 6 });
    await page.mouse.up();
    await page.getByTestId("inline-editor").press("Escape");
    const rect = page.locator("[data-ref^='note:'] > rect").first();
    expect(Number(await rect.getAttribute("width"))).toBeCloseTo(300, 0);
    await page.getByTestId("inspector-note-text").fill("Via panelen");
    await expect(page.locator("svg text", { hasText: "Via panelen" })).toBeVisible();
    await page.getByRole("button", { name: "Center" }).click();
    await expect(page.locator("[data-ref^='note:'] text[text-anchor='middle']")).toHaveCount(1);
  });

  test("textstorlek, bredd och höjd ställs in med skjutreglage", async ({ page }) => {
    await freshApp(page);
    await page.getByRole("button", { name: "Note", exact: true }).click();
    await page.getByTestId("canvas").click({ position: { x: 200, y: 200 } });
    await page.getByTestId("inline-editor").fill("Anteckning");
    await page.getByTestId("canvas").click({ position: { x: 700, y: 600 } });
    const rect = page.locator("[data-ref^='note:'] > rect").first();
    await rect.click();
    for (const [label, min, max] of [
      ["Text size", "6", "80"],
      ["Width", "20", "2000"],
      ["Height", "20", "2000"],
    ]) {
      const slider = page.getByLabel(label ?? "", { exact: true });
      await expect(slider).toHaveAttribute("type", "range");
      await expect(slider).toHaveAttribute("min", min ?? "");
      await expect(slider).toHaveAttribute("max", max ?? "");
    }
    await page.getByLabel("Width").fill("320");
    await page.getByLabel("Height").fill("90");
    await expect(rect).toHaveAttribute("width", "320");
    await expect(rect).toHaveAttribute("height", "90");
    await page.getByLabel("Text size").fill("24");
    await expect(page.locator("[data-ref^='note:'] text")).toHaveAttribute("font-size", "24");
  });

  test("anteckningens text syns mot sin färg, utan eget färgval för texten", async ({ page }) => {
    await freshApp(page);
    await page.getByRole("button", { name: "Note", exact: true }).click();
    await page.getByTestId("canvas").click({ position: { x: 200, y: 200 } });
    await page.getByTestId("inline-editor").fill("Anteckning");
    await page.getByTestId("canvas").click({ position: { x: 700, y: 600 } });
    await page.locator("[data-ref^='note:'] > rect").first().click();
    await expect(page.locator("aside").getByText("Text color")).toHaveCount(0);
    const text = page.locator("[data-ref^='note:'] text");
    await expect(text).toHaveAttribute("fill", "#1b1f27");
    await page.locator("[data-field='Color']").locator("input[type='color']").fill("#101010");
    await expect(text).toHaveAttribute("fill", "#ffffff");
  });

  test("knappen Add note lägger en anteckning mitt i vyn, färdig att skriva i", async ({
    page,
  }) => {
    await freshApp(page);
    await expect(page.getByText("“Add note” adds a free-text note")).toBeVisible();
    await page.getByTestId("add-note").click();
    const editor = page.getByTestId("inline-editor");
    await expect(editor).toBeFocused();
    await editor.fill("Kom ihåg detta");
    await page.getByTestId("canvas").click({ position: { x: 80, y: 600 } });
    const notes = page.locator("[data-ref^='note:'] > rect");
    await expect(notes).toHaveCount(1);
    await expect(page.locator("svg text", { hasText: "Kom ihåg detta" })).toBeVisible();
    // Anteckningen ligger mitt i ritytan.
    const canvas = await page.getByTestId("canvas").boundingBox();
    const note = await notes.first().boundingBox();
    if (!canvas || !note) throw new Error("anteckning saknas");
    expect(Math.abs(note.x + note.width / 2 - (canvas.x + canvas.width / 2))).toBeLessThan(3);
    expect(Math.abs(note.y + note.height / 2 - (canvas.y + canvas.height / 2))).toBeLessThan(3);
    // En till hamnar bredvid, inte exakt ovanpå.
    await page.getByTestId("add-note").click();
    await page.keyboard.press("Escape");
    await expect(notes).toHaveCount(2);
    const second = await notes.nth(1).boundingBox();
    expect(Math.abs((second?.x ?? 0) - note.x)).toBeGreaterThan(20);
  });

  test("Add note med en nod markerad knyter anteckningen till noden, och den följer med", async ({
    page,
  }) => {
    await freshApp(page);
    await createNode(page, 300, 300, "Alice");
    const canvas = page.getByTestId("canvas");
    // Noden är markerad: anteckningen hamnar bredvid den och knyts dit.
    await page.getByTestId("add-note").click();
    await page.getByTestId("inline-editor").fill("Viktig person");
    await canvas.click({ position: { x: 100, y: 600 } });
    const note = page.locator("[data-ref^='note:'] > rect").first();
    const link = canvas.locator("[data-part='note-link']");
    await expect(note).toHaveCount(1);
    await expect(link).toHaveCount(1);
    await note.click();
    await expect(page.getByTestId("note-attached-to")).toHaveText("Node “Alice”");
    await page.screenshot({ path: `${SCREENSHOT_DIR}/note-attached.png`, animations: "disabled" });

    // Flytta noden: anteckningen följer med lika långt, även medan man drar.
    const before = await note.boundingBox();
    const box = await canvas.boundingBox();
    if (!before || !box) throw new Error("anteckning saknas");
    await page.mouse.move(box.x + 300, box.y + 300);
    await page.mouse.down();
    await page.mouse.move(box.x + 420, box.y + 380, { steps: 6 });
    const during = await note.boundingBox();
    expect(Math.abs((during?.x ?? 0) - (before.x + 120))).toBeLessThan(3);
    await page.mouse.up();
    const after = await note.boundingBox();
    expect(Math.abs((after?.x ?? 0) - (before.x + 120))).toBeLessThan(3);
    expect(Math.abs((after?.y ?? 0) - (before.y + 80))).toBeLessThan(3);

    // Anteckningen går att flytta för sig och sitter kvar på noden; Detach gör den fri.
    await note.click();
    await page.getByTestId("note-detach").click();
    await expect(link).toHaveCount(0);
    await expect(page.getByTestId("note-attached-to")).toContainText("Nothing");
    const free = await note.boundingBox();
    await page.mouse.move(box.x + 420, box.y + 380);
    await page.mouse.down();
    await page.mouse.move(box.x + 300, box.y + 300, { steps: 6 });
    await page.mouse.up();
    const still = await note.boundingBox();
    expect(Math.abs((still?.x ?? 0) - (free?.x ?? 0))).toBeLessThan(2);
  });

  test("knyt en befintlig anteckning genom att peka ut en nod eller relation", async ({ page }) => {
    await freshApp(page);
    await createNode(page, 250, 250, "A");
    await createNode(page, 650, 250, "B");
    await dragRelationship(page, { x: 250, y: 250 }, { x: 650, y: 250 }, "KNOWS");
    await page.keyboard.press("Escape");
    const canvas = page.getByTestId("canvas");
    // Inget markerat: anteckningen blir fri, mitt i vyn.
    await page.getByTestId("add-note").click();
    await page.getByTestId("inline-editor").fill("Fri anteckning");
    await canvas.click({ position: { x: 100, y: 620 } });
    const note = page.locator("[data-ref^='note:'] > rect").first();
    const link = canvas.locator("[data-part='note-link']");
    await expect(link).toHaveCount(0);

    // Attach to… och klicka på relationen.
    await note.click();
    await page.getByTestId("note-attach").click();
    await expect(page.getByTestId("attach-hint")).toBeVisible();
    await canvas.click({ position: { x: 450, y: 250 } });
    await expect(page.getByTestId("attach-hint")).toHaveCount(0);
    await expect(link).toHaveCount(1);
    await expect(page.getByTestId("note-attached-to")).toHaveText("Relationship “KNOWS”");
    // Anteckningen är fortfarande markerad; klicket valde inte relationen.
    await expect(page.getByTestId("inspector")).toContainText("1 element selected");

    // Change… och klicka på en nod; ett klick på tom yta avbryter utan att ändra något.
    await page.getByTestId("note-attach").click();
    await canvas.click({ position: { x: 100, y: 100 } });
    await expect(page.getByTestId("attach-hint")).toHaveCount(0);
    await expect(page.getByTestId("note-attached-to")).toHaveText("Relationship “KNOWS”");
    await page.getByTestId("note-attach").click();
    await canvas.click({ position: { x: 650, y: 250 } });
    await expect(page.getByTestId("note-attached-to")).toHaveText("Node “B”");

    // Tas noden bort ligger anteckningen kvar, men fri.
    await page.keyboard.press("Escape");
    await canvas.click({ position: { x: 650, y: 250 } });
    await page.keyboard.press("Delete");
    await expect(note).toHaveCount(1);
    await expect(link).toHaveCount(0);
  });

  test("lagret Notes visar och döljer alla anteckningar; knutna följer sin nods lager", async ({
    page,
  }) => {
    await freshApp(page);
    await createNode(page, 300, 300, "A");
    await page.getByTestId("add-note").click();
    await page.getByTestId("inline-editor").fill("På noden");
    await page.keyboard.press("Escape");
    await page.getByTestId("add-note").click();
    await page.getByTestId("inline-editor").fill("Fri");
    await page.getByTestId("canvas").click({ position: { x: 100, y: 620 } });
    const notes = page.locator("[data-ref^='note:'] > rect");
    await expect(notes).toHaveCount(2);

    await page.getByRole("tab", { name: "Layers" }).click();
    const row = page.getByTestId("notes-layer");
    await expect(row).toContainText("Notes");
    await expect(row.getByText("2", { exact: true })).toBeVisible();
    // Anteckningar räknas inte i de vanliga lagren.
    await expect(page.getByTestId("layer-row").getByText("1", { exact: true })).toBeVisible();

    await page.getByTestId("notes-visibility").click();
    await expect(notes).toHaveCount(0);
    await page.getByTestId("notes-visibility").click();
    await expect(notes).toHaveCount(2);

    // Döljs nodens lager följer den knutna anteckningen med; den fria syns kvar.
    await page.getByTestId("layer-row").getByTestId("layer-visibility").click();
    await expect(notes).toHaveCount(1);
    await expect(page.locator("svg text", { hasText: "Fri" })).toBeVisible();

    // En ny anteckning visar lagret Notes igen om det var dolt.
    await page.getByTestId("notes-visibility").click();
    await expect(notes).toHaveCount(0);
    await page.getByTestId("add-note").click();
    await page.keyboard.press("Escape");
    await expect(page.getByRole("button", { name: "Hide notes" })).toBeVisible();
  });
});

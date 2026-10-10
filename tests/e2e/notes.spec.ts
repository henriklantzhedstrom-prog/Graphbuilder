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
    expect(Number(await rect.getAttribute("data-width"))).toBeCloseTo(300, 0);
    await page.getByTestId("inspector-note-text").fill("Via panelen");
    await expect(page.locator("svg text", { hasText: "Via panelen" })).toBeVisible();
    await page.getByRole("button", { name: "Center" }).click();
    await expect(page.locator("[data-ref^='note:'] text[text-anchor='middle']")).toHaveCount(1);
  });

  test("textstorlek och ram ställs in i panelen; storleken ändras genom att dra i hörnen", async ({
    page,
  }) => {
    await freshApp(page);
    await page.getByRole("button", { name: "Note", exact: true }).click();
    await page.getByTestId("canvas").click({ position: { x: 200, y: 200 } });
    await page.getByTestId("inline-editor").fill("Anteckning");
    await page.getByTestId("canvas").click({ position: { x: 700, y: 600 } });
    const rect = page.locator("[data-ref^='note:'] > rect").first();
    await rect.click();
    const panel = page.locator("aside");
    // Bredd och höjd finns inte i panelen.
    await expect(panel.getByText("Width", { exact: true })).toHaveCount(0);
    await expect(panel.getByText("Height", { exact: true })).toHaveCount(0);

    await page.getByLabel("Text size").fill("24");
    await expect(page.locator("[data-ref^='note:'] text")).toHaveAttribute("font-size", "24");

    // Ramens färg och tjocklek. En tjockare ram växer utåt: anteckningens yta är lika stor.
    await expect(rect).toHaveAttribute("stroke", "#000000");
    await expect(rect).toHaveAttribute("stroke-width", "2");
    const before = await rect.evaluate((el) => (el as SVGRectElement).getBBox().width);
    await panel.locator("[data-field='Border color']").getByTitle("#ff3b30").click();
    await expect(rect).toHaveAttribute("stroke", "#ff3b30");
    const width = page.getByLabel("Border width");
    await expect(width).toHaveAttribute("min", "0");
    await expect(width).toHaveAttribute("max", "10");
    await width.fill("8");
    await expect(rect).toHaveAttribute("stroke-width", "8");
    const after = await rect.evaluate((el) => (el as SVGRectElement).getBBox().width);
    expect(after - before).toBeCloseTo(6, 5);
    // Ingen ram alls går också.
    await width.fill("0");
    await expect(rect).toHaveAttribute("stroke-width", "0");
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
    // En ny anteckning är vit med svart kant.
    await expect(notes.first()).toHaveAttribute("fill", "#ffffff");
    await expect(notes.first()).toHaveAttribute("stroke", "#000000");
    await expect(notes.first()).toHaveAttribute("stroke-width", "2");
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
    // Länken går från nodens mitt till anteckningens mitt.
    const noteBox = await note.boundingBox();
    const nodeBox = await page.locator("[data-part='node-circle']").boundingBox();
    if (!noteBox || !nodeBox) throw new Error("mått saknas");
    const origin = await canvas.boundingBox();
    const ends = await link.evaluate((el) =>
      ["x1", "y1", "x2", "y2"].map((name) => Number(el.getAttribute(name))),
    );
    const at = (x: number, y: number) => [x - (origin?.x ?? 0), y - (origin?.y ?? 0)];
    const [nodeX, nodeY] = at(nodeBox.x + nodeBox.width / 2, nodeBox.y + nodeBox.height / 2);
    const [noteX, noteY] = at(noteBox.x + noteBox.width / 2, noteBox.y + noteBox.height / 2);
    expect(Math.abs((ends[0] ?? 0) - (nodeX ?? 0))).toBeLessThan(2);
    expect(Math.abs((ends[1] ?? 0) - (nodeY ?? 0))).toBeLessThan(2);
    expect(Math.abs((ends[2] ?? 0) - (noteX ?? 0))).toBeLessThan(2);
    expect(Math.abs((ends[3] ?? 0) - (noteY ?? 0))).toBeLessThan(2);
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

  test("markera text direkt i anteckningen och gör den fet eller kursiv", async ({ page }) => {
    await freshApp(page);
    await page.getByTestId("add-note").click();
    const editor = page.getByTestId("inline-editor");
    const bar = page.getByTestId("note-format-bar");
    await expect(editor).toBeFocused();
    // Knapparna B och I visas vid rutan så länge man skriver i den.
    await expect(bar).toBeVisible();
    await page.keyboard.type("Viktig sak att minnas");

    /** Markerar ett ord i fältet, som när man dubbelklickar på det. */
    const selectWord = (target: typeof editor, word: string) =>
      target.evaluate((el, w) => {
        const walker = document.createTreeWalker(el, NodeFilter.SHOW_TEXT);
        for (let node = walker.nextNode(); node; node = walker.nextNode()) {
          const at = (node.textContent ?? "").indexOf(w);
          if (at < 0) continue;
          const range = document.createRange();
          range.setStart(node, at);
          range.setEnd(node, at + w.length);
          const selection = window.getSelection();
          selection?.removeAllRanges();
          selection?.addRange(range);
          return;
        }
        throw new Error(`hittar inte ${w}`);
      }, word);

    // Markera ett ord och klicka B: ordet blir fett direkt i rutan, utan några märken.
    await selectWord(editor, "Viktig");
    await page.getByTestId("canvas-note-bold").click();
    await expect(editor).toBeFocused();
    await expect(editor.locator("b, strong")).toHaveText("Viktig");
    await expect(editor).toHaveText("Viktig sak att minnas");
    await expect(page.getByTestId("canvas-note-bold")).toHaveAttribute("aria-pressed", "true");
    // Markera ett annat ord och tryck Ctrl/Cmd+I.
    await selectWord(editor, "minnas");
    await page.keyboard.press("ControlOrMeta+i");
    await expect(editor.locator("i, em")).toHaveText("minnas");
    // Knapparna visar stilen på det som är markerat: kursiv, inte fet.
    await expect(page.getByTestId("canvas-note-italic")).toHaveAttribute("aria-pressed", "true");
    await expect(page.getByTestId("canvas-note-bold")).toHaveAttribute("aria-pressed", "false");
    await page.mouse.move(40, 400);
    await page.screenshot({
      path: `${SCREENSHOT_DIR}/note-bold-italic.png`,
      animations: "disabled",
    });

    // Klicka utanför: anteckningen ritas med samma stil.
    await page.getByTestId("canvas").click({ position: { x: 80, y: 620 } });
    await expect(bar).toHaveCount(0);
    const noteText = page.locator("[data-ref^='note:'] text");
    await expect(noteText.locator("tspan[font-weight='700']")).toHaveText("Viktig");
    await expect(noteText.locator("tspan[font-style='italic']")).toHaveText("minnas");
    await expect(noteText).toHaveText("Viktig sak att minnas");

    // Öppna igen: stilen syns i rutan. Samma knapp en gång till tar bort den.
    await page.locator("[data-ref^='note:'] > rect").first().dblclick();
    await expect(editor.locator("b, strong")).toHaveText("Viktig");
    await selectWord(editor, "Viktig");
    await page.getByTestId("canvas-note-bold").click();
    await expect(editor.locator("b, strong")).toHaveCount(0);
    await page.getByTestId("canvas").click({ position: { x: 80, y: 620 } });
    await expect(noteText.locator("tspan[font-weight='700']")).toHaveCount(0);
    await expect(noteText.locator("tspan[font-style='italic']")).toHaveText("minnas");

    // Samma sak går i sidopanelens textfält, som också visar stilen.
    await page.locator("[data-ref^='note:'] > rect").first().click();
    const field = page.getByTestId("inspector-note-text");
    await expect(field.locator("i, em")).toHaveText("minnas");
    await selectWord(field, "sak");
    await page.getByTestId("note-bold").click();
    await expect(noteText.locator("tspan[font-weight='700']")).toHaveText("sak");
    await selectWord(field, "sak");
    await page.getByTestId("note-italic").click();
    await expect(noteText.locator("tspan[font-weight='700'][font-style='italic']")).toHaveText(
      "sak",
    );

    // Stilen följer med i en exporterad bild, och finns kvar efter omladdning.
    await page.keyboard.press("Escape");
    await page.getByRole("button", { name: "Export…" }).last().click();
    await page.getByRole("tab", { name: "SVG" }).click();
    await expect(
      page.getByTestId("export-preview").locator("tspan[font-style='italic']").last(),
    ).toHaveText("minnas");
    await page.keyboard.press("Escape");
    await page.waitForTimeout(900);
    await page.reload();
    await expect(page.locator("[data-ref^='note:'] text tspan[font-weight='700']")).toHaveText(
      "sak",
    );
  });

  test("flera rader i en anteckning skrivs med Shift+Enter och sparas som rader", async ({
    page,
  }) => {
    await freshApp(page);
    await page.getByTestId("add-note").click();
    await page.keyboard.type("Rad ett");
    await page.keyboard.press("Shift+Enter");
    await page.keyboard.type("Rad två");
    await page.keyboard.press("Enter");
    await expect(page.getByTestId("inline-editor")).toHaveCount(0);
    await expect(page.locator("[data-ref^='note:'] text > tspan")).toHaveText([
      "Rad ett",
      "Rad två",
    ]);
  });
});

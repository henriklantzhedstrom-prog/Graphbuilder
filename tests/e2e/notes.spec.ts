import { expect, test } from "@playwright/test";
import { freshApp } from "./helpers";

test.describe("anteckningar", () => {
  test("skapa med verktyget, skriv text, byt färg och ändra storlek", async ({ page }) => {
    await freshApp(page);
    await page.getByRole("button", { name: "Note" }).click();
    await page.getByTestId("canvas").click({ position: { x: 200, y: 200 } });
    const editor = page.getByTestId("inline-editor");
    await expect(editor).toBeVisible();
    await editor.fill("Kom ihåg att\nkolla detta");
    await page.getByTestId("canvas").click({ position: { x: 700, y: 600 } });
    await expect(page.locator("svg text", { hasText: "Kom ihåg att" })).toBeVisible();
    await expect(page.locator("[data-ref^='note:']")).toHaveCount(1);

    // Markera och byt färg i panelen
    await page.locator("[data-ref^='note:'] > rect").first().click();
    await page.getByTitle("#0a84ff").click();
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
});

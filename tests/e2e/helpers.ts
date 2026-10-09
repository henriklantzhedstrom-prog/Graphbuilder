import { expect, type Page } from "@playwright/test";

export async function freshApp(page: Page) {
  await page.goto("/");
  await page.evaluate(() => indexedDB.deleteDatabase("graphbuilder"));
  await page.reload();
  await expect(page.getByTestId("canvas")).toBeVisible();
}

const escapeRegExp = (s: string) => s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

/** Skapar en nod med knappen "Add node", ger den en rubrik och drar den till (x, y) på ritytan. */
export async function createNode(page: Page, x: number, y: number, caption: string) {
  await page.getByTestId("add-node").click();
  const editor = page.getByTestId("inline-editor");
  await expect(editor).toBeVisible();
  await editor.fill(caption);
  await editor.press("Enter");
  const label = page
    .getByTestId("canvas")
    .locator("text")
    .filter({ hasText: new RegExp(`^${escapeRegExp(caption)}$`) })
    .first();
  await expect(label).toBeVisible();
  const from = await label.boundingBox();
  const canvasBox = await page.getByTestId("canvas").boundingBox();
  if (!from || !canvasBox) throw new Error("nod eller rityta saknas");
  await page.mouse.move(from.x + from.width / 2, from.y + from.height / 2);
  await page.mouse.down();
  await page.mouse.move(canvasBox.x + x, canvasBox.y + y, { steps: 8 });
  await page.mouse.up();
}

/** Drar en relation från noden vid (fromX, fromY) till punkten (toX, toY) och sätter typ. */
export async function dragRelationship(
  page: Page,
  from: { x: number; y: number },
  to: { x: number; y: number },
  type: string,
) {
  const canvasBox = await page.getByTestId("canvas").boundingBox();
  if (!canvasBox) throw new Error("canvas saknas");
  // Ringen (halo) ligger ca 52–66 px från nodens mitt vid standardradie 50.
  const startX = canvasBox.x + from.x + 58;
  const startY = canvasBox.y + from.y;
  await page.mouse.move(startX, startY);
  await page.mouse.down();
  await page.mouse.move(startX + 30, startY + 10, { steps: 4 });
  await page.mouse.move(canvasBox.x + to.x, canvasBox.y + to.y, { steps: 10 });
  await page.mouse.up();
  const editor = page.getByTestId("inline-editor");
  await expect(editor).toBeVisible();
  await editor.fill(type);
  await editor.press("Enter");
}

export const SCREENSHOT_DIR = "test-results/screenshots";

/** Nodens rubrik på ritytan (exakt träff, så att raden "name: …" under noden inte räknas). */
export const captionText = (page: Page, caption: string) =>
  page
    .getByTestId("canvas")
    .locator("text")
    .filter({ hasText: new RegExp(`^${escapeRegExp(caption)}$`) });

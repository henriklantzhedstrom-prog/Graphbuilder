import { expect, type Page } from "@playwright/test";

export async function freshApp(page: Page) {
  await page.goto("/");
  await page.evaluate(() => indexedDB.deleteDatabase("graphbuilder"));
  await page.reload();
  await expect(page.getByTestId("canvas")).toBeVisible();
}

export async function createNode(page: Page, x: number, y: number, caption: string) {
  await page.getByTestId("canvas").dblclick({ position: { x, y } });
  const editor = page.getByTestId("inline-editor");
  await expect(editor).toBeVisible();
  await editor.fill(caption);
  await editor.press("Enter");
  await expect(page.locator("svg text", { hasText: caption }).first()).toBeVisible();
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

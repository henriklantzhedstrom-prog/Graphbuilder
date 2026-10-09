import { expect, test } from "@playwright/test";
import { captionText, createNode, dragRelationship, freshApp } from "./helpers";

test.describe("lager", () => {
  test("nytt lager blir aktivt och nya noder hamnar där; dölj döljer dem", async ({ page }) => {
    await freshApp(page);
    await createNode(page, 250, 300, "Bas");
    await page.getByRole("tab", { name: "Layers" }).click();
    await page.getByTestId("add-layer").click();
    const rows = page.getByTestId("layer-row");
    await expect(rows).toHaveCount(2);
    await expect(rows.nth(0)).toHaveAttribute("data-active", "true");
    await expect(rows.nth(0).getByTestId("layer-name")).toHaveText("Layer 2");

    await createNode(page, 550, 300, "Topp");
    await expect(rows.nth(0).getByText("1", { exact: true })).toBeVisible();

    await rows.nth(0).getByTestId("layer-visibility").click();
    await expect(captionText(page, "Topp")).toHaveCount(0);
    await expect(captionText(page, "Bas")).toHaveCount(1);
    await rows.nth(0).getByTestId("layer-visibility").click();
    await expect(captionText(page, "Topp")).toHaveCount(1);
  });

  test("relationer har inget lager och syns när båda noderna syns", async ({ page }) => {
    await freshApp(page);
    await createNode(page, 250, 300, "A");
    await page.getByRole("tab", { name: "Layers" }).click();
    await page.getByTestId("add-layer").click();
    await createNode(page, 600, 300, "B");
    await dragRelationship(page, { x: 250, y: 300 }, { x: 600, y: 300 }, "REL");
    const rel = page.locator("[data-ref^='relationship:']");
    await expect(rel).toHaveCount(1);

    // En markerad relation har ingen lagerväljare.
    await page.getByRole("tab", { name: "Properties" }).click();
    await expect(page.getByTestId("inspector")).toBeVisible();
    await expect(page.getByTestId("inspector-layer")).toHaveCount(0);

    // Relationen räknas inte i något lager.
    await page.getByRole("tab", { name: "Layers" }).click();
    const rows = page.getByTestId("layer-row");
    await expect(rows.nth(0).getByText("1", { exact: true })).toBeVisible();
    await expect(rows.nth(1).getByText("1", { exact: true })).toBeVisible();

    // Ett tredje lager utan noderna påverkar inte relationen.
    await page.getByTestId("add-layer").click();
    await rows.nth(0).getByTestId("layer-visibility").click();
    await expect(rel).toHaveCount(1);

    // Döljs B:s lager eller A:s lager försvinner relationen.
    await rows.nth(1).getByTestId("layer-visibility").click();
    await expect(rel).toHaveCount(0);
    await rows.nth(1).getByTestId("layer-visibility").click();
    await expect(rel).toHaveCount(1);
    await rows.nth(2).getByTestId("layer-visibility").click();
    await expect(rel).toHaveCount(0);
    await rows.nth(2).getByTestId("layer-visibility").click();
    await expect(rel).toHaveCount(1);
  });

  test("låst lager kan inte markeras eller flyttas", async ({ page }) => {
    await freshApp(page);
    await createNode(page, 300, 300, "Fast");
    await page.getByRole("tab", { name: "Layers" }).click();
    await page.getByTestId("layer-row").nth(0).getByTestId("layer-lock").click();
    const circle = page.locator("[data-ref^='node:'][data-part='body'] circle").nth(1);
    const before = await circle.boundingBox();
    if (!before) throw new Error("nod saknas");
    const cxStart = await circle.getAttribute("cx");
    await page.mouse.move(before.x + before.width / 2, before.y + before.height / 2);
    await page.mouse.down();
    await page.mouse.move(before.x + 200, before.y + 100, { steps: 5 });
    await page.mouse.up();
    // Noden flyttas inte i modellen (att dra i ett låst element flyttar bara vyn).
    expect(await circle.getAttribute("cx")).toBe(cxStart);
    await page.getByRole("tab", { name: "Properties" }).click();
    await expect(page.getByText("Nothing selected", { exact: true })).toBeVisible();
  });

  test("flytta markering till annat lager via egenskapspanelen", async ({ page }) => {
    await freshApp(page);
    await createNode(page, 300, 300, "Flytta");
    await page.getByRole("tab", { name: "Layers" }).click();
    await page.getByTestId("add-layer").click();
    await page.getByRole("tab", { name: "Properties" }).click();
    await page.getByTestId("canvas").click({ position: { x: 300, y: 300 } });
    await page.getByTestId("inspector-layer").selectOption({ label: "Layer 2" });
    await page.getByRole("tab", { name: "Layers" }).click();
    await expect(
      page.getByTestId("layer-row").nth(0).getByText("1", { exact: true }),
    ).toBeVisible();
  });

  test("byt namn, opacitet och ta bort lager med flytt av innehåll", async ({ page }) => {
    await freshApp(page);
    await createNode(page, 300, 300, "Kvar");
    await page.getByRole("tab", { name: "Layers" }).click();
    await page.getByTestId("add-layer").click();
    await createNode(page, 600, 300, "Kvar2");
    const top = page.getByTestId("layer-row").nth(0);
    await top.getByTestId("layer-name").dblclick();
    await page.getByLabel("Layer name").fill("Översikt");
    await page.getByLabel("Layer name").press("Enter");
    await expect(top.getByTestId("layer-name")).toHaveText("Översikt");

    await expect(page.getByTestId("layers-panel").getByLabel("Opacity")).toHaveCount(0);
    await expect(page.locator("g[data-layer][opacity]")).toHaveCount(0);

    await top.getByTestId("layer-remove").click();
    await page.getByTestId("remove-layer-confirm").click();
    await expect(page.getByTestId("layer-row")).toHaveCount(1);
    await expect(captionText(page, "Kvar2")).toHaveCount(1);
    await expect(
      page.getByTestId("layer-row").nth(0).getByText("2", { exact: true }),
    ).toBeVisible();
  });
});

test("Enter i lagernamnet öppnar inte redigering av markerad nod", async ({ page }) => {
  await freshApp(page);
  await createNode(page, 300, 300, "Nod");
  await page.getByRole("tab", { name: "Layers" }).click();
  await page.getByTestId("layer-row").nth(0).getByTestId("layer-name").dblclick();
  await page.getByLabel("Layer name").fill("Bas");
  await page.getByLabel("Layer name").press("Enter");
  await expect(page.getByTestId("inline-editor")).toHaveCount(0);
});

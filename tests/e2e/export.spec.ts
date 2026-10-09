import { expect, test } from "@playwright/test";
import { captionText, createNode, dragRelationship, freshApp } from "./helpers";

test.describe("export och import", () => {
  test("exportdialogen visar JSON, Cypher, SVG och PNG och laddar ner", async ({ page }) => {
    await freshApp(page);
    await createNode(page, 300, 300, "Alice");
    await createNode(page, 650, 300, "Bob");
    await dragRelationship(page, { x: 300, y: 300 }, { x: 650, y: 300 }, "KNOWS");
    await page.getByRole("button", { name: "Export…" }).click();
    const preview = page.getByTestId("export-preview");
    await expect(preview).toContainText('"name": "Alice"');

    await page.getByRole("tab", { name: "Cypher" }).click();
    await expect(preview).toContainText("CREATE (Alice)-[:KNOWS]->(Bob)");

    await page.getByRole("tab", { name: "SVG" }).click();
    await expect(preview.locator("svg text", { hasText: "KNOWS" })).toBeVisible();

    await page.getByRole("tab", { name: "PNG" }).click();
    await expect(preview.locator("img")).toBeVisible();
    const size = await preview.locator("img").evaluate((img: HTMLImageElement) => ({
      w: img.naturalWidth,
      h: img.naturalHeight,
    }));
    expect(size.w).toBeGreaterThan(800);

    const download = page.waitForEvent("download");
    await page.getByTestId("export-download").click();
    expect((await download).suggestedFilename()).toBe("New model.png");
  });

  test("endast synliga lager påverkar Cypher-exporten", async ({ page }) => {
    await freshApp(page);
    await createNode(page, 300, 300, "Synlig");
    await page.getByRole("tab", { name: "Layers" }).click();
    await page.getByTestId("add-layer").click();
    await createNode(page, 650, 300, "Dold");
    await page.getByTestId("layer-row").nth(0).getByTestId("layer-visibility").click();
    await page.keyboard.press("Control+e");
    await page.getByRole("tab", { name: "Cypher" }).click();
    const preview = page.getByTestId("export-preview");
    await expect(preview).toContainText(`CREATE (Synlig {name: "Synlig"})`);
    await expect(preview).not.toContainText("Dold");
    await page.getByLabel("Visible layers only").uncheck();
    await expect(preview).toContainText(`CREATE (Dold {name: "Dold"})`);
  });

  test("spara som JSON-fil och öppna den igen", async ({ page }) => {
    await freshApp(page);
    await createNode(page, 300, 300, "Sparad");
    await page.getByRole("button", { name: "File" }).click();
    const download = page.waitForEvent("download");
    await page.getByRole("menuitem", { name: "Save as file…" }).click();
    const path = await (await download).path();
    await page.getByRole("button", { name: "File" }).click();
    await page.getByRole("menuitem", { name: "New" }).click();
    await expect(captionText(page, "Sparad")).toHaveCount(0);
    await page.getByRole("button", { name: "File" }).click();
    const chooser = page.waitForEvent("filechooser");
    await page.getByRole("menuitem", { name: "Open…" }).click();
    await (await chooser).setFiles(path);
    await expect(captionText(page, "Sparad")).toBeVisible();
  });

  test("importerar en arrows.app-fil", async ({ page }) => {
    await freshApp(page);
    const arrows = JSON.stringify({
      style: { "node-color": "#ffcc00" },
      nodes: [
        {
          id: "n0",
          position: { x: 0, y: 0 },
          caption: "Arrow A",
          labels: ["Person"],
          properties: {},
          style: {},
        },
        {
          id: "n1",
          position: { x: 300, y: 0 },
          caption: "Arrow B",
          labels: [],
          properties: {},
          style: {},
        },
      ],
      relationships: [
        { id: "r0", fromId: "n0", toId: "n1", type: "LIKES", properties: {}, style: {} },
      ],
    });
    await page.getByRole("button", { name: "File" }).click();
    const chooser = page.waitForEvent("filechooser");
    await page.getByRole("menuitem", { name: "Import from arrows.app…" }).click();
    await (await chooser).setFiles({
      name: "min-graf.json",
      mimeType: "application/json",
      buffer: Buffer.from(arrows),
    });
    await expect(captionText(page, "Arrow A")).toBeVisible();
    await expect(page.locator("svg text", { hasText: "LIKES" })).toBeVisible();
    await expect(page.getByLabel("Model name")).toHaveValue("min-graf");
    await expect(page.locator("[data-ref^='node:'] circle[fill='#ffcc00']")).toHaveCount(2);
  });
});

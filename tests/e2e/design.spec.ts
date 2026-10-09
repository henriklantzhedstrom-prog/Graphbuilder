import { expect, test } from "@playwright/test";
import { createNode, freshApp } from "./helpers";

test.describe("utseende", () => {
  test("verktyg och zoom ligger som flytande listor ovanpå ritytan", async ({ page }) => {
    await freshApp(page);
    const canvas = await page.getByTestId("canvas").boundingBox();
    const select = await page.getByRole("button", { name: "Select" }).boundingBox();
    const zoomIn = await page.getByRole("button", { name: "Zoom in" }).boundingBox();
    if (!canvas || !select || !zoomIn) throw new Error("element saknas");
    // Verktygen överst i mitten av ritytan, zoomen nere till vänster.
    expect(select.y).toBeGreaterThan(canvas.y);
    expect(select.y).toBeLessThan(canvas.y + 80);
    expect(Math.abs(select.x - (canvas.x + canvas.width / 2))).toBeLessThan(120);
    expect(zoomIn.y).toBeGreaterThan(canvas.y + canvas.height - 80);
    expect(zoomIn.x).toBeLessThan(canvas.x + 200);
    // Modellnamnet står bredvid appens namn i den övre listen.
    await expect(page.locator("header")).toContainText("Graphbuilder");
    await expect(page.getByRole("button", { name: "Export…" }).last()).toHaveCSS(
      "color",
      "rgb(255, 255, 255)",
    );
  });

  test("prickrutnätet följer när ytan flyttas och kommer inte med i exporten", async ({ page }) => {
    await freshApp(page);
    const pattern = page.locator("#gb-dot-grid");
    await expect(pattern).toHaveCount(1);
    const before = Number(await pattern.getAttribute("x"));
    const box = await page.getByTestId("canvas").boundingBox();
    if (!box) throw new Error("canvas saknas");
    await page.mouse.move(box.x + 400, box.y + 400);
    await page.mouse.down();
    await page.mouse.move(box.x + 470, box.y + 430, { steps: 5 });
    await page.mouse.up();
    expect(Number(await pattern.getAttribute("x"))).toBeCloseTo(before + 70, 0);

    await createNode(page, 300, 300, "Person");
    await page.getByRole("button", { name: "Export…" }).last().click();
    await page.getByRole("tab", { name: "SVG" }).click();
    const preview = page.getByTestId("export-preview");
    await expect(preview).toContainText("Person");
    expect(await preview.innerHTML()).not.toContain("gb-dot-grid");
  });
});

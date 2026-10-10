import { expect, test } from "@playwright/test";
import { freshApp } from "./helpers";

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

  test("ritytan har ingen prickad bakgrund", async ({ page }) => {
    await freshApp(page);
    await expect(page.getByTestId("dot-grid")).toHaveCount(0);
    await expect(page.locator("#gb-dot-grid")).toHaveCount(0);
  });
});

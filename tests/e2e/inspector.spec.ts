import { expect, test } from "@playwright/test";
import { createNode, dragRelationship, freshApp } from "./helpers";

test.describe("egenskapspanel", () => {
  test("redigerar rubrik, label, egenskap och färg på en nod", async ({ page }) => {
    await freshApp(page);
    await createNode(page, 300, 300, "Alice");
    await page.getByTestId("canvas").click({ position: { x: 300, y: 300 } });
    const inspector = page.getByTestId("inspector");
    await expect(inspector).toBeVisible();

    await page.getByTestId("inspector-caption").fill("Alice Andersson");
    await expect(page.locator("svg text", { hasText: "Alice" }).first()).toBeVisible();

    await page.getByPlaceholder("New label").fill("Person");
    await page.getByPlaceholder("New label").press("Enter");
    await expect(page.locator("svg text", { hasText: "Person" })).toBeVisible();

    await page.getByPlaceholder("Key").fill("ålder");
    await page.getByPlaceholder("Key").press("Enter");
    await page.getByLabel("Value").fill("42");
    await expect(page.locator("svg text", { hasText: "ålder: 42" })).toBeVisible();

    await page.getByTitle("#fbe7a1").click();
    await expect(page.locator("[data-ref^='node:'] circle[fill='#fbe7a1']")).toHaveCount(1);
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
    await expect(page.locator("[data-ref^='node:'] circle[r='30']")).toHaveCount(2);
  });
});

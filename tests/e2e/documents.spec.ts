import { expect, test } from "@playwright/test";
import { captionText, createNode, freshApp } from "./helpers";

test.describe("mina modeller", () => {
  test("skapa, byta namn, duplicera, växla och ta bort modeller", async ({ page }) => {
    await freshApp(page);
    await createNode(page, 300, 300, "Första");
    await page.getByLabel("Model name").fill("Kundmodell");
    await page.getByLabel("Model name").press("Enter");

    await page.getByRole("button", { name: "My models" }).click();
    const rows = page.getByTestId("document-row");
    await expect(rows).toHaveCount(1);
    await expect(rows.nth(0)).toContainText("Kundmodell");
    await expect(rows.nth(0)).toContainText("Open now");

    await page.getByTestId("documents-create").click();
    await expect(captionText(page, "Första")).toHaveCount(0);
    await createNode(page, 300, 300, "Andra");

    await page.getByRole("button", { name: "My models" }).click();
    await expect(rows).toHaveCount(2);
    await rows.filter({ hasText: "Kundmodell" }).getByRole("button", { name: "Duplicate" }).click();
    await expect(rows).toHaveCount(3);
    await expect(rows.filter({ hasText: "Kundmodell (copy)" })).toHaveCount(1);

    await rows
      .filter({ hasText: "Kundmodell (copy)" })
      .getByRole("button", { name: "Rename" })
      .click();
    await page.getByLabel("Name", { exact: true }).fill("Kopian");
    await page.getByLabel("Name", { exact: true }).press("Enter");
    await expect(rows.filter({ hasText: "Kopian" })).toHaveCount(1);

    await rows.filter({ hasText: "Kopian" }).getByRole("button", { name: "Open" }).click();
    await expect(page.getByLabel("Model name")).toHaveValue("Kopian");
    await expect(captionText(page, "Första")).toBeVisible();

    await page.getByRole("button", { name: "My models" }).click();
    await rows.filter({ hasText: "Kopian" }).getByRole("button", { name: "Delete" }).click();
    await page.getByTestId("document-delete-confirm").click();
    // Den öppna modellen togs bort, så en ny tom modell skapas: 3 kvar.
    await expect(rows).toHaveCount(3);
    await expect(rows.filter({ hasText: "Kopian" })).toHaveCount(0);
    await expect(page.getByLabel("Model name")).toHaveValue("New model");

    await page.reload();
    await page.getByRole("button", { name: "My models" }).click();
    await expect(page.getByTestId("document-row")).toHaveCount(3);
  });
});

import { expect, test } from "@playwright/test";
import { createNode, freshApp } from "./helpers";

test.describe("mina modeller", () => {
  test("skapa, byta namn, duplicera, växla och ta bort modeller", async ({ page }) => {
    await freshApp(page);
    await createNode(page, 300, 300, "Första");
    await page.getByLabel("Modellens namn").fill("Kundmodell");
    await page.getByLabel("Modellens namn").press("Enter");

    await page.getByRole("button", { name: "Mina modeller" }).click();
    const rows = page.getByTestId("document-row");
    await expect(rows).toHaveCount(1);
    await expect(rows.nth(0)).toContainText("Kundmodell");
    await expect(rows.nth(0)).toContainText("Öppen nu");

    await page.getByTestId("documents-create").click();
    await expect(page.locator("svg text", { hasText: "Första" })).toHaveCount(0);
    await createNode(page, 300, 300, "Andra");

    await page.getByRole("button", { name: "Mina modeller" }).click();
    await expect(rows).toHaveCount(2);
    await rows.filter({ hasText: "Kundmodell" }).getByRole("button", { name: "Duplicera" }).click();
    await expect(rows).toHaveCount(3);
    await expect(rows.filter({ hasText: "Kundmodell (kopia)" })).toHaveCount(1);

    await rows
      .filter({ hasText: "Kundmodell (kopia)" })
      .getByRole("button", { name: "Byt namn" })
      .click();
    await page.getByLabel("Namn", { exact: true }).fill("Kopian");
    await page.getByLabel("Namn", { exact: true }).press("Enter");
    await expect(rows.filter({ hasText: "Kopian" })).toHaveCount(1);

    await rows.filter({ hasText: "Kopian" }).getByRole("button", { name: "Öppna" }).click();
    await expect(page.getByLabel("Modellens namn")).toHaveValue("Kopian");
    await expect(page.locator("svg text", { hasText: "Första" })).toBeVisible();

    await page.getByRole("button", { name: "Mina modeller" }).click();
    await rows.filter({ hasText: "Kopian" }).getByRole("button", { name: "Ta bort" }).click();
    await page.getByTestId("document-delete-confirm").click();
    // Den öppna modellen togs bort, så en ny tom modell skapas: 3 kvar.
    await expect(rows).toHaveCount(3);
    await expect(rows.filter({ hasText: "Kopian" })).toHaveCount(0);
    await expect(page.getByLabel("Modellens namn")).toHaveValue("Ny modell");

    await page.reload();
    await page.getByRole("button", { name: "Mina modeller" }).click();
    await expect(page.getByTestId("document-row")).toHaveCount(3);
  });
});

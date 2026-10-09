import { expect, test } from "@playwright/test";

test("appen startar", async ({ page }) => {
  await page.goto("/");
  await expect(page).toHaveTitle("Graphbuilder");
  await expect(page.getByLabel("Model name")).toBeVisible();
  await expect(page.getByTestId("canvas")).toBeVisible();
});

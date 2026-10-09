import { expect, test } from "@playwright/test";

test("appen startar", async ({ page }) => {
  await page.goto("/");
  await expect(page.getByText("Graphbuilder")).toBeVisible();
});

import { expect, test } from "@playwright/test";

test("appen startar", async ({ page }) => {
  await page.goto("/");
  await expect(page).toHaveTitle("Graphbuilder");
  await expect(page.getByLabel("Model name")).toBeVisible();
  await expect(page.getByTestId("canvas")).toBeVisible();
});

test("högermenyn har stor, läsbar text", async ({ page }) => {
  await page.goto("/");
  await expect(page.getByTestId("add-node")).toBeVisible();
  const sizes = await page.evaluate(() => {
    const aside = document.querySelector("aside");
    const px = (el: Element | null | undefined) =>
      el ? Number.parseFloat(getComputedStyle(el).fontSize) : 0;
    return { base: px(aside), label: px(aside?.querySelector("label")) };
  });
  expect(sizes.base).toBeGreaterThanOrEqual(17);
  expect(sizes.label).toBeGreaterThanOrEqual(14);
});

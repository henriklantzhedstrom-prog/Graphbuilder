import { expect, test } from "@playwright/test";
import { freshApp } from "./helpers";

test.describe("tema", () => {
  test.use({ colorScheme: "dark" });

  test("startar ljust även när datorn är i mörkt läge; knappen byter och valet sparas", async ({
    page,
  }) => {
    await freshApp(page);
    await page.evaluate(() => localStorage.clear());
    await page.reload();
    const bg = () => page.evaluate(() => getComputedStyle(document.body).backgroundColor);
    await expect(page.locator("html")).toHaveAttribute("data-theme", "light");
    expect(await bg()).toBe("rgb(255, 255, 255)");

    await page.getByRole("button", { name: "Switch to dark mode" }).click();
    await expect(page.locator("html")).toHaveAttribute("data-theme", "dark");
    expect(await bg()).not.toBe("rgb(255, 255, 255)");

    await page.reload();
    await expect(page.locator("html")).toHaveAttribute("data-theme", "dark");
    await page.getByRole("button", { name: "Switch to light mode" }).click();
    await expect(page.locator("html")).toHaveAttribute("data-theme", "light");
  });
});

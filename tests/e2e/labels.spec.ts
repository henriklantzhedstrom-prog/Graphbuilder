import { expect, test } from "@playwright/test";
import { createNode, freshApp } from "./helpers";

async function addLabel(page: import("@playwright/test").Page, label: string) {
  await page.getByPlaceholder("New label").fill(label);
  await page.getByPlaceholder("New label").press("Enter");
}

test.describe("unika labels", () => {
  test("samma label på två noder stoppas med ett tydligt meddelande", async ({ page }) => {
    await freshApp(page);
    await createNode(page, 300, 300, "Alice");
    await addLabel(page, "Person");
    await createNode(page, 650, 300, "Bob");
    await addLabel(page, "Person");
    await expect(page.getByTestId("label-error")).toContainText(
      "“Alice” already has the labels Person",
    );
    await expect(page.getByPlaceholder("New label")).toHaveValue("Person");
    // En annan kombination går bra.
    await page.getByPlaceholder("New label").fill("Company");
    await expect(page.getByTestId("label-error")).toHaveCount(0);
    await page.getByPlaceholder("New label").press("Enter");
    await expect(page.locator("svg text", { hasText: "Company" })).toBeVisible();
    await expect(page.getByTestId("label-conflict-ring")).toHaveCount(0);
  });

  test("duplicerad nod tappar sina labels och ett meddelande visas", async ({ page }) => {
    await freshApp(page);
    await createNode(page, 300, 300, "Alice");
    await addLabel(page, "Person");
    await page.getByRole("button", { name: "Duplicate" }).click();
    await expect(page.getByText("Labels were removed from the copy")).toBeVisible();
    await expect(page.locator("svg text", { hasText: /^Person$/ })).toHaveCount(1);
  });

  test("äldre fil med dubbletter markeras med röd ring och varning", async ({ page }) => {
    await freshApp(page);
    const arrows = JSON.stringify({
      nodes: [
        { id: "a", position: { x: 0, y: 0 }, caption: "A", labels: ["Person"], properties: {} },
        { id: "b", position: { x: 300, y: 0 }, caption: "B", labels: ["Person"], properties: {} },
      ],
      relationships: [],
    });
    await page.getByRole("button", { name: "File" }).click();
    const chooser = page.waitForEvent("filechooser");
    await page.getByRole("menuitem", { name: "Import from arrows.app…" }).click();
    await (await chooser).setFiles({
      name: "dubbletter.json",
      mimeType: "application/json",
      buffer: Buffer.from(arrows),
    });
    await expect(page.getByTestId("label-conflict-ring")).toHaveCount(2);
    await expect(page.getByText("2 nodes share their labels with another node")).toBeVisible();
  });
});

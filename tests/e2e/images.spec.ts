import { expect, test } from "@playwright/test";
import { createNode, freshApp } from "./helpers";

/** 1×1 px röd PNG. */
const PNG_1x1 = Buffer.from(
  "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==",
  "base64",
);

async function addImage(page: import("@playwright/test").Page) {
  const chooser = page.waitForEvent("filechooser");
  await page.getByRole("button", { name: "Bild…" }).click();
  await (await chooser).setFiles({ name: "bild.png", mimeType: "image/png", buffer: PNG_1x1 });
  await expect(page.locator("[data-ref^='image:'] image")).toHaveCount(1);
}

test.describe("bakgrundsbilder", () => {
  test("lägg in bild via knappen, proportionell storleksändring, opacitet och lås", async ({
    page,
  }) => {
    await freshApp(page);
    await addImage(page);
    const image = page.locator("[data-ref^='image:'] image");
    expect(Number(await image.getAttribute("width"))).toBe(1);
    // Bilden blir markerad direkt; sätt storlek via panelen
    await page.getByLabel("Bredd").fill("300");
    await page.getByLabel("Höjd").fill("100");
    await page.getByRole("button", { name: "Återställ proportioner" }).click();
    expect(Number(await image.getAttribute("height"))).toBe(300);

    const handle = page.locator("[data-part='handle'][data-handle='se']");
    const box = await handle.boundingBox();
    if (!box) throw new Error("handtag saknas");
    await page.mouse.move(box.x + 4, box.y + 4);
    await page.mouse.down();
    await page.mouse.move(box.x + 154, box.y + 154, { steps: 6 });
    await page.mouse.up();
    const w = Number(await image.getAttribute("width"));
    const h = Number(await image.getAttribute("height"));
    expect(w / h).toBeCloseTo(1, 1);
    expect(w).toBeGreaterThan(400);

    await page.getByLabel("Opacitet").fill("0.4");
    await expect(page.locator("[data-ref^='image:'][opacity='0.4']")).toHaveCount(1);

    // click i stället för check: kryssrutan avmonteras när markeringen släpps.
    await page.getByLabel("Lås bilden (kan inte markeras av misstag)").click();
    await expect(page.getByText("Inget markerat")).toBeVisible();
    await image.click({ force: true });
    await expect(page.getByText("Inget markerat")).toBeVisible();
  });

  test("skicka bild till lagret Bakgrund som ligger underst", async ({ page }) => {
    await freshApp(page);
    await createNode(page, 300, 300, "Nod");
    await addImage(page);
    await page.getByRole("button", { name: "Lägg i lagret Bakgrund" }).click();
    await page.getByRole("tab", { name: "Lager" }).click();
    const rows = page.getByTestId("layer-row");
    await expect(rows).toHaveCount(2);
    await expect(rows.nth(1).getByTestId("layer-name")).toHaveText("Bakgrund");
    await expect(rows.nth(1).getByText("1", { exact: true })).toBeVisible();
    const layerIds = await page
      .locator("g[data-layer]")
      .evaluateAll((els) => els.map((el) => el.querySelector("image") !== null));
    expect(layerIds[0]).toBe(true);
  });

  test("klistra in bild med Ctrl+V", async ({ page }) => {
    await freshApp(page);
    await page.getByTestId("canvas").click({ position: { x: 200, y: 200 } });
    await page.evaluate(async (b64) => {
      const bytes = Uint8Array.from(atob(b64), (c) => c.charCodeAt(0));
      const file = new File([bytes], "p.png", { type: "image/png" });
      const dt = new DataTransfer();
      dt.items.add(file);
      window.dispatchEvent(new ClipboardEvent("paste", { clipboardData: dt, bubbles: true }));
    }, PNG_1x1.toString("base64"));
    await expect(page.locator("[data-ref^='image:'] image")).toHaveCount(1);
  });
});

import { existsSync } from "node:fs";
import { defineConfig, devices } from "@playwright/test";

// Lokal miljö kan ha en förinstallerad Chromium (t.ex. /opt/pw-browsers/chromium) som inte
// matchar Playwrights förväntade version. Använd den när den finns; i CI installeras rätt version.
const localChromium = process.env.PLAYWRIGHT_CHROMIUM_PATH ?? "/opt/pw-browsers/chromium";
const launchOptions =
  !process.env.CI && existsSync(localChromium) ? { executablePath: localChromium } : {};

export default defineConfig({
  testDir: "tests/e2e",
  fullyParallel: true,
  retries: process.env.CI ? 2 : 0,
  reporter: process.env.CI ? [["list"], ["html", { open: "never" }]] : "list",
  use: {
    baseURL: "http://127.0.0.1:4173",
    trace: "retain-on-failure",
    screenshot: "only-on-failure",
  },
  projects: [{ name: "chromium", use: { ...devices["Desktop Chrome"], launchOptions } }],
  webServer: {
    command:
      "npm run build -- --mode test && npm run preview -- --host 127.0.0.1 --port 4173 --strictPort",
    url: "http://127.0.0.1:4173",
    reuseExistingServer: !process.env.CI,
    timeout: 120_000,
  },
});

/**
 * Playwright config for the Sonata e2e suite.
 *
 * Tests run against the live deployment at https://learnwithsonata.com
 * using a saved storage state captured by tests/e2e/auth.setup.ts.
 *
 * To re-authenticate after the Supabase refresh token expires, run:
 *   npx playwright test --project=setup
 *
 * Then run the full suite:
 *   npx playwright test
 */
import { defineConfig, devices } from "@playwright/test";

const BASE_URL = process.env.SONATA_BASE_URL || "https://learnwithsonata.com";

export default defineConfig({
  testDir: "./tests/e2e",
  // Long-running sweeps need patience.
  timeout: 60_000 * 5,
  expect: { timeout: 10_000 },
  fullyParallel: false, // shared session — keep serial
  workers: 1,
  reporter: [
    ["list"],
    ["html", { outputFolder: "tests/e2e/.report", open: "never" }],
    ["json", { outputFile: "tests/e2e/.report/results.json" }],
  ],
  use: {
    baseURL: BASE_URL,
    trace: "retain-on-failure",
    screenshot: "only-on-failure",
    video: "off",
    viewport: { width: 1024, height: 1366 }, // iPad portrait-ish
  },
  projects: [
    // The standard suite uses the ?test=1 in-app bypass so no real auth
    // is needed. Tests open URLs like /app/?test=1 and the app spins up
    // a fake authenticated session entirely client-side.
    {
      name: "chromium",
      use: {
        ...devices["Desktop Chrome"],
        viewport: { width: 1024, height: 1366 },
      },
    },
  ],
});

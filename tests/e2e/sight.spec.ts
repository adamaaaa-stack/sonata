/**
 * sight.spec.ts — sanity-check the Sight Reading screen. We can't
 * actually play notes from a Playwright headless browser, but we can
 * verify the screen mounts, renders notation, and emits no JS errors.
 */
import { test, expect } from "@playwright/test";

test("Sight Reading screen mounts and renders", async ({ page }) => {
  const errors: string[] = [];
  page.on("pageerror", (e) => errors.push(String(e)));

  await page.goto("/app/?test=1", { waitUntil: "networkidle" });
  await page.getByRole("button", { name: /^Sight$/i }).first().click();
  await page.waitForTimeout(1500);

  // Look for an SVG / canvas — sight reading should draw notation
  await expect(page.locator("svg, canvas").first()).toBeVisible();
  expect(errors).toEqual([]);
});

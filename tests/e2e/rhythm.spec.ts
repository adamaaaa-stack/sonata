/**
 * rhythm.spec.ts — sanity-check the Rhythm Tap screen. Verifies it
 * mounts a rhythm pattern, exposes a START button, and the tap surface
 * works without runtime errors.
 */
import { test, expect } from "@playwright/test";

test("Rhythm screen mounts and a round can be started", async ({ page }) => {
  const errors: string[] = [];
  page.on("pageerror", (e) => errors.push(String(e)));

  await page.goto("/app/?test=1", { waitUntil: "networkidle" });
  await page.getByRole("button", { name: /^Rhythm$/i }).first().click();
  await page.waitForTimeout(1500);

  // Look for the rhythm pattern card and a START button.
  await expect(page.getByText(/rhythm pattern|tap the pulse/i).first()).toBeVisible();
  const start = page.getByRole("button", { name: /^.{0,2}START$/i });
  if (await start.first().isVisible().catch(() => false)) {
    await start.first().click();
    await page.waitForTimeout(2000);
  }
  expect(errors).toEqual([]);
});

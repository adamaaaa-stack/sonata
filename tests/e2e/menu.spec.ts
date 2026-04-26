/**
 * menu.spec.ts — verifies every tile on the home menu actually routes
 * to its target screen and the screen mounts something visible. Cheap
 * and reliable smoke test of the navigation skeleton.
 */
import { test, expect } from "@playwright/test";

test.describe("home menu navigation", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto("/app/?test=1", { waitUntil: "networkidle" });
    await expect(page.getByText(/maestro|welcome back/i)).toBeVisible({
      timeout: 15_000,
    });
  });

  test("Drill tile → drill config screen", async ({ page }) => {
    await page.getByRole("button", { name: /^Drill$/i }).first().click();
    await expect(
      page.getByText(/start drill|configure|interval|note id/i).first()
    ).toBeVisible();
  });

  test("Sight tile → sight reading screen", async ({ page }) => {
    await page.getByRole("button", { name: /^Sight$/i }).first().click();
    await expect(page.locator("svg, canvas").first()).toBeVisible();
  });

  test("Rhythm tile → rhythm screen", async ({ page }) => {
    await page.getByRole("button", { name: /^Rhythm$/i }).first().click();
    await expect(page.getByText(/tap|pulse|rhythm|beat/i).first()).toBeVisible();
  });

  test("Lessons tile → curriculum map", async ({ page }) => {
    await page.getByRole("button", { name: /^Lessons$/i }).first().click();
    await expect(page.getByText(/your journey/i)).toBeVisible();
    await expect(page.getByText(/of 250 lessons/i)).toBeVisible();
  });

  test("Library tile → library screen", async ({ page }) => {
    await page.getByRole("button", { name: /^Library$/i }).first().click();
    // Legacy library renders a catalog; just check we're not on home.
    await expect(page.getByText(/maestro/i)).not.toBeVisible({ timeout: 3_000 });
  });

  test("Progress tile → progress screen", async ({ page }) => {
    await page.getByRole("button", { name: /^Progress$/i }).first().click();
    await expect(
      page.getByText(/streak|achievements|practice/i).first()
    ).toBeVisible();
  });
});

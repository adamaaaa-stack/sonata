/**
 * lessons.spec.ts — walks every lesson and every page in the curriculum.
 *
 * For each of the 250 lessons:
 *   1. Mark all 250 lessons as completed in localStorage so the
 *      curriculum map unlocks them (lets us pick the lesson directly).
 *   2. Navigate into the lesson via dispatching START_LESSON through
 *      the curriculum map.
 *   3. Walk every page with ArrowRight, advancing past play-page
 *      grading via on-screen Skip / Next buttons when present.
 *   4. Capture any console errors, runtime exceptions, missing-figure
 *      fall-throughs, broken audio, etc.
 *   5. Take ONE screenshot per lesson at a representative middle page,
 *      saved to tests/e2e/.report/screenshots/lesson-NNN.png.
 *
 * The aggregated report is printed at the end and also written to
 * tests/e2e/.report/lesson-sweep.json.
 *
 * Run a subset for quick iteration:
 *   SONATA_LESSON_FROM=1 SONATA_LESSON_TO=10 npx playwright test lessons
 */
import { test, expect, type Page } from "@playwright/test";
import fs from "fs";
import path from "path";

const FROM = parseInt(process.env.SONATA_LESSON_FROM || "1", 10);
const TO = parseInt(process.env.SONATA_LESSON_TO || "250", 10);
const REPORT_DIR = path.resolve(__dirname, ".report");
const SHOTS_DIR = path.resolve(REPORT_DIR, "screenshots");

if (!fs.existsSync(SHOTS_DIR)) fs.mkdirSync(SHOTS_DIR, { recursive: true });

interface LessonResult {
  id: number;
  title?: string;
  pages?: number;
  durationMs: number;
  consoleErrors: string[];
  pageExceptions: string[];
  /** Pages where the figure rendered as plain text (the GenericFigureCard). */
  figureFallthroughPages: number[];
  /** Pages where audio failed to load (showed 0:00 / 0:00 forever). */
  silentAudioPages: number[];
  /** Pages we got stuck on (couldn't advance after multiple attempts). */
  stuckOnPages: number[];
  ok: boolean;
}

const results: LessonResult[] = [];

test.beforeAll(async () => {
  console.log(
    `🎹 Sonata lesson sweep — lessons ${FROM}-${TO} (${TO - FROM + 1} total)`
  );
});

test.afterAll(async () => {
  const out = path.join(REPORT_DIR, "lesson-sweep.json");
  fs.writeFileSync(out, JSON.stringify(results, null, 2));
  const broken = results.filter((r) => !r.ok);
  console.log(
    `\n📊 Summary: ${results.length - broken.length}/${results.length} clean. ${broken.length} with issues.`
  );
  console.log(`Report: ${out}`);
});

test("walk every lesson", async ({ page }) => {
  test.setTimeout(60 * 60_000); // 1 hour cap for the full sweep

  // Surface every console error / runtime exception per-lesson by
  // attaching listeners that route into the current lesson's bucket.
  let currentBucket: LessonResult | null = null;
  page.on("console", (msg) => {
    if (currentBucket && (msg.type() === "error" || msg.type() === "warning")) {
      const t = msg.text();
      // Filter known-noise (browser extension, supabase non-fatal, etc.)
      if (/extension|chrome-|sonata.mic.skip|loadProgress failed/i.test(t)) return;
      currentBucket.consoleErrors.push(t);
    }
  });
  page.on("pageerror", (err) => {
    if (currentBucket) currentBucket.pageExceptions.push(String(err));
  });

  // Bootstrap: open app, mark all lessons completed so the map unlocks
  // every one (we'll re-enter them by id), and head to the curriculum
  // map. Reduces nav steps later.
  await page.goto("/app/?test=1", { waitUntil: "networkidle" });
  await page.evaluate(() => {
    const all = Array.from({ length: 250 }, (_, i) => i + 1);
    localStorage.setItem("sonata_lessons", JSON.stringify(all));
    // Stash a 'test mode' flag so any future runtime checks can opt into
    // looser behaviour if we add them.
    localStorage.setItem("sonata_test_mode", "1");
  });
  await page.reload({ waitUntil: "networkidle" });

  for (let id = FROM; id <= TO; id++) {
    const t0 = Date.now();
    const bucket: LessonResult = {
      id,
      durationMs: 0,
      consoleErrors: [],
      pageExceptions: [],
      figureFallthroughPages: [],
      silentAudioPages: [],
      stuckOnPages: [],
      ok: true,
    };
    currentBucket = bucket;
    results.push(bucket);

    try {
      await openLesson(page, id);
      const meta = await readLessonMeta(page);
      bucket.title = meta.title;
      bucket.pages = meta.totalPages;

      // Walk every page. Stop after 2× the expected pages — catches
      // infinite loops / pages that won't advance.
      const maxSteps = (meta.totalPages || 16) * 2 + 4;
      let stepsTaken = 0;
      let lastIdx = -1;
      let stuckCount = 0;
      const halfwayTarget = Math.max(2, Math.floor((meta.totalPages || 16) / 2));

      while (stepsTaken < maxSteps) {
        const idx = await currentPageIndex(page);
        if (idx == null) break; // mastery / completion / something else
        if (idx === lastIdx) {
          stuckCount++;
          if (stuckCount >= 3) {
            bucket.stuckOnPages.push(idx);
            // Force-advance via Skip if present
            const skipped = await tryClickSkip(page);
            if (!skipped) break;
            stuckCount = 0;
          }
        } else {
          stuckCount = 0;
          lastIdx = idx;
        }

        // Audit the current page render
        await auditPageRender(page, bucket, idx);

        // Take the milestone screenshot at halfway
        if (idx === halfwayTarget) {
          await page.screenshot({
            path: path.join(SHOTS_DIR, `lesson-${String(id).padStart(3, "0")}.png`),
            fullPage: false,
          });
        }

        // Advance: ArrowRight is the canonical key. If on a play page
        // it's blocked until sequence is done — try the on-screen Skip
        // button as a fallback so the sweep keeps moving.
        await page.keyboard.press("ArrowRight");
        await page.waitForTimeout(150);
        const stillSame = (await currentPageIndex(page)) === idx;
        if (stillSame) {
          await tryClickSkip(page);
          await page.waitForTimeout(150);
        }
        stepsTaken++;
      }

      // If we ended on the mastery phase, click through it
      const inMastery = await page
        .getByText("MASTERY CHECK", { exact: false })
        .first()
        .isVisible()
        .catch(() => false);
      if (inMastery) {
        await sweepMastery(page, bucket);
      }

      // If we ended on the completion screen, dismiss it
      const onComplete = await page
        .getByRole("button", { name: /On to the next|Try again/i })
        .first()
        .isVisible()
        .catch(() => false);
      if (onComplete) {
        await page.getByRole("button", { name: /On to the next|Try again/i }).click();
        await page.waitForTimeout(400);
      }
    } catch (e) {
      bucket.pageExceptions.push(`Sweep loop error: ${(e as Error).message}`);
      bucket.ok = false;
    }

    bucket.durationMs = Date.now() - t0;
    bucket.ok =
      bucket.pageExceptions.length === 0 &&
      bucket.consoleErrors.length === 0 &&
      bucket.stuckOnPages.length === 0;
    process.stdout.write(
      `  L${String(id).padStart(3, "0")} ${bucket.title?.padEnd(36) ?? "(unknown)"} ${
        bucket.ok ? "✅" : "❌"
      } ${bucket.durationMs}ms\n`
    );

    // Back to map so we can pick the next lesson
    await navigateBackToMap(page);
  }

  currentBucket = null;
});

// ─── Helpers ──────────────────────────────────────────────────────────

async function openLesson(page: Page, id: number) {
  // The curriculum map node is a button labelled by the lesson id and
  // title. Find it via the aria-label we already set in CurriculumMap.
  const node = page.getByRole("button", { name: new RegExp(`^Lesson ${id}:`) });
  const visible = await node.isVisible().catch(() => false);
  if (!visible) {
    // Map probably isn't visible — go to map first.
    await navigateBackToMap(page);
    await page.waitForTimeout(300);
  }
  await node.scrollIntoViewIfNeeded();
  await node.click();
  // Wait for lesson player to mount (looks for the X/Y page counter).
  await page.waitForSelector("text=/^\\d+\\/\\d+$/", { timeout: 10_000 });
}

async function readLessonMeta(
  page: Page
): Promise<{ title?: string; totalPages?: number; pageIdx?: number }> {
  const counter = await page
    .locator("text=/^\\d+\\/\\d+$/")
    .first()
    .textContent()
    .catch(() => null);
  let totalPages: number | undefined;
  let pageIdx: number | undefined;
  if (counter) {
    const m = counter.match(/^(\d+)\/(\d+)$/);
    if (m) {
      pageIdx = parseInt(m[1], 10);
      totalPages = parseInt(m[2], 10);
    }
  }
  // Title: the centre header has tier (L1, L2…) + the title itself.
  const title = await page
    .locator("h1, h2")
    .first()
    .textContent()
    .catch(() => null);
  return { title: title?.trim() || undefined, totalPages, pageIdx };
}

async function currentPageIndex(page: Page): Promise<number | null> {
  const counter = await page
    .locator("text=/^\\d+\\/\\d+$/")
    .first()
    .textContent()
    .catch(() => null);
  if (!counter) return null;
  const m = counter.match(/^(\d+)\/\d+$/);
  return m ? parseInt(m[1], 10) : null;
}

async function tryClickSkip(page: Page): Promise<boolean> {
  // Try common skip / advance buttons in priority order
  const candidates = [
    page.getByRole("button", { name: /^Skip\b/i }),
    page.getByRole("button", { name: /^Skip — I played it$/i }),
    page.getByRole("button", { name: /^SKIP MIC FOR NOW$/i }),
    page.getByRole("button", { name: /Tap to continue/i }),
    page.getByRole("button", { name: /^Next/i }),
  ];
  for (const cand of candidates) {
    const visible = await cand.first().isVisible().catch(() => false);
    if (visible) {
      await cand.first().click().catch(() => {});
      await page.waitForTimeout(150);
      return true;
    }
  }
  return false;
}

async function auditPageRender(
  page: Page,
  bucket: LessonResult,
  pageIdx: number
) {
  // Figure fallthrough — the GenericFigureCard renders a "FIGURE" label
  // chip above the dashed-italic description. Its presence on a page
  // means the keyword router didn't match.
  const fallthrough = await page
    .getByText("FIGURE", { exact: true })
    .first()
    .isVisible()
    .catch(() => false);
  if (fallthrough) {
    if (!bucket.figureFallthroughPages.includes(pageIdx)) {
      bucket.figureFallthroughPages.push(pageIdx);
    }
  }
  // Silent audio — the timestamp shows 0:00 / 0:00 with the play button
  // hidden? Our latest fix hides the player on file errors, so 0:00/0:00
  // visible means the file is still loading or the duration is zero.
  // Treat persistent 0:00/0:00 as silent audio.
  const ts = await page
    .locator("text=/^0:00 / 0:00$/")
    .first()
    .textContent()
    .catch(() => null);
  if (ts) {
    if (!bucket.silentAudioPages.includes(pageIdx)) {
      bucket.silentAudioPages.push(pageIdx);
    }
  }
}

async function sweepMastery(page: Page, bucket: LessonResult) {
  const maxQuestions = 12;
  for (let i = 0; i < maxQuestions; i++) {
    // Pick the FIRST option; we just want to advance, not score.
    const opt = page
      .getByRole("button", { name: /^(Yes|No|Up|Down|Step|Skip|Loud|Soft|Fast|Slow|Line|Space|High|Low|Middle|Far|A|B|C)$/i })
      .first();
    const playSkip = page.getByRole("button", { name: /^Skip — I played it$/i });
    const tapTo = page.getByRole("button", { name: /^Tap any/i });

    if (await opt.isVisible().catch(() => false)) {
      await opt.click().catch(() => {});
    } else if (await playSkip.isVisible().catch(() => false)) {
      await playSkip.click().catch(() => {});
    } else if (await tapTo.isVisible().catch(() => false)) {
      await tapTo.click().catch(() => {});
    } else {
      break;
    }
    await page.waitForTimeout(900);
    // Are we on the completion screen yet?
    const done = await page
      .getByRole("button", { name: /On to the next|Try again/i })
      .first()
      .isVisible()
      .catch(() => false);
    if (done) break;
  }
  void bucket; // reserved for future per-question audit
}

async function navigateBackToMap(page: Page) {
  // Try Exit / Back / Home / Escape in that order, then dispatch a
  // direct nav as a last resort.
  const candidates = [
    page.getByRole("button", { name: /^← Exit$/i }),
    page.getByRole("button", { name: /^← Back$/i }),
    page.getByRole("button", { name: /^← Home$/i }),
  ];
  for (const cand of candidates) {
    if (await cand.first().isVisible().catch(() => false)) {
      await cand.first().click();
      await page.waitForTimeout(400);
      break;
    }
  }
  // Make sure we're on the map (Lessons screen). If we ended up on the
  // home menu, click Lessons.
  const onMenu = await page
    .getByRole("button", { name: /^Lessons$/i })
    .first()
    .isVisible()
    .catch(() => false);
  if (onMenu) {
    await page.getByRole("button", { name: /^Lessons$/i }).first().click();
    await page.waitForTimeout(400);
  }
}

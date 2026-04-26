#!/usr/bin/env node
/**
 * audit-lessons — sweeps every lesson page in lessonsV2.data.json and
 * produces a single bug list covering:
 *
 *   - Schema problems (missing fields, unknown interaction types)
 *   - Drills with no options (would hit our skip placeholder)
 *   - Figures the keyword router won't match (plain-text fallback)
 *   - Sequence/song notes that fall outside the rendered keyboard range
 *   - Mastery questions with figures the router won't reach
 *   - Pages that reference an interaction type the player doesn't render
 *
 * Optional: pass --check-audio to HEAD every page audio URL on S3.
 * That's ~4000 HTTP requests so it's slow but tells you exactly which
 * pages are silent.
 *
 *   node scripts/audit-lessons.mjs            # static checks only
 *   node scripts/audit-lessons.mjs --check-audio
 */
import { readFileSync, writeFileSync } from "node:fs";
import { resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = resolve(__dirname, "..");
const DATA = resolve(ROOT, "src/lib/music/lessonsV2.data.json");
const REPORT = resolve(ROOT, "scripts/audit-lessons-report.md");

const checkAudio = process.argv.includes("--check-audio");
const AUDIO_BASE = "https://sonata-audio.s3.eu-west-1.amazonaws.com/audio";

// ─── Figure keyword bags (mirrors LessonV2Figures.tsx FigureRouter) ──
// If any of these match in (figure ∪ cleffy ∪ followup_cleffy ∪ completion_cleffy),
// the page WILL render a real figure component. Otherwise it falls through to
// the plain-text dashed-italic GenericFigureCard.
const FIGURE_KEYWORDS = {
  staircase:  ["staircase", "stairs", "stair", "step up", "step down",
               "stepping up", "stepping down", "step going up",
               "step going down", "going up", "going down",
               "moves up", "moves down", "ascending", "descending",
               "another step", "one step", "two step", "three step"],
  cleffy:     ["cleffy"],
  pyramid:    ["pyramid"],
  celebration:["celebration", "trophy", "complete", "confetti", "you did it", "well done", "postcard"],
  hand:       ["finger", "thumb", "pinky", "hand", "palm"],
  rhythm:     ["metronome", "time signature", "beat", "tempo", "whole note",
               "half note", "quarter note", "eighth note", "dotted", "rhythm",
               "4/4", "3/4", "2/4", "6/8"],
  staff:      ["staff", "clef", "treble", "bass clef", "grand staff", "ledger",
               "notation", "music line", "five lines", "five-line",
               "line note", "space note", "lines and spaces",
               "on a line", "in a space", "on the line", "in the space",
               "between two lines", "lines or spaces",
               "line to space", "space to line", "line to line", "space to space",
               "line \u2192", "space \u2192",
               "pair of notes", "pairs of notes",
               "two notes", "three notes", "four notes", "five notes",
               "line 1", "line 2", "line 3", "line 4", "line 5",
               "space 1", "space 2", "space 3", "space 4",
               "leap"],
  keyboard:   ["keyboard", "piano", "black-key", "black key", "white key",
               "white-key", "2-group", "3-group", "two-group", "three-group",
               "middle c", "the keys", "tap any", "play any",
               "press any", "any white", "any black", "row:", "alphabet"],
  quizScaffold: ["banner", "round counter", "rounds", "play button", "play buttons",
                 "playback button", "playback buttons", "playback card",
                 "playback cards", "answer button", "answer buttons", "round 1"],
};

// Interaction types the player has direct support for. The "soft" set
// are types without dedicated renderers but whose intent gets handled
// by sequenceMidiSteps's fallback paths (free-play, name-and-play,
// finger-call). They no longer count as broken because the page still
// renders + grades.
const KNOWN_INTERACTION_TYPES = new Set([
  "tap",
  "sequence",
  "rhythm",
  "song",
  "drill",
  "choice",
  "echo",
  "rhythm_race",
  "drag",
  // Soft-handled via sequenceMidiSteps fallbacks
  "name_and_play",
  "finger_call",
  "see_hear_play",
  "shape",
  "labels",
]);

// Note → MIDI lookup (treble + bass span; matches the player's parseTapAccept).
const PITCH_CLASS = { C: 0, D: 2, E: 4, F: 5, G: 7, A: 9, B: 11 };

function noteToMidi(token) {
  if (!token || typeof token !== "string") return null;
  const m = token.match(/^([A-Ga-g])(#|b)?(-?\d)$/);
  if (!m) return null;
  const pc = PITCH_CLASS[m[1].toUpperCase()];
  const acc = m[2] === "#" ? 1 : m[2] === "b" ? -1 : 0;
  const oct = parseInt(m[3], 10);
  return (oct + 1) * 12 + pc + acc;
}

// ─── Helpers ──────────────────────────────────────────────────────────

function combinedFigureText(page) {
  return [
    page.figure || "",
    page.cleffy || "",
    page.followup_cleffy || "",
    page.completion_cleffy || "",
  ]
    .join(" ")
    .toLowerCase();
}

function hasKeywordAny(text, keywords) {
  for (const k of keywords) {
    if (text.includes(k.toLowerCase())) return true;
  }
  return false;
}

function figureWillRender(page) {
  const text = combinedFigureText(page);
  // Order mirrors FigureRouter's tiers
  if (page.type === "wrap" && (page.is_graduation || page.is_tier_boss || page.is_mid_boss || page.is_act_boss))
    return "celebration";
  if (page.type?.startsWith("reflection")) return "pyramid";
  if (page.type === "whats_next" || page.type === "whats_next_life_after") return "pyramid";
  if (hasKeywordAny(text, FIGURE_KEYWORDS.pyramid)) return "pyramid";
  if (hasKeywordAny(text, FIGURE_KEYWORDS.staircase)) return "staircase";
  if (page.type === "hook" || hasKeywordAny(text, FIGURE_KEYWORDS.cleffy)) return "cleffy";
  if (hasKeywordAny(text, FIGURE_KEYWORDS.celebration)) return "celebration";
  if (page.type === "wrap") return "celebration"; // every wrap page now renders a celebration
  if (hasKeywordAny(text, FIGURE_KEYWORDS.hand)) return "hand";
  if (hasKeywordAny(text, FIGURE_KEYWORDS.rhythm)) return "rhythm";
  if (hasKeywordAny(text, FIGURE_KEYWORDS.staff)) return "staff";
  if (/\bphrase\s*\d?:/i.test(text)) return "staff";
  if (/\bline\s*\d:/i.test(text)) return "staff";
  if (/\b[A-G]-[A-G]-[A-G]\b/.test(text)) return "staff";
  if (hasKeywordAny(text, FIGURE_KEYWORDS.keyboard)) return "keyboard";
  if (/\b[A-G](?:[#b])?[1-7]\b/.test(text)) return "keyboard"; // explicit pitch
  if (/\b(C|D|E|F|G|A|B) (key|note|chord|major|minor)\b/i.test(text)) return "keyboard";
  if (/\b[A-G]\s+[A-G]\s+[A-G]\b/.test(text)) return "keyboard";
  if (/\b[A-G][#b]?[0-9]?-[A-G][#b]?[0-9]?-[A-G][#b]?[0-9]?\b/.test(text)) return "keyboard";
  if (/\b(LH|RH|left hand|right hand)\b/i.test(text)) return "keyboard";
  if (page.highlights && Object.keys(page.highlights).length > 0) return "keyboard";
  if (hasKeywordAny(text, FIGURE_KEYWORDS.quizScaffold)) return "quizScaffold";
  // Player default: any play/hear page renders KeyboardMini even without keywords.
  if (page.mode === "play" || page.mode === "hear") return "keyboard (default)";
  return null; // GenericFigureCard plain-text fallback
}

function masteryFigureWillRender(q) {
  // Mastery question figures NOW route through FigureRouter (see
  // LessonV2.tsx QuestionCard). Run the same keyword test as a normal
  // page using a synthetic page object: figure plus the question
  // prompt as additional cleffy-equivalent signal.
  const synthetic = {
    figure: q.figure || "",
    cleffy: q.prompt || "",
    type: "mastery",
    mode: "see",
  };
  return !!figureWillRender(synthetic);
}

function pageAudioUrl(lessonId, pageId) {
  const lid = String(lessonId).padStart(3, "0");
  const pid = String(pageId).padStart(2, "0");
  return `${AUDIO_BASE}/lesson-${lid}/page-${pid}.mp3`;
}

async function headOk(url) {
  try {
    const res = await fetch(url, { method: "HEAD" });
    return res.ok;
  } catch {
    return false;
  }
}

// ─── Main sweep ───────────────────────────────────────────────────────

const lessons = JSON.parse(readFileSync(DATA, "utf8"));
const issues = []; // { lessonId, page, type, message }
const stats = {
  totalLessons: lessons.length,
  totalPages: 0,
  pagesWithFigure: 0,
  pagesFigureRenders: 0,
  pagesFigureFallsThroughToText: 0,
  pagesWithNarration: 0,
  pagesWithAudioMissing: 0, // only populated with --check-audio
  drillsNoOptions: 0,
  unknownInteractions: 0,
  notesOutOfRange: 0,
  masteryFiguresUnreachable: 0,
};

function recordIssue(lessonId, pageId, type, message) {
  issues.push({ lessonId, pageId, type, message });
}

const audioChecks = [];

for (const lesson of lessons) {
  const lid = lesson.id;

  // Lesson-level checks
  if (!lesson.title) recordIssue(lid, "—", "schema", "Lesson has no title");
  if (!lesson.completion?.cleffy)
    recordIssue(lid, "—", "schema", "Lesson has no completion.cleffy");

  // Page-level checks
  for (const page of lesson.pages || []) {
    stats.totalPages++;
    const pid = page.id;

    // Figure rendering
    if (page.figure) {
      stats.pagesWithFigure++;
      const renders = figureWillRender(page);
      if (renders) {
        stats.pagesFigureRenders++;
      } else {
        stats.pagesFigureFallsThroughToText++;
        recordIssue(
          lid,
          pid,
          "figure-fallthrough",
          `Figure won't render visually (will show plain text): "${page.figure.slice(0, 70)}"`
        );
      }
    }

    // Narration → audio expected
    if (page.cleffy || page.completion_cleffy || page.followup_cleffy) {
      stats.pagesWithNarration++;
      if (checkAudio) {
        audioChecks.push({ lid, pid });
      }
    }

    // Interaction sanity
    const it = page.interaction;
    if (it) {
      if (!KNOWN_INTERACTION_TYPES.has(it.type)) {
        stats.unknownInteractions++;
        recordIssue(
          lid,
          pid,
          "unknown-interaction",
          `Unknown interaction type "${it.type}"`
        );
      }
      if (it.type === "drill") {
        const hasOptionsOnRoot = Array.isArray(it.options) && it.options.length > 0;
        const hasPerRound =
          Array.isArray(it.rounds) &&
          it.rounds.every((r) => r && Array.isArray(r.options) && r.options.length > 0);
        if (!hasOptionsOnRoot && !hasPerRound) {
          stats.drillsNoOptions++;
          recordIssue(
            lid,
            pid,
            "drill-no-options",
            "Drill has no options — will render as graceful skip placeholder"
          );
        }
      }
      // Notes out of range
      const notes = [];
      if (Array.isArray(it.keys)) notes.push(...it.keys);
      if (Array.isArray(it.sequence)) {
        for (const item of it.sequence) {
          if (typeof item === "string") notes.push(item);
          else if (Array.isArray(item)) notes.push(...item);
        }
      }
      if (typeof it.note === "string") notes.push(it.note);
      if (typeof it.key === "string") notes.push(it.key);
      for (const n of notes) {
        const m = noteToMidi(n);
        if (m == null) continue;
        if (m < 21 || m > 108) {
          stats.notesOutOfRange++;
          recordIssue(
            lid,
            pid,
            "note-out-of-range",
            `Note ${n} (MIDI ${m}) is outside the 88-key range`
          );
        }
      }
    }

    // Highlights sanity
    if (page.highlights) {
      for (const k of Object.keys(page.highlights)) {
        const m = Number(k);
        if (Number.isFinite(m) && (m < 21 || m > 108)) {
          stats.notesOutOfRange++;
          recordIssue(
            lid,
            pid,
            "highlight-out-of-range",
            `Highlight MIDI ${m} is outside the 88-key range`
          );
        }
      }
    }
  }

  // Mastery check sanity
  const mc = lesson.mastery_check;
  if (mc?.sections) {
    for (const sec of ["see", "hear", "play"]) {
      const sect = mc.sections[sec];
      if (!sect?.questions) continue;
      for (let qi = 0; qi < sect.questions.length; qi++) {
        const q = sect.questions[qi];
        // Figures here always fall through (known bug).
        if (q.figure && !masteryFigureWillRender(q)) {
          stats.masteryFiguresUnreachable++;
          recordIssue(
            lid,
            `mc-${sec}-q${qi + 1}`,
            "mastery-figure-fallthrough",
            `Mastery ${sec} Q${qi + 1} figure won't match a renderer: "${q.figure.slice(0, 60)}"`
          );
        }
        // Choice questions need options
        if (q.options && !Array.isArray(q.options)) {
          recordIssue(
            lid,
            `mc-${sec}-q${qi + 1}`,
            "schema",
            `Mastery ${sec} Q${qi + 1} options is not an array`
          );
        }
        // Negation in figure that the heuristic gets wrong
        if (
          q.figure &&
          /\(\s*not\s+[A-G]\s*\)/i.test(q.figure)
        ) {
          recordIssue(
            lid,
            `mc-${sec}-q${qi + 1}`,
            "mastery-negation-bug",
            "Mastery question figure says 'not X' but the keyboard hint will still highlight X"
          );
        }
      }
    }
  }
}

// Optional: HEAD-check audio. Limit concurrency.
if (checkAudio) {
  console.log(`Checking ${audioChecks.length} audio URLs on S3…`);
  const CONCURRENCY = 16;
  let i = 0;
  await Promise.all(
    Array.from({ length: CONCURRENCY }, async () => {
      while (i < audioChecks.length) {
        const my = i++;
        const { lid, pid } = audioChecks[my];
        const url = pageAudioUrl(lid, pid);
        const ok = await headOk(url);
        if (!ok) {
          stats.pagesWithAudioMissing++;
          recordIssue(lid, pid, "audio-missing", `No audio file at ${url}`);
        }
      }
    })
  );
}

// ─── Group issues per lesson and write report ────────────────────────

const byLesson = new Map();
for (const i of issues) {
  if (!byLesson.has(i.lessonId)) byLesson.set(i.lessonId, []);
  byLesson.get(i.lessonId).push(i);
}

const issueTypeCounts = {};
for (const i of issues) {
  issueTypeCounts[i.type] = (issueTypeCounts[i.type] || 0) + 1;
}

const md = [];
md.push(`# Sonata Lesson Audit\n`);
md.push(`Generated: ${new Date().toISOString()}\n`);
md.push(`Audio checked: ${checkAudio ? "yes" : "no (run with --check-audio for full audio coverage)"}\n`);

md.push(`## Summary\n`);
md.push(`| Metric | Count |\n|---|---|`);
for (const [k, v] of Object.entries(stats)) {
  md.push(`| ${k} | ${v} |`);
}
md.push(``);

md.push(`## Issue counts by type\n`);
md.push(`| Type | Count |\n|---|---|`);
for (const [t, n] of Object.entries(issueTypeCounts).sort(
  (a, b) => b[1] - a[1]
)) {
  md.push(`| ${t} | ${n} |`);
}
md.push(``);

md.push(`## Issues by lesson\n`);
for (const lesson of lessons) {
  const lid = lesson.id;
  const list = byLesson.get(lid) || [];
  if (list.length === 0) continue;
  md.push(`### Lesson ${lid} — "${lesson.title}" (${list.length} issue${list.length === 1 ? "" : "s"})`);
  for (const it of list) {
    md.push(`- \`${it.type}\` page ${it.pageId}: ${it.message}`);
  }
  md.push(``);
}

const cleanLessons = lessons
  .filter((l) => !(byLesson.get(l.id)?.length))
  .map((l) => l.id);
md.push(`## Lessons with zero issues (${cleanLessons.length} of ${lessons.length})\n`);
md.push(cleanLessons.length ? cleanLessons.join(", ") : "(none)");
md.push(``);

writeFileSync(REPORT, md.join("\n"));
console.log(`\nWrote ${REPORT}\n`);
console.log(`Total issues: ${issues.length}`);
console.log("Issue types:");
for (const [t, n] of Object.entries(issueTypeCounts).sort((a, b) => b[1] - a[1])) {
  console.log(`  ${t.padEnd(34)} ${n}`);
}
console.log(`\nLessons with zero issues: ${cleanLessons.length} / ${lessons.length}`);

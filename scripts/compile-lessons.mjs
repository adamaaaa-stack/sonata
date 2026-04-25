#!/usr/bin/env node
/**
 * Read every content/lessons/lesson-*.yaml, enrich each page with a
 * `highlights` map derived from figure + cleffy text, and emit the
 * final combined JSON at src/lib/music/lessonsV2.data.json.
 *
 * Enrichment rules (heuristic):
 *  1. Explicit colour notation: "C (gold)", "F# (blue)" → midi → color
 *  2. Generic highlight keywords ("glowing", "highlighted", "golden",
 *     "flag", "lit up", "planted", "glows") in a sentence → all notes
 *     in that sentence get a default gold highlight.
 *  3. Play-page sequence notes → dim gold baseline (lets student know
 *     which keys are in play even before they press anything).
 *  4. `interaction.keys` is always highlighted.
 *
 * The parser is conservative — only tags notes on *clear* signals.
 * Missing highlights can be manually added by putting a `highlights:`
 * block on the page in YAML (we preserve any existing entry).
 *
 *  node scripts/compile-lessons.mjs
 */
import { readFileSync, writeFileSync, readdirSync } from "node:fs";
import { resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { execSync } from "node:child_process";

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = resolve(__dirname, "..");
const LESSONS_DIR = resolve(ROOT, "content/lessons");
const OUT_FILE = resolve(ROOT, "src/lib/music/lessonsV2.data.json");

function parseYamlAll() {
  const files = readdirSync(LESSONS_DIR)
    .filter((f) => f.startsWith("lesson-") && f.endsWith(".yaml"))
    .sort();
  console.log(`Found ${files.length} lesson YAMLs`);
  const json = execSync(
    `python3 -c "import sys, yaml, json, glob; print(json.dumps([yaml.safe_load(open(f)) for f in sorted(glob.glob('${LESSONS_DIR}/lesson-*.yaml'))]))"`,
    { encoding: "utf8", maxBuffer: 128 * 1024 * 1024 }
  );
  return JSON.parse(json);
}

// ------------------------------------------------------------------
// Note → MIDI helpers
// ------------------------------------------------------------------
const LETTER_TO_PC = { C: 0, D: 2, E: 4, F: 5, G: 7, A: 9, B: 11 };

/** "C4", "F#4", "Bb3", "D-sharp", "E-flat" → midi number or null. */
function noteToMidi(token, defaultOctave = 4) {
  if (!token || typeof token !== "string") return null;
  // Handle "C-sharp" / "E-flat" / "C sharp"
  const normalized = token
    .replace(/\s*-?\s*sharp\b/i, "#")
    .replace(/\s*-?\s*flat\b/i, "b");
  const m = /^([A-G])([#b]?)(-?\d)?$/.exec(normalized);
  if (!m) return null;
  const letter = m[1].toUpperCase();
  const acc = m[2] || "";
  const oct = m[3] != null ? parseInt(m[3], 10) : defaultOctave;
  let pc = LETTER_TO_PC[letter];
  if (pc == null) return null;
  if (acc === "#") pc += 1;
  else if (acc === "b") pc -= 1;
  return (oct + 1) * 12 + pc;
}

// ------------------------------------------------------------------
// Text → note tokens
// ------------------------------------------------------------------
// Matches:
//   C, C4, F#, F#4, Bb, Bb3, C-sharp, E-flat, D sharp
const NOTE_RE =
  /\b([A-G](?:#|b|-?\s?sharp|-?\s?flat)?(?:[2-7])?)\b/gi;

function findNoteTokens(text) {
  if (!text) return [];
  const out = [];
  let m;
  while ((m = NOTE_RE.exec(text)) !== null) {
    const tok = m[1];
    // Single-letter notes are very noisy ("a", "an", "of"...). Only accept
    // single letters that are uppercase in source to avoid matching "a" etc.
    if (/^[A-G]$/.test(tok) && m[0] !== m[0].toUpperCase()) continue;
    out.push({ tok, index: m.index });
  }
  return out;
}

// ------------------------------------------------------------------
// Colour palette
// ------------------------------------------------------------------
const COLOR_MAP = {
  gold: "#E8A93C",
  golden: "#E8A93C",
  yellow: "#E8A93C",
  green: "#4ADE80",
  lime: "#A3E635",
  blue: "#60A5FA",
  sky: "#60A5FA",
  red: "#F87171",
  crimson: "#EF4444",
  orange: "#FB923C",
  pink: "#F472B6",
  magenta: "#E879F9",
  purple: "#A78BFA",
  violet: "#8B5CF6",
  cyan: "#22D3EE",
  teal: "#2DD4BF",
  coral: "#FB7185",
  berry: "#BE185D",
};
const DEFAULT_HI = "#E8A93C";
const DIM_HI = "#F5E4B3"; // very light gold — hint only

const HIGHLIGHT_KEYWORDS = [
  "glow",
  "glows",
  "glowing",
  "glowed",
  "highlight",
  "highlighted",
  "highlights",
  "golden",
  "gold flag",
  "planted",
  "lit up",
  "flag",
  "marked",
  "flash",
  "flashing",
  "pulse",
  "pulsing",
  "sparkle",
  "shining",
  "shiny",
];

function sentencesOf(text) {
  if (!text) return [];
  return text
    .split(/[.!?]+/)
    .map((s) => s.trim())
    .filter(Boolean);
}

// ------------------------------------------------------------------
// Enrich a single page with highlights
// ------------------------------------------------------------------
function enrichPage(page) {
  const figure = page.figure || "";
  const cleffy = [page.cleffy, page.completion_cleffy, page.followup_cleffy]
    .filter(Boolean)
    .join(" ");
  const combined = `${figure} ${cleffy}`;

  const highlights = { ...(page.highlights || {}) }; // preserve manual

  // Rule 1 — explicit "note (color)" notation in figure
  const colorRe = new RegExp(
    `([A-G](?:#|b|-?\\s?sharp|-?\\s?flat)?(?:[2-7])?)\\s*\\((${Object.keys(
      COLOR_MAP
    ).join("|")})\\)`,
    "gi"
  );
  let m;
  while ((m = colorRe.exec(combined)) !== null) {
    const midi = noteToMidi(m[1]);
    if (midi != null) {
      highlights[midi] = COLOR_MAP[m[2].toLowerCase()] || DEFAULT_HI;
    }
  }

  // Rule 2 — highlight keywords in a sentence → tag all notes in that sentence
  for (const s of sentencesOf(combined)) {
    const lower = s.toLowerCase();
    if (!HIGHLIGHT_KEYWORDS.some((kw) => lower.includes(kw))) continue;
    for (const { tok } of findNoteTokens(s)) {
      const midi = noteToMidi(tok);
      if (midi != null && !(midi in highlights)) {
        highlights[midi] = DEFAULT_HI;
      }
    }
  }

  // Rule 3 — interaction.keys get a dim baseline highlight
  const inter = page.interaction;
  const seqNotes = [];
  if (inter) {
    if (inter.type === "sequence" && Array.isArray(inter.keys)) {
      seqNotes.push(...inter.keys);
    } else if (
      (inter.type === "rhythm" || inter.type === "song") &&
      Array.isArray(inter.sequence)
    ) {
      for (const item of inter.sequence) {
        if (typeof item === "string") seqNotes.push(item);
        else if (Array.isArray(item)) {
          for (const sub of item) if (typeof sub === "string") seqNotes.push(sub);
        }
      }
    }
  }
  for (const n of seqNotes) {
    const midi = noteToMidi(n);
    if (midi != null && !(midi in highlights)) {
      highlights[midi] = DIM_HI;
    }
  }

  if (Object.keys(highlights).length > 0) {
    page.highlights = highlights;
  }
  return page;
}

function enrichLesson(lesson) {
  if (!Array.isArray(lesson.pages)) return lesson;
  for (const p of lesson.pages) enrichPage(p);
  return lesson;
}

// ------------------------------------------------------------------
// Main
// ------------------------------------------------------------------
function main() {
  const data = parseYamlAll();
  console.log(`Parsed ${data.length} lessons`);

  data.sort((a, b) => (a.id || 0) - (b.id || 0));

  // Enrich
  let tagged = 0;
  for (const l of data) {
    enrichLesson(l);
    for (const p of l.pages || []) {
      if (p.highlights && Object.keys(p.highlights).length > 0) tagged++;
    }
  }
  const totalPages = data.reduce((n, l) => n + (l.pages?.length || 0), 0);
  console.log(`Enriched ${tagged}/${totalPages} pages with highlights`);

  writeFileSync(OUT_FILE, JSON.stringify(data, null, 0));
  const sizeMb = (
    Buffer.byteLength(JSON.stringify(data)) /
    1024 /
    1024
  ).toFixed(2);
  console.log(`Wrote ${OUT_FILE} (${sizeMb} MB)`);
}

main();

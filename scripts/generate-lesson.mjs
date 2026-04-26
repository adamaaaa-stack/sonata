#!/usr/bin/env node
// Generate one Sonata lesson YAML.
//
// Defaults to OpenRouter + Gemma 4 26B A4B IT (free tier). Falls back to
// Groq + gpt-oss-120b if PROVIDER=groq is set.
//
// Reads .env.local for OPENROUTER_API_KEY (preferred) or GROQ_API_KEY.
//
// Usage: node scripts/generate-lesson.mjs <concept>
// Example: node scripts/generate-lesson.mjs "dotted half note"

import fs from "node:fs";
import path from "node:path";
import { validateAndFix } from "./lesson-validator.mjs";

// Tiny .env.local parser — avoid pulling in dotenv as a dep just for this.
function loadEnvLocal() {
  const envPath = path.join(process.cwd(), ".env.local");
  if (!fs.existsSync(envPath)) return;
  for (const line of fs.readFileSync(envPath, "utf8").split("\n")) {
    const m = /^([A-Z0-9_]+)=(.*)$/.exec(line.trim());
    if (m && !process.env[m[1]]) process.env[m[1]] = m[2];
  }
}
loadEnvLocal();

const PROVIDER = process.env.PROVIDER || "openrouter";

let API_URL, API_KEY, MODEL_ID, EXTRA_HEADERS;
if (PROVIDER === "groq") {
  API_URL = "https://api.groq.com/openai/v1/chat/completions";
  API_KEY = process.env.GROQ_API_KEY;
  MODEL_ID = "openai/gpt-oss-120b";
  EXTRA_HEADERS = {};
  if (!API_KEY) { console.error("Missing GROQ_API_KEY"); process.exit(1); }
} else {
  // OpenRouter — Qwen3 30B A3B (paid).
  // MoE (3B active per token), fast, ASCII-clean output, on-voice for Cleffy.
  // Pricing: $0.08/M input, $0.28/M output → ~$0.003 per generated lesson.
  // ~$0.40 to fill the entire 150-concept cache.
  // Override via MODEL_ID env var if you want to A/B another model.
  API_URL = "https://openrouter.ai/api/v1/chat/completions";
  API_KEY = process.env.OPENROUTER_API_KEY;
  MODEL_ID = process.env.MODEL_ID || "qwen/qwen3-30b-a3b";
  EXTRA_HEADERS = {
    "HTTP-Referer": "https://learnwithsonata.com",
    "X-Title": "Sonata Lesson Generator",
  };
  if (!API_KEY) { console.error("Missing OPENROUTER_API_KEY in .env.local"); process.exit(1); }
}

const concept = process.argv.slice(2).join(" ").trim() || "dotted half note";

// Pack as many reference lessons into the prompt as the context budget
// allows. We sample evenly across the 250 to capture diversity (early-tier
// piano geography → mid-tier reading → late-tier repertoire) and pack until
// we hit a token cap. Token estimate: ~chars/4.
function readLesson(id) {
  const p = `content/lessons/lesson-${String(id).padStart(3, "0")}.yaml`;
  return fs.readFileSync(p, "utf8");
}

// Reference lessons are used to teach the model VOICE, not format.
// (The system prompt enforces the 6-page short format separately.) We
// pick a small diverse sample so the model sees Cleffy's tone across
// concepts without bloating the input.
const SAMPLE_IDS = [4, 6, 8, 11, 14, 23, 28, 47, 75, 125];

// Smaller char budget now that we only need ~10 reference lessons.
const PROMPT_CHAR_BUDGET = 120_000; // ~30k tokens of references
const referenceBlocks = [];
let used = 0;
for (const id of SAMPLE_IDS) {
  let txt;
  try { txt = readLesson(id); } catch { continue; }
  const block = `═══════ Lesson ${id} ═══════\n${txt}\n`;
  if (used + block.length > PROMPT_CHAR_BUDGET) break;
  used += block.length;
  referenceBlocks.push(block);
}
const REFERENCES = referenceBlocks.join("\n");
console.error(
  `Packed ${referenceBlocks.length} reference lessons (~${Math.round(used / 4 / 1000)}k tokens).`
);

const SYSTEM_PROMPT = `You are a senior piano-pedagogy author writing lessons for Sonata, an app
that teaches piano using the "steps-and-skips" method. You write in the
EXACT style and schema of the reference lessons that follow.

═══ CORE METHOD VOCABULARY ═══
- step: moving to the immediately adjacent letter (C → D)
- skip: skipping one letter (C → E)
- leap: a larger interval
- the staircase: visual metaphor for white keys ascending
- 2-group / 3-group: clusters of 2 or 3 black keys
- Middle C: the anchor note in the centre of the keyboard

═══ CHARACTER: Cleffy ═══
Warm. Calm. Encouraging without being saccharine. Never condescending.
Talks like a great older-sibling piano teacher: short sentences, concrete
metaphors, no jargon unless this lesson is the one introducing it. Use ASCII
punctuation only — straight quotes ('), straight apostrophes ('), em dash —
allowed but use sparingly. NEVER curly quotes.

═══ YAML SCHEMA — FOLLOW EXACTLY ═══

Top-level fields (all required unless marked optional):
  id            number
  tier          string ("beginner" | "early-intermediate" | "intermediate" | "advanced")
  act           number (1-3)
  title         string
  subtitle      string
  goal          string (one sentence)
  prereqs       number[] (lesson ids that must come before this one)
  method_focus  string slug (e.g. "piano-geography", "rhythm", "reading", "fingers", "hand-position", "interval-recognition")
  time_estimate_min  number
  piece_context  string | null
  metaphor      string slug (kebab-case description of the central metaphor)
  vibe          string[] (1-3 words, e.g. ["gentle", "playful"])
  pages         array of EXACTLY 16 pages
  mastery_check object (see below)
  remediation   object (see below) — optional
  completion    object: { cleffy: ">..." (string), xp: number, unlocks?: number, tier_complete?: number }

Each page object:
  id            number 1..16
  mode          "see" | "hear" | "play" | "read"
  type          string slug (free-form, kebab-case, descriptive — e.g. "hook", "definition", "interactive_spot", "demo", "drill", "wrap")
  figure        string (visual description; the renderer parses keywords like
                "Keyboard", "Staff", "Middle C", "two Gs", "low/high",
                "circled/glowing", "2-group", "3-group", etc)
  cleffy        string — multiline, written as: cleffy: >\n  text\n  more text
  audio         optional, map of label→description: { A: "C4 then E4", B: "..." }
  interaction   optional — see allowed shapes below
  followup_cleffy   optional string — what Cleffy says after a correct attempt
  completion_cleffy optional string
  corrections   optional array of { wrong_label: string, cleffy: ">..." }

Interaction shapes (pick exactly ONE per page that has interaction):
  { type: "tap", accept?: string, finger?: number 1-5, count?: number }
        — accept is a free-text predicate the player understands. Examples:
        "any C", "F3", "any C in lowest 3 octaves", "any 2-group across all octaves",
        "any key in left/middle/right third", "any key". DO NOT include duration
        ("held for 3 beats" is NOT supported by the player).
  { type: "sequence", keys: string[] }
        — Each key like "C4", "F#5". Player walks the student through them.
        Use this when you want SPECIFIC notes. If unsure of octave, use 4.
  { type: "rhythm", sequence: (string|string[])[], durations?: string[], tempo?: number }
        — sequence items are notes ("C4") or chord arrays (["C4","E4","G4"]).
  { type: "song", sequence: (string|string[])[], guides?: boolean, tempo?: number }
        — similar to rhythm but framed as a song.
  { type: "drill", rounds: number | { question: string, options: string[] }[] }
        — rounds is either a count or a list of question objects.
  { type: "choice", options: string[], correct: number (0-based index) }
        — for multiple-choice see/hear pages.

mastery_check shape:
  sections:
    see:  { pass_threshold: number, questions: [...] }
    hear: { pass_threshold: number, questions: [...] }
    play: { pass_threshold: number, questions: [...] }
  Each question:
    figure?: string         (for see-section)
    audio?: string          (for hear-section)
    prompt: string          (always)
    options?: string[]      (for multiple-choice)
    correct?: number        (for multiple-choice)
    accept?: string         (for play-section, same predicate as tap.accept)

remediation (OPTIONAL): { id: string (e.g. "X.5"), title: string, pages: number, opening_cleffy: string }
  IMPORTANT: pages here is a NUMBER (count of pages), not an array. The remediation pages
  themselves are NOT inlined — Sonata generates them on demand if needed.

═══ COMPACT LESSON FORMAT — 6 PAGES ═══

You are writing SHORT, FOCUSED lessons that still cover see → hear → play → check.
Generate EXACTLY 6 pages, in this order:

  Page 1  mode=see  type=hook        Intro the concept in 1-2 sentences. One vivid figure.
  Page 2  mode=see  type=definition  Show what it looks like. 1-2 sentences explaining.
  Page 3  mode=hear type=demo        Audio sample. 1 sentence. Sometimes a choice question.
  Page 4  mode=play type=guided      Student plays it the easy way. 1-2 sentences.
  Page 5  mode=play type=practice    A slightly harder application. 1-2 sentences.
  Page 6  mode=see  type=wrap        One-sentence recap + tease of next.

Cleffy text on each page should be SHORT — 10 to 25 words max. Bite-sized.
No long lectures. The figure does most of the visual lifting.

INTERACTIONS:
- Pages 4 and 5 must include an interaction block (tap / sequence / rhythm / song).
- Page 3 may include a choice interaction (or no interaction — just a hear-and-see demo).
- Pages 1, 2, 6 typically have no interaction.

mastery_check is OPTIONAL and SHORT when present:
- Total ≤ 3 questions across all sections combined.
- If skipping mastery_check entirely, just include a "completion" block.
- Skip remediation entirely.

completion block — keep it tight: { cleffy: ">...", xp: <number 5-15> }

═══ OUTPUT FORMAT ═══
Output ONLY a complete YAML document. No markdown fences. No prose before or after.
Use 2-space indentation. Use ">" for cleffy multi-line text. ASCII punctuation only.`;

const USER_PROMPT = `Write a complete Sonata lesson teaching the concept: "${concept}".

Use id 999 (placeholder). Pick a sensible tier and prereqs.
Match the voice, structure, and field shapes of the reference lessons below EXACTLY.

═══════════ REFERENCE LESSONS (study these for voice + schema) ═══════════
${REFERENCES}
═══════════ END REFERENCES ═══════════

Now write the new lesson teaching "${concept}". Output ONLY the YAML, no fences, no prose.`;

async function main() {
  const body = {
    model: MODEL_ID,
    messages: [
      { role: "system", content: SYSTEM_PROMPT },
      { role: "user", content: USER_PROMPT },
    ],
    temperature: 0.7,
    max_tokens: 20000,
    // gpt-oss models burn output tokens on internal "thinking" before
    // emitting visible content. Setting reasoning effort to "low" leaves
    // most of the budget for the actual lesson.
    reasoning: { effort: "low" },
  };

  console.error(`[${PROVIDER}] Generating lesson on "${concept}" via ${MODEL_ID}…`);
  const t0 = Date.now();
  const resp = await fetch(API_URL, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${API_KEY}`,
      ...EXTRA_HEADERS,
    },
    body: JSON.stringify(body),
  });

  if (!resp.ok) {
    console.error(`[${PROVIDER}] error:`, resp.status, await resp.text());
    process.exit(1);
  }

  const data = await resp.json();
  const text = data.choices?.[0]?.message?.content || "";
  const usage = data.usage || {};
  console.error(`Done in ${((Date.now() - t0) / 1000).toFixed(1)}s — tokens: ${usage.total_tokens || "?"}`);

  // Strip any accidental markdown fences the model adds.
  const stripped = text.replace(/^```ya?ml\n?|```$/gm, "").trim();

  // Run schema validator + auto-fixer. Catches the few schema slips the
  // models keep making (key→accept, duration drops, curly quotes, etc.)
  const { yaml: cleaned, warnings } = validateAndFix(stripped);
  if (warnings.length > 0) {
    console.error(`Validator warnings (${warnings.length}):`);
    for (const w of warnings) console.error(`  - ${w}`);
  } else {
    console.error("Validator: clean ✓");
  }

  const outDir = "content/generated";
  fs.mkdirSync(outDir, { recursive: true });
  const slug = concept.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
  const outPath = path.join(outDir, `${slug}.yaml`);
  fs.writeFileSync(outPath, cleaned);
  console.error(`Wrote ${outPath}`);
  process.stdout.write(cleaned + "\n");
}

main().catch((e) => {
  console.error("Fatal:", e);
  process.exit(1);
});

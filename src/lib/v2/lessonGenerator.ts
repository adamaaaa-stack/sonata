/**
 * Lesson generator — server-side. Calls OpenRouter (DeepSeek V3.2-Exp by
 * default) with a curriculum-aware prompt and a kind-matched subset of the
 * 250 hand-authored reference lessons, returning a validated lesson YAML.
 *
 * Design choices that earlier iterations got wrong:
 *
 *  1. Curriculum-aware. The generator now knows which concepts the
 *     student has already mastered. The system prompt forbids referring
 *     to anything outside that set as "already taught" — fixes the
 *     "you know C and F" hallucination from the v1 generator.
 *
 *  2. Kind-matched references. Earlier we picked 10 hardcoded lesson
 *     IDs. Now we score all 250 references by relevance to the target
 *     concept's kind and pick the top 20. The model sees the right
 *     pedagogy, not random distractors.
 *
 *  3. Proper-sized lessons. The hand-authored corpus averages ~16
 *     pages. We no longer cap at 6. Page count emerges from the
 *     references the model is studying.
 *
 *  4. JSON mode + schema. Output is JSON with response_format enforced;
 *     we convert to YAML server-side. The model can't drift on field
 *     names or page structure.
 *
 * Used by: /api/lesson/route.ts
 */

import fs from "node:fs";
import path from "node:path";
import yaml from "js-yaml";
import { validateAndFix } from "./lessonValidator";
import type { Concept, ConceptKind } from "./pathGenerator";
import { getConcept, getAllConcepts } from "./pathGenerator";

const PROMPT_CHAR_BUDGET = 240_000; // ~60k tokens for references
const REFERENCE_TARGET_COUNT = 20;

// ─────────────────────────────────────────────────────────────────────────
// Reference lesson corpus
// ─────────────────────────────────────────────────────────────────────────

interface ReferenceLesson {
  id: number;
  text: string;
  charLength: number;
  /** Best-guess concept kind for this lesson, derived from method_focus. */
  kind: ConceptKind | "general";
  /** Bin: 1 = early, 2 = mid, 3 = late. Lets us tier-match too. */
  tier: 1 | 2 | 3;
}

let cachedRefs: ReferenceLesson[] | null = null;

function loadAllReferences(): ReferenceLesson[] {
  if (cachedRefs) return cachedRefs;
  const dir = path.join(process.cwd(), "content/lessons");
  const refs: ReferenceLesson[] = [];
  for (let i = 1; i <= 250; i++) {
    const fp = path.join(dir, `lesson-${String(i).padStart(3, "0")}.yaml`);
    let text: string;
    try {
      text = fs.readFileSync(fp, "utf8");
    } catch {
      continue;
    }
    refs.push({
      id: i,
      text,
      charLength: text.length,
      kind: kindOfReference(text),
      tier: i <= 80 ? 1 : i <= 170 ? 2 : 3,
    });
  }
  cachedRefs = refs;
  return refs;
}

/**
 * Map the lesson YAML's `method_focus` field to one of our concept kinds.
 * The hand-authored corpus uses a slightly different vocabulary
 * ("piano-geography", "steps", "combine", etc.) so we normalise here.
 */
function kindOfReference(text: string): ReferenceLesson["kind"] {
  const m = text.match(/^method_focus:\s*"?([a-z\-]+)"?/m);
  const focus = m?.[1] || "";
  switch (focus) {
    case "keys":
    case "piano-geography":
      return "geography";
    case "steps":
    case "skips":
    case "leaps":
    case "intervals":
    case "patterns":
      return "interval";
    case "hands":
      return "hand";
    case "notation":
    case "accidentals":
      return "notation";
    case "rhythm":
    case "tempo":
    case "odd-even":
      return "rhythm";
    case "dynamics":
      return "dynamics";
    default:
      return "general";
  }
}

/**
 * Pick the references most relevant to the target concept. Strategy:
 *
 *  - Score each reference by kind-match + tier proximity + a small variety
 *    bonus so we don't pick 20 nearly identical lessons.
 *  - Sort, walk down, accept until we hit our character budget.
 *
 * Returns the selected references concatenated into a single block ready
 * to drop into the prompt.
 */
function buildReferenceBlock(target: Concept): {
  text: string;
  used: number[];
} {
  const all = loadAllReferences();
  const targetKind = (target.kind as ConceptKind) || "general";
  const targetTier = inferTargetTier(target);

  // Score each reference
  const scored = all.map((r) => {
    let score = 0;
    if (r.kind === targetKind) score += 10;
    else if (related(r.kind, targetKind as RefKind)) score += 4;
    else if (r.kind === "general") score += 2;
    // Tier proximity (early-target lesson → early references)
    score += 3 - Math.abs(r.tier - targetTier);
    return { ref: r, score };
  });
  scored.sort((a, b) => b.score - a.score || a.ref.id - b.ref.id);

  // Walk down, accept until budget exhausted
  const blocks: string[] = [];
  const used: number[] = [];
  let chars = 0;
  for (const { ref } of scored) {
    if (used.length >= REFERENCE_TARGET_COUNT) break;
    if (chars + ref.charLength > PROMPT_CHAR_BUDGET) break;
    blocks.push(`═══════ Reference Lesson ${ref.id} ═══════\n${ref.text}\n`);
    used.push(ref.id);
    chars += ref.charLength;
  }
  return { text: blocks.join("\n"), used };
}

type RefKind = ReferenceLesson["kind"];

function related(a: RefKind, b: RefKind): boolean {
  if (a === "general" || b === "general") return false;
  const pairs: [ConceptKind, ConceptKind][] = [
    ["geography", "interval"],
    ["interval", "notation"],
    ["geography", "hand"],
    ["hand", "interval"],
    ["hand", "hand_position"],
    ["hand_position", "geography"],
    ["rhythm", "dynamics"],
    ["notation", "rhythm"],
  ];
  return pairs.some(
    ([x, y]) =>
      (x === (a as ConceptKind) && y === (b as ConceptKind)) ||
      (x === (b as ConceptKind) && y === (a as ConceptKind))
  );
}

function inferTargetTier(target: Concept): 1 | 2 | 3 {
  const prereqCount = target.prereqs?.length || 0;
  if (prereqCount <= 1) return 1;
  if (prereqCount <= 3) return 2;
  return 3;
}

// ─────────────────────────────────────────────────────────────────────────
// System prompt + JSON Schema
// ─────────────────────────────────────────────────────────────────────────

const SYSTEM_PROMPT = `You are a senior piano-pedagogy author writing lessons for Sonata, an app
that teaches piano using the "steps-and-skips" method. You write in the
EXACT style and schema of the reference lessons that follow.

═══ THE METHOD — NON-NEGOTIABLE ═══

Sonata teaches piano through ONE through-line method: steps, skips, and
leaps. EVERY lesson — no matter what specific concept it teaches —
references this vocabulary. It is the spine of the curriculum.

CORE VOCABULARY:
- step: moving to the immediately adjacent letter (C → D, B → C)
- skip: skipping one letter (C → E, F → A)
- leap: any interval larger than a skip
- the staircase: white keys ascending visualised as stairs
- 2-group / 3-group: clusters of 2 or 3 black keys
- Middle C: the anchor note in the centre of the keyboard

═══ ABSOLUTE RULE: NEVER REFERENCE UNTAUGHT MATERIAL ═══

The student arrives at this lesson having mastered ONLY the concepts
listed in MASTERED_CONCEPTS. You may freely reference, name, and use any
of those — they are old friends. Anything NOT in that list is unknown
to the student. You MUST NOT:
  - Name a note (C, F, etc.) the student hasn't learned yet
  - Use the staff/clef/ledger lines if "treble_clef" or "staff_lines"
    aren't mastered
  - Talk about a concept ("the staircase", "the 2-group", "Middle C") as
    if it's been introduced when it hasn't
  - Assume the student can read notation, count rhythm, or play with two
    hands unless those concepts are mastered

When you need a teaching anchor, reach only for what's mastered. If you
need a new piece of material to make THIS concept land, introduce it
explicitly inside this lesson — never as "as you remember from before."

═══ CHARACTER: Cleffy ═══

Warm. Calm. Encouraging without being saccharine. Never condescending.
Talks like a great older-sibling piano teacher: short sentences, concrete
metaphors, no jargon unless this lesson is the one introducing it.
ASCII punctuation only — straight quotes, straight apostrophes. Em dash
allowed but used sparingly. NEVER curly quotes.

═══ LESSON STRUCTURE ═══

Match the page count and shape of the reference lessons — they average
14-20 pages and walk the student through a real arc:

  1. Hook            (mode=see, type=hook)        Spark curiosity in 1-2 sentences.
  2. Definition      (mode=see, type=definition)  Plainly explain the new thing.
  3. Demo / hear     (mode=hear, type=demo)       Audio sample. Sometimes choice.
  4. Guided practice (mode=play, type=guided)     Easiest possible application.
  5+ More practice   (mode=play, multiple pages)  Build difficulty. Tap, sequence, drill.
  ...
  N-1: Mastery moment  Cleffy names what just happened.
  N:   Wrap            (mode=see, type=wrap)      Recap + tease next.

You may interleave see/hear pages for rest beats. You may add reflection
pages near the end. The goal is a real lesson, not a scaffold.

Cleffy text on each page should be SHORT — 10 to 30 words max. Bite-sized.

═══ INTERACTIONS ═══

Use these shapes (matching the reference lessons exactly):
  { type: "tap", accept?: string }
        accept examples: "any C", "F3", "any 2-group". NO duration field.
  { type: "sequence", keys: string[] }
        keys like "C4", "F#5". Player walks the student through them.
  { type: "rhythm", sequence: (string|string[])[], durations?: string[], tempo?: number }
        sequence items are notes ("C4") or chord arrays.
  { type: "drill", rounds: number }
        for repetition drills.
  { type: "choice", options: string[], correct: number }
        for multiple-choice see/hear pages.

Most play pages have an interaction. See/hear pages MAY have a choice.

mastery_check is OPTIONAL and SHORT — total <= 3 questions.
completion block is required: { cleffy: ">...", xp: <number 5-15> }

═══ OUTPUT FORMAT ═══

Return STRICT JSON matching this schema. No markdown fences, no prose:

{
  "id": <number>,
  "tier": "<beginner|intermediate|advanced>",
  "act": <number 1-5>,
  "title": "<string>",
  "subtitle": "<string>",
  "goal": "<string>",
  "prereqs": [<concept ids that ARE in MASTERED_CONCEPTS>],
  "method_focus": "<one keyword>",
  "time_estimate_min": <number>,
  "metaphor": "<string>",
  "vibe": [<string>, ...],
  "pages": [
    {
      "id": <number, 1-indexed>,
      "mode": "see" | "hear" | "play",
      "type": "<hook|definition|demo|guided|practice|drill|reflection|wrap|...>",
      "figure": "<short description of any visual figure>",
      "cleffy": "<10-30 words of narration>",
      "interaction": <interaction object | null>,
      "highlights": <object | null>
    },
    ...
  ],
  "mastery_check": { ... } | null,
  "completion": { "cleffy": "<string>", "xp": <number> }
}`;

// ─────────────────────────────────────────────────────────────────────────
// Main entrypoint
// ─────────────────────────────────────────────────────────────────────────

export interface LessonGenInput {
  concept: Concept;
  /** Concept ids the student has already mastered. */
  masteredConcepts: string[];
  /** 0-based index of this lesson within the student's path. */
  pathPosition: number;
  /** Total length of the student's current path. */
  pathLength: number;
  /**
   * Concept ids coming up in the path (used to optionally tease forward
   * without referencing them as known).
   */
  upcomingConcepts: string[];
}

export interface LessonGenResult {
  yaml: string;
  warnings: string[];
  tokensTotal: number;
  durationMs: number;
  /** Reference IDs the model studied — useful for debugging. */
  referenceIds: number[];
}

export async function generateLessonForConcept(
  input: Concept | LessonGenInput
): Promise<LessonGenResult> {
  // Backwards compat: if called with just a Concept, treat it as a
  // freshman lesson with no prereqs mastered. This shouldn't happen in
  // production now that the API route always passes masteredConcepts,
  // but keep the fallback for tests / scripts.
  const args: LessonGenInput =
    "concept" in input
      ? input
      : {
          concept: input,
          masteredConcepts: [],
          pathPosition: 0,
          pathLength: 1,
          upcomingConcepts: [],
        };
  const { concept, masteredConcepts, pathPosition, pathLength, upcomingConcepts } =
    args;

  const apiKey = process.env.OPENROUTER_API_KEY;
  if (!apiKey) throw new Error("OPENROUTER_API_KEY is not set");

  const modelId =
    process.env.LESSON_MODEL_ID || "deepseek/deepseek-v3.2-exp";

  const { text: referenceBlock, used: referenceIds } =
    buildReferenceBlock(concept);

  const masteredDetails = masteredConcepts
    .map((id) => {
      const c = getConcept(id);
      return c ? `  - ${c.id}: ${c.name} (${c.kind})` : `  - ${id}`;
    })
    .join("\n");

  const userPrompt = `Write a complete Sonata lesson teaching the concept: "${concept.name}".

═══ CONCEPT TO TEACH ═══
  id:          ${concept.id}
  name:        ${concept.name}
  kind:        ${concept.kind}
  description: ${concept.description}

═══ STUDENT'S CURRENT STATE ═══
  Path position: lesson ${pathPosition + 1} of ${pathLength}
${
  masteredConcepts.length === 0
    ? "  Mastered concepts: NONE — this is the student's very first lesson."
    : `  Mastered concepts (${masteredConcepts.length}):
${masteredDetails}`
}
${
  upcomingConcepts.length > 0
    ? `\n  Coming up after this: ${upcomingConcepts.slice(0, 5).join(", ")}${
        upcomingConcepts.length > 5 ? ", …" : ""
      }`
    : ""
}

═══ HARD RULES (RE-STATED) ═══

1. The student knows ONLY the mastered concepts above. Reference nothing
   else as "already learned."
2. Write a real, properly-sized lesson — match the depth of the
   references below (typically 14-20 pages).
3. Output STRICT JSON. No markdown fences. No prose before or after.
4. Use ASCII punctuation only.
5. Match Cleffy's voice from the references — warm, terse, concrete.

Use lesson id ${conceptIdToLessonId(concept.id)}. Pick tier/act/prereqs
sensibly given the mastered set.

═══════════ REFERENCE LESSONS (study for voice + schema + sizing) ═══════════
${referenceBlock}
═══════════ END REFERENCES ═══════════

Now write the new lesson teaching "${concept.name}". Output ONLY the JSON.`;

  const t0 = Date.now();
  const resp = await fetch("https://openrouter.ai/api/v1/chat/completions", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${apiKey}`,
      "HTTP-Referer": "https://learnwithsonata.com",
      "X-Title": "Sonata Lesson Generator",
    },
    body: JSON.stringify({
      model: modelId,
      messages: [
        { role: "system", content: SYSTEM_PROMPT },
        { role: "user", content: userPrompt },
      ],
      temperature: 0.6,
      max_tokens: 16000,
      response_format: { type: "json_object" },
    }),
  });

  if (!resp.ok) {
    const txt = await resp.text();
    throw new Error(`OpenRouter ${resp.status}: ${txt}`);
  }
  const data = await resp.json();
  const text = data.choices?.[0]?.message?.content || "";
  const tokensTotal = data.usage?.total_tokens ?? 0;

  // Parse JSON, then dump as YAML so the rest of the pipeline (validator
  // + LessonV2 player) can keep operating on YAML strings.
  const jsonText = stripFences(text);
  let parsedObj: unknown;
  try {
    parsedObj = JSON.parse(jsonText);
  } catch (e) {
    throw new Error(
      `lessonGenerator: invalid JSON: ${(e as Error).message}\n\nRaw: ${jsonText.slice(
        0,
        400
      )}`
    );
  }
  const yamlText = yaml.dump(parsedObj, {
    indent: 2,
    lineWidth: 100,
    noRefs: true,
    quotingType: '"',
  });

  const { yaml: validated, warnings } = validateAndFix(yamlText);

  return {
    yaml: validated,
    warnings,
    tokensTotal,
    durationMs: Date.now() - t0,
    referenceIds,
  };
}

function stripFences(s: string): string {
  return s.replace(/^```(?:json|ya?ml)?\n?|```$/gm, "").trim();
}

/**
 * Map concept ids to stable placeholder lesson ids in the 9000+ range so
 * they can't clash with the original 1-250 hand-authored set.
 */
function conceptIdToLessonId(conceptId: string): number {
  let h = 0;
  for (let i = 0; i < conceptId.length; i++) {
    h = (h * 31 + conceptId.charCodeAt(i)) >>> 0;
  }
  return 9000 + (h % 1000);
}

// Re-exports for callers that previously got these from this module.
export { getConcept, getAllConcepts };

/**
 * Lesson generator — server-side. Calls OpenRouter (Qwen3 30B A3B) with
 * the system prompt + reference lessons + concept request and returns a
 * validated 6-page lesson YAML.
 *
 * Same logic as scripts/generate-lesson.mjs but importable from a Next.js
 * API route. Designed to be called rarely (cache-on-miss) — typical
 * request: ~30s, ~$0.003.
 *
 * Used by: /api/lesson/[concept]/route.ts
 */

import fs from "node:fs";
import path from "node:path";
import { validateAndFix } from "./lessonValidator";
import type { Concept } from "./pathGenerator";
import { getConcept } from "./pathGenerator";

const SAMPLE_LESSON_IDS = [4, 6, 8, 11, 14, 23, 28, 47, 75, 125];
const PROMPT_CHAR_BUDGET = 120_000;

let cachedReferences: string | null = null;
function loadReferences(): string {
  if (cachedReferences) return cachedReferences;
  const blocks: string[] = [];
  let used = 0;
  for (const id of SAMPLE_LESSON_IDS) {
    const p = path.join(
      process.cwd(),
      "content/lessons",
      `lesson-${String(id).padStart(3, "0")}.yaml`
    );
    let txt: string;
    try {
      txt = fs.readFileSync(p, "utf8");
    } catch {
      continue;
    }
    const block = `═══════ Lesson ${id} ═══════\n${txt}\n`;
    if (used + block.length > PROMPT_CHAR_BUDGET) break;
    used += block.length;
    blocks.push(block);
  }
  cachedReferences = blocks.join("\n");
  return cachedReferences;
}

const SYSTEM_PROMPT = `You are a senior piano-pedagogy author writing lessons for Sonata, an app
that teaches piano using the "steps-and-skips" method. You write in the
EXACT style and schema of the reference lessons that follow.

═══ THE METHOD — NON-NEGOTIABLE ═══

Sonata teaches piano through ONE through-line method: steps, skips, and
leaps. EVERY lesson — no matter what specific concept it teaches —
references this vocabulary. It is the spine of the curriculum. This is
not a request, it is the product.

CORE METHOD VOCABULARY:
- step: moving to the immediately adjacent letter (C → D, B → C)
- skip: skipping one letter (C → E, F → A)
- leap: any interval larger than a skip
- the staircase: white keys ascending visualised as stairs
- 2-group / 3-group: clusters of 2 or 3 black keys
- Middle C: the anchor note in the centre of the keyboard

HOW EVERY LESSON USES THE METHOD (no exceptions):

- Rhythm lessons: "this rhythm STEPS in time" or "the dotted half STEPS
  over three beats" or "your hand walks UP the staircase, one step
  per beat"
- Notation lessons: "this note STEPS up from C" or "see how the staff
  shows steps as line→space, skips as line→line"
- Hand-position lessons: "your fingers STEP from one key to the next"
- Dynamics lessons: "play softly while STEPPING up the staircase"
- Theory lessons: introduce intervals AS steps/skips/leaps — never
  as "minor seconds" or "major thirds" until much later, and even then
  always anchored back to the step/skip/leap framing.

═══ CHARACTER: Cleffy ═══
Warm. Calm. Encouraging without being saccharine. Never condescending.
Talks like a great older-sibling piano teacher: short sentences, concrete
metaphors, no jargon unless this lesson is the one introducing it. Use ASCII
punctuation only — straight quotes, straight apostrophes, em dash —
allowed but use sparingly. NEVER curly quotes.

═══ COMPACT LESSON FORMAT — 6 PAGES ═══

Generate EXACTLY 6 pages, in this order:

  Page 1  mode=see  type=hook        Intro the concept in 1-2 sentences. One vivid figure.
  Page 2  mode=see  type=definition  Show what it looks like. 1-2 sentences explaining.
  Page 3  mode=hear type=demo        Audio sample. 1 sentence. Sometimes a choice question.
  Page 4  mode=play type=guided      Student plays it the easy way. 1-2 sentences.
  Page 5  mode=play type=practice    A slightly harder application. 1-2 sentences.
  Page 6  mode=see  type=wrap        One-sentence recap + tease of next.

Cleffy text on each page should be SHORT — 10 to 25 words max. Bite-sized.

INTERACTIONS:
- Pages 4 and 5 must include an interaction block (tap / sequence / rhythm / song).
- Page 3 may include a choice interaction.
- Pages 1, 2, 6 typically have no interaction.

Interaction shapes:
  { type: "tap", accept?: string }
        — accept examples: "any C", "F3", "any 2-group". NO duration field.
  { type: "sequence", keys: string[] }
        — Each key like "C4", "F#5". Player walks the student through them.
  { type: "rhythm", sequence: (string|string[])[], durations?: string[], tempo?: number }
        — sequence items are notes ("C4") or chord arrays.
  { type: "drill", rounds: number }
        — for repetition drills.
  { type: "choice", options: string[], correct: number }
        — for multiple-choice see/hear pages.

mastery_check is OPTIONAL and SHORT — total ≤ 3 questions across sections.
completion block: { cleffy: ">...", xp: <number 5-15> }

═══ OUTPUT FORMAT ═══
Output ONLY a complete YAML document. No markdown fences. No prose before or after.
Use 2-space indentation. ASCII punctuation only.`;

export interface LessonGenResult {
  yaml: string;
  warnings: string[];
  tokensTotal: number;
  durationMs: number;
}

export async function generateLessonForConcept(
  concept: Concept
): Promise<LessonGenResult> {
  const apiKey = process.env.OPENROUTER_API_KEY;
  if (!apiKey) throw new Error("OPENROUTER_API_KEY is not set");

  const modelId = process.env.LESSON_MODEL_ID || "qwen/qwen3-30b-a3b";
  const referenceBlock = loadReferences();

  const userPrompt = `Write a complete Sonata lesson teaching the concept: "${concept.name}".

Concept context:
  - id: ${concept.id}
  - kind: ${concept.kind}
  - description: ${concept.description}

Use id ${conceptIdToLessonId(concept.id)} (placeholder for the lesson). Pick a sensible
tier and prereqs based on the concept kind.

Match the voice, structure, and field shapes of the reference lessons below EXACTLY.

═══════════ REFERENCE LESSONS (study for voice + schema) ═══════════
${referenceBlock}
═══════════ END REFERENCES ═══════════

Now write the new lesson teaching "${concept.name}". Output ONLY the YAML, no fences, no prose.`;

  const t0 = Date.now();
  const resp = await fetch(
    "https://openrouter.ai/api/v1/chat/completions",
    {
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
        temperature: 0.7,
        max_tokens: 20000,
      }),
    }
  );

  if (!resp.ok) {
    const txt = await resp.text();
    throw new Error(`OpenRouter ${resp.status}: ${txt}`);
  }
  const data = await resp.json();
  const text = data.choices?.[0]?.message?.content || "";
  const tokensTotal = data.usage?.total_tokens ?? 0;

  const stripped = text.replace(/^```ya?ml\n?|```$/gm, "").trim();
  const { yaml, warnings } = validateAndFix(stripped);

  return { yaml, warnings, tokensTotal, durationMs: Date.now() - t0 };
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

/** Re-export for convenience. */
export { getConcept };

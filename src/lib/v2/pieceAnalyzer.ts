/**
 * Piece analyzer — sheet music image → structured piece data.
 *
 * Calls a vision-capable LLM via OpenRouter, asks it to identify the
 * Sonata concepts the piece requires from our ontology, plus extract a
 * simplified single-voice melody (note + duration sequence) for the
 * final lesson where the student plays the actual uploaded piece.
 *
 * Model: google/gemini-2.5-pro (or override via PIECE_VLM_ID env var).
 * Cost: ~$0.10-0.30 per 1-2 page beginner sheet.
 *
 * Used by: /api/piece/upload/route.ts
 */

import { getAllConcepts, type Concept } from "./pathGenerator";

export interface PieceAnalysis {
  title: string;
  composer?: string;
  key: string;
  time_signature: string;
  tempo_hint?: number;
  difficulty_estimate: "beginner" | "intermediate" | "advanced";
  hand: "right" | "left" | "both";
  /** Concept ids from our ontology that this piece requires. */
  concepts: string[];
  /** Simplified single-voice melody for the final play-through lesson. */
  melody: { note: string; duration: string }[];
  /** VLM's free-form notes — useful for confirm-and-correct UX. */
  notes: string;
  /** Tokens consumed during analysis. */
  tokensTotal: number;
  /** Wall time of the call, ms. */
  durationMs: number;
}

function buildSystemPrompt(concepts: Concept[]): string {
  const conceptList = concepts
    .map((c) => `  - ${c.id}: ${c.name} (${c.kind}) — ${c.description}`)
    .join("\n");

  return `You are a music transcription assistant for the Sonata piano-learning app.
You are given a photo or PDF of sheet music. Your job is to:

1. Identify metadata: title, composer (if visible), key, time signature,
   tempo hint, difficulty (beginner / intermediate / advanced),
   which hand(s) play.
2. Tag the piece with the Sonata CONCEPT IDs it requires. ONLY use ids
   from the concept catalogue below.
3. Transcribe a simplified single-voice melody as a list of (note, duration)
   pairs. Notes use ABC notation: "C4", "F#5", "Bb3", etc. Durations are
   one of: "quarter", "half", "whole", "dotted_half", "eighth", "quarter_rest".
   Keep this under 64 events for beginner pieces — just enough for the
   student to play the melody at the end of their lesson plan.
4. Add free-form NOTES describing anything unusual or hard to read. The
   user will confirm and correct your guesses.

═══ CONCEPT CATALOGUE ═══
${conceptList}

═══ OUTPUT FORMAT ═══
Return STRICT JSON. No markdown fences. No prose before or after. Schema:

{
  "title": string,
  "composer": string | null,
  "key": string,
  "time_signature": string,
  "tempo_hint": number | null,
  "difficulty_estimate": "beginner" | "intermediate" | "advanced",
  "hand": "right" | "left" | "both",
  "concepts": string[],     // strictly from the catalogue ids above
  "melody": [{ "note": string, "duration": string }, ...],
  "notes": string
}

If the image is unclear or not sheet music, return:
{ "error": "could not read sheet music", "notes": "<why>" }`;
}

export async function analyzePiece(
  imageBytes: Buffer,
  contentType: string
): Promise<PieceAnalysis> {
  const apiKey = process.env.OPENROUTER_API_KEY;
  if (!apiKey) throw new Error("OPENROUTER_API_KEY is not set");

  const modelId = process.env.PIECE_VLM_ID || "google/gemini-2.5-pro";
  const concepts = getAllConcepts();

  const dataUrl = `data:${contentType};base64,${imageBytes.toString("base64")}`;

  const t0 = Date.now();
  const resp = await fetch("https://openrouter.ai/api/v1/chat/completions", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${apiKey}`,
      "HTTP-Referer": "https://learnwithsonata.com",
      "X-Title": "Sonata Piece Analyzer",
    },
    body: JSON.stringify({
      model: modelId,
      messages: [
        { role: "system", content: buildSystemPrompt(concepts) },
        {
          role: "user",
          content: [
            {
              type: "text",
              text: "Analyze this sheet music. Output strict JSON only.",
            },
            { type: "image_url", image_url: { url: dataUrl } },
          ],
        },
      ],
      temperature: 0.2,
      max_tokens: 4000,
    }),
  });

  if (!resp.ok) {
    const txt = await resp.text();
    throw new Error(`OpenRouter ${resp.status}: ${txt}`);
  }
  const data = await resp.json();
  const text = data.choices?.[0]?.message?.content || "";
  const tokensTotal = data.usage?.total_tokens ?? 0;

  // Extract JSON. Strip any markdown fences the model might add.
  const cleaned = text.replace(/^```json\n?|^```\n?|```$/gm, "").trim();
  let parsed: Partial<PieceAnalysis> & { error?: string };
  try {
    parsed = JSON.parse(cleaned);
  } catch (e) {
    throw new Error(
      `VLM returned invalid JSON: ${(e as Error).message}\n\nRaw: ${cleaned.slice(0, 400)}`
    );
  }
  if (parsed.error) {
    throw new Error(`VLM could not read sheet: ${parsed.error}`);
  }

  // Filter concepts to only known ids — VLMs hallucinate.
  const knownIds = new Set(concepts.map((c) => c.id));
  const concepts_filtered = (parsed.concepts || []).filter((id): id is string =>
    typeof id === "string" && knownIds.has(id)
  );

  return {
    title: parsed.title || "Untitled",
    composer: parsed.composer || undefined,
    key: parsed.key || "C major",
    time_signature: parsed.time_signature || "4/4",
    tempo_hint: parsed.tempo_hint || undefined,
    difficulty_estimate: parsed.difficulty_estimate || "beginner",
    hand: parsed.hand || "right",
    concepts: concepts_filtered,
    melody: Array.isArray(parsed.melody) ? parsed.melody : [],
    notes: parsed.notes || "",
    tokensTotal,
    durationMs: Date.now() - t0,
  };
}

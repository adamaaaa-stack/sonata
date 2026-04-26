/**
 * POST /api/lesson
 * body: {
 *   concept: string,             // concept id to teach
 *   mastered?: string[],         // concept ids the student already knows
 *   pathPosition?: number,       // 0-based index within the path
 *   pathLength?: number,         // total path length
 *   upcoming?: string[],         // concept ids coming up after this
 * }
 *
 * Returns a generated lesson YAML for the given concept, tuned to the
 * student's current state. The lesson never references untaught material
 * as known.
 *
 * Cache: Supabase `cached_lessons` keyed on (concept_id, sha256(mastered)).
 * Hit  → return stored YAML (~50ms).
 * Miss → call the LLM, persist, return.
 *
 * POST (not GET) so the route is incompatible with static prerender —
 * Next's `output: "export"` mode passes API routes through untouched
 * when they're POST-only, but tries to prerender GETs.
 */

import { NextResponse } from "next/server";
import { getConcept, getAllConcepts } from "@/lib/v2/pathGenerator";
import { generateLessonForConcept } from "@/lib/v2/lessonGenerator";
import {
  getCachedLesson,
  putCachedLesson,
  hashMasteredSet,
} from "@/lib/v2/lessonCache";

const SAFE_ID = /^[a-z0-9_]+$/i;

function sanitizeConceptIds(input: unknown): string[] {
  if (!Array.isArray(input)) return [];
  const known = new Set(getAllConcepts().map((c) => c.id));
  return input
    .filter((s): s is string => typeof s === "string" && SAFE_ID.test(s))
    .filter((id) => known.has(id));
}

export async function POST(req: Request) {
  let body: {
    concept?: unknown;
    mastered?: unknown;
    pathPosition?: unknown;
    pathLength?: unknown;
    upcoming?: unknown;
  };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "invalid JSON body" }, { status: 400 });
  }

  const id = typeof body.concept === "string" ? body.concept : "";
  if (!SAFE_ID.test(id)) {
    return NextResponse.json({ error: "invalid concept id" }, { status: 400 });
  }
  const concept = getConcept(id);
  if (!concept) {
    return NextResponse.json(
      { error: `unknown concept: ${id}` },
      { status: 404 }
    );
  }

  // Sanitise mastery context. Drop anything that isn't a real concept id.
  const masteredConcepts = sanitizeConceptIds(body.mastered).filter(
    (cid) => cid !== id // never include the concept being taught
  );
  const upcomingConcepts = sanitizeConceptIds(body.upcoming).filter(
    (cid) => cid !== id
  );
  const pathPosition =
    typeof body.pathPosition === "number" && body.pathPosition >= 0
      ? Math.floor(body.pathPosition)
      : 0;
  const pathLength =
    typeof body.pathLength === "number" && body.pathLength > 0
      ? Math.floor(body.pathLength)
      : 1;

  const masteredHash = hashMasteredSet(masteredConcepts);

  // Cache hit?
  try {
    const cached = await getCachedLesson(id, masteredHash);
    if (cached?.yaml) {
      return new NextResponse(cached.yaml, {
        status: 200,
        headers: {
          "Content-Type": "application/yaml",
          "Cache-Control": "public, max-age=86400",
          "X-Sonata-Cache": "hit",
          "X-Sonata-Mastered-Hash": masteredHash,
          "X-Sonata-Model": cached.model_id || "",
        },
      });
    }
  } catch (e) {
    console.warn(
      `[api/lesson] cache read failed (continuing): ${(e as Error).message}`
    );
  }

  // Cache miss → generate, then store.
  try {
    const result = await generateLessonForConcept({
      concept,
      masteredConcepts,
      pathPosition,
      pathLength,
      upcomingConcepts,
    });

    void putCachedLesson({
      concept_id: id,
      mastered_hash: masteredHash,
      yaml: result.yaml,
      model_id: process.env.LESSON_MODEL_ID || "deepseek/deepseek-v3.2-exp",
      tokens_total: result.tokensTotal,
      duration_ms: result.durationMs,
      warnings: result.warnings,
      mastered_concepts: masteredConcepts,
      path_position: pathPosition,
      path_length: pathLength,
    });

    return new NextResponse(result.yaml, {
      status: 200,
      headers: {
        "Content-Type": "application/yaml",
        "X-Sonata-Cache": "miss",
        "X-Sonata-Mastered-Hash": masteredHash,
        "X-Sonata-Tokens": String(result.tokensTotal),
        "X-Sonata-Duration-Ms": String(result.durationMs),
        "X-Sonata-Warnings": JSON.stringify(result.warnings),
      },
    });
  } catch (e) {
    return NextResponse.json(
      { error: (e as Error).message || "generator failed" },
      { status: 500 }
    );
  }
}

/**
 * Server-side cache for LLM-generated lessons.
 *
 * Backed by the `cached_lessons` Supabase table (see src/lib/schema.sql).
 * Keyed on (concept_id, mastered_hash) so the same concept can be cached
 * multiple times under different prerequisite contexts:
 *
 *   - Two students approach "skips" with different prereqs mastered →
 *     two cached lessons, each tuned to the student's actual knowledge.
 *   - Most students share the canonical prereq set → one cache row
 *     serves them all.
 *
 * Why not /tmp? Vercel's /tmp is per-instance and ephemeral. Every deploy
 * or cold start wiped the cache and forced regeneration.
 *
 * Used by: src/app/api/lesson/route.ts
 */
import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import { createHash } from "node:crypto";

let _admin: SupabaseClient | null = null;
function getAdmin(): SupabaseClient | null {
  if (_admin) return _admin;
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) return null;
  _admin = createClient(url, key, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
  return _admin;
}

export interface CachedLessonRow {
  concept_id: string;
  mastered_hash: string;
  yaml: string;
  model_id?: string | null;
  tokens_total?: number | null;
  duration_ms?: number | null;
  warnings?: string[] | null;
  mastered_concepts?: string[] | null;
  path_position?: number | null;
  path_length?: number | null;
}

/**
 * Canonical hash of the mastered-concept set. Sort + join + sha256 so
 * order doesn't matter and the hash is stable across requests. Truncate
 * to 16 hex chars — collision risk is negligible at our scale (~thousands
 * of rows).
 */
export function hashMasteredSet(masteredConcepts: string[]): string {
  if (!masteredConcepts || masteredConcepts.length === 0) return "baseline";
  const sorted = [...masteredConcepts].sort();
  return createHash("sha256")
    .update(sorted.join(","))
    .digest("hex")
    .slice(0, 16);
}

/**
 * Look up a cached lesson by (concept, mastery hash). Returns null if no
 * row exists or if Supabase isn't configured.
 */
export async function getCachedLesson(
  conceptId: string,
  masteredHash: string
): Promise<CachedLessonRow | null> {
  const admin = getAdmin();
  if (!admin) return null;
  const { data, error } = await admin
    .from("cached_lessons")
    .select(
      "concept_id, mastered_hash, yaml, model_id, tokens_total, duration_ms, warnings, mastered_concepts, path_position, path_length"
    )
    .eq("concept_id", conceptId)
    .eq("mastered_hash", masteredHash)
    .maybeSingle();
  if (error) {
    console.warn(`[lessonCache] read failed: ${error.message}`);
    return null;
  }
  return (data as CachedLessonRow) || null;
}

/**
 * Persist a generated lesson. Upserts on (concept_id, mastered_hash).
 * Failures are logged but never thrown.
 */
export async function putCachedLesson(row: CachedLessonRow): Promise<void> {
  const admin = getAdmin();
  if (!admin) {
    console.warn(
      "[lessonCache] Supabase admin client not configured — skipping cache write"
    );
    return;
  }
  const { error } = await admin.from("cached_lessons").upsert(
    {
      concept_id: row.concept_id,
      mastered_hash: row.mastered_hash,
      yaml: row.yaml,
      model_id: row.model_id ?? null,
      tokens_total: row.tokens_total ?? null,
      duration_ms: row.duration_ms ?? null,
      warnings: row.warnings ?? [],
      mastered_concepts: row.mastered_concepts ?? [],
      path_position: row.path_position ?? null,
      path_length: row.path_length ?? null,
      updated_at: new Date().toISOString(),
    },
    { onConflict: "concept_id,mastered_hash" }
  );
  if (error) {
    console.warn(`[lessonCache] write failed: ${error.message}`);
  }
}

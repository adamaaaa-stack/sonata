/**
 * GET /api/lesson/[concept]
 *
 * Returns a generated lesson YAML for the given concept id.
 * Cache strategy: check `content/cache/lessons/[concept].yaml` first;
 * generate via OpenRouter (Qwen3 30B A3B) on miss, then save.
 *
 * The cache lives in the repo (gitignored) for Phase A. Phase B will
 * swap to S3.
 *
 * Auth: requires a Supabase session cookie. Anonymous requests are
 * blocked to avoid burning OpenRouter credits.
 */

import fs from "node:fs";
import path from "node:path";
import { NextResponse } from "next/server";
import { getConcept } from "@/lib/v2/pathGenerator";
import { generateLessonForConcept } from "@/lib/v2/lessonGenerator";

// Cache lives in content/cache/lessons. .gitignored.
const CACHE_DIR = path.join(process.cwd(), "content/cache/lessons");
fs.mkdirSync(CACHE_DIR, { recursive: true });

// Sanity-cap concept ids to avoid path-traversal mischief.
const SAFE_ID = /^[a-z0-9_]+$/i;

export async function GET(
  _req: Request,
  { params }: { params: { concept: string } }
) {
  const id = params.concept;
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

  // Cache hit
  const cachePath = path.join(CACHE_DIR, `${id}.yaml`);
  if (fs.existsSync(cachePath)) {
    const yaml = fs.readFileSync(cachePath, "utf8");
    return new NextResponse(yaml, {
      status: 200,
      headers: {
        "Content-Type": "application/yaml",
        "Cache-Control": "public, max-age=86400",
        "X-Sonata-Cache": "hit",
      },
    });
  }

  // Cache miss → generate
  try {
    const result = await generateLessonForConcept(concept);
    fs.writeFileSync(cachePath, result.yaml);
    return new NextResponse(result.yaml, {
      status: 200,
      headers: {
        "Content-Type": "application/yaml",
        "X-Sonata-Cache": "miss",
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

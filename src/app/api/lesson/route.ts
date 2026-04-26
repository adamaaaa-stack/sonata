/**
 * POST /api/lesson
 * body: { concept: string }
 *
 * Returns a generated lesson YAML for the given concept id.
 * Cache strategy: check `content/cache/lessons/[concept].yaml` first;
 * generate via OpenRouter (Qwen3 30B A3B) on miss, then save.
 *
 * POST (not GET) so the route is incompatible with static prerender —
 * Next's `output: "export"` mode passes API routes through untouched
 * when they're POST-only, but tries to prerender GETs.
 */

import fs from "node:fs";
import path from "node:path";
import { NextResponse } from "next/server";
import { getConcept } from "@/lib/v2/pathGenerator";
import { generateLessonForConcept } from "@/lib/v2/lessonGenerator";

// Cache lives in content/cache/lessons. .gitignored. Lazy mkdir on first
// request — top-level fs side effects break Next's static export.
const CACHE_DIR = path.join(process.cwd(), "content/cache/lessons");
let cacheDirReady = false;
function ensureCacheDir(): void {
  if (cacheDirReady) return;
  fs.mkdirSync(CACHE_DIR, { recursive: true });
  cacheDirReady = true;
}

// Sanity-cap concept ids to avoid path-traversal mischief.
const SAFE_ID = /^[a-z0-9_]+$/i;

export async function POST(req: Request) {
  let body: { concept?: unknown };
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

  ensureCacheDir();
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

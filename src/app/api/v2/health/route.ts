/**
 * POST /api/v2/health
 *
 * Sanity check — returns server time, env-var presence flags, and the
 * git commit if available. POST so it doesn't get prerendered during
 * static export. Lets us debug "load failed" reports by curling /
 * tapping a button to see what the iPad actually reaches.
 */

import { NextResponse } from "next/server";

export async function POST() {
  return NextResponse.json({
    ok: true,
    time: new Date().toISOString(),
    env: {
      OPENROUTER_API_KEY: !!process.env.OPENROUTER_API_KEY,
      NEXT_PUBLIC_SUPABASE_URL: !!process.env.NEXT_PUBLIC_SUPABASE_URL,
    },
    commit: process.env.VERCEL_GIT_COMMIT_SHA?.slice(0, 7) || "local",
  });
}

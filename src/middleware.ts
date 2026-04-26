/**
 * Edge middleware — adds CORS headers to all /api/* responses.
 *
 * The Capacitor iOS bundle runs on origin `capacitor://localhost` and
 * calls our API at `https://learnwithsonata.com`. Without CORS, the
 * browser inside WKWebView blocks the cross-origin fetch with "Load
 * failed". This middleware allows requests from any origin (the API
 * routes themselves are auth-gated where it matters).
 */

import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

export function middleware(req: NextRequest) {
  // Pre-flight OPTIONS — respond directly with CORS headers.
  if (req.method === "OPTIONS") {
    return new NextResponse(null, {
      status: 204,
      headers: corsHeaders(req),
    });
  }

  const res = NextResponse.next();
  const headers = corsHeaders(req);
  for (const [k, v] of Object.entries(headers)) {
    res.headers.set(k, v);
  }
  return res;
}

function corsHeaders(req: NextRequest): Record<string, string> {
  const origin = req.headers.get("origin") || "*";
  return {
    "Access-Control-Allow-Origin": origin,
    "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type, Authorization",
    "Access-Control-Allow-Credentials": "true",
    Vary: "Origin",
  };
}

export const config = {
  matcher: ["/api/:path*"],
};

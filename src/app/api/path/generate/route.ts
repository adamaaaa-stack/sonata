/**
 * POST /api/path/generate
 *
 * Body: { mastered: string[], required: string[] }
 * Returns: { steps: PathStep[], unknownConcepts: string[] }
 *
 * Pure compute, no LLM, no IO. Wraps lib/v2/pathGenerator.generatePath.
 * The route exists so the client doesn't need to bundle the concept
 * ontology — it asks the server, the server has the data.
 */

import { NextResponse } from "next/server";
import { generatePath } from "@/lib/v2/pathGenerator";

export async function POST(req: Request) {
  let body: { mastered?: unknown; required?: unknown };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "invalid JSON body" }, { status: 400 });
  }
  const mastered = Array.isArray(body.mastered)
    ? (body.mastered as unknown[]).filter((x): x is string => typeof x === "string")
    : [];
  const required = Array.isArray(body.required)
    ? (body.required as unknown[]).filter((x): x is string => typeof x === "string")
    : [];
  if (required.length === 0) {
    return NextResponse.json(
      { error: "required must be a non-empty string array" },
      { status: 400 }
    );
  }
  const result = generatePath({ mastered, required });
  return NextResponse.json(result, { status: 200 });
}

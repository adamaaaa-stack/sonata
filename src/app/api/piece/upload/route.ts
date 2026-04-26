/**
 * POST /api/piece/upload
 *
 * Body: multipart/form-data with `file` field (image/png, image/jpeg, application/pdf)
 * Returns: { piece_id, analysis: PieceAnalysis }
 *
 * Stores the uploaded file in content/cache/pieces/[piece_id].(png|jpg|pdf)
 * (gitignored). Phase B will swap to S3.
 */

import fs from "node:fs";
import path from "node:path";
import { randomBytes } from "node:crypto";
import { NextResponse } from "next/server";
import { analyzePiece } from "@/lib/v2/pieceAnalyzer";

const PIECES_DIR = path.join(process.cwd(), "content/cache/pieces");
let piecesDirReady = false;
function ensurePiecesDir(): void {
  if (piecesDirReady) return;
  fs.mkdirSync(PIECES_DIR, { recursive: true });
  piecesDirReady = true;
}

const ALLOWED_TYPES = new Set([
  "image/png",
  "image/jpeg",
  "image/jpg",
  "image/webp",
  "image/heic",
  "application/pdf",
]);
const MAX_BYTES = 10 * 1024 * 1024; // 10 MB

function genPieceId(): string {
  return randomBytes(8).toString("hex");
}

function extForType(contentType: string): string {
  if (contentType === "application/pdf") return "pdf";
  if (contentType === "image/png") return "png";
  if (contentType === "image/jpeg" || contentType === "image/jpg") return "jpg";
  if (contentType === "image/webp") return "webp";
  if (contentType === "image/heic") return "heic";
  return "bin";
}

export async function POST(req: Request) {
  let formData: FormData;
  try {
    formData = await req.formData();
  } catch (e) {
    return NextResponse.json(
      { error: `invalid form: ${(e as Error).message}` },
      { status: 400 }
    );
  }

  const file = formData.get("file");
  if (!(file instanceof File)) {
    return NextResponse.json(
      { error: "missing 'file' field (multipart/form-data)" },
      { status: 400 }
    );
  }
  if (!ALLOWED_TYPES.has(file.type)) {
    return NextResponse.json(
      {
        error: `unsupported content type: ${file.type}. Allowed: png, jpeg, webp, heic, pdf.`,
      },
      { status: 415 }
    );
  }
  if (file.size > MAX_BYTES) {
    return NextResponse.json(
      { error: `file too large (${file.size} bytes, max ${MAX_BYTES})` },
      { status: 413 }
    );
  }

  ensurePiecesDir();
  const buf = Buffer.from(await file.arrayBuffer());
  const pieceId = genPieceId();
  const ext = extForType(file.type);
  const storedPath = path.join(PIECES_DIR, `${pieceId}.${ext}`);
  fs.writeFileSync(storedPath, buf);

  // Run the VLM analyzer.
  try {
    const analysis = await analyzePiece(buf, file.type);
    // Persist the analysis next to the stored file so we don't have to
    // re-run the VLM on subsequent reads.
    fs.writeFileSync(
      path.join(PIECES_DIR, `${pieceId}.json`),
      JSON.stringify(analysis, null, 2)
    );
    return NextResponse.json(
      { piece_id: pieceId, analysis },
      {
        status: 200,
        headers: {
          "X-Sonata-Tokens": String(analysis.tokensTotal),
          "X-Sonata-Duration-Ms": String(analysis.durationMs),
        },
      }
    );
  } catch (e) {
    return NextResponse.json(
      { piece_id: pieceId, error: (e as Error).message || "analysis failed" },
      { status: 500 }
    );
  }
}

// App Router doesn't use the `config` export — multipart bodies are
// handled by req.formData() above.

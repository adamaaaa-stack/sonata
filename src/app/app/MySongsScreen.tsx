"use client";
/**
 * MySongsScreen — replaces the v1 LibraryScreen.
 *
 * Flow:
 *   1. List of pieces the user has uploaded (persisted in localStorage
 *      for Phase A; Supabase later).
 *   2. Big "Upload a song" tile at the top.
 *   3. Tap a piece → see the generated lesson path.
 *   4. Tap a lesson in the path → opens LessonV2 player with that
 *      concept's generated YAML (wired in the next commit).
 *
 * Uses the existing CompClass/ChunkyColor styling so it matches the
 * rest of the app's look.
 */

import React, { useEffect, useRef, useState } from "react";
import yaml from "js-yaml";
import { LessonV2Screen } from "./LessonV2";
import type { LessonV2 } from "@/lib/music/lessonsV2";

const STORAGE_KEY = "sonata.v2.pieces";

/**
 * Capacitor's iOS WKWebView serves the app from `capacitor://localhost`.
 * Our API routes only exist on the web origin (Vercel), so we have to
 * point fetches there explicitly. On the actual web app the relative
 * path is fine.
 */
function apiBase(): string {
  if (typeof window === "undefined") return "";
  if (window.location.protocol === "capacitor:") {
    return "https://learnwithsonata.com";
  }
  return "";
}

// ------------------------------------------------------------------
// Persistent state — stored locally for now
// ------------------------------------------------------------------
export interface UploadedPiece {
  id: string;
  title: string;
  composer?: string;
  key: string;
  time_signature: string;
  difficulty_estimate: "beginner" | "intermediate" | "advanced";
  hand: "right" | "left" | "both";
  concepts: string[];
  melody: { note: string; duration: string }[];
  notes: string;
  uploadedAt: number;
  /** Index of the lesson the user is currently on. */
  pathStep: number;
  /** Computed path: ordered concept ids. */
  pathConcepts: string[];
}

function loadPieces(): UploadedPiece[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    return raw ? (JSON.parse(raw) as UploadedPiece[]) : [];
  } catch {
    return [];
  }
}

function savePieces(pieces: UploadedPiece[]): void {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(STORAGE_KEY, JSON.stringify(pieces));
}

// ------------------------------------------------------------------
// Screen
// ------------------------------------------------------------------
export interface MySongsScreenProps {
  onBackToMenu: () => void;
}

interface RunningLesson {
  pieceId: string;
  conceptId: string;
  pathIndex: number;
  lesson: LessonV2;
}

export function MySongsScreen({ onBackToMenu }: MySongsScreenProps) {
  const [pieces, setPieces] = useState<UploadedPiece[]>([]);
  const [openPiece, setOpenPiece] = useState<UploadedPiece | null>(null);
  const [showUpload, setShowUpload] = useState(false);
  const [running, setRunning] = useState<RunningLesson | null>(null);
  const [runningError, setRunningError] = useState<string | null>(null);
  const [runningLoading, setRunningLoading] = useState(false);

  useEffect(() => {
    setPieces(loadPieces());
  }, []);

  // Tap a lesson on the path → fetch the YAML and render LessonV2Screen.
  async function openLesson(conceptId: string, piece: UploadedPiece) {
    setRunningError(null);
    setRunningLoading(true);
    try {
      // Always hit the web origin so the iOS Capacitor build calls the
      // server-rendered API directly (the API isn't bundled in the
      // static iOS export). See apiBase() helper at top of file.
      // Trailing slash matters — Next is configured with trailingSlash: true
      // and POST requests don't follow the redirect cleanly across iOS
      // WKWebView. Hit the canonical URL directly.
      // Adaptive context: tell the server which concepts the student
      // has already mastered (everything on the path BEFORE this one)
      // and what's still upcoming. The generator uses this to avoid
      // referencing untaught material as known.
      const idx = piece.pathConcepts.indexOf(conceptId);
      const pathIdx = idx >= 0 ? idx : 0;
      const mastered = piece.pathConcepts.slice(0, pathIdx);
      const upcoming = piece.pathConcepts.slice(pathIdx + 1);
      const resp = await fetch(`${apiBase()}/api/lesson/`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          concept: conceptId,
          mastered,
          upcoming,
          pathPosition: pathIdx,
          pathLength: piece.pathConcepts.length,
        }),
      });
      if (!resp.ok) {
        const txt = await resp.text();
        throw new Error(`lesson fetch failed: ${resp.status} ${txt}`);
      }
      const yamlText = await resp.text();
      const lessonObj = yaml.load(yamlText) as LessonV2;
      setRunning({
        pieceId: piece.id,
        conceptId,
        pathIndex: pathIdx,
        lesson: lessonObj,
      });
    } catch (e) {
      setRunningError((e as Error).message || "lesson load failed");
    } finally {
      setRunningLoading(false);
    }
  }

  // Lesson completed → bump the piece's pathStep if this was the next
  // step (we don't auto-advance for replays of earlier lessons).
  function completeLesson() {
    if (!running) return;
    const all = loadPieces();
    const i = all.findIndex((p) => p.id === running.pieceId);
    if (i >= 0) {
      const piece = all[i];
      if (running.pathIndex === piece.pathStep) {
        piece.pathStep = Math.min(piece.pathStep + 1, piece.pathConcepts.length);
        savePieces(all);
        setPieces(all);
        if (openPiece?.id === piece.id) setOpenPiece({ ...piece });
      }
    }
    setRunning(null);
  }

  // ----- Running lesson view -----
  if (running) {
    return (
      <LessonV2Screen
        lesson={running.lesson}
        onExit={() => setRunning(null)}
        onComplete={completeLesson}
        useKokoro
      />
    );
  }

  function refresh() {
    setPieces(loadPieces());
  }

  function deletePiece(id: string) {
    const next = loadPieces().filter((p) => p.id !== id);
    savePieces(next);
    setPieces(next);
    if (openPiece?.id === id) setOpenPiece(null);
  }

  if (openPiece) {
    return (
      <PieceDetailView
        piece={openPiece}
        onBack={() => {
          refresh();
          setOpenPiece(null);
        }}
        onDelete={() => deletePiece(openPiece.id)}
        onOpenLesson={(conceptId) => openLesson(conceptId, openPiece)}
        loading={runningLoading}
        error={runningError}
      />
    );
  }

  return (
    <div
      style={{
        position: "relative",
        minHeight: "100vh",
        background: "var(--cream)",
        fontFamily: "var(--sans)",
        paddingBottom: 40,
      }}
    >
      {/* Top bar */}
      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          padding: "20px 24px",
          gap: 16,
        }}
      >
        <button
          type="button"
          onClick={onBackToMenu}
          style={pillButtonStyle()}
        >
          ← Home
        </button>
        <div
          style={{
            fontFamily: "var(--serif, Georgia, serif)",
            fontStyle: "italic",
            fontWeight: 900,
            fontSize: 22,
            color: "var(--ink)",
          }}
        >
          My Songs
        </div>
        <div style={{ width: 72 }} />
      </div>

      <div
        style={{
          maxWidth: 720,
          margin: "0 auto",
          padding: "0 16px",
          display: "flex",
          flexDirection: "column",
          gap: 14,
        }}
      >
        <UploadCard onUploaded={() => { refresh(); setShowUpload(false); }} forceOpen={showUpload} setForceOpen={setShowUpload} />

        {pieces.length === 0 && (
          <div
            style={{
              padding: "32px 20px",
              textAlign: "center",
              color: "var(--ink2, #4b5563)",
              fontFamily: "Georgia, serif",
              fontStyle: "italic",
              fontSize: 15,
              lineHeight: 1.5,
            }}
          >
            Upload a song you want to learn.
            <br />
            We&apos;ll build you a lesson plan to play it.
          </div>
        )}

        {pieces.map((p) => (
          <PieceCard key={p.id} piece={p} onOpen={() => setOpenPiece(p)} />
        ))}
      </div>
    </div>
  );
}

// ------------------------------------------------------------------
// Upload card
// ------------------------------------------------------------------
function UploadCard({
  onUploaded,
  forceOpen,
  setForceOpen,
}: {
  onUploaded: () => void;
  forceOpen: boolean;
  setForceOpen: (v: boolean) => void;
}) {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [stage, setStage] = useState<"idle" | "uploading" | "analyzing" | "confirm" | "pathing">("idle");
  const [analysis, setAnalysis] = useState<{
    piece_id: string;
    title: string;
    composer?: string;
    key: string;
    time_signature: string;
    difficulty_estimate: "beginner" | "intermediate" | "advanced";
    hand: "right" | "left" | "both";
    concepts: string[];
    melody: { note: string; duration: string }[];
    notes: string;
  } | null>(null);
  const fileRef = useRef<HTMLInputElement | null>(null);

  async function handleFile(file: File) {
    setError(null);
    setBusy(true);
    setStage("uploading");
    try {
      const fd = new FormData();
      fd.append("file", file);
      setStage("analyzing");
      let resp: Response;
      try {
        resp = await fetch(`${apiBase()}/api/piece/upload/`, { method: "POST", body: fd });
      } catch (netErr) {
        throw new Error(
          `network: ${(netErr as Error).message}. Check your internet, or whether the Vercel deploy is up.`
        );
      }
      let j: { piece_id?: string; analysis?: Record<string, unknown>; error?: string };
      try {
        j = (await resp.json()) as typeof j;
      } catch {
        const txt = await resp.text().catch(() => "(no body)");
        throw new Error(`server returned ${resp.status} (not JSON): ${txt.slice(0, 200)}`);
      }
      if (!resp.ok) throw new Error(j.error || `upload failed (${resp.status})`);
      if (!j.piece_id || !j.analysis) {
        throw new Error("server response missing piece_id or analysis");
      }
      setAnalysis({
        piece_id: j.piece_id,
        // The server's analysis shape is validated by the route, but TS
        // can't see through the Record<string, unknown> on this side.
        // Cast through to the local type — we only display these fields.
        ...(j.analysis as unknown as Omit<NonNullable<typeof analysis>, "piece_id">),
      });
      setStage("confirm");
    } catch (e) {
      setError((e as Error).message || "upload failed");
      setStage("idle");
    } finally {
      setBusy(false);
    }
  }

  async function confirmAndGeneratePath() {
    if (!analysis) return;
    setBusy(true);
    setStage("pathing");
    setError(null);
    try {
      // Phase A: assume user is a complete beginner (mastered = []).
      // Phase B: pull mastered set from a real placement test.
      const resp = await fetch(`${apiBase()}/api/path/generate/`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ mastered: [], required: analysis.concepts }),
      });
      const j = await resp.json();
      if (!resp.ok) throw new Error(j.error || "path generation failed");
      const piece: UploadedPiece = {
        id: analysis.piece_id,
        title: analysis.title,
        composer: analysis.composer,
        key: analysis.key,
        time_signature: analysis.time_signature,
        difficulty_estimate: analysis.difficulty_estimate,
        hand: analysis.hand,
        concepts: analysis.concepts,
        melody: analysis.melody,
        notes: analysis.notes,
        uploadedAt: Date.now(),
        pathStep: 0,
        pathConcepts: (j.steps as { conceptId: string }[]).map((s) => s.conceptId),
      };
      const next = [piece, ...loadPieces().filter((p) => p.id !== piece.id)];
      savePieces(next);
      setAnalysis(null);
      setStage("idle");
      setForceOpen(false);
      onUploaded();
    } catch (e) {
      setError((e as Error).message || "path generation failed");
      setStage("confirm");
    } finally {
      setBusy(false);
    }
  }

  // ----- Confirm-and-correct view -----
  if (stage === "confirm" && analysis) {
    return (
      <div style={cardStyle("var(--gold, #fde68a)")}>
        <div style={{ fontWeight: 900, fontSize: 18, marginBottom: 6 }}>
          Read your song
        </div>
        <div style={{ fontSize: 14, color: "var(--ink2, #4b5563)", marginBottom: 12, fontStyle: "italic", fontFamily: "Georgia, serif" }}>
          Cleffy thinks this is what you uploaded. Looks right?
        </div>
        <div style={kvRow()}><strong>Title:</strong> {analysis.title}</div>
        {analysis.composer && <div style={kvRow()}><strong>Composer:</strong> {analysis.composer}</div>}
        <div style={kvRow()}><strong>Key:</strong> {analysis.key}</div>
        <div style={kvRow()}><strong>Time:</strong> {analysis.time_signature}</div>
        <div style={kvRow()}><strong>Hand:</strong> {analysis.hand}</div>
        <div style={kvRow()}><strong>Difficulty:</strong> {analysis.difficulty_estimate}</div>
        <div style={kvRow()}><strong>Concepts:</strong> {analysis.concepts.join(", ") || "(none detected)"}</div>
        {analysis.notes && (
          <div style={{ ...kvRow(), fontStyle: "italic" }}>
            <strong>Notes:</strong> {analysis.notes}
          </div>
        )}
        <div style={{ display: "flex", gap: 10, marginTop: 14, flexWrap: "wrap" }}>
          <button
            type="button"
            disabled={busy}
            onClick={confirmAndGeneratePath}
            style={primaryButtonStyle(busy)}
          >
            {busy ? "Building your path…" : "Looks right, build my plan"}
          </button>
          <button
            type="button"
            disabled={busy}
            onClick={() => { setAnalysis(null); setStage("idle"); }}
            style={secondaryButtonStyle()}
          >
            Try another file
          </button>
        </div>
        {error && (
          <div style={errorStyle()}>{error}</div>
        )}
      </div>
    );
  }

  // ----- Idle / upload trigger -----
  return (
    <div style={cardStyle("var(--gold, #fde68a)")}>
      <input
        ref={fileRef}
        type="file"
        accept="image/png,image/jpeg,image/webp,image/heic,application/pdf"
        style={{ display: "none" }}
        onChange={(e) => {
          const f = e.target.files?.[0];
          if (f) void handleFile(f);
          if (fileRef.current) fileRef.current.value = "";
        }}
      />
      <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
        <div style={{ fontSize: 32, lineHeight: 1 }}>📷</div>
        <div style={{ flex: 1 }}>
          <div style={{ fontWeight: 900, fontSize: 18 }}>Upload a song</div>
          <div style={{ fontSize: 13, color: "var(--ink2, #4b5563)", marginTop: 2 }}>
            Take a photo of sheet music. Cleffy reads it and builds you a lesson plan.
          </div>
        </div>
        <button
          type="button"
          disabled={busy}
          onClick={() => { setForceOpen(true); fileRef.current?.click(); }}
          style={primaryButtonStyle(busy)}
        >
          {stage === "uploading" ? "Uploading…" :
           stage === "analyzing" ? "Reading…" :
           stage === "pathing" ? "Building plan…" :
           "Upload"}
        </button>
      </div>
      {(stage === "uploading" || stage === "analyzing" || stage === "pathing") && (
        <div style={{ marginTop: 10, fontSize: 12, color: "var(--ink2, #4b5563)", fontStyle: "italic" }}>
          {stage === "analyzing" ? "Cleffy is reading the music — about 5-15 seconds." :
           stage === "pathing" ? "Building your custom lesson plan…" :
           "Sending to Cleffy…"}
        </div>
      )}
      {error && <div style={errorStyle()}>{error}</div>}
      {/* forceOpen unused but kept for parent control */}
      {void forceOpen}
    </div>
  );
}

// ------------------------------------------------------------------
// Piece card (in list)
// ------------------------------------------------------------------
function PieceCard({ piece, onOpen }: { piece: UploadedPiece; onOpen: () => void }) {
  const total = piece.pathConcepts.length;
  const done = Math.min(piece.pathStep, total);
  const pct = total > 0 ? Math.round((done / total) * 100) : 0;
  return (
    <button
      type="button"
      onClick={onOpen}
      style={{
        ...cardStyle("var(--cream, #fff8ee)"),
        textAlign: "left",
        cursor: "pointer",
        display: "flex",
        alignItems: "center",
        gap: 14,
      }}
    >
      <div style={{ fontSize: 28, lineHeight: 1 }}>♪</div>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ fontWeight: 900, fontSize: 16, color: "var(--ink, #1f2937)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
          {piece.title}
        </div>
        <div style={{ fontSize: 12, color: "var(--ink3, #6b7280)", marginTop: 2 }}>
          {piece.key} · {piece.time_signature} · {piece.difficulty_estimate}
        </div>
        <div style={{ marginTop: 8, display: "flex", alignItems: "center", gap: 8 }}>
          <div
            style={{
              flex: 1,
              height: 6,
              background: "rgba(0,0,0,0.06)",
              borderRadius: 999,
              overflow: "hidden",
            }}
          >
            <div
              style={{
                width: `${pct}%`,
                height: "100%",
                background: "var(--berry, #d4a853)",
                transition: "width 0.3s",
              }}
            />
          </div>
          <span style={{ fontSize: 11, fontWeight: 800, color: "var(--ink3, #6b7280)" }}>
            {done}/{total}
          </span>
        </div>
      </div>
      <div style={{ fontSize: 18, color: "var(--ink3, #6b7280)" }}>›</div>
    </button>
  );
}

// ------------------------------------------------------------------
// Piece detail / path view
// ------------------------------------------------------------------
function PieceDetailView({
  piece,
  onBack,
  onDelete,
  onOpenLesson,
  loading,
  error,
}: {
  piece: UploadedPiece;
  onBack: () => void;
  onDelete: () => void;
  onOpenLesson: (conceptId: string) => void;
  loading?: boolean;
  error?: string | null;
}) {
  return (
    <div
      style={{
        position: "relative",
        minHeight: "100vh",
        background: "var(--cream)",
        fontFamily: "var(--sans)",
        paddingBottom: 40,
      }}
    >
      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          padding: "20px 24px",
          gap: 16,
        }}
      >
        <button type="button" onClick={onBack} style={pillButtonStyle()}>← Back</button>
        <div
          style={{
            fontFamily: "var(--serif, Georgia, serif)",
            fontStyle: "italic",
            fontWeight: 900,
            fontSize: 18,
            color: "var(--ink)",
            flex: 1,
            textAlign: "center",
            whiteSpace: "nowrap",
            overflow: "hidden",
            textOverflow: "ellipsis",
          }}
        >
          {piece.title}
        </div>
        <button
          type="button"
          onClick={() => {
            if (confirm("Delete this song's lesson plan?")) onDelete();
          }}
          style={{ ...pillButtonStyle(), background: "rgba(220,38,38,0.08)", color: "#dc2626" }}
        >
          Delete
        </button>
      </div>

      <div style={{ maxWidth: 720, margin: "0 auto", padding: "0 16px" }}>
        {loading && (
          <div
            style={{
              padding: "10px 14px",
              background: "var(--gold, #fde68a)",
              border: "2px solid var(--ink)",
              borderRadius: 10,
              marginBottom: 12,
              fontSize: 13,
              fontWeight: 700,
              color: "var(--ink)",
              fontStyle: "italic",
              fontFamily: "Georgia, serif",
            }}
          >
            Cleffy is writing your lesson… (about 30 seconds the first time, instant after)
          </div>
        )}
        {error && (
          <div
            style={{
              padding: "10px 14px",
              background: "rgba(220,38,38,0.08)",
              border: "1px solid #dc2626",
              borderRadius: 10,
              marginBottom: 12,
              fontSize: 13,
              color: "#dc2626",
            }}
          >
            {error}
          </div>
        )}
        <div
          style={{
            ...cardStyle("var(--paper, #f5f0e8)"),
            marginBottom: 14,
          }}
        >
          <div style={{ fontSize: 13, color: "var(--ink2, #4b5563)" }}>
            <strong>Key:</strong> {piece.key} &nbsp;·&nbsp;
            <strong>Time:</strong> {piece.time_signature} &nbsp;·&nbsp;
            <strong>Hand:</strong> {piece.hand} &nbsp;·&nbsp;
            <strong>Difficulty:</strong> {piece.difficulty_estimate}
          </div>
          <div
            style={{
              marginTop: 8,
              fontSize: 13,
              color: "var(--ink, #1f2937)",
              fontStyle: "italic",
              fontFamily: "Georgia, serif",
            }}
          >
            {piece.pathConcepts.length} lesson{piece.pathConcepts.length === 1 ? "" : "s"} ·
            {" "}
            {piece.pathStep < piece.pathConcepts.length
              ? `on lesson ${piece.pathStep + 1}`
              : "complete!"}
          </div>
        </div>

        <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
          {piece.pathConcepts.map((conceptId, i) => {
            const status =
              i < piece.pathStep ? "done" :
              i === piece.pathStep ? "current" : "locked";
            return (
              <button
                key={conceptId}
                type="button"
                onClick={() => onOpenLesson(conceptId)}
                style={{
                  ...cardStyle(
                    status === "done" ? "rgba(187,247,208,0.4)" :
                    status === "current" ? "var(--gold, #fde68a)" :
                    "var(--cream, #fff8ee)"
                  ),
                  textAlign: "left",
                  cursor: "pointer",
                  display: "flex",
                  alignItems: "center",
                  gap: 12,
                  opacity: status === "locked" ? 0.7 : 1,
                }}
              >
                <div
                  style={{
                    width: 32,
                    height: 32,
                    borderRadius: "50%",
                    background:
                      status === "done" ? "#16a34a" :
                      status === "current" ? "var(--berry, #d4a853)" :
                      "rgba(0,0,0,0.1)",
                    color: status === "locked" ? "var(--ink2, #4b5563)" : "#fff",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    fontWeight: 900,
                    fontSize: 14,
                    flexShrink: 0,
                  }}
                >
                  {status === "done" ? "✓" : i + 1}
                </div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontWeight: 800, fontSize: 14 }}>{conceptId.replace(/_/g, " ")}</div>
                  <div style={{ fontSize: 11, color: "var(--ink3, #6b7280)", marginTop: 2 }}>
                    {status === "done" ? "Completed" :
                     status === "current" ? "Tap to start" :
                     "Locked — finish previous lessons first"}
                  </div>
                </div>
                <div style={{ fontSize: 16, color: "var(--ink3, #6b7280)" }}>›</div>
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
}

// ------------------------------------------------------------------
// Style helpers
// ------------------------------------------------------------------
function pillButtonStyle(): React.CSSProperties {
  return {
    display: "inline-flex",
    alignItems: "center",
    gap: 8,
    padding: "8px 14px",
    background: "var(--cream)",
    color: "var(--ink)",
    border: "3px solid var(--ink)",
    borderRadius: 999,
    boxShadow: "0 4px 0 var(--ink)",
    fontWeight: 800,
    fontSize: 13,
    cursor: "pointer",
    fontFamily: "var(--sans)",
  };
}
function primaryButtonStyle(busy: boolean): React.CSSProperties {
  return {
    padding: "10px 18px",
    background: busy ? "rgba(0,0,0,0.08)" : "var(--berry, #d4a853)",
    color: "var(--ink)",
    border: "3px solid var(--ink)",
    borderRadius: 999,
    boxShadow: busy ? "none" : "0 4px 0 var(--ink)",
    fontWeight: 900,
    fontSize: 13,
    cursor: busy ? "default" : "pointer",
    fontFamily: "var(--sans)",
  };
}
function secondaryButtonStyle(): React.CSSProperties {
  return {
    padding: "8px 14px",
    background: "var(--paper, #f5f0e8)",
    color: "var(--ink)",
    border: "2px solid var(--ink)",
    borderRadius: 999,
    fontWeight: 700,
    fontSize: 12,
    cursor: "pointer",
    fontFamily: "var(--sans)",
  };
}
function cardStyle(bg: string): React.CSSProperties {
  return {
    background: bg,
    border: "3px solid var(--ink)",
    borderRadius: 14,
    padding: "14px 16px",
    boxShadow: "0 5px 0 var(--ink)",
    width: "100%",
  };
}
function kvRow(): React.CSSProperties {
  return {
    fontSize: 13,
    color: "var(--ink, #1f2937)",
    marginTop: 4,
  };
}
function errorStyle(): React.CSSProperties {
  return {
    marginTop: 10,
    padding: "8px 12px",
    background: "rgba(220,38,38,0.08)",
    border: "1px solid #dc2626",
    borderRadius: 8,
    fontSize: 12,
    color: "#dc2626",
  };
}

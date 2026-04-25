"use client";
/**
 * LessonV2 — renders a single lesson from our content/lessons/*.yaml schema.
 *
 * Phase 1: page-by-page navigation + pre-generated Cleffy narration.
 * Phase 2: real figure renderers (staircase, pyramid, celebration, Cleffy).
 * Phase 3: interactive sequence play, demo, mastery check, completion.
 * Phase 3b (this): persistent bottom-docked piano (styled `PianoKeyboard`)
 *                  used both for free play and for sequence-input on play pages.
 */
import React, {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import {
  type LessonV2,
  type LessonPage,
  type Interaction,
  type MasteryCheck,
  type MasteryQuestion,
  pageAudioSrc,
  pageHasNarration,
} from "@/lib/music/lessonsV2";
import { FigureRouter, hasRenderedFigure } from "./LessonV2Figures";
import { AudioSamples, playAudioDescription, parseAudioToNotes } from "./LessonV2Audio";
import { DrillInteractionCard } from "./LessonV2Drill";
import { PianoKeyboard } from "./PianoKeyboard";
import {
  noteToMidi as libNoteToMidi,
  isBlack,
  playNotes,
  playCorrectSound,
  playWrongSound,
  loadPianoSamples,
  isPianoReady,
  unlockAudio,
} from "@/lib/music";

// ------------------------------------------------------------------
// Helpers
// ------------------------------------------------------------------

function safeNoteToMidi(note: string): number | null {
  try {
    const m = libNoteToMidi(note);
    return Number.isFinite(m) ? m : null;
  } catch {
    return null;
  }
}

function collectHighlightNotes(interaction?: Interaction): string[] {
  if (!interaction) return [];
  if (interaction.type === "sequence") {
    // Some YAMLs use `type: sequence` with `count:`/`accept:` instead of an
    // explicit `keys:` array. Guard accordingly.
    return Array.isArray((interaction as { keys?: unknown }).keys)
      ? ((interaction as { keys: string[] }).keys)
      : [];
  }
  if (interaction.type === "rhythm" || interaction.type === "song") {
    const seq = (interaction as { sequence?: unknown[] }).sequence;
    if (!Array.isArray(seq)) return [];
    const out: string[] = [];
    for (const item of seq) {
      if (typeof item === "string") out.push(item);
      else if (Array.isArray(item)) {
        for (const sub of item) if (typeof sub === "string") out.push(sub);
      }
    }
    return out;
  }
  return [];
}

/**
 * Return an array of "acceptable midi sets" — one element per step in the
 * sequence. For sequence-type, each step is a single-note set. For
 * rhythm/song with chords (nested arrays), a step is the whole chord —
 * pressing ANY note in the chord counts as hitting that step.
 */
function sequenceMidiSteps(interaction?: Interaction): number[][] {
  if (!interaction) return [];
  if (interaction.type === "sequence") {
    const keys = (interaction as { keys?: unknown }).keys;
    if (!Array.isArray(keys)) return [];
    return (keys as string[])
      .map((k) => [safeNoteToMidi(k)].filter((m): m is number => m != null))
      .filter((s) => s.length > 0);
  }
  if (interaction.type === "rhythm" || interaction.type === "song") {
    const seq = (interaction as { sequence?: unknown[] }).sequence;
    if (!Array.isArray(seq)) return [];
    const steps: number[][] = [];
    for (const item of seq) {
      const strs = typeof item === "string" ? [item] : Array.isArray(item) ? item : [];
      const midis = (strs as string[])
        .map(safeNoteToMidi)
        .filter((m): m is number => m != null);
      if (midis.length) steps.push(midis);
    }
    return steps;
  }
  return [];
}

// Keyboard range that shows all notes in a sequence + some padding.
function computeKeyboardRange(midis: number[]): [number, number] {
  if (midis.length === 0) return [48, 84]; // C3..C6 default
  const min = Math.max(36, Math.min(...midis) - 5);
  const max = Math.min(96, Math.max(...midis) + 5);
  const start = min - (isBlack(min) ? 1 : 0);
  const end = max + (isBlack(max) ? 1 : 0);
  return [start, Math.max(start + 14, end)];
}

// Map note color-coding for highlights prop of PianoKeyboard.
// Layers (lowest → highest priority):
//   1. baked page.highlights  (auto-parsed from figure/cleffy at compile time)
//   2. live press feedback    (just-pressed green, just-wrong red)
// The "next expected" pulse is handled separately via pulseMidi.
function buildHighlights(
  baseHighlights: Record<string | number, string> | undefined,
  justPressed: number | null,
  justWrong: number | null
): Record<number, string> {
  const h: Record<number, string> = {};
  if (baseHighlights) {
    for (const [k, v] of Object.entries(baseHighlights)) {
      const midi = Number(k);
      if (Number.isFinite(midi)) h[midi] = v as string;
    }
  }
  if (justPressed != null) h[justPressed] = "#22c55e";
  if (justWrong != null) h[justWrong] = "#ef4444";
  return h;
}

// ------------------------------------------------------------------
// ModeChip
// ------------------------------------------------------------------

function ModeChip({ mode }: { mode: string }) {
  const colors: Record<string, { bg: string; fg: string }> = {
    see: { bg: "#fde68a", fg: "#78350f" },
    hear: { bg: "#bfdbfe", fg: "#1e3a8a" },
    play: { bg: "#bbf7d0", fg: "#14532d" },
  };
  const c = colors[mode] || { bg: "#e5e7eb", fg: "#1f2937" };
  return (
    <span
      style={{
        display: "inline-block",
        padding: "4px 10px",
        borderRadius: 999,
        border: "2px solid var(--ink, #1f2937)",
        background: c.bg,
        color: c.fg,
        fontSize: 11,
        fontWeight: 800,
        letterSpacing: "0.15em",
        textTransform: "uppercase",
      }}
    >
      {mode}
    </span>
  );
}

// ------------------------------------------------------------------
// Sequence-progress pips (above the piano)
// ------------------------------------------------------------------

function SequenceProgress({
  notes,
  midis,
  progress,
  onDemo,
  onSkip,
  demoPlaying,
  complete,
}: {
  notes: string[];
  midis: number[];
  progress: number;
  onDemo: () => void;
  onSkip: () => void;
  demoPlaying: boolean;
  complete: boolean;
}) {
  if (midis.length === 0) return null;
  return (
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        gap: 10,
        alignItems: "center",
        padding: "12px 16px",
        background: "var(--parchment, #faf6ef)",
        border: "2px solid var(--ink, #1f2937)",
        borderRadius: 12,
        maxWidth: 700,
        margin: "0 auto",
        width: "100%",
      }}
    >
      <div
        style={{
          display: "flex",
          gap: 6,
          flexWrap: "wrap",
          justifyContent: "center",
        }}
      >
        {midis.map((_, i) => (
          <div
            key={i}
            style={{
              minWidth: 36,
              padding: "4px 8px",
              border: "2px solid var(--ink, #1f2937)",
              borderRadius: 6,
              background:
                i < progress
                  ? "#bbf7d0"
                  : i === progress && !complete
                  ? "#fde68a"
                  : "#fff",
              fontFamily: "var(--mono, JetBrains Mono, monospace)",
              fontWeight: 800,
              fontSize: 12,
              textAlign: "center",
            }}
          >
            {notes[i] ?? ""}
          </div>
        ))}
      </div>
      <div style={{ display: "flex", gap: 10 }}>
        <button
          type="button"
          onClick={onDemo}
          disabled={demoPlaying}
          style={{
            padding: "6px 14px",
            border: "2px solid var(--ink, #1f2937)",
            borderRadius: 999,
            background: demoPlaying ? "rgba(0,0,0,0.06)" : "var(--cream, #fff8ee)",
            cursor: demoPlaying ? "default" : "pointer",
            fontWeight: 800,
            fontSize: 12,
          }}
        >
          {demoPlaying ? "♪ Playing…" : "♪ Hear it"}
        </button>
        <button
          type="button"
          onClick={onSkip}
          style={{
            padding: "6px 14px",
            border: "2px solid var(--ink, #1f2937)",
            borderRadius: 999,
            background: "transparent",
            cursor: "pointer",
            fontWeight: 700,
            fontSize: 12,
            fontStyle: "italic",
            color: "var(--ink2, #4b5563)",
          }}
        >
          Skip →
        </button>
      </div>
      {complete && (
        <div
          style={{
            fontFamily: "Georgia, serif",
            fontStyle: "italic",
            fontWeight: 800,
            color: "#14532d",
            fontSize: 15,
          }}
        >
          ✓ Nice.
        </div>
      )}
    </div>
  );
}

// ------------------------------------------------------------------
// MasteryCheck
// ------------------------------------------------------------------

/**
 * Pull a note midi out of a figure description like:
 *   "Keyboard with F circled"
 *   "Middle C highlighted"
 * Rather than grabbing the first note-looking character anywhere, we only
 * return a hint if a highlight keyword (circled / highlighted / glowing / …)
 * is near a plausible note token. We pick the note CLOSEST to the keyword
 * so "F major scale, with C highlighted" correctly picks C, not F.
 */
function questionFigureHint(figure: string | undefined): number | null {
  if (!figure) return null;
  const normalized = figure
    .replace(/middle\s*c/gi, "C4")
    .replace(/high\s*c/gi, "C5")
    .replace(/low\s*c/gi, "C3")
    .replace(/\b([A-G])[-\s]?sharp\b/gi, "$1#")
    .replace(/\b([A-G])[-\s]?flat\b/gi, "$1b");

  const highlightRe =
    /(circled|highlighted|glowing|glows|marked|flag|planted|shining|lit\s+up)/gi;
  const highlights: number[] = [];
  let hm: RegExpExecArray | null;
  while ((hm = highlightRe.exec(normalized)) !== null) highlights.push(hm.index);
  if (highlights.length === 0) return null;

  // Collect all note tokens with their positions. Require either an
  // explicit accidental or an octave digit to avoid picking up "F major"
  // or "C sharp" (already normalized) false-positives.
  const noteRe = /\b([A-G])(#|b)?([2-7])?\b/g;
  const notes: { idx: number; note: string }[] = [];
  let nm: RegExpExecArray | null;
  while ((nm = noteRe.exec(normalized)) !== null) {
    notes.push({
      idx: nm.index,
      note: `${nm[1]}${nm[2] || ""}${nm[3] || "4"}`,
    });
  }
  if (notes.length === 0) return null;

  // Pick the note nearest any highlight keyword.
  let best: { note: string; dist: number } | null = null;
  for (const n of notes) {
    for (const h of highlights) {
      const d = Math.abs(n.idx - h);
      if (!best || d < best.dist) best = { note: n.note, dist: d };
    }
  }
  if (!best) return null;
  try {
    const midi = libNoteToMidi(best.note);
    return Number.isFinite(midi) ? midi : null;
  } catch {
    return null;
  }
}

function QuestionCard({
  q,
  section,
  onAnswer,
  onHighlightChange,
}: {
  q: MasteryQuestion;
  section: "see" | "hear" | "play";
  onAnswer: (correct: boolean) => void;
  onHighlightChange?: (midi: number | null) => void;
}) {
  const [choice, setChoice] = useState<number | null>(null);
  const [revealed, setRevealed] = useState(false);

  // Auto-play the audio clue once when the question appears (hear mode).
  const playedRef = useRef(false);
  useEffect(() => {
    if (q.audio && !playedRef.current) {
      playedRef.current = true;
      const t = setTimeout(() => playAudioDescription(q.audio!, 0.4), 350);
      return () => clearTimeout(t);
    }
  }, [q.audio]);

  // Tell the parent which key to highlight on the bottom piano (if any).
  const figHint = useMemo(() => questionFigureHint(q.figure), [q.figure]);
  useEffect(() => {
    onHighlightChange?.(figHint);
    return () => onHighlightChange?.(null);
  }, [figHint, onHighlightChange]);

  function pick(i: number) {
    if (revealed) return;
    setChoice(i);
    setRevealed(true);
    const correct = i === q.correct;
    if (correct) playCorrectSound();
    else playWrongSound();
    setTimeout(() => onAnswer(correct), 900);
  }

  function pickPlay() {
    setRevealed(true);
    playCorrectSound();
    setTimeout(() => onAnswer(true), 700);
  }

  const isPlay = section === "play";
  const canPlayAudio = !!(q.audio && parseAudioToNotes(q.audio));

  return (
    <div
      style={{
        background: "var(--cream, #fff8ee)",
        border: "3px solid var(--ink, #1f2937)",
        borderRadius: 16,
        padding: 20,
        marginBottom: 12,
      }}
    >
      {q.figure && figHint != null && (
        <div
          style={{
            fontFamily: "Georgia, serif",
            fontStyle: "italic",
            fontSize: 13,
            color: "var(--ink3, #6b7280)",
            marginBottom: 8,
          }}
        >
          Look at the glowing key below.
        </div>
      )}
      {q.audio && (
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: 10,
            marginBottom: 12,
          }}
        >
          <button
            type="button"
            onClick={() =>
              canPlayAudio && q.audio && playAudioDescription(q.audio, 0.4)
            }
            disabled={!canPlayAudio}
            style={{
              padding: "10px 16px",
              border: "2px solid var(--ink, #1f2937)",
              borderRadius: 10,
              background: canPlayAudio
                ? "var(--berry, #d4a853)"
                : "rgba(0,0,0,0.05)",
              cursor: canPlayAudio ? "pointer" : "not-allowed",
              fontWeight: 900,
              fontSize: 14,
              boxShadow: canPlayAudio ? "0 3px 0 var(--ink, #1f2937)" : "none",
              opacity: canPlayAudio ? 1 : 0.6,
            }}
          >
            {canPlayAudio ? "♪ Play sample" : "· Sample (no audio)"}
          </button>
          <div
            style={{
              fontFamily: "Georgia, serif",
              fontStyle: "italic",
              fontSize: 13,
              color: "var(--ink3, #6b7280)",
              flex: 1,
            }}
          >
            {q.audio}
          </div>
        </div>
      )}
      <div
        style={{
          fontSize: 17,
          fontWeight: 700,
          marginBottom: 14,
          lineHeight: 1.35,
        }}
      >
        {q.prompt}
      </div>

      {isPlay ? (
        <button
          type="button"
          onClick={pickPlay}
          disabled={revealed}
          style={{
            padding: "10px 20px",
            border: "2px solid var(--ink, #1f2937)",
            borderRadius: 999,
            background: revealed ? "#bbf7d0" : "var(--berry, #d4a853)",
            cursor: revealed ? "default" : "pointer",
            fontWeight: 900,
            fontSize: 14,
          }}
        >
          {revealed ? "✓ Played" : "I played it"}
        </button>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
          {(q.options || []).map((opt, i) => {
            const isPicked = choice === i;
            const isCorrect = revealed && i === q.correct;
            const isWrong = revealed && isPicked && i !== q.correct;
            return (
              <button
                key={i}
                type="button"
                onClick={() => pick(i)}
                disabled={revealed}
                style={{
                  padding: "12px 16px",
                  textAlign: "left",
                  border: "2px solid var(--ink, #1f2937)",
                  borderRadius: 12,
                  background: isCorrect
                    ? "#bbf7d0"
                    : isWrong
                    ? "#fecaca"
                    : isPicked
                    ? "var(--gold, #fde68a)"
                    : "#fff",
                  cursor: revealed ? "default" : "pointer",
                  fontWeight: 600,
                  fontSize: 15,
                }}
              >
                {opt}
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}

function MasteryCheckScreen({
  check,
  onDone,
  onHighlightChange,
}: {
  check: MasteryCheck;
  onDone: (score: { correct: number; total: number }) => void;
  onHighlightChange?: (midi: number | null) => void;
}) {
  const all = useMemo(() => {
    const out: { section: "see" | "hear" | "play"; q: MasteryQuestion }[] = [];
    const sections: ("see" | "hear" | "play")[] = ["see", "hear", "play"];
    for (const s of sections) {
      const sec = check.sections?.[s];
      if (sec?.questions) {
        for (const q of sec.questions) out.push({ section: s, q });
      }
    }
    return out;
  }, [check]);

  const [idx, setIdx] = useState(0);
  const [correct, setCorrect] = useState(0);
  const total = all.length;

  function onAnswer(isCorrect: boolean) {
    const newCorrect = correct + (isCorrect ? 1 : 0);
    if (isCorrect) setCorrect(newCorrect);
    if (idx >= total - 1) onDone({ correct: newCorrect, total });
    else setIdx((i) => i + 1);
  }

  // Defensive: if somehow we were mounted with no questions, bail out
  // to the completion screen instead of rendering a stuck shell.
  useEffect(() => {
    if (total === 0) onDone({ correct: 0, total: 0 });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const cur = all[idx];
  if (!cur) return null;
  return (
    <div style={{ padding: "32px 20px 40px", maxWidth: 640, margin: "0 auto" }}>
      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          marginBottom: 16,
        }}
      >
        <div style={{ fontSize: 11, letterSpacing: "0.2em", fontWeight: 800 }}>
          MASTERY CHECK · Q{idx + 1} / {total}
        </div>
        <ModeChip mode={cur.section} />
      </div>
      <QuestionCard
        key={idx}
        q={cur.q}
        section={cur.section}
        onAnswer={onAnswer}
        onHighlightChange={onHighlightChange}
      />
      <div
        style={{
          height: 4,
          background: "rgba(0,0,0,0.08)",
          borderRadius: 2,
          overflow: "hidden",
        }}
      >
        <div
          style={{
            width: `${((idx + 1) / total) * 100}%`,
            height: "100%",
            background: "var(--berry, #d4a853)",
            transition: "width .3s",
          }}
        />
      </div>
    </div>
  );
}

// ------------------------------------------------------------------
// CompletionScreen
// ------------------------------------------------------------------

function CompletionScreen({
  lesson,
  score,
  onContinue,
}: {
  lesson: LessonV2;
  score: { correct: number; total: number };
  onContinue: () => void;
}) {
  const xp = lesson.completion?.xp ?? 20;
  const pct = score.total > 0 ? Math.round((score.correct / score.total) * 100) : 100;
  const passed = score.total === 0 || pct >= 60;
  return (
    <div
      style={{
        minHeight: "100vh",
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        padding: 32,
        gap: 22,
        background: "var(--paper, #f5f0e8)",
      }}
    >
      <div style={{ fontSize: 88, lineHeight: 1 }}>
        {lesson.is_graduation
          ? "🏆"
          : lesson.is_tier_boss || lesson.is_mid_boss
          ? "👑"
          : lesson.is_act_boss
          ? "🎯"
          : "✓"}
      </div>
      <div
        style={{
          fontSize: 11,
          letterSpacing: "0.3em",
          fontWeight: 900,
          color: "var(--ink3, #6b7280)",
        }}
      >
        {passed ? "LESSON COMPLETE" : "KEEP PRACTICING"}
      </div>
      <div
        style={{
          fontFamily: "Georgia, serif",
          fontStyle: "italic",
          fontWeight: 900,
          fontSize: 34,
          textAlign: "center",
          lineHeight: 1.1,
          maxWidth: 500,
        }}
      >
        {lesson.title}
      </div>
      {lesson.completion?.cleffy && (
        <div
          style={{
            fontFamily: "Georgia, serif",
            fontStyle: "italic",
            fontSize: 16,
            textAlign: "center",
            maxWidth: 500,
            lineHeight: 1.5,
            color: "var(--ink2, #4b5563)",
            whiteSpace: "pre-line",
          }}
        >
          {lesson.completion.cleffy}
        </div>
      )}
      <div
        style={{
          display: "flex",
          gap: 22,
          marginTop: 8,
          flexWrap: "wrap",
          justifyContent: "center",
        }}
      >
        <div style={{ textAlign: "center" }}>
          <div style={{ fontSize: 28, fontWeight: 900 }}>+{xp}</div>
          <div
            style={{ fontSize: 10, letterSpacing: "0.2em", fontWeight: 800 }}
          >
            XP
          </div>
        </div>
        {score.total > 0 && (
          <div style={{ textAlign: "center" }}>
            <div style={{ fontSize: 28, fontWeight: 900 }}>
              {Math.round((score.correct / score.total) * 100)}%
            </div>
            <div
              style={{ fontSize: 10, letterSpacing: "0.2em", fontWeight: 800 }}
            >
              MASTERY ({score.correct}/{score.total})
            </div>
          </div>
        )}
      </div>
      <button
        type="button"
        onClick={onContinue}
        style={{
          marginTop: 16,
          padding: "14px 28px",
          border: "2px solid var(--ink, #1f2937)",
          borderRadius: 999,
          background: "var(--berry, #d4a853)",
          cursor: "pointer",
          fontWeight: 900,
          fontSize: 16,
          boxShadow: "0 4px 0 var(--ink, #1f2937)",
        }}
      >
        Continue →
      </button>
    </div>
  );
}

// ------------------------------------------------------------------
// MasteryPhase — mastery screen + pipes question hint to bottom piano
// ------------------------------------------------------------------
function MasteryPhase({
  lesson,
  onExit,
  onDone,
}: {
  lesson: LessonV2;
  onExit: () => void;
  onDone: (score: { correct: number; total: number }) => void;
}) {
  const [hintMidi, setHintMidi] = useState<number | null>(null);
  const highlights = useMemo(
    () => (hintMidi != null ? { [hintMidi]: "#22c55e" } : {}),
    [hintMidi]
  );
  // Decide keyboard range around hint
  const [startMidi, endMidi] = useMemo(() => {
    if (hintMidi == null) return [48, 84];
    return computeKeyboardRange([hintMidi]);
  }, [hintMidi]);
  if (!lesson.mastery_check) return null;
  return (
    <div
      style={{
        minHeight: "100vh",
        display: "flex",
        flexDirection: "column",
        background: "var(--paper, #f5f0e8)",
      }}
    >
      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          padding: "14px 20px",
          borderBottom: "2px solid var(--ink, #1f2937)",
        }}
      >
        <button
          type="button"
          onClick={onExit}
          style={{
            padding: "6px 12px",
            border: "2px solid var(--ink, #1f2937)",
            borderRadius: 999,
            background: "var(--cream, #fff8ee)",
            fontWeight: 800,
            fontSize: 13,
            cursor: "pointer",
          }}
        >
          ← Back
        </button>
        <div
          style={{
            fontFamily: "Georgia, serif",
            fontWeight: 900,
            fontStyle: "italic",
          }}
        >
          Mastery check — {lesson.title}
        </div>
        <div style={{ width: 80 }} />
      </div>
      <div style={{ flex: 1, overflowY: "auto" }}>
        <MasteryCheckScreen
          check={lesson.mastery_check}
          onDone={onDone}
          onHighlightChange={setHintMidi}
        />
      </div>
      <div
        style={{
          background: "var(--paper, #f5f0e8)",
          borderTop: "2px solid var(--ink, #1f2937)",
        }}
      >
        <PianoKeyboard
          startMidi={startMidi}
          endMidi={endMidi}
          highlights={highlights}
          pulseMidi={hintMidi}
        />
      </div>
    </div>
  );
}

// ------------------------------------------------------------------
// Main screen
// ------------------------------------------------------------------

type Phase = "pages" | "mastery" | "complete";

export function LessonV2Screen({
  lesson,
  onExit,
  onComplete,
}: {
  lesson: LessonV2;
  onExit: () => void;
  onComplete?: (lesson: LessonV2) => void;
}) {
  const [phase, setPhase] = useState<Phase>("pages");
  const [pageIdx, setPageIdx] = useState(0);
  const [score, setScore] = useState<{ correct: number; total: number }>({
    correct: 0,
    total: 0,
  });

  // Sequence-play state — lives at the page level so the bottom piano can drive it.
  const [seqProgress, setSeqProgress] = useState(0);
  const [justPressed, setJustPressed] = useState<number | null>(null);
  const [justWrong, setJustWrong] = useState<number | null>(null);
  const [demoPlaying, setDemoPlaying] = useState(false);
  const [sequenceDone, setSequenceDone] = useState(false);

  const audioRef = useRef<HTMLAudioElement | null>(null);
  const pages = lesson.pages;
  const page: LessonPage | undefined = pages[pageIdx];
  const total = pages.length;
  const isFirst = pageIdx === 0;
  const isLast = pageIdx === total - 1;

  const highlightNotes = useMemo(
    () => collectHighlightNotes(page?.interaction),
    [page?.interaction]
  );
  const steps = useMemo(
    () => sequenceMidiSteps(page?.interaction),
    [page?.interaction]
  );
  // Flat list of the first accepted note per step — used for demo playback,
  // range computation, and the progress-pip display.
  const midis = useMemo(() => steps.map((s) => s[0]), [steps]);
  const isPlayPage = page?.mode === "play" && steps.length > 0;
  const expectedStep = isPlayPage && !sequenceDone ? steps[seqProgress] : null;
  // We pulse the first note of the accepted step — good enough for chords.
  const expectedMidi = expectedStep ? expectedStep[0] : null;
  const sequenceComplete = isPlayPage && seqProgress >= steps.length;
  const blockAdvance = isPlayPage && !sequenceDone;

  const [rangeStart, rangeEnd] = useMemo(() => {
    const hi = page?.highlights || {};
    const hiMidis = Object.keys(hi)
      .map(Number)
      .filter((n) => Number.isFinite(n));
    return computeKeyboardRange([...midis, ...hiMidis]);
  }, [midis, page?.highlights]);

  const pianoHighlights = useMemo(
    () => buildHighlights(page?.highlights, justPressed, justWrong),
    [page?.highlights, justPressed, justWrong]
  );

  // Unlock audio + preload samples on mount.
  useEffect(() => {
    unlockAudio();
    if (!isPianoReady()) loadPianoSamples().catch(() => {});
  }, []);

  // On page change: stop previous audio, reset state, auto-play new narration.
  useEffect(() => {
    seqProgressRef.current = 0;
    setSeqProgress(0);
    setJustPressed(null);
    setJustWrong(null);
    setSequenceDone(false);
    setDemoPlaying(false);
    const a = audioRef.current;
    if (a) {
      // Hard-stop the previous page's audio before kicking off the new one.
      // Without this the underlying media element can keep buffering the
      // prior file while React updates the src prop asynchronously.
      a.pause();
      a.currentTime = 0;
      // The src has already updated via React's render of the new page; force
      // the element to actually pick up the new source.
      try { a.load(); } catch {}
      if (page && pageHasNarration(page)) {
        a.play().catch(() => {});
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pageIdx]);

  // Belt-and-suspenders: when the screen unmounts (Exit / Finish), make sure
  // no audio leaks into other parts of the app.
  useEffect(() => {
    return () => {
      const a = audioRef.current;
      if (a) {
        try { a.pause(); } catch {}
      }
    };
  }, []);

  // When the sequence finishes naturally, celebrate + unblock advance.
  useEffect(() => {
    if (sequenceComplete && !sequenceDone) {
      playCorrectSound();
      setSequenceDone(true);
    }
  }, [sequenceComplete, sequenceDone]);

  const next = useCallback(() => {
    if (blockAdvance) return;
    if (!isLast) {
      setPageIdx((i) => i + 1);
      return;
    }
    const mc = lesson.mastery_check;
    const count =
      (mc?.sections?.see?.questions?.length ?? 0) +
      (mc?.sections?.hear?.questions?.length ?? 0) +
      (mc?.sections?.play?.questions?.length ?? 0);
    if (mc && count > 0) setPhase("mastery");
    else setPhase("complete");
  }, [blockAdvance, isLast, lesson.mastery_check]);

  const prev = useCallback(() => {
    if (!isFirst) setPageIdx((i) => i - 1);
  }, [isFirst]);

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (phase !== "pages") return;
      if (e.key === "ArrowRight") next();
      else if (e.key === "ArrowLeft") prev();
      else if (e.key === " " || e.code === "Space") {
        e.preventDefault();
        const a = audioRef.current;
        if (a) {
          a.currentTime = 0;
          a.play().catch(() => {});
        }
      } else if (e.key === "Escape") onExit();
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [next, prev, onExit, phase]);

  // Synchronous ref prevents double-click race from advancing twice.
  const seqProgressRef = useRef(0);
  useEffect(() => {
    seqProgressRef.current = seqProgress;
  }, [seqProgress]);

  function handlePianoPress(midi: number) {
    if (!isPlayPage || sequenceDone) return;
    const step = steps[seqProgressRef.current];
    if (!step) return;
    const isCorrect = step.includes(midi);
    if (isCorrect) {
      setJustPressed(midi);
      setJustWrong(null);
      setTimeout(() => setJustPressed(null), 220);
      seqProgressRef.current += 1;
      setSeqProgress(seqProgressRef.current);
    } else {
      setJustWrong(midi);
      setTimeout(() => setJustWrong(null), 320);
      playWrongSound();
    }
  }

  function handleDemo() {
    if (demoPlaying || midis.length === 0) return;
    setDemoPlaying(true);
    setSeqProgress(0);
    setSequenceDone(false);
    playNotes(midis, 0.5);
    setTimeout(() => setDemoPlaying(false), midis.length * 500 + 500);
  }

  function handleSkip() {
    setSequenceDone(true);
    seqProgressRef.current = steps.length;
    setSeqProgress(steps.length);
  }

  // ---------- Phase: mastery ----------
  if (phase === "mastery" && lesson.mastery_check) {
    return <MasteryPhase lesson={lesson} onExit={() => setPhase("pages")} onDone={(s) => { setScore(s); setPhase("complete"); }} />;
  }

  // ---------- Phase: complete ----------
  if (phase === "complete") {
    return (
      <CompletionScreen
        lesson={lesson}
        score={score}
        onContinue={() => onComplete?.(lesson)}
      />
    );
  }

  // ---------- Phase: pages ----------
  if (!page) return null;
  const narrationText =
    page.cleffy || page.completion_cleffy || page.followup_cleffy || "";
  const audioSrc = pageHasNarration(page)
    ? pageAudioSrc(lesson.id, page.id)
    : null;

  return (
    <div
      style={{
        minHeight: "100vh",
        display: "flex",
        flexDirection: "column",
        background: "var(--paper, #f5f0e8)",
        color: "var(--ink, #1f2937)",
        fontFamily: "var(--sans, system-ui, sans-serif)",
      }}
    >
      {/* Header */}
      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          padding: "clamp(10px, 2vw, 14px) clamp(12px, 3vw, 20px)",
          borderBottom: "2px solid var(--ink, #1f2937)",
          gap: 8,
        }}
      >
        <button
          type="button"
          onClick={onExit}
          style={{
            padding: "6px 12px",
            border: "2px solid var(--ink, #1f2937)",
            borderRadius: 999,
            background: "var(--cream, #fff8ee)",
            cursor: "pointer",
            fontWeight: 800,
            fontSize: 13,
            flexShrink: 0,
          }}
        >
          ← Exit
        </button>
        <div style={{ textAlign: "center", flex: 1, minWidth: 0 }}>
          <div
            style={{
              fontSize: 10,
              letterSpacing: "0.15em",
              color: "var(--ink3, #6b7280)",
              fontWeight: 800,
            }}
          >
            L{lesson.id}
            {lesson.is_tier_boss ? " · TIER BOSS" : ""}
            {lesson.is_mid_boss ? " · MID-BOSS" : ""}
            {lesson.is_graduation ? " · GRADUATION" : ""}
          </div>
          <div
            style={{
              fontFamily: "Georgia, serif",
              fontWeight: 900,
              fontStyle: "italic",
              fontSize: "clamp(15px, 4.5vw, 20px)",
              whiteSpace: "nowrap",
              overflow: "hidden",
              textOverflow: "ellipsis",
            }}
          >
            {lesson.title}
          </div>
        </div>
        <div
          style={{
            fontSize: 12,
            fontWeight: 800,
            minWidth: 58,
            textAlign: "right",
            lineHeight: 1.15,
            flexShrink: 0,
          }}
        >
          <div>{pageIdx + 1}/{total}</div>
          <div style={{ fontSize: 10, letterSpacing: "0.1em", color: "var(--ink3, #6b7280)" }}>
            {Math.round(((pageIdx + 1) / total) * 100)}%
          </div>
        </div>
      </div>

      {/* Progress bar */}
      <div style={{ height: 4, background: "rgba(0,0,0,0.08)" }}>
        <div
          style={{
            height: "100%",
            width: `${((pageIdx + 1) / total) * 100}%`,
            background: "var(--berry, #d4a853)",
            transition: "width .3s",
          }}
        />
      </div>

      {/* Scrollable main */}
      <div
        style={{
          flex: 1,
          overflowY: "auto",
          WebkitOverflowScrolling: "touch",
          padding: "clamp(12px, 3vw, 20px) clamp(12px, 3vw, 20px) 8px",
        }}
      >
        <div
          style={{
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            gap: "clamp(10px, 2.5vw, 16px)",
            maxWidth: 820,
            margin: "0 auto",
          }}
        >
          <ModeChip mode={page.mode} />

          {/* Figure panel — only shown when we have a real rendered visual */}
          {hasRenderedFigure(lesson, page, highlightNotes.length > 0) && (
            <div
              style={{
                width: "100%",
                minHeight: "clamp(140px, 28vw, 180px)",
                background: "var(--cream, #fff8ee)",
                border: "3px solid var(--ink, #1f2937)",
                borderRadius: 16,
                padding: "clamp(14px, 3vw, 22px)",
                display: "flex",
                flexDirection: "column",
                alignItems: "center",
                justifyContent: "center",
                gap: "clamp(8px, 2vw, 14px)",
              }}
            >
              <div
                style={{
                  fontSize: 11,
                  letterSpacing: "0.2em",
                  fontWeight: 800,
                  color: "var(--ink3, #6b7280)",
                  alignSelf: "flex-start",
                }}
              >
                FIGURE {lesson.id}.{pageIdx + 1}
              </div>
              <FigureRouter
                lesson={lesson}
                page={page}
                pageIdx={pageIdx}
                hasKeyboardNotes={highlightNotes.length > 0}
              />
            </div>
          )}

          {/* Audio samples (listen buttons for `audio:` descriptions) */}
          {page.audio && Object.keys(page.audio).length > 0 && (
            <AudioSamples audio={page.audio} autoPlayFirst={page.mode === "hear"} />
          )}

          {/* Drill-type interactions (listen-and-identify rounds) */}
          {page.interaction?.type === "drill" && (
            <DrillInteractionCard
              key={`drill-${pageIdx}`}
              interaction={page.interaction}
            />
          )}

          {/* Sequence progress (only on play pages) */}
          {isPlayPage && (
            <SequenceProgress
              notes={highlightNotes}
              midis={midis}
              progress={seqProgress}
              onDemo={handleDemo}
              onSkip={handleSkip}
              demoPlaying={demoPlaying}
              complete={sequenceDone}
            />
          )}

          {/* Narration */}
          {narrationText && (
            <div
              style={{
                width: "100%",
                background: "var(--parchment, #faf6ef)",
                border: "3px solid var(--ink, #1f2937)",
                borderRadius: 16,
                padding: "clamp(12px, 3vw, 18px)",
                display: "flex",
                flexDirection: "column",
                gap: 10,
              }}
            >
              <div
                style={{
                  fontFamily: "Georgia, serif",
                  fontSize: "clamp(15px, 4vw, 17px)",
                  lineHeight: 1.5,
                  whiteSpace: "pre-line",
                }}
              >
                {narrationText}
              </div>
              {audioSrc && (
                <audio
                  ref={audioRef}
                  src={audioSrc}
                  controls
                  style={{ width: "100%" }}
                  preload="auto"
                />
              )}
            </div>
          )}
        </div>
      </div>

      {/* Footer nav */}
      <div
        style={{
          padding: "8px clamp(10px, 3vw, 16px)",
          borderTop: "2px solid var(--ink, #1f2937)",
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          gap: 8,
          background: "var(--paper, #f5f0e8)",
        }}
      >
        <button
          type="button"
          onClick={prev}
          disabled={isFirst}
          style={{
            padding: "8px 12px",
            border: "2px solid var(--ink, #1f2937)",
            borderRadius: 999,
            background: isFirst ? "rgba(0,0,0,0.04)" : "var(--cream, #fff8ee)",
            cursor: isFirst ? "not-allowed" : "pointer",
            fontWeight: 800,
            fontSize: 13,
            opacity: isFirst ? 0.5 : 1,
            flexShrink: 0,
          }}
        >
          ← Prev
        </button>
        <div
          style={{
            fontFamily: "Georgia, serif",
            fontStyle: "italic",
            fontSize: 11,
            color: "var(--ink3, #6b7280)",
            textAlign: "center",
            flex: 1,
            minWidth: 0,
            overflow: "hidden",
            textOverflow: "ellipsis",
            whiteSpace: "nowrap",
          }}
        >
          {blockAdvance
            ? "Play on piano (or skip)"
            : "→ next · ← back · space replay"}
        </div>
        <button
          type="button"
          onClick={next}
          disabled={blockAdvance}
          style={{
            padding: "8px 16px",
            border: "2px solid var(--ink, #1f2937)",
            borderRadius: 999,
            background: blockAdvance
              ? "rgba(0,0,0,0.06)"
              : "var(--berry, #d4a853)",
            color: "var(--ink, #1f2937)",
            cursor: blockAdvance ? "not-allowed" : "pointer",
            fontWeight: 900,
            fontSize: 13,
            boxShadow: blockAdvance ? "none" : "0 3px 0 var(--ink, #1f2937)",
            opacity: blockAdvance ? 0.5 : 1,
            flexShrink: 0,
          }}
        >
          {isLast ? "Finish →" : "Next →"}
        </button>
      </div>

      {/* Persistent bottom piano */}
      <div
        style={{
          background: "var(--paper, #f5f0e8)",
          borderTop: "2px solid var(--ink, #1f2937)",
        }}
      >
        <PianoKeyboard
          startMidi={rangeStart}
          endMidi={rangeEnd}
          highlights={pianoHighlights}
          pulseMidi={expectedMidi}
          onClick={handlePianoPress}
        />
      </div>
    </div>
  );
}

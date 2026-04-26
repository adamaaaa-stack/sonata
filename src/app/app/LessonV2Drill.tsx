"use client";
/**
 * Drill-type interaction: N rounds, each with an audio sample + a
 * multi-choice question. A little rules engine picks appropriate notes to
 * play based on the question (step/skip, up/down, loud/soft, high/low, etc).
 */
import React, { useCallback, useMemo, useRef, useState } from "react";
import {
  playNotes,
  playPianoKey,
  playCorrectSound,
  playWrongSound,
  noteToMidi as libNoteToMidi,
} from "@/lib/music";

// ---------------- Types ----------------

export interface DrillInteraction {
  type: "drill";
  rounds?: number | DrillRoundSpec[];
  question?: string;
  options?: string[];
}

export interface DrillRoundSpec {
  question: string;
  options: string[];
}

interface Round {
  question: string;
  options: string[];
  correctIdx: number;
  play: () => void;
}

// ---------------- Note helpers ----------------

function midi(n: string): number | null {
  try {
    const m = libNoteToMidi(n);
    return Number.isFinite(m) ? m : null;
  } catch {
    return null;
  }
}
function midis(ns: string[]): number[] {
  return ns.map(midi).filter((x): x is number => x != null);
}
function randOf<T>(arr: T[]): T {
  return arr[Math.floor(Math.random() * arr.length)];
}

// ---------------- Round generator ----------------

/**
 * Given a question + one of the option strings, produce a function that
 * plays an audio clue that *matches* that option. Returns null if we
 * can't generate audio for this pattern.
 */
function generatePlay(_question: string, option: string): (() => void) | null {
  const opt = option.trim();
  const o = opt.toLowerCase();

  // Single-note identification — "C", "F", "G#", "Bb", "Middle C", etc.
  // Handle "Middle C" / "High C" / "Low C"
  const normalized = opt
    .replace(/middle\s+c/i, "C4")
    .replace(/high\s+c/i, "C5")
    .replace(/low\s+c/i, "C3")
    .replace(/\b([A-Ga-g])[-\s]?sharp\b/g, "$1#")
    .replace(/\b([A-Ga-g])[-\s]?flat\b/g, "$1b")
    .trim();
  const noteMatch = /^([A-Ga-g])([#b]?)(\d?)$/.exec(normalized);
  if (noteMatch) {
    const letter = noteMatch[1].toUpperCase();
    const acc = noteMatch[2];
    const oct = noteMatch[3] || "4";
    const full = `${letter}${acc}${oct}`;
    return () => {
      const m = midi(full);
      if (m) playPianoKey(m);
    };
  }

  // Up / Down / Up-the-stairs / Down-the-stairs
  if (/\bup\b/.test(o) || /up the stairs/.test(o)) {
    const starts = ["C4", "D4", "E4", "F4", "G4"];
    // pick a random ascending 3-note line
    const i = Math.floor(Math.random() * (starts.length - 2));
    const notes = [starts[i], starts[i + 1], starts[i + 2]];
    return () => playNotes(midis(notes), 0.4);
  }
  if (/\bdown\b/.test(o) || /down the stairs/.test(o)) {
    const starts = ["G4", "F4", "E4", "D4", "C4"];
    const i = Math.floor(Math.random() * (starts.length - 2));
    const notes = [starts[i], starts[i + 1], starts[i + 2]];
    return () => playNotes(midis(notes), 0.4);
  }

  // 2-group / 3-group — black-key groupings on the piano
  if (/\b2[-\s]?group|two[-\s]group/i.test(opt)) {
    // 2 adjacent black keys (C#/D# cluster)
    const clusters = [
      ["C#4", "D#4"],
      ["C#5", "D#5"],
      ["C#3", "D#3"],
    ];
    const notes = clusters[Math.floor(Math.random() * clusters.length)];
    return () => playNotes(midis(notes), 0.3);
  }
  if (/\b3[-\s]?group|three[-\s]group/i.test(opt)) {
    // 3 adjacent black keys (F#/G#/A# cluster)
    const clusters = [
      ["F#4", "G#4", "A#4"],
      ["F#5", "G#5", "A#5"],
      ["F#3", "G#3", "A#3"],
    ];
    const notes = clusters[Math.floor(Math.random() * clusters.length)];
    return () => playNotes(midis(notes), 0.3);
  }

  // Step / Skip / Leap — distance between two notes
  if (/\bstep\b/.test(o)) {
    const notes = randOf([["C4", "D4"], ["D4", "E4"], ["E4", "F4"], ["F4", "G4"], ["G4", "A4"]]);
    return () => playNotes(midis(notes), 0.5);
  }
  if (/\bskip\b/.test(o)) {
    const notes = randOf([["C4", "E4"], ["D4", "F4"], ["E4", "G4"], ["F4", "A4"]]);
    return () => playNotes(midis(notes), 0.5);
  }
  if (/\bleap\b/.test(o) || /bigger than a step/i.test(o) || /bigger than a skip/i.test(o)) {
    const notes = randOf([["C4", "G4"], ["D4", "A4"], ["E4", "C5"]]);
    return () => playNotes(midis(notes), 0.5);
  }

  // Repeat / same note
  if (/\brepeat/.test(o) || /\bsame\b/.test(o)) {
    return () => playNotes(midis(["C4", "C4"]), 0.4);
  }

  // High / Low
  if (/\bhigh\b/.test(o)) {
    const n = randOf(["C6", "D6", "E6", "G5"]);
    return () => {
      const m = midi(n);
      if (m) playPianoKey(m);
    };
  }
  if (/\blow\b/.test(o)) {
    const n = randOf(["C3", "D3", "F3", "A3"]);
    return () => {
      const m = midi(n);
      if (m) playPianoKey(m);
    };
  }

  // Loud / Soft (approximate via number of notes + emphasis; playPianoKey
  // doesn't expose velocity, so we layer multiple notes for loudness)
  if (/\bloud\b|forte/.test(o)) {
    return () => {
      const ns = midis(["C4", "E4", "G4"]);
      for (const m of ns) playPianoKey(m);
    };
  }
  if (/\bsoft\b|piano\b/.test(o)) {
    return () => {
      const m = midi("C4");
      if (m) playPianoKey(m);
    };
  }

  // Fast / Slow
  if (/\bfast\b/.test(o)) {
    return () => playNotes(midis(["C4", "D4", "E4", "F4", "G4"]), 0.18);
  }
  if (/\bslow\b/.test(o)) {
    return () => playNotes(midis(["C4", "D4", "E4"]), 0.9);
  }

  // Black / White key (for 2-group / 3-group listening)
  if (/\bblack\b/.test(o)) {
    const n = randOf(["C#4", "D#4", "F#4", "G#4", "A#4"]);
    return () => {
      const m = midi(n);
      if (m) playPianoKey(m);
    };
  }
  if (/\bwhite\b/.test(o)) {
    const n = randOf(["C4", "D4", "E4", "F4", "G4", "A4", "B4"]);
    return () => {
      const m = midi(n);
      if (m) playPianoKey(m);
    };
  }

  // Unknown — no audio
  return null;
}

function makeRound(question: string, options: string[]): Round | null {
  const candidates = options
    .map((o, i) => ({ i, play: generatePlay(question, o) }))
    .filter((c): c is { i: number; play: () => void } => c.play != null);
  if (candidates.length === 0) {
    // No audio available for any option — skip this round entirely.
    return null;
  }
  const pick = candidates[Math.floor(Math.random() * candidates.length)];
  return { question, options, correctIdx: pick.i, play: pick.play };
}

// ---------------- Component ----------------

export function DrillInteractionCard({
  interaction,
  onDone,
}: {
  interaction: DrillInteraction;
  onDone?: (score: { correct: number; total: number }) => void;
}) {
  // Build the round list. Recompute when the interaction changes so drill
  // pages in the same lesson don't share stale rounds.
  const rounds: Round[] = useMemo(() => {
    const built: (Round | null)[] = Array.isArray(interaction.rounds)
      ? interaction.rounds.map((r) => makeRound(r.question, r.options))
      : (() => {
          const count =
            typeof interaction.rounds === "number" ? interaction.rounds : 4;
          const q = interaction.question || "Listen";
          const opts = interaction.options;
          // CRITICAL: do NOT fall back to ["A", "B"]. ~64 lessons in the
          // hand-authored corpus have drill interactions without explicit
          // options — falling back to literal letter names "A" and "B"
          // produced bogus tests asking the student about notes that
          // hadn't been introduced. Without options we have no
          // pedagogical content to drill, so emit zero rounds and let
          // the empty-state branch below render a graceful skip.
          if (!opts || opts.length === 0) return [];
          return Array.from({ length: count }, () => makeRound(q, opts));
        })();
    return built.filter((r): r is Round => r != null);
  }, [interaction]);

  const [idx, setIdx] = useState(0);
  const [picked, setPicked] = useState<number | null>(null);
  const [revealed, setRevealed] = useState(false);
  const [correct, setCorrect] = useState(0);
  const [played, setPlayed] = useState(false);
  const autoRef = useRef(false);

  const cur = rounds[idx];
  const done = idx >= rounds.length;

  // Auto-play first round once
  React.useEffect(() => {
    if (!cur || autoRef.current) return;
    autoRef.current = true;
    const t = setTimeout(() => {
      cur.play();
      setPlayed(true);
    }, 300);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const replay = useCallback(() => {
    if (!cur) return;
    cur.play();
    setPlayed(true);
  }, [cur]);

  const pick = useCallback(
    (i: number) => {
      if (!cur || revealed) return;
      setPicked(i);
      setRevealed(true);
      const isCorrect = i === cur.correctIdx;
      if (isCorrect) playCorrectSound();
      else playWrongSound();
      setTimeout(() => {
        const newCorrect = correct + (isCorrect ? 1 : 0);
        if (idx >= rounds.length - 1) {
          onDone?.({ correct: newCorrect, total: rounds.length });
        } else {
          setIdx((n) => n + 1);
          setPicked(null);
          setRevealed(false);
          setPlayed(false);
          // auto-play next round
          setTimeout(() => rounds[idx + 1]?.play(), 400);
        }
        setCorrect(newCorrect);
      }, 900);
    },
    [cur, revealed, correct, idx, rounds, onDone]
  );

  // All rounds got filtered out (no audio for any option) — show a soft skip.
  if (rounds.length === 0) {
    return (
      <div
        style={{
          background: "var(--parchment, #faf6ef)",
          border: "2px dashed var(--ink, #1f2937)",
          borderRadius: 12,
          padding: 14,
          fontFamily: "Georgia, serif",
          fontStyle: "italic",
          fontSize: 14,
          color: "var(--ink2, #4b5563)",
          textAlign: "center",
        }}
      >
        This drill can&apos;t be played in-app yet — tap Next to continue.
      </div>
    );
  }

  if (done || !cur) {
    return (
      <div
        style={{
          background: "var(--parchment, #faf6ef)",
          border: "2px solid var(--ink, #1f2937)",
          borderRadius: 12,
          padding: 16,
          textAlign: "center",
        }}
      >
        <div style={{ fontSize: 15, fontWeight: 800 }}>
          Drill complete — {correct} / {rounds.length}
        </div>
      </div>
    );
  }

  return (
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        gap: 12,
        width: "100%",
        background: "var(--parchment, #faf6ef)",
        border: "2px solid var(--ink, #1f2937)",
        borderRadius: 12,
        padding: 14,
      }}
    >
      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
        }}
      >
        <div style={{ fontSize: 11, letterSpacing: "0.2em", fontWeight: 800, color: "var(--ink3, #6b7280)" }}>
          ROUND {idx + 1} / {rounds.length}
        </div>
        <div style={{ fontSize: 11, fontWeight: 800, color: "var(--ink3, #6b7280)" }}>
          ✓ {correct}
        </div>
      </div>

      <button
        type="button"
        onClick={replay}
        style={{
          padding: "14px 20px",
          border: "3px solid var(--ink, #1f2937)",
          borderRadius: 12,
          background: "var(--berry, #d4a853)",
          cursor: "pointer",
          fontWeight: 900,
          fontSize: 16,
          boxShadow: "0 3px 0 var(--ink, #1f2937)",
        }}
      >
        {played ? "♪ Replay" : "♪ Play"}
      </button>

      <div
        style={{
          fontFamily: "Georgia, serif",
          fontStyle: "italic",
          fontSize: 17,
          textAlign: "center",
          color: "var(--ink, #1f2937)",
          margin: "4px 0",
        }}
      >
        {cur.question}
      </div>

      <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
        {cur.options.map((opt, i) => {
          const isPicked = picked === i;
          const isCorrect = revealed && i === cur.correctIdx;
          const isWrong = revealed && isPicked && i !== cur.correctIdx;
          return (
            <button
              key={i}
              type="button"
              onClick={() => pick(i)}
              disabled={revealed}
              style={{
                padding: "12px 16px",
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
                fontWeight: 700,
                fontSize: 16,
                textAlign: "center",
              }}
            >
              {opt}
            </button>
          );
        })}
      </div>
    </div>
  );
}

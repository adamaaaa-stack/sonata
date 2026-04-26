"use client";
/**
 * LessonV2Tier3 — three engagement features that layer on top of the
 * existing LessonV2 player without changing any of the 250 lessons:
 *
 *   1. NoticeBubble       — "did you notice?" Cleffy pop-up between pages.
 *   2. RhythmRaceCard     — race-the-metronome rhythm drill that speeds up
 *                            on each successful round.
 *   3. DragInteractionCard — drag-and-drop interactions, v1 supports
 *                            dragging a note head onto a staff line/space.
 *
 * Voice and text content of every existing lesson stays exactly as
 * authored. These components light up only when a lesson YAML opts in
 * via the new `notice` field, `rhythm_race` interaction type, or
 * `drag` interaction type respectively.
 */
import React, { useEffect, useMemo, useRef, useState } from "react";
import type {
  InteractionRhythmRace,
  InteractionDrag,
  DragItem,
  DragTarget,
} from "@/lib/music/lessonsV2";
import {
  playCorrectSound,
  playWrongSound,
  playNotes,
  noteToMidi,
} from "@/lib/music/index";

// ─────────────────────────────────────────────────────────────────────────
// 1. Notice bubble — between-page Cleffy observation
// ─────────────────────────────────────────────────────────────────────────

export function NoticeBubble({
  text,
  onDismiss,
}: {
  text: string;
  onDismiss: () => void;
}) {
  // Auto-dismiss after a beat if the user doesn't tap — feels less
  // pushy than blocking forever.
  useEffect(() => {
    const t = setTimeout(onDismiss, 6000);
    return () => clearTimeout(t);
  }, [onDismiss]);

  return (
    <div
      onClick={onDismiss}
      role="button"
      aria-label="Dismiss observation"
      style={{
        position: "fixed",
        inset: 0,
        zIndex: 9999,
        background: "rgba(15, 15, 15, 0.55)",
        backdropFilter: "blur(2px)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        padding: 20,
        cursor: "pointer",
        animation: "noticeFadeIn 220ms ease-out",
      }}
    >
      <div
        style={{
          background: "var(--cream, #fff8ee)",
          color: "var(--ink, #1f2937)",
          border: "3px solid var(--ink, #1f2937)",
          borderRadius: 22,
          padding: "26px 28px 22px",
          maxWidth: 460,
          width: "100%",
          boxShadow: "0 6px 0 var(--ink, #1f2937)",
          fontFamily: "Georgia, serif",
          position: "relative",
          animation: "noticePopIn 320ms cubic-bezier(0.34,1.56,0.64,1)",
        }}
      >
        {/* Cleffy chip */}
        <div
          style={{
            position: "absolute",
            top: -22,
            left: 22,
            background: "var(--gold, #d4a853)",
            border: "3px solid var(--ink, #1f2937)",
            borderRadius: 999,
            padding: "4px 12px",
            fontFamily: "var(--sans, system-ui)",
            fontSize: 12,
            fontWeight: 800,
            letterSpacing: "0.12em",
            textTransform: "uppercase",
          }}
        >
          ♪ Cleffy
        </div>
        <div
          style={{
            fontSize: 11,
            fontWeight: 800,
            letterSpacing: "0.18em",
            color: "var(--ink3, #6b7280)",
            marginBottom: 8,
            paddingLeft: 4,
          }}
        >
          DID YOU NOTICE?
        </div>
        <div
          style={{
            fontSize: 19,
            lineHeight: 1.4,
            fontStyle: "italic",
            paddingLeft: 4,
          }}
        >
          {text}
        </div>
        <div
          style={{
            marginTop: 16,
            fontSize: 12,
            color: "var(--ink3, #6b7280)",
            textAlign: "right",
            fontFamily: "var(--sans, system-ui)",
          }}
        >
          Tap to continue
        </div>
      </div>
      <style>{`
        @keyframes noticeFadeIn {
          from { opacity: 0; }
          to { opacity: 1; }
        }
        @keyframes noticePopIn {
          0%   { transform: translateY(20px) scale(0.92); opacity: 0; }
          60%  { transform: translateY(-3px) scale(1.02); opacity: 1; }
          100% { transform: translateY(0) scale(1); }
        }
      `}</style>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────
// 2. Race-the-metronome
// ─────────────────────────────────────────────────────────────────────────

const DURATION_BEATS: Record<string, number> = {
  whole: 4,
  half: 2,
  dotted_half: 3,
  quarter: 1,
  eighth: 0.5,
  sixteenth: 0.25,
  quarter_rest: 1,
};

function durationsToBeats(
  sequence: InteractionRhythmRace["sequence"],
  durations?: string[]
): number[] {
  return sequence.map((_, i) => {
    const d = durations?.[i] || "quarter";
    return DURATION_BEATS[d] ?? 1;
  });
}

export function RhythmRaceCard({
  interaction,
  onComplete,
  pressTrigger,
}: {
  interaction: InteractionRhythmRace;
  onComplete: () => void;
  pressTrigger?: { midi: number; key: number } | null;
}) {
  const startTempo = interaction.start_tempo ?? 60;
  const step = interaction.step ?? 5;
  const totalRounds = interaction.rounds ?? 6;

  const [round, setRound] = useState(0); // 0-indexed completed rounds
  const [tempo, setTempo] = useState(startTempo);
  const [stepIdx, setStepIdx] = useState(0); // current note within current round
  const [armed, setArmed] = useState(true);
  const [flashWrong, setFlashWrong] = useState(false);

  const beats = useMemo(
    () => durationsToBeats(interaction.sequence, interaction.durations),
    [interaction.sequence, interaction.durations]
  );

  const expected = useMemo(() => {
    const item = interaction.sequence[stepIdx];
    if (!item) return null;
    if (Array.isArray(item)) return item.map((n) => noteToMidi(n));
    return [noteToMidi(item)];
  }, [interaction.sequence, stepIdx]);

  // Handle press: correct → advance step / round; wrong → reset round.
  const lastKeyRef = useRef<number | null>(null);
  useEffect(() => {
    if (!pressTrigger || !armed) return;
    if (lastKeyRef.current === pressTrigger.key) return;
    lastKeyRef.current = pressTrigger.key;
    if (!expected) return;
    if (expected.includes(pressTrigger.midi)) {
      // Correct
      const nextStep = stepIdx + 1;
      if (nextStep >= interaction.sequence.length) {
        // Round complete
        const newRound = round + 1;
        playCorrectSound();
        if (newRound >= totalRounds) {
          setArmed(false);
          setTimeout(() => onComplete(), 600);
          return;
        }
        setRound(newRound);
        setTempo((t) => t + step);
        setStepIdx(0);
      } else {
        setStepIdx(nextStep);
      }
    } else {
      // Wrong — reset the round, don't penalise tempo
      playWrongSound();
      setFlashWrong(true);
      setTimeout(() => setFlashWrong(false), 350);
      setStepIdx(0);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pressTrigger]);

  // Demo playback at the start of each round so the student hears the
  // pattern at the new tempo before the first hit. Cancellable.
  const demoTimers = useRef<number[]>([]);
  const playDemo = () => {
    demoTimers.current.forEach((id) => clearTimeout(id));
    demoTimers.current = [];
    const beatMs = 60000 / tempo;
    let acc = 0;
    interaction.sequence.forEach((item, i) => {
      const id = window.setTimeout(() => {
        const notes = Array.isArray(item) ? item : [item];
        const midis = notes
          .map((n) => noteToMidi(n))
          .filter((m): m is number => Number.isFinite(m));
        if (midis.length > 0) playNotes(midis, beats[i] * (beatMs / 1000));
      }, acc);
      demoTimers.current.push(id);
      acc += beats[i] * beatMs;
    });
  };
  useEffect(() => {
    return () => demoTimers.current.forEach((id) => clearTimeout(id));
  }, []);

  const tempoFraction = Math.min(
    1,
    (tempo - startTempo) / Math.max(step * totalRounds, 1)
  );

  return (
    <div
      style={{
        background: flashWrong ? "#fee2e2" : "var(--cream, #fff8ee)",
        border: "3px solid var(--ink, #1f2937)",
        borderRadius: 16,
        padding: 18,
        transition: "background 220ms",
      }}
    >
      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          marginBottom: 10,
        }}
      >
        <div
          style={{
            fontSize: 11,
            fontWeight: 800,
            letterSpacing: "0.18em",
            color: "var(--ink3, #6b7280)",
          }}
        >
          RACE THE METRONOME
        </div>
        <div style={{ fontSize: 13, fontWeight: 700 }}>
          Round {round + 1} / {totalRounds}
        </div>
      </div>

      {/* Speedometer */}
      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: 14,
          marginBottom: 14,
        }}
      >
        <div
          style={{
            flex: 1,
            height: 16,
            background: "rgba(15,15,15,0.08)",
            border: "2px solid var(--ink, #1f2937)",
            borderRadius: 999,
            overflow: "hidden",
            position: "relative",
          }}
        >
          <div
            style={{
              width: `${tempoFraction * 100}%`,
              height: "100%",
              background:
                "linear-gradient(90deg, var(--gold, #d4a853), var(--berry, #c45a8a))",
              transition: "width 380ms ease-out",
            }}
          />
        </div>
        <div
          style={{
            fontFamily: "var(--mono, monospace)",
            fontSize: 22,
            fontWeight: 900,
            minWidth: 72,
            textAlign: "right",
          }}
        >
          {tempo} <span style={{ fontSize: 11, fontWeight: 700 }}>BPM</span>
        </div>
      </div>

      {/* Step pips */}
      <div
        style={{
          display: "flex",
          gap: 6,
          flexWrap: "wrap",
          marginBottom: 12,
        }}
      >
        {interaction.sequence.map((_, i) => (
          <div
            key={i}
            style={{
              width: 28,
              height: 28,
              borderRadius: 999,
              border: "2px solid var(--ink, #1f2937)",
              background:
                i < stepIdx
                  ? "var(--mint, #6ec1a3)"
                  : i === stepIdx
                  ? "var(--gold, #d4a853)"
                  : "transparent",
              fontSize: 11,
              fontWeight: 800,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              fontFamily: "var(--mono, monospace)",
            }}
          >
            {i + 1}
          </div>
        ))}
      </div>

      <div style={{ display: "flex", gap: 8 }}>
        <button
          type="button"
          onClick={playDemo}
          style={{
            padding: "8px 12px",
            border: "2px solid var(--ink, #1f2937)",
            borderRadius: 10,
            background: "var(--gold, #d4a853)",
            fontWeight: 800,
            cursor: "pointer",
            boxShadow: "0 2px 0 var(--ink, #1f2937)",
          }}
        >
          ♪ Hear at {tempo} BPM
        </button>
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────
// 3. Drag interaction — v1: drag a note onto a staff line/space
// ─────────────────────────────────────────────────────────────────────────

const STAFF_PITCH_TO_LINE: Record<string, { line?: number; space?: number }> = {
  // Treble clef, bottom-up
  E4: { line: 1 },
  F4: { space: 1 },
  G4: { line: 2 },
  A4: { space: 2 },
  B4: { line: 3 },
  C5: { space: 3 },
  D5: { line: 4 },
  E5: { space: 4 },
  F5: { line: 5 },
};

function describeItem(item: DragItem): string {
  if (item.kind === "note") return item.pitch;
  if (item.kind === "finger") return String(item.number);
  return item.value;
}

function isDropCorrect(
  item: DragItem,
  target: DragTarget,
  droppedOn: { line?: number; space?: number; pitch?: string; midi?: number }
): boolean {
  if (item.kind !== "note") return false;
  if (target.kind === "staff_line") {
    return droppedOn.line === target.line;
  }
  if (target.kind === "staff_space") {
    return droppedOn.space === target.space;
  }
  if (target.kind === "staff_pitch") {
    const tgt = STAFF_PITCH_TO_LINE[target.pitch];
    if (!tgt) return droppedOn.pitch === target.pitch;
    return tgt.line === droppedOn.line && tgt.space === droppedOn.space;
  }
  return false;
}

export function DragInteractionCard({
  interaction,
  onComplete,
}: {
  interaction: InteractionDrag;
  onComplete: (correct: boolean) => void;
}) {
  const [dropZone, setDropZone] = useState<{
    line?: number;
    space?: number;
  } | null>(null);
  const [resolved, setResolved] = useState<"none" | "correct" | "wrong">(
    "none"
  );

  const handleDrop = (zone: { line?: number; space?: number }) => {
    if (resolved !== "none") return;
    setDropZone(zone);
    const correct = isDropCorrect(interaction.item, interaction.target, zone);
    if (correct) {
      playCorrectSound();
      setResolved("correct");
      setTimeout(() => onComplete(true), 700);
    } else {
      playWrongSound();
      setResolved("wrong");
      // Bounce back and let the user retry
      setTimeout(() => {
        setResolved("none");
        setDropZone(null);
      }, 700);
    }
  };

  return (
    <div
      style={{
        background: "var(--cream, #fff8ee)",
        border: "3px solid var(--ink, #1f2937)",
        borderRadius: 16,
        padding: 18,
      }}
    >
      <div
        style={{
          fontSize: 11,
          fontWeight: 800,
          letterSpacing: "0.18em",
          color: "var(--ink3, #6b7280)",
          marginBottom: 10,
        }}
      >
        DRAG IT
      </div>
      {interaction.prompt && (
        <div style={{ fontSize: 16, fontWeight: 700, marginBottom: 14 }}>
          {interaction.prompt}
        </div>
      )}
      <StaffDropTarget
        target={interaction.target}
        onDrop={handleDrop}
        droppedZone={dropZone}
        resolved={resolved}
      />
      <div style={{ marginTop: 16, display: "flex", justifyContent: "center" }}>
        <DraggableNote
          label={describeItem(interaction.item)}
          locked={resolved === "correct"}
        />
      </div>
    </div>
  );
}

function DraggableNote({ label, locked }: { label: string; locked: boolean }) {
  const [drag, setDrag] = useState<{ x: number; y: number } | null>(null);
  const ref = useRef<HTMLDivElement | null>(null);

  const onPointerDown = (e: React.PointerEvent) => {
    if (locked) return;
    e.preventDefault();
    if (!ref.current) return;
    ref.current.setPointerCapture(e.pointerId);
    setDrag({ x: e.clientX, y: e.clientY });
  };
  const onPointerMove = (e: React.PointerEvent) => {
    if (!drag) return;
    setDrag({ x: e.clientX, y: e.clientY });
    // Find the staff zone under the pointer and tell it we're hovering.
    // (The drop target listens via window pointer events; see below.)
    document.dispatchEvent(
      new CustomEvent("sonata-drag-move", {
        detail: { x: e.clientX, y: e.clientY },
      })
    );
  };
  const onPointerUp = (e: React.PointerEvent) => {
    if (!drag) return;
    document.dispatchEvent(
      new CustomEvent("sonata-drag-drop", {
        detail: { x: e.clientX, y: e.clientY },
      })
    );
    setDrag(null);
  };

  const noteStyle: React.CSSProperties = {
    width: 56,
    height: 40,
    borderRadius: "50%",
    background: locked ? "rgba(15,15,15,0.2)" : "var(--ink, #1f2937)",
    color: "var(--cream, #fff8ee)",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    fontFamily: "var(--mono, monospace)",
    fontSize: 16,
    fontWeight: 900,
    cursor: locked ? "default" : "grab",
    touchAction: "none",
    userSelect: "none",
    transform: drag ? `scale(1.15)` : "scale(1)",
    transition: "transform 120ms",
    position: "relative",
    boxShadow: drag
      ? "0 6px 16px rgba(0,0,0,0.25)"
      : "0 2px 0 var(--ink, #1f2937)",
  };

  return (
    <div
      ref={ref}
      onPointerDown={onPointerDown}
      onPointerMove={onPointerMove}
      onPointerUp={onPointerUp}
      style={
        drag
          ? {
              ...noteStyle,
              position: "fixed",
              left: drag.x - 28,
              top: drag.y - 20,
              zIndex: 10000,
            }
          : noteStyle
      }
    >
      ♩ {label}
    </div>
  );
}

function StaffDropTarget({
  target,
  onDrop,
  droppedZone,
  resolved,
}: {
  target: DragTarget;
  onDrop: (zone: { line?: number; space?: number }) => void;
  droppedZone: { line?: number; space?: number } | null;
  resolved: "none" | "correct" | "wrong";
}) {
  const ref = useRef<HTMLDivElement | null>(null);
  const [hover, setHover] = useState<{ line?: number; space?: number } | null>(
    null
  );

  // Listen for drag move/drop events dispatched by the DraggableNote.
  useEffect(() => {
    function handleMove(e: Event) {
      const detail = (e as CustomEvent).detail as { x: number; y: number };
      if (!ref.current) return;
      const zone = pointerToZone(ref.current, detail.x, detail.y);
      setHover(zone);
    }
    function handleDrop(e: Event) {
      const detail = (e as CustomEvent).detail as { x: number; y: number };
      if (!ref.current) return;
      const zone = pointerToZone(ref.current, detail.x, detail.y);
      setHover(null);
      if (zone) onDrop(zone);
    }
    document.addEventListener("sonata-drag-move", handleMove);
    document.addEventListener("sonata-drag-drop", handleDrop);
    return () => {
      document.removeEventListener("sonata-drag-move", handleMove);
      document.removeEventListener("sonata-drag-drop", handleDrop);
    };
  }, [onDrop]);

  const lines = [1, 2, 3, 4, 5]; // bottom to top

  // Highlight the correct zone after a wrong drop.
  const highlightCorrect = resolved === "wrong";
  const correctLine =
    target.kind === "staff_line"
      ? target.line
      : target.kind === "staff_pitch"
      ? STAFF_PITCH_TO_LINE[target.pitch]?.line
      : undefined;
  // (Spaces could be highlighted similarly, but v1 only marks the
  // correct line for now — keeps the visual simpler.)

  return (
    <div
      ref={ref}
      style={{
        position: "relative",
        height: 200,
        background: "var(--parchment, #faf6ef)",
        border: "2px solid var(--ink, #1f2937)",
        borderRadius: 12,
        padding: "30px 20px",
      }}
    >
      {/* Staff lines (bottom to top) */}
      {lines.map((ln) => {
        const isHovering = hover?.line === ln;
        const isCorrect = highlightCorrect && correctLine === ln;
        const isDropped = droppedZone?.line === ln;
        return (
          <div
            key={`line-${ln}`}
            style={{
              position: "absolute",
              left: 20,
              right: 20,
              bottom: 30 + (ln - 1) * 35,
              height: 4,
              background: isCorrect
                ? "var(--mint, #6ec1a3)"
                : isHovering
                ? "var(--gold, #d4a853)"
                : "var(--ink, #1f2937)",
              transition: "background 180ms",
              boxShadow: isHovering ? "0 0 12px var(--gold, #d4a853)" : "none",
            }}
          >
            {(isHovering || isCorrect || isDropped) && (
              <div
                style={{
                  position: "absolute",
                  left: "50%",
                  top: -10,
                  transform: "translate(-50%, -50%)",
                  width: 24,
                  height: 24,
                  borderRadius: "50%",
                  background: isCorrect
                    ? "var(--mint, #6ec1a3)"
                    : isDropped
                    ? "var(--ink, #1f2937)"
                    : "var(--gold, #d4a853)",
                  border: "2px solid var(--ink, #1f2937)",
                }}
              />
            )}
          </div>
        );
      })}
      {/* Hint label */}
      <div
        style={{
          position: "absolute",
          bottom: 6,
          left: 0,
          right: 0,
          textAlign: "center",
          fontSize: 11,
          fontWeight: 700,
          color: "var(--ink3, #6b7280)",
          letterSpacing: "0.12em",
        }}
      >
        DRAG ONTO THE STAFF
      </div>
    </div>
  );
}

function pointerToZone(
  el: HTMLElement,
  x: number,
  y: number
): { line?: number; space?: number } | null {
  const rect = el.getBoundingClientRect();
  if (x < rect.left || x > rect.right || y < rect.top || y > rect.bottom) {
    return null;
  }
  // Lines are at bottom + (ln-1)*35, padding bottom 30. Compute relative.
  const fromBottom = rect.bottom - y;
  const baseOffset = 30; // matches padding-bottom
  const lineSpacing = 35;
  // Check if pointer is within ~12px of any line center
  for (let ln = 1; ln <= 5; ln++) {
    const center = baseOffset + (ln - 1) * lineSpacing;
    if (Math.abs(fromBottom - center) < 14) return { line: ln };
  }
  // Otherwise, find the space (between two lines)
  for (let sp = 1; sp <= 4; sp++) {
    const lower = baseOffset + (sp - 1) * lineSpacing;
    const upper = baseOffset + sp * lineSpacing;
    if (fromBottom > lower + 14 && fromBottom < upper - 14) return { space: sp };
  }
  return null;
}

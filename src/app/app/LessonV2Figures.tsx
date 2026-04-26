"use client";
/**
 * LessonV2 figure renderers.
 *
 * Every YAML page has a free-form `figure:` description. We render an
 * actual visual for ALL pages — no text-only fallback — because the figure
 * tells the student what to look at. The decision tree picks the best
 * renderer based on figure keywords + page metadata:
 *
 *   - CleffyScene          — Cleffy greeting (hook pages)
 *   - Staircase            — "stairs" metaphor
 *   - Pyramid              — tier-progress pyramid
 *   - CelebrationCard      — boss-lesson wraps
 *   - KeyboardMini         — any keyboard-based figure (highlights from page)
 *   - StaffMini            — staff / clef / notation figures (with notes)
 *   - HandDiagram          — hand / finger figures
 *   - RhythmDisplay        — beat / metronome / note-duration figures
 *   - GenericFigureCard    — final fallback: stylised description card
 */
import React from "react";
import { Cleffy } from "./Cleffy";
import type { LessonV2, LessonPage } from "@/lib/music/lessonsV2";

// ---------- helpers --------------------------------------------------------

function hasKeyword(text: string | undefined, ...kws: string[]): boolean {
  if (!text) return false;
  const t = text.toLowerCase();
  return kws.some((k) => t.includes(k.toLowerCase()));
}

function completedTiers(lessonId: number): boolean[] {
  // Pyramid rows: Tier 1..6. A tier counts "completed" if we've passed its tier-boss lesson.
  // Tier boss ids: 25, 75, 125, 175, 225, 250 (graduation).
  const bosses = [25, 75, 125, 175, 225, 250];
  return bosses.map((bossId) => lessonId >= bossId);
}

function currentTierIndex(lessonId: number): number {
  if (lessonId <= 25) return 0;
  if (lessonId <= 75) return 1;
  if (lessonId <= 125) return 2;
  if (lessonId <= 175) return 3;
  if (lessonId <= 225) return 4;
  return 5;
}

// ---------- Staircase ------------------------------------------------------

function Staircase({
  steps = 10,
  highlightStep,
  cleffyOnTop = false,
  cleffyMood = "happy",
}: {
  steps?: number;
  highlightStep?: number;
  cleffyOnTop?: boolean;
  cleffyMood?: "happy" | "excited" | "waving";
}) {
  const W = 420;
  const H = 240;
  const margin = 10;
  const baseY = H - margin;
  const stepW = (W - margin * 2) / steps;
  const stepH = (H - margin * 2) / steps;

  const rects = [];
  for (let i = 0; i < steps; i++) {
    const x = margin + i * stepW;
    const y = baseY - (i + 1) * stepH;
    const height = (i + 1) * stepH;
    const isHi = highlightStep != null && i === highlightStep;
    rects.push(
      <rect
        key={i}
        x={x}
        y={y}
        width={stepW}
        height={height}
        fill={isHi ? "#E8A93C" : "#FAF6EF"}
        stroke="#2A1E14"
        strokeWidth={2}
      />
    );
  }

  // Cleffy sits on top-right step
  const topX = margin + (steps - 1) * stepW + stepW / 2;
  const topY = baseY - steps * stepH;

  return (
    <div style={{ position: "relative", width: W, maxWidth: "100%" }}>
      <svg viewBox={`0 0 ${W} ${H}`} width="100%" style={{ display: "block" }}>
        {rects}
        {/* Floor line */}
        <line x1={margin} y1={baseY} x2={W - margin} y2={baseY} stroke="#2A1E14" strokeWidth={2} />
      </svg>
      {cleffyOnTop && (
        <div
          style={{
            position: "absolute",
            left: `${(topX / W) * 100}%`,
            top: `${(topY / H) * 100}%`,
            transform: "translate(-50%, -100%)",
          }}
        >
          <Cleffy size={52} mood={cleffyMood} />
        </div>
      )}
    </div>
  );
}

// ---------- Pyramid --------------------------------------------------------

const TIER_NAMES = ["Tier 1", "Tier 2", "Tier 3", "Tier 4", "Tier 5", "Tier 6"];
const TIER_COLORS = ["#E8A93C", "#D4A853", "#B8860B", "#C9B037", "#FDB813", "#FFD700"];

function Pyramid({
  lessonId,
  previewTier,
}: {
  lessonId: number;
  previewTier?: number;
}) {
  const done = completedTiers(lessonId);
  const cur = currentTierIndex(lessonId);
  const preview = previewTier;

  const W = 420;
  const H = 240;
  const bottomPad = 26;
  const rowH = (H - bottomPad - 10) / 6;
  const centerX = W / 2;
  const topHalfWidth = 28;
  const bottomHalfWidth = 180;

  const rows = [];
  for (let i = 0; i < 6; i++) {
    // Row 0 = top (Tier 6). Row 5 = bottom (Tier 1).
    const tierIdx = 5 - i;
    const progress = i / 5;
    const halfW = topHalfWidth + (bottomHalfWidth - topHalfWidth) * progress;
    const y = 10 + i * rowH;
    const x = centerX - halfW;
    const width = halfW * 2;
    const isDone = done[tierIdx];
    const isPreview = preview === tierIdx;
    const isCurrent = cur === tierIdx;
    rows.push(
      <g key={tierIdx}>
        <rect
          x={x}
          y={y}
          width={width}
          height={rowH - 3}
          fill={
            isDone
              ? TIER_COLORS[tierIdx]
              : isPreview
              ? "#FFEBBF"
              : "#FAF6EF"
          }
          stroke="#2A1E14"
          strokeWidth={2}
          opacity={isDone || isPreview || isCurrent ? 1 : 0.55}
        />
        <text
          x={centerX}
          y={y + rowH / 2}
          textAnchor="middle"
          dominantBaseline="central"
          fontFamily="Georgia, serif"
          fontStyle="italic"
          fontWeight={900}
          fontSize={Math.min(rowH * 0.6, 14)}
          fill="#2A1E14"
        >
          {TIER_NAMES[tierIdx]}
        </text>
      </g>
    );
  }
  return (
    <div style={{ position: "relative", width: W, maxWidth: "100%" }}>
      <svg viewBox={`0 0 ${W} ${H}`} width="100%" style={{ display: "block" }}>
        {rows}
      </svg>
    </div>
  );
}

// ---------- CelebrationCard ------------------------------------------------

function CelebrationCard({ lesson }: { lesson: LessonV2 }) {
  const kind = lesson.is_graduation
    ? "GRADUATION"
    : lesson.is_tier_boss
    ? `TIER ${lesson.completion?.tier_complete ?? currentTierIndex(lesson.id) + 1} COMPLETE`
    : lesson.is_mid_boss
    ? "MID-BOSS"
    : lesson.is_act_boss
    ? `ACT ${lesson.act} COMPLETE`
    : "COMPLETE";
  const icon = lesson.is_graduation ? "🏆" : lesson.is_tier_boss || lesson.is_mid_boss ? "👑" : "🎯";
  const bg = lesson.is_graduation
    ? "linear-gradient(135deg, #FDE68A 0%, #E8A93C 100%)"
    : lesson.is_tier_boss || lesson.is_mid_boss
    ? "linear-gradient(135deg, #FFEBBF 0%, #FFD987 100%)"
    : "linear-gradient(135deg, #FEF3C7 0%, #FCD34D 100%)";
  return (
    <div
      style={{
        width: "100%",
        maxWidth: 420,
        background: bg,
        border: "3px solid #2A1E14",
        borderRadius: 18,
        boxShadow: "0 6px 0 #2A1E14",
        padding: "28px 24px",
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        gap: 12,
      }}
    >
      <div style={{ fontSize: 72, lineHeight: 1 }}>{icon}</div>
      <div
        style={{
          fontSize: 11,
          letterSpacing: "0.3em",
          fontWeight: 900,
          color: "#78350f",
        }}
      >
        {kind}
      </div>
      <div
        style={{
          fontFamily: "Georgia, serif",
          fontStyle: "italic",
          fontWeight: 900,
          fontSize: 26,
          color: "#2A1E14",
          textAlign: "center",
          lineHeight: 1.1,
        }}
      >
        {lesson.title}
      </div>
      {lesson.piece?.title && (
        <div
          style={{
            fontFamily: "Georgia, serif",
            fontStyle: "italic",
            fontSize: 14,
            color: "#4A3A28",
          }}
        >
          {lesson.piece.title}
        </div>
      )}
    </div>
  );
}

// ---------- CleffyScene ----------------------------------------------------

function CleffyScene({ mood = "happy", caption }: { mood?: "happy" | "excited" | "thinking" | "waving"; caption?: string }) {
  return (
    <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 12 }}>
      <Cleffy size={110} mood={mood} />
      {caption && (
        <div
          style={{
            fontFamily: "Georgia, serif",
            fontStyle: "italic",
            fontSize: 14,
            color: "#4A3A28",
            textAlign: "center",
            maxWidth: 380,
          }}
        >
          {caption}
        </div>
      )}
    </div>
  );
}

// ---------- Helpers --------------------------------------------------------

function isBlackMidi(m: number): boolean {
  return [1, 3, 6, 8, 10].includes(m % 12);
}
/** Extract MIDI numbers from a page.highlights record, sorted ascending. */
function pageHighlightMidis(page: LessonPage): number[] {
  const h = page.highlights || {};
  return Object.keys(h)
    .map(Number)
    .filter((n) => Number.isFinite(n))
    .sort((a, b) => a - b);
}

// ---------- KeyboardMini ---------------------------------------------------
//
// Mini SVG keyboard that highlights the relevant keys for a figure. Used
// for figures that mention keyboards/keys/black keys/groups.
function KeyboardMini({
  page,
  startMidi = 48,
  endMidi = 84,
}: {
  page: LessonPage;
  startMidi?: number;
  endMidi?: number;
}) {
  const fig = (page.figure || "").toLowerCase();

  // Audio→visual pulse: same event we wire into PianoKeyboard. When the
  // lesson plays a note, this small figure piano lights up that key for
  // a moment too, so the student sees what's playing in BOTH the bottom
  // and the figure-area pianos at once. Velocity-aware: louder hits get
  // a brighter, longer flash.
  const [audioPulses, setAudioPulses] = React.useState<Map<number, number>>(
    new Map()
  );
  React.useEffect(() => {
    function onPulse(e: Event) {
      const detail = (e as CustomEvent).detail as
        | { midi?: number; velocity?: number }
        | undefined;
      const m = detail?.midi;
      if (typeof m !== "number" || !Number.isFinite(m)) return;
      const v =
        typeof detail?.velocity === "number" ? detail.velocity : 0.7;
      setAudioPulses((prev) => {
        const next = new Map(prev);
        next.set(m, v);
        return next;
      });
      const hold = 280 + Math.round(v * 200);
      window.setTimeout(() => {
        setAudioPulses((prev) => {
          if (!prev.has(m)) return prev;
          const next = new Map(prev);
          next.delete(m);
          return next;
        });
      }, hold);
    }
    window.addEventListener("sonata:key-pulse", onPulse);
    return () => window.removeEventListener("sonata:key-pulse", onPulse);
  }, []);

  // Pick highlighted keys: explicit highlights first; else infer from figure text.
  let highlighted = pageHighlightMidis(page);
  if (highlighted.length === 0) {
    if (/\b2[-\s]?group/.test(fig)) {
      // Highlight one C# / D# pair in the middle range
      highlighted = [61, 63];
    } else if (/\b3[-\s]?group/.test(fig)) {
      highlighted = [66, 68, 70];
    } else if (/\bblack\b/.test(fig) && !/white/.test(fig)) {
      // Highlight all black keys in range
      for (let m = startMidi; m <= endMidi; m++) {
        if (isBlackMidi(m)) highlighted.push(m);
      }
    }
  }
  // Range expansion when figure says "low" / "high" / "full"
  let lo = startMidi;
  let hi = endMidi;
  if (/\bfull\b/.test(fig)) {
    lo = 24; hi = 96;
  } else if (highlighted.length > 0) {
    lo = Math.min(lo, Math.max(24, Math.min(...highlighted) - 5));
    hi = Math.max(hi, Math.min(96, Math.max(...highlighted) + 5));
  }
  // Snap to white-key boundaries
  while (isBlackMidi(lo)) lo--;
  while (isBlackMidi(hi)) hi++;

  // Collect white keys
  const whites: number[] = [];
  for (let m = lo; m <= hi; m++) if (!isBlackMidi(m)) whites.push(m);
  const W = 360;
  const H = 110;
  const keyW = W / whites.length;
  const blackW = keyW * 0.62;
  const blackH = H * 0.62;

  // Optional arrow labels for "low" / "high" pointers
  const showArrows = /\blow\b/.test(fig) && /\bhigh\b/.test(fig);

  return (
    <div style={{ width: "100%", maxWidth: W, position: "relative" }}>
      {showArrows && (
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            fontFamily: "Georgia, serif",
            fontStyle: "italic",
            fontSize: 12,
            color: "#4A3A28",
            marginBottom: 4,
          }}
        >
          <span>← low</span>
          <span>high →</span>
        </div>
      )}
      <svg viewBox={`0 0 ${W} ${H}`} width="100%" style={{ display: "block" }}>
        {/* White keys */}
        {whites.map((m, i) => {
          const x = i * keyW;
          const isHi = highlighted.includes(m);
          const pulseVel = audioPulses.get(m);
          const isPulsing = pulseVel != null;
          const pulseStrength = pulseVel ?? 0.7;
          const isC = m % 12 === 0;
          return (
            <g key={`w${m}`}>
              <rect
                x={x}
                y={0}
                width={keyW - 1}
                height={H}
                fill={
                  isPulsing
                    ? "#fbbf24"
                    : isHi
                    ? "#E8A93C"
                    : "#FAFAF6"
                }
                fillOpacity={isPulsing ? Math.max(0.4, Math.min(1, 0.4 + pulseStrength * 0.6)) : 1}
                stroke="#1f2937"
                strokeWidth={isPulsing ? 2 : 1}
                rx={2}
                style={{
                  transition: "fill 0.15s, fill-opacity 0.15s, stroke-width 0.15s",
                }}
              />
              {isC && (
                <text
                  x={x + keyW / 2}
                  y={H - 8}
                  textAnchor="middle"
                  fontSize={9}
                  fontFamily="var(--mono, monospace)"
                  fill="#666"
                >
                  C{Math.floor(m / 12) - 1}
                </text>
              )}
            </g>
          );
        })}
        {/* Black keys */}
        {whites.map((m, i) => {
          const nb = m + 1;
          if (nb > hi || !isBlackMidi(nb)) return null;
          const x = (i + 1) * keyW - blackW / 2;
          const isHi = highlighted.includes(nb);
          const isPulsing = audioPulses.has(nb);
          return (
            <rect
              key={`b${nb}`}
              x={x}
              y={0}
              width={blackW}
              height={blackH}
              fill={
                isPulsing
                  ? "#fbbf24"
                  : isHi
                  ? "#E8A93C"
                  : "#1f2937"
              }
              stroke="#0a0a0a"
              strokeWidth={1}
              rx={1.5}
              style={{
                transition: "fill 0.15s",
              }}
            />
          );
        })}
      </svg>
    </div>
  );
}

// ---------- StaffMini ------------------------------------------------------
//
// SVG staff renderer. Treble clef by default; switches to bass when the
// figure mentions bass/grand staff. Notes drawn from page.highlights or
// from interaction.keys/sequence.

// MIDI → staff line/space position. We treat the bottom line of the treble
// staff as MIDI E4 (64), step = 1 staff position (line or space) per
// diatonic step.
const SCALE_DEGREE: Record<number, number> = {
  0: 0, 2: 1, 4: 2, 5: 3, 7: 4, 9: 5, 11: 6,
  // Sharps/flats inherit their natural's position; we'll render an accidental glyph.
  1: 0, 3: 1, 6: 3, 8: 4, 10: 5,
};
function midiToStaffPos(m: number, clef: "treble" | "bass"): {
  pos: number;
  accidental: "" | "#" | "b";
} {
  // pos = 0 means bottom line of staff; +1 per line/space upward.
  const refMidi = clef === "treble" ? 64 : 43; // E4 / G2
  const refOctaveDiatonic = clef === "treble" ? 4 : 2;
  const pc = m % 12;
  const oct = Math.floor(m / 12) - 1;
  const deg = SCALE_DEGREE[pc] ?? 0;
  const refDeg = SCALE_DEGREE[refMidi % 12];
  const pos = (oct - refOctaveDiatonic) * 7 + (deg - refDeg);
  const accidental = pc === 1 || pc === 3 || pc === 6 || pc === 8 || pc === 10 ? "#" : "";
  return { pos, accidental };
}

function StaffMini({ page }: { page: LessonPage }) {
  const fig = (page.figure || "").toLowerCase();
  const wantsBass = /bass\s+(staff|clef)|\bbass\b(?!\sclef)/.test(fig) && !/treble/.test(fig);
  const wantsGrand = /grand\s+staff/.test(fig);
  const clef: "treble" | "bass" = wantsBass ? "bass" : "treble";

  // Notes: from highlights, fallback to interaction sequence/keys
  let midis: number[] = pageHighlightMidis(page);
  if (midis.length === 0) {
    const it = page.interaction as unknown as { keys?: string[]; sequence?: unknown[] } | undefined;
    if (it) {
      if (Array.isArray(it.keys)) {
        midis = it.keys
          .map(noteStringToMidi)
          .filter((m): m is number => m != null);
      } else if (Array.isArray(it.sequence)) {
        for (const item of it.sequence) {
          const strs = typeof item === "string" ? [item] : Array.isArray(item) ? (item as string[]) : [];
          for (const s of strs) {
            const m = noteStringToMidi(s);
            if (m != null) midis.push(m);
          }
        }
      }
    }
  }

  const W = 360;
  const lineSpacing = 8;
  const staffH = lineSpacing * 4;
  const padY = 20;
  const H = wantsGrand ? padY * 2 + staffH * 2 + lineSpacing * 4 : padY * 2 + staffH;
  const staffYTop = padY;
  const bassYTop = wantsGrand ? padY + staffH + lineSpacing * 4 : padY;

  function drawStaff(yTop: number) {
    const lines: React.ReactElement[] = [];
    for (let i = 0; i < 5; i++) {
      const y = yTop + i * lineSpacing;
      lines.push(
        <line
          key={`line${yTop}-${i}`}
          x1={20}
          x2={W - 10}
          y1={y}
          y2={y}
          stroke="#1f2937"
          strokeWidth={1}
        />
      );
    }
    return lines;
  }

  function clefGlyph(clefType: "treble" | "bass", yTop: number) {
    const x = 26;
    const y = yTop + staffH / 2 + 6;
    return (
      <text
        x={x}
        y={y}
        fontSize={clefType === "treble" ? 36 : 28}
        fontFamily="serif"
        fontWeight={700}
        fill="#1f2937"
      >
        {clefType === "treble" ? "𝄞" : "𝄢"}
      </text>
    );
  }

  function noteCircle(
    midi: number,
    xCenter: number,
    clefType: "treble" | "bass",
    yTop: number
  ): React.ReactElement {
    const { pos, accidental } = midiToStaffPos(midi, clefType);
    // pos 0 = bottom line; staff has 5 lines (positions 0..8 top of top line).
    // y = yTop + (8 - pos) * (lineSpacing/2)  — wait: top line is pos 8.
    // Bottom line MIDI E4 at pos 0 → y = yTop + staffH (= bottom). Top line F5 at pos 8 → y = yTop.
    const y = yTop + staffH - (pos * lineSpacing) / 2;
    const r = 4.5;
    const els: React.ReactElement[] = [];
    // Ledger lines if pos < -1 or pos > 9
    if (pos <= -1) {
      for (let p = -2; p >= pos; p -= 2) {
        const yy = yTop + staffH - (p * lineSpacing) / 2;
        els.push(
          <line
            key={`ledger-${midi}-${p}`}
            x1={xCenter - r - 3}
            x2={xCenter + r + 3}
            y1={yy}
            y2={yy}
            stroke="#1f2937"
            strokeWidth={1}
          />
        );
      }
    }
    if (pos >= 10) {
      for (let p = 10; p <= pos; p += 2) {
        const yy = yTop + staffH - (p * lineSpacing) / 2;
        els.push(
          <line
            key={`ledger-${midi}-${p}`}
            x1={xCenter - r - 3}
            x2={xCenter + r + 3}
            y1={yy}
            y2={yy}
            stroke="#1f2937"
            strokeWidth={1}
          />
        );
      }
    }
    if (accidental) {
      els.push(
        <text
          key={`acc-${midi}-${xCenter}`}
          x={xCenter - 10}
          y={y + 3}
          fontSize={10}
          fontFamily="serif"
          fontWeight={700}
          fill="#1f2937"
        >
          {accidental}
        </text>
      );
    }
    els.push(
      <ellipse
        key={`note-${midi}-${xCenter}`}
        cx={xCenter}
        cy={y}
        rx={r + 1}
        ry={r - 0.5}
        fill="#E8A93C"
        stroke="#1f2937"
        strokeWidth={1.2}
        transform={`rotate(-15 ${xCenter} ${y})`}
      />
    );
    return <g key={`grp-${midi}-${xCenter}`}>{els}</g>;
  }

  // Notes laid out evenly between x=70 and W-20
  const x0 = 70;
  const x1 = W - 30;
  const noteList = midis.length > 0 ? midis : [];
  const step = noteList.length > 0 ? (x1 - x0) / Math.max(1, noteList.length) : 0;

  return (
    <div style={{ width: "100%", maxWidth: W }}>
      <svg viewBox={`0 0 ${W} ${H}`} width="100%" style={{ display: "block" }}>
        {drawStaff(staffYTop)}
        {clefGlyph(clef, staffYTop)}
        {wantsGrand && drawStaff(bassYTop)}
        {wantsGrand && clefGlyph("bass", bassYTop)}
        {noteList.map((m, i) => {
          const xCenter = x0 + step * (i + 0.5);
          const useBass = wantsGrand ? m < 60 : clef === "bass";
          return noteCircle(m, xCenter, useBass ? "bass" : "treble", useBass ? bassYTop : staffYTop);
        })}
      </svg>
    </div>
  );
}

function noteStringToMidi(s: string): number | null {
  const m = s.match(/^([A-Ga-g])(#|b)?(\d)$/);
  if (!m) return null;
  const pcMap: Record<string, number> = { C: 0, D: 2, E: 4, F: 5, G: 7, A: 9, B: 11 };
  const pc = pcMap[m[1].toUpperCase()];
  const acc = m[2] === "#" ? 1 : m[2] === "b" ? -1 : 0;
  const oct = parseInt(m[3], 10);
  return (oct + 1) * 12 + pc + acc;
}

// ---------- HandDiagram ----------------------------------------------------

function HandDiagram({ page }: { page: LessonPage }) {
  const fig = (page.figure || "").toLowerCase();
  const showLeft = /\bleft\s*hand|\blh\b|both\s*hands?/.test(fig) || !/\bright\s*hand|\brh\b/.test(fig);
  const showRight = /\bright\s*hand|\brh\b|both\s*hands?/.test(fig) || !/\bleft\s*hand|\blh\b/.test(fig);
  // Pull out a finger number if mentioned ("finger 1", "thumb", "5/pinky")
  let highlightFinger: number | null = null;
  const numMatch = fig.match(/finger\s*(\d)/);
  if (numMatch) highlightFinger = parseInt(numMatch[1], 10);
  else if (/\bthumb\b/.test(fig)) highlightFinger = 1;
  else if (/\bpointer|index\b/.test(fig)) highlightFinger = 2;
  else if (/\bmiddle\s+finger|long\s+finger\b/.test(fig)) highlightFinger = 3;
  else if (/\bring\s+finger\b/.test(fig)) highlightFinger = 4;
  else if (/\bpinky\b|\blittle\s+finger\b/.test(fig)) highlightFinger = 5;

  function Hand({ side, x }: { side: "L" | "R"; x: number }) {
    // Five circles in a row, finger numbers labelled. Left hand: 5..1; right: 1..5.
    const numbers = side === "L" ? [5, 4, 3, 2, 1] : [1, 2, 3, 4, 5];
    return (
      <g transform={`translate(${x},20)`}>
        <text
          x={70}
          y={-4}
          textAnchor="middle"
          fontSize={11}
          fontWeight={800}
          fontFamily="sans-serif"
          fill="#1f2937"
        >
          {side === "L" ? "Left hand" : "Right hand"}
        </text>
        {numbers.map((n, i) => {
          const cx = 14 + i * 28;
          const isHi = highlightFinger === n;
          return (
            <g key={`${side}-${n}`}>
              <circle
                cx={cx}
                cy={26}
                r={12}
                fill={isHi ? "#E8A93C" : "#FAFAF6"}
                stroke="#1f2937"
                strokeWidth={1.5}
              />
              <text
                x={cx}
                y={30}
                textAnchor="middle"
                fontSize={12}
                fontWeight={800}
                fontFamily="sans-serif"
                fill="#1f2937"
              >
                {n}
              </text>
            </g>
          );
        })}
      </g>
    );
  }

  const W = showLeft && showRight ? 320 : 160;
  const H = 70;
  return (
    <svg viewBox={`0 0 ${W} ${H}`} width="100%" style={{ maxWidth: W, display: "block" }}>
      {showLeft && <Hand side="L" x={0} />}
      {showRight && <Hand side="R" x={showLeft ? 160 : 0} />}
    </svg>
  );
}

// ---------- RhythmDisplay --------------------------------------------------

function RhythmDisplay({ page }: { page: LessonPage }) {
  const fig = (page.figure || "").toLowerCase();
  // Extract time signature ("4/4", "3/4", "2/4", "6/8")
  const ts = fig.match(/(\d)\s*\/\s*(\d)/);
  const beats = ts ? parseInt(ts[1], 10) : 4;
  // Detect note durations mentioned
  const durs: { label: string; beats: number }[] = [];
  if (/whole/.test(fig)) durs.push({ label: "whole", beats: 4 });
  if (/half/.test(fig)) durs.push({ label: "half", beats: 2 });
  if (/quarter/.test(fig)) durs.push({ label: "quarter", beats: 1 });
  if (/eighth/.test(fig)) durs.push({ label: "eighth", beats: 0.5 });

  if (durs.length > 0) {
    // Note-duration chart
    const W = 320;
    const rowH = 32;
    const H = durs.length * rowH + 12;
    return (
      <svg viewBox={`0 0 ${W} ${H}`} width="100%" style={{ maxWidth: W, display: "block" }}>
        {durs.map((d, i) => {
          const y = 6 + i * rowH;
          const barW = (d.beats / 4) * (W - 90);
          return (
            <g key={d.label}>
              <text
                x={6}
                y={y + rowH / 2 + 4}
                fontSize={12}
                fontWeight={700}
                fontFamily="sans-serif"
                fill="#1f2937"
              >
                {d.label}
              </text>
              <rect
                x={80}
                y={y + 4}
                width={barW}
                height={rowH - 12}
                fill="#E8A93C"
                stroke="#1f2937"
                strokeWidth={1.5}
                rx={4}
              />
              <text
                x={80 + barW + 6}
                y={y + rowH / 2 + 4}
                fontSize={11}
                fontFamily="sans-serif"
                fill="#4A3A28"
              >
                {d.beats} beat{d.beats === 1 ? "" : "s"}
              </text>
            </g>
          );
        })}
      </svg>
    );
  }

  // Default: time-signature beat boxes
  const W = 320;
  const H = 60;
  const boxW = (W - 20) / beats;
  return (
    <svg viewBox={`0 0 ${W} ${H}`} width="100%" style={{ maxWidth: W, display: "block" }}>
      <text
        x={10}
        y={18}
        fontSize={11}
        fontWeight={800}
        fontFamily="sans-serif"
        fill="#1f2937"
      >
        {beats}/{ts ? ts[2] : 4} time
      </text>
      {Array.from({ length: beats }, (_, i) => {
        const x = 10 + i * boxW;
        return (
          <g key={i}>
            <rect
              x={x}
              y={26}
              width={boxW - 4}
              height={28}
              fill="#FAFAF6"
              stroke="#1f2937"
              strokeWidth={1.5}
              rx={3}
            />
            <text
              x={x + (boxW - 4) / 2}
              y={45}
              textAnchor="middle"
              fontSize={13}
              fontWeight={800}
              fontFamily="sans-serif"
              fill="#1f2937"
            >
              {i + 1}
            </text>
          </g>
        );
      })}
    </svg>
  );
}

// ---------- QuizScaffold ---------------------------------------------------
//
// Renders the UI scaffolding of drill/quiz pages described in figure text:
// "banner", "round counter 1 of 4", "play button", "two play buttons",
// "two answer buttons", etc. Some lessons describe interaction UI in the
// figure rather than just the lesson content — we show the scaffolding
// inline so the student sees what's coming.
function QuizScaffold({ figure }: { figure: string }) {
  const fig = figure.toLowerCase();
  const banner = /^banner|\bbanner\b/.test(fig);
  const bannerNote = banner
    ? (fig.match(/banner\s*[—\-:]\s*([^.]+)/) || [])[1]?.trim()
    : null;
  const roundCounter = fig.match(/(\d+)\s+rounds?|round\s+counter[^\d]*(\d+)\s+of\s+(\d+)/);
  const totalRounds = roundCounter
    ? parseInt(roundCounter[1] || roundCounter[3] || "4", 10)
    : null;
  const playBtnCount = (() => {
    if (/three play(back)?\s+(buttons?|cards?)/.test(fig)) return 3;
    if (/two play(back)?\s+(buttons?|cards?)/.test(fig)) return 2;
    if (/play\s+(button|card)/.test(fig)) return 1;
    return 0;
  })();
  const answerCount = (() => {
    if (/two\s+answer/.test(fig)) return 2;
    if (/three\s+answer/.test(fig)) return 3;
    if (/four\s+answer/.test(fig)) return 4;
    return 0;
  })();

  return (
    <div
      style={{
        width: "100%",
        maxWidth: 380,
        display: "flex",
        flexDirection: "column",
        gap: 10,
      }}
    >
      {banner && (
        <div
          style={{
            background: "linear-gradient(90deg, #FDE68A, #FCD34D)",
            border: "2px solid #1f2937",
            borderRadius: 10,
            padding: "8px 14px",
            textAlign: "center",
            fontFamily: "Georgia, serif",
            fontStyle: "italic",
            fontWeight: 800,
            fontSize: 13,
            color: "#2A1E14",
            letterSpacing: "0.05em",
          }}
        >
          {bannerNote ? bannerNote : "Quick check"}
        </div>
      )}
      {totalRounds != null && (
        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            gap: 6,
          }}
        >
          {Array.from({ length: totalRounds }).map((_, i) => (
            <div
              key={i}
              style={{
                width: 10,
                height: 10,
                borderRadius: "50%",
                border: "2px solid #1f2937",
                background: i === 0 ? "#E8A93C" : "#FAFAF6",
              }}
            />
          ))}
          <span
            style={{
              fontSize: 11,
              fontWeight: 700,
              color: "#4A3A28",
              marginLeft: 4,
            }}
          >
            {totalRounds} rounds
          </span>
        </div>
      )}
      {playBtnCount > 0 && (
        <div
          style={{
            display: "flex",
            justifyContent: "center",
            gap: 8,
          }}
        >
          {Array.from({ length: playBtnCount }).map((_, i) => (
            <div
              key={i}
              style={{
                background: "#E8A93C",
                border: "2px solid #1f2937",
                borderRadius: 999,
                padding: "8px 16px",
                fontWeight: 800,
                fontSize: 13,
                color: "#2A1E14",
                display: "flex",
                alignItems: "center",
                gap: 6,
              }}
            >
              ♪ {playBtnCount > 1 ? String.fromCharCode(65 + i) : "Play"}
            </div>
          ))}
        </div>
      )}
      {answerCount > 0 && (
        <div
          style={{
            display: "flex",
            flexDirection: "column",
            gap: 6,
          }}
        >
          {Array.from({ length: answerCount }).map((_, i) => (
            <div
              key={i}
              style={{
                border: "2px solid #1f2937",
                borderRadius: 10,
                padding: "8px 12px",
                background: "#FAFAF6",
                fontFamily: "sans-serif",
                fontSize: 12,
                color: "#4A3A28",
                textAlign: "center",
              }}
            >
              {String.fromCharCode(65 + i)}
            </div>
          ))}
        </div>
      )}
      {/* If we couldn't detect any specific scaffold piece, fall through. */}
      {!banner && totalRounds == null && playBtnCount === 0 && answerCount === 0 && (
        <GenericFigureCard figure={figure} />
      )}
    </div>
  );
}

// ---------- GenericFigureCard ----------------------------------------------

function GenericFigureCard({ figure }: { figure: string }) {
  return (
    <div
      style={{
        width: "100%",
        maxWidth: 420,
        background: "var(--parchment, #faf6ef)",
        border: "2px dashed #1f2937",
        borderRadius: 14,
        padding: "16px 18px",
        display: "flex",
        flexDirection: "column",
        gap: 8,
      }}
    >
      <div
        style={{
          fontSize: 10,
          letterSpacing: "0.2em",
          fontWeight: 800,
          color: "#6b7280",
        }}
      >
        FIGURE
      </div>
      <div
        style={{
          fontFamily: "Georgia, serif",
          fontStyle: "italic",
          fontSize: 14,
          lineHeight: 1.45,
          color: "#1f2937",
          whiteSpace: "pre-line",
        }}
      >
        {figure}
      </div>
    </div>
  );
}

// ---------- Router ---------------------------------------------------------

/**
 * Always true when the page has a figure description. The router below
 * picks an appropriate visual; nothing is text-only any more.
 *
 * When `hasKeyboardNotes` is true we still show the figure panel — many
 * keyboard pages have additional context (staff, hands, beat boxes) the
 * bottom piano alone doesn't communicate.
 */
export function hasRenderedFigure(
  _lesson: LessonV2,
  page: LessonPage,
  // Kept for API parity — every page with a figure now renders.
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  _hasKeyboardNotes: boolean
): boolean {
  return !!(page.figure && page.figure.trim().length > 0);
}

/**
 * Decide which visual to render for this page.
 * Returns a React node sized for the figure panel.
 */
export function FigureRouter({
  lesson,
  page,
  pageIdx,
}: {
  lesson: LessonV2;
  page: LessonPage;
  pageIdx: number;
  /** Kept in the props interface for parity; the decision to show the figure
      panel at all is made upstream by hasRenderedFigure. */
  hasKeyboardNotes?: boolean;
}) {
  const fig = page.figure || "";
  const isFirstPage = pageIdx === 0;
  // The figure text alone often misses obvious clues — Cleffy's narration
  // says "stairs" or "Middle C" etc. while the figure description is
  // generic ("a postcard", "notes side by side"). Combine both for
  // keyword matching so far fewer pages fall through to the plain text
  // GenericFigureCard.
  const cleffyText =
    [page.cleffy, page.completion_cleffy, page.followup_cleffy]
      .filter(Boolean)
      .join(" ");
  const combined = `${fig} ${cleffyText}`;

  // 1) Graduation / tier-boss / mid-boss / act-boss — wrap page gets a celebration card.
  if (
    page.type === "wrap" &&
    (lesson.is_graduation || lesson.is_tier_boss || lesson.is_mid_boss || lesson.is_act_boss)
  ) {
    return <CelebrationCard lesson={lesson} />;
  }

  // 2) Reflection or whats_next → pyramid
  if (page.type === "reflection" || page.type === "reflection_tier_1" || page.type === "reflection_tier_2" || page.type === "reflection_tier_3" || page.type === "reflection_tier_4" || page.type === "reflection_tier_5" || page.type === "reflection_tier_6") {
    return <Pyramid lessonId={lesson.id} />;
  }
  if (page.type === "whats_next" || page.type === "whats_next_life_after") {
    return <Pyramid lessonId={lesson.id} previewTier={Math.min(currentTierIndex(lesson.id) + 1, 5)} />;
  }
  if (hasKeyword(combined, "pyramid")) {
    const preview = hasKeyword(combined, "preview") ? Math.min(currentTierIndex(lesson.id) + 1, 5) : undefined;
    return <Pyramid lessonId={lesson.id} previewTier={preview} />;
  }

  // 3) Staircase when figure OR cleffy text talks about stairs / stepping.
  // Many lesson figures use "Step up", "Step down", "Going up", "Moves up"
  // — they're talking about ascending/descending motion which our
  // staircase metaphor visualises perfectly.
  if (
    hasKeyword(
      combined,
      "staircase",
      "stairs",
      "stair",
      "step up",
      "step down",
      "stepping up",
      "stepping down",
      "step going up",
      "step going down",
      "going up",
      "going down",
      "moves up",
      "moves down",
      "ascending",
      "descending",
      "another step",
      "one step",
      "two step",
      "three step"
    )
  ) {
    const steps = /(\d{1,2})\s*(stairs|steps)/i.exec(combined)?.[1];
    const parsed = steps ? parseInt(steps, 10) : 10;
    return (
      <Staircase
        steps={Math.max(3, Math.min(parsed, 30))}
        cleffyOnTop={hasKeyword(fig, "cleffy")}
        cleffyMood={hasKeyword(fig, "top") || hasKeyword(fig, "trophy") ? "excited" : "happy"}
      />
    );
  }

  // 4) Hook page (first page) — friendly Cleffy greeting (no raw figure text).
  if (page.type === "hook" || (isFirstPage && hasKeyword(fig, "cleffy"))) {
    return <CleffyScene mood="waving" />;
  }

  // 5) Wrap / celebration keywords on non-boss pages. Also catches the
  // "Postcard — Lesson N" pattern that wraps almost every lesson.
  if (
    hasKeyword(combined, "celebration", "trophy", "complete", "confetti", "you did it", "well done", "postcard") ||
    page.type === "wrap"
  ) {
    return <CelebrationCard lesson={lesson} />;
  }

  // 6) Hand / finger diagrams
  if (hasKeyword(combined, "finger", "thumb", "pinky", "hand", "palm")) {
    return <HandDiagram page={page} />;
  }

  // 7) Rhythm / time-signature / note-duration figures
  if (
    hasKeyword(
      combined,
      "metronome",
      "time signature",
      "beat",
      "tempo",
      "whole note",
      "half note",
      "quarter note",
      "eighth note",
      "dotted",
      "rhythm",
      "4/4",
      "3/4",
      "2/4",
      "6/8"
    )
  ) {
    return <RhythmDisplay page={page} />;
  }

  // 8) Staff / clef / notation figures — widened bag. Many lesson
  // YAMLs say things like "Two notes — both on lines, one line apart"
  // or "line → next space up" or "Three pairs of notes" — none of
  // which mention "staff" but are clearly notation. Catch the common
  // notation vocabulary so these render properly instead of falling
  // through to plain text.
  if (
    hasKeyword(
      combined,
      "staff",
      "clef",
      "treble",
      "bass clef",
      "grand staff",
      "ledger",
      "notation",
      "music line",
      "five lines",
      "five-line",
      "line note",
      "space note",
      "lines and spaces",
      "on a line",
      "in a space",
      "on the line",
      "in the space",
      "between two lines",
      "lines or spaces",
      "line to space",
      "space to line",
      "line to line",
      "space to space",
      "line \u2192", // line →
      "space \u2192", // space →
      "pair of notes",
      "pairs of notes",
      "two notes",
      "three notes",
      "four notes",
      "five notes",
      "line 1",
      "line 2",
      "line 3",
      "line 4",
      "line 5",
      "space 1",
      "space 2",
      "space 3",
      "space 4",
      "leap"
    ) ||
    /\bphrase\s*\d?:/i.test(combined) ||           // "Phrase 2: D-E-G"
    /\bline\s*\d:/i.test(combined) ||              // "Line 2: G G A G"
    /\b[A-G]-[A-G]-[A-G]\b/.test(combined)         // "C-D-E", "D-E-G"
  ) {
    return <StaffMini page={page} />;
  }

  // 9) Keyboard / piano / black-key figures — wide net so anything that
  // mentions keys, notes by letter, or note groups lands on the keyboard
  // mini-render rather than falling through to plain text.
  if (
    hasKeyword(
      combined,
      "keyboard",
      "piano",
      "black-key",
      "black key",
      "white key",
      "white-key",
      "2-group",
      "3-group",
      "two-group",
      "three-group",
      "middle c",
      "the keys",
      "tap any",
      "play any",
      "press any",
      "any white",
      "any black",
      "row:",     // "A row: A B C D E F G"
      "alphabet"
    ) ||
    /\b[A-G](?:[#b])?[1-7]\b/.test(combined) || // explicit pitch like C4, F#5
    /\b(C|D|E|F|G|A|B) (key|note|chord|major|minor)\b/i.test(combined) ||
    /\b[A-G]\s+[A-G]\s+[A-G]\b/.test(combined) || // "A B C", "C D E"
    /\b[A-G][#b]?[0-9]?-[A-G][#b]?[0-9]?-[A-G][#b]?[0-9]?\b/.test(combined) || // "C-D-E", "C3-D3-E3"
    /\b(LH|RH|left hand|right hand)\b/i.test(combined) || // hand-position figures
    pageHighlightMidis(page).length > 0
  ) {
    return <KeyboardMini page={page} />;
  }

  // 10) Quiz / drill scaffolding — banner, round counter, play buttons,
  //     answer chips. Used for see/hear-section quiz pages.
  if (
    hasKeyword(
      combined,
      "banner",
      "round counter",
      "rounds",
      "play button",
      "play buttons",
      "playback button",
      "playback buttons",
      "playback card",
      "playback cards",
      "answer button",
      "answer buttons",
      "round 1",
      "round counter"
    )
  ) {
    return <QuizScaffold figure={page.figure || ""} />;
  }

  // 11) Defaults by page mode/type — better than dropping to plain text.
  // Any play page should show the keyboard. Hear pages with no other
  // signal probably involve listening to a note, so also keyboard.
  if (page.mode === "play" || page.mode === "hear") {
    return <KeyboardMini page={page} />;
  }

  // 12) Final fallback — stylised description card. Always renders
  //     something so the student can read what the figure should show.
  return <GenericFigureCard figure={page.figure || ""} />;
}

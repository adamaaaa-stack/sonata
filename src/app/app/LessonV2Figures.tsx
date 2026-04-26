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
  const cleffyText = (
    (page.cleffy || "") +
    " " +
    (page.followup_cleffy || "") +
    " " +
    (page.completion_cleffy || "")
  ).toLowerCase();
  const combined = fig + " " + cleffyText;
  const wantsBass = /bass\s+(staff|clef)|\bbass\b(?!\sclef)/.test(combined) && !/treble/.test(combined);
  const wantsGrand = /grand\s+staff/.test(combined);
  const clef: "treble" | "bass" = wantsBass ? "bass" : "treble";

  // Notes: from highlights, fallback to interaction sequence/keys, then
  // try to extract from the figure text itself ("note in space 3", "on
  // line 2", "two notes — line, then next space up", "line → space",
  // letter sequences like "C-D-E" or "G G A G").
  let midis: number[] = pageHighlightMidis(page);
  // Track positions described by line-number / space-number text — these
  // get drawn at the right staff slot rather than at a specific pitch.
  const positions: { line?: number; space?: number }[] = [];
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
  // Extract pitches from letter sequences in figure text:
  //   "Phrase 2: D-E-G"      → D4, E4, G4
  //   "Line 2: G G A G D C"  → G4, G4, A4, G4, D4, C4
  //   "C-D-E, then D-E-F"    → C4, D4, E4 (first three)
  //   "E, B, E, G#"          → E4, B4, E4, G#4
  if (midis.length === 0) {
    const original = (page.figure || "") + " " + (page.cleffy || "");
    const tokens = original
      .split(/[\s,/|]+/)
      .map((t) => t.trim())
      .filter((t) => /^[A-Ga-g][#♯♭b]?[0-9]?$/.test(t));
    if (tokens.length >= 2) {
      const parsed = tokens
        .map((t) => {
          // Default octave 4; if no octave digit, append.
          const norm = /\d$/.test(t) ? t : t + "4";
          return noteStringToMidi(
            norm
              .replace("♯", "#")
              .replace("♭", "b")
              .replace(/^([a-g])/, (_, c) => c.toUpperCase())
          );
        })
        .filter((m): m is number => m != null);
      // Sanity: only adopt if we got at least 2 notes that are in a
      // reasonable musical range, to avoid picking up "A row..." or
      // single-letter prose.
      if (parsed.length >= 2 && parsed.length <= 12) {
        midis = parsed;
      }
    }
  }
  // Extract from figure text — "note in space 3", "on line 2", etc.
  if (midis.length === 0) {
    const lineMatches = Array.from(
      combined.matchAll(/\bline\s*([1-5])\b/g)
    ).map((m) => Number(m[1]));
    const spaceMatches = Array.from(
      combined.matchAll(/\bspace\s*([1-4])\b/g)
    ).map((m) => Number(m[1]));
    for (const ln of lineMatches) {
      if (ln >= 1 && ln <= 5) positions.push({ line: ln });
    }
    for (const sp of spaceMatches) {
      if (sp >= 1 && sp <= 4) positions.push({ space: sp });
    }
    // Patterns like "line → line", "line → space", "space → line",
    // "space → space" that don't have explicit numbers — pick
    // representative positions.
    if (positions.length === 0) {
      if (/line\s*(?:→|->|to|then\s+next?)\s*line/.test(combined)) {
        positions.push({ line: 2 }, { line: 3 });
      } else if (/line\s*(?:→|->|to|then\s+next?)\s*space/.test(combined)) {
        positions.push({ line: 2 }, { space: 2 });
      } else if (/space\s*(?:→|->|to|then\s+next?)\s*space/.test(combined)) {
        positions.push({ space: 2 }, { space: 3 });
      } else if (/space\s*(?:→|->|to|then\s+next?)\s*line/.test(combined)) {
        positions.push({ space: 2 }, { line: 3 });
      } else if (/(both\s+on\s+lines?|two\s+notes?\s+(?:on|both\s+on)\s+lines?)/.test(combined)) {
        positions.push({ line: 2 }, { line: 3 });
      } else if (/(both\s+in\s+spaces?|two\s+notes?\s+in\s+spaces?)/.test(combined)) {
        positions.push({ space: 2 }, { space: 3 });
      } else if (/note\s+on\s+a\s+line/.test(combined) && !midis.length) {
        positions.push({ line: 3 });
      } else if (/note\s+in\s+a\s+space/.test(combined) && !midis.length) {
        positions.push({ space: 2 });
      }
    }
  }

  // Sizing — bigger and more readable than the previous tiny staff. The
  // original was 360px wide with 8px line spacing, hence the "tiny
  // staff" complaint. Bumped to 480x180 with 16px spacing and a chunky
  // clef so the figure is the centerpiece of the page, not a footnote.
  const W = 480;
  const lineSpacing = 16;
  const staffH = lineSpacing * 4;
  const padY = 40;
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
    const x = 28;
    const y = yTop + staffH / 2 + lineSpacing * 0.9;
    return (
      <text
        x={x}
        y={y}
        fontSize={clefType === "treble" ? lineSpacing * 4.6 : lineSpacing * 3.4}
        fontFamily="serif"
        fontWeight={700}
        fill="#1f2937"
      >
        {clefType === "treble" ? "𝄞" : "𝄢"}
      </text>
    );
  }

  /** Draw a notehead at a given line/space position (1 = bottom line,
   *  5 = top line; spaces are between). Used for figure-text-derived
   *  positions where we don't know the actual pitch. */
  function noteAtPosition(
    pos: { line?: number; space?: number },
    xCenter: number,
    yTop: number,
    isLineHi: boolean
  ): React.ReactElement {
    let y: number;
    if (pos.line) {
      y = yTop + staffH - (pos.line - 1) * lineSpacing;
    } else if (pos.space) {
      // space N is between line N and line N+1
      y = yTop + staffH - (pos.space - 0.5) * lineSpacing;
    } else {
      y = yTop + staffH / 2;
    }
    const r = lineSpacing * 0.55;
    return (
      <ellipse
        key={`pn-${xCenter}-${pos.line ?? "L"}-${pos.space ?? "S"}`}
        cx={xCenter}
        cy={y}
        rx={r + 1.5}
        ry={r * 0.85}
        fill={isLineHi ? "#16a34a" : "#E8A93C"}
        stroke="#1f2937"
        strokeWidth={1.6}
        transform={`rotate(-15 ${xCenter} ${y})`}
      />
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

  // Notes laid out evenly between x=100 and W-30. Use whichever source
  // produced content — explicit MIDI list, or text-derived positions.
  const x0 = 100;
  const x1 = W - 30;
  const items: ({ kind: "midi"; midi: number } | { kind: "pos"; pos: { line?: number; space?: number } })[] =
    midis.length > 0
      ? midis.map((m) => ({ kind: "midi" as const, midi: m }))
      : positions.map((p) => ({ kind: "pos" as const, pos: p }));
  const step =
    items.length > 0 ? (x1 - x0) / Math.max(1, items.length) : 0;

  return (
    <div style={{ width: "100%", maxWidth: W }}>
      <svg viewBox={`0 0 ${W} ${H}`} width="100%" style={{ display: "block" }}>
        {drawStaff(staffYTop)}
        {clefGlyph(clef, staffYTop)}
        {wantsGrand && drawStaff(bassYTop)}
        {wantsGrand && clefGlyph("bass", bassYTop)}
        {items.map((it, i) => {
          const xCenter = x0 + step * (i + 0.5);
          if (it.kind === "midi") {
            const useBass = wantsGrand ? it.midi < 60 : clef === "bass";
            return noteCircle(
              it.midi,
              xCenter,
              useBass ? "bass" : "treble",
              useBass ? bassYTop : staffYTop
            );
          }
          // Tint position-derived notes by line vs space so the staff
          // figure VISUALLY communicates the difference between line
          // and space notes (the whole point of lesson 13).
          const isLine = it.pos.line != null;
          return noteAtPosition(it.pos, xCenter, staffYTop, isLine);
        })}
        {/* Tiny labels under the staff for line/space figures so the
            student knows which slot each note is in. */}
        {items.length > 0 &&
          items.every((x) => x.kind === "pos") &&
          items.map((it, i) => {
            if (it.kind !== "pos") return null;
            const xCenter = x0 + step * (i + 0.5);
            const label = it.pos.line
              ? `line ${it.pos.line}`
              : it.pos.space
              ? `space ${it.pos.space}`
              : "";
            if (!label) return null;
            return (
              <text
                key={`lbl-${i}`}
                x={xCenter}
                y={staffYTop + staffH + lineSpacing * 1.4}
                textAnchor="middle"
                fontSize={lineSpacing * 0.7}
                fontFamily="Georgia, serif"
                fontStyle="italic"
                fill="#4b5563"
              >
                {label}
              </text>
            );
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

// ---------- MusicSymbolCard ------------------------------------------------
//
// Catches dynamics / accidentals / articulation figures. These are common
// throughout the curriculum but don't map to staff or keyboard renderers
// — they're music-theory glyphs the student needs to visually recognise.
// Pulls a SYMBOL out of the figure text (or infers one from keywords) and
// renders it large with a description chip underneath.

const DYNAMICS_GLYPHS: Record<string, { glyph: string; meaning: string }> = {
  ppp:  { glyph: "𝆺𝆺𝆺", meaning: "as soft as you can" },
  pp:   { glyph: "𝆺𝆺",  meaning: "very soft" },
  p:    { glyph: "𝆏",    meaning: "soft" },
  mp:   { glyph: "𝆐𝆏",   meaning: "moderately soft" },
  mf:   { glyph: "𝆐𝆑",   meaning: "moderately loud" },
  f:    { glyph: "𝆑",    meaning: "loud" },
  ff:   { glyph: "𝆑𝆑",   meaning: "very loud" },
  fff:  { glyph: "𝆑𝆑𝆑",  meaning: "as loud as you can" },
};

const ACCIDENTAL_GLYPHS: Record<string, { glyph: string; meaning: string }> = {
  sharp:   { glyph: "♯", meaning: "raises a note by a half-step" },
  flat:    { glyph: "♭", meaning: "lowers a note by a half-step" },
  natural: { glyph: "♮", meaning: "cancels a sharp or flat" },
};

const ARTICULATION_GLYPHS: Record<string, { glyph: string; meaning: string }> = {
  staccato: { glyph: "·",  meaning: "short, detached" },
  legato:   { glyph: "⌒", meaning: "smooth, connected" },
  tenuto:   { glyph: "—", meaning: "held for full value" },
  accent:   { glyph: ">", meaning: "play this note louder" },
  marcato:  { glyph: "^", meaning: "marked, sharply emphasised" },
  slur:     { glyph: "⌒", meaning: "smooth phrase across notes" },
  tie:      { glyph: "‿", meaning: "extends the same pitch" },
};

interface MusicSymbol {
  kind: "dynamics" | "accidental" | "articulation";
  glyph: string;
  label: string;
  meaning: string;
  /** Optional second line (e.g. CRESCENDO arrow direction). */
  arrow?: "open-right" | "open-left";
}

function detectMusicSymbol(text: string): MusicSymbol | null {
  const lower = text.toLowerCase();
  const trimmed = text.trim();

  // ─── Articulation FIRST (so "Note with a > above" matches accent
  // before the bare-< / > dynamics catch below) ──────────────────────
  if (/\bupward wedge\b|\bwedge\b/i.test(text)) {
    return { kind: "articulation", glyph: "^", label: "Marcato", meaning: ARTICULATION_GLYPHS.marcato.meaning };
  }
  if (/\bflat dash\b|\bdash above\b|\btenuto\b/i.test(text)) {
    return { kind: "articulation", glyph: "—", label: "Tenuto", meaning: ARTICULATION_GLYPHS.tenuto.meaning };
  }
  if (/\bdot above\b|\bstaccato\b/i.test(text)) {
    return { kind: "articulation", glyph: "·", label: "Staccato", meaning: ARTICULATION_GLYPHS.staccato.meaning };
  }
  if (/note with a >\s*above|>\s*accent|\baccent\b/i.test(text)) {
    return { kind: "articulation", glyph: ">", label: "Accent", meaning: ARTICULATION_GLYPHS.accent.meaning };
  }
  if (/\b(slur|tie|legato|marcato)\b/i.test(text)) {
    for (const [name, def] of Object.entries(ARTICULATION_GLYPHS)) {
      if (new RegExp(`\\b${name}\\b`, "i").test(text)) {
        return {
          kind: "articulation",
          glyph: def.glyph,
          label: name.charAt(0).toUpperCase() + name.slice(1),
          meaning: def.meaning,
        };
      }
    }
  }
  if (/curved line arching|joined by curve|slurs over/i.test(text)) {
    return {
      kind: "articulation",
      glyph: "⌒",
      label: "Slur",
      meaning: "smooth phrase across notes",
    };
  }

  // ─── Italian tempo / expression markings ──────────────────────────
  // These are word-symbols the student needs to recognise (Allegro,
  // Adagio, Rubato, etc). Render them as a music-symbol card with the
  // word as the "glyph" so it gets the same big treatment as a forte
  // marking.
  const italian = [
    ["allegro", "fast and lively"],
    ["andante", "walking pace"],
    ["adagio", "slow"],
    ["lento", "slow, drawn out"],
    ["presto", "very fast"],
    ["moderato", "moderate"],
    ["vivace", "lively"],
    ["rubato", "freely, with flexible time"],
    ["subito", "suddenly"],
    ["dolce", "sweetly"],
    ["legato", "smooth, connected"],
    ["staccato", "short, detached"],
  ] as const;
  for (const [word, meaning] of italian) {
    if (new RegExp(`\\b${word}\\b`, "i").test(text)) {
      return {
        kind: "dynamics",
        glyph: word.charAt(0).toUpperCase() + word.slice(1),
        label: word.charAt(0).toUpperCase() + word.slice(1),
        meaning: meaning,
      };
    }
  }
  // "sub. p" / "subito p"
  {
    const m = /\b(sub\.?|subito)\s*(pp|p|mp|mf|f|ff|fff)\b/i.exec(text);
    if (m) {
      const def = DYNAMICS_GLYPHS[m[2].toLowerCase() as keyof typeof DYNAMICS_GLYPHS];
      if (def) {
        return {
          kind: "dynamics",
          glyph: `sub. ${def.glyph}`,
          label: `Subito ${m[2].toUpperCase()}`,
          meaning: `suddenly ${def.meaning}`,
        };
      }
    }
  }

  // ─── Dynamics ──────────────────────────────────────────────────────
  // "Dynamic marking: pp" — explicit "Dynamic marking:" prefix
  {
    const m = /dynamic\s+marking:?\s*(ppp|pp|p|mp|mf|f|ff|fff)\b/i.exec(text);
    if (m) {
      const name = m[1].toLowerCase() as keyof typeof DYNAMICS_GLYPHS;
      const def = DYNAMICS_GLYPHS[name];
      if (def) return { kind: "dynamics", glyph: def.glyph, label: m[1].toUpperCase(), meaning: def.meaning };
    }
  }
  // "Hairpin < followed by mf followed by >" — pick the prominent mid value
  if (/hairpin\s+<.*mf|mf.*>/i.test(text)) {
    return { kind: "dynamics", glyph: DYNAMICS_GLYPHS.mf.glyph, label: "MF", meaning: DYNAMICS_GLYPHS.mf.meaning };
  }
  // Hairpins — full keyword OR a bare-glyph figure (e.g. just "<" or ">").
  if (
    /\bcrescendo\b|hairpin opening|opens right/i.test(text) ||
    trimmed === "<"
  ) {
    return {
      kind: "dynamics",
      glyph: "<",
      label: "Crescendo",
      meaning: "get louder",
      arrow: "open-right",
    };
  }
  if (
    /\bdiminuendo\b|decrescendo|hairpin closing|closes right/i.test(text) ||
    trimmed === ">"
  ) {
    return {
      kind: "dynamics",
      glyph: ">",
      label: "Diminuendo",
      meaning: "get softer",
      arrow: "open-left",
    };
  }
  // <-=- pattern with "louder" / ">- ... softer" pattern
  if (/<\s*=.*louder|opens.*louder/i.test(text)) {
    return { kind: "dynamics", glyph: "<", label: "Crescendo", meaning: "get louder", arrow: "open-right" };
  }
  if (/>\s*=.*softer|closes.*softer/i.test(text)) {
    return { kind: "dynamics", glyph: ">", label: "Diminuendo", meaning: "get softer", arrow: "open-left" };
  }
  // Iterate longer keys first so "ppp" is tested before "pp" before "p".
  const dynamicsOrdered = Object.entries(DYNAMICS_GLYPHS).sort(
    (a, b) => b[0].length - a[0].length
  );
  for (const [name, def] of dynamicsOrdered) {
    const re = new RegExp(
      `\\b${name}\\b(?:\\s+marking|\\s+at\\s+start|$|\\s|[.,]|\\s+with)`,
      "i"
    );
    if (re.test(text)) {
      return { kind: "dynamics", glyph: def.glyph, label: name.toUpperCase(), meaning: def.meaning };
    }
  }
  // "Phrase 3 with f" / "Phrase N with mf" — surface the dynamic.
  {
    const m = /phrase\s*\d?\s*(?:with|at|in|labeled?)\s+(ppp|pp|p|mp|mf|f|ff|fff)\b/i.exec(text);
    if (m) {
      const name = m[1].toLowerCase() as keyof typeof DYNAMICS_GLYPHS;
      const def = DYNAMICS_GLYPHS[name];
      if (def) {
        return { kind: "dynamics", glyph: def.glyph, label: m[1].toUpperCase(), meaning: def.meaning };
      }
    }
  }

  // ─── Accidentals ──────────────────────────────────────────────────
  // Note + accidental glyph alone, e.g. "F♯", "B♭", "F♮"
  if (/^\s*[A-G][♯♭♮#b]\s*$/.test(trimmed)) {
    if (/♯|#/.test(trimmed)) return { kind: "accidental", glyph: "♯", label: "Sharp", meaning: ACCIDENTAL_GLYPHS.sharp.meaning };
    if (/♭/.test(trimmed) || /b$/.test(trimmed)) return { kind: "accidental", glyph: "♭", label: "Flat", meaning: ACCIDENTAL_GLYPHS.flat.meaning };
    if (/♮/.test(trimmed)) return { kind: "accidental", glyph: "♮", label: "Natural", meaning: ACCIDENTAL_GLYPHS.natural.meaning };
  }
  // "Bar 1: F#." / "Bar 2: F (no symbol)." → accidental display
  if (/\bbar\s*\d:.*[A-G]\s*[♯♭♮#b]?/i.test(text)) {
    if (/♯|#/.test(text)) return { kind: "accidental", glyph: "♯", label: "Sharp", meaning: ACCIDENTAL_GLYPHS.sharp.meaning };
    if (/♭/.test(text)) return { kind: "accidental", glyph: "♭", label: "Flat", meaning: ACCIDENTAL_GLYPHS.flat.meaning };
    if (/♮/.test(text)) return { kind: "accidental", glyph: "♮", label: "Natural", meaning: ACCIDENTAL_GLYPHS.natural.meaning };
    return { kind: "accidental", glyph: "♮", label: "Natural", meaning: ACCIDENTAL_GLYPHS.natural.meaning };
  }
  // "Three accidentals" / "Three accidentals lined up"
  if (/\baccidentals?\b/i.test(lower)) {
    return { kind: "accidental", glyph: "♯ ♭ ♮", label: "Accidentals", meaning: "sharp, flat, and natural" };
  }
  if (/\b#\b|\bsharps?\b|♯/i.test(lower) && /symbol|sign|mark|accidental|key|signature|close-up|tic-tac-toe/i.test(lower)) {
    return { kind: "accidental", glyph: "♯", label: "Sharp", meaning: ACCIDENTAL_GLYPHS.sharp.meaning };
  }
  if (/♭|\bflat\b/i.test(lower) && /symbol|sign|mark|accidental|key|signature|close-up|lowercase b/i.test(lower)) {
    return { kind: "accidental", glyph: "♭", label: "Flat", meaning: ACCIDENTAL_GLYPHS.flat.meaning };
  }
  if (/♮|\bnatural\b/i.test(lower) && /symbol|sign|mark|accidental|close-up|small rectangle/i.test(lower)) {
    return { kind: "accidental", glyph: "♮", label: "Natural", meaning: ACCIDENTAL_GLYPHS.natural.meaning };
  }
  if (/\bkey signature\b/i.test(lower)) {
    return { kind: "accidental", glyph: "♯ / ♭", label: "Key signature", meaning: "sharps or flats at the start of every line" };
  }

  return null;
}

function MusicSymbolCard({ symbol, figure }: { symbol: MusicSymbol; figure: string }) {
  const accent =
    symbol.kind === "dynamics"
      ? "#c45a8a"
      : symbol.kind === "accidental"
      ? "#1f2937"
      : "#15803d";
  return (
    <div
      style={{
        width: "100%",
        maxWidth: 420,
        background: "var(--parchment, #faf6ef)",
        border: `3px solid ${accent}`,
        borderRadius: 18,
        padding: "20px 22px 22px",
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        gap: 10,
        boxShadow: `0 4px 0 ${accent}40`,
      }}
    >
      <div
        style={{
          fontSize: 11,
          letterSpacing: "0.22em",
          fontWeight: 800,
          color: accent,
          textTransform: "uppercase",
        }}
      >
        {symbol.kind}
      </div>
      <div
        style={{
          fontFamily: "Georgia, serif",
          fontWeight: 900,
          fontSize: 96,
          color: accent,
          lineHeight: 0.9,
          textShadow: "0 2px 0 rgba(0,0,0,0.05)",
        }}
      >
        {symbol.glyph}
      </div>
      <div
        style={{
          fontFamily: "Georgia, serif",
          fontStyle: "italic",
          fontSize: 22,
          fontWeight: 800,
          color: "var(--ink, #1f2937)",
        }}
      >
        {symbol.label}
      </div>
      <div
        style={{
          fontFamily: "Georgia, serif",
          fontSize: 14,
          color: "var(--ink2, #4b5563)",
          textAlign: "center",
          maxWidth: 320,
        }}
      >
        {symbol.meaning}
      </div>
      <div
        style={{
          fontSize: 11,
          color: "var(--ink3, #6b7280)",
          textAlign: "center",
          fontStyle: "italic",
          maxWidth: 360,
          marginTop: 4,
        }}
      >
        {figure}
      </div>
    </div>
  );
}

// ---------- PhraseCard ------------------------------------------------------
//
// Renders figures that reference a famous melody (Ode to Joy, Für Elise,
// Jingle Bells, etc.) as a music-themed badge with the title prominent.

const FAMOUS_MELODIES = [
  "ode to joy",
  "für elise",
  "fur elise",
  "jingle bells",
  "amazing grace",
  "canon in d",
  "minuet in g",
  "twinkle twinkle",
  "twinkle, twinkle",
  "happy birthday",
  "moonlight sonata",
  "clair de lune",
  "mary had a little lamb",
  "hot cross buns",
  "row your boat",
  "frère jacques",
  "frere jacques",
  "london bridge",
];

function detectMelodyReference(text: string): string | null {
  const lower = text.toLowerCase();
  for (const m of FAMOUS_MELODIES) {
    if (lower.includes(m)) {
      // Title-case the matched name
      return m
        .split(" ")
        .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
        .join(" ");
    }
  }
  return null;
}

function PhraseCard({ title, figure }: { title: string; figure: string }) {
  return (
    <div
      style={{
        width: "100%",
        maxWidth: 440,
        background: "var(--parchment, #faf6ef)",
        border: "3px solid var(--berry, #c45a8a)",
        borderRadius: 18,
        padding: "20px 22px",
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        gap: 10,
        boxShadow: "0 4px 0 var(--berry, #c45a8a)40",
      }}
    >
      <div
        style={{
          fontSize: 11,
          letterSpacing: "0.22em",
          fontWeight: 800,
          color: "var(--berry, #c45a8a)",
          textTransform: "uppercase",
        }}
      >
        ♪ Melody
      </div>
      <div
        style={{
          fontFamily: "Georgia, serif",
          fontStyle: "italic",
          fontWeight: 900,
          fontSize: 32,
          color: "var(--ink, #1f2937)",
          textAlign: "center",
          lineHeight: 1.15,
          letterSpacing: "-0.01em",
        }}
      >
        {title}
      </div>
      <div
        style={{
          fontSize: 13,
          color: "var(--ink2, #4b5563)",
          textAlign: "center",
          fontStyle: "italic",
          maxWidth: 360,
        }}
      >
        {figure}
      </div>
    </div>
  );
}

// ---------- ContourCard ----------------------------------------------------
//
// Visualises a melody's shape (rising, falling, arch, wavy) as a simple
// SVG contour line. Used when the figure says things like "Arch melody"
// or "Melody that goes up and comes back down".

type Contour = "rising" | "falling" | "arch" | "valley" | "wavy" | "flat";

function detectContour(text: string): Contour | null {
  const lower = text.toLowerCase();
  if (/wavy|zigzag|up-down-up-down|rolling/.test(lower)) return "wavy";
  if (/arch|arched|goes up.*comes back down|rises then falls/.test(lower)) return "arch";
  if (/valley|dips|goes down.*comes back up|falls then rises/.test(lower)) return "valley";
  if (/rising|going up only|climbs|ascending melody|melody.*up\b(?!.*down)/.test(lower)) return "rising";
  if (/falling|going down only|descending melody|melody.*down\b(?!.*up)/.test(lower)) return "falling";
  if (/flat melody|stays flat|same note repeated/.test(lower)) return "flat";
  return null;
}

function ContourCard({ contour, figure }: { contour: Contour; figure: string }) {
  // Generate a small SVG path for the contour
  const W = 260;
  const H = 90;
  const path = (() => {
    switch (contour) {
      case "rising":
        return `M 10 ${H - 12} L ${W - 10} 14`;
      case "falling":
        return `M 10 14 L ${W - 10} ${H - 12}`;
      case "arch":
        return `M 10 ${H - 12} Q ${W / 2} 0 ${W - 10} ${H - 12}`;
      case "valley":
        return `M 10 14 Q ${W / 2} ${H} ${W - 10} 14`;
      case "wavy":
        return `M 10 ${H / 2} Q ${W / 4} 4, ${W / 2} ${H / 2} T ${W - 10} ${H / 2}`;
      case "flat":
        return `M 10 ${H / 2} L ${W - 10} ${H / 2}`;
    }
  })();
  const label =
    contour === "rising"
      ? "Rising"
      : contour === "falling"
      ? "Falling"
      : contour === "arch"
      ? "Arch"
      : contour === "valley"
      ? "Valley"
      : contour === "wavy"
      ? "Wavy"
      : "Flat";
  return (
    <div
      style={{
        width: "100%",
        maxWidth: 380,
        background: "var(--parchment, #faf6ef)",
        border: "3px solid var(--gold, #d4a853)",
        borderRadius: 18,
        padding: "16px 20px",
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        gap: 8,
        boxShadow: "0 4px 0 var(--gold, #d4a853)40",
      }}
    >
      <div
        style={{
          fontSize: 11,
          letterSpacing: "0.22em",
          fontWeight: 800,
          color: "var(--berry, #c45a8a)",
        }}
      >
        MELODY SHAPE — {label.toUpperCase()}
      </div>
      <svg viewBox={`0 0 ${W} ${H}`} width="100%" style={{ maxWidth: W }}>
        <path
          d={path}
          stroke="var(--ink, #1f2937)"
          strokeWidth={3}
          fill="none"
          strokeLinecap="round"
        />
        {/* Tiny note dots along the contour */}
        {[0, 0.25, 0.5, 0.75, 1].map((t, i) => {
          const x = 10 + t * (W - 20);
          let y = H / 2;
          switch (contour) {
            case "rising": y = (H - 12) - t * (H - 26); break;
            case "falling": y = 14 + t * (H - 26); break;
            case "arch": y = (H - 12) - 4 * t * (1 - t) * (H - 26); break;
            case "valley": y = 14 + 4 * t * (1 - t) * (H - 26); break;
            case "wavy": y = H / 2 - Math.sin(t * Math.PI * 2) * (H / 3); break;
            case "flat": y = H / 2; break;
          }
          return (
            <circle
              key={i}
              cx={x}
              cy={y}
              r={4}
              fill="var(--berry, #c45a8a)"
              stroke="var(--ink, #1f2937)"
              strokeWidth={1.5}
            />
          );
        })}
      </svg>
      <div
        style={{
          fontSize: 12,
          fontStyle: "italic",
          color: "var(--ink2, #4b5563)",
          textAlign: "center",
          maxWidth: 320,
        }}
      >
        {figure}
      </div>
    </div>
  );
}

// ---------- OrnamentCard ---------------------------------------------------
//
// Renders ornament symbols — trill, mordent, turn, grace note. These
// appear all through the late-curriculum "ornaments" arc but each has
// a distinct symbol the student needs to recognise.

const ORNAMENT_GLYPHS: Record<string, { glyph: string; label: string; meaning: string }> = {
  trill:      { glyph: "𝆖", label: "Trill",      meaning: "rapid alternation between two notes" },
  mordent:    { glyph: "𝆟", label: "Mordent",    meaning: "quick dip below the main note and back" },
  turn:       { glyph: "𝆗", label: "Turn",       meaning: "decorate the note: above, main, below, main" },
  grace:      { glyph: "♬", label: "Grace note", meaning: "a tiny note that leans into the main note" },
  appoggiatura: { glyph: "♬", label: "Appoggiatura", meaning: "leaning grace note that takes its time from the main note" },
  glissando:  { glyph: "𝆲", label: "Glissando",  meaning: "slide between two notes" },
};

function detectOrnament(text: string): { glyph: string; label: string; meaning: string } | null {
  const lower = text.toLowerCase();
  if (/\btrill\b|\btr\.?\b/.test(lower)) return ORNAMENT_GLYPHS.trill;
  if (/\bmordent\b/.test(lower)) return ORNAMENT_GLYPHS.mordent;
  if (/\bturn\b/.test(lower) && /symbol|ornament|squiggle/.test(lower)) return ORNAMENT_GLYPHS.turn;
  if (/\bgrace note\b|\bgrace notes?\b/.test(lower)) return ORNAMENT_GLYPHS.grace;
  if (/\bappoggiatura\b/.test(lower)) return ORNAMENT_GLYPHS.appoggiatura;
  if (/\bglissando\b|\bgliss\b|\bslide\b/.test(lower)) return ORNAMENT_GLYPHS.glissando;
  return null;
}

function OrnamentCard({
  ornament,
  figure,
}: {
  ornament: { glyph: string; label: string; meaning: string };
  figure: string;
}) {
  return (
    <div
      style={{
        width: "100%",
        maxWidth: 420,
        background: "var(--parchment, #faf6ef)",
        border: "3px solid #6b21a8",
        borderRadius: 18,
        padding: "20px 22px 22px",
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        gap: 10,
        boxShadow: "0 4px 0 #6b21a840",
      }}
    >
      <div
        style={{
          fontSize: 11,
          letterSpacing: "0.22em",
          fontWeight: 800,
          color: "#6b21a8",
          textTransform: "uppercase",
        }}
      >
        Ornament
      </div>
      <div
        style={{
          fontFamily: "Georgia, serif",
          fontWeight: 900,
          fontSize: 88,
          color: "#6b21a8",
          lineHeight: 0.9,
        }}
      >
        {ornament.glyph}
      </div>
      <div
        style={{
          fontFamily: "Georgia, serif",
          fontStyle: "italic",
          fontSize: 22,
          fontWeight: 800,
          color: "var(--ink, #1f2937)",
        }}
      >
        {ornament.label}
      </div>
      <div
        style={{
          fontFamily: "Georgia, serif",
          fontSize: 14,
          color: "var(--ink2, #4b5563)",
          textAlign: "center",
          maxWidth: 320,
        }}
      >
        {ornament.meaning}
      </div>
      <div
        style={{
          fontSize: 11,
          color: "var(--ink3, #6b7280)",
          textAlign: "center",
          fontStyle: "italic",
          maxWidth: 360,
          marginTop: 4,
        }}
      >
        {figure}
      </div>
    </div>
  );
}

// ---------- ComparisonCard ------------------------------------------------
//
// Renders side-by-side comparison figures. Lots of mastery questions
// look like "Side by side: A and B", "Two staves — one with X, one with
// Y", "Split image: X vs Y". Pull the two halves out of the description
// and render them as labelled chips with a "vs" divider.

interface ComparisonHalves {
  left: string;
  right: string;
}

function detectComparison(text: string): ComparisonHalves | null {
  // "Side by side: A and B" / "Side by side. Left: A. Right: B"
  let m = /side by side[:.,\s]+left:\s*([^.\n]{1,80}?)\.\s*right:\s*([^.\n]{1,80}?)(?:\.|$)/i.exec(text);
  if (m) return { left: m[1].trim(), right: m[2].trim() };

  m = /side by side:?\s*([^\n]{1,60}?)\s+(?:and|vs\.?|versus)\s+([^\n.]{1,60}?)(?:\.|$)/i.exec(text);
  if (m) return { left: m[1].trim(), right: m[2].trim() };

  // "Split image: X vs Y" / "Split image: X and Y"
  m = /split image:?\s*([^\n]{1,60}?)\s+(?:vs\.?|versus|and|then)\s+([^\n.]{1,60}?)(?:\.|$)/i.exec(text);
  if (m) return { left: m[1].trim(), right: m[2].trim() };

  // "Two staves — one with X, one with Y" / "Two pillars — one cracking, one holding"
  m = /two\s+(?:staves|voices|phrases|recordings|versions|melodies|cars|sentences|short phrases|pillars|clocks|illustrations|panels|cards|trills|chords|images|panes)[\s—,:-]+(?:one\s+(?:with|that|labeled?)\s+)?([^\n.,]{3,60}?)(?:\s*[,.]\s*|\s+(?:and|then|vs\.?)\s+)(?:one\s+(?:with|that|labeled?)\s+)?([^\n.]{3,60}?)(?:\.|$)/i.exec(
    text
  );
  if (m) return { left: m[1].trim(), right: m[2].trim() };

  // "X vs Y" or "Today's texture vs yesterday's"
  m = /^([^.,]{3,60})\s+vs\.?\s+([^.,\n]{3,60})/i.exec(text.trim());
  if (m) return { left: m[1].trim(), right: m[2].trim() };

  return null;
}

function ComparisonCard({
  halves,
  figure,
}: {
  halves: ComparisonHalves;
  figure: string;
}) {
  return (
    <div
      style={{
        width: "100%",
        maxWidth: 460,
        background: "var(--parchment, #faf6ef)",
        border: "3px solid var(--berry, #c45a8a)",
        borderRadius: 18,
        padding: 18,
        display: "flex",
        flexDirection: "column",
        gap: 12,
        boxShadow: "0 4px 0 var(--berry, #c45a8a)40",
      }}
    >
      <div
        style={{
          fontSize: 11,
          letterSpacing: "0.22em",
          fontWeight: 800,
          color: "var(--berry, #c45a8a)",
          textAlign: "center",
        }}
      >
        COMPARE
      </div>
      <div
        style={{
          display: "flex",
          alignItems: "stretch",
          gap: 12,
        }}
      >
        {[halves.left, halves.right].map((side, i) => (
          <React.Fragment key={i}>
            <div
              style={{
                flex: 1,
                background: "var(--cream, #fff8ee)",
                border: "2px solid var(--ink, #1f2937)",
                borderRadius: 12,
                padding: "14px 12px",
                display: "flex",
                flexDirection: "column",
                alignItems: "center",
                justifyContent: "center",
                textAlign: "center",
                fontFamily: "Georgia, serif",
                fontStyle: "italic",
                fontSize: 14,
                lineHeight: 1.4,
                color: "var(--ink, #1f2937)",
                minHeight: 70,
              }}
            >
              <div
                style={{
                  fontSize: 9,
                  fontWeight: 800,
                  letterSpacing: "0.2em",
                  color: "var(--ink3, #6b7280)",
                  marginBottom: 4,
                  fontFamily: "var(--sans, system-ui)",
                  fontStyle: "normal",
                }}
              >
                {i === 0 ? "LEFT" : "RIGHT"}
              </div>
              {side}
            </div>
            {i === 0 && (
              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  fontSize: 14,
                  fontWeight: 900,
                  color: "var(--berry, #c45a8a)",
                  fontFamily: "Georgia, serif",
                  fontStyle: "italic",
                }}
              >
                vs
              </div>
            )}
          </React.Fragment>
        ))}
      </div>
      <div
        style={{
          fontSize: 11,
          color: "var(--ink3, #6b7280)",
          textAlign: "center",
          fontStyle: "italic",
          marginTop: 2,
        }}
      >
        {figure}
      </div>
    </div>
  );
}

// ---------- SectionMapCard ------------------------------------------------
//
// Renders bar/section structure figures like "Three boxes labeled A, B, A"
// or "Bars 1-6: CLIMB. Bars 7-9: PEAK. Bars 10-12: SETTLE". Drawn as
// labelled coloured bars stacked horizontally — same metaphor as the
// timeline-of-bars used in form/structure lessons.

interface SectionEntry {
  label: string;
  detail?: string;
  width?: number; // relative
}

function detectSectionMap(text: string): SectionEntry[] | null {
  // Pattern A: "Three boxes labeled A, B, A" / "Three pillars — X, Y, Z"
  // Match a count word + a section noun + an em-dash or "labeled/with/:"
  // followed by a comma-separated list. Cover lots of section nouns
  // because content uses metaphors freely.
  let m = /(?:three|four|five|six|seven|eight)\s+(?:boxes|panels|bars|cards|columns|rows|chunks|parts|pillars|dials|sections|regions|dots|bullets|points|panes|tiles|chips|slices)\s*(?:[—:-]+|\s+(?:labeled|labelled|with|—))\s*([^.\n]+)/i.exec(
    text
  );
  if (m) {
    const labels = m[1]
      .split(/[,/|]+|\s+(?:and|then)\s+/i)
      .map((s) => s.trim())
      .filter((s) => s.length > 0 && s.length < 30);
    if (labels.length >= 2 && labels.length <= 8) {
      return labels.map((l) => ({ label: l }));
    }
  }
  // Pattern A2: "X-section map with A, B, C labels"
  m = /(?:three|four|five|six|seven|eight)?\s*(?:section|piece)\s+(?:map|roadmap)\s+(?:with|of|—|:)\s+([^.\n]+?)\s*labels?\b/i.exec(
    text
  );
  if (m) {
    const labels = m[1]
      .split(/[,/|]+|\s+(?:and|then)\s+/i)
      .map((s) => s.trim())
      .filter((s) => s.length > 0 && s.length < 30);
    if (labels.length >= 2 && labels.length <= 8) {
      return labels.map((l) => ({ label: l }));
    }
  }
  // Pattern A3: "Six markings in a column: pp, p, mp, mf, f, ff"
  m = /(?:two|three|four|five|six|seven|eight)\s+(?:markings|notes|chords|symbols|items)\s+in\s+a\s+(?:column|row|line)\s*[:—]\s*([^.\n]+)/i.exec(
    text
  );
  if (m) {
    const labels = m[1]
      .split(/[,/|]+|\s+(?:and|then)\s+/i)
      .map((s) => s.trim())
      .filter((s) => s.length > 0 && s.length < 30);
    if (labels.length >= 2 && labels.length <= 8) {
      return labels.map((l) => ({ label: l }));
    }
  }
  // Pattern A4: "Piece map. A (12 bars, pp), B (8 bars, pp), CLIMAX (...)"
  if (/\bpiece map\b|\bgrieg arietta map\b|\b(?:tier|act)\s+\d+\s+(?:roadmap|map)\b/i.test(text)) {
    const sections: SectionEntry[] = [];
    const re = /\b([A-Z][A-Za-z'’ ]{0,12}?)\s*\(([^)]+)\)/g;
    let bm: RegExpExecArray | null;
    while ((bm = re.exec(text)) !== null) {
      sections.push({ label: bm[1].trim(), detail: bm[2].trim() });
      if (sections.length >= 8) break;
    }
    if (sections.length >= 2) return sections;
  }

  // Pattern B: "Bars 1-6: X. Bars 7-9: Y. Bars 10-12: Z."
  const sections: SectionEntry[] = [];
  const re = /bars?\s+(\d+)\s*[-–to]+\s*(\d+)\s*[:,—]\s*([^.\n]{1,60}?)(?=[.,;\n]|bars?\s+\d|$)/gi;
  let bm: RegExpExecArray | null;
  while ((bm = re.exec(text)) !== null) {
    const start = parseInt(bm[1], 10);
    const end = parseInt(bm[2], 10);
    sections.push({
      label: `${start}–${end}`,
      detail: bm[3].trim(),
      width: Math.max(1, end - start + 1),
    });
  }
  if (sections.length >= 2) return sections;

  // Pattern C: "Three colored bars stacked — X, Y, Z" / "Three regions"
  m = /(three|four|five|six)\s+(?:colored|colour(?:ed)?)?\s*bars?\s+(?:stacked\s*)?[—:]+\s*([^.\n]+)/i.exec(text);
  if (m) {
    const labels = m[2]
      .split(/[,/|]+|\s+(?:and|then)\s+/i)
      .map((s) => s.trim())
      .filter((s) => s.length > 0 && s.length < 30);
    if (labels.length >= 2 && labels.length <= 8) {
      return labels.map((l) => ({ label: l }));
    }
  }

  return null;
}

function SectionMapCard({
  sections,
  figure,
}: {
  sections: SectionEntry[];
  figure: string;
}) {
  const palette = ["#d4a853", "#c45a8a", "#22c55e", "#3b82f6", "#a855f7", "#f97316", "#06b6d4", "#ec4899"];
  const totalWeight = sections.reduce((s, x) => s + (x.width || 1), 0);

  return (
    <div
      style={{
        width: "100%",
        maxWidth: 480,
        background: "var(--parchment, #faf6ef)",
        border: "3px solid var(--ink, #1f2937)",
        borderRadius: 18,
        padding: 18,
        display: "flex",
        flexDirection: "column",
        gap: 10,
      }}
    >
      <div
        style={{
          fontSize: 11,
          letterSpacing: "0.22em",
          fontWeight: 800,
          color: "var(--ink3, #6b7280)",
          textAlign: "center",
        }}
      >
        STRUCTURE
      </div>
      <div
        style={{
          display: "flex",
          width: "100%",
          height: 50,
          border: "2px solid var(--ink, #1f2937)",
          borderRadius: 10,
          overflow: "hidden",
        }}
      >
        {sections.map((s, i) => (
          <div
            key={i}
            style={{
              flex: (s.width || 1) / totalWeight,
              background: palette[i % palette.length],
              color: "#fff",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              fontFamily: "Georgia, serif",
              fontStyle: "italic",
              fontWeight: 900,
              fontSize: 18,
              textShadow: "0 1px 0 rgba(0,0,0,0.25)",
              borderRight:
                i < sections.length - 1 ? "2px solid var(--ink, #1f2937)" : "none",
            }}
          >
            {s.label}
          </div>
        ))}
      </div>
      {sections.some((s) => s.detail) && (
        <div
          style={{
            display: "flex",
            flexDirection: "column",
            gap: 4,
            marginTop: 4,
          }}
        >
          {sections.map((s, i) =>
            s.detail ? (
              <div
                key={i}
                style={{
                  fontSize: 12,
                  color: "var(--ink2, #4b5563)",
                  fontFamily: "Georgia, serif",
                }}
              >
                <span
                  style={{
                    fontWeight: 800,
                    color: palette[i % palette.length],
                    marginRight: 6,
                  }}
                >
                  {s.label}
                </span>
                {s.detail}
              </div>
            ) : null
          )}
        </div>
      )}
      <div
        style={{
          fontSize: 11,
          color: "var(--ink3, #6b7280)",
          textAlign: "center",
          fontStyle: "italic",
          marginTop: 4,
        }}
      >
        {figure}
      </div>
    </div>
  );
}

// ---------- FlashCard -----------------------------------------------------
//
// Renders "Flashcard — '...'" or "A teacher's-card graphic. Rule N: ...".
// Pulls the quoted/labeled rule out and renders it as a teaching tip.

function detectFlashCard(text: string): string | null {
  // "Flashcard — 'Drill days are for locking in.'"
  let m = /flashcard\s*[—-]\s*['"]([^'"]+)['"]/i.exec(text);
  if (m) return m[1].trim();
  // "A teacher's-card graphic. Rule 1: if one voice has..."
  m = /teacher'?s[-\s]card[^.]*\.\s*(?:rule\s*\d+:?\s*)?([^.]{10,180})/i.exec(text);
  if (m) return m[1].trim();
  // Bare "Flashcard:" with following sentence
  m = /^flashcard[:\s—-]+(.+?)(?:\.|$)/i.exec(text.trim());
  if (m) return m[1].trim();
  return null;
}

function FlashCard({ tip, figure }: { tip: string; figure: string }) {
  return (
    <div
      style={{
        width: "100%",
        maxWidth: 440,
        background: "var(--gold, #d4a853)",
        border: "3px solid var(--ink, #1f2937)",
        borderRadius: 18,
        padding: "18px 22px",
        display: "flex",
        flexDirection: "column",
        gap: 10,
        boxShadow: "0 4px 0 var(--ink, #1f2937)",
      }}
    >
      <div
        style={{
          fontSize: 11,
          letterSpacing: "0.22em",
          fontWeight: 800,
          color: "var(--ink, #1f2937)",
          textAlign: "center",
        }}
      >
        ★ Tip
      </div>
      <div
        style={{
          fontFamily: "Georgia, serif",
          fontStyle: "italic",
          fontWeight: 800,
          fontSize: 18,
          color: "var(--ink, #1f2937)",
          textAlign: "center",
          lineHeight: 1.4,
        }}
      >
        “{tip}”
      </div>
      {figure !== tip && (
        <div
          style={{
            fontSize: 11,
            color: "var(--ink, #1f2937)",
            opacity: 0.65,
            textAlign: "center",
            fontStyle: "italic",
            marginTop: 2,
          }}
        >
          {figure}
        </div>
      )}
    </div>
  );
}

// ---------- BigWordCard ----------------------------------------------------
//
// Renders a single-word emphasis figure like "PERFORMANCE" or
// "The word 'voicing' highlighted" — surfaces the word large.

function detectBigWord(text: string): string | null {
  // "A single word big on the screen: PERFORMANCE."
  let m = /single word\s+big[^:]*:\s*['"]?([A-Za-z]+)['"]?/i.exec(text);
  if (m) return m[1];
  // "The word 'voicing' highlighted"
  m = /the word\s+['"]([^'"]+)['"]/i.exec(text);
  if (m) return m[1];
  // "Italian word: rubato"
  m = /italian\s+word:?\s*['"]?([A-Za-z]+)['"]?/i.exec(text);
  if (m) return m[1];
  return null;
}

function BigWordCard({ word, figure }: { word: string; figure: string }) {
  return (
    <div
      style={{
        width: "100%",
        maxWidth: 440,
        background: "var(--parchment, #faf6ef)",
        border: "3px solid var(--ink, #1f2937)",
        borderRadius: 18,
        padding: "30px 22px",
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        gap: 12,
      }}
    >
      <div
        style={{
          fontFamily: "Georgia, serif",
          fontStyle: "italic",
          fontWeight: 900,
          fontSize: "clamp(40px, 9vw, 72px)",
          color: "var(--ink, #1f2937)",
          letterSpacing: "-0.02em",
          textAlign: "center",
          lineHeight: 1,
        }}
      >
        {word}
      </div>
      <div
        style={{
          fontSize: 12,
          color: "var(--ink3, #6b7280)",
          textAlign: "center",
          fontStyle: "italic",
          maxWidth: 360,
        }}
      >
        {figure}
      </div>
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
      "6/8",
      "sixteenth",
      "triplet",
      "triplets",
      "breath mark",
      "rest",
      "rests",
      "bar 1",
      "bar 2",
      "bar 3",
      "bar 4",
      "two bars",
      "three bars",
      "four bars",
      "count-line",
      "downbeat"
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
    /\b[A-G](?:[#b])?[1-7]\b/i.test(combined) || // explicit pitch like C4, F#5
    /\b(C|D|E|F|G|A|B) (key|note|chord|major|minor)\b/i.test(combined) ||
    /\b[A-G]\s+[A-G]\s+[A-G]\b/i.test(combined) || // "A B C", "C D E"
    /\b[A-G][#b]?[0-9]?-[A-G][#b]?[0-9]?-[A-G][#b]?[0-9]?\b/i.test(combined) || // "C-D-E", "C3-D3-E3"
    /\b(LH|RH|left hand|right hand)\b/i.test(combined) || // hand-position figures
    /\btriads?\b|\bchord\b|\bchord symbols?\b|\binversion\b/i.test(combined) ||
    /\bscale\s+\d|\bscale\b/i.test(combined) ||
    /\bphrases?\b/i.test(combined) ||
    /\bnote marked \d-\d\b/i.test(combined) || // fingering
    /\bcircle of fifths\b|\bcircle diagram\b/i.test(combined) ||
    /\bmelod(y|ies|ic)\b/i.test(combined) ||
    /\b\d-note (pattern|sequence)\b/i.test(combined) ||
    /\b(sequence of (?:\d|three|four|five|six)-note patterns?)\b/i.test(combined) ||
    /\b(A|B|C) section\b/i.test(combined) || // "B section"
    /\bpedal\b/i.test(combined) ||
    /\bbeamed?\b/i.test(combined) ||
    /\bsheet music\b/i.test(combined) ||
    /\bsubject\b/i.test(combined) || // fugue subjects, "subject starting on G"
    /\bsound diagram\b/i.test(combined) ||
    /\b(?:from|starts? on|starting on|ends? on|ending on)\s+[A-G]/i.test(combined) ||
    /\b[A-G][#♯♭b]?\s+to\s+[A-G][#♯♭b]?\b/i.test(combined) || // "A to C-sharp"
    /\b(bach|mozart|haydn|chopin|debussy|schumann|beethoven|brahms|liszt|tchaikovsky|petzold|baroque|classical|romantic)\b/i.test(combined) ||
    /\b[A-G][#♯♭b]?\s*,\s*[A-G][#♯♭b]?\s*,\s*[A-G][#♯♭b]?\b/.test(combined) || // "E, B, E, G#"
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

  // 10b) Ornaments — trill / mordent / turn / grace note / glissando.
  // Their glyphs are music-notation specific so they get their own card.
  {
    const orn = detectOrnament(combined);
    if (orn) return <OrnamentCard ornament={orn} figure={page.figure || ""} />;
  }

  // 11) Music symbols — dynamics, accidentals, articulation. These are
  // common across the curriculum but don't map onto a staff or keyboard;
  // they're glyphs the student needs to recognise visually. Detected by
  // a focused keyword/glyph match.
  {
    const sym = detectMusicSymbol(combined);
    if (sym) return <MusicSymbolCard symbol={sym} figure={page.figure || ""} />;
  }

  // 12) Famous-melody references — "Ode to Joy", "Für Elise", "Jingle
  // Bells", etc. Render a music-themed badge with the title prominent.
  {
    const title = detectMelodyReference(combined);
    if (title) return <PhraseCard title={title} figure={page.figure || ""} />;
  }

  // 13) Melody contour — rising / falling / arch / valley / wavy / flat.
  // Drawn as a simple SVG curve with note dots along it.
  {
    const contour = detectContour(combined);
    if (contour) return <ContourCard contour={contour} figure={page.figure || ""} />;
  }

  // 13a) Section / structure maps — "Three boxes labeled A, B, A",
  // "Bars 1-6: CLIMB. Bars 7-9: PEAK".
  {
    const sections = detectSectionMap(combined);
    if (sections) return <SectionMapCard sections={sections} figure={page.figure || ""} />;
  }

  // 13b) Side-by-side comparisons — "Side by side: X and Y", "Two
  // staves — one with X, one with Y", "X vs Y", etc.
  {
    const halves = detectComparison(combined);
    if (halves) return <ComparisonCard halves={halves} figure={page.figure || ""} />;
  }

  // 13c) Flashcard / teacher's-card — quoted teaching tips.
  {
    const tip = detectFlashCard(combined);
    if (tip) return <FlashCard tip={tip} figure={page.figure || ""} />;
  }

  // 13d) Single big word — "PERFORMANCE", "voicing highlighted",
  // "Italian word: rubato".
  {
    const word = detectBigWord(combined);
    if (word) return <BigWordCard word={word} figure={page.figure || ""} />;
  }

  // 14) Defaults by page mode/type — better than dropping to plain text.
  // Any play page should show the keyboard. Hear pages with no other
  // signal probably involve listening to a note, so also keyboard.
  if (page.mode === "play" || page.mode === "hear") {
    return <KeyboardMini page={page} />;
  }

  // 15) Final fallback — stylised description card. Always renders
  //     something so the student can read what the figure should show.
  return <GenericFigureCard figure={page.figure || ""} />;
}

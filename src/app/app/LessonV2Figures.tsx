"use client";
/**
 * LessonV2 figure renderers.
 *
 * Each YAML page has a free-form `figure:` description. We don't do full NLP;
 * instead we use a small decision tree over:
 *   - page.mode        (see/hear/play)
 *   - page.type        (hook, wrap, reflection, whats_next, listen_to_piece, ...)
 *   - lesson boss flags (is_act_boss, is_tier_boss, is_graduation)
 *   - figure text keywords (staircase, pyramid, Celebration, trophy, staff, ...)
 * to pick between a finite set of visual components:
 *
 *   - CleffyScene          — Cleffy greeting the student
 *   - Staircase            — for "stairs" metaphor pages
 *   - Pyramid              — tier-progress pyramid for reflection / whats_next
 *   - CelebrationCard      — wrap pages on boss lessons
 *   - KeyboardFigure       — play pages (already handled by LessonV2.tsx KeyboardMini)
 *   - FigureText (fallback)— original Phase-1 caption-only renderer
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

// ---------- Router ---------------------------------------------------------

/**
 * True when we have a real visual for this page (staircase, pyramid,
 * celebration card, Cleffy scene). When false, LessonV2 should hide the
 * entire figure panel rather than show the raw YAML description as text.
 */
export function hasRenderedFigure(
  lesson: LessonV2,
  page: LessonPage,
  hasKeyboardNotes: boolean
): boolean {
  // Play pages use the bottom piano, not the figure panel, so if there are
  // keyboard notes we consider "the visual is elsewhere" → no panel.
  if (hasKeyboardNotes) return false;

  if (
    page.type === "wrap" &&
    (lesson.is_graduation ||
      lesson.is_tier_boss ||
      lesson.is_mid_boss ||
      lesson.is_act_boss)
  ) {
    return true;
  }
  if (typeof page.type === "string" && page.type.startsWith("reflection")) {
    return true;
  }
  if (page.type === "whats_next" || page.type === "whats_next_life_after") {
    return true;
  }
  const fig = (page.figure || "").toLowerCase();
  if (fig.includes("pyramid")) return true;
  if (fig.includes("staircase") || fig.includes("stairs") || fig.includes("stair")) {
    return true;
  }
  if (page.type === "hook") return true;
  if (
    fig.includes("celebration") ||
    fig.includes("trophy") ||
    fig.includes("complete") ||
    fig.includes("confetti")
  ) {
    return true;
  }
  return false;
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
  if (hasKeyword(fig, "pyramid")) {
    const preview = hasKeyword(fig, "preview") ? Math.min(currentTierIndex(lesson.id) + 1, 5) : undefined;
    return <Pyramid lessonId={lesson.id} previewTier={preview} />;
  }

  // 3) Staircase when the figure talks about stairs.
  if (hasKeyword(fig, "staircase", "stairs", "stair")) {
    const steps = /(\d{1,2})\s*(stairs|steps)/i.exec(fig)?.[1];
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

  // 5) Wrap / celebration keywords on non-boss pages
  if (hasKeyword(fig, "celebration", "trophy", "complete", "confetti")) {
    return <CelebrationCard lesson={lesson} />;
  }

  // 6) No real renderer for this figure — render nothing. (hasRenderedFigure
  //    should already be hiding the wrapping panel in this case.)
  return null;
}

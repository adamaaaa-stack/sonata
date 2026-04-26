"use client";
/**
 * CurriculumMap — the showpiece screen.
 *
 * Renders all 250 hand-authored lessons as a vertical journey grouped by
 * tier (beginner → elementary → low-intermediate → intermediate →
 * upper-intermediate → advanced) and act. Each lesson is a node on a
 * winding path; bosses are bigger; completed lessons get a gold halo;
 * the next lesson glows.
 *
 * Replaces the flat tile grid LessonsListScreen used to render. The map
 * is intentionally photo-friendly — it's the screen people screenshot to
 * show off Sonata.
 */
import React, { useEffect, useMemo, useRef } from "react";
import { lessonsV2, type LessonV2 } from "@/lib/music/lessonsV2";
import { hSelect } from "@/lib/haptics";

// Tier display order (matches pedagogy progression)
const TIER_ORDER = [
  "beginner",
  "elementary",
  "low-intermediate",
  "intermediate",
  "upper-intermediate",
  "advanced",
] as const;

// Tier colour palette — each block reads as a distinct mountain/region.
const TIER_COLORS: Record<string, { bg: string; accent: string; emoji: string }> = {
  beginner: { bg: "#fef3c7", accent: "#d97706", emoji: "🌱" },
  elementary: { bg: "#fde68a", accent: "#b45309", emoji: "🌿" },
  "low-intermediate": { bg: "#bbf7d0", accent: "#15803d", emoji: "🌳" },
  intermediate: { bg: "#a7f3d0", accent: "#047857", emoji: "🏔️" },
  "upper-intermediate": { bg: "#bfdbfe", accent: "#1d4ed8", emoji: "🗻" },
  advanced: { bg: "#e9d5ff", accent: "#6b21a8", emoji: "👑" },
};

interface CurriculumMapProps {
  completed: number[];
  onSelect: (lessonId: number) => void;
  onBack: () => void;
}

export function CurriculumMap({
  completed,
  onSelect,
  onBack,
}: CurriculumMapProps) {
  // Group lessons by tier preserving order.
  const tiers = useMemo(() => {
    const byTier = new Map<string, LessonV2[]>();
    for (const l of lessonsV2) {
      const t = l.tier || "beginner";
      if (!byTier.has(t)) byTier.set(t, []);
      byTier.get(t)!.push(l);
    }
    return TIER_ORDER.filter((t) => byTier.has(t)).map((t) => ({
      tier: t,
      lessons: byTier.get(t)!.sort((a, b) => a.id - b.id),
    }));
  }, []);

  // Find the next lesson — first incomplete in id order.
  const nextLessonId = useMemo(() => {
    const set = new Set(completed);
    for (const l of lessonsV2) if (!set.has(l.id)) return l.id;
    return null;
  }, [completed]);

  // Auto-scroll the next-lesson node into view on mount so the student
  // lands on their current spot in the journey, not at lesson 1.
  const nextRef = useRef<HTMLDivElement | null>(null);
  useEffect(() => {
    if (!nextRef.current) return;
    nextRef.current.scrollIntoView({ behavior: "auto", block: "center" });
  }, []);

  const overallPct = Math.round(
    (completed.length / lessonsV2.length) * 100
  );

  return (
    <div
      style={{
        position: "relative",
        minHeight: "100vh",
        background:
          "linear-gradient(180deg, #fffbeb 0%, #fef3c7 30%, #ecfccb 60%, #cffafe 100%)",
        fontFamily: "var(--sans, system-ui, sans-serif)",
        paddingBottom: 80,
      }}
    >
      {/* Sticky header */}
      <div
        style={{
          position: "sticky",
          top: 0,
          zIndex: 5,
          backdropFilter: "blur(8px)",
          background: "rgba(255, 251, 235, 0.85)",
          borderBottom: "2px solid rgba(31, 41, 55, 0.1)",
          padding: "16px 24px",
          display: "flex",
          alignItems: "center",
          gap: 14,
        }}
      >
        <button
          type="button"
          onClick={() => {
            hSelect();
            onBack();
          }}
          style={{
            padding: "8px 14px",
            border: "2px solid var(--ink, #1f2937)",
            background: "var(--cream, #fff8ee)",
            color: "var(--ink, #1f2937)",
            borderRadius: 999,
            fontWeight: 800,
            fontSize: 13,
            cursor: "pointer",
            boxShadow: "0 2px 0 var(--ink, #1f2937)",
          }}
        >
          ← Home
        </button>
        <div style={{ flex: 1 }}>
          <div
            style={{
              fontSize: 11,
              fontWeight: 800,
              letterSpacing: "0.18em",
              color: "var(--ink3, #6b7280)",
              textTransform: "uppercase",
            }}
          >
            Your journey
          </div>
          <div
            style={{
              fontSize: 18,
              fontWeight: 900,
              color: "var(--ink, #1f2937)",
              fontFamily: "var(--serif, Georgia)",
              fontStyle: "italic",
            }}
          >
            {completed.length} of {lessonsV2.length} lessons · {overallPct}%
          </div>
          {/* Progress bar */}
          <div
            style={{
              height: 6,
              background: "rgba(31, 41, 55, 0.12)",
              borderRadius: 999,
              marginTop: 6,
              overflow: "hidden",
            }}
          >
            <div
              style={{
                width: `${overallPct}%`,
                height: "100%",
                background:
                  "linear-gradient(90deg, var(--gold, #d4a853), var(--berry, #c45a8a))",
                transition: "width 600ms ease-out",
              }}
            />
          </div>
        </div>
      </div>

      {/* Tier sections */}
      <div
        style={{
          maxWidth: 720,
          margin: "0 auto",
          padding: "20px 16px 0",
        }}
      >
        {tiers.map(({ tier, lessons }) => (
          <TierSection
            key={tier}
            tier={tier}
            lessons={lessons}
            completed={completed}
            nextLessonId={nextLessonId}
            nextRef={nextRef}
            onSelect={onSelect}
          />
        ))}
        {/* Footer encouragement */}
        <div
          style={{
            textAlign: "center",
            marginTop: 32,
            padding: 20,
            color: "var(--ink3, #6b7280)",
            fontFamily: "Georgia, serif",
            fontStyle: "italic",
            fontSize: 14,
          }}
        >
          {completed.length === lessonsV2.length
            ? "You finished the whole curriculum. Astonishing."
            : `${lessonsV2.length - completed.length} lessons to go.`}
        </div>
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────
// One tier section — header + winding path of lesson nodes
// ─────────────────────────────────────────────────────────────────────────

function TierSection({
  tier,
  lessons,
  completed,
  nextLessonId,
  nextRef,
  onSelect,
}: {
  tier: string;
  lessons: LessonV2[];
  completed: number[];
  nextLessonId: number | null;
  nextRef: React.MutableRefObject<HTMLDivElement | null>;
  onSelect: (lessonId: number) => void;
}) {
  const palette = TIER_COLORS[tier] || TIER_COLORS.beginner;
  const completedSet = new Set(completed);
  const tierCompleted = lessons.filter((l) => completedSet.has(l.id)).length;
  const tierPct = Math.round((tierCompleted / lessons.length) * 100);

  return (
    <div
      style={{
        background: palette.bg,
        border: `3px solid ${palette.accent}`,
        borderRadius: 24,
        padding: "20px 18px 28px",
        marginBottom: 24,
        position: "relative",
        boxShadow: `0 6px 0 ${palette.accent}40`,
      }}
    >
      {/* Tier header */}
      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: 12,
          marginBottom: 18,
        }}
      >
        <div style={{ fontSize: 32 }}>{palette.emoji}</div>
        <div style={{ flex: 1 }}>
          <div
            style={{
              fontFamily: "var(--serif, Georgia)",
              fontStyle: "italic",
              fontSize: 24,
              fontWeight: 900,
              color: palette.accent,
              textTransform: "capitalize",
              letterSpacing: "-0.02em",
              lineHeight: 1,
            }}
          >
            {tier.replace(/-/g, " ")}
          </div>
          <div
            style={{
              fontSize: 12,
              color: palette.accent,
              opacity: 0.75,
              fontWeight: 700,
              marginTop: 2,
            }}
          >
            {tierCompleted}/{lessons.length} · {tierPct}%
          </div>
        </div>
      </div>

      {/* Winding path of lesson nodes */}
      <div
        style={{
          display: "flex",
          flexDirection: "column",
          gap: 18,
        }}
      >
        {lessons.map((l, i) => {
          const isComplete = completedSet.has(l.id);
          const isNext = l.id === nextLessonId;
          // Lock anything past the first incomplete lesson — encourages
          // sequential progression but doesn't actively prevent jumping
          // back to an earlier lesson.
          const isLocked =
            !isComplete &&
            !isNext &&
            nextLessonId != null &&
            l.id > nextLessonId;
          // Snake the nodes left/right for visual rhythm.
          const offset = i % 4;
          const xPad =
            offset === 0
              ? 0
              : offset === 1
              ? 40
              : offset === 2
              ? 60
              : 30;
          return (
            <div
              key={l.id}
              ref={isNext ? nextRef : undefined}
              style={{
                paddingLeft: xPad,
                display: "flex",
                alignItems: "center",
                gap: 14,
                position: "relative",
              }}
            >
              <LessonNode
                lesson={l}
                state={
                  isComplete
                    ? "complete"
                    : isNext
                    ? "next"
                    : isLocked
                    ? "locked"
                    : "available"
                }
                accent={palette.accent}
                onClick={() => {
                  if (isLocked) return;
                  hSelect();
                  onSelect(l.id);
                }}
              />
              <LessonLabel lesson={l} muted={isLocked} />
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────
// One lesson node — circle / crown / star depending on state
// ─────────────────────────────────────────────────────────────────────────

function LessonNode({
  lesson,
  state,
  accent,
  onClick,
}: {
  lesson: LessonV2;
  state: "complete" | "next" | "available" | "locked";
  accent: string;
  onClick: () => void;
}) {
  const isBoss =
    !!lesson.is_graduation ||
    !!lesson.is_tier_boss ||
    !!lesson.is_act_boss ||
    !!lesson.is_mid_boss;
  const size = isBoss ? 76 : 60;

  const bg =
    state === "complete"
      ? accent
      : state === "next"
      ? "#fff"
      : state === "locked"
      ? "rgba(255,255,255,0.5)"
      : "#fff";
  const fg =
    state === "complete"
      ? "#fff"
      : state === "locked"
      ? "rgba(31,41,55,0.35)"
      : accent;
  const border =
    state === "locked" ? "rgba(31,41,55,0.2)" : accent;

  const glyph =
    state === "complete"
      ? isBoss
        ? "👑"
        : "✓"
      : state === "locked"
      ? "🔒"
      : isBoss
      ? lesson.is_graduation
        ? "🏆"
        : "★"
      : String(lesson.id);

  return (
    <button
      type="button"
      onClick={onClick}
      disabled={state === "locked"}
      aria-label={`Lesson ${lesson.id}: ${lesson.title}`}
      style={{
        width: size,
        height: size,
        borderRadius: "50%",
        background: bg,
        color: fg,
        border: `4px solid ${border}`,
        cursor: state === "locked" ? "not-allowed" : "pointer",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        fontSize: state === "complete" || state === "locked" ? 24 : isBoss ? 22 : 18,
        fontWeight: 900,
        fontFamily: "var(--mono, monospace)",
        boxShadow:
          state === "next"
            ? `0 0 0 6px ${accent}33, 0 4px 0 ${accent}`
            : `0 4px 0 ${accent}`,
        transform: state === "next" ? "scale(1.05)" : undefined,
        transition: "transform 220ms",
        flexShrink: 0,
        animation:
          state === "next" ? "sonataMapPulse 1.6s ease-in-out infinite" : undefined,
      }}
    >
      {glyph}
      <style>{`
        @keyframes sonataMapPulse {
          0%, 100% { transform: scale(1.05); box-shadow: 0 0 0 6px ${accent}33, 0 4px 0 ${accent}; }
          50%      { transform: scale(1.1); box-shadow: 0 0 0 12px ${accent}1a, 0 4px 0 ${accent}; }
        }
      `}</style>
    </button>
  );
}

function LessonLabel({
  lesson,
  muted,
}: {
  lesson: LessonV2;
  muted: boolean;
}) {
  return (
    <div
      style={{
        flex: 1,
        opacity: muted ? 0.5 : 1,
        minWidth: 0,
      }}
    >
      <div
        style={{
          fontFamily: "var(--serif, Georgia)",
          fontStyle: "italic",
          fontSize: 16,
          fontWeight: 800,
          color: "var(--ink, #1f2937)",
          lineHeight: 1.2,
          overflow: "hidden",
          textOverflow: "ellipsis",
          whiteSpace: "nowrap",
        }}
      >
        {lesson.title}
      </div>
      {lesson.subtitle && (
        <div
          style={{
            fontSize: 12,
            color: "var(--ink3, #6b7280)",
            marginTop: 2,
            overflow: "hidden",
            textOverflow: "ellipsis",
            whiteSpace: "nowrap",
            fontWeight: 600,
          }}
        >
          {lesson.subtitle}
        </div>
      )}
    </div>
  );
}

"use client";
/**
 * PianoKeyboard — styled interactive piano keyboard.
 *
 * Extracted from page.tsx so it can be reused by LessonV2 (and anywhere else).
 * Relies on sonata.css CSS variables for responsive sizing.
 */
import React, { useRef, useState } from "react";
import {
  NOTES,
  isBlack,
  playPianoKey,
  spawnFloatNote,
  unlockAudio,
  loadPianoSamples,
  isPianoReady,
} from "@/lib/music";
import { hLight } from "@/lib/haptics";

export interface PianoKeyboardProps {
  startMidi?: number;
  endMidi?: number;
  /** Map of midi → CSS color (overlaid as tint). */
  highlights?: Record<number, string>;
  /** Map of midi → finger number (1-5) shown as a badge. */
  fingers?: Record<number, number>;
  onClick?: (midi: number) => void;
  showNames?: boolean;
  /**
   * If set, the key with this MIDI number gets a strong pulsing highlight on
   * top of anything in `highlights`. Used for "play this next" cues.
   */
  pulseMidi?: number | null;
}

export function PianoKeyboard({
  startMidi = 48,
  endMidi = 84,
  highlights = {},
  fingers = {},
  onClick,
  showNames = true,
  pulseMidi = null,
}: PianoKeyboardProps) {
  const [pressed, setPressed] = useState<Set<number>>(new Set());
  const touchedRef = useRef(false);
  const containerRef = useRef<HTMLDivElement>(null);

  // Track the last press time per key to swallow accidental double-fire
  // (e.g. browsers that emit both touchstart AND a synthesized click).
  const lastPressRef = useRef<Record<number, number>>({});

  // Tap-vs-drag detection: when the user starts a horizontal swipe to scroll
  // the keyboard, we must NOT fire the underlying note. Track the touch
  // start position; if it moves more than a few pixels we consider it a
  // drag/scroll and suppress the press.
  const touchTrackerRef = useRef<{
    midi: number;
    x: number;
    y: number;
    dragging: boolean;
  } | null>(null);

  function handlePress(m: number) {
    // Defensive de-dupe: ignore a second press of the same key within 80ms.
    const now =
      typeof performance !== "undefined" ? performance.now() : Date.now();
    if (now - (lastPressRef.current[m] || 0) < 80) return;
    lastPressRef.current[m] = now;

    // Unlock the AudioContext on every press — mount-time unlock can be
    // ignored by the browser if no user gesture preceded it. After a page
    // transition the context may also have been suspended.
    try { unlockAudio(); } catch {}
    if (!isPianoReady()) {
      // Kick off a load (idempotent) so subsequent presses can ring.
      loadPianoSamples().catch(() => {});
    }

    hLight();
    playPianoKey(m);
    onClick?.(m);
    setPressed((p) => {
      const n = new Set(p);
      n.add(m);
      return n;
    });
    setTimeout(
      () =>
        setPressed((p) => {
          const n = new Set(p);
          n.delete(m);
          return n;
        }),
      200
    );
    const glyphs = ["♪", "♫", "♬"];
    spawnFloatNote(containerRef.current, glyphs[m % 3]);
  }

  // Threshold (px): movement greater than this turns a tap into a drag/scroll.
  const DRAG_THRESHOLD = 8;

  function onTouchStartKey(m: number, e: React.TouchEvent) {
    // IMPORTANT: do NOT preventDefault here — that kills the native horizontal
    // scroll. We instead distinguish tap vs drag from the move/end deltas.
    touchedRef.current = true;
    const t = e.touches[0];
    touchTrackerRef.current = {
      midi: m,
      x: t?.clientX ?? 0,
      y: t?.clientY ?? 0,
      dragging: false,
    };
  }

  function onTouchMoveKey(e: React.TouchEvent) {
    const tracker = touchTrackerRef.current;
    if (!tracker || tracker.dragging) return;
    const t = e.touches[0];
    if (!t) return;
    const dx = Math.abs(t.clientX - tracker.x);
    const dy = Math.abs(t.clientY - tracker.y);
    if (dx > DRAG_THRESHOLD || dy > DRAG_THRESHOLD) {
      tracker.dragging = true;
    }
  }

  function onTouchEndKey() {
    const tracker = touchTrackerRef.current;
    touchTrackerRef.current = null;
    if (!tracker) return;
    if (tracker.dragging) return; // it was a scroll, not a tap
    handlePress(tracker.midi);
  }

  function onTouchCancelKey() {
    touchTrackerRef.current = null;
  }

  function onClickKey(m: number) {
    if (touchedRef.current) {
      touchedRef.current = false;
      return;
    }
    handlePress(m);
  }

  function scrollByOctave(dir: 1 | -1) {
    const el = containerRef.current;
    if (!el) return;
    // Compute pixel width of one white key from CSS var, fallback to 36px.
    const probe = el.querySelector<HTMLElement>(".sonata-key-white");
    const keyW = probe ? probe.getBoundingClientRect().width : 36;
    el.scrollBy({ left: dir * keyW * 7, behavior: "smooth" });
  }

  const whiteKeys: number[] = [];
  for (let m = startMidi; m <= endMidi; m++) {
    if (!isBlack(m)) whiteKeys.push(m);
  }

  const scrollBtnStyle: React.CSSProperties = {
    position: "absolute",
    top: "50%",
    transform: "translateY(-50%)",
    width: 32,
    height: 56,
    borderRadius: 8,
    border: "1px solid rgba(200,169,110,0.35)",
    background: "rgba(15,15,15,0.75)",
    color: "var(--gold, #d4a853)",
    fontSize: 18,
    fontWeight: 700,
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    cursor: "pointer",
    zIndex: 10,
    backdropFilter: "blur(4px)",
    WebkitBackdropFilter: "blur(4px)",
    boxShadow: "0 2px 8px rgba(0,0,0,0.4)",
    userSelect: "none",
    touchAction: "manipulation",
  };

  return (
    <div
      style={{
        marginTop: "auto",
        position: "relative",
        borderTop: "1px solid rgba(200,169,110,0.1)",
      }}
    >
      <button
        type="button"
        aria-label="Scroll keyboard left one octave"
        onClick={() => scrollByOctave(-1)}
        style={{ ...scrollBtnStyle, left: 4 }}
      >
        ◀
      </button>
      <button
        type="button"
        aria-label="Scroll keyboard right one octave"
        onClick={() => scrollByOctave(1)}
        style={{ ...scrollBtnStyle, right: 4 }}
      >
        ▶
      </button>
    <div
      ref={containerRef}
      className="sonata-piano-container"
      onTouchMove={onTouchMoveKey}
      onTouchEnd={onTouchEndKey}
      onTouchCancel={onTouchCancelKey}
      style={{
        padding: "16px 40px 8px",
        display: "flex",
        justifyContent: "flex-start",
        overflowX: "auto",
        WebkitOverflowScrolling: "touch",
        touchAction: "pan-x",
        position: "relative",
        scrollSnapType: "x proximity",
      } as React.CSSProperties}
    >
      {/* Local keyframes so pulse works even without a CSS rule present. */}
      <style>{`
        @keyframes sonataKeyPulse {
          0%, 100% { opacity: 0.45; transform: scale(1); }
          50%      { opacity: 0.95; transform: scale(1.04); }
        }
        @keyframes sonataKeyPulseRing {
          0%   { box-shadow: 0 0 0 0 rgba(34,197,94,0.65); }
          70%  { box-shadow: 0 0 0 14px rgba(34,197,94,0); }
          100% { box-shadow: 0 0 0 0 rgba(34,197,94,0); }
        }
      `}</style>
      <div style={{ position: "relative", display: "flex" }}>
        {whiteKeys.map((m) => {
          const isC = m % 12 === 0;
          const isActive = pressed.has(m);
          const hl = highlights[m];
          const isPulse = pulseMidi === m;
          return (
            <div
              key={m}
              className="sonata-key-white"
              onClick={() => onClickKey(m)}
              onTouchStart={(e) => onTouchStartKey(m, e)}
              style={{
                width: "var(--key-w)",
                height: "var(--key-h)",
                background: isActive
                  ? "linear-gradient(180deg, #D8D4CC, #C8C4BC)"
                  : "linear-gradient(180deg, #FAFAF6, #EBE7DF)",
                border: "1px solid #B8B4AC",
                borderTop: "none",
                borderRadius: "0 0 6px 6px",
                display: "flex",
                flexDirection: "column",
                alignItems: "center",
                justifyContent: "flex-end",
                paddingBottom: 6,
                cursor: "pointer",
                position: "relative",
                zIndex: 1,
                boxShadow: isActive
                  ? "inset 0 2px 4px rgba(0,0,0,0.15)"
                  : "0 6px 12px rgba(0,0,0,0.35), inset 0 -3px 0 rgba(0,0,0,0.04)",
                transition: "box-shadow 0.08s, background 0.08s",
                userSelect: "none",
              } as React.CSSProperties}
            >
              {(hl || isPulse) && (
                <div
                  style={{
                    position: "absolute",
                    inset: 0,
                    borderRadius: "inherit",
                    background: isPulse ? "#22c55e" : hl,
                    opacity: isPulse ? 0.7 : 0.35,
                    pointerEvents: "none",
                    animation: isPulse
                      ? "sonataKeyPulse 1s ease-in-out infinite"
                      : undefined,
                  }}
                />
              )}
              {isPulse && (
                <div
                  style={{
                    position: "absolute",
                    inset: 0,
                    borderRadius: "inherit",
                    border: "3px solid #16a34a",
                    pointerEvents: "none",
                    animation: "sonataKeyPulseRing 1.2s ease-out infinite",
                  }}
                />
              )}
              {fingers[m] && (
                <div
                  style={{
                    position: "absolute",
                    top: 10,
                    width: 20,
                    height: 20,
                    borderRadius: "50%",
                    background: "var(--ink)",
                    color: "var(--gold)",
                    border: "2px solid var(--ink)",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    fontSize: 11,
                    fontWeight: 800,
                    pointerEvents: "none",
                    zIndex: 3,
                  }}
                >
                  {fingers[m]}
                </div>
              )}
              {showNames && (
                <span
                  style={{
                    fontSize: isC ? 10 : 8,
                    fontWeight: isC ? 600 : 400,
                    color: isC ? "#666" : "#AAA",
                    fontFamily: "var(--sans)",
                    pointerEvents: "none",
                    lineHeight: 1,
                  }}
                >
                  {isC ? `C${Math.floor(m / 12) - 1}` : NOTES[m % 12]}
                </span>
              )}
            </div>
          );
        })}
        {/* Black keys — absolutely positioned over white keys */}
        {whiteKeys.map((m, i) => {
          const nb = m + 1;
          if (nb > endMidi || !isBlack(nb)) return null;
          const isActive = pressed.has(nb);
          const hl = highlights[nb];
          const isPulse = pulseMidi === nb;
          return (
            <div
              key={nb}
              className="sonata-key-black"
              onClick={(e) => {
                e.stopPropagation();
                onClickKey(nb);
              }}
              onTouchStart={(e) => {
                e.stopPropagation();
                onTouchStartKey(nb, e);
              }}
              style={{
                position: "absolute",
                left: `calc((${i + 1}) * var(--key-w) - var(--bkey-w) / 2)`,
                top: 0,
                width: "var(--bkey-w)",
                height: "var(--bkey-h)",
                background: isActive
                  ? "linear-gradient(180deg, #444, #222)"
                  : "linear-gradient(180deg, #333, #111)",
                border: "1px solid #000",
                borderTop: "none",
                borderRadius: "0 0 4px 4px",
                zIndex: 2,
                cursor: "pointer",
                boxShadow: isActive
                  ? "inset 0 1px 3px rgba(0,0,0,0.5)"
                  : "0 4px 8px rgba(0,0,0,0.6), inset 0 -2px 0 rgba(255,255,255,0.05)",
                transition: "box-shadow 0.08s, background 0.08s",
                userSelect: "none",
              }}
            >
              {(hl || isPulse) && (
                <div
                  style={{
                    position: "absolute",
                    inset: 0,
                    borderRadius: "inherit",
                    background: isPulse ? "#22c55e" : hl,
                    opacity: isPulse ? 0.85 : 0.4,
                    pointerEvents: "none",
                    animation: isPulse
                      ? "sonataKeyPulse 1s ease-in-out infinite"
                      : undefined,
                  }}
                />
              )}
              {isPulse && (
                <div
                  style={{
                    position: "absolute",
                    inset: 0,
                    borderRadius: "inherit",
                    border: "2px solid #16a34a",
                    pointerEvents: "none",
                    animation: "sonataKeyPulseRing 1.2s ease-out infinite",
                  }}
                />
              )}
              {fingers[nb] && (
                <div
                  style={{
                    position: "absolute",
                    top: 8,
                    left: "50%",
                    transform: "translateX(-50%)",
                    width: 16,
                    height: 16,
                    borderRadius: "50%",
                    background: "var(--ink)",
                    color: "var(--gold)",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    fontSize: 9,
                    fontWeight: 600,
                    pointerEvents: "none",
                    zIndex: 3,
                  }}
                >
                  {fingers[nb]}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
    </div>
  );
}

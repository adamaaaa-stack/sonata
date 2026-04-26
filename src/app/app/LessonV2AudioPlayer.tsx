"use client";
/**
 * CleffyAudioPlayer — custom audio control for the Cleffy narration on
 * lesson pages. Wraps an underlying <audio> element (the lesson player
 * still uses audioRef for cross-page auto-play); hides the native UI;
 * renders our own chunky transport: play/pause, scrub, time, replay,
 * 0.75x speed toggle.
 *
 * The underlying <audio> ref is exposed via the ref prop so the parent
 * can keep doing `a.play()`, `a.currentTime = 0`, etc. on page change.
 */
import React, {
  forwardRef,
  useEffect,
  useImperativeHandle,
  useRef,
  useState,
} from "react";

interface CleffyAudioPlayerProps {
  src: string;
  /**
   * Auto-play on mount. The lesson player flips this on for narration
   * pages — iOS WKWebView allows autoplay if the navigation that brought
   * us here was a tap (it is).
   */
  autoPlay?: boolean;
}

export const CleffyAudioPlayer = forwardRef<
  HTMLAudioElement,
  CleffyAudioPlayerProps
>(function CleffyAudioPlayer({ src, autoPlay }, externalRef) {
  const audioRef = useRef<HTMLAudioElement | null>(null);
  // Forward the internal ref to the parent's ref.
  useImperativeHandle(externalRef, () => audioRef.current as HTMLAudioElement);

  const [playing, setPlaying] = useState(false);
  const [time, setTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [rate, setRate] = useState(1);
  const [scrubbing, setScrubbing] = useState(false);

  // Wire native events to local state.
  useEffect(() => {
    const a = audioRef.current;
    if (!a) return;
    function onPlay() {
      setPlaying(true);
    }
    function onPause() {
      setPlaying(false);
    }
    function onTime() {
      if (scrubbing) return;
      if (!a) return;
      setTime(a.currentTime);
    }
    function onLoaded() {
      if (!a) return;
      setDuration(Number.isFinite(a.duration) ? a.duration : 0);
    }
    function onEnded() {
      setPlaying(false);
    }
    a.addEventListener("play", onPlay);
    a.addEventListener("pause", onPause);
    a.addEventListener("timeupdate", onTime);
    a.addEventListener("loadedmetadata", onLoaded);
    a.addEventListener("ended", onEnded);
    // If the metadata is already there (cached), populate immediately.
    if (a.readyState >= 1) onLoaded();
    return () => {
      a.removeEventListener("play", onPlay);
      a.removeEventListener("pause", onPause);
      a.removeEventListener("timeupdate", onTime);
      a.removeEventListener("loadedmetadata", onLoaded);
      a.removeEventListener("ended", onEnded);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [src, scrubbing]);

  // When src changes, reset state.
  useEffect(() => {
    setTime(0);
    setDuration(0);
  }, [src]);

  function togglePlay() {
    const a = audioRef.current;
    if (!a) return;
    if (a.paused) {
      void a.play().catch(() => {});
    } else {
      a.pause();
    }
  }

  function replay() {
    const a = audioRef.current;
    if (!a) return;
    a.currentTime = 0;
    void a.play().catch(() => {});
  }

  function changeRate() {
    const a = audioRef.current;
    if (!a) return;
    const next = rate === 1 ? 0.75 : 1;
    a.playbackRate = next;
    setRate(next);
  }

  function scrubTo(pct: number) {
    const a = audioRef.current;
    if (!a || !duration) return;
    const t = Math.max(0, Math.min(duration, pct * duration));
    a.currentTime = t;
    setTime(t);
  }

  const pct = duration > 0 ? Math.min(1, time / duration) : 0;

  return (
    <div
      style={{
        display: "flex",
        alignItems: "center",
        gap: 12,
        background: "var(--cream, #fff8ee)",
        border: "2px solid var(--ink, #1f2937)",
        borderRadius: 14,
        padding: "10px 14px",
        boxShadow: "0 3px 0 var(--ink, #1f2937)",
      }}
    >
      <audio
        ref={audioRef}
        src={src}
        preload="auto"
        autoPlay={autoPlay}
        // Native controls hidden — our chunky UI replaces them.
        style={{ display: "none" }}
      />

      {/* Play / pause */}
      <button
        type="button"
        onClick={togglePlay}
        aria-label={playing ? "Pause Cleffy" : "Play Cleffy"}
        style={{
          width: 44,
          height: 44,
          borderRadius: "50%",
          border: "2.5px solid var(--ink, #1f2937)",
          background: "var(--gold, #d4a853)",
          cursor: "pointer",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          fontSize: 18,
          fontWeight: 900,
          boxShadow: "0 2px 0 var(--ink, #1f2937)",
          flexShrink: 0,
          padding: 0,
          color: "var(--ink, #1f2937)",
        }}
      >
        {playing ? "❚❚" : "▶"}
      </button>

      {/* Replay */}
      <button
        type="button"
        onClick={replay}
        aria-label="Replay from start"
        style={{
          width: 36,
          height: 36,
          borderRadius: "50%",
          border: "2px solid var(--ink, #1f2937)",
          background: "var(--cream, #fff8ee)",
          cursor: "pointer",
          fontSize: 14,
          fontWeight: 800,
          boxShadow: "0 2px 0 var(--ink, #1f2937)",
          flexShrink: 0,
          padding: 0,
          color: "var(--ink, #1f2937)",
        }}
      >
        ↺
      </button>

      {/* Scrub track */}
      <ScrubBar
        pct={pct}
        onScrubStart={() => setScrubbing(true)}
        onScrub={(p) => {
          setTime(p * (duration || 0));
        }}
        onScrubEnd={(p) => {
          scrubTo(p);
          setScrubbing(false);
        }}
      />

      {/* Time */}
      <div
        style={{
          fontFamily: "var(--mono, monospace)",
          fontSize: 11,
          fontWeight: 700,
          color: "var(--ink2, #4b5563)",
          minWidth: 64,
          textAlign: "right",
          whiteSpace: "nowrap",
        }}
      >
        {fmt(time)} / {fmt(duration)}
      </div>

      {/* Speed */}
      <button
        type="button"
        onClick={changeRate}
        aria-label="Toggle slow speed"
        style={{
          padding: "5px 9px",
          borderRadius: 999,
          border: "2px solid var(--ink, #1f2937)",
          background: rate === 1 ? "var(--cream, #fff8ee)" : "var(--berry, #c45a8a)",
          color: rate === 1 ? "var(--ink, #1f2937)" : "#fff",
          fontWeight: 800,
          fontSize: 11,
          cursor: "pointer",
          fontFamily: "var(--mono, monospace)",
          flexShrink: 0,
        }}
      >
        {rate === 1 ? "1×" : "¾×"}
      </button>
    </div>
  );
});

function fmt(seconds: number): string {
  if (!Number.isFinite(seconds) || seconds < 0) return "0:00";
  const m = Math.floor(seconds / 60);
  const s = Math.floor(seconds % 60);
  return `${m}:${s.toString().padStart(2, "0")}`;
}

// ─────────────────────────────────────────────────────────────────────────
// Scrub bar — pointer-driven, no underlying <input range>
// ─────────────────────────────────────────────────────────────────────────

function ScrubBar({
  pct,
  onScrubStart,
  onScrub,
  onScrubEnd,
}: {
  pct: number;
  onScrubStart: () => void;
  onScrub: (pct: number) => void;
  onScrubEnd: (pct: number) => void;
}) {
  const ref = useRef<HTMLDivElement | null>(null);
  const draggingRef = useRef(false);

  function pctFromEvent(e: React.PointerEvent | PointerEvent): number {
    if (!ref.current) return 0;
    const rect = ref.current.getBoundingClientRect();
    const x = ("clientX" in e ? e.clientX : 0) - rect.left;
    return Math.max(0, Math.min(1, x / rect.width));
  }

  function onDown(e: React.PointerEvent) {
    e.preventDefault();
    draggingRef.current = true;
    onScrubStart();
    const p = pctFromEvent(e);
    onScrub(p);
    ref.current?.setPointerCapture(e.pointerId);
  }
  function onMove(e: React.PointerEvent) {
    if (!draggingRef.current) return;
    onScrub(pctFromEvent(e));
  }
  function onUp(e: React.PointerEvent) {
    if (!draggingRef.current) return;
    draggingRef.current = false;
    onScrubEnd(pctFromEvent(e));
  }

  return (
    <div
      ref={ref}
      onPointerDown={onDown}
      onPointerMove={onMove}
      onPointerUp={onUp}
      onPointerCancel={onUp}
      style={{
        flex: 1,
        height: 28,
        position: "relative",
        cursor: "pointer",
        touchAction: "none",
        display: "flex",
        alignItems: "center",
      }}
    >
      <div
        style={{
          height: 8,
          width: "100%",
          background: "rgba(31,41,55,0.12)",
          borderRadius: 999,
          overflow: "hidden",
          position: "relative",
        }}
      >
        <div
          style={{
            height: "100%",
            width: `${pct * 100}%`,
            background:
              "linear-gradient(90deg, var(--gold, #d4a853), var(--berry, #c45a8a))",
            transition: "width 50ms linear",
          }}
        />
      </div>
      {/* Thumb */}
      <div
        style={{
          position: "absolute",
          left: `calc(${pct * 100}% - 9px)`,
          top: 5,
          width: 18,
          height: 18,
          borderRadius: "50%",
          background: "var(--ink, #1f2937)",
          border: "2px solid var(--cream, #fff8ee)",
          boxShadow: "0 2px 4px rgba(0,0,0,0.3)",
          pointerEvents: "none",
          transition: "left 50ms linear",
        }}
      />
    </div>
  );
}

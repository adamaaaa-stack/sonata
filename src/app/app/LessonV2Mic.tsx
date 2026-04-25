"use client";
/**
 * MicListenCard — real-piano play-along UI.
 *
 * Routes detection to one of two engines based on the `polyphonic` prop:
 *   - false / default: Pitchy (McLeod, monophonic, ~10ms latency, 5KB)
 *   - true: Spotify Basic Pitch (TF.js neural net, polyphonic, ~250-500ms
 *     latency, ~3-5MB lazy-loaded). Used on chord pages where Pitchy
 *     can't disambiguate stacked notes.
 *
 * Both engines expose start/stop/setSensitivity and emit `onNote(midi)`
 * events — they're swapped via a shared structural type so the rest of
 * the lesson code is unchanged.
 *
 * No audio is regenerated for this feature; the on-screen prompt is the
 * only instruction the student gets.
 */
import React, { useEffect, useRef, useState } from "react";
import { MicPitchDetector, NOTES } from "@/lib/music";

// Minimal structural type both detectors satisfy.
interface DetectorLike {
  start(): Promise<void>;
  stop(): void;
  setSensitivity(s: number): void;
}

interface MicListenCardProps {
  /** Fires when a stable note is detected. Same shape as on-screen press. */
  onNote: (midi: number) => void;
  /** What MIDI is the student supposed to play next? Used for hints. */
  expectedMidi?: number | null;
  /** Tightens detection range to nearby notes (lesson-specific keyboard). */
  minMidi?: number;
  maxMidi?: number;
  /** Optional explicit prompt text. Defaults to "Play this on your piano". */
  promptText?: string;
  /**
   * If true, use Spotify Basic Pitch (polyphonic, slower). If false or
   * undefined, use Pitchy (monophonic, fast). Switch on chord pages.
   */
  polyphonic?: boolean;
}

function midiToName(m: number): string {
  return `${NOTES[m % 12]}${Math.floor(m / 12) - 1}`;
}

export function MicListenCard({
  onNote,
  expectedMidi,
  minMidi,
  maxMidi,
  promptText,
  polyphonic = false,
}: MicListenCardProps) {
  const [listening, setListening] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [level, setLevel] = useState(0);
  const [lastHeard, setLastHeard] = useState<number | null>(null);
  // Sensitivity persists across pages. We MUST initialise to the same value
  // server-side and client-side, otherwise React throws hydration errors
  // (#425/#418/#423) and the page can freeze. Read localStorage in an
  // effect after mount, not during initial render.
  const [sensitivity, setSensitivity] = useState<number>(0.5);
  const sensitivityRef = useRef(sensitivity);
  sensitivityRef.current = sensitivity;
  useEffect(() => {
    if (typeof window === "undefined") return;
    const stored = window.localStorage.getItem("sonata.mic.sensitivity");
    const n = stored ? parseFloat(stored) : 0.5;
    if (Number.isFinite(n)) {
      const clamped = Math.min(1, Math.max(0, n));
      setSensitivity(clamped);
      sensitivityRef.current = clamped;
    }
  }, []);
  const detectorRef = useRef<DetectorLike | null>(null);
  // Status string ("loading model", etc) — only used in polyphonic mode.
  const [status, setStatus] = useState<string | null>(null);

  useEffect(() => {
    return () => {
      detectorRef.current?.stop();
      detectorRef.current = null;
    };
  }, []);

  // Auto-start when the user has previously consented to mic access.
  // Tracked in localStorage so consent persists across pages/reloads.
  // First-time experience: user taps the "🎤 Listen" button; on success
  // we set sonata.mic.consent=yes; from then on, every play / mastery
  // page that mounts a MicListenCard auto-starts immediately. They can
  // still tap Stop to pause.
  // The `polyphonic` flag is in the deps because chord pages need the
  // big TF.js model — we want a fresh start when the page swaps engines.
  // eslint-disable-next-line react-hooks/exhaustive-deps
  useEffect(() => {
    if (typeof window === "undefined") return;
    if (listening) return; // already running
    const consent = window.localStorage.getItem("sonata.mic.consent");
    if (consent !== "yes") return;
    // Defer one tick so the rest of the page mounts first — keeps the
    // mic-prompt-on-iOS noise off the critical path.
    const t = window.setTimeout(() => {
      void startListening();
    }, 100);
    return () => window.clearTimeout(t);
  }, [polyphonic]);

  async function startListening() {
    setError(null);
    let det: DetectorLike;
    if (polyphonic) {
      // Lazy-load the Basic Pitch module (and its TF.js dep) only when the
      // student actually clicks Listen on a chord page. Avoids paying the
      // multi-MB JS cost on monophonic lessons.
      setStatus("loading model…");
      try {
        const mod = await import("@/lib/music/basicPitchDetector");
        det = new mod.BasicPitchDetector({
          onNote: (e) => {
            setLastHeard(e.midi);
            onNote(e.midi);
          },
          onLevel: (rms) => setLevel(rms),
          onStatus: (s) => {
            if (s === "loading") setStatus("loading model…");
            else if (s === "ready") setStatus(null);
            else if (s === "error") setStatus(null);
          },
          onError: (err) => {
            setError(err.message || "Microphone access failed");
            setListening(false);
            setStatus(null);
          },
          minMidi,
          maxMidi,
          sensitivity: sensitivityRef.current,
        });
      } catch (e) {
        setError(
          e instanceof Error
            ? `Polyphonic engine failed to load: ${e.message}`
            : "Polyphonic engine failed to load"
        );
        setStatus(null);
        return;
      }
    } else {
      det = new MicPitchDetector({
        onNote: (e) => {
          setLastHeard(e.midi);
          onNote(e.midi);
        },
        onLevel: (rms) => setLevel(rms),
        onError: (err) => {
          setError(err.message || "Microphone access failed");
          setListening(false);
        },
        minMidi,
        maxMidi,
        sensitivity: sensitivityRef.current,
      });
    }
    detectorRef.current = det;
    try {
      await det.start();
      setListening(true);
      // Permission granted → remember it so future pages auto-listen.
      if (typeof window !== "undefined") {
        window.localStorage.setItem("sonata.mic.consent", "yes");
      }
    } catch {
      // onError already handled it. Don't persist consent on failure.
    }
  }

  function changeSensitivity(s: number) {
    setSensitivity(s);
    detectorRef.current?.setSensitivity(s);
    if (typeof window !== "undefined") {
      window.localStorage.setItem("sonata.mic.sensitivity", String(s));
    }
  }

  function stopListening() {
    detectorRef.current?.stop();
    detectorRef.current = null;
    setListening(false);
    setLevel(0);
  }

  // Visual level meter — clamp 0..1, expand the dynamic range we care about.
  const meterPct = Math.min(100, Math.max(0, level * 600));

  return (
    <div
      style={{
        width: "100%",
        background: listening ? "var(--cream, #fff8ee)" : "var(--parchment, #faf6ef)",
        border: `3px solid ${listening ? "#16a34a" : "var(--ink, #1f2937)"}`,
        borderRadius: 16,
        padding: "clamp(12px, 3vw, 16px)",
        display: "flex",
        flexDirection: "column",
        gap: 10,
        transition: "border-color 0.2s, background 0.2s",
      }}
    >
      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          gap: 12,
        }}
      >
        <div
          style={{
            fontSize: 11,
            letterSpacing: "0.2em",
            fontWeight: 800,
            color: listening ? "#16a34a" : "var(--ink3, #6b7280)",
            display: "flex",
            alignItems: "center",
            gap: 6,
          }}
        >
          <span>
            {status
              ? status.toUpperCase()
              : listening
              ? "● LISTENING"
              : "USE REAL PIANO"}
          </span>
          {polyphonic && (
            <span
              title="Chord-capable engine (slower, polyphonic)"
              style={{
                padding: "2px 6px",
                borderRadius: 8,
                background: "rgba(212,168,83,0.15)",
                color: "var(--berry, #d4a853)",
                border: "1px solid var(--berry, #d4a853)",
                fontSize: 9,
                letterSpacing: "0.1em",
              }}
            >
              POLY
            </span>
          )}
        </div>
        <button
          type="button"
          onClick={listening ? stopListening : startListening}
          style={{
            padding: "8px 14px",
            border: "2px solid var(--ink, #1f2937)",
            borderRadius: 999,
            background: listening ? "#fecaca" : "var(--berry, #d4a853)",
            color: "var(--ink, #1f2937)",
            fontWeight: 900,
            fontSize: 13,
            cursor: "pointer",
            boxShadow: "0 2px 0 var(--ink, #1f2937)",
            display: "flex",
            alignItems: "center",
            gap: 6,
          }}
        >
          {listening ? "■ Stop" : "🎤 Listen"}
        </button>
      </div>

      <div
        style={{
          fontFamily: "Georgia, serif",
          fontSize: "clamp(13px, 3.5vw, 15px)",
          lineHeight: 1.4,
          color: "var(--ink, #1f2937)",
        }}
      >
        {promptText || "Play this on your piano (acoustic or digital)."}
        {expectedMidi != null && (
          <>
            {" "}
            <span style={{ fontWeight: 800 }}>
              Next note: {midiToName(expectedMidi)}
            </span>
          </>
        )}
      </div>

      {listening && (
        <>
          {/* Level meter */}
          <div
            style={{
              width: "100%",
              height: 8,
              background: "rgba(0,0,0,0.08)",
              borderRadius: 999,
              overflow: "hidden",
            }}
          >
            <div
              style={{
                width: `${meterPct}%`,
                height: "100%",
                background:
                  meterPct > 80
                    ? "#dc2626"
                    : meterPct > 30
                    ? "#16a34a"
                    : "#9ca3af",
                transition: "width 0.05s linear, background 0.1s",
              }}
            />
          </div>
          <div
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              gap: 8,
            }}
          >
            <div
              style={{
                fontSize: 11,
                color: "var(--ink3, #6b7280)",
                fontStyle: "italic",
              }}
            >
              {lastHeard != null
                ? `Heard: ${midiToName(lastHeard)}`
                : "Play a note…"}
            </div>
            <div
              style={{
                display: "flex",
                alignItems: "center",
                gap: 6,
                fontSize: 10,
                color: "var(--ink3, #6b7280)",
              }}
            >
              <span style={{ fontWeight: 700 }}>Mic</span>
              <input
                type="range"
                min={0}
                max={1}
                step={0.05}
                value={sensitivity}
                onChange={(e) => changeSensitivity(parseFloat(e.target.value))}
                style={{ width: 80 }}
                aria-label="Microphone sensitivity"
              />
              <span style={{ fontWeight: 700, minWidth: 24 }}>
                {Math.round(sensitivity * 100)}
              </span>
            </div>
          </div>
        </>
      )}

      {error && (
        <div
          style={{
            fontSize: 12,
            color: "#dc2626",
            background: "rgba(220,38,38,0.08)",
            padding: 8,
            borderRadius: 8,
          }}
        >
          {error}. Tap the lock icon in the address bar to allow microphone
          access, then try again.
        </div>
      )}
    </div>
  );
}

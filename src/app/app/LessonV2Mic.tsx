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

  // Auto-start the mic ONLY if the user has previously granted permission
  // (consent flag stored in localStorage). On the very first mic-needing
  // page, we require an explicit tap on the "Tap to start listening"
  // button — otherwise iOS WKWebView shows a native permission dialog
  // that freezes the WebView mid-render, looking like the app crashed.
  //
  // After the first successful tap, the consent flag is set and every
  // subsequent play page auto-starts the mic without UI friction.
  // eslint-disable-next-line react-hooks/exhaustive-deps
  useEffect(() => {
    if (typeof window === "undefined") return;
    if (listening) return;
    const consent = window.localStorage.getItem("sonata.mic.consent");
    if (consent === "yes") {
      void startListening();
    }
    // Else: show the tap-to-enable UI, wait for the student.
  }, [polyphonic]);

  async function startListening() {
    setError(null);
    // Show "asking for permission" status the moment we begin — iOS shows a
    // native prompt that pauses the JS thread until the user taps Allow,
    // and without this the page looks frozen for the duration.
    const consentAlready =
      typeof window !== "undefined" &&
      window.localStorage.getItem("sonata.mic.consent") === "yes";
    if (!consentAlready) setStatus("asking for mic permission…");
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
      setStatus(null);
      // Permission granted → remember it so future pages auto-listen.
      if (typeof window !== "undefined") {
        window.localStorage.setItem("sonata.mic.consent", "yes");
      }
    } catch {
      setStatus(null);
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

  // Has the student previously granted mic permission for this app? When
  // false, we show a big tap-to-enable card instead of the tiny pill —
  // iOS WKWebView's permission prompt freezes the WebView, and a small
  // pill leaves the student wondering why the app went dead.
  const [hasConsent, setHasConsent] = useState(false);
  useEffect(() => {
    if (typeof window === "undefined") return;
    setHasConsent(
      window.localStorage.getItem("sonata.mic.consent") === "yes"
    );
  }, [listening]);

  // Has the student opted out of mic for this session? We persist a "skip"
  // flag so the lesson never re-prompts them. They can still tap the pill
  // to enable mic later.
  const [skipped, setSkipped] = useState(false);
  useEffect(() => {
    if (typeof window === "undefined") return;
    setSkipped(window.localStorage.getItem("sonata.mic.skip") === "yes");
  }, []);

  function skipMic() {
    if (typeof window !== "undefined") {
      window.localStorage.setItem("sonata.mic.skip", "yes");
    }
    setSkipped(true);
  }

  function unskipMic() {
    if (typeof window !== "undefined") {
      window.localStorage.removeItem("sonata.mic.skip");
    }
    setSkipped(false);
  }

  // First-run "tap to enable mic" card. Renders before any tiny pill UI so
  // the student sees a clear, large target on the first play page. Hidden
  // if the student has chosen to skip mic for this session.
  const showFirstRunCard =
    !hasConsent && !listening && !status && !error && !skipped;

  // Compact pill-style indicator. The big Listen button is gone — auto-start
  // covers the common case. The pill is interactive: tap to stop/restart.
  const pillBg = listening
    ? "rgba(22,163,74,0.10)"
    : status
    ? "rgba(212,168,83,0.10)"
    : error
    ? "rgba(220,38,38,0.10)"
    : "rgba(107,114,128,0.10)";
  const pillBorder = listening
    ? "#16a34a"
    : status
    ? "var(--berry, #d4a853)"
    : error
    ? "#dc2626"
    : "rgba(0,0,0,0.15)";
  const pillFg = listening
    ? "#16a34a"
    : status
    ? "var(--berry, #d4a853)"
    : error
    ? "#dc2626"
    : "var(--ink3, #6b7280)";

  return (
    <div
      style={{
        width: "100%",
        display: "flex",
        flexDirection: "column",
        gap: 8,
      }}
    >
      {/* Prompt — what the student is supposed to play */}
      <div
        style={{
          fontFamily: "Georgia, serif",
          fontSize: "clamp(14px, 3.5vw, 16px)",
          lineHeight: 1.35,
          color: "var(--ink, #1f2937)",
          fontWeight: 700,
        }}
      >
        {promptText || "Play this on your piano."}
        {expectedMidi != null && (
          <>
            {" "}
            <span style={{ fontWeight: 800, color: "var(--berry, #d4a853)" }}>
              ({midiToName(expectedMidi)})
            </span>
          </>
        )}
      </div>

      {/* First-run tap-to-enable card. Shown once, on the first play page
          where the student has not yet granted mic permission. iOS shows
          a native permission prompt that freezes the WebView; without
          this card the student sees a tiny grey pill and assumes the
          app is broken. */}
      {showFirstRunCard && (
        <div
          style={{
            display: "flex",
            flexDirection: "column",
            gap: 10,
            padding: "18px 22px",
            border: "3px solid var(--ink, #1f2937)",
            borderRadius: 16,
            background: "var(--gold, #d4a853)",
            color: "var(--ink, #1f2937)",
            fontFamily: "var(--sans, system-ui)",
            boxShadow: "0 4px 0 var(--ink, #1f2937)",
            width: "100%",
            textAlign: "center",
          }}
        >
          <button
            type="button"
            onClick={() => void startListening()}
            style={{
              background: "transparent",
              border: "none",
              cursor: "pointer",
              padding: 0,
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              gap: 6,
              color: "inherit",
              fontFamily: "inherit",
            }}
          >
            <div
              style={{
                fontSize: 22,
                fontWeight: 900,
                letterSpacing: "-0.01em",
              }}
            >
              🎤 Tap to enable your microphone
            </div>
            <div
              style={{
                fontSize: 13,
                fontWeight: 600,
                opacity: 0.85,
                maxWidth: 420,
                lineHeight: 1.4,
              }}
            >
              Sonata listens to your real piano. Your iPad will pop up a
              permission dialog — tap Allow. The screen may pause for a
              moment while it appears.
            </div>
          </button>
          <button
            type="button"
            onClick={skipMic}
            style={{
              alignSelf: "center",
              marginTop: 4,
              background: "rgba(0,0,0,0.08)",
              border: "1.5px solid rgba(0,0,0,0.4)",
              borderRadius: 999,
              padding: "5px 12px",
              fontSize: 11,
              fontWeight: 700,
              cursor: "pointer",
              color: "var(--ink, #1f2937)",
              letterSpacing: "0.08em",
            }}
          >
            SKIP MIC FOR NOW
          </button>
        </div>
      )}

      {/* Once skipped, render a thin "mic skipped — tap to enable" link so
          the student can opt back in later without restarting the lesson. */}
      {skipped && !listening && (
        <button
          type="button"
          onClick={() => {
            unskipMic();
            void startListening();
          }}
          style={{
            background: "transparent",
            border: "1.5px dashed rgba(0,0,0,0.25)",
            borderRadius: 10,
            padding: "8px 12px",
            fontSize: 12,
            fontWeight: 700,
            color: "var(--ink3, #6b7280)",
            cursor: "pointer",
            alignSelf: "flex-start",
          }}
        >
          🎤 Mic skipped — tap to enable
        </button>
      )}

      {/* Status pill — small, clickable to stop/start, replaces the
          giant Listen button. Always visible so the student knows mic state. */}
      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: 8,
          flexWrap: "wrap",
        }}
      >
        <button
          type="button"
          onClick={listening ? stopListening : startListening}
          style={{
            padding: "4px 10px",
            border: `1.5px solid ${pillBorder}`,
            borderRadius: 999,
            background: pillBg,
            color: pillFg,
            fontWeight: 800,
            fontSize: 11,
            letterSpacing: "0.1em",
            cursor: "pointer",
            display: "flex",
            alignItems: "center",
            gap: 4,
          }}
          title={listening ? "Tap to mute mic" : "Tap to enable mic"}
        >
          {status ? (
            <>⏳ {status.toUpperCase()}</>
          ) : listening ? (
            <>● LISTENING{lastHeard != null ? ` · ${midiToName(lastHeard)}` : ""}</>
          ) : error ? (
            <>⚠ MIC ERROR — TAP TO RETRY</>
          ) : (
            <>🎤 TAP TO ENABLE MIC</>
          )}
        </button>

        {polyphonic && (
          <span
            title="Chord-capable engine (slower, polyphonic)"
            style={{
              padding: "3px 6px",
              borderRadius: 999,
              background: "rgba(212,168,83,0.15)",
              color: "var(--berry, #d4a853)",
              border: "1px solid var(--berry, #d4a853)",
              fontSize: 9,
              letterSpacing: "0.1em",
              fontWeight: 800,
            }}
          >
            POLY
          </span>
        )}

        {/* Compact level meter — only when listening */}
        {listening && (
          <div
            style={{
              flex: 1,
              minWidth: 60,
              maxWidth: 120,
              height: 4,
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
        )}

        {listening && (
          <details style={{ marginLeft: "auto" }}>
            <summary
              style={{
                fontSize: 10,
                color: "var(--ink3, #6b7280)",
                cursor: "pointer",
                userSelect: "none",
              }}
            >
              ⚙
            </summary>
            <div
              style={{
                position: "absolute",
                background: "var(--cream, #fff8ee)",
                border: "1px solid var(--ink, #1f2937)",
                borderRadius: 8,
                padding: "6px 10px",
                display: "flex",
                alignItems: "center",
                gap: 6,
                fontSize: 10,
                color: "var(--ink3, #6b7280)",
                marginTop: 4,
                zIndex: 10,
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
                style={{ width: 70 }}
                aria-label="Microphone sensitivity"
              />
              <span style={{ fontWeight: 700, minWidth: 24 }}>
                {Math.round(sensitivity * 100)}
              </span>
            </div>
          </details>
        )}
      </div>

      {error && (
        <div
          style={{
            fontSize: 11,
            color: "#dc2626",
            fontStyle: "italic",
          }}
        >
          {error}
        </div>
      )}
    </div>
  );
}

"use client";
/**
 * MicListenCard — UI affordance that lets a student perform a play-page
 * exercise on their real piano (acoustic or digital) using microphone
 * pitch detection (Pitchy / McLeod method).
 *
 * Drops onto play pages alongside SequenceProgress. When the student taps
 * "🎤 Use real piano", we:
 *   1. ask for mic permission
 *   2. start MicPitchDetector
 *   3. forward each detected MIDI note to onNote() — same callback as
 *      clicking the on-screen keyboard, so the existing grader handles it
 *
 * No audio is regenerated for this feature; the prompt text on screen
 * is the only instruction the student gets ("Play this on your piano").
 */
import React, { useEffect, useRef, useState } from "react";
import { MicPitchDetector } from "@/lib/music";
import { NOTES } from "@/lib/music";

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
}: MicListenCardProps) {
  const [listening, setListening] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [level, setLevel] = useState(0);
  const [lastHeard, setLastHeard] = useState<number | null>(null);
  const detectorRef = useRef<MicPitchDetector | null>(null);

  useEffect(() => {
    return () => {
      detectorRef.current?.stop();
      detectorRef.current = null;
    };
  }, []);

  async function startListening() {
    setError(null);
    const det = new MicPitchDetector({
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
    });
    detectorRef.current = det;
    try {
      await det.start();
      setListening(true);
    } catch {
      // onError already handled it
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
          }}
        >
          {listening ? "● LISTENING" : "USE REAL PIANO"}
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
              fontSize: 11,
              color: "var(--ink3, #6b7280)",
              fontStyle: "italic",
            }}
          >
            {lastHeard != null
              ? `Heard: ${midiToName(lastHeard)}`
              : "Play a note…"}
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

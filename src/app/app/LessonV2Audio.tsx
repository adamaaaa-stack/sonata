"use client";
/**
 * LessonV2 audio-sample playback.
 *
 * Lesson YAMLs have `audio:` blocks with free-form descriptions like
 *   audio:
 *     A: "C-D-E ascending"
 *     B: "Moonlight Sonata opening"
 *
 * These were doing nothing — just text on the page. This file parses each
 * description into a playable note sequence (via a simple rules engine +
 * a small catalog of named tunes) and renders a "♪ Play sample" button
 * that triggers real piano playback through the shared music engine.
 */
import React, { useEffect, useMemo, useRef } from "react";
import { playNotes, noteToMidi as libNoteToMidi } from "@/lib/music";

// ---------- Named-tune catalog ----------
// Short snippets of famous melodies. Keys lowercased, matched via substring.
const NAMED_TUNES: Record<string, string[]> = {
  "twinkle twinkle": ["C4","C4","G4","G4","A4","A4","G4","F4","F4","E4","E4","D4","D4","C4"],
  "twinkle": ["C4","C4","G4","G4","A4","A4","G4","F4","F4","E4","E4","D4","D4","C4"],
  "für elise": ["E5","D#5","E5","D#5","E5","B4","D5","C5","A4"],
  "fur elise": ["E5","D#5","E5","D#5","E5","B4","D5","C5","A4"],
  "moonlight sonata": ["C#4","E4","G#4","C#4","E4","G#4","C#4","E4","G#4"],
  "ode to joy": ["E4","E4","F4","G4","G4","F4","E4","D4","C4","C4","D4","E4","E4","D4","D4"],
  "hot cross buns": ["E4","D4","C4","E4","D4","C4","C4","C4","C4","C4","D4","D4","D4","D4","E4","D4","C4"],
  "happy birthday": ["G4","G4","A4","G4","C5","B4","G4","G4","A4","G4","D5","C5"],
  "mary had a little lamb": ["E4","D4","C4","D4","E4","E4","E4"],
  "jingle bells": ["E4","E4","E4","E4","E4","E4","E4","G4","C4","D4","E4"],
  "amazing grace": ["D4","G4","B4","G4","B4","A4","G4","B4"],
  "clair de lune": ["A4","F#4","A4","F#4","E4","D4"],
  "canon in d": ["D4","A4","B4","F#4","G4","D4","G4","A4"],
  "gymnopédie": ["F#4","A4","D5","F#5","A4","D5","F#5"],
  "gymnopedie": ["F#4","A4","D5","F#5","A4","D5","F#5"],
  "minuet in g": ["D5","G4","A4","B4","C5","D5","G4","G4"],
  "the entertainer": ["D5","B4","D5","E5","C5"],
  "bach invention": ["C4","D4","E4","F4","D4","E4","C4"],
  "nocturne": ["Bb4","G4","Bb4","Ab4","G4","Ab4","Bb4"],
  "prelude in c": ["C4","E4","G4","C5","E5"],
};

// ---------- Chord literals ----------
const CHORD_MAP: Record<string, string[]> = {
  "c major": ["C4","E4","G4"],
  "c minor": ["C4","D#4","G4"],
  "d major": ["D4","F#4","A4"],
  "d minor": ["D4","F4","A4"],
  "e major": ["E4","G#4","B4"],
  "e minor": ["E4","G4","B4"],
  "f major": ["F4","A4","C5"],
  "f minor": ["F4","G#4","C5"],
  "g major": ["G4","B4","D5"],
  "g minor": ["G4","A#4","D5"],
  "a major": ["A4","C#5","E5"],
  "a minor": ["A4","C5","E5"],
  "b minor": ["B4","D5","F#5"],
};

function safeNoteToMidi(t: string): number | null {
  try {
    const m = libNoteToMidi(t);
    return Number.isFinite(m) ? m : null;
  } catch {
    return null;
  }
}

/**
 * Turn a description into a list of note strings to play.
 * Returns null if nothing parseable was found.
 */
export function parseAudioToNotes(desc: string | undefined): string[] | null {
  if (!desc) return null;
  const lower = desc.toLowerCase();

  // 1) Named tune substring match
  for (const [name, notes] of Object.entries(NAMED_TUNES)) {
    if (lower.includes(name)) {
      return [...notes];
    }
  }

  // 2) Chord match
  for (const [name, notes] of Object.entries(CHORD_MAP)) {
    if (lower.includes(name + " chord") || lower.includes(name + " triad")) {
      return [...notes];
    }
  }

  // 3) Note sequence — try two strategies in order:
  //    (a) "C-E-G", "C D E F" — 2+ note tokens chained by dashes/spaces.
  //        In this context bare single letters ARE notes, so accept them.
  //    (b) Strict per-token scan that REQUIRES accidental or octave to
  //        avoid false positives in prose like "A bright chord".

  const normalized = desc
    .replace(/middle\s*c/gi, "C4")
    .replace(/high\s*c/gi, "C5")
    .replace(/low\s*c/gi, "C3")
    .replace(/\b([A-G])[-\s]?sharp\b/gi, "$1#")
    .replace(/\b([A-G])[-\s]?flat\b/gi, "$1b");

  // (a) chained-note pattern: at least 2 separators → 3+ notes
  const seqMatch = normalized.match(
    /\b[A-G](?:#|b)?[2-7]?(?:[\s\-—]+[A-G](?:#|b)?[2-7]?){2,}\b/
  );
  if (seqMatch) {
    const tokens = seqMatch[0].split(/[\s\-—]+/);
    const seqNotes: string[] = [];
    for (const raw of tokens) {
      if (!/^[A-Ga-g](#|b)?[2-7]?$/.test(raw)) continue;
      const cap = raw.charAt(0).toUpperCase() + raw.slice(1);
      seqNotes.push(/\d$/.test(cap) ? cap : cap + "4");
    }
    if (seqNotes.length >= 2) {
      if (
        /\b(descending|descend|going down|downward|down the stairs)\b/i.test(desc) &&
        !/\bascending\b/i.test(desc)
      ) {
        seqNotes.reverse();
      }
      return seqNotes;
    }
  }

  // (b) strict per-token scan
  const tokens = normalized.split(/[\s,\-—_]+/);
  const notes: string[] = [];
  for (const raw of tokens) {
    const t = raw.trim();
    if (!/^[A-Ga-g](#|b)?[2-7]?$/.test(t)) continue;
    if (t.length < 2) continue; // skip bare capitals in prose
    notes.push(t.charAt(0).toUpperCase() + t.slice(1));
  }

  if (notes.length === 0) return null;

  const withOctaves = notes.map((n) => (/\d$/.test(n) ? n : n + "4"));

  if (
    /\b(descending|descend|going down|downward|down the stairs)\b/i.test(desc) &&
    !/\bascending\b/i.test(desc)
  ) {
    withOctaves.reverse();
  }

  return withOctaves;
}

export function playAudioDescription(desc: string, speed = 0.4) {
  const notes = parseAudioToNotes(desc);
  if (!notes) return false;
  const midis = notes.map(safeNoteToMidi).filter((n): n is number => n != null);
  if (midis.length === 0) return false;
  playNotes(midis, speed);
  return true;
}

// ---------- Sample-bar component ----------

export function AudioSamples({
  audio,
  autoPlayFirst = false,
}: {
  audio: Record<string, string>;
  autoPlayFirst?: boolean;
}) {
  const entries = useMemo(() => Object.entries(audio), [audio]);
  const played = useRef(false);

  useEffect(() => {
    played.current = false;
  }, [audio]);

  useEffect(() => {
    if (!autoPlayFirst || played.current) return;
    const first = entries[0];
    if (!first) return;
    const t = setTimeout(() => {
      playAudioDescription(first[1], 0.45);
      played.current = true;
    }, 500);
    return () => clearTimeout(t);
  }, [autoPlayFirst, entries]);

  if (entries.length === 0) return null;

  return (
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        gap: 8,
        width: "100%",
        background: "var(--parchment, #faf6ef)",
        border: "2px solid var(--ink, #1f2937)",
        borderRadius: 12,
        padding: 12,
      }}
    >
      <div
        style={{
          fontSize: 11,
          letterSpacing: "0.2em",
          fontWeight: 800,
          color: "var(--ink3, #6b7280)",
        }}
      >
        LISTEN
      </div>
      {entries.map(([key, desc]) => {
        const canPlay = parseAudioToNotes(desc) != null;
        return (
          <button
            key={key}
            type="button"
            onClick={() => canPlay && playAudioDescription(desc, 0.4)}
            disabled={!canPlay}
            style={{
              display: "flex",
              alignItems: "center",
              gap: 10,
              padding: "10px 14px",
              border: "2px solid var(--ink, #1f2937)",
              borderRadius: 10,
              background: canPlay ? "var(--cream, #fff8ee)" : "rgba(0,0,0,0.04)",
              cursor: canPlay ? "pointer" : "not-allowed",
              textAlign: "left",
              fontFamily: "Georgia, serif",
              fontSize: 14,
              opacity: canPlay ? 1 : 0.5,
            }}
          >
            <span style={{ fontWeight: 900, color: "var(--berry, #d4a853)" }}>
              {canPlay ? "♪" : "·"}
            </span>
            <span style={{ fontWeight: 800, minWidth: 20 }}>{key}</span>
            <span style={{ flex: 1, fontStyle: "italic" }}>{desc}</span>
          </button>
        );
      })}
    </div>
  );
}

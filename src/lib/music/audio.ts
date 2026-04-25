// ============================================================
// AUDIO — Proper polyphonic piano via Tone.js Sampler
// Loads Salamander Grand Piano samples from the Tone.js CDN.
// These are real recordings of a Yamaha C5 grand, not a synth,
// and Tone.Sampler handles polyphony + proper release correctly.
// Falls back to a custom synth only if samples fail to load.
// ============================================================
import type * as ToneT from 'tone';

let toneMod: typeof ToneT | null = null;
// eslint-disable-next-line @typescript-eslint/no-explicit-any
let sampler: any = null;
let pianoLoadingPromise: Promise<void> | null = null;
let pianoReady = false;

// We expose an AudioContext for effects.ts and visualizers. On web this is
// Tone's context once it's created; otherwise a plain one we make ourselves
// and later hand to Tone.
let audioCtx: AudioContext | null = null;
export function getAudioCtx(): AudioContext {
  if (!audioCtx) audioCtx = new (window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext)();
  return audioCtx;
}

export function isPianoReady(): boolean { return pianoReady; }

// Precomputed note frequencies for MIDI 21-108
export const NOTE_FREQS: Record<number, number> = {};
for (let m = 21; m <= 108; m++) {
  NOTE_FREQS[m] = 440 * Math.pow(2, (m - 69) / 12);
}

const MIDI_NOTES = ['C','C#','D','D#','E','F','F#','G','G#','A','A#','B'];
function midiToNoteName(midi: number): string {
  return MIDI_NOTES[midi % 12] + (Math.floor(midi / 12) - 1);
}

// Sparse sample set — Tone.Sampler interpolates between these.
// Salamander Grand Piano (CC-BY-3.0), hosted by the Tone.js project.
// URLs follow the pattern: https://tonejs.github.io/audio/salamander/<note>.mp3
const SALAMANDER_BASE = 'https://tonejs.github.io/audio/salamander/';
const SALAMANDER_NOTES: Record<string, string> = {
  'A0':  'A0.mp3',
  'C1':  'C1.mp3',  'D#1': 'Ds1.mp3', 'F#1': 'Fs1.mp3', 'A1':  'A1.mp3',
  'C2':  'C2.mp3',  'D#2': 'Ds2.mp3', 'F#2': 'Fs2.mp3', 'A2':  'A2.mp3',
  'C3':  'C3.mp3',  'D#3': 'Ds3.mp3', 'F#3': 'Fs3.mp3', 'A3':  'A3.mp3',
  'C4':  'C4.mp3',  'D#4': 'Ds4.mp3', 'F#4': 'Fs4.mp3', 'A4':  'A4.mp3',
  'C5':  'C5.mp3',  'D#5': 'Ds5.mp3', 'F#5': 'Fs5.mp3', 'A5':  'A5.mp3',
  'C6':  'C6.mp3',  'D#6': 'Ds6.mp3', 'F#6': 'Fs6.mp3', 'A6':  'A6.mp3',
  'C7':  'C7.mp3',  'D#7': 'Ds7.mp3', 'F#7': 'Fs7.mp3', 'A7':  'A7.mp3',
  'C8':  'C8.mp3',
};

// ============================================================
// LOAD SAMPLED PIANO — Tone.Sampler with Salamander Grand Piano
// ============================================================
export function loadPianoSamples(): Promise<void> {
  if (pianoReady) return Promise.resolve();
  if (pianoLoadingPromise) return pianoLoadingPromise;

  pianoLoadingPromise = (async () => {
    try {
      const Tone = await import('tone');
      toneMod = Tone;

      // Make sure our shared AudioContext matches Tone's so effects.ts
      // and Tone both write into the same audio graph.
      try {
        const ctx = getAudioCtx();
        Tone.setContext(ctx);
        if (ctx.state === 'suspended') await ctx.resume();
      } catch {}
      try { await Tone.start(); } catch {}

      // Create the sampler and wait for all samples to load.
      sampler = new Tone.Sampler({
        urls: SALAMANDER_NOTES,
        baseUrl: SALAMANDER_BASE,
        release: 1.2,            // smooth release tail
        attack: 0,
        volume: -6,              // headroom for polyphony
      }).toDestination();

      await Tone.loaded();       // resolves when every sample is loaded
      pianoReady = true;
    } catch (e) {
      console.warn('Failed to load piano samples, using synth fallback:', e);
      pianoLoadingPromise = null;
    }
  })();
  return pianoLoadingPromise;
}

// ============================================================
// PLAY PIANO — sampled if loaded, synth fallback otherwise
// ============================================================
export function playPianoKey(midiNum: number, duration: number = 2.0): void {
  if (pianoReady && sampler) {
    try {
      sampler.triggerAttackRelease(midiToNoteName(midiNum), duration);
      return;
    } catch { /* fallback */ }
  }
  playPianoSynth(midiNum, 0.7, duration);
}

export function playNote(midiNum: number, duration: number = 0.4): void {
  if (pianoReady && sampler) {
    try {
      sampler.triggerAttackRelease(midiToNoteName(midiNum), duration);
      return;
    } catch { /* fallback */ }
  }
  playPianoSynth(midiNum, 0.5, duration);
}

export function playNotes(midiNums: number[], delay: number = 0.35): void {
  midiNums.forEach((m, i) => {
    setTimeout(() => playNote(m), i * delay * 1000);
  });
}

// ============================================================
// SYNTH FALLBACK — used only if the sampler fails to load
// Sharp attack transient + detuned sawtooth/triangle mix + fast decay
// ============================================================
function playPianoSynth(midiNum: number, velocity: number = 0.7, duration: number = 1.5, when?: number): void {
  const ctx = getAudioCtx();
  const freq = NOTE_FREQS[midiNum];
  if (!freq) return;
  const startTime = when ?? ctx.currentTime;
  const vol = velocity * 0.35;

  // Master envelope — fast attack, fast decay, short sustain, quick release
  const master = ctx.createGain();
  master.gain.setValueAtTime(0, startTime);
  master.gain.linearRampToValueAtTime(vol, startTime + 0.003);
  master.gain.exponentialRampToValueAtTime(vol * 0.35, startTime + 0.15);
  master.gain.exponentialRampToValueAtTime(vol * 0.15, startTime + 0.5);
  master.gain.exponentialRampToValueAtTime(0.0001, startTime + duration + 0.2);

  const filter = ctx.createBiquadFilter();
  filter.type = 'lowpass';
  filter.frequency.setValueAtTime(Math.min(freq * 8, 5000), startTime);
  filter.frequency.exponentialRampToValueAtTime(Math.min(freq * 4, 2500), startTime + 0.3);
  filter.Q.value = 0.5;
  filter.connect(master);
  master.connect(ctx.destination);

  const layers = [
    { type: 'triangle' as OscillatorType, detune: 0,  gain: 0.9 },
    { type: 'sawtooth' as OscillatorType, detune: -7, gain: 0.25 },
    { type: 'sawtooth' as OscillatorType, detune: +7, gain: 0.25 },
  ];
  layers.forEach(l => {
    const osc = ctx.createOscillator();
    const g = ctx.createGain();
    osc.type = l.type;
    osc.frequency.value = freq;
    osc.detune.value = l.detune;
    g.gain.value = l.gain;
    osc.connect(g); g.connect(filter);
    osc.start(startTime);
    osc.stop(startTime + duration + 0.3);
  });

  // Hammer-strike noise burst for the attack
  const noiseBuf = ctx.createBuffer(1, ctx.sampleRate * 0.05, ctx.sampleRate);
  const data = noiseBuf.getChannelData(0);
  for (let i = 0; i < data.length; i++) data[i] = (Math.random() * 2 - 1) * Math.exp(-i / (ctx.sampleRate * 0.008));
  const noise = ctx.createBufferSource();
  noise.buffer = noiseBuf;
  const noiseFilter = ctx.createBiquadFilter();
  noiseFilter.type = 'bandpass';
  noiseFilter.frequency.value = freq * 2;
  noiseFilter.Q.value = 1.5;
  const noiseGain = ctx.createGain();
  noiseGain.gain.value = vol * 0.4;
  noise.connect(noiseFilter); noiseFilter.connect(noiseGain); noiseGain.connect(ctx.destination);
  noise.start(startTime);
}

// ============================================================
// SCORE PLAYBACK ENGINE — Tone.Transport for sample-accurate timing
// ============================================================
export interface ScoreNote {
  midi: number;
  time: number;
  duration: number;
}

let scoreTimeouts: ReturnType<typeof setTimeout>[] = [];
let scorePlaying = false;

export async function playScoreNotes(notes: ScoreNote[], tempo: number = 100, onFinish?: () => void): Promise<void> {
  stopScorePlayback();
  if (notes.length === 0) return;

  // Ensure samples are loaded before scheduling anything
  await loadPianoSamples();

  const ctx = getAudioCtx();
  if (ctx.state === 'suspended') { try { await ctx.resume(); } catch {} }

  scorePlaying = true;
  // scale: at tempo 100 playback uses the natural timing. Above 100, times
  // are compressed (faster). Below 100, stretched (slower).
  const scale = 100 / tempo;
  // Small lead-in so everything is scheduled "in the future"
  const baseTime = ctx.currentTime + 0.2;

  if (pianoReady && sampler && toneMod) {
    // Direct sample-accurate scheduling — bypass Tone.Transport entirely.
    // Each note gets its own triggerAttackRelease with an absolute AudioContext
    // time, so tempo scaling actually takes effect instead of getting
    // re-interpreted as Transport-relative musical time.
    notes.forEach(n => {
      const when = baseTime + n.time * scale;
      const dur = Math.max(0.08, Math.min(n.duration * scale, 5.0));
      try {
        sampler.triggerAttackRelease(midiToNoteName(n.midi), dur, when, 0.85);
      } catch {
        playPianoSynth(n.midi, 0.55, dur, when);
      }
    });
  } else {
    // Fallback: custom synth
    notes.forEach(n => {
      const when = baseTime + n.time * scale;
      const dur = Math.max(0.08, Math.min(n.duration * scale, 5.0));
      playPianoSynth(n.midi, 0.55, dur, when);
    });
  }

  const last = notes[notes.length - 1];
  const totalMs = ((last.time + last.duration) * scale + 0.5) * 1000;
  const end = setTimeout(() => {
    scorePlaying = false;
    onFinish?.();
  }, totalMs);
  scoreTimeouts.push(end);
}

export function stopScorePlayback(): void {
  scoreTimeouts.forEach(t => clearTimeout(t));
  scoreTimeouts = [];
  if (sampler) {
    try { sampler.releaseAll?.(); } catch {}
  }
  scorePlaying = false;
}

export function isScorePlaying(): boolean { return scorePlaying; }

// ============================================================
// SOUND EFFECTS
// ============================================================
export function playCorrectSound(): void {
  const ctx = getAudioCtx();
  const now = ctx.currentTime;
  [523.25, 659.25].forEach((freq, i) => {
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = 'sine'; osc.frequency.value = freq;
    gain.gain.setValueAtTime(0.15, now + i * 0.09);
    gain.gain.exponentialRampToValueAtTime(0.001, now + i * 0.09 + 0.08);
    osc.connect(gain); gain.connect(ctx.destination);
    osc.start(now + i * 0.09); osc.stop(now + i * 0.09 + 0.08);
  });
}

export function playWrongSound(): void {
  const ctx = getAudioCtx();
  const now = ctx.currentTime;
  const osc = ctx.createOscillator();
  const gain = ctx.createGain();
  osc.type = 'sawtooth'; osc.frequency.value = 200;
  gain.gain.setValueAtTime(0.1, now);
  gain.gain.exponentialRampToValueAtTime(0.001, now + 0.15);
  osc.connect(gain); gain.connect(ctx.destination);
  osc.start(now); osc.stop(now + 0.15);
}

/**
 * Wrong-FINGERING beep — softer and tonally different from playWrongSound,
 * which is reserved for "wrong pitch". This fires when the right note was
 * played but with the wrong finger. We want the student to notice without
 * feeling failed, since pitch is correct.
 *
 * Two short descending sine "uh-uh" tones, like a polite "nope".
 */
export function playWrongFingering(): void {
  const ctx = getAudioCtx();
  const now = ctx.currentTime;
  [440, 392].forEach((freq, i) => {
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = 'sine';
    osc.frequency.value = freq;
    gain.gain.setValueAtTime(0.08, now + i * 0.1);
    gain.gain.exponentialRampToValueAtTime(0.001, now + i * 0.1 + 0.09);
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.start(now + i * 0.1);
    osc.stop(now + i * 0.1 + 0.09);
  });
}

// ============================================================
// AUDIO — Sampled piano via soundfont-player + synth fallback
// ============================================================

let audioCtx: AudioContext | null = null;
// eslint-disable-next-line @typescript-eslint/no-explicit-any
let pianoInstrument: any = null;
let pianoLoading = false;
let pianoReady = false;

export function getAudioCtx(): AudioContext {
  if (!audioCtx) audioCtx = new (window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext)();
  return audioCtx;
}

// Precomputed note frequencies for MIDI 21-108
export const NOTE_FREQS: Record<number, number> = {};
for (let m = 21; m <= 108; m++) {
  NOTE_FREQS[m] = 440 * Math.pow(2, (m - 69) / 12);
}

const MIDI_NOTES = ['C','C#','D','D#','E','F','F#','G','G#','A','A#','B'];
function midiToNoteName(midi: number): string {
  return MIDI_NOTES[midi % 12] + (Math.floor(midi / 12) - 1);
}

// ============================================================
// LOAD SAMPLED PIANO (async, loads ~1MB of samples)
// ============================================================
export async function loadPianoSamples(): Promise<void> {
  if (pianoReady || pianoLoading) return;
  pianoLoading = true;
  try {
    const Soundfont = await import('soundfont-player');
    const ctx = getAudioCtx();
    pianoInstrument = await Soundfont.instrument(ctx as unknown as AudioContext, 'acoustic_grand_piano');
    pianoReady = true;
  } catch (e) {
    console.warn('Failed to load piano samples, using synth fallback:', e);
  }
  pianoLoading = false;
}

// ============================================================
// PLAY PIANO — sampled if loaded, synth fallback
// ============================================================
export function playPianoKey(midiNum: number, duration: number = 2.0): void {
  if (pianoReady && pianoInstrument) {
    try {
      pianoInstrument.play(midiToNoteName(midiNum), 0, { duration, gain: 3 });
      return;
    } catch { /* fallback to synth */ }
  }
  playPianoSynth(midiNum, 0.7, duration);
}

export function playNote(midiNum: number, duration: number = 0.4): void {
  if (pianoReady && pianoInstrument) {
    try {
      pianoInstrument.play(midiToNoteName(midiNum), 0, { duration, gain: 2 });
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
// SYNTH FALLBACK (when samples haven't loaded yet)
// ============================================================
function playPianoSynth(midiNum: number, velocity: number = 0.7, duration: number = 1.5): void {
  const ctx = getAudioCtx();
  const freq = NOTE_FREQS[midiNum];
  if (!freq) return;
  const now = ctx.currentTime;
  const vol = velocity * 0.2;

  const master = ctx.createGain();
  master.gain.setValueAtTime(0, now);
  master.gain.linearRampToValueAtTime(vol, now + 0.005);
  master.gain.exponentialRampToValueAtTime(vol * 0.5, now + 0.1);
  master.gain.exponentialRampToValueAtTime(0.001, now + duration);
  master.connect(ctx.destination);

  const harmonics = [
    { ratio: 1, gain: 1.0 }, { ratio: 2, gain: 0.4 },
    { ratio: 3, gain: 0.2 }, { ratio: 4, gain: 0.1 },
  ];

  harmonics.forEach(h => {
    if (freq * h.ratio > 10000) return;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = 'sine';
    osc.frequency.value = freq * h.ratio;
    osc.detune.value = (Math.random() - 0.5) * 3;
    gain.gain.setValueAtTime(h.gain * vol, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + Math.max(duration / h.ratio, 0.05));
    osc.connect(gain); gain.connect(master);
    osc.start(now); osc.stop(now + duration);
  });
}

// ============================================================
// SCORE PLAYBACK ENGINE
// ============================================================
export interface ScoreNote {
  midi: number;
  time: number;
  duration: number;
}

let scoreTimeouts: ReturnType<typeof setTimeout>[] = [];
let scorePlaying = false;

export function playScoreNotes(notes: ScoreNote[], tempo: number = 100, onFinish?: () => void): void {
  stopScorePlayback();
  if (notes.length === 0) return;
  scorePlaying = true;
  const scale = 100 / tempo;

  notes.forEach(n => {
    const t = setTimeout(() => {
      if (scorePlaying) playNote(n.midi, Math.min(n.duration * scale, 2.0));
    }, n.time * scale * 1000);
    scoreTimeouts.push(t);
  });

  const last = notes[notes.length - 1];
  const end = setTimeout(() => { scorePlaying = false; onFinish?.(); }, (last.time + last.duration) * scale * 1000);
  scoreTimeouts.push(end);
}

export function stopScorePlayback(): void {
  scoreTimeouts.forEach(t => clearTimeout(t));
  scoreTimeouts = [];
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

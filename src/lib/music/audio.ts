// ============================================================
// AUDIO — Piano synthesiser and sound effects
// ============================================================

let audioCtx: AudioContext | null = null;

export function getAudioCtx(): AudioContext {
  if (!audioCtx) audioCtx = new (window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext)();
  return audioCtx;
}

// Precomputed note frequencies for MIDI 21-108
export const NOTE_FREQS: Record<number, number> = {};
for (let m = 21; m <= 108; m++) {
  NOTE_FREQS[m] = 440 * Math.pow(2, (m - 69) / 12);
}

// ============================================================
// PIANO SYNTH — realistic multi-oscillator piano tone
// ============================================================
export function playPiano(midiNum: number, velocity: number = 0.7, duration: number = 1.5): void {
  const ctx = getAudioCtx();
  const freq = NOTE_FREQS[midiNum];
  if (!freq) return;
  const now = ctx.currentTime;
  const vol = velocity * 0.25;

  // Master gain with ADSR envelope
  const master = ctx.createGain();
  master.gain.setValueAtTime(0, now);
  master.gain.linearRampToValueAtTime(vol, now + 0.005); // fast attack
  master.gain.setValueAtTime(vol, now + 0.005);
  master.gain.exponentialRampToValueAtTime(vol * 0.6, now + 0.08); // quick decay to sustain
  master.gain.exponentialRampToValueAtTime(vol * 0.3, now + duration * 0.4); // slow decay
  master.gain.exponentialRampToValueAtTime(0.001, now + duration); // release
  master.connect(ctx.destination);

  // Fundamental + harmonics for a piano-like timbre
  const harmonics = [
    { ratio: 1, gain: 1.0, type: 'sine' as OscillatorType },
    { ratio: 2, gain: 0.5, type: 'sine' as OscillatorType },
    { ratio: 3, gain: 0.25, type: 'sine' as OscillatorType },
    { ratio: 4, gain: 0.12, type: 'sine' as OscillatorType },
    { ratio: 5, gain: 0.06, type: 'sine' as OscillatorType },
    { ratio: 6, gain: 0.03, type: 'sine' as OscillatorType },
  ];

  // Higher notes have faster decay and less harmonics
  const octave = Math.floor(midiNum / 12) - 1;
  const decayMult = octave > 5 ? 0.5 : octave > 4 ? 0.7 : 1.0;

  harmonics.forEach(h => {
    // Skip higher harmonics for high notes (they'd be above hearing range)
    if (freq * h.ratio > 12000) return;

    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = h.type;
    osc.frequency.value = freq * h.ratio;
    // Add slight detuning for richness
    osc.detune.value = (Math.random() - 0.5) * 4;

    // Each harmonic decays faster than the fundamental
    const hDur = duration * decayMult / h.ratio;
    gain.gain.setValueAtTime(h.gain * vol, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + Math.max(hDur, 0.05));

    osc.connect(gain);
    gain.connect(master);
    osc.start(now);
    osc.stop(now + duration);
  });

  // Hammer noise (percussive attack characteristic of piano)
  const noise = ctx.createOscillator();
  const noiseGain = ctx.createGain();
  const noiseFilter = ctx.createBiquadFilter();
  noise.type = 'sawtooth';
  noise.frequency.value = freq * 8;
  noiseFilter.type = 'highpass';
  noiseFilter.frequency.value = 4000;
  noiseGain.gain.setValueAtTime(vol * 0.15, now);
  noiseGain.gain.exponentialRampToValueAtTime(0.001, now + 0.03);
  noise.connect(noiseFilter);
  noiseFilter.connect(noiseGain);
  noiseGain.connect(master);
  noise.start(now);
  noise.stop(now + 0.05);
}

// Active notes for stop functionality
const activeNotes: Map<number, { stop: () => void }> = new Map();

export function playPianoKey(midiNum: number): void {
  // Stop previous instance of the same note
  if (activeNotes.has(midiNum)) {
    activeNotes.get(midiNum)!.stop();
  }
  playPiano(midiNum, 0.7, 2.0);
  // Store a stop function (the note will decay naturally)
  const timeout = setTimeout(() => activeNotes.delete(midiNum), 2000);
  activeNotes.set(midiNum, { stop: () => clearTimeout(timeout) });
}

// ============================================================
// SIMPLE NOTE (for drills, reference tones — lighter CPU)
// ============================================================
export function playNote(midiNum: number, duration: number = 0.4): void {
  playPiano(midiNum, 0.5, duration);
}

export function playNotes(midiNums: number[], delay: number = 0.35): void {
  midiNums.forEach((m, i) => {
    setTimeout(() => playNote(m), i * delay * 1000);
  });
}

// ============================================================
// SCORE PLAYBACK ENGINE
// ============================================================
export interface ScoreNote {
  midi: number;
  time: number;  // seconds from start
  duration: number;
}

let scorePlayback: {
  notes: ScoreNote[];
  timeouts: ReturnType<typeof setTimeout>[];
  startTime: number;
  tempo: number;
  paused: boolean;
  pausedAt: number;
  playing: boolean;
} | null = null;

export function playScoreNotes(notes: ScoreNote[], tempo: number = 100, onFinish?: () => void): void {
  stopScorePlayback();
  if (notes.length === 0) return;

  const tempoScale = 100 / tempo;
  scorePlayback = {
    notes,
    timeouts: [],
    startTime: Date.now(),
    tempo,
    paused: false,
    pausedAt: 0,
    playing: true,
  };

  notes.forEach((n) => {
    const t = setTimeout(() => {
      if (scorePlayback && !scorePlayback.paused) {
        playPiano(n.midi, 0.6, Math.min(n.duration * tempoScale, 2.0));
      }
    }, n.time * tempoScale * 1000);
    scorePlayback!.timeouts.push(t);
  });

  // Finish callback
  const lastNote = notes[notes.length - 1];
  const totalDur = (lastNote.time + lastNote.duration) * tempoScale * 1000;
  const finishTimeout = setTimeout(() => {
    if (scorePlayback) scorePlayback.playing = false;
    onFinish?.();
  }, totalDur);
  scorePlayback.timeouts.push(finishTimeout);
}

export function pauseScorePlayback(): boolean {
  if (!scorePlayback || !scorePlayback.playing) return false;
  if (scorePlayback.paused) {
    // Resume — restart remaining notes
    scorePlayback.paused = false;
    return false;
  } else {
    // Pause — clear remaining timeouts
    scorePlayback.paused = true;
    scorePlayback.pausedAt = Date.now() - scorePlayback.startTime;
    scorePlayback.timeouts.forEach(t => clearTimeout(t));
    scorePlayback.timeouts = [];
    return true;
  }
}

export function stopScorePlayback(): void {
  if (scorePlayback) {
    scorePlayback.timeouts.forEach(t => clearTimeout(t));
    scorePlayback.playing = false;
    scorePlayback = null;
  }
}

export function isScorePlaying(): boolean {
  return scorePlayback?.playing === true && !scorePlayback.paused;
}

export function isScorePaused(): boolean {
  return scorePlayback?.paused === true;
}

export function setScoreTempo(tempo: number): void {
  if (scorePlayback) scorePlayback.tempo = tempo;
}

// ============================================================
// SOUND EFFECTS
// ============================================================
export function playCorrectSound(): void {
  const ctx = getAudioCtx();
  const now = ctx.currentTime;
  [523.25, 659.25].forEach((freq, i) => {
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = 'sine';
    osc.frequency.value = freq;
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
  osc.type = 'sawtooth';
  osc.frequency.value = 200;
  gain.gain.setValueAtTime(0.1, now);
  gain.gain.exponentialRampToValueAtTime(0.001, now + 0.15);
  osc.connect(gain); gain.connect(ctx.destination);
  osc.start(now); osc.stop(now + 0.15);
}

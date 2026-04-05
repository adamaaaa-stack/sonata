// ============================================================
// AUDIO — Web Audio API sound effects and reference tones
// ============================================================

let audioCtx: AudioContext | null = null;

export function getAudioCtx(): AudioContext {
  if (!audioCtx) audioCtx = new (window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext)();
  return audioCtx;
}

export function playCorrectSound(): void {
  const ctx = getAudioCtx();
  const now = ctx.currentTime;
  [523.25, 659.25].forEach((freq, i) => {
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = 'sine';
    osc.frequency.value = freq;
    gain.gain.setValueAtTime(0.15, now + i*0.09);
    gain.gain.exponentialRampToValueAtTime(0.001, now + i*0.09 + 0.08);
    osc.connect(gain); gain.connect(ctx.destination);
    osc.start(now + i*0.09); osc.stop(now + i*0.09 + 0.08);
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

// Precomputed note frequencies for MIDI 21-108
export const NOTE_FREQS: Record<number, number> = {};
for (let m = 21; m <= 108; m++) {
  NOTE_FREQS[m] = 440 * Math.pow(2, (m - 69) / 12);
}

export function playNote(midiNum: number, duration: number = 0.4): void {
  const ctx = getAudioCtx();
  const freq = NOTE_FREQS[midiNum];
  if (!freq) return;
  const osc = ctx.createOscillator();
  const gain = ctx.createGain();
  osc.type = 'triangle';
  osc.frequency.value = freq;
  gain.gain.setValueAtTime(0.2, ctx.currentTime);
  gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + duration);
  osc.connect(gain); gain.connect(ctx.destination);
  osc.start(); osc.stop(ctx.currentTime + duration);
}

export function playNotes(midiNums: number[], delay: number = 0.35): void {
  midiNums.forEach((m, i) => {
    setTimeout(() => playNote(m), i * delay * 1000);
  });
}

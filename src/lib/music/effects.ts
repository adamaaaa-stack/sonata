// ============================================================
// Visual + audio celebration effects — called from the UI
// when the user does something worth celebrating.
// ============================================================
import { getAudioCtx, NOTE_FREQS, loadPianoSamples } from './audio';

// Fire a burst of confetti particles into a fixed overlay layer.
// Self-cleaning — removes itself after the animation completes.
export function fireConfetti(count: number = 50): void {
  if (typeof document === 'undefined') return;
  const layer = document.createElement('div');
  layer.className = 'sonata-confetti-layer';
  document.body.appendChild(layer);

  const colors = ['#C8A96E', '#E4C987', '#FAFAF9', '#A68B4B', '#4ADE80', '#F5F0E8'];
  for (let i = 0; i < count; i++) {
    const piece = document.createElement('div');
    piece.className = 'sonata-confetti-piece';
    piece.style.left = Math.random() * 100 + '%';
    piece.style.background = colors[i % colors.length];
    piece.style.animationDuration = 1.6 + Math.random() * 1.8 + 's';
    piece.style.animationDelay = Math.random() * 0.3 + 's';
    piece.style.transform = `rotate(${Math.random() * 360}deg)`;
    piece.style.width = 6 + Math.random() * 6 + 'px';
    piece.style.height = 10 + Math.random() * 10 + 'px';
    layer.appendChild(piece);
  }

  setTimeout(() => { layer.remove(); }, 4000);
}

// Play a warm gold/major-key cadence — roughly C-E-G-C, ascending, piano-ish.
// Uses the piano samples if loaded, otherwise a gentle synth.
export async function playCelebrationChord(): Promise<void> {
  try {
    await loadPianoSamples();
  } catch {}
  const ctx = getAudioCtx();
  if (ctx.state === 'suspended') { try { await ctx.resume(); } catch {} }
  const sequence = [60, 64, 67, 72]; // C major arpeggio
  const now = ctx.currentTime + 0.05;
  sequence.forEach((midi, i) => {
    const freq = NOTE_FREQS[midi];
    if (!freq) return;
    const startTime = now + i * 0.11;
    const master = ctx.createGain();
    master.gain.setValueAtTime(0, startTime);
    master.gain.linearRampToValueAtTime(0.22, startTime + 0.004);
    master.gain.exponentialRampToValueAtTime(0.08, startTime + 0.2);
    master.gain.exponentialRampToValueAtTime(0.0001, startTime + 1.5);
    master.connect(ctx.destination);

    const filter = ctx.createBiquadFilter();
    filter.type = 'lowpass';
    filter.frequency.value = freq * 6;
    filter.Q.value = 0.5;
    filter.connect(master);

    ([
      { type: 'triangle', detune: 0, gain: 0.9 },
      { type: 'sawtooth', detune: -6, gain: 0.18 },
      { type: 'sawtooth', detune: 6, gain: 0.18 },
    ] as const).forEach(l => {
      const osc = ctx.createOscillator();
      const g = ctx.createGain();
      osc.type = l.type;
      osc.frequency.value = freq;
      osc.detune.value = l.detune;
      g.gain.value = l.gain;
      osc.connect(g); g.connect(filter);
      osc.start(startTime);
      osc.stop(startTime + 1.6);
    });
  });
}

// Quick flash class on an element — removes itself after animation.
export function flashElement(el: HTMLElement | null, kind: 'correct' | 'wrong'): void {
  if (!el) return;
  const cls = kind === 'correct' ? 'sonata-correct-flash' : 'sonata-wrong-shake';
  el.classList.remove(cls);
  // Force reflow so the animation restarts cleanly
  void el.offsetWidth;
  el.classList.add(cls);
  setTimeout(() => el.classList.remove(cls), 800);
}

// Spawn a floating note glyph rising from a point inside a container.
// The container needs `position: relative`.
export function spawnFloatNote(container: HTMLElement | null, glyph: string = '♪'): void {
  if (!container) return;
  const note = document.createElement('div');
  note.className = 'sonata-float-note';
  note.textContent = glyph;
  container.appendChild(note);
  setTimeout(() => note.remove(), 1200);
}

// ============================================================
// AMBIANCE — gentle single notes every ~7s while the menu is idle.
// Opt-in via localStorage; stops on navigation.
// ============================================================
const AMBIANCE_KEY = 'sonata_ambiance';
export function isAmbianceEnabled(): boolean {
  if (typeof localStorage === 'undefined') return false;
  return localStorage.getItem(AMBIANCE_KEY) === 'true';
}
export function setAmbianceEnabled(on: boolean): void {
  if (typeof localStorage === 'undefined') return;
  localStorage.setItem(AMBIANCE_KEY, on ? 'true' : 'false');
}

let ambianceTimer: ReturnType<typeof setInterval> | null = null;
export function startAmbiance(): void {
  if (ambianceTimer || !isAmbianceEnabled()) return;
  const pentatonic = [60, 62, 64, 67, 69, 72, 74, 76]; // C major pentatonic
  const tick = async () => {
    try {
      await loadPianoSamples();
      const ctx = getAudioCtx();
      if (ctx.state === 'suspended') return;
      const note = pentatonic[Math.floor(Math.random() * pentatonic.length)];
      const freq = NOTE_FREQS[note];
      if (!freq) return;
      const now = ctx.currentTime;
      const master = ctx.createGain();
      master.gain.setValueAtTime(0, now);
      master.gain.linearRampToValueAtTime(0.05, now + 0.02); // very quiet
      master.gain.exponentialRampToValueAtTime(0.0001, now + 3.5);
      master.connect(ctx.destination);
      const filter = ctx.createBiquadFilter();
      filter.type = 'lowpass';
      filter.frequency.value = 2000;
      filter.connect(master);
      const osc = ctx.createOscillator();
      osc.type = 'triangle';
      osc.frequency.value = freq;
      osc.connect(filter);
      osc.start(now); osc.stop(now + 3.6);
    } catch {}
  };
  tick();
  ambianceTimer = setInterval(tick, 6500 + Math.random() * 2000);
}
export function stopAmbiance(): void {
  if (ambianceTimer) { clearInterval(ambianceTimer); ambianceTimer = null; }
}

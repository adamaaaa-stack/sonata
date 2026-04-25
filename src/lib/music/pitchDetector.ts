"use client";
/**
 * Real-time monophonic pitch detection via the microphone, powered by
 * Pitchy (McLeod pitch method). Used by lesson play pages so the student
 * can perform exercises on a real piano (acoustic or digital) and have
 * their notes graded just like clicking the on-screen keyboard.
 *
 * Why Pitchy + DSP and not a neural model:
 *   - 10-20ms latency vs 100-300ms for Basic Pitch / CREPE
 *   - Tiny bundle (5KB) vs 17MB+
 *   - Monophonic is fine for sequence/song lessons where the melody is
 *     played one note at a time. Polyphony (chords) would need Basic
 *     Pitch and is a future upgrade.
 *
 * Algorithm:
 *   1. getUserMedia → AudioContext → AnalyserNode
 *   2. Every ~20ms: pull a Float32 buffer, run Pitchy on it
 *   3. Stability gate: same MIDI for STABLE_FRAMES → emit
 *   4. Quiet-gap re-arm: same note can fire again after RMS dips below
 *      QUIET_THRESHOLD for QUIET_HOLD_MS — so repeated notes register.
 */
import { PitchDetector as PitchyDetector } from "pitchy";

export interface PitchEvent {
  midi: number;
  frequency: number;
  clarity: number;
}

export interface MicPitchOptions {
  /** Called when a stable new note is detected. */
  onNote: (e: PitchEvent) => void;
  /** Optional: fired every frame for visual meters (RMS 0..1). */
  onLevel?: (rms: number) => void;
  /** Optional: fired on mic-permission or audio-graph errors. */
  onError?: (err: Error) => void;
  /** Lowest MIDI to accept (default 36 / C2). Rejects sub-bass rumble. */
  minMidi?: number;
  /** Highest MIDI to accept (default 96 / C7). */
  maxMidi?: number;
  /**
   * Sensitivity scale 0..1 (default 0.5). Higher = picks up softer notes
   * but more false positives. Used to trim QUIET_THRESHOLD and CLARITY
   * gates at runtime so iPads / quiet rooms can be tuned by the user.
   */
  sensitivity?: number;
}

const FFT_SIZE = 2048;
const SAMPLE_INTERVAL_MS = 20;
// Lowered from 0.85 → 0.75 because iOS WKWebView routes the mic through a
// voice-processed pipeline that subtly degrades pitch clarity even with all
// processing flags off. 0.75 is still strict enough to reject room noise.
const CLARITY_THRESHOLD = 0.75;
const STABLE_FRAMES = 3; // ~60ms of consistent pitch before emitting
// Lowered from 0.005 → 0.0015 because iPad's auto-gain compresses dynamic
// range, so soft piano hits land much quieter at the AnalyserNode than they
// do on desktop. A real piano in a quiet room still clears 0.0015 easily.
const QUIET_THRESHOLD = 0.0015;
const QUIET_HOLD_MS = 80;

function freqToMidi(freq: number): number {
  return Math.round(69 + 12 * Math.log2(freq / 440));
}

export class MicPitchDetector {
  private opts: MicPitchOptions;
  private ctx: AudioContext | null = null;
  private stream: MediaStream | null = null;
  private analyser: AnalyserNode | null = null;
  private detector: ReturnType<typeof PitchyDetector.forFloat32Array> | null = null;
  private buffer: Float32Array<ArrayBuffer> | null = null;
  private rafId: number | null = null;
  private lastTickTime = 0;

  private lastCandidate: number | null = null;
  private candidateCount = 0;
  private lastEmittedMidi: number | null = null;
  private quietSince: number | null = null;

  constructor(opts: MicPitchOptions) {
    this.opts = opts;
  }

  get running(): boolean {
    return this.ctx != null;
  }

  /** Update sensitivity at runtime — slider can call this without restarting. */
  setSensitivity(s: number): void {
    this.opts.sensitivity = Math.min(1, Math.max(0, s));
  }

  async start(): Promise<void> {
    if (this.ctx) return;
    // iOS WKWebView in particular ignores some constraint flags silently
    // and applies voice-optimised audio processing that mangles musical
    // pitches. We pass every known opt-out plus a couple of vendor-prefixed
    // ones that older iOS versions actually honour. Any rejected fields
    // are no-ops, so this is safe across browsers.
    type AudioConstraintsExt = MediaTrackConstraints & {
      googEchoCancellation?: boolean;
      googAutoGainControl?: boolean;
      googNoiseSuppression?: boolean;
      googHighpassFilter?: boolean;
      googTypingNoiseDetection?: boolean;
      mozAutoGainControl?: boolean;
      mozNoiseSuppression?: boolean;
    };
    const audioConstraints: AudioConstraintsExt = {
      echoCancellation: false,
      noiseSuppression: false,
      autoGainControl: false,
      channelCount: 1,
      googEchoCancellation: false,
      googAutoGainControl: false,
      googNoiseSuppression: false,
      googHighpassFilter: false,
      googTypingNoiseDetection: false,
      mozAutoGainControl: false,
      mozNoiseSuppression: false,
    };
    // Wrap getUserMedia with a hard timeout. On iOS the prompt sometimes
    // takes seconds to appear, and if Safari is throttled we can hang
    // indefinitely. Failing fast lets the UI show an error and stop showing
    // a frozen Listen button.
    const GUM_TIMEOUT_MS = 8000;
    try {
      this.stream = await new Promise<MediaStream>((resolve, reject) => {
        let settled = false;
        const t = window.setTimeout(() => {
          if (settled) return;
          settled = true;
          reject(new Error("Microphone request timed out — try again"));
        }, GUM_TIMEOUT_MS);
        navigator.mediaDevices
          .getUserMedia({ audio: audioConstraints, video: false })
          .then((s) => {
            if (settled) {
              s.getTracks().forEach((tr) => tr.stop());
              return;
            }
            settled = true;
            window.clearTimeout(t);
            resolve(s);
          })
          .catch((err) => {
            if (settled) return;
            settled = true;
            window.clearTimeout(t);
            reject(err);
          });
      });
    } catch (e) {
      this.opts.onError?.(e instanceof Error ? e : new Error(String(e)));
      throw e;
    }

    type WebkitAudio = typeof window & { webkitAudioContext?: typeof AudioContext };
    const Ctor =
      window.AudioContext || (window as WebkitAudio).webkitAudioContext;
    if (!Ctor) throw new Error("AudioContext not supported");
    this.ctx = new Ctor();
    if (this.ctx.state === "suspended") {
      await this.ctx.resume().catch(() => {});
    }

    const source = this.ctx.createMediaStreamSource(this.stream);
    this.analyser = this.ctx.createAnalyser();
    this.analyser.fftSize = FFT_SIZE;
    source.connect(this.analyser);

    this.buffer = new Float32Array(
      new ArrayBuffer(this.analyser.fftSize * Float32Array.BYTES_PER_ELEMENT)
    ) as Float32Array<ArrayBuffer>;
    this.detector = PitchyDetector.forFloat32Array(this.analyser.fftSize);

    this.lastCandidate = null;
    this.candidateCount = 0;
    this.lastEmittedMidi = null;
    this.quietSince = null;

    // Use requestAnimationFrame instead of setInterval. setInterval on iOS
    // WKWebView fires in bursts after thread stalls and competes with
    // Tone.js's audio scheduler, which is what causes the "press Listen,
    // page freezes for 30s, then unfreezes" symptom. rAF naturally yields
    // to the browser event loop and pauses while the tab is hidden.
    this.lastTickTime = 0;
    const loop = (now: number) => {
      if (this.rafId == null) return; // stopped
      // Rate-limit to ~50Hz (one tick per 20ms) regardless of display refresh.
      if (now - this.lastTickTime >= SAMPLE_INTERVAL_MS) {
        this.lastTickTime = now;
        this.tick();
      }
      this.rafId = window.requestAnimationFrame(loop);
    };
    this.rafId = window.requestAnimationFrame(loop);
  }

  stop(): void {
    if (this.rafId != null) {
      window.cancelAnimationFrame(this.rafId);
      this.rafId = null;
    }
    if (this.stream) {
      this.stream.getTracks().forEach((t) => t.stop());
      this.stream = null;
    }
    if (this.ctx) {
      this.ctx.close().catch(() => {});
      this.ctx = null;
    }
    this.analyser = null;
    this.detector = null;
    this.buffer = null;
  }

  private tick() {
    if (!this.analyser || !this.detector || !this.buffer || !this.ctx) return;
    this.analyser.getFloatTimeDomainData(this.buffer);

    // RMS for silence gating.
    let sumSq = 0;
    for (let i = 0; i < this.buffer.length; i++) {
      const v = this.buffer[i];
      sumSq += v * v;
    }
    const rms = Math.sqrt(sumSq / this.buffer.length);
    this.opts.onLevel?.(rms);

    const now = performance.now();

    // Sensitivity: 0 → very strict (use baseline thresholds), 1 → very loose
    // (1/4 the silence threshold, 0.6 clarity floor). Default 0.5 keeps the
    // baseline values exactly as configured above.
    const sens = Math.min(1, Math.max(0, this.opts.sensitivity ?? 0.5));
    const quietGate = QUIET_THRESHOLD * (1 - sens * 0.75);
    const clarityGate = CLARITY_THRESHOLD - sens * 0.15;

    if (rms < quietGate) {
      if (this.quietSince == null) this.quietSince = now;
      if (now - this.quietSince > QUIET_HOLD_MS) {
        this.lastEmittedMidi = null;
      }
      this.lastCandidate = null;
      this.candidateCount = 0;
      return;
    }
    this.quietSince = null;

    const [pitch, clarity] = this.detector.findPitch(
      this.buffer,
      this.ctx.sampleRate
    );

    if (clarity < clarityGate || pitch <= 0 || !Number.isFinite(pitch)) {
      this.lastCandidate = null;
      this.candidateCount = 0;
      return;
    }

    const midi = freqToMidi(pitch);
    const minM = this.opts.minMidi ?? 36;
    const maxM = this.opts.maxMidi ?? 96;
    if (midi < minM || midi > maxM) return;

    if (this.lastCandidate === midi) {
      this.candidateCount += 1;
    } else {
      this.lastCandidate = midi;
      this.candidateCount = 1;
    }

    if (this.candidateCount < STABLE_FRAMES) return;
    if (this.lastEmittedMidi === midi) return;

    this.lastEmittedMidi = midi;
    this.opts.onNote({ midi, frequency: pitch, clarity });
  }
}

// Back-compat alias (the previous autocorrelation-based class was unused
// outside of the index re-export, but keep the name available).
export { MicPitchDetector as PitchDetector };

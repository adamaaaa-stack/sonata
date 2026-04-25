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
}

const FFT_SIZE = 2048;
const SAMPLE_INTERVAL_MS = 20;
const CLARITY_THRESHOLD = 0.85;
const STABLE_FRAMES = 3; // ~60ms of consistent pitch before emitting
const QUIET_THRESHOLD = 0.005;
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
  private timer: number | null = null;

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

  async start(): Promise<void> {
    if (this.ctx) return;
    try {
      this.stream = await navigator.mediaDevices.getUserMedia({
        audio: {
          echoCancellation: false,
          noiseSuppression: false,
          autoGainControl: false,
          channelCount: 1,
        },
        video: false,
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

    this.timer = window.setInterval(() => this.tick(), SAMPLE_INTERVAL_MS);
  }

  stop(): void {
    if (this.timer != null) {
      clearInterval(this.timer);
      this.timer = null;
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

    if (rms < QUIET_THRESHOLD) {
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

    if (clarity < CLARITY_THRESHOLD || pitch <= 0 || !Number.isFinite(pitch)) {
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

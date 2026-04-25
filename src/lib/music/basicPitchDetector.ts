"use client";
/**
 * Polyphonic real-time mic detection via Spotify Basic Pitch.
 *
 * Same surface API as MicPitchDetector (Pitchy) — start/stop/setSensitivity,
 * onNote callback — so lesson code can treat them interchangeably. Used for
 * chord exercises where Pitchy's monophonic model can't tell C-E-G apart
 * from a single dominant note.
 *
 * Trade-offs vs Pitchy:
 *   - Polyphonic ✓
 *   - Latency ~250-500ms (vs 10ms) — chord lessons rarely need sub-100ms feedback
 *   - +3-5MB JS (TF.js) and 900KB model — lazy-loaded on first start()
 *   - More CPU/battery — fine on chord pages, would be wasteful everywhere
 *
 * Streaming strategy: we keep a rolling 1.5s buffer of audio at the native
 * mic sample rate. Every INFERENCE_INTERVAL_MS we run a fresh inference on
 * that buffer, get the polyphonic note events, and emit any whose
 * onset-time falls inside this fresh window (and whose pitch is in the
 * accepted MIDI range). The cutoff advances each cycle so we never re-emit
 * the same onset.
 */
import type { BasicPitch as BPType } from "@spotify/basic-pitch";

export interface BPPitchEvent {
  midi: number;
  amplitude: number;
}

export interface BasicPitchOptions {
  onNote: (e: BPPitchEvent) => void;
  onLevel?: (rms: number) => void;
  onError?: (err: Error) => void;
  /** Optional: status callback ("loading model", "listening", etc) */
  onStatus?: (status: "loading" | "ready" | "stopped" | "error") => void;
  minMidi?: number;
  maxMidi?: number;
  /** 0..1, default 0.5. Higher → lower onset/frame thresholds. */
  sensitivity?: number;
}

const TARGET_SAMPLE_RATE = 22050; // Basic Pitch's native rate
const BUFFER_SECONDS = 1.5;
const INFERENCE_INTERVAL_MS = 350;

export class BasicPitchDetector {
  private opts: BasicPitchOptions;
  private ctx: AudioContext | null = null;
  private stream: MediaStream | null = null;
  private analyser: AnalyserNode | null = null;
  private bp: BPType | null = null;
  // Rolling raw-audio buffer at native sample rate
  private ringBuffer: Float32Array | null = null;
  private ringWritePos = 0;
  private ringFilled = 0;
  private nativeSampleRate = 48000;
  // Inference loop state
  private inferenceTimer: number | null = null;
  private inferenceBusy = false;
  // Onset dedup — latest onset time we've already emitted, in seconds since
  // detection start.
  private detectionStartTime = 0;
  private emittedCutoffSeconds = 0;
  // Last-heard per midi for level-meter UX
  private lastEmittedAtSec: Record<number, number> = {};
  // Toolkit imports (loaded lazily)
  private tf: typeof import("@tensorflow/tfjs") | null = null;
  private outputToNotesPoly:
    | typeof import("@spotify/basic-pitch").outputToNotesPoly
    | null = null;
  private noteFramesToTime:
    | typeof import("@spotify/basic-pitch").noteFramesToTime
    | null = null;

  constructor(opts: BasicPitchOptions) {
    this.opts = opts;
  }

  get running(): boolean {
    return this.ctx != null;
  }

  setSensitivity(s: number): void {
    this.opts.sensitivity = Math.min(1, Math.max(0, s));
  }

  async start(): Promise<void> {
    if (this.ctx) return;
    this.opts.onStatus?.("loading");

    // 1. Lazy-load TF.js + Basic Pitch. These are large; we only pay the
    //    cost on chord pages where the user actually clicked Listen.
    try {
      const [tfMod, bpMod] = await Promise.all([
        import("@tensorflow/tfjs"),
        import("@spotify/basic-pitch"),
      ]);
      this.tf = tfMod;
      this.outputToNotesPoly = bpMod.outputToNotesPoly;
      this.noteFramesToTime = bpMod.noteFramesToTime;
      // Initialise the model from the public/ asset path.
      this.bp = new bpMod.BasicPitch("/models/basic-pitch/model.json");
    } catch (e) {
      this.opts.onError?.(e instanceof Error ? e : new Error(String(e)));
      this.opts.onStatus?.("error");
      throw e;
    }

    // 2. Mic permission + audio graph.
    type AudioConstraintsExt = MediaTrackConstraints & {
      googEchoCancellation?: boolean;
      googAutoGainControl?: boolean;
      googNoiseSuppression?: boolean;
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
      mozAutoGainControl: false,
      mozNoiseSuppression: false,
    };
    try {
      this.stream = await new Promise<MediaStream>((resolve, reject) => {
        let settled = false;
        const t = window.setTimeout(() => {
          if (settled) return;
          settled = true;
          reject(new Error("Microphone request timed out — try again"));
        }, 8000);
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
      this.opts.onStatus?.("error");
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
    this.nativeSampleRate = this.ctx.sampleRate;

    const source = this.ctx.createMediaStreamSource(this.stream);
    this.analyser = this.ctx.createAnalyser();
    this.analyser.fftSize = 2048;
    source.connect(this.analyser);

    // Pre-allocate ring buffer for BUFFER_SECONDS at native sample rate.
    const ringLen = Math.ceil(this.nativeSampleRate * BUFFER_SECONDS);
    this.ringBuffer = new Float32Array(ringLen);
    this.ringWritePos = 0;
    this.ringFilled = 0;

    // 3. Audio capture loop — pull AnalyserNode time-domain data into the
    //    ring buffer at high frequency, also computes RMS for the meter.
    const tick = () => {
      if (!this.analyser || !this.ringBuffer) return;
      const tmp = new Float32Array(this.analyser.fftSize);
      this.analyser.getFloatTimeDomainData(tmp);
      // Append to ring buffer
      const len = tmp.length;
      const buf = this.ringBuffer;
      for (let i = 0; i < len; i++) {
        buf[(this.ringWritePos + i) % buf.length] = tmp[i];
      }
      this.ringWritePos = (this.ringWritePos + len) % buf.length;
      this.ringFilled = Math.min(buf.length, this.ringFilled + len);
      // RMS for level meter
      if (this.opts.onLevel) {
        let sumSq = 0;
        for (let i = 0; i < len; i++) sumSq += tmp[i] * tmp[i];
        this.opts.onLevel(Math.sqrt(sumSq / len));
      }
      this.captureRaf = window.requestAnimationFrame(tick);
    };
    this.captureRaf = window.requestAnimationFrame(tick);

    // 4. Inference loop — runs every INFERENCE_INTERVAL_MS. We don't double-
    //    fire if the previous inference is still running.
    this.detectionStartTime = performance.now() / 1000;
    this.emittedCutoffSeconds = 0;
    this.lastEmittedAtSec = {};
    this.inferenceTimer = window.setInterval(
      () => this.runInference(),
      INFERENCE_INTERVAL_MS
    );

    this.opts.onStatus?.("ready");
  }

  private captureRaf: number | null = null;

  stop(): void {
    if (this.captureRaf != null) {
      window.cancelAnimationFrame(this.captureRaf);
      this.captureRaf = null;
    }
    if (this.inferenceTimer != null) {
      window.clearInterval(this.inferenceTimer);
      this.inferenceTimer = null;
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
    this.ringBuffer = null;
    this.bp = null;
    this.opts.onStatus?.("stopped");
  }

  /** Linear-interp resample. Good enough for 48k → 22.05k musical content. */
  private resample(input: Float32Array, fromRate: number, toRate: number): Float32Array {
    if (fromRate === toRate) return input;
    const ratio = fromRate / toRate;
    const outLen = Math.floor(input.length / ratio);
    const out = new Float32Array(outLen);
    for (let i = 0; i < outLen; i++) {
      const srcIdx = i * ratio;
      const lo = Math.floor(srcIdx);
      const hi = Math.min(lo + 1, input.length - 1);
      const t = srcIdx - lo;
      out[i] = input[lo] * (1 - t) + input[hi] * t;
    }
    return out;
  }

  /** Pull the most recent N samples from the ring buffer in chronological order. */
  private getRecentBuffer(samples: number): Float32Array {
    if (!this.ringBuffer) return new Float32Array(0);
    const buf = this.ringBuffer;
    const have = Math.min(this.ringFilled, samples);
    const out = new Float32Array(have);
    const start = (this.ringWritePos - have + buf.length) % buf.length;
    for (let i = 0; i < have; i++) out[i] = buf[(start + i) % buf.length];
    return out;
  }

  private async runInference(): Promise<void> {
    if (this.inferenceBusy) return;
    if (!this.bp || !this.outputToNotesPoly || !this.noteFramesToTime) return;
    if (!this.ctx) return;
    // Need at least 0.5s of audio for the model to give useful output.
    const minSamples = Math.ceil(this.nativeSampleRate * 0.5);
    if (this.ringFilled < minSamples) return;

    this.inferenceBusy = true;
    try {
      const native = this.getRecentBuffer(
        Math.ceil(this.nativeSampleRate * BUFFER_SECONDS)
      );
      const resampled = this.resample(
        native,
        this.nativeSampleRate,
        TARGET_SAMPLE_RATE
      );

      // Sensitivity → thresholds
      const sens = Math.min(1, Math.max(0, this.opts.sensitivity ?? 0.5));
      const onsetThresh = 0.5 - sens * 0.3; // 0.5 strict → 0.2 loose
      const frameThresh = 0.3 - sens * 0.15; // 0.3 strict → 0.15 loose

      let frames: number[][] = [];
      let onsets: number[][] = [];
      await this.bp.evaluateModel(
        resampled,
        (f, o) => {
          frames = f;
          onsets = o;
        },
        () => {}
      );

      const noteFrames = this.outputToNotesPoly(
        frames,
        onsets,
        onsetThresh,
        frameThresh,
        5 // minNoteLen frames
      );
      const notes = this.noteFramesToTime(noteFrames);

      // Compute window time anchor — the latest sample is "now" relative
      // to detection start. We want to emit only notes whose ONSET landed
      // recently. The model returns startTimeSeconds relative to the input
      // buffer (0 = start of buffer). The buffer represents the LAST
      // BUFFER_SECONDS of audio, so absolute_time ≈ now - BUFFER_SECONDS + start.
      const nowSec = performance.now() / 1000 - this.detectionStartTime;
      const bufferStartSec = nowSec - BUFFER_SECONDS;
      const REC_WINDOW = INFERENCE_INTERVAL_MS / 1000 + 0.3; // a bit of overlap

      const minMidi = this.opts.minMidi ?? 36;
      const maxMidi = this.opts.maxMidi ?? 96;

      for (const n of notes) {
        if (n.pitchMidi < minMidi || n.pitchMidi > maxMidi) continue;
        const absStart = bufferStartSec + n.startTimeSeconds;
        // Only consider notes that started in the recent window
        if (absStart < nowSec - REC_WINDOW) continue;
        // Don't double-emit the same onset (across overlapping inferences)
        const last = this.lastEmittedAtSec[n.pitchMidi] ?? -Infinity;
        if (absStart - last < 0.18) continue; // 180ms minimum re-trigger
        this.lastEmittedAtSec[n.pitchMidi] = absStart;
        this.opts.onNote({ midi: n.pitchMidi, amplitude: n.amplitude });
      }
    } catch (e) {
      // Inference failures shouldn't kill the listener — log and keep trying.
      // eslint-disable-next-line no-console
      console.warn("[BasicPitchDetector] inference error:", e);
    } finally {
      this.inferenceBusy = false;
    }
  }
}

"use client";
/**
 * On-device Kokoro TTS via kokoro-js (Transformers.js + WebGPU/WASM).
 *
 * Runs Kokoro-82M entirely in the browser. The model + voice embeddings
 * download once on first use (~80-100MB depending on dtype) and cache
 * in IndexedDB. After that, every Cleffy line is synthesised locally
 * with no network call.
 *
 * Usage:
 *   const tts = new KokoroVoice();
 *   await tts.load();                   // ~30s on first run, instant after
 *   const audio = await tts.speak("Tap Middle C.");
 *   audio.play();                       // HTMLAudioElement
 *
 * Or as a singleton via getKokoroVoice() so we only keep one model
 * loaded across the app.
 *
 * Performance:
 *   - WebGPU on M-series Apple silicon: real-time or faster
 *   - WebGPU on A14+ iPad: ~2-3x real-time
 *   - WASM fallback: 5-10x real-time but works on older devices
 */

import type { KokoroTTS } from "kokoro-js";

// Hugging Face model id. The Kokoro 82M v1.0 ONNX export is the standard
// used by kokoro-js. Quantisations: q4 (~30MB), q8 (~80MB), fp16 (~160MB),
// fp32 (~320MB). Default to q8 for best quality/size trade-off; allow
// override via env for experimentation.
const DEFAULT_MODEL_ID = "onnx-community/Kokoro-82M-v1.0-ONNX";
const DEFAULT_DTYPE: "q8" | "q4" | "fp16" = "q8";
const DEFAULT_VOICE = "af_bella"; // Cleffy — warm, expressive female voice

export type KokoroDtype = "q4" | "q8" | "fp16" | "fp32" | "q4f16";
export type KokoroDevice = "webgpu" | "wasm" | "cpu";

export interface KokoroVoiceOptions {
  modelId?: string;
  dtype?: KokoroDtype;
  device?: KokoroDevice;
  voice?: string;
  /** Called with download progress while the model is loading. */
  onProgress?: (info: {
    status: string;
    file?: string;
    progress?: number;
    loaded?: number;
    total?: number;
  }) => void;
}

export class KokoroVoice {
  private opts: KokoroVoiceOptions;
  private tts: KokoroTTS | null = null;
  private loadPromise: Promise<void> | null = null;

  constructor(opts: KokoroVoiceOptions = {}) {
    this.opts = opts;
  }

  /** True once the model is loaded and ready to synthesise. */
  get ready(): boolean {
    return this.tts != null;
  }

  /**
   * Download + initialise the model. Idempotent — safe to call multiple
   * times. Subsequent calls reuse the in-flight or completed load.
   */
  async load(): Promise<void> {
    if (this.tts) return;
    if (this.loadPromise) return this.loadPromise;
    this.loadPromise = this.doLoad();
    try {
      await this.loadPromise;
    } finally {
      this.loadPromise = null;
    }
  }

  private async doLoad(): Promise<void> {
    // Detect WebGPU support — fall back to WASM otherwise.
    let device: KokoroDevice = this.opts.device ?? "webgpu";
    if (device === "webgpu") {
      // navigator.gpu is undefined where WebGPU isn't available.
      const hasGpu =
        typeof navigator !== "undefined" &&
        "gpu" in navigator &&
        navigator.gpu != null;
      if (!hasGpu) device = "wasm";
    }

    const mod = await import("kokoro-js");
    this.tts = await mod.KokoroTTS.from_pretrained(
      this.opts.modelId ?? DEFAULT_MODEL_ID,
      {
        dtype: this.opts.dtype ?? DEFAULT_DTYPE,
        device,
        progress_callback: this.opts.onProgress as never,
      }
    );
  }

  /**
   * Synthesise speech and return a playable HTMLAudioElement.
   * Caller is responsible for calling .play() (browsers require a user
   * gesture for the very first audio).
   */
  async speak(
    text: string,
    voice: string = this.opts.voice ?? DEFAULT_VOICE,
    speed = 1
  ): Promise<HTMLAudioElement> {
    if (!this.tts) await this.load();
    // Kokoro's voice param has a literal-union type; we accept arbitrary
    // strings so callers can swap voices via env or persona system. Cast
    // through `as never` is the safe escape.
    const audio = await this.tts!.generate(text, {
      voice: voice as never,
      speed,
    });
    // kokoro-js's RawAudio has a .toBlob() method for browser playback.
    type RawAudioLike = {
      toBlob?: () => Blob;
      audio?: Float32Array;
      sampling_rate?: number;
    };
    const ra = audio as unknown as RawAudioLike;
    let blobUrl: string;
    if (typeof ra.toBlob === "function") {
      blobUrl = URL.createObjectURL(ra.toBlob());
    } else {
      // Fallback: build a WAV blob manually from the Float32Array
      blobUrl = URL.createObjectURL(
        rawToWavBlob(ra.audio!, ra.sampling_rate ?? 24000)
      );
    }
    const el = document.createElement("audio");
    el.src = blobUrl;
    el.preload = "auto";
    el.addEventListener("ended", () => URL.revokeObjectURL(blobUrl));
    return el;
  }

  /** Speak and play immediately. Returns when playback finishes. */
  async speakAndPlay(text: string, voice?: string, speed = 1): Promise<void> {
    const el = await this.speak(text, voice, speed);
    await el.play();
    return new Promise((resolve) => {
      el.addEventListener("ended", () => resolve(), { once: true });
    });
  }

  /** Tear down the loaded model. Rarely needed. */
  dispose(): void {
    this.tts = null;
  }
}

// ------------------------------------------------------------------
// Singleton accessor
// ------------------------------------------------------------------
let _instance: KokoroVoice | null = null;

export function getKokoroVoice(opts?: KokoroVoiceOptions): KokoroVoice {
  if (!_instance) _instance = new KokoroVoice(opts);
  return _instance;
}

/**
 * Kick off the model download in the background as soon as the lesson
 * screen mounts. Does nothing if already loaded. Safe to call from a
 * useEffect.
 */
export function prefetchKokoro(opts?: KokoroVoiceOptions): void {
  const v = getKokoroVoice(opts);
  void v.load().catch(() => {
    // First load can fail on misbehaving networks. Retried lazily on
    // first speak() call.
  });
}

// ------------------------------------------------------------------
// Helpers
// ------------------------------------------------------------------

/** Manual WAV-from-Float32Array fallback for older kokoro-js builds. */
function rawToWavBlob(samples: Float32Array, sampleRate: number): Blob {
  const numChannels = 1;
  const bytesPerSample = 2;
  const blockAlign = numChannels * bytesPerSample;
  const byteRate = sampleRate * blockAlign;
  const dataSize = samples.length * bytesPerSample;
  const buf = new ArrayBuffer(44 + dataSize);
  const view = new DataView(buf);
  // RIFF
  writeAscii(view, 0, "RIFF");
  view.setUint32(4, 36 + dataSize, true);
  writeAscii(view, 8, "WAVE");
  // fmt chunk
  writeAscii(view, 12, "fmt ");
  view.setUint32(16, 16, true); // PCM chunk size
  view.setUint16(20, 1, true); // PCM format
  view.setUint16(22, numChannels, true);
  view.setUint32(24, sampleRate, true);
  view.setUint32(28, byteRate, true);
  view.setUint16(32, blockAlign, true);
  view.setUint16(34, bytesPerSample * 8, true);
  // data chunk
  writeAscii(view, 36, "data");
  view.setUint32(40, dataSize, true);
  // PCM samples
  let offset = 44;
  for (let i = 0; i < samples.length; i++, offset += 2) {
    const s = Math.max(-1, Math.min(1, samples[i]));
    view.setInt16(offset, s < 0 ? s * 0x8000 : s * 0x7fff, true);
  }
  return new Blob([buf], { type: "audio/wav" });
}

function writeAscii(view: DataView, offset: number, s: string): void {
  for (let i = 0; i < s.length; i++) view.setUint8(offset + i, s.charCodeAt(i));
}

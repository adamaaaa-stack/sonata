// ============================================================
// PITCH DETECTOR — Autocorrelation-based pitch detection
// ============================================================

import { NOTES } from './noteHelpers';

export class PitchDetector {
  running = false;
  onNote: ((note: string, midi: number) => void) | null = null;
  private ctx: AudioContext | null = null;
  private source: MediaStreamAudioSourceNode | null = null;
  private analyser: AnalyserNode | null = null;
  private buf: Float32Array<ArrayBuffer> | null = null;
  private stream: MediaStream | null = null;

  async start(): Promise<void> {
    if (this.running) return;
    this.ctx = new (window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext)();
    const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
    this.source = this.ctx.createMediaStreamSource(stream);
    this.analyser = this.ctx.createAnalyser();
    this.analyser.fftSize = 2048;
    this.source.connect(this.analyser);
    this.buf = new Float32Array(this.analyser.fftSize) as Float32Array<ArrayBuffer>;
    this.running = true;
    this.stream = stream;
    this.detect();
  }

  stop(): void {
    this.running = false;
    if (this.stream) this.stream.getTracks().forEach(t => t.stop());
    if (this.ctx) this.ctx.close();
    this.ctx = null;
    this.source = null;
    this.analyser = null;
    this.stream = null;
  }

  private detect(): void {
    if (!this.running || !this.analyser || !this.buf) return;
    this.analyser.getFloatTimeDomainData(this.buf);
    let rms = 0;
    for (let i = 0; i < this.buf.length; i++) rms += this.buf[i] * this.buf[i];
    rms = Math.sqrt(rms / this.buf.length);
    if (rms > 0.01) {
      const freq = this.autocorrelate(this.buf, this.ctx!.sampleRate);
      if (freq > 0) {
        const { note, midi } = this.freqToNote(freq);
        if (this.onNote) this.onNote(note, midi);
      }
    }
    requestAnimationFrame(() => this.detect());
  }

  private autocorrelate(buf: Float32Array<ArrayBuffer>, sampleRate: number): number {
    const SIZE = buf.length;
    let bestOffset = -1, bestCorrelation = 0;
    for (let offset = 20; offset < SIZE / 2; offset++) {
      let correlation = 0;
      for (let i = 0; i < SIZE / 2; i++) correlation += buf[i] * buf[i + offset];
      if (correlation > bestCorrelation) { bestCorrelation = correlation; bestOffset = offset; }
    }
    if (bestCorrelation < 0.01 || bestOffset < 1) return -1;
    return sampleRate / bestOffset;
  }

  private freqToNote(freq: number): { note: string; midi: number } {
    const noteNum = 12 * (Math.log2(freq / 440)) + 69;
    const midi = Math.round(noteNum);
    const name = NOTES[midi % 12];
    const oct = Math.floor(midi / 12) - 1;
    return { note: name + oct, midi };
  }
}

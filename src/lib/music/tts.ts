// ============================================================
// TEXT-TO-SPEECH — Pre-generated audio files + live API fallback
// ============================================================
import { API_BASE_URL } from '@/lib/platform';

let ttsAudio: HTMLAudioElement | null = null;
let ttsSpeed = 1.0;
let ttsLastText = '';
let ttsLastFile = '';
let ttsGeneration = 0; // Incremented each speak() call to cancel stale async work
let onStateChange: ((state: 'playing' | 'paused' | 'stopped') => void) | null = null;

export function setTTSStateCallback(cb: (state: 'playing' | 'paused' | 'stopped') => void): void {
  onStateChange = cb;
}

// Try pre-generated file first, fallback to live API
export async function speak(text: string, audioFile?: string): Promise<void> {
  ttsLastText = text;
  ttsLastFile = audioFile || '';
  if (ttsAudio) { ttsAudio.pause(); ttsAudio = null; }
  const gen = ++ttsGeneration; // Capture current generation
  onStateChange?.('playing');

  try {
    let audioUrl: string;

    if (audioFile) {
      // Check if pre-generated file exists
      const checkRes = await fetch(audioFile, { method: 'HEAD' });
      if (gen !== ttsGeneration) return; // Cancelled — a newer speak() was called
      if (checkRes.ok) {
        audioUrl = audioFile;
      } else {
        // Fallback to live API
        audioUrl = await fetchLiveTTS(text);
        if (gen !== ttsGeneration) return; // Cancelled
      }
    } else {
      audioUrl = await fetchLiveTTS(text);
      if (gen !== ttsGeneration) return; // Cancelled
    }

    ttsAudio = new Audio(audioUrl);
    ttsAudio.playbackRate = ttsSpeed;
    ttsAudio.onended = () => {
      onStateChange?.('stopped');
      ttsAudio = null;
    };
    ttsAudio.play();
  } catch(e) {
    if (gen === ttsGeneration) onStateChange?.('stopped');
    console.warn('TTS error:', e);
  }
}

async function fetchLiveTTS(text: string): Promise<string> {
  const res = await fetch(`${API_BASE_URL}/api/tts`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ text })
  });
  if (!res.ok) throw new Error('TTS API failed');
  const blob = await res.blob();
  return URL.createObjectURL(blob);
}

export function stopSpeaking(): void {
  ttsGeneration++; // Cancel any in-flight async speak() calls
  if (ttsAudio) { ttsAudio.pause(); ttsAudio = null; }
  onStateChange?.('stopped');
}

export function togglePause(): void {
  if (!ttsAudio) return;
  if (ttsAudio.paused) {
    ttsAudio.play();
    onStateChange?.('playing');
  } else {
    ttsAudio.pause();
    onStateChange?.('paused');
  }
}

export function toggleSlow(): boolean {
  ttsSpeed = ttsSpeed === 1.0 ? 0.75 : 1.0;
  if (ttsAudio) ttsAudio.playbackRate = ttsSpeed;
  return ttsSpeed === 0.75;
}

export function replaySpeak(): void {
  if (ttsLastText) speak(ttsLastText, ttsLastFile);
}

export function getTTSSpeed(): number {
  return ttsSpeed;
}

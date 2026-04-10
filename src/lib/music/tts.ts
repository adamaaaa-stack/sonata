// ============================================================
// TEXT-TO-SPEECH — Pre-generated audio files + live API fallback
// ============================================================
import { API_BASE_URL, isNative } from '@/lib/platform';

let ttsAudio: HTMLAudioElement | null = null;
let ttsSpeed = 1.0;
let ttsLastText = '';
let ttsLastFile = '';
let ttsGeneration = 0; // Incremented each speak() call to cancel stale async work
let onStateChange: ((state: 'playing' | 'paused' | 'stopped') => void) | null = null;
let audioUnlocked = false;

export function setTTSStateCallback(cb: (state: 'playing' | 'paused' | 'stopped') => void): void {
  onStateChange = cb;
}

/**
 * Unlock audio playback on iOS/Safari. Must be called from inside a
 * user gesture (click / touch handler). Plays a silent MP3 for a few
 * ms — this grants autoplay permission to subsequent Audio elements.
 */
export function unlockAudio(): void {
  if (audioUnlocked) return;
  try {
    const silent = new Audio(
      'data:audio/mpeg;base64,//uQxAAAAAAAAAAAAAAAAAAAAAAAWGluZwAAAA8AAAACAAACcQCA'
    );
    silent.volume = 0;
    const p = silent.play();
    if (p && typeof p.then === 'function') {
      p.then(() => { audioUnlocked = true; }).catch(() => {});
    } else {
      audioUnlocked = true;
    }
  } catch {
    // no-op
  }
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
      // On Capacitor, pre-generated files are bundled locally. Skip the
      // HEAD check (which can fail on some WKWebView configurations)
      // and just load the file directly. If it doesn't exist, the
      // Audio element's onerror will fire and we'll fall back.
      if (isNative()) {
        audioUrl = audioFile;
      } else {
        try {
          const checkRes = await fetch(audioFile, { method: 'HEAD' });
          if (gen !== ttsGeneration) return; // Cancelled
          if (checkRes.ok) {
            audioUrl = audioFile;
          } else {
            audioUrl = await fetchLiveTTS(text);
            if (gen !== ttsGeneration) return;
          }
        } catch {
          audioUrl = await fetchLiveTTS(text);
          if (gen !== ttsGeneration) return;
        }
      }
    } else {
      audioUrl = await fetchLiveTTS(text);
      if (gen !== ttsGeneration) return;
    }

    const audio = new Audio(audioUrl);
    audio.playbackRate = ttsSpeed;
    audio.preload = 'auto';
    ttsAudio = audio;

    audio.onended = () => {
      onStateChange?.('stopped');
      if (ttsAudio === audio) ttsAudio = null;
    };
    audio.onerror = async () => {
      // Audio failed to load — try the live API as fallback (once)
      if (gen !== ttsGeneration) return;
      console.warn('TTS file load failed, trying live API:', audioFile);
      try {
        const fallbackUrl = await fetchLiveTTS(text);
        if (gen !== ttsGeneration) return;
        const retry = new Audio(fallbackUrl);
        retry.playbackRate = ttsSpeed;
        ttsAudio = retry;
        retry.onended = () => {
          onStateChange?.('stopped');
          if (ttsAudio === retry) ttsAudio = null;
        };
        await retry.play().catch((e) => {
          console.warn('TTS retry play() failed:', e);
          onStateChange?.('stopped');
        });
      } catch (e) {
        console.warn('TTS fallback failed:', e);
        onStateChange?.('stopped');
      }
    };

    try {
      await audio.play();
    } catch (e) {
      console.warn('TTS play() failed:', e);
      onStateChange?.('stopped');
    }
  } catch (e) {
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

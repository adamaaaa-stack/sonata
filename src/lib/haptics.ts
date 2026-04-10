// ============================================================
// HAPTICS — Thin wrapper around @capacitor/haptics
// No-op on web. Fire-and-forget from call sites.
// ============================================================
import { isNative } from './platform';

type HapticsMod = typeof import('@capacitor/haptics');
let hapticsMod: HapticsMod | null = null;
let loadingPromise: Promise<HapticsMod | null> | null = null;

async function getMod(): Promise<HapticsMod | null> {
  if (!isNative()) return null;
  if (hapticsMod) return hapticsMod;
  if (!loadingPromise) {
    loadingPromise = import('@capacitor/haptics').then(m => {
      hapticsMod = m;
      return m;
    }).catch(() => null);
  }
  return loadingPromise;
}

export function hLight(): void {
  getMod().then(m => { m?.Haptics.impact({ style: m.ImpactStyle.Light }).catch(() => {}); });
}

export function hMedium(): void {
  getMod().then(m => { m?.Haptics.impact({ style: m.ImpactStyle.Medium }).catch(() => {}); });
}

export function hHeavy(): void {
  getMod().then(m => { m?.Haptics.impact({ style: m.ImpactStyle.Heavy }).catch(() => {}); });
}

export function hSuccess(): void {
  getMod().then(m => { m?.Haptics.notification({ type: m.NotificationType.Success }).catch(() => {}); });
}

export function hWarning(): void {
  getMod().then(m => { m?.Haptics.notification({ type: m.NotificationType.Warning }).catch(() => {}); });
}

export function hError(): void {
  getMod().then(m => { m?.Haptics.notification({ type: m.NotificationType.Error }).catch(() => {}); });
}

export function hSelect(): void {
  getMod().then(m => { m?.Haptics.selectionChanged().catch(() => {}); });
}

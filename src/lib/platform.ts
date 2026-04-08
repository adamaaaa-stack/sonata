// Platform detection and configuration for web vs native (Capacitor)

export function isNative(): boolean {
  return typeof window !== 'undefined' && !!(window as unknown as Record<string, unknown>).Capacitor;
}

// API base URL: empty for web (relative paths), absolute for mobile
export const API_BASE_URL = process.env.NEXT_PUBLIC_API_BASE_URL || '';

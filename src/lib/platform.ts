// Platform detection and configuration for web vs native (Capacitor)

export function isNative(): boolean {
  return typeof window !== 'undefined' && !!(window as unknown as Record<string, unknown>).Capacitor;
}

// API base URL: empty for web (relative paths), absolute for mobile
export const API_BASE_URL = process.env.NEXT_PUBLIC_API_BASE_URL || '';

/**
 * Navigate to another Next.js page/route in a way that works on both web and Capacitor.
 *
 * Why this exists:
 * - Next.js with `trailingSlash: true` exports pages as `/app/index.html`, `/login/index.html`, etc.
 * - Web (Vercel) auto-redirects `/app` → `/app/` → serves `/app/index.html`.
 * - Capacitor's WKWebView serves files from a static bundle with NO server — it can't
 *   redirect `/app` to `/app/`, and directory-style URLs like `/app/` sometimes fail
 *   to map to `index.html`. The only bulletproof approach is to load the file directly.
 *
 * On native: loads `/path/index.html` via `window.location.href` (hard navigation).
 * On web: uses the caller-provided Next.js router for client-side navigation.
 */
export function navigate(
  path: string,
  router?: { push: (p: string) => void; replace?: (p: string) => void },
  opts?: { replace?: boolean }
) {
  if (typeof window === 'undefined') return;

  if (isNative()) {
    // Ensure trailing slash, then append index.html for the WebView file server
    const clean = path.endsWith('/') ? path : path + '/';
    const fileUrl = clean + 'index.html';
    if (opts?.replace) {
      window.location.replace(fileUrl);
    } else {
      window.location.href = fileUrl;
    }
    return;
  }

  // Web: use Next.js router if available, otherwise fall back to hard nav
  if (router) {
    if (opts?.replace && router.replace) {
      router.replace(path);
    } else {
      router.push(path);
    }
    return;
  }
  if (opts?.replace) {
    window.location.replace(path);
  } else {
    window.location.href = path;
  }
}

"use client";

import { useEffect } from "react";
import { supabase } from "@/lib/supabase";
import { isNative, navigate } from "@/lib/platform";
import { useRouter } from "next/navigation";

/**
 * Global deep-link handler for Capacitor OAuth callbacks.
 *
 * When the user signs in with Google (or another OAuth provider), Supabase
 * opens an in-app browser, the user authenticates, and then the flow
 * redirects to `sonata://auth/callback?access_token=...&refresh_token=...`.
 *
 * That custom URL scheme triggers a `appUrlOpen` event in Capacitor's App
 * plugin. We listen for it, extract the tokens, set the Supabase session,
 * close the in-app browser, and navigate into the app.
 *
 * This component mounts globally via RootLayout so the listener is active
 * regardless of which page the user is currently on.
 */
export default function NativeAuthHandler() {
  const router = useRouter();

  useEffect(() => {
    if (!isNative()) return;

    let mounted = true;
    let cleanup: (() => void) | null = null;

    (async () => {
      try {
        const [{ App }, { Browser }] = await Promise.all([
          import("@capacitor/app"),
          import("@capacitor/browser"),
        ]);

        const handle = await App.addListener("appUrlOpen", async ({ url }) => {
          if (!mounted) return;
          // Only handle auth callback deep links
          if (!url || !url.startsWith("sonata://auth/callback")) return;

          try {
            // Close the in-app browser first
            await Browser.close().catch(() => {});

            // Extract access_token + refresh_token from the URL
            // They may be in the hash fragment or query string depending on flow
            const hashPart = url.split("#")[1] || "";
            const queryPart = url.split("?")[1]?.split("#")[0] || "";
            const params = new URLSearchParams(hashPart || queryPart || "");

            const accessToken = params.get("access_token");
            const refreshToken = params.get("refresh_token");

            if (accessToken && refreshToken) {
              const { error } = await supabase.auth.setSession({
                access_token: accessToken,
                refresh_token: refreshToken,
              });
              if (error) {
                console.warn("setSession failed:", error);
                navigate("/login/", router, { replace: true });
                return;
              }
              // Success — jump to the app
              navigate("/app/", router, { replace: true });
            } else {
              // No tokens — something went wrong
              console.warn("OAuth deep link missing tokens:", url);
              navigate("/login/", router, { replace: true });
            }
          } catch (e) {
            console.error("Deep link handling error:", e);
          }
        });

        cleanup = () => {
          handle.remove();
        };
      } catch (e) {
        console.warn("Failed to set up native auth listener:", e);
      }
    })();

    return () => {
      mounted = false;
      if (cleanup) cleanup();
    };
  }, [router]);

  return null;
}

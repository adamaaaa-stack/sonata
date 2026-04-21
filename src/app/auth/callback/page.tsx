"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";
import { isNative, navigate } from "@/lib/platform";
import { StaffBG, FloatingNotes } from "@/app/app/design";
import { Cleffy } from "@/app/app/Cleffy";
import "@/app/app/sonata.css";

export default function AuthCallback() {
  const router = useRouter();
  const [error, setError] = useState("");

  useEffect(() => {
    let cancelled = false;

    async function handleCallback() {
      try {
        // The Supabase client (with detectSessionInUrl: true) automatically
        // exchanges the OAuth code in the URL for a session. We just need
        // to wait for the session to be available, then redirect.
        const { data, error: sessionError } = await supabase.auth.getSession();

        if (cancelled) return;

        if (sessionError) {
          setError(sessionError.message);
          setTimeout(() => navigate("/login/", router, { replace: true }), 2000);
          return;
        }

        if (data.session) {
          navigate("/app/", router, { replace: true });
          return;
        }

        // No session yet — listen for the auth state change.
        const { data: sub } = supabase.auth.onAuthStateChange((event, session) => {
          if (cancelled) return;
          if (event === "SIGNED_IN" && session) {
            sub.subscription.unsubscribe();
            navigate("/app/", router, { replace: true });
          }
        });

        // Fallback: if nothing happens within 5 seconds, send back to login.
        setTimeout(() => {
          if (cancelled) return;
          sub.subscription.unsubscribe();
          setError("Sign in timed out. Please try again.");
          setTimeout(() => navigate("/login/", router, { replace: true }), 1500);
        }, 5000);
      } catch (e) {
        if (cancelled) return;
        const msg = e instanceof Error ? e.message : "Authentication failed";
        setError(msg);
        setTimeout(() => navigate("/login/", router, { replace: true }), 2000);
      }
    }

    handleCallback();

    // Mobile: listen for deep link (sonata://auth/callback?access_token=...)
    if (isNative()) {
      import("@capacitor/app").then(({ App }) => {
        App.addListener("appUrlOpen", async ({ url }) => {
          if (cancelled || !url.includes("auth/callback")) return;
          const params = new URLSearchParams(url.split("#")[1] || url.split("?")[1] || "");
          const accessToken = params.get("access_token");
          const refreshToken = params.get("refresh_token");
          if (accessToken && refreshToken) {
            await supabase.auth.setSession({ access_token: accessToken, refresh_token: refreshToken });
            navigate("/app/", router, { replace: true });
          }
        });
      });
    }

    return () => {
      cancelled = true;
    };
  }, [router]);

  return (
    <div style={{ position: 'relative', minHeight: '100vh', background: 'var(--cream)', fontFamily: 'var(--sans)', overflow: 'hidden', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 20 }}>
      <StaffBG opacity={0.22} />
      <FloatingNotes count={6} />
      <div style={{
        position: 'relative', zIndex: 2,
        background: 'var(--paper)', border: '4px solid var(--ink)',
        borderRadius: 'var(--r3)', padding: '36px 28px',
        textAlign: 'center', maxWidth: 380, width: '100%',
        boxShadow: '0 8px 0 var(--ink)',
      }}>
        <Cleffy size={110} mood={error ? 'sad' : 'thinking'} />
        <h1 style={{ fontFamily: 'var(--serif)', fontSize: 36, fontWeight: 900, fontStyle: 'italic', color: 'var(--ink)', margin: '10px 0 14px', letterSpacing: '-0.03em' }}>
          {error ? 'Hmm…' : 'Signing you in…'}
        </h1>
        {error ? (
          <p style={{ color: 'var(--coral-deep)', fontSize: 14, fontWeight: 700, margin: 0, lineHeight: 1.5 }}>{error}</p>
        ) : (
          <>
            <div style={{
              width: 36, height: 36,
              border: '4px solid var(--parchment)',
              borderTopColor: 'var(--berry)',
              borderRadius: '50%',
              margin: '0 auto 12px',
              animation: 'spin 0.8s linear infinite',
            }} />
            <p style={{ color: 'var(--ink2)', fontSize: 14, fontWeight: 600, margin: 0, fontStyle: 'italic', fontFamily: 'var(--serif)' }}>
              One moment while Cleffy opens the door.
            </p>
          </>
        )}
      </div>
    </div>
  );
}


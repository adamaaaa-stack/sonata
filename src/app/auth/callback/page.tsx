"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";

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
          setTimeout(() => router.replace("/login"), 2000);
          return;
        }

        if (data.session) {
          router.replace("/app");
          return;
        }

        // No session yet — listen for the auth state change.
        const { data: sub } = supabase.auth.onAuthStateChange((event, session) => {
          if (cancelled) return;
          if (event === "SIGNED_IN" && session) {
            sub.subscription.unsubscribe();
            router.replace("/app");
          }
        });

        // Fallback: if nothing happens within 5 seconds, send back to login.
        setTimeout(() => {
          if (cancelled) return;
          sub.subscription.unsubscribe();
          setError("Sign in timed out. Please try again.");
          setTimeout(() => router.replace("/login"), 1500);
        }, 5000);
      } catch (e) {
        if (cancelled) return;
        const msg = e instanceof Error ? e.message : "Authentication failed";
        setError(msg);
        setTimeout(() => router.replace("/login"), 2000);
      }
    }

    handleCallback();

    return () => {
      cancelled = true;
    };
  }, [router]);

  return (
    <div style={styles.page}>
      <div style={styles.card}>
        <h1 style={styles.title}>Sonata</h1>
        {error ? (
          <p style={styles.error}>{error}</p>
        ) : (
          <>
            <div style={styles.spinner} />
            <p style={styles.text}>Signing you in...</p>
          </>
        )}
      </div>
      <style>{`
        @keyframes spin {
          to { transform: rotate(360deg); }
        }
      `}</style>
    </div>
  );
}

const styles: Record<string, React.CSSProperties> = {
  page: {
    minHeight: "100vh",
    background: "#0C0A09",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    fontFamily: "'Outfit', system-ui, -apple-system, sans-serif",
    padding: 20,
  },
  card: {
    background: "#1C1917",
    border: "1px solid #292524",
    borderRadius: 14,
    padding: "40px 32px",
    textAlign: "center",
    maxWidth: 360,
    width: "100%",
  },
  title: {
    fontFamily: "'Instrument Serif', Georgia, serif",
    fontSize: 36,
    fontWeight: 400,
    color: "#C8A96E",
    marginBottom: 24,
  },
  spinner: {
    width: 32,
    height: 32,
    border: "3px solid #292524",
    borderTopColor: "#C8A96E",
    borderRadius: "50%",
    margin: "0 auto 16px",
    animation: "spin 0.8s linear infinite",
  },
  text: {
    color: "#78716C",
    fontSize: 14,
  },
  error: {
    color: "#F87171",
    fontSize: 14,
  },
};

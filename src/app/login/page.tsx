"use client";

import { Suspense, useState } from "react";
import { supabase } from "@/lib/supabase";
import { useRouter, useSearchParams } from "next/navigation";
import { isNative, navigate } from "@/lib/platform";

export default function LoginPage() {
  return <Suspense fallback={<div style={{ minHeight: '100vh', background: '#0C0A09' }} />}><LoginInner /></Suspense>;
}

function LoginInner() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const modeParam = searchParams.get("mode");
  const [mode, setMode] = useState<"signin" | "signup">(modeParam === "signup" ? "signup" : "signin");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setMessage("");
    setLoading(true);

    if (mode === "signup") {
      if (password !== confirmPassword) {
        setError("Passwords do not match");
        setLoading(false);
        return;
      }
      const { data, error: signUpError } = await supabase.auth.signUp({
        email,
        password,
      });
      if (signUpError) {
        setError(signUpError.message);
      } else if (data.session) {
        // Email confirmation disabled — user is logged in immediately
        navigate("/app/", router);
      } else {
        // Email confirmation enabled — tell them to check email
        setMessage("Check your email to confirm your account, then sign in.");
        setMode("signin");
      }
    } else {
      const { error: signInError } = await supabase.auth.signInWithPassword({
        email,
        password,
      });
      if (signInError) {
        setError(signInError.message);
      } else {
        navigate("/app/", router);
      }
    }
    setLoading(false);
  }

  async function handleOAuth(provider: 'google' | 'apple') {
    if (isNative()) {
      const { data, error: oErr } = await supabase.auth.signInWithOAuth({
        provider,
        options: {
          redirectTo: "sonata://auth/callback",
          skipBrowserRedirect: true,
        },
      });
      if (oErr) { setError(oErr.message); return; }
      if (data?.url) {
        const { Browser } = await import("@capacitor/browser");
        await Browser.open({ url: data.url });
      }
    } else {
      const { error: oErr } = await supabase.auth.signInWithOAuth({
        provider,
        options: { redirectTo: window.location.origin + "/auth/callback/" },
      });
      if (oErr) setError(oErr.message);
    }
  }

  return (
    <div style={styles.page}>
      <div style={styles.card}>
        <h1 style={styles.title}>Sonata</h1>
        <p style={styles.subtitle}>
          {mode === "signin" ? "Sign in to continue" : "Create your account"}
        </p>

        {/* Sign in with Apple — required by Apple Guideline 4.8 (native only) */}
        {isNative() && (
          <button onClick={() => handleOAuth('apple')} style={styles.appleBtn}>
            <svg width="18" height="18" viewBox="0 0 17 20" fill="currentColor" style={{flexShrink:0}}>
              <path d="M13.545 10.239c-.022-2.243 1.835-3.32 1.918-3.37-1.044-1.527-2.67-1.736-3.248-1.76-1.382-.14-2.7.814-3.4.814-.7 0-1.786-.793-2.934-.772-1.51.022-2.904.878-3.682 2.232-1.57 2.723-.402 6.76 1.128 8.971.748 1.08 1.64 2.294 2.812 2.252 1.128-.046 1.554-.73 2.918-.73 1.364 0 1.746.73 2.934.708 1.214-.022 1.984-1.1 2.728-2.184.86-1.252 1.214-2.464 1.236-2.526-.028-.012-2.37-.91-2.394-3.61l.004-.025zM11.32 3.263c.622-.754 1.042-1.8.928-2.844-.896.036-1.982.598-2.626 1.35-.576.668-1.082 1.734-.946 2.758.998.078 2.016-.508 2.644-1.264z"/>
            </svg>
            Continue with Apple
          </button>
        )}

        <button onClick={() => handleOAuth('google')} style={isNative() ? styles.googleBtn : styles.appleBtn}>
          <svg width="18" height="18" viewBox="0 0 48 48" style={{flexShrink:0}}>
            <path fill="#EA4335" d="M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.56 13.22l7.98 6.19C12.43 13.72 17.74 9.5 24 9.5z"/>
            <path fill="#4285F4" d="M46.98 24.55c0-1.57-.15-3.09-.38-4.55H24v9.02h12.94c-.58 2.96-2.26 5.48-4.78 7.18l7.73 6c4.51-4.18 7.09-10.36 7.09-17.65z"/>
            <path fill="#FBBC05" d="M10.53 28.59c-.48-1.45-.76-2.99-.76-4.59s.27-3.14.76-4.59l-7.98-6.19C.92 16.46 0 20.12 0 24c0 3.88.92 7.54 2.56 10.78l7.97-6.19z"/>
            <path fill="#34A853" d="M24 48c6.48 0 11.93-2.13 15.89-5.81l-7.73-6c-2.15 1.45-4.92 2.3-8.16 2.3-6.26 0-11.57-4.22-13.47-9.91l-7.98 6.19C6.51 42.62 14.62 48 24 48z"/>
          </svg>
          Continue with Google
        </button>

        <div style={styles.divider}>
          <div style={styles.dividerLine} />
          <span style={styles.dividerText}>or use email</span>
          <div style={styles.dividerLine} />
        </div>

        <div style={styles.toggle}>
          <button
            onClick={() => { setMode("signin"); setError(""); }}
            style={mode === "signin" ? styles.toggleActive : styles.toggleBtn}
          >
            Sign In
          </button>
          <button
            onClick={() => { setMode("signup"); setError(""); }}
            style={mode === "signup" ? styles.toggleActive : styles.toggleBtn}
          >
            Sign Up
          </button>
        </div>

        <form onSubmit={handleSubmit} style={styles.form}>
          <input
            type="email"
            placeholder="Email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
            style={styles.input}
          />
          <input
            type="password"
            placeholder="Password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
            minLength={6}
            style={styles.input}
          />
          {mode === "signup" && (
            <input
              type="password"
              placeholder="Confirm password"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              required
              minLength={6}
              style={styles.input}
            />
          )}
          {error && <div style={styles.error}>{error}</div>}
          {message && <div style={styles.message}>{message}</div>}
          <button type="submit" disabled={loading} style={styles.button}>
            {loading
              ? "..."
              : mode === "signin"
              ? "Sign In"
              : "Sign Up"}
          </button>
          {mode === "signin" && (
            <button type="button" onClick={async () => {
              if (!email) { setError("Enter your email first"); return; }
              const { error: resetErr } = await supabase.auth.resetPasswordForEmail(email, {
                redirectTo: window.location.origin + "/app/",
              });
              if (resetErr) setError(resetErr.message);
              else setMessage("Password reset email sent. Check your inbox.");
            }} style={styles.resetLink}>
              Forgot password?
            </button>
          )}
        </form>
      </div>
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
    width: "100%",
    maxWidth: 400,
  },
  title: {
    fontFamily: "'Instrument Serif', Georgia, serif",
    fontSize: 36,
    fontWeight: 400,
    color: "#C8A96E",
    textAlign: "center",
    marginBottom: 4,
  },
  subtitle: {
    fontSize: 14,
    color: "#78716C",
    textAlign: "center",
    marginBottom: 24,
    fontWeight: 300,
  },
  appleBtn: {
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    gap: 10,
    width: "100%",
    padding: "12px 0",
    background: "#FAFAF9",
    color: "#0C0A09",
    border: "none",
    borderRadius: 10,
    fontSize: 14,
    fontWeight: 500,
    cursor: "pointer",
    fontFamily: "'Outfit', system-ui, sans-serif",
    marginBottom: 10,
    boxSizing: "border-box" as const,
  },
  googleBtn: {
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    gap: 10,
    width: "100%",
    padding: "12px 0",
    background: "transparent",
    color: "#FAFAF9",
    border: "1px solid #292524",
    borderRadius: 10,
    fontSize: 14,
    fontWeight: 500,
    cursor: "pointer",
    fontFamily: "'Outfit', system-ui, sans-serif",
    marginBottom: 16,
    boxSizing: "border-box" as const,
  },
  divider: {
    display: "flex",
    alignItems: "center",
    gap: 12,
    marginBottom: 16,
  },
  dividerLine: {
    flex: 1,
    height: 1,
    background: "#292524",
  },
  dividerText: {
    fontSize: 12,
    color: "#44403C",
  },
  toggle: {
    display: "flex",
    gap: 4,
    marginBottom: 20,
    background: "#0C0A09",
    borderRadius: 10,
    padding: 4,
  },
  toggleBtn: {
    flex: 1,
    padding: "8px 0",
    background: "transparent",
    border: "none",
    borderRadius: 8,
    color: "#78716C",
    fontSize: 13,
    cursor: "pointer",
    fontFamily: "'Outfit', system-ui, sans-serif",
    fontWeight: 400,
  },
  toggleActive: {
    flex: 1,
    padding: "8px 0",
    background: "#292524",
    border: "none",
    borderRadius: 8,
    color: "#FAFAF9",
    fontSize: 13,
    cursor: "pointer",
    fontFamily: "'Outfit', system-ui, sans-serif",
    fontWeight: 500,
  },
  form: {
    display: "flex",
    flexDirection: "column",
    gap: 12,
  },
  input: {
    padding: "12px 14px",
    background: "#0C0A09",
    border: "1px solid #292524",
    borderRadius: 10,
    color: "#FAFAF9",
    fontSize: 14,
    fontFamily: "'Outfit', system-ui, sans-serif",
    outline: "none",
    width: "100%",
    boxSizing: "border-box",
  },
  button: {
    padding: "14px 0",
    background: "#C8A96E",
    color: "#0C0A09",
    border: "none",
    borderRadius: 10,
    fontSize: 15,
    fontWeight: 500,
    cursor: "pointer",
    fontFamily: "'Outfit', system-ui, sans-serif",
    marginTop: 4,
  },
  error: {
    color: "#F87171",
    fontSize: 13,
    textAlign: "center",
    padding: "4px 0",
  },
  message: {
    color: "#4ADE80",
    fontSize: 13,
    textAlign: "center",
    padding: "4px 0",
  },
  resetLink: {
    background: "none",
    border: "none",
    color: "#78716C",
    fontSize: 12,
    cursor: "pointer",
    fontFamily: "'Outfit', system-ui, sans-serif",
    textDecoration: "underline",
    padding: "4px 0",
    width: "100%",
    textAlign: "center" as const,
  },
};

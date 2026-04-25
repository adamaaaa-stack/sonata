"use client";

import { Suspense, useState } from "react";
import { supabase } from "@/lib/supabase";
import { useRouter, useSearchParams } from "next/navigation";
import { isNative, navigate } from "@/lib/platform";
import { Cleffy } from "@/app/app/Cleffy";
import { ChunkyButton, Sticker, StaffBG, FloatingNotes } from "@/app/app/design";
import "@/app/app/sonata.css";

export default function LoginPage() {
  return (
    <Suspense fallback={
      <div style={{ position: 'relative', minHeight: '100vh', background: '#FFF6E4', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <div style={{ width: 28, height: 28, border: '4px solid var(--parchment, #E9DCC0)', borderTopColor: 'var(--berry, #E86D6D)', borderRadius: '50%', animation: 'sn-spin 0.8s linear infinite' }} />
      </div>
    }>
      <LoginInner />
    </Suspense>
  );
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
    setError(""); setMessage(""); setLoading(true);

    if (mode === "signup") {
      if (password !== confirmPassword) {
        setError("Passwords do not match");
        setLoading(false);
        return;
      }
      const { data, error: signUpError } = await supabase.auth.signUp({ email, password });
      if (signUpError) setError(signUpError.message);
      else if (data.session) navigate("/app/", router);
      else { setMessage("Check your email to confirm your account, then sign in."); setMode("signin"); }
    } else {
      const { error: signInError } = await supabase.auth.signInWithPassword({ email, password });
      if (signInError) setError(signInError.message);
      else navigate("/app/", router);
    }
    setLoading(false);
  }

  async function handleOAuth(provider: 'google' | 'apple') {
    if (isNative()) {
      const { data, error: oErr } = await supabase.auth.signInWithOAuth({
        provider,
        options: { redirectTo: "sonata://auth/callback", skipBrowserRedirect: true },
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
    <div style={{ position: 'relative', minHeight: '100vh', background: 'var(--cream)', fontFamily: 'var(--sans)', overflow: 'hidden', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 20 }}>
      <StaffBG opacity={0.25} />
      <FloatingNotes count={8} />

      <div style={{
        position: 'relative', zIndex: 2,
        width: '100%', maxWidth: 440,
        background: 'var(--paper)',
        border: '4px solid var(--ink)',
        borderRadius: 'var(--r3)',
        padding: '32px 28px 28px',
        boxShadow: '0 8px 0 var(--ink)',
      }}>
        {/* Cleffy + title */}
        <div style={{ textAlign: 'center', marginBottom: 20 }}>
          <div style={{ display: 'inline-block', marginBottom: 4 }}>
            <Cleffy size={100} mood={mode === 'signup' ? 'excited' : 'happy'} />
          </div>
          <Sticker color={mode === 'signup' ? 'mint' : 'gold'} rotate={-3} style={{ marginBottom: 8 }}>
            ◆ {mode === 'signup' ? 'Join the band' : 'Welcome back'}
          </Sticker>
          <h1 style={{ fontFamily: 'var(--serif)', fontSize: 48, fontWeight: 900, fontStyle: 'italic', color: 'var(--ink)', margin: 0, letterSpacing: '-0.03em', lineHeight: 0.95 }}>
            {mode === 'signup' ? (
              <>Hello, <span style={{ color: 'var(--berry)' }}>maestro.</span></>
            ) : (
              <>Ready to <span style={{ color: 'var(--berry)' }}>play.</span></>
            )}
          </h1>
          <p style={{ fontSize: 14, color: 'var(--ink3)', marginTop: 6, fontWeight: 600 }}>
            {mode === "signin" ? "Sign in to continue" : "Create your account"}
          </p>
        </div>

        {/* OAuth buttons */}
        {isNative() && (
          <button onClick={() => handleOAuth('apple')} className="sn-btn sn-chunky" style={{
            padding: '14px 0', width: '100%', marginBottom: 10,
            background: 'var(--ink)', color: 'var(--cream)',
            fontSize: 15, fontWeight: 800,
            ['--shadow' as string]: 'var(--ink2)',
            textTransform: 'none', letterSpacing: 0,
            justifyContent: 'center',
          }}>
            <svg width="18" height="18" viewBox="0 0 17 20" fill="currentColor" style={{ flexShrink: 0 }}>
              <path d="M13.545 10.239c-.022-2.243 1.835-3.32 1.918-3.37-1.044-1.527-2.67-1.736-3.248-1.76-1.382-.14-2.7.814-3.4.814-.7 0-1.786-.793-2.934-.772-1.51.022-2.904.878-3.682 2.232-1.57 2.723-.402 6.76 1.128 8.971.748 1.08 1.64 2.294 2.812 2.252 1.128-.046 1.554-.73 2.918-.73 1.364 0 1.746.73 2.934.708 1.214-.022 1.984-1.1 2.728-2.184.86-1.252 1.214-2.464 1.236-2.526-.028-.012-2.37-.91-2.394-3.61l.004-.025zM11.32 3.263c.622-.754 1.042-1.8.928-2.844-.896.036-1.982.598-2.626 1.35-.576.668-1.082 1.734-.946 2.758.998.078 2.016-.508 2.644-1.264z" />
            </svg>
            Continue with Apple
          </button>
        )}
        <button onClick={() => handleOAuth('google')} className="sn-btn sn-chunky" style={{
          padding: '14px 0', width: '100%', marginBottom: 18,
          background: 'var(--cream)', color: 'var(--ink)',
          fontSize: 15, fontWeight: 800,
          ['--shadow' as string]: 'var(--ink)',
          textTransform: 'none', letterSpacing: 0,
          justifyContent: 'center',
        }}>
          <svg width="18" height="18" viewBox="0 0 48 48" style={{ flexShrink: 0 }}>
            <path fill="#EA4335" d="M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.56 13.22l7.98 6.19C12.43 13.72 17.74 9.5 24 9.5z" />
            <path fill="#4285F4" d="M46.98 24.55c0-1.57-.15-3.09-.38-4.55H24v9.02h12.94c-.58 2.96-2.26 5.48-4.78 7.18l7.73 6c4.51-4.18 7.09-10.36 7.09-17.65z" />
            <path fill="#FBBC05" d="M10.53 28.59c-.48-1.45-.76-2.99-.76-4.59s.27-3.14.76-4.59l-7.98-6.19C.92 16.46 0 20.12 0 24c0 3.88.92 7.54 2.56 10.78l7.97-6.19z" />
            <path fill="#34A853" d="M24 48c6.48 0 11.93-2.13 15.89-5.81l-7.73-6c-2.15 1.45-4.92 2.3-8.16 2.3-6.26 0-11.57-4.22-13.47-9.91l-7.98 6.19C6.51 42.62 14.62 48 24 48z" />
          </svg>
          Continue with Google
        </button>

        {/* Divider */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 18 }}>
          <div style={{ flex: 1, height: 2, background: 'var(--ink)', opacity: 0.2, borderRadius: 1 }} />
          <span style={{ fontSize: 11, fontFamily: 'var(--sans)', fontWeight: 800, letterSpacing: '0.15em', color: 'var(--ink3)', textTransform: 'uppercase' }}>or with email</span>
          <div style={{ flex: 1, height: 2, background: 'var(--ink)', opacity: 0.2, borderRadius: 1 }} />
        </div>

        {/* Mode toggle */}
        <div style={{ display: 'flex', gap: 0, marginBottom: 18, background: 'var(--parchment)', border: '3px solid var(--ink)', borderRadius: 999, padding: 4 }}>
          <button onClick={() => { setMode("signin"); setError(""); }}
            style={{
              flex: 1, padding: '10px 0', borderRadius: 999,
              background: mode === 'signin' ? 'var(--ink)' : 'transparent',
              color: mode === 'signin' ? 'var(--cream)' : 'var(--ink2)',
              border: 'none', fontSize: 13, fontWeight: 800, cursor: 'pointer',
              fontFamily: 'var(--sans)', textTransform: 'uppercase', letterSpacing: '0.08em',
              transition: 'all 0.2s',
            }}>
            Sign In
          </button>
          <button onClick={() => { setMode("signup"); setError(""); }}
            style={{
              flex: 1, padding: '10px 0', borderRadius: 999,
              background: mode === 'signup' ? 'var(--ink)' : 'transparent',
              color: mode === 'signup' ? 'var(--cream)' : 'var(--ink2)',
              border: 'none', fontSize: 13, fontWeight: 800, cursor: 'pointer',
              fontFamily: 'var(--sans)', textTransform: 'uppercase', letterSpacing: '0.08em',
              transition: 'all 0.2s',
            }}>
            Sign Up
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          <input
            type="email" placeholder="Email" value={email}
            onChange={e => setEmail(e.target.value)} required
            style={inputStyle}
          />
          <input
            type="password" placeholder="Password" value={password}
            onChange={e => setPassword(e.target.value)} required minLength={6}
            style={inputStyle}
          />
          {mode === "signup" && (
            <input
              type="password" placeholder="Confirm password" value={confirmPassword}
              onChange={e => setConfirmPassword(e.target.value)} required minLength={6}
              style={inputStyle}
            />
          )}

          {error && <div style={{ color: 'var(--coral-deep)', fontSize: 13, textAlign: 'center', padding: '6px 12px', background: 'rgba(255,107,107,0.15)', border: '2px solid var(--coral)', borderRadius: 'var(--r1)', fontWeight: 700 }}>{error}</div>}
          {message && <div style={{ color: 'var(--mint-deep)', fontSize: 13, textAlign: 'center', padding: '6px 12px', background: 'rgba(62,207,142,0.15)', border: '2px solid var(--mint)', borderRadius: 'var(--r1)', fontWeight: 700 }}>{message}</div>}

          <ChunkyButton
            type="submit"
            color={mode === 'signup' ? 'berry' : 'gold'}
            size="lg"
            disabled={loading}
            style={{ justifyContent: 'center', width: '100%', marginTop: 4 }}
          >
            {loading ? '...' : mode === "signin" ? "Sign In" : "Create Account"}
          </ChunkyButton>

          {mode === "signin" && (
            <button type="button" onClick={async () => {
              if (!email) { setError("Enter your email first"); return; }
              const { error: resetErr } = await supabase.auth.resetPasswordForEmail(email, {
                redirectTo: window.location.origin + "/app/",
              });
              if (resetErr) setError(resetErr.message);
              else setMessage("Password reset email sent. Check your inbox.");
            }} style={{
              background: 'none', border: 'none', color: 'var(--ink3)',
              fontSize: 12, cursor: 'pointer', fontFamily: 'var(--sans)',
              textDecoration: 'underline', padding: 4, fontWeight: 600,
            }}>
              Forgot password?
            </button>
          )}
        </form>
      </div>
    </div>
  );
}

const inputStyle: React.CSSProperties = {
  padding: '12px 16px',
  background: 'var(--cream)',
  border: '3px solid var(--ink)',
  borderRadius: 'var(--r1)',
  color: 'var(--ink)',
  fontSize: 14,
  fontFamily: 'var(--sans)',
  fontWeight: 600,
  outline: 'none',
  width: '100%',
  boxSizing: 'border-box',
  boxShadow: '0 3px 0 var(--ink)',
};

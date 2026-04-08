"use client";

import { Suspense, useState, useEffect } from "react";
import { supabase } from "@/lib/supabase";
import { loadLicense } from "@/lib/supabaseData";
import type { LicenseRow } from "@/lib/supabaseData";
import { useRouter, useSearchParams } from "next/navigation";
import type { User } from "@supabase/supabase-js";

export default function AccountPage() {
  return <Suspense fallback={<div style={{ minHeight: '100vh', background: '#0C0A09' }} />}><AccountInner /></Suspense>;
}

function AccountInner() {
  const [user, setUser] = useState<User | null>(null);
  const [license, setLicense] = useState<LicenseRow | null>(null);
  const [licenseKey, setLicenseKey] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [activating, setActivating] = useState(false);
  const [showDelete, setShowDelete] = useState(false);
  const [deleteConfirm, setDeleteConfirm] = useState("");
  const router = useRouter();
  const searchParams = useSearchParams();

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (!session) { router.push("/login"); return; }
      setUser(session.user);
      loadLicense(session.user.id).then(l => setLicense(l));

      // Auto-activate from URL param (e.g. ?license_key=xxx after Gumroad redirect)
      const urlKey = searchParams.get("license_key");
      if (urlKey) {
        setLicenseKey(urlKey);
        activateLicense(urlKey, session.user.id);
      }
    });
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [router, searchParams]);

  async function activateLicense(key: string, userId: string) {
    setActivating(true);
    setError(""); setMessage("");
    try {
      const res = await fetch("/api/activate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ key, userId }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || "Activation failed");
      } else {
        setMessage("License activated! You now have full access.");
        setLicenseKey("");
        const l = await loadLicense(userId);
        setLicense(l);
      }
    } catch {
      setError("Network error. Please try again.");
    }
    setActivating(false);
  }

  async function handlePasswordChange(e: React.FormEvent) {
    e.preventDefault();
    setError(""); setMessage("");
    if (newPassword.length < 6) { setError("Password must be at least 6 characters"); return; }
    const { error: err } = await supabase.auth.updateUser({ password: newPassword });
    if (err) setError(err.message);
    else { setMessage("Password updated successfully"); setNewPassword(""); }
  }

  async function handleDeleteAccount() {
    if (deleteConfirm !== "DELETE") { setError("Type DELETE to confirm"); return; }
    setError(""); setMessage("");
    if (!user) return;
    await supabase.from("licenses").delete().eq("user_id", user.id);
    await supabase.from("drill_sessions").delete().eq("user_id", user.id);
    await supabase.from("lesson_progress").delete().eq("user_id", user.id);
    await supabase.from("user_progress").delete().eq("user_id", user.id);
    localStorage.clear();
    await supabase.auth.signOut();
    router.push("/");
  }

  if (!user) return <div style={a.page}><div style={a.container}><p style={{ color: '#78716C' }}>Loading...</p></div></div>;

  return (
    <div style={a.page}>
      <div style={a.container}>
        <a href="/app" style={a.back}>&larr; Back to app</a>
        <h1 style={a.title}>Account</h1>

        <div style={a.card}>
          <div style={a.label}>Email</div>
          <div style={a.value}>{user.email}</div>
        </div>

        {/* License / Premium Status */}
        <div style={{ ...a.card, borderColor: license ? 'rgba(74,222,128,0.2)' : 'rgba(200,169,110,0.2)' }}>
          <div style={a.label}>Premium</div>
          {license ? (
            <div style={{ marginTop: 8 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 15 }}>
                <span style={{ display: 'inline-block', width: 8, height: 8, borderRadius: '50%', background: '#4ADE80' }} />
                Active
              </div>
              <div style={{ fontSize: 12, color: '#78716C', marginTop: 4 }}>
                Activated {new Date(license.activated_at).toLocaleDateString()}
              </div>
            </div>
          ) : (
            <div style={{ marginTop: 8 }}>
              <p style={{ fontSize: 13, color: '#A8A29E', marginBottom: 10, lineHeight: 1.6 }}>
                Enter your license key from Gumroad to unlock all features.
              </p>
              <div style={{ display: 'flex', gap: 8 }}>
                <input
                  type="text"
                  placeholder="XXXXXXXX-XXXXXXXX-XXXXXXXX-XXXXXXXX"
                  value={licenseKey}
                  onChange={e => setLicenseKey(e.target.value)}
                  style={{ ...a.input, flex: 1, fontFamily: "'JetBrains Mono', monospace", fontSize: 12 }}
                />
                <button
                  onClick={() => activateLicense(licenseKey, user.id)}
                  disabled={activating || !licenseKey.trim()}
                  style={{ ...a.btn, width: 'auto', padding: '10px 16px', opacity: activating || !licenseKey.trim() ? 0.5 : 1 }}
                >
                  {activating ? '...' : 'Activate'}
                </button>
              </div>
              <a
                href={process.env.NEXT_PUBLIC_GUMROAD_URL || '#'}
                target="_blank"
                rel="noopener noreferrer"
                style={{ display: 'block', fontSize: 12, color: '#C8A96E', marginTop: 10, textDecoration: 'underline' }}
              >
                Don&apos;t have a key? Get one here
              </a>
            </div>
          )}
        </div>

        <div style={a.card}>
          <div style={a.label}>Change Password</div>
          <form onSubmit={handlePasswordChange} style={{ display: 'flex', flexDirection: 'column', gap: 8, marginTop: 8 }}>
            <input type="password" placeholder="New password (min 6 chars)" value={newPassword}
              onChange={e => setNewPassword(e.target.value)} minLength={6} required style={a.input} />
            <button type="submit" style={a.btn}>Update Password</button>
          </form>
        </div>

        {message && <div style={a.msg}>{message}</div>}
        {error && <div style={a.err}>{error}</div>}

        <div style={{ ...a.card, borderColor: 'rgba(248,113,113,0.2)' }}>
          <div style={{ ...a.label, color: '#F87171' }}>Danger Zone</div>
          {!showDelete ? (
            <button onClick={() => setShowDelete(true)} style={{ ...a.btn, background: 'transparent', border: '1px solid rgba(248,113,113,0.3)', color: '#F87171', marginTop: 8 }}>
              Delete my account
            </button>
          ) : (
            <div style={{ marginTop: 8 }}>
              <p style={{ fontSize: 13, color: '#A8A29E', marginBottom: 8, lineHeight: 1.6 }}>
                This will permanently delete your account and all your progress. This action cannot be undone. Type <b style={{ color: '#F87171' }}>DELETE</b> to confirm.
              </p>
              <input type="text" placeholder="Type DELETE" value={deleteConfirm}
                onChange={e => setDeleteConfirm(e.target.value)} style={a.input} />
              <div style={{ display: 'flex', gap: 8, marginTop: 8 }}>
                <button onClick={() => { setShowDelete(false); setDeleteConfirm(""); }} style={{ ...a.btn, background: 'var(--bg3)', flex: 1 }}>Cancel</button>
                <button onClick={handleDeleteAccount} style={{ ...a.btn, background: '#F87171', color: '#0C0A09', flex: 1 }}>Delete Forever</button>
              </div>
            </div>
          )}
        </div>

        <div style={{ marginTop: 24, display: 'flex', gap: 16, justifyContent: 'center' }}>
          <a href="/terms" style={a.link}>Terms of Service</a>
          <a href="/privacy" style={a.link}>Privacy Policy</a>
        </div>
      </div>
    </div>
  );
}

const a: Record<string, React.CSSProperties> = {
  page: { minHeight: '100vh', background: '#0C0A09', color: '#FAFAF9', fontFamily: "'Outfit', system-ui, sans-serif", padding: '24px 20px' },
  container: { maxWidth: 480, margin: '0 auto' },
  back: { color: '#78716C', fontSize: 13, textDecoration: 'none' },
  title: { fontFamily: "'Instrument Serif', Georgia, serif", fontSize: 28, fontWeight: 400, color: '#C8A96E', margin: '24px 0 20px' },
  card: { padding: '20px', background: '#1C1917', border: '1px solid #292524', borderRadius: 14, marginBottom: 12 },
  label: { fontSize: 11, color: '#78716C', textTransform: 'uppercase' as const, letterSpacing: '0.08em', fontWeight: 500 },
  value: { fontSize: 15, marginTop: 6 },
  input: { width: '100%', padding: '10px 14px', background: '#0C0A09', border: '1px solid #292524', borderRadius: 10, color: '#FAFAF9', fontSize: 14, fontFamily: "'Outfit', system-ui, sans-serif", outline: 'none', boxSizing: 'border-box' as const },
  btn: { padding: '10px 20px', background: '#C8A96E', color: '#0C0A09', border: 'none', borderRadius: 10, fontSize: 13, fontWeight: 500, cursor: 'pointer', fontFamily: "'Outfit', system-ui, sans-serif", width: '100%' },
  msg: { color: '#4ADE80', fontSize: 13, textAlign: 'center' as const, padding: '8px 0' },
  err: { color: '#F87171', fontSize: 13, textAlign: 'center' as const, padding: '8px 0' },
  link: { color: '#78716C', fontSize: 12, textDecoration: 'underline' },
};

"use client";

import { Suspense, useState, useEffect } from "react";
import { supabase } from "@/lib/supabase";
import { useRouter } from "next/navigation";
import { navigate, isNative } from "@/lib/platform";
import { hasActiveSubscription, restorePurchases } from "@/lib/subscriptions";
import { loadLicense } from "@/lib/supabaseData";
import { isAmbianceEnabled, setAmbianceEnabled, startAmbiance, stopAmbiance } from "@/lib/music/effects";
import type { User } from "@supabase/supabase-js";

export default function AccountPage() {
  return <Suspense fallback={<div style={{ minHeight: '100vh', background: '#0C0A09' }} />}><AccountInner /></Suspense>;
}

function AccountInner() {
  const [user, setUser] = useState<User | null>(null);
  const [newPassword, setNewPassword] = useState("");
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [showDelete, setShowDelete] = useState(false);
  const [deleteConfirm, setDeleteConfirm] = useState("");
  const [subActive, setSubActive] = useState(false);
  const [restoring, setRestoring] = useState(false);
  const [licenseKey, setLicenseKey] = useState("");
  const [activating, setActivating] = useState(false);
  const [ambiance, setAmbiance] = useState(false);
  const [parchment, setParchment] = useState(false);
  const router = useRouter();

  useEffect(() => {
    setAmbiance(isAmbianceEnabled());
    if (typeof document !== 'undefined') {
      const stored = localStorage.getItem('sonata_theme') === 'parchment';
      setParchment(stored);
      document.documentElement.classList.toggle('parchment', stored);
    }
  }, []);

  function toggleAmbiance() {
    const next = !ambiance;
    setAmbiance(next);
    setAmbianceEnabled(next);
    if (next) startAmbiance(); else stopAmbiance();
  }

  function toggleParchment() {
    const next = !parchment;
    setParchment(next);
    localStorage.setItem('sonata_theme', next ? 'parchment' : 'dark');
    document.documentElement.classList.toggle('parchment', next);
  }

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (!session) { navigate("/login/", router); return; }
      setUser(session.user);
      // Web: check if user has a Gumroad license
      if (!isNative()) {
        loadLicense(session.user.id).then(l => { if (l) setSubActive(true); });
      }
    });
    hasActiveSubscription().then(setSubActive);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [router]);

  async function activateLicense() {
    if (!licenseKey.trim() || !user) return;
    setActivating(true);
    setError(""); setMessage("");
    try {
      const res = await fetch("/api/activate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ key: licenseKey.trim(), userId: user.id }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || "Activation failed");
      } else {
        setMessage("License activated! You now have full access.");
        setLicenseKey("");
        setSubActive(true);
        // Persist flag so the app picks it up immediately on next navigation
        try { localStorage.setItem('sonata_web_license', 'true'); } catch {}
      }
    } catch {
      setError("Network error. Please try again.");
    }
    setActivating(false);
  }

  async function handleRestore() {
    setRestoring(true);
    setError(""); setMessage("");
    const ok = await restorePurchases();
    setSubActive(ok);
    if (ok) setMessage("Subscription restored.");
    else setError("No active subscription found.");
    setRestoring(false);
  }

  function openManage() {
    // iOS: opens App Store subscription management. Works inside the in-app browser / system.
    window.location.href = "https://apps.apple.com/account/subscriptions";
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
    await supabase.from("drill_sessions").delete().eq("user_id", user.id);
    await supabase.from("lesson_progress").delete().eq("user_id", user.id);
    await supabase.from("user_progress").delete().eq("user_id", user.id);
    localStorage.clear();
    await supabase.auth.signOut();
    navigate("/", router);
  }

  if (!user) return <div style={a.page}><div style={a.container}><p style={{ color: '#78716C' }}>Loading...</p></div></div>;

  return (
    <div style={a.page}>
      <div style={a.container}>
        <button type="button" onClick={() => navigate("/app/", router)} style={a.back}>&larr; Back to app</button>
        <h1 style={a.title}>Account</h1>

        <div style={a.card}>
          <div style={a.label}>Email</div>
          <div style={a.value}>{user.email}</div>
        </div>

        <div style={{ ...a.card, borderColor: subActive ? 'rgba(74,222,128,0.25)' : 'rgba(200,169,110,0.2)' }}>
          <div style={a.label}>Membership</div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginTop: 8, fontSize: 15 }}>
            <span style={{ display: 'inline-block', width: 8, height: 8, borderRadius: '50%', background: subActive ? '#4ADE80' : '#78716C' }} />
            {subActive ? 'Premium — Active' : 'Free plan'}
          </div>
          {!subActive && (
            <p style={{ fontSize: 13, color: '#A8A29E', marginTop: 8, lineHeight: 1.6 }}>
              You have 3 free lessons and 1 free drill. Upgrade to unlock all 23 lessons, every drill, and the full library.
            </p>
          )}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginTop: 12 }}>
            {subActive ? (
              isNative() ? (
                <button onClick={openManage} style={a.btn}>Manage in App Store</button>
              ) : (
                <button onClick={() => navigate("/pricing/", router)} style={a.btn}>View plans</button>
              )
            ) : (
              <button onClick={() => navigate("/pricing/", router)} style={a.btn}>Upgrade to Premium</button>
            )}
            {isNative() && (
              <button onClick={handleRestore} disabled={restoring} style={{ ...a.btn, background: 'transparent', border: '1px solid #292524', color: '#A8A29E', opacity: restoring ? 0.5 : 1 }}>
                {restoring ? 'Restoring…' : 'Restore purchases'}
              </button>
            )}
            {!isNative() && !subActive && (
              <div style={{ marginTop: 12, paddingTop: 12, borderTop: '1px solid rgba(200,169,110,0.12)' }}>
                <div style={{ fontSize: 11, color: '#78716C', textTransform: 'uppercase', letterSpacing: '0.08em', fontWeight: 500, marginBottom: 8 }}>Already have a license key?</div>
                <div style={{ display: 'flex', gap: 8 }}>
                  <input
                    type="text"
                    placeholder="XXXXXXXX-XXXXXXXX-XXXXXXXX-XXXXXXXX"
                    value={licenseKey}
                    onChange={e => setLicenseKey(e.target.value)}
                    style={{ ...a.input, flex: 1, fontFamily: "'JetBrains Mono', monospace", fontSize: 12 }}
                  />
                  <button
                    onClick={activateLicense}
                    disabled={activating || !licenseKey.trim()}
                    style={{ ...a.btn, width: 'auto', padding: '10px 16px', opacity: activating || !licenseKey.trim() ? 0.5 : 1 }}
                  >
                    {activating ? '...' : 'Activate'}
                  </button>
                </div>
                <a
                  href="https://morrison844.gumroad.com/l/sonata"
                  target="_blank"
                  rel="noopener noreferrer"
                  style={{ display: 'block', fontSize: 12, color: '#C8A96E', marginTop: 10, textDecoration: 'underline' }}
                >
                  Don&apos;t have a key? Get one here
                </a>
              </div>
            )}
          </div>
        </div>

        <div style={a.card}>
          <div style={a.label}>Preferences</div>

          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginTop: 12 }}>
            <div style={{ flex: 1 }}>
              <div style={{ fontSize: 14, color: '#FAFAF9' }}>Parchment theme</div>
              <div style={{ fontSize: 12, color: '#78716C', marginTop: 2 }}>Cream paper + brown ink, like an old music book</div>
            </div>
            <button onClick={toggleParchment} aria-pressed={parchment}
              style={{
                width: 48, height: 28, borderRadius: 14,
                background: parchment ? '#C8A96E' : '#292524',
                border: '1px solid ' + (parchment ? '#C8A96E' : '#44403C'),
                position: 'relative', cursor: 'pointer', transition: 'all 0.2s ease', padding: 0,
              }}>
              <div style={{
                position: 'absolute', top: 2, left: parchment ? 22 : 2,
                width: 22, height: 22, borderRadius: '50%',
                background: parchment ? '#0C0A09' : '#FAFAF9',
                transition: 'left 0.2s ease',
              }} />
            </button>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginTop: 16, paddingTop: 16, borderTop: '1px solid rgba(200,169,110,0.12)' }}>
            <div style={{ flex: 1 }}>
              <div style={{ fontSize: 14, color: '#FAFAF9' }}>Ambient piano</div>
              <div style={{ fontSize: 12, color: '#78716C', marginTop: 2 }}>Soft background notes while you browse</div>
            </div>
            <button onClick={toggleAmbiance} aria-pressed={ambiance}
              style={{
                width: 48, height: 28, borderRadius: 14,
                background: ambiance ? '#C8A96E' : '#292524',
                border: '1px solid ' + (ambiance ? '#C8A96E' : '#44403C'),
                position: 'relative', cursor: 'pointer', transition: 'all 0.2s ease', padding: 0,
              }}>
              <div style={{
                position: 'absolute', top: 2, left: ambiance ? 22 : 2,
                width: 22, height: 22, borderRadius: '50%',
                background: ambiance ? '#0C0A09' : '#FAFAF9',
                transition: 'left 0.2s ease',
              }} />
            </button>
          </div>
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
          <a href="/terms/" onClick={(e) => { e.preventDefault(); navigate("/terms/", router); }} style={a.link}>Terms of Service</a>
          <a href="/privacy/" onClick={(e) => { e.preventDefault(); navigate("/privacy/", router); }} style={a.link}>Privacy Policy</a>
        </div>
      </div>
    </div>
  );
}

const a: Record<string, React.CSSProperties> = {
  page: { minHeight: '100vh', background: '#0C0A09', color: '#FAFAF9', fontFamily: "'Outfit', system-ui, sans-serif", padding: '24px 20px' },
  container: { maxWidth: 480, margin: '0 auto' },
  back: { color: '#78716C', fontSize: 14, textDecoration: 'none', background: 'none', border: 'none', padding: '8px 4px', cursor: 'pointer', fontFamily: "'Outfit', system-ui, sans-serif", textAlign: 'left' as const },
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

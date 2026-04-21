"use client";

import { Suspense, useState, useEffect } from "react";
import { supabase } from "@/lib/supabase";
import { useRouter } from "next/navigation";
import { navigate, isNative } from "@/lib/platform";
import { hasActiveSubscription, restorePurchases } from "@/lib/subscriptions";
import { loadLicense } from "@/lib/supabaseData";
import { isAmbianceEnabled, setAmbianceEnabled, startAmbiance, stopAmbiance } from "@/lib/music/effects";
import { ChunkyButton, Sticker, StaffBG, FloatingNotes } from "@/app/app/design";
import { Cleffy } from "@/app/app/Cleffy";
import type { User } from "@supabase/supabase-js";
import "@/app/app/sonata.css";

export default function AccountPage() {
  return (
    <Suspense fallback={<div style={{ minHeight: '100vh', background: '#FFF6E4' }} />}>
      <AccountInner />
    </Suspense>
  );
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
  const router = useRouter();

  useEffect(() => { setAmbiance(isAmbianceEnabled()); }, []);

  function toggleAmbiance() {
    const next = !ambiance;
    setAmbiance(next);
    setAmbianceEnabled(next);
    if (next) startAmbiance(); else stopAmbiance();
  }

  useEffect(() => {
    try {
      if (!isNative() && localStorage.getItem('sonata_web_license') === 'true') setSubActive(true);
    } catch {}

    supabase.auth.getSession().then(({ data: { session } }) => {
      if (!session) { navigate("/login/", router); return; }
      setUser(session.user);
      if (!isNative()) {
        loadLicense(session.user.id).then(l => {
          if (l) { setSubActive(true); try { localStorage.setItem('sonata_web_license', 'true'); } catch {} }
        });
      }
    });
    if (isNative()) hasActiveSubscription().then(setSubActive);
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
      if (!res.ok) setError(data.error || "Activation failed");
      else {
        setMessage("License activated! You now have full access.");
        setLicenseKey("");
        setSubActive(true);
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

  if (!user) {
    return (
      <div style={{ minHeight: '100vh', background: 'var(--cream)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <p style={{ color: 'var(--ink3)', fontFamily: 'var(--sans)', fontWeight: 700 }}>Loading...</p>
      </div>
    );
  }

  return (
    <div style={{ position: 'relative', minHeight: '100vh', background: 'var(--cream)', fontFamily: 'var(--sans)', overflow: 'hidden', paddingBottom: 40 }}>
      <StaffBG opacity={0.22} />
      <FloatingNotes count={6} />

      <div style={{ position: 'relative', zIndex: 2, maxWidth: 520, margin: '0 auto', padding: '20px 20px' }}>
        {/* Top bar */}
        <button type="button" onClick={() => navigate("/app/", router)}
          style={{ display: 'inline-flex', alignItems: 'center', gap: 8, padding: '8px 14px', background: 'var(--cream)', color: 'var(--ink)', border: '3px solid var(--ink)', borderRadius: 999, boxShadow: '0 3px 0 var(--ink)', fontWeight: 800, fontSize: 13, cursor: 'pointer', fontFamily: 'var(--sans)' }}>
          ← Back to app
        </button>

        {/* Hero */}
        <div style={{ display: 'flex', alignItems: 'flex-end', gap: 16, margin: '20px 0 24px' }}>
          <Cleffy size={80} mood="happy" color="#9C7CE8" shadow="#7452C8" />
          <div>
            <Sticker color="lilac" rotate={-3}>◆ Your profile</Sticker>
            <h1 style={{ fontFamily: 'var(--serif)', fontSize: 48, fontWeight: 900, fontStyle: 'italic', color: 'var(--ink)', margin: '6px 0 0', letterSpacing: '-0.03em', lineHeight: 1 }}>
              Account<span style={{ color: 'var(--lilac-deep)' }}>.</span>
            </h1>
          </div>
        </div>

        {/* Email */}
        <Card color="paper">
          <Label>Email</Label>
          <div style={{ fontSize: 15, marginTop: 6, color: 'var(--ink)', fontWeight: 600, wordBreak: 'break-all' }}>{user.email}</div>
        </Card>

        {/* Membership */}
        <Card color={subActive ? 'mint' : 'paper'}>
          <Label>Membership</Label>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginTop: 8 }}>
            <span style={{ display: 'inline-block', width: 12, height: 12, borderRadius: 999, background: subActive ? 'var(--mint-deep)' : 'var(--ink3)', border: '2px solid var(--ink)' }} />
            <span style={{ fontFamily: 'var(--serif)', fontStyle: 'italic', fontSize: 22, fontWeight: 900, color: 'var(--ink)' }}>
              {subActive ? 'Premium — Active' : 'Free plan'}
            </span>
          </div>
          {!subActive && (
            <p style={{ fontSize: 14, color: 'var(--ink2)', marginTop: 8, lineHeight: 1.55, fontWeight: 500 }}>
              You have 3 free lessons and 1 free drill. Upgrade to unlock all 23 lessons, every drill, and the full library.
            </p>
          )}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10, marginTop: 14 }}>
            {subActive ? (
              isNative() ? (
                <ChunkyButton color="gold" size="md" onClick={openManage} style={{ justifyContent: 'center' }}>Manage in App Store</ChunkyButton>
              ) : (
                <ChunkyButton color="gold" size="md" onClick={() => navigate("/pricing/", router)} style={{ justifyContent: 'center' }}>View plans</ChunkyButton>
              )
            ) : (
              <ChunkyButton color="berry" size="md" onClick={() => navigate("/pricing/", router)} style={{ justifyContent: 'center' }}>Upgrade to Premium</ChunkyButton>
            )}
            {isNative() && (
              <ChunkyButton color="cream" size="sm" onClick={handleRestore} disabled={restoring} style={{ justifyContent: 'center' }}>
                {restoring ? 'Restoring…' : 'Restore purchases'}
              </ChunkyButton>
            )}
            {!isNative() && !subActive && (
              <div style={{ marginTop: 12, paddingTop: 14, borderTop: '2px dashed var(--ink3)' }}>
                <Label>Already have a license key?</Label>
                <div style={{ display: 'flex', gap: 8, marginTop: 8 }}>
                  <input
                    type="text"
                    placeholder="XXXXXXXX-XXXXXXXX-XXXXXXXX-XXXXXXXX"
                    value={licenseKey}
                    onChange={e => setLicenseKey(e.target.value)}
                    style={{ ...inputStyle, flex: 1, fontFamily: 'var(--mono)', fontSize: 11 }}
                  />
                  <ChunkyButton
                    color="gold"
                    size="sm"
                    onClick={activateLicense}
                    disabled={activating || !licenseKey.trim()}
                  >
                    {activating ? '...' : 'Activate'}
                  </ChunkyButton>
                </div>
                <a
                  href="https://morrison844.gumroad.com/l/sonata"
                  target="_blank"
                  rel="noopener noreferrer"
                  style={{ display: 'block', fontSize: 13, color: 'var(--ink2)', marginTop: 10, textDecoration: 'underline', fontWeight: 700 }}
                >
                  Don&apos;t have a key? Get one here →
                </a>
              </div>
            )}
          </div>
        </Card>

        {/* Preferences */}
        <Card color="paper">
          <Label>Preferences</Label>
          <ToggleRow
            title="Ambient piano"
            desc="Soft background notes while you browse"
            on={ambiance}
            onToggle={toggleAmbiance}
          />
        </Card>

        {/* Password */}
        <Card color="paper">
          <Label>Change password</Label>
          <form onSubmit={handlePasswordChange} style={{ display: 'flex', flexDirection: 'column', gap: 10, marginTop: 10 }}>
            <input
              type="password" placeholder="New password (min 6 chars)"
              value={newPassword} onChange={e => setNewPassword(e.target.value)}
              minLength={6} required
              style={inputStyle}
            />
            <ChunkyButton type="submit" color="gold" size="md" style={{ justifyContent: 'center' }}>Update password</ChunkyButton>
          </form>
        </Card>

        {message && <div style={{ color: 'var(--mint-deep)', fontSize: 13, textAlign: 'center', padding: '10px 16px', background: 'rgba(62,207,142,0.18)', border: '3px solid var(--mint)', borderRadius: 'var(--r2)', fontWeight: 700, marginBottom: 12, boxShadow: '0 3px 0 var(--mint-deep)' }}>{message}</div>}
        {error && <div style={{ color: 'var(--coral-deep)', fontSize: 13, textAlign: 'center', padding: '10px 16px', background: 'rgba(255,107,107,0.18)', border: '3px solid var(--coral)', borderRadius: 'var(--r2)', fontWeight: 700, marginBottom: 12, boxShadow: '0 3px 0 var(--coral-deep)' }}>{error}</div>}

        {/* Danger Zone */}
        <div style={{
          padding: 18, background: 'rgba(255,107,107,0.1)',
          border: '3px solid var(--coral)', borderRadius: 'var(--r2)',
          boxShadow: '0 5px 0 var(--coral-deep)', marginBottom: 12,
        }}>
          <div style={{ fontSize: 11, color: 'var(--coral-deep)', textTransform: 'uppercase', letterSpacing: '0.15em', fontWeight: 800 }}>
            ⚠ Danger zone
          </div>
          {!showDelete ? (
            <button onClick={() => setShowDelete(true)}
              style={{
                marginTop: 10, width: '100%',
                padding: '10px 16px', background: 'transparent',
                border: '3px solid var(--coral)', color: 'var(--coral-deep)',
                borderRadius: 'var(--r1)', fontSize: 13, fontWeight: 800,
                cursor: 'pointer', fontFamily: 'var(--sans)', textTransform: 'uppercase', letterSpacing: '0.06em',
              }}>
              Delete my account
            </button>
          ) : (
            <div style={{ marginTop: 10 }}>
              <p style={{ fontSize: 13, color: 'var(--ink2)', marginBottom: 10, lineHeight: 1.55, fontWeight: 500 }}>
                This will permanently delete your account and all your progress. This action cannot be undone. Type <b style={{ color: 'var(--coral-deep)' }}>DELETE</b> to confirm.
              </p>
              <input type="text" placeholder="Type DELETE" value={deleteConfirm}
                onChange={e => setDeleteConfirm(e.target.value)} style={inputStyle} />
              <div style={{ display: 'flex', gap: 8, marginTop: 10 }}>
                <ChunkyButton color="cream" size="sm" onClick={() => { setShowDelete(false); setDeleteConfirm(""); }} style={{ flex: 1, justifyContent: 'center' }}>Cancel</ChunkyButton>
                <ChunkyButton color="coral" size="sm" onClick={handleDeleteAccount} style={{ flex: 1, justifyContent: 'center' }}>Delete forever</ChunkyButton>
              </div>
            </div>
          )}
        </div>

        {/* Footer links */}
        <div style={{ marginTop: 20, display: 'flex', gap: 20, justifyContent: 'center' }}>
          <a href="/terms/" onClick={(e) => { e.preventDefault(); navigate("/terms/", router); }}
             style={{ color: 'var(--ink3)', fontSize: 13, textDecoration: 'underline', fontWeight: 700 }}>Terms of Service</a>
          <a href="/privacy/" onClick={(e) => { e.preventDefault(); navigate("/privacy/", router); }}
             style={{ color: 'var(--ink3)', fontSize: 13, textDecoration: 'underline', fontWeight: 700 }}>Privacy Policy</a>
        </div>
      </div>
    </div>
  );
}

function Card({ children, color = 'paper' }: { children: React.ReactNode; color?: 'paper' | 'mint' | 'cream' }) {
  const bg = color === 'mint' ? 'var(--mint)' : color === 'cream' ? 'var(--cream)' : 'var(--paper)';
  const shadow = color === 'mint' ? 'var(--mint-deep)' : 'var(--ink)';
  return (
    <div style={{
      padding: 18, background: bg, border: '3px solid var(--ink)',
      borderRadius: 'var(--r2)', boxShadow: `0 5px 0 ${shadow}`,
      marginBottom: 14,
    }}>
      {children}
    </div>
  );
}

function Label({ children }: { children: React.ReactNode }) {
  return (
    <div style={{ fontSize: 11, color: 'var(--ink3)', textTransform: 'uppercase', letterSpacing: '0.15em', fontWeight: 800 }}>
      {children}
    </div>
  );
}

function ToggleRow({ title, desc, on, onToggle }: { title: string; desc: string; on: boolean; onToggle: () => void }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginTop: 12, gap: 12 }}>
      <div style={{ flex: 1 }}>
        <div style={{ fontSize: 15, color: 'var(--ink)', fontWeight: 700 }}>{title}</div>
        <div style={{ fontSize: 12, color: 'var(--ink3)', marginTop: 2, fontWeight: 600 }}>{desc}</div>
      </div>
      <button onClick={onToggle} aria-pressed={on}
        style={{
          width: 56, height: 32, borderRadius: 999,
          background: on ? 'var(--mint)' : 'var(--parchment)',
          border: '3px solid var(--ink)',
          boxShadow: `0 3px 0 ${on ? 'var(--mint-deep)' : 'var(--ink)'}`,
          position: 'relative', cursor: 'pointer', transition: 'all 0.15s var(--bounce)', padding: 0,
          flexShrink: 0,
        }}>
        <div style={{
          position: 'absolute', top: 2, left: on ? 24 : 2,
          width: 22, height: 22, borderRadius: '50%',
          background: 'var(--cream)', border: '2px solid var(--ink)',
          transition: 'left 0.15s var(--bounce)',
        }} />
      </button>
    </div>
  );
}

const inputStyle: React.CSSProperties = {
  width: '100%',
  padding: '12px 16px',
  background: 'var(--cream)',
  border: '3px solid var(--ink)',
  borderRadius: 'var(--r1)',
  color: 'var(--ink)',
  fontSize: 14,
  fontFamily: 'var(--sans)',
  fontWeight: 600,
  outline: 'none',
  boxSizing: 'border-box',
  boxShadow: '0 3px 0 var(--ink)',
};

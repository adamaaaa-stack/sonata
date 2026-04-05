"use client";

import { useState, useEffect } from "react";
import { supabase } from "@/lib/supabase";
import { useRouter } from "next/navigation";
import type { User } from "@supabase/supabase-js";

export default function AccountPage() {
  const [user, setUser] = useState<User | null>(null);
  const [newPassword, setNewPassword] = useState("");
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [showDelete, setShowDelete] = useState(false);
  const [deleteConfirm, setDeleteConfirm] = useState("");
  const router = useRouter();

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (!session) router.push("/login");
      else setUser(session.user);
    });
  }, [router]);

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

    // Delete user data from all tables
    await supabase.from("drill_sessions").delete().eq("user_id", user.id);
    await supabase.from("lesson_progress").delete().eq("user_id", user.id);
    await supabase.from("user_progress").delete().eq("user_id", user.id);

    // Clear local storage
    localStorage.clear();

    // Sign out
    await supabase.auth.signOut();
    router.push("/");
  }

  if (!user) return <div style={a.page}><div style={a.container}><p style={{ color: '#78716C' }}>Loading...</p></div></div>;

  return (
    <div style={a.page}>
      <div style={a.container}>
        <a href="/app" style={a.back}>← Back to app</a>
        <h1 style={a.title}>Account</h1>

        <div style={a.card}>
          <div style={a.label}>Email</div>
          <div style={a.value}>{user.email}</div>
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

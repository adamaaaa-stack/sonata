"use client";

import { useRouter } from "next/navigation";
import { navigate } from "@/lib/platform";
import { StaffBG, FloatingNotes, Sticker } from "@/app/app/design";
import "@/app/app/sonata.css";

export default function TermsPage() {
  const router = useRouter();

  function goBack() {
    if (typeof window !== "undefined" && window.history.length > 1) {
      window.history.back();
      return;
    }
    navigate("/", router);
  }

  const sections = [
    { h: '1. Acceptance', t: 'By using Sonata ("the Service"), you agree to these terms. If you don\'t agree, don\'t use the Service.' },
    { h: '2. The Service', t: 'Sonata is a web application that teaches piano sight-reading through interactive lessons, drills, and score rendering. We provide educational content and tools — we do not guarantee musical proficiency.' },
    { h: '3. Accounts', t: 'You must create an account to use Sonata. You are responsible for maintaining the security of your account. You must provide accurate information when signing up.' },
    { h: '4. Acceptable Use', t: 'You may not: use the Service for any illegal purpose, attempt to gain unauthorized access to our systems, reverse-engineer the Service, or use automated tools to access the Service in a way that exceeds reasonable use.' },
    { h: '5. Intellectual Property', t: 'The lesson content, app design, and code are owned by Sonata. Sheet music from third-party sources (MuseTrainer, music21 corpus) is used under their respective licenses. The musical compositions themselves are in the public domain.' },
    { h: '6. Termination', t: 'We may terminate or suspend your account for violation of these terms. You may delete your account at any time through the account settings page.' },
    { h: '7. Subscription', t: 'Premium subscriptions are billed monthly and auto-renew unless cancelled. You can cancel anytime from your Apple ID Account Settings (iOS) or Gumroad account (web). No refunds for partial months.' },
    { h: '8. Limitation of Liability', t: 'The Service is provided "as is" without warranty. We are not liable for any indirect, incidental, or consequential damages arising from your use of the Service.' },
    { h: '9. Changes', t: 'We may update these terms from time to time. Continued use of the Service after changes constitutes acceptance of the new terms.' },
    { h: '10. Contact', t: 'Questions about these terms? Contact us at support@learnwithsonata.com.' },
  ];

  return (
    <div style={{ position: 'relative', minHeight: '100vh', background: 'var(--cream)', fontFamily: 'var(--sans)', overflow: 'hidden' }}>
      <StaffBG opacity={0.22} />
      <FloatingNotes count={5} />

      <div style={{ position: 'relative', zIndex: 2, maxWidth: 720, margin: '0 auto', padding: '20px 24px 60px' }}>
        <button type="button" onClick={goBack}
          style={{ display: 'inline-flex', alignItems: 'center', gap: 8, padding: '8px 14px', background: 'var(--cream)', color: 'var(--ink)', border: '3px solid var(--ink)', borderRadius: 999, boxShadow: '0 3px 0 var(--ink)', fontWeight: 800, fontSize: 13, cursor: 'pointer', fontFamily: 'var(--sans)' }}>
          ← Back
        </button>

        <div style={{ marginTop: 24, marginBottom: 8 }}>
          <Sticker color="sky" rotate={-3}>◆ Legal</Sticker>
        </div>
        <h1 style={{ fontFamily: 'var(--serif)', fontSize: 'clamp(44px, 7vw, 64px)', fontWeight: 900, fontStyle: 'italic', color: 'var(--ink)', margin: '0 0 6px', letterSpacing: '-0.03em', lineHeight: 1 }}>
          Terms of <span style={{ color: 'var(--sky-deep)' }}>Service.</span>
        </h1>
        <p style={{ color: 'var(--ink3)', fontSize: 14, marginBottom: 32, fontWeight: 700 }}>Last updated: April 2026</p>

        {sections.map((s, i) => (
          <div key={i} style={{ marginBottom: 20, background: 'var(--paper)', border: '3px solid var(--ink)', borderRadius: 'var(--r2)', padding: '18px 22px', boxShadow: '0 5px 0 var(--ink)' }}>
            <h2 style={{ fontFamily: 'var(--serif)', fontSize: 20, fontWeight: 900, fontStyle: 'italic', color: 'var(--ink)', margin: '0 0 8px' }}>{s.h}</h2>
            <p style={{ fontSize: 14, color: 'var(--ink2)', lineHeight: 1.7, margin: 0, fontWeight: 500 }}>{s.t}</p>
          </div>
        ))}
      </div>
    </div>
  );
}

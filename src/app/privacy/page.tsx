"use client";

import { useRouter } from "next/navigation";
import { navigate } from "@/lib/platform";
import { StaffBG, FloatingNotes, Sticker } from "@/app/app/design";
import "@/app/app/sonata.css";

export default function PrivacyPage() {
  const router = useRouter();

  function goBack() {
    if (typeof window !== "undefined" && window.history.length > 1) {
      window.history.back();
      return;
    }
    navigate("/", router);
  }

  const sections = [
    { h: '1. What We Collect', t: 'We collect: your email address (for authentication), lesson progress and drill scores (to track your learning), and interval accuracy data (to personalise your practice). We do not collect payment information directly — this is handled by our payment processor.' },
    { h: '2. How We Use Your Data', t: 'Your data is used to: authenticate your account, save your progress across devices, personalise drill difficulty based on your weak areas, and generate AI-powered exercises targeting your specific needs. We do not sell your data to third parties.' },
    { h: '3. Data Storage', t: 'Your data is stored in Supabase (hosted on AWS). Lesson progress is also cached locally in your browser\'s localStorage for offline access. Audio files for lesson narration are pre-generated and served as static files — no personal data is sent to text-to-speech services.' },
    { h: '4. Third-Party Services', t: 'We use: Supabase (authentication and database), OpenAI (AI-generated exercises — only your weak interval data is sent, never personal information), and Google OAuth (if you choose to sign in with Google). Each service has its own privacy policy.' },
    { h: '5. Cookies & Local Storage', t: 'We use localStorage to cache your progress for fast loading and offline access. We use session cookies for authentication. We do not use tracking cookies or analytics cookies.' },
    { h: '6. Microphone Access', t: 'If you enable "Play to answer" mode, we request microphone access for pitch detection. Audio is processed entirely in your browser — it is never recorded, stored, or sent to any server.' },
    { h: '7. Your Rights', t: 'You can: view all your stored data through the Progress screen, delete your account and all associated data through the Account settings page, export your progress data by contacting us. We comply with GDPR and applicable data protection laws.' },
    { h: '8. Data Deletion', t: 'When you delete your account, all your data (progress, drill history, lesson completions) is permanently removed from our servers within 30 days. Local browser data can be cleared through your browser settings.' },
    { h: '9. Children', t: 'Sonata is suitable for all ages. We do not knowingly collect data from children under 13 without parental consent. If you believe a child has provided us data without consent, contact us to have it removed.' },
    { h: '10. Contact', t: 'Privacy questions? Contact us at privacy@learnwithsonata.com.' },
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
          <Sticker color="lilac" rotate={-3}>◆ Legal</Sticker>
        </div>
        <h1 style={{ fontFamily: 'var(--serif)', fontSize: 'clamp(44px, 7vw, 64px)', fontWeight: 900, fontStyle: 'italic', color: 'var(--ink)', margin: '0 0 6px', letterSpacing: '-0.03em', lineHeight: 1 }}>
          Privacy <span style={{ color: 'var(--lilac-deep)' }}>Policy.</span>
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

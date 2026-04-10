"use client";

import { useRouter } from "next/navigation";
import { navigate } from "@/lib/platform";

export default function PrivacyPage() {
  const router = useRouter();
  return (
    <div style={p.page}>
      <div style={p.container}>
        <button type="button" onClick={() => navigate("/app/", router)} style={p.back}>← Back</button>
        <h1 style={p.title}>Privacy Policy</h1>
        <p style={p.date}>Last updated: April 2026</p>

        <h2 style={p.h2}>1. What We Collect</h2>
        <p style={p.text}>We collect: your email address (for authentication), lesson progress and drill scores (to track your learning), and interval accuracy data (to personalise your practice). We do not collect payment information directly — this is handled by our payment processor.</p>

        <h2 style={p.h2}>2. How We Use Your Data</h2>
        <p style={p.text}>Your data is used to: authenticate your account, save your progress across devices, personalise drill difficulty based on your weak areas, and generate AI-powered exercises targeting your specific needs. We do not sell your data to third parties.</p>

        <h2 style={p.h2}>3. Data Storage</h2>
        <p style={p.text}>Your data is stored in Supabase (hosted on AWS). Lesson progress is also cached locally in your browser&apos;s localStorage for offline access. Audio files for lesson narration are pre-generated and served as static files — no personal data is sent to text-to-speech services.</p>

        <h2 style={p.h2}>4. Third-Party Services</h2>
        <p style={p.text}>We use: Supabase (authentication and database), OpenAI (AI-generated exercises — only your weak interval data is sent, never personal information), and Google OAuth (if you choose to sign in with Google). Each service has its own privacy policy.</p>

        <h2 style={p.h2}>5. Cookies &amp; Local Storage</h2>
        <p style={p.text}>We use localStorage to cache your progress for fast loading and offline access. We use session cookies for authentication. We do not use tracking cookies or analytics cookies.</p>

        <h2 style={p.h2}>6. Microphone Access</h2>
        <p style={p.text}>If you enable &quot;Play to answer&quot; mode, we request microphone access for pitch detection. Audio is processed entirely in your browser — it is never recorded, stored, or sent to any server.</p>

        <h2 style={p.h2}>7. Your Rights</h2>
        <p style={p.text}>You can: view all your stored data through the Progress screen, delete your account and all associated data through the Account settings page, export your progress data by contacting us. We comply with GDPR and applicable data protection laws.</p>

        <h2 style={p.h2}>8. Data Deletion</h2>
        <p style={p.text}>When you delete your account, all your data (progress, drill history, lesson completions) is permanently removed from our servers within 30 days. Local browser data can be cleared through your browser settings.</p>

        <h2 style={p.h2}>9. Children</h2>
        <p style={p.text}>Sonata is suitable for all ages. We do not knowingly collect data from children under 13 without parental consent. If you believe a child has provided us data without consent, contact us to have it removed.</p>

        <h2 style={p.h2}>10. Contact</h2>
        <p style={p.text}>Privacy questions? Contact us at privacy@sonata.app.</p>
      </div>
    </div>
  );
}

const p: Record<string, React.CSSProperties> = {
  page: { minHeight: '100vh', background: '#0C0A09', color: '#FAFAF9', fontFamily: "'Outfit', system-ui, sans-serif", padding: '24px 20px' },
  container: { maxWidth: 640, margin: '0 auto' },
  back: { color: '#78716C', fontSize: 14, textDecoration: 'none', background: 'none', border: 'none', padding: '8px 4px', cursor: 'pointer', fontFamily: "'Outfit', system-ui, sans-serif" },
  title: { fontFamily: "'Instrument Serif', Georgia, serif", fontSize: 32, fontWeight: 400, color: '#C8A96E', margin: '24px 0 8px' },
  date: { color: '#78716C', fontSize: 13, marginBottom: 32 },
  h2: { fontSize: 16, fontWeight: 500, marginTop: 28, marginBottom: 8 },
  text: { fontSize: 14, color: '#A8A29E', lineHeight: 1.8, marginBottom: 12 },
};

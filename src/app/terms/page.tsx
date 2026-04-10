"use client";

import { useRouter } from "next/navigation";
import { navigate } from "@/lib/platform";

export default function TermsPage() {
  const router = useRouter();

  function goBack() {
    // Prefer history.back() so the user returns to wherever they came from
    // (mobile landing, login, app paywall, etc.) instead of a hardcoded route.
    if (typeof window !== "undefined" && window.history.length > 1) {
      window.history.back();
      return;
    }
    navigate("/", router);
  }

  return (
    <div style={p.page}>
      <div style={p.container}>
        <button type="button" onClick={goBack} style={p.back}>← Back</button>
        <h1 style={p.title}>Terms of Service</h1>
        <p style={p.date}>Last updated: April 2026</p>

        <h2 style={p.h2}>1. Acceptance</h2>
        <p style={p.text}>By using Sonata (&quot;the Service&quot;), you agree to these terms. If you don&apos;t agree, don&apos;t use the Service.</p>

        <h2 style={p.h2}>2. The Service</h2>
        <p style={p.text}>Sonata is a web application that teaches piano sight-reading through interactive lessons, drills, and score rendering. We provide educational content and tools — we do not guarantee musical proficiency.</p>

        <h2 style={p.h2}>3. Accounts</h2>
        <p style={p.text}>You must create an account to use Sonata. You are responsible for maintaining the security of your account. You must provide accurate information when signing up.</p>

        <h2 style={p.h2}>4. Acceptable Use</h2>
        <p style={p.text}>You may not: use the Service for any illegal purpose, attempt to gain unauthorized access to our systems, reverse-engineer the Service, or use automated tools to access the Service in a way that exceeds reasonable use.</p>

        <h2 style={p.h2}>5. Intellectual Property</h2>
        <p style={p.text}>The lesson content, app design, and code are owned by Sonata. Sheet music from third-party sources (MuseTrainer, music21 corpus) is used under their respective licenses. The musical compositions themselves are in the public domain.</p>

        <h2 style={p.h2}>6. Termination</h2>
        <p style={p.text}>We may terminate or suspend your account for violation of these terms. You may delete your account at any time through the account settings page.</p>

        <h2 style={p.h2}>8. Limitation of Liability</h2>
        <p style={p.text}>The Service is provided &quot;as is&quot; without warranty. We are not liable for any indirect, incidental, or consequential damages arising from your use of the Service.</p>

        <h2 style={p.h2}>9. Changes</h2>
        <p style={p.text}>We may update these terms from time to time. Continued use of the Service after changes constitutes acceptance of the new terms.</p>

        <h2 style={p.h2}>10. Contact</h2>
        <p style={p.text}>Questions about these terms? Contact us at support@sonata.app.</p>
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

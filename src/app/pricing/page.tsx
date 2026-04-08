"use client";

export default function PricingPage() {
  return (
    <div style={p.page}>
      <nav style={p.nav}>
        <a href="/" style={p.navLogo}>Sonata</a>
        <div style={{ display: 'flex', gap: 20, alignItems: 'center' }}>
          <a href="/#features" style={p.navLink}>Features</a>
          <a href="/login" style={p.navCta}>Start learning</a>
        </div>
      </nav>

      <div style={p.container}>
        <h1 style={p.title}>Simple pricing</h1>
        <p style={p.subtitle}>Try free. Upgrade when you&apos;re ready.</p>

        <div style={p.grid}>
          {/* Free tier */}
          <div style={p.card}>
            <div style={p.tierLabel}>Free</div>
            <div style={p.price}>$0</div>
            <div style={p.period}>forever</div>
            <ul style={p.list}>
              <li style={p.item}><span style={p.check}>✓</span> First 3 lessons</li>
              <li style={p.item}><span style={p.check}>✓</span> 1 drill session</li>
              <li style={p.item}><span style={p.check}>✓</span> Score library (browse)</li>
              <li style={p.item}><span style={p.check}>✓</span> Progress tracking</li>
              <li style={p.item}><span style={p.check}>✓</span> Placement quiz</li>
              <li style={p.itemMuted}><span style={p.cross}>-</span> Lessons 4-23</li>
              <li style={p.itemMuted}><span style={p.cross}>-</span> Unlimited drills</li>
              <li style={p.itemMuted}><span style={p.cross}>-</span> AI exercises</li>
            </ul>
            <a href="/login" style={p.btnGhost}>Start for free</a>
          </div>

          {/* Premium tier */}
          <div style={{ ...p.card, ...p.cardPremium }}>
            <div style={{ ...p.tierLabel, color: '#C8A96E' }}>Premium</div>
            <div style={p.price}>$10</div>
            <div style={p.period}>per month</div>
            <ul style={p.list}>
              <li style={p.item}><span style={p.check}>✓</span> All 23 lessons</li>
              <li style={p.item}><span style={p.check}>✓</span> Unlimited drills</li>
              <li style={p.item}><span style={p.check}>✓</span> 400+ piece library</li>
              <li style={p.item}><span style={p.check}>✓</span> Score playback</li>
              <li style={p.item}><span style={p.check}>✓</span> AI-generated exercises</li>
              <li style={p.item}><span style={p.check}>✓</span> MIDI keyboard support</li>
              <li style={p.item}><span style={p.check}>✓</span> Sight-reading mode</li>
              <li style={p.item}><span style={p.check}>✓</span> Cancel anytime</li>
            </ul>
            <a href="https://morrison844.gumroad.com/l/sonata" target="_blank" rel="noopener noreferrer" style={p.btnPrimary}>
              Get Premium
            </a>
          </div>
        </div>

        {/* FAQ */}
        <div style={p.faq}>
          <h2 style={p.faqTitle}>Questions</h2>
          {[
            { q: 'Can I cancel anytime?', a: 'Yes. Cancel from your Gumroad account whenever you want. You keep access until the end of your billing period.' },
            { q: 'How do I activate my license?', a: 'After purchasing on Gumroad, you\'ll get a license key. Go to Account in the app and paste it in. It activates instantly.' },
            { q: 'What if I already play piano?', a: 'Take the placement quiz when you sign up. It\'ll skip you to the right lesson based on what you already know.' },
          ].map((item, i) => (
            <div key={i} style={p.faqItem}>
              <div style={p.faqQ}>{item.q}</div>
              <div style={p.faqA}>{item.a}</div>
            </div>
          ))}
        </div>
      </div>

      <footer style={p.footer}>
        <a href="/" style={p.footerLogo}>Sonata</a>
        <div style={{ display: 'flex', gap: 16 }}>
          <a href="/terms" style={p.footerLink}>Terms</a>
          <a href="/privacy" style={p.footerLink}>Privacy</a>
        </div>
      </footer>
    </div>
  );
}

const p: Record<string, React.CSSProperties> = {
  page: { background: '#0C0A09', color: '#FAFAF9', fontFamily: "'Outfit', system-ui, sans-serif", fontWeight: 300, minHeight: '100vh' },
  nav: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '16px 32px', borderBottom: '1px solid rgba(200,169,110,0.08)' },
  navLogo: { fontFamily: "'Instrument Serif', Georgia, serif", fontSize: 22, color: '#C8A96E', textDecoration: 'none' },
  navLink: { color: '#78716C', textDecoration: 'none', fontSize: 13 },
  navCta: { color: '#0C0A09', background: '#C8A96E', textDecoration: 'none', fontSize: 13, fontWeight: 500, padding: '8px 20px', borderRadius: 8 },
  container: { maxWidth: 720, margin: '0 auto', padding: '80px 24px 60px' },
  title: { fontFamily: "'Instrument Serif', Georgia, serif", fontSize: 40, fontWeight: 400, textAlign: 'center', marginBottom: 8 },
  subtitle: { fontSize: 16, color: '#78716C', textAlign: 'center', marginBottom: 48 },
  grid: { display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 },
  card: { padding: '32px 28px', background: '#1C1917', border: '1px solid #292524', borderRadius: 14, display: 'flex', flexDirection: 'column' },
  cardPremium: { borderColor: 'rgba(200,169,110,0.3)', background: 'linear-gradient(135deg, rgba(200,169,110,0.06) 0%, #1C1917 60%)' },
  tierLabel: { fontSize: 12, textTransform: 'uppercase', letterSpacing: '0.1em', color: '#78716C', fontWeight: 500, marginBottom: 16 },
  price: { fontFamily: "'Instrument Serif', Georgia, serif", fontSize: 48, fontWeight: 400, lineHeight: 1 },
  period: { fontSize: 14, color: '#78716C', marginBottom: 8 },
  trial: { fontSize: 12, color: '#4ADE80', marginBottom: 16 },
  list: { listStyle: 'none', padding: 0, margin: '16px 0 24px', flex: 1 },
  item: { fontSize: 14, color: '#D6D3D1', lineHeight: 2.2, display: 'flex', alignItems: 'center', gap: 8 },
  itemMuted: { fontSize: 14, color: '#44403C', lineHeight: 2.2, display: 'flex', alignItems: 'center', gap: 8 },
  check: { color: '#4ADE80', fontSize: 13, width: 16, flexShrink: 0 },
  cross: { color: '#44403C', fontSize: 13, width: 16, flexShrink: 0, textAlign: 'center' },
  btnPrimary: { display: 'block', textAlign: 'center', padding: '14px 0', background: '#C8A96E', color: '#0C0A09', borderRadius: 10, textDecoration: 'none', fontSize: 15, fontWeight: 500, fontFamily: "'Outfit', system-ui, sans-serif" },
  btnGhost: { display: 'block', textAlign: 'center', padding: '14px 0', background: 'transparent', color: '#A8A29E', border: '1px solid #292524', borderRadius: 10, textDecoration: 'none', fontSize: 15, fontFamily: "'Outfit', system-ui, sans-serif" },
  faq: { marginTop: 64 },
  faqTitle: { fontFamily: "'Instrument Serif', Georgia, serif", fontSize: 28, fontWeight: 400, textAlign: 'center', marginBottom: 32 },
  faqItem: { padding: '20px 0', borderTop: '1px solid #292524' },
  faqQ: { fontSize: 15, fontWeight: 500, marginBottom: 6 },
  faqA: { fontSize: 14, color: '#A8A29E', lineHeight: 1.7 },
  footer: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '24px 32px', borderTop: '1px solid #292524' },
  footerLogo: { fontFamily: "'Instrument Serif', Georgia, serif", fontSize: 18, color: '#C8A96E', textDecoration: 'none' },
  footerLink: { fontSize: 12, color: '#44403C', textDecoration: 'none' },
};

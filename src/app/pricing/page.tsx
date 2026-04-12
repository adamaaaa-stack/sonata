"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { navigate, isNative } from "@/lib/platform";
import "./pricing.css";

export default function PricingPage() {
  const router = useRouter();
  const native = isNative();
  const [price, setPrice] = useState("$9.99");
  const [purchasing, setPurchasing] = useState(false);
  const [restoring, setRestoring] = useState(false);
  const [msg, setMsg] = useState("");
  const [subActive, setSubActive] = useState(false);

  useEffect(() => {
    if (!native) return;
    import("@/lib/subscriptions").then(subs => {
      subs.getMonthlyProduct().then(p => { if (p) setPrice(p.priceString); });
      subs.hasActiveSubscription().then(setSubActive);
    }).catch(() => {});
  }, [native]);

  function openManage() {
    window.location.href = "https://apps.apple.com/account/subscriptions";
  }

  async function handleSubscribe() {
    setPurchasing(true); setMsg("");
    try {
      const subs = await import("@/lib/subscriptions");
      const ok = await subs.purchaseMonthly();
      if (ok) { setMsg("Welcome to Sonata Premium!"); navigate("/app/", router); }
      else setMsg("Purchase was not completed.");
    } catch { setMsg("Something went wrong. Please try again."); }
    setPurchasing(false);
  }

  async function handleRestore() {
    setRestoring(true); setMsg("");
    try {
      const subs = await import("@/lib/subscriptions");
      const ok = await subs.restorePurchases();
      setMsg(ok ? "Subscription restored." : "No active subscription found.");
    } catch { setMsg("Restore failed."); }
    setRestoring(false);
  }

  function go(e: React.MouseEvent<HTMLAnchorElement>, path: string) {
    e.preventDefault();
    navigate(path, router);
  }

  function goBack() {
    if (typeof window !== "undefined" && window.history.length > 1) {
      window.history.back();
      return;
    }
    navigate("/", router);
  }

  return (
    <div style={p.page}>
      <nav style={p.nav} className="pricing-nav">
        {isNative() ? (
          <button type="button" onClick={goBack} style={p.backBtn}>&larr; Back</button>
        ) : (
          <a href="/" onClick={(e) => go(e, "/")} style={p.navLogo}>Sonata</a>
        )}
        <div style={{ display: 'flex', gap: 16, alignItems: 'center' }}>
          {!isNative() && <a href="/#features" style={p.navLink}>Features</a>}
          <a href="/login/" onClick={(e) => go(e, "/login/")} style={p.navCta}>{isNative() ? "Sign in" : "Start learning"}</a>
        </div>
      </nav>

      <div style={p.container} className="pricing-container">
        <h1 style={p.title} className="pricing-title">Simple pricing</h1>
        <p style={p.subtitle} className="pricing-subtitle">Try free. Upgrade when you&apos;re ready.</p>

        <div style={p.grid} className="pricing-grid">
          {/* Free tier */}
          <div style={p.card} className="pricing-card">
            <div style={p.tierLabel}>Free</div>
            <div style={p.price} className="pricing-price">$0</div>
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
            <a href="/login/" onClick={(e) => go(e, "/login/")} style={p.btnGhost}>Start for free</a>
          </div>

          {/* Premium tier */}
          <div style={{ ...p.card, ...p.cardPremium }} className="pricing-card">
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <div style={{ ...p.tierLabel, color: '#C8A96E' }}>Premium</div>
              {subActive && (
                <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 11, color: '#4ADE80', fontWeight: 500, textTransform: 'uppercase', letterSpacing: '0.06em' }}>
                  <span style={{ width: 8, height: 8, borderRadius: '50%', background: '#4ADE80' }} /> Active
                </div>
              )}
            </div>
            <div style={p.price} className="pricing-price">{native ? price : '$10'}</div>
            <div style={p.period}>per month</div>
            <ul style={p.list}>
              <li style={p.item}><span style={p.check}>✓</span> All 23 lessons</li>
              <li style={p.item}><span style={p.check}>✓</span> Unlimited drills</li>
              <li style={p.item}><span style={p.check}>✓</span> Full piano library</li>
              <li style={p.item}><span style={p.check}>✓</span> Score playback</li>
              <li style={p.item}><span style={p.check}>✓</span> AI-generated exercises</li>
              <li style={p.item}><span style={p.check}>✓</span> MIDI keyboard support</li>
              <li style={p.item}><span style={p.check}>✓</span> Sight-reading mode</li>
              <li style={p.item}><span style={p.check}>✓</span> Cancel anytime</li>
            </ul>
            {subActive ? (
              native ? (
                <button onClick={openManage} style={{ ...p.btnPrimary, border: 'none', cursor: 'pointer', width: '100%', fontFamily: "'Outfit', system-ui, sans-serif" }}>
                  Manage subscription
                </button>
              ) : (
                <div style={{ ...p.btnPrimary, textAlign: 'center', cursor: 'default', opacity: 0.7 }}>
                  You&apos;re subscribed
                </div>
              )
            ) : native ? (
              <button onClick={handleSubscribe} disabled={purchasing} style={{ ...p.btnPrimary, border: 'none', cursor: 'pointer', opacity: purchasing ? 0.6 : 1, width: '100%', fontFamily: "'Outfit', system-ui, sans-serif" }}>
                {purchasing ? '...' : `Subscribe for ${price}/month`}
              </button>
            ) : (
              <a href="/login/?next=pay" onClick={(e) => go(e, "/login/?next=pay")} style={p.btnPrimary}>
                Get Premium
              </a>
            )}
          </div>
        </div>

        {msg && <p style={{ textAlign: 'center', color: '#A8A29E', fontSize: 13, marginTop: 16 }}>{msg}</p>}

        {native && (
          <div style={{ textAlign: 'center', marginTop: 20 }}>
            <button onClick={handleRestore} disabled={restoring}
              style={{ background: 'none', border: 'none', color: '#C8A96E', fontSize: 13, cursor: 'pointer', fontFamily: "'Outfit', system-ui, sans-serif", padding: 8 }}>
              {restoring ? 'Restoring…' : 'Restore purchases'}
            </button>
          </div>
        )}

        {native && (
          <div style={{ fontSize: 11, color: '#78716C', marginTop: 24, lineHeight: 1.7, textAlign: 'left', maxWidth: 560, margin: '24px auto 0' }}>
            <p style={{ margin: 0 }}>
              Payment will be charged to your Apple ID account at confirmation of purchase. Your subscription will automatically renew for {price} per month unless auto-renew is turned off at least 24 hours before the end of the current period. Your account will be charged for renewal, at {price}, within 24 hours prior to the end of the current period. You can manage your subscription and turn off auto-renewal by going to your Apple ID Account Settings after purchase.
            </p>
          </div>
        )}

        {/* FAQ */}
        <div style={p.faq}>
          <h2 style={p.faqTitle} className="pricing-faq-title">Questions</h2>
          {(native
            ? [
                { q: 'Can I cancel anytime?', a: 'Yes. You can cancel or manage auto-renewal anytime from your Apple ID Account Settings. You keep access until the end of your current billing period.' },
                { q: 'Is there a free trial?', a: 'The first 3 lessons and 1 drill are free to try. No subscription is needed to get started.' },
                { q: 'What if I already play piano?', a: "Take the placement quiz when you sign up. It'll skip you to the right lesson based on what you already know." },
                { q: 'Can I use this on other devices?', a: 'Your subscription is tied to your Apple ID, so it works across all your Apple devices signed in with the same Apple ID.' },
              ]
            : [
                { q: 'Can I cancel anytime?', a: 'Yes. You can cancel at any time and keep access until the end of your current billing period.' },
                { q: 'Is there a free trial?', a: 'The first 3 lessons and 1 drill are free to try. No payment needed to get started.' },
                { q: 'What if I already play piano?', a: "Take the placement quiz when you sign up. It'll skip you to the right lesson based on what you already know." },
              ]
          ).map((item, i) => (
            <div key={i} style={p.faqItem}>
              <div style={p.faqQ}>{item.q}</div>
              <div style={p.faqA}>{item.a}</div>
            </div>
          ))}
        </div>
      </div>

      <footer style={p.footer} className="pricing-footer">
        <a href="/" onClick={(e) => go(e, "/")} style={p.footerLogo}>Sonata</a>
        <div style={{ display: 'flex', gap: 16 }}>
          <a href="/terms/" onClick={(e) => go(e, "/terms/")} style={p.footerLink}>Terms</a>
          <a href="/privacy/" onClick={(e) => go(e, "/privacy/")} style={p.footerLink}>Privacy</a>
        </div>
      </footer>
    </div>
  );
}

const p: Record<string, React.CSSProperties> = {
  page: { background: '#0C0A09', color: '#FAFAF9', fontFamily: "'Outfit', system-ui, sans-serif", fontWeight: 300, minHeight: '100vh' },
  nav: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '16px 32px', borderBottom: '1px solid rgba(200,169,110,0.08)' },
  navLogo: { fontFamily: "'Instrument Serif', Georgia, serif", fontSize: 22, color: '#C8A96E', textDecoration: 'none' },
  backBtn: { color: '#78716C', fontSize: 14, background: 'none', border: 'none', padding: '8px 4px', cursor: 'pointer', fontFamily: "'Outfit', system-ui, sans-serif" },
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

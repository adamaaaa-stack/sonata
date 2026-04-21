"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { navigate, isNative } from "@/lib/platform";
import { ChunkyButton, Sticker, StaffBG, FloatingNotes, ChunkyCard } from "@/app/app/design";
import { Cleffy } from "@/app/app/Cleffy";
import "@/app/app/sonata.css";

export default function PricingPage() {
  const router = useRouter();
  const native = isNative();
  const [price, setPrice] = useState("$9.99");
  const [purchasing, setPurchasing] = useState(false);
  const [restoring, setRestoring] = useState(false);
  const [msg, setMsg] = useState("");
  const [subActive, setSubActive] = useState(false);

  useEffect(() => {
    if (!native) {
      try {
        if (localStorage.getItem('sonata_web_license') === 'true') setSubActive(true);
      } catch {}
      return;
    }
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
      else setMsg("Purchase was not completed. If this keeps happening, try restarting the app.");
    } catch (e) {
      const m = e instanceof Error ? e.message : String(e);
      console.warn('handleSubscribe error:', m);
      setMsg('Something went wrong: ' + (m.includes('Cannot find product') ? 'Subscription not available yet. Please try again later.' : 'Please try again.'));
    }
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

  const freeFeatures: { t: string; on: boolean }[] = [
    { t: 'First 3 lessons', on: true },
    { t: '1 drill session', on: true },
    { t: 'Score library (browse)', on: true },
    { t: 'Progress tracking', on: true },
    { t: 'Placement quiz', on: true },
    { t: 'Lessons 4-23', on: false },
    { t: 'Unlimited drills', on: false },
    { t: 'AI exercises', on: false },
  ];
  const premiumFeatures = [
    'All 23 lessons',
    'Unlimited drills',
    'Full piano library',
    'Score playback',
    'AI-generated exercises',
    'MIDI keyboard support',
    'Sight-reading mode',
    'Cancel anytime',
  ];

  return (
    <div style={{ position: 'relative', minHeight: '100vh', background: 'var(--cream)', fontFamily: 'var(--sans)', overflow: 'hidden' }}>
      <StaffBG opacity={0.22} />
      <FloatingNotes count={7} />

      {/* Nav */}
      <nav style={{ position: 'relative', zIndex: 3, display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '20px 24px', flexWrap: 'wrap', gap: 12 }}>
        {isNative() ? (
          <button type="button" onClick={goBack}
            style={{ display: 'inline-flex', alignItems: 'center', gap: 8, padding: '8px 14px', background: 'var(--cream)', color: 'var(--ink)', border: '3px solid var(--ink)', borderRadius: 999, boxShadow: '0 3px 0 var(--ink)', fontWeight: 800, fontSize: 13, cursor: 'pointer', fontFamily: 'var(--sans)' }}>
            ← Back
          </button>
        ) : (
          <a href="/" onClick={(e) => go(e, "/")}
            style={{ display: 'inline-flex', alignItems: 'center', gap: 8, fontFamily: 'var(--serif)', fontStyle: 'italic', fontSize: 26, fontWeight: 900, color: 'var(--ink)', textDecoration: 'none', letterSpacing: '-0.02em' }}>
            <span style={{ width: 38, height: 38, borderRadius: 12, background: 'var(--ink)', color: 'var(--gold)', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', fontSize: 22, border: '3px solid var(--ink)', boxShadow: '0 3px 0 var(--gold-deep)' }}>𝄞</span>
            Sonata
          </a>
        )}
        {!isNative() && (
          <div style={{ display: 'flex', gap: 12, alignItems: 'center' }}>
            <a href="/#features" style={{ color: 'var(--ink2)', textDecoration: 'none', fontSize: 14, fontWeight: 700 }}>Features</a>
            <ChunkyButton color="gold" size="sm" onClick={() => navigate("/login/", router)}>Start learning</ChunkyButton>
          </div>
        )}
      </nav>

      {/* Hero */}
      <div style={{ position: 'relative', zIndex: 2, padding: '20px 24px 0', maxWidth: 980, margin: '0 auto', textAlign: 'center' }}>
        <div style={{ display: 'inline-block' }}>
          <Cleffy size={110} mood="excited" />
        </div>
        <Sticker color="gold" rotate={-3} style={{ marginBottom: 12 }}>◆ Simple pricing</Sticker>
        <h1 style={{ fontFamily: 'var(--serif)', fontSize: 'clamp(44px, 7vw, 72px)', fontWeight: 900, fontStyle: 'italic', color: 'var(--ink)', margin: 0, letterSpacing: '-0.035em', lineHeight: 0.95 }}>
          Try free. Upgrade when <span style={{ color: 'var(--berry)' }}>you&apos;re ready.</span>
        </h1>
      </div>

      {/* Pricing grid */}
      <div style={{ position: 'relative', zIndex: 2, padding: '32px 24px 0', maxWidth: 980, margin: '0 auto', display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: 20 }}>
        {/* Free */}
        <ChunkyCard color="cream" padding={24} style={{ display: 'flex', flexDirection: 'column' }}>
          <div style={{ fontSize: 11, fontWeight: 800, color: 'var(--ink3)', textTransform: 'uppercase', letterSpacing: '0.15em' }}>Free</div>
          <div style={{ fontFamily: 'var(--serif)', fontSize: 64, fontWeight: 900, fontStyle: 'italic', color: 'var(--ink)', lineHeight: 1, marginTop: 4 }}>$0</div>
          <div style={{ fontSize: 14, color: 'var(--ink3)', fontWeight: 600, marginBottom: 20 }}>forever</div>

          <ul style={{ listStyle: 'none', padding: 0, margin: 0, flex: 1 }}>
            {freeFeatures.map((f, i) => (
              <li key={i} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '7px 0', color: f.on ? 'var(--ink)' : 'var(--ink3)', fontSize: 14, fontWeight: 600, opacity: f.on ? 1 : 0.5 }}>
                <span style={{ width: 20, height: 20, borderRadius: 999, border: '2px solid var(--ink)', background: f.on ? 'var(--mint)' : 'var(--parchment)', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', fontSize: 12, fontWeight: 900, color: 'var(--ink)', flexShrink: 0 }}>
                  {f.on ? '✓' : '–'}
                </span>
                {f.t}
              </li>
            ))}
          </ul>

          <ChunkyButton color="cream" size="lg" onClick={() => navigate("/login/", router)} style={{ justifyContent: 'center', marginTop: 20 }}>Start for free</ChunkyButton>
        </ChunkyCard>

        {/* Premium */}
        <ChunkyCard color="gold" padding={24} style={{ display: 'flex', flexDirection: 'column', position: 'relative', overflow: 'hidden' }}>
          <div aria-hidden="true" style={{ position: 'absolute', top: 10, right: 20, fontSize: 140, fontFamily: 'var(--serif)', color: 'var(--ink)', opacity: 0.14, lineHeight: 1, fontStyle: 'italic', pointerEvents: 'none' }}>✦</div>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', position: 'relative' }}>
            <div style={{ fontSize: 11, fontWeight: 800, color: 'var(--ink)', textTransform: 'uppercase', letterSpacing: '0.15em' }}>Premium</div>
            {subActive && <Sticker color="mint" rotate={4}>● Active</Sticker>}
          </div>
          <div style={{ fontFamily: 'var(--serif)', fontSize: 64, fontWeight: 900, fontStyle: 'italic', color: 'var(--ink)', lineHeight: 1, marginTop: 4, position: 'relative' }}>{native ? price : '$10'}</div>
          <div style={{ fontSize: 14, color: 'var(--ink)', opacity: 0.8, fontWeight: 700, marginBottom: 20, position: 'relative' }}>per month</div>

          <ul style={{ listStyle: 'none', padding: 0, margin: 0, flex: 1, position: 'relative' }}>
            {premiumFeatures.map((f, i) => (
              <li key={i} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '7px 0', color: 'var(--ink)', fontSize: 14, fontWeight: 700 }}>
                <span style={{ width: 20, height: 20, borderRadius: 999, border: '2px solid var(--ink)', background: 'var(--mint)', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', fontSize: 12, fontWeight: 900, flexShrink: 0 }}>✓</span>
                {f}
              </li>
            ))}
          </ul>

          <div style={{ position: 'relative', marginTop: 20 }}>
            {subActive ? (
              native ? (
                <ChunkyButton color="cream" size="lg" onClick={openManage} style={{ justifyContent: 'center', width: '100%' }}>Manage subscription</ChunkyButton>
              ) : (
                <div style={{ textAlign: 'center', padding: '14px 0', background: 'var(--cream)', border: '3px solid var(--ink)', borderRadius: 'var(--r2)', fontWeight: 800, color: 'var(--ink)', opacity: 0.7 }}>
                  You&apos;re subscribed
                </div>
              )
            ) : native ? (
              <ChunkyButton color="berry" size="lg" onClick={handleSubscribe} disabled={purchasing} style={{ justifyContent: 'center', width: '100%' }}>
                {purchasing ? '...' : `Subscribe for ${price}/month`}
              </ChunkyButton>
            ) : (
              <a href="https://morrison844.gumroad.com/l/sonata" target="_blank" rel="noopener noreferrer"
                 style={{ display: 'block', textAlign: 'center', textDecoration: 'none' }}>
                <ChunkyButton color="berry" size="lg" style={{ justifyContent: 'center', width: '100%' }}>Get Premium</ChunkyButton>
              </a>
            )}
          </div>
        </ChunkyCard>
      </div>

      {msg && (
        <div style={{ position: 'relative', zIndex: 2, textAlign: 'center', margin: '20px auto 0', maxWidth: 520, padding: '0 24px' }}>
          <div style={{ display: 'inline-block', padding: '10px 20px', background: 'var(--cream)', border: '3px solid var(--ink)', borderRadius: 'var(--r2)', fontSize: 13, fontWeight: 700, color: 'var(--ink2)', boxShadow: '0 4px 0 var(--ink)' }}>
            {msg}
          </div>
        </div>
      )}

      {native && (
        <div style={{ textAlign: 'center', marginTop: 20, position: 'relative', zIndex: 2 }}>
          <button onClick={handleRestore} disabled={restoring}
            style={{ background: 'none', border: 'none', color: 'var(--ink2)', fontSize: 14, cursor: 'pointer', fontFamily: 'var(--sans)', padding: 8, fontWeight: 700, textDecoration: 'underline' }}>
            {restoring ? 'Restoring…' : 'Restore purchases'}
          </button>
        </div>
      )}

      {native && (
        <div style={{ position: 'relative', zIndex: 2, fontSize: 12, color: 'var(--ink3)', marginTop: 24, lineHeight: 1.7, textAlign: 'left', maxWidth: 620, margin: '24px auto 0', padding: '0 24px', fontWeight: 500 }}>
          <p style={{ margin: 0 }}>
            Payment will be charged to your Apple ID account at confirmation of purchase. Your subscription will automatically renew for {price} per month unless auto-renew is turned off at least 24 hours before the end of the current period. Your account will be charged for renewal, at {price}, within 24 hours prior to the end of the current period. You can manage your subscription and turn off auto-renewal by going to your Apple ID Account Settings after purchase.
          </p>
        </div>
      )}

      {/* FAQ */}
      <div style={{ position: 'relative', zIndex: 2, maxWidth: 760, margin: '0 auto', padding: '60px 24px 40px' }}>
        <h2 style={{ fontFamily: 'var(--serif)', fontSize: 40, fontWeight: 900, fontStyle: 'italic', textAlign: 'center', margin: '0 0 32px', color: 'var(--ink)', letterSpacing: '-0.02em' }}>
          Questions<span style={{ color: 'var(--lilac-deep)' }}>?</span>
        </h2>
        {(native
          ? [
              { q: 'Can I cancel anytime?', a: 'Yes. You can cancel or manage auto-renewal anytime from your Apple ID Account Settings. You keep access until the end of your current billing period.' },
              { q: 'Is there a free trial?', a: 'The first 3 lessons and 1 drill are free to try. No subscription is needed to get started.' },
              { q: 'What if I already play piano?', a: "Take the placement quiz when you sign up. It'll skip you to the right lesson based on what you already know." },
              { q: 'Can I use this on other devices?', a: 'Your subscription is tied to your Apple ID, so it works across all your Apple devices signed in with the same Apple ID.' },
            ]
          : [
              { q: 'Can I cancel anytime?', a: 'Yes. Cancel from your Gumroad account whenever you want. You keep access until the end of your billing period.' },
              { q: 'How do I activate my license?', a: "After purchasing on Gumroad, you'll get a license key. Hit the paywall inside the app and paste it in — it activates instantly." },
              { q: 'Is there a free trial?', a: 'The first 3 lessons and 1 drill are free to try. No payment needed to get started.' },
              { q: 'What if I already play piano?', a: "Take the placement quiz when you sign up. It'll skip you to the right lesson based on what you already know." },
            ]
        ).map((item, i) => (
          <div key={i} style={{ marginBottom: 14, background: 'var(--paper)', border: '3px solid var(--ink)', borderRadius: 'var(--r2)', padding: '18px 22px', boxShadow: '0 5px 0 var(--ink)' }}>
            <div style={{ fontFamily: 'var(--serif)', fontStyle: 'italic', fontSize: 20, fontWeight: 900, color: 'var(--ink)', marginBottom: 6 }}>{item.q}</div>
            <div style={{ fontSize: 14, color: 'var(--ink2)', lineHeight: 1.6, fontWeight: 500 }}>{item.a}</div>
          </div>
        ))}
      </div>

      {/* Footer */}
      <footer style={{ position: 'relative', zIndex: 2, display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '24px 32px', borderTop: '3px solid var(--ink)', background: 'var(--paper)' }}>
        <a href="/" onClick={(e) => go(e, "/")}
          style={{ fontFamily: 'var(--serif)', fontSize: 20, fontWeight: 900, fontStyle: 'italic', color: 'var(--ink)', textDecoration: 'none' }}>
          Sonata
        </a>
        <div style={{ display: 'flex', gap: 16 }}>
          <a href="/terms/" onClick={(e) => go(e, "/terms/")} style={{ fontSize: 13, color: 'var(--ink2)', textDecoration: 'underline', fontWeight: 700 }}>Terms</a>
          <a href="/privacy/" onClick={(e) => go(e, "/privacy/")} style={{ fontSize: 13, color: 'var(--ink2)', textDecoration: 'underline', fontWeight: 700 }}>Privacy</a>
        </div>
      </footer>
    </div>
  );
}

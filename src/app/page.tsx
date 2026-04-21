"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { isNative, navigate } from "@/lib/platform";
import { supabase } from "@/lib/supabase";
import { ChunkyButton, Sticker, StaffBG, FloatingNotes, ChunkyCard, Candle } from "@/app/app/design";
import { Cleffy } from "@/app/app/Cleffy";
import "@/app/app/sonata.css";

export default function LandingPage() {
  const [showMobile, setShowMobile] = useState(false);
  const [mobileReady, setMobileReady] = useState(false);
  const router = useRouter();

  useEffect(() => {
    if (isNative()) {
      setShowMobile(true);
      let cancelled = false;
      (async () => {
        for (let i = 0; i < 15; i++) {
          if (cancelled) return;
          const { data } = await supabase.auth.getSession();
          if (data.session) {
            navigate("/app/", undefined, { replace: true });
            return;
          }
          await new Promise((r) => setTimeout(r, 100));
        }
        if (!cancelled) setMobileReady(true);
      })();
      return () => { cancelled = true; };
    }
  }, []);

  function go(e: React.MouseEvent<HTMLAnchorElement>, path: string) {
    e.preventDefault();
    navigate(path, router);
  }

  if (showMobile) return <MobileLanding ready={mobileReady} router={router} />;

  const jsonLd = {
    "@context": "https://schema.org",
    "@graph": [
      {
        "@type": "WebSite",
        "@id": "https://learnwithsonata.com/#website",
        url: "https://learnwithsonata.com",
        name: "Sonata",
        description: "Learn to read piano sheet music in days, not years.",
      },
      {
        "@type": "Organization",
        "@id": "https://learnwithsonata.com/#organization",
        name: "Sonata",
        url: "https://learnwithsonata.com",
        logo: "https://learnwithsonata.com/icon.svg",
      },
      {
        "@type": "WebPage",
        "@id": "https://learnwithsonata.com/#webpage",
        url: "https://learnwithsonata.com",
        name: "Learn to Read Piano Sheet Music — The Sonata Method",
        isPartOf: { "@id": "https://learnwithsonata.com/#website" },
        description:
          "23 interactive lessons teaching you to read piano sheet music from scratch, using the revolutionary interval-reading method.",
      },
    ],
  };

  return (
    <div style={{ position: 'relative', minHeight: '100vh', background: 'var(--cream)', fontFamily: 'var(--sans)', overflow: 'hidden' }}>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />
      <StaffBG opacity={0.25} />
      <FloatingNotes count={10} />

      {/* Nav */}
      <nav style={{
        position: 'sticky', top: 0, zIndex: 10,
        background: 'rgba(255, 246, 228, 0.92)',
        backdropFilter: 'blur(8px)',
        borderBottom: '3px solid var(--ink)',
        padding: '14px 24px',
        display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12,
      }}>
        <a href="/" style={{ display: 'inline-flex', alignItems: 'center', gap: 10, textDecoration: 'none' }}>
          <span style={{ width: 40, height: 40, borderRadius: 12, background: 'var(--ink)', color: 'var(--gold)', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', fontSize: 22, border: '3px solid var(--ink)', boxShadow: '0 3px 0 var(--gold-deep)' }}>𝄞</span>
          <span style={{ fontFamily: 'var(--serif)', fontSize: 26, fontWeight: 900, fontStyle: 'italic', color: 'var(--ink)', letterSpacing: '-0.02em' }}>Sonata</span>
        </a>
        <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
          <a href="#method" style={{ color: 'var(--ink2)', textDecoration: 'none', fontSize: 14, fontWeight: 700, display: 'none' }} className="landing-nav-link">Method</a>
          <a href="#features" style={{ color: 'var(--ink2)', textDecoration: 'none', fontSize: 14, fontWeight: 700, display: 'none' }} className="landing-nav-link">Features</a>
          <a href="/pricing/" onClick={(e) => go(e, '/pricing/')} style={{ color: 'var(--ink2)', textDecoration: 'none', fontSize: 14, fontWeight: 700, display: 'none' }} className="landing-nav-link">Pricing</a>
          <ChunkyButton color="gold" size="sm" onClick={() => navigate('/login/', router)}>Start free</ChunkyButton>
        </div>
      </nav>

      {/* Hero */}
      <section style={{ position: 'relative', zIndex: 2, padding: '40px 24px 60px', maxWidth: 1100, margin: '0 auto' }}>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: 32, alignItems: 'center' }}>
          <div>
            <Sticker color="gold" rotate={-3} style={{ marginBottom: 16 }}>
              ◆ The Sonata method
            </Sticker>
            <h1 style={{ fontFamily: 'var(--serif)', fontSize: 'clamp(48px, 8vw, 88px)', fontWeight: 900, fontStyle: 'italic', color: 'var(--ink)', margin: 0, letterSpacing: '-0.035em', lineHeight: 0.95 }}>
              Read sheet music<br />
              in <span style={{ color: 'var(--berry)', textDecoration: 'underline wavy', textDecorationColor: 'var(--gold)', textUnderlineOffset: 14, textDecorationThickness: 4 }}>days</span>, not years.
            </h1>
            <p style={{ fontSize: 18, color: 'var(--ink2)', margin: '18px 0 0', maxWidth: 500, lineHeight: 1.55, fontWeight: 500 }}>
              Stop memorising &quot;Every Good Boy Does Fine.&quot; Learn to read by <b>distance</b> — how pianists actually read — with 23 hand-crafted lessons, a friendly mascot, and zero fluff.
            </p>
            <div style={{ display: 'flex', gap: 10, marginTop: 28, flexWrap: 'wrap' }}>
              <ChunkyButton color="berry" size="xl" onClick={() => navigate('/login/?mode=signup', router)}>Start free</ChunkyButton>
              <ChunkyButton color="cream" size="xl" onClick={() => navigate('/pricing/', router)}>See pricing</ChunkyButton>
            </div>
            <div style={{ display: 'flex', gap: 10, marginTop: 20, flexWrap: 'wrap' }}>
              <Sticker color="mint" rotate={-2}>✓ First 3 lessons free</Sticker>
              <Sticker color="sky" rotate={2}>✓ No card required</Sticker>
              <Sticker color="peach" rotate={-1}>✓ Cancel anytime</Sticker>
            </div>
          </div>
          <div style={{ display: 'flex', justifyContent: 'center', position: 'relative' }}>
            <Cleffy size={280} mood="excited" />
            <div style={{ position: 'absolute', top: 40, right: 0, background: 'var(--cream)', border: '3px solid var(--ink)', borderRadius: 18, padding: '10px 16px', fontWeight: 800, fontSize: 14, color: 'var(--ink)', boxShadow: '0 4px 0 var(--ink)', transform: 'rotate(8deg)' }}>
              Hi! I&apos;m Cleffy ♪
            </div>
          </div>
        </div>
      </section>

      {/* Method section */}
      <section id="method" style={{ position: 'relative', zIndex: 2, padding: '60px 24px', maxWidth: 1100, margin: '0 auto' }}>
        <div style={{ textAlign: 'center', marginBottom: 40 }}>
          <Sticker color="coral" rotate={-3} style={{ marginBottom: 14 }}>◆ The method</Sticker>
          <h2 style={{ fontFamily: 'var(--serif)', fontSize: 'clamp(40px, 6vw, 60px)', fontWeight: 900, fontStyle: 'italic', color: 'var(--ink)', margin: 0, letterSpacing: '-0.03em', lineHeight: 0.95 }}>
            Most apps teach you <span style={{ color: 'var(--coral-deep)' }}>wrong.</span>
          </h2>
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: 18 }}>
          <ChunkyCard color="cream" padding={24}>
            <div style={{ fontSize: 42, marginBottom: 12 }}>🙄</div>
            <div style={{ fontFamily: 'var(--serif)', fontStyle: 'italic', fontSize: 24, fontWeight: 900, color: 'var(--ink)', marginBottom: 8 }}>Flashcard apps</div>
            <p style={{ fontSize: 14, color: 'var(--ink2)', lineHeight: 1.6, margin: 0, fontWeight: 500 }}>
              Memorise note names in isolation. Then stare at real music and panic because everything&apos;s on ledger lines.
            </p>
          </ChunkyCard>
          <ChunkyCard color="cream" padding={24}>
            <div style={{ fontSize: 42, marginBottom: 12 }}>😴</div>
            <div style={{ fontFamily: 'var(--serif)', fontStyle: 'italic', fontSize: 24, fontWeight: 900, color: 'var(--ink)', marginBottom: 8 }}>Mnemonics</div>
            <p style={{ fontSize: 14, color: 'var(--ink2)', lineHeight: 1.6, margin: 0, fontWeight: 500 }}>
              &quot;Every Good Boy Does Fine.&quot; Cute — until you realise no pianist has ever read a score this way.
            </p>
          </ChunkyCard>
          <ChunkyCard color="mint" padding={24}>
            <div style={{ fontSize: 42, marginBottom: 12 }}>🎉</div>
            <div style={{ fontFamily: 'var(--serif)', fontStyle: 'italic', fontSize: 24, fontWeight: 900, color: 'var(--ink)', marginBottom: 8 }}>The Sonata way</div>
            <p style={{ fontSize: 14, color: 'var(--ink)', lineHeight: 1.6, margin: 0, fontWeight: 600 }}>
              Read by <b>distance</b>. See a step up, a skip down, a leap across — and your fingers follow. Like native readers do.
            </p>
          </ChunkyCard>
        </div>
      </section>

      {/* Features */}
      <section id="features" style={{ position: 'relative', zIndex: 2, padding: '60px 24px', maxWidth: 1100, margin: '0 auto' }}>
        <div style={{ textAlign: 'center', marginBottom: 40 }}>
          <Sticker color="sky" rotate={-3} style={{ marginBottom: 14 }}>◆ What&apos;s inside</Sticker>
          <h2 style={{ fontFamily: 'var(--serif)', fontSize: 'clamp(40px, 6vw, 60px)', fontWeight: 900, fontStyle: 'italic', color: 'var(--ink)', margin: 0, letterSpacing: '-0.03em', lineHeight: 0.95 }}>
            Built to be <span style={{ color: 'var(--sky-deep)' }}>fun.</span>
          </h2>
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))', gap: 18 }}>
          {[
            { emoji: '📖', title: '23 lessons', desc: 'From staff basics to Moonlight Sonata. Short enough for a lunch break.', color: 'peach' as const },
            { emoji: '🎯', title: 'Smart drills', desc: 'AI targets exactly what you\'re struggling with. No busywork.', color: 'coral' as const },
            { emoji: '📚', title: 'Piano library', desc: 'Full pieces with tap-to-play and follow-the-cursor playback.', color: 'mint' as const },
            { emoji: '🥁', title: 'Rhythm trainer', desc: 'Listen. Then tap it back. Real ear training, not just notes.', color: 'lilac' as const },
            { emoji: '🎹', title: 'MIDI support', desc: 'Got a keyboard? Plug it in — drills accept your real playing.', color: 'berry' as const },
            { emoji: '🌱', title: 'Daily streaks', desc: 'Grow a virtual oak tree by practising. Five minutes a day is magic.', color: 'sky' as const },
          ].map((f, i) => (
            <ChunkyCard key={i} color={f.color} padding={22}>
              <div style={{ fontSize: 38, marginBottom: 10 }}>{f.emoji}</div>
              <div style={{ fontFamily: 'var(--serif)', fontStyle: 'italic', fontSize: 22, fontWeight: 900, color: 'var(--ink)', marginBottom: 6 }}>{f.title}</div>
              <p style={{ fontSize: 14, color: 'var(--ink)', opacity: 0.82, lineHeight: 1.55, margin: 0, fontWeight: 600 }}>{f.desc}</p>
            </ChunkyCard>
          ))}
        </div>
      </section>

      {/* Curriculum preview */}
      <section style={{ position: 'relative', zIndex: 2, padding: '60px 24px', maxWidth: 1000, margin: '0 auto' }}>
        <div style={{ textAlign: 'center', marginBottom: 32 }}>
          <Sticker color="peach" rotate={-3} style={{ marginBottom: 14 }}>◆ The journey</Sticker>
          <h2 style={{ fontFamily: 'var(--serif)', fontSize: 'clamp(40px, 6vw, 60px)', fontWeight: 900, fontStyle: 'italic', color: 'var(--ink)', margin: 0, letterSpacing: '-0.03em', lineHeight: 0.95 }}>
            From zero to <span style={{ color: 'var(--peach-deep)' }}>Moonlight Sonata.</span>
          </h2>
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: 14 }}>
          {[
            { range: '1-5', label: 'Foundations', pieces: 'Staff, notes, steps & skips', color: 'mint' as const },
            { range: '6-10', label: 'Your first pieces', pieces: 'Ode to Joy · Für Elise', color: 'sky' as const },
            { range: '11-15', label: 'Getting fluent', pieces: 'Greensleeves · Clair de Lune', color: 'lilac' as const },
            { range: '16-23', label: 'Mastery', pieces: 'Rondo · Moonlight 3rd mvt', color: 'berry' as const },
          ].map((c, i) => (
            <ChunkyCard key={i} color={c.color} padding={20}>
              <div style={{ fontSize: 11, fontWeight: 800, letterSpacing: '0.15em', color: 'var(--ink)', opacity: 0.75, textTransform: 'uppercase' }}>Lessons {c.range}</div>
              <div style={{ fontFamily: 'var(--serif)', fontStyle: 'italic', fontSize: 24, fontWeight: 900, color: 'var(--ink)', marginTop: 4 }}>{c.label}</div>
              <div style={{ fontSize: 13, color: 'var(--ink)', opacity: 0.82, fontWeight: 600, marginTop: 6 }}>{c.pieces}</div>
            </ChunkyCard>
          ))}
        </div>
      </section>

      {/* Story */}
      <section id="story" style={{ position: 'relative', zIndex: 2, padding: '60px 24px', maxWidth: 760, margin: '0 auto' }}>
        <ChunkyCard color="paper" padding={36} style={{ position: 'relative' }}>
          <Sticker color="gold" rotate={-4} style={{ marginBottom: 14 }}>◆ From the maker</Sticker>
          <h2 style={{ fontFamily: 'var(--serif)', fontSize: 'clamp(32px, 5vw, 44px)', fontWeight: 900, fontStyle: 'italic', color: 'var(--ink)', margin: '0 0 20px', letterSpacing: '-0.02em' }}>
            Hi, I&apos;m <span style={{ color: 'var(--gold-deep)' }}>Adam.</span>
          </h2>
          <p style={{ fontSize: 17, color: 'var(--ink2)', lineHeight: 1.65, margin: '0 0 14px', fontWeight: 500, fontStyle: 'italic', fontFamily: 'var(--serif)' }}>
            I spent years stuck at &quot;Every Good Boy Does Fine,&quot; able to play by ear but frozen when I saw a real score.
          </p>
          <p style={{ fontSize: 17, color: 'var(--ink2)', lineHeight: 1.65, margin: '0 0 14px', fontWeight: 500, fontStyle: 'italic', fontFamily: 'var(--serif)' }}>
            Then someone showed me how fluent readers actually read — <b style={{ color: 'var(--ink)' }}>by distance, not by name</b>. Within two months I was reading pieces I&apos;d never tried to memorise.
          </p>
          <p style={{ fontSize: 17, color: 'var(--ink2)', lineHeight: 1.65, margin: 0, fontWeight: 500, fontStyle: 'italic', fontFamily: 'var(--serif)' }}>
            Sonata is the course I wish I&apos;d had back then. No mnemonics. No flashcards. Just the shortcut that actually works.
          </p>
          <Candle x="calc(100% - 40px)" y={-18} size={18} />
        </ChunkyCard>
      </section>

      {/* Final CTA */}
      <section style={{ position: 'relative', zIndex: 2, padding: '60px 24px 80px', maxWidth: 860, margin: '0 auto', textAlign: 'center' }}>
        <Cleffy size={140} mood="waving" />
        <h2 style={{ fontFamily: 'var(--serif)', fontSize: 'clamp(44px, 7vw, 72px)', fontWeight: 900, fontStyle: 'italic', color: 'var(--ink)', margin: '12px 0 0', letterSpacing: '-0.035em', lineHeight: 0.95 }}>
          Your first lesson is <span style={{ color: 'var(--berry)' }}>waiting.</span>
        </h2>
        <p style={{ fontSize: 17, color: 'var(--ink2)', margin: '14px auto 28px', maxWidth: 460, lineHeight: 1.55, fontWeight: 500 }}>
          Free to start. No credit card. 23 lessons from zero to reading real sheet music.
        </p>
        <ChunkyButton color="berry" size="xl" onClick={() => navigate('/login/?mode=signup', router)}>Start learning now →</ChunkyButton>
      </section>

      {/* Footer */}
      <footer style={{ position: 'relative', zIndex: 2, display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '24px 32px', borderTop: '3px solid var(--ink)', background: 'var(--paper)', flexWrap: 'wrap', gap: 12 }}>
        <span style={{ fontFamily: 'var(--serif)', fontSize: 22, fontWeight: 900, fontStyle: 'italic', color: 'var(--ink)' }}>Sonata</span>
        <div style={{ display: 'flex', gap: 16, alignItems: 'center', flexWrap: 'wrap' }}>
          <a href="/terms/" onClick={(e) => go(e, "/terms/")} style={{ fontSize: 13, color: 'var(--ink2)', textDecoration: 'underline', fontWeight: 700 }}>Terms</a>
          <a href="/privacy/" onClick={(e) => go(e, "/privacy/")} style={{ fontSize: 13, color: 'var(--ink2)', textDecoration: 'underline', fontWeight: 700 }}>Privacy</a>
          <span style={{ fontSize: 13, color: 'var(--ink3)', fontWeight: 600 }}>Built by Adam Morris</span>
        </div>
      </footer>
    </div>
  );
}

// ============================================================
// MOBILE LANDING — Shown when running in Capacitor
// ============================================================
function MobileLanding({ ready, router }: { ready: boolean; router: ReturnType<typeof useRouter> }) {
  if (!ready) {
    return (
      <div style={{ minHeight: '100vh', background: 'var(--cream)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: 'var(--sans)' }}>
        <Cleffy size={140} mood="thinking" />
      </div>
    );
  }

  return (
    <div style={{ position: 'relative', minHeight: '100vh', background: 'var(--cream)', fontFamily: 'var(--sans)', overflow: 'hidden', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '20px max(20px, env(safe-area-inset-left)) max(20px, env(safe-area-inset-bottom))' }}>
      <StaffBG opacity={0.28} />
      <FloatingNotes count={7} />

      <div style={{ position: 'relative', zIndex: 2, width: '100%', maxWidth: 420, display: 'flex', flexDirection: 'column', alignItems: 'center', textAlign: 'center' }}>
        <Cleffy size={180} mood="waving" />
        <Sticker color="gold" rotate={-3} style={{ marginTop: 10, marginBottom: 14 }}>◆ Sonata</Sticker>
        <h1 style={{ fontFamily: 'var(--serif)', fontSize: 52, fontWeight: 900, fontStyle: 'italic', color: 'var(--ink)', margin: 0, letterSpacing: '-0.035em', lineHeight: 0.95 }}>
          Read music in<br />
          <span style={{ color: 'var(--berry)' }}>days</span>, not years.
        </h1>
        <p style={{ fontSize: 16, color: 'var(--ink2)', marginTop: 14, lineHeight: 1.55, fontWeight: 500, maxWidth: 360 }}>
          Learn to read piano sheet music by distance, not memorisation.
        </p>

        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, justifyContent: 'center', marginTop: 20 }}>
          <Sticker color="mint" rotate={-2}>23 lessons</Sticker>
          <Sticker color="peach" rotate={2}>First 3 free</Sticker>
          <button type="button" onClick={() => navigate('/pricing/', router)}
            style={{ background: 'none', border: 'none', padding: 0, cursor: 'pointer' }}>
            <Sticker color="sky" rotate={-1}>See pricing →</Sticker>
          </button>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 10, width: '100%', marginTop: 28 }}>
          <ChunkyButton color="berry" size="xl" onClick={() => navigate('/login/?mode=signup', router)} style={{ justifyContent: 'center', width: '100%' }}>
            Get started
          </ChunkyButton>
          <ChunkyButton color="cream" size="md" onClick={() => navigate('/login/', router)} style={{ justifyContent: 'center', width: '100%' }}>
            I already have an account
          </ChunkyButton>
        </div>

        <div style={{ display: 'flex', gap: 16, marginTop: 28, fontSize: 13 }}>
          <button type="button" onClick={() => navigate('/terms/', router)}
            style={{ background: 'none', border: 'none', color: 'var(--ink3)', fontSize: 13, cursor: 'pointer', fontFamily: 'var(--sans)', fontWeight: 700, textDecoration: 'underline' }}>
            Terms
          </button>
          <span style={{ color: 'var(--ink3)' }}>·</span>
          <button type="button" onClick={() => navigate('/privacy/', router)}
            style={{ background: 'none', border: 'none', color: 'var(--ink3)', fontSize: 13, cursor: 'pointer', fontFamily: 'var(--sans)', fontWeight: 700, textDecoration: 'underline' }}>
            Privacy
          </button>
        </div>
      </div>
    </div>
  );
}

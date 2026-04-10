"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { isNative, navigate } from "@/lib/platform";
import { supabase } from "@/lib/supabase";
import "./landing.css";

export default function LandingPage() {
  const [scrollY, setScrollY] = useState(0);
  const [visible, setVisible] = useState(false);
  const [showMobile, setShowMobile] = useState(false);
  const [mobileReady, setMobileReady] = useState(false);
  const router = useRouter();

  useEffect(() => {
    setVisible(true);
    if (isNative()) {
      // Mobile flow:
      // 1. Poll for a session (Supabase restore is async on hard nav)
      // 2. If found → go straight to app
      // 3. Otherwise show the mobile landing
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
      return () => {
        cancelled = true;
      };
    }
    const onScroll = () => setScrollY(window.scrollY);
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  function go(e: React.MouseEvent<HTMLAnchorElement>, path: string) {
    e.preventDefault();
    navigate(path, router);
  }

  // Render the mobile landing if we're on native
  if (showMobile) {
    return <MobileLanding ready={mobileReady} router={router} />;
  }

  const jsonLd = {
    "@context": "https://schema.org",
    "@graph": [
      {
        "@type": "WebSite",
        name: "Sonata",
        url: "https://learnwithsonata.com",
        description:
          "Learn to read piano sheet music in days, not years. The Sonata method teaches reading by distance, not memorisation.",
        inLanguage: "en-US",
      },
      {
        "@type": "EducationalOrganization",
        name: "Sonata",
        url: "https://learnwithsonata.com",
        logo: "https://learnwithsonata.com/icon.svg",
        description:
          "Interactive piano sheet music reading lessons using the interval method.",
        founder: { "@type": "Person", name: "Adam Morris" },
      },
      {
        "@type": "Course",
        name: "Learn to Read Piano Sheet Music — The Sonata Method",
        description:
          "23 interactive lessons teaching you to read piano sheet music from scratch, using the revolutionary interval-reading method. Goes from zero experience to playing Moonlight Sonata.",
        provider: {
          "@type": "Organization",
          name: "Sonata",
          sameAs: "https://learnwithsonata.com",
        },
        educationalLevel: "beginner",
        teaches: [
          "Reading piano sheet music",
          "Music theory",
          "Sight reading",
          "Interval recognition",
          "Rhythm reading",
        ],
        hasCourseInstance: {
          "@type": "CourseInstance",
          courseMode: "online",
          courseWorkload: "PT10H",
        },
      },
    ],
  };

  return (
    <div style={styles.page}>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />
      {/* Ambient glow */}
      <div
        style={{
          position: "fixed",
          top: 0,
          left: 0,
          right: 0,
          height: "70vh",
          background:
            "radial-gradient(ellipse at 50% 0%, rgba(200,169,110,0.06) 0%, transparent 70%)",
          pointerEvents: "none",
          zIndex: 0,
        }}
      />

      {/* Nav */}
      <nav style={styles.nav} className="landing-nav">
        <span style={styles.navLogo}>Sonata</span>
        <div style={styles.navLinks} className="landing-nav-links">
          <a href="#method" style={styles.navLink}>Method</a>
          <a href="#features" style={styles.navLink}>Features</a>
          <a href="/pricing/" onClick={(e) => go(e, "/pricing/")} style={styles.navLink}>Pricing</a>
          <a href="#story" style={styles.navLink}>Story</a>
          <a href="/login/" onClick={(e) => go(e, "/login/")} style={styles.navCta}>Start learning</a>
        </div>
      </nav>

      {/* Hero */}
      <section
        style={{
          ...styles.hero,
          opacity: visible ? 1 : 0,
          transform: visible ? "translateY(0)" : "translateY(20px)",
          transition: "all 0.8s ease",
        }}
      >
        <div style={styles.heroBadge}>The interval method</div>
        <h1 style={styles.heroTitle} className="landing-hero-title">
          I learned Gymnop&eacute;die No. 1<br />
          <span style={styles.heroAccent}>in one night.</span>
        </h1>
        <p style={styles.heroSub} className="landing-hero-sub">
          Not a simplified version. The real piece. Satie&apos;s actual notes, read
          from the score, played with both hands. After years of thinking I
          couldn&apos;t read sheet music, one method changed everything.
        </p>
        <div style={styles.heroButtons} className="landing-hero-buttons">
          <a href="/login/" onClick={(e) => go(e, "/login/")} style={styles.primaryBtn}>
            Start for free
          </a>
          <a href="#story" style={styles.ghostBtn}>
            Read the story
          </a>
        </div>

        {/* Floating staff lines */}
        <div
          style={{
            ...styles.staffLines,
            transform: `translateY(${scrollY * 0.1}px)`,
          }}
        >
          {[0, 1, 2, 3, 4].map((i) => (
            <div key={i} style={styles.staffLine} />
          ))}
        </div>
      </section>

      {/* The problem */}
      <section style={styles.section}>
        <div style={styles.sectionInner}>
          <p style={styles.lede} className="landing-lede">
            Traditional music education has a problem.
          </p>
          <div style={styles.twoCol} className="landing-two-col">
            <div style={styles.problemCard}>
              <div style={styles.problemIcon}>&#x2717;</div>
              <h3 style={styles.problemTitle}>The old way</h3>
              <p style={styles.problemText}>
                Memorise Every Good Boy Does Fine. Memorise FACE. Memorise bass
                clef separately. Drill flashcards for months. Still pause on
                every note. Still can&apos;t play anything real.
              </p>
            </div>
            <div style={{ ...styles.problemCard, ...styles.solutionCard }}>
              <div style={{ ...styles.problemIcon, color: "#C8A96E" }}>&#x2713;</div>
              <h3 style={styles.problemTitle}>The Sonata method</h3>
              <p style={styles.problemText}>
                Learn 3 anchor notes. Read by distance, not by name. Steps,
                skips, leaps. One visual rule classifies every interval
                instantly. Play real pieces from lesson one.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* The method */}
      <section id="method" style={{ ...styles.section, background: "#1C1917" }}>
        <div style={styles.sectionInner}>
          <h2 style={styles.sectionTitle} className="landing-section-title">The method in 60 seconds</h2>
          <p style={styles.sectionSub}>
            Three ideas that replace years of memorisation.
          </p>
          <div style={styles.threeCol} className="landing-three-col">
            <div style={styles.methodCard}>
              <div style={styles.methodNum}>1</div>
              <h3 style={styles.methodTitle}>Three anchors</h3>
              <p style={styles.methodText}>
                Middle C, treble G, bass F. Three landmarks you always know.
                Every other note is found by counting from the nearest anchor.
                Like navigating a city from three landmarks instead of
                memorising every street.
              </p>
            </div>
            <div style={styles.methodCard}>
              <div style={styles.methodNum}>2</div>
              <h3 style={styles.methodTitle}>Read the distance</h3>
              <p style={styles.methodText}>
                Don&apos;t identify each note by name. Read how far it is from
                the last note. Step up? Play the next key. Skip? Jump one key.
                Your eyes track movement, your fingers mirror it. Like reading
                words instead of spelling out letters.
              </p>
            </div>
            <div style={styles.methodCard}>
              <div style={styles.methodNum}>3</div>
              <h3 style={styles.methodTitle}>The odd/even rule</h3>
              <p style={styles.methodText}>
                One glance tells you everything. Both notes on lines? Odd
                interval (3rd, 5th, 7th). One on a line, one in a space? Even
                (2nd, 4th, 6th). Half the classification done before you even
                count. No other method teaches this.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* The story */}
      <section id="story" style={styles.section}>
        <div style={{ ...styles.sectionInner, maxWidth: 680 }}>
          <h2 style={styles.sectionTitle} className="landing-section-title">The night everything changed</h2>
          <div style={styles.story}>
            <p style={styles.storyP}>
              I&apos;d been playing piano for years. Casually, sure &mdash; by
              ear, by YouTube tutorials, by watching someone else&apos;s fingers
              and copying them. I could play things. But I couldn&apos;t{" "}
              <em>read</em> anything.
            </p>
            <p style={styles.storyP}>
              Sheet music was a wall of hieroglyphics. I&apos;d tried the
              traditional route &mdash; Every Good Boy Does Fine, FACE in the
              space, bass clef mnemonics. I&apos;d spend ten minutes decoding
              four bars, forget them by the next day, and feel stupid for not
              getting it.
            </p>
            <p style={styles.storyP}>
              Then I discovered something: the problem wasn&apos;t me. The
              problem was the method. Traditional note reading asks you to
              memorise 20+ positions across two staves. That&apos;s a brute-force
              approach to a pattern-recognition problem.
            </p>
            <p style={styles.storyHighlight}>
              What if you only needed three notes?
            </p>
            <p style={styles.storyP}>
              The interval method flips everything. You learn three anchor notes,
              then read by <em>distance</em> &mdash; how far each note is from
              the last one. Steps, skips, and leaps. Your eyes stop decoding
              individual notes and start tracking movement. Like the difference
              between reading a sentence letter-by-letter and actually reading
              words.
            </p>
            <p style={styles.storyP}>
              I sat down with Satie&apos;s Gymnop&eacute;die No. 1. The melody
              is almost entirely steps and small skips &mdash; exactly what the
              method teaches first. I read the intervals: skip up, step down,
              step down, skip down, step up. My fingers followed. No pausing.
              No counting lines. Just&hellip; reading.
            </p>
            <p style={styles.storyHighlight}>
              By midnight, I was playing the whole piece. Both hands. From the
              score. It was the first piece of real sheet music I&apos;d ever
              sight-read in my life.
            </p>
            <p style={styles.storyP}>
              I built Sonata because I wanted other people to have that same
              moment. The curriculum takes you from zero to reading Moonlight
              Sonata&apos;s 3rd movement in 15 lessons. Not by memorising &mdash;
              by understanding.
            </p>
            <p style={styles.storySign}>Adam Morris</p>
          </div>
        </div>
      </section>

      {/* App Preview */}
      <section style={{ ...styles.section, background: "#1C1917" }}>
        <div style={styles.sectionInner}>
          <h2 style={styles.sectionTitle} className="landing-section-title">See it in action</h2>
          <p style={styles.sectionSub}>A real app, not a textbook. Here&apos;s what learning looks like.</p>
          <div style={styles.previewGrid} className="landing-preview-grid">
            {/* Lesson preview */}
            <div style={styles.previewCard}>
              <div style={styles.previewMockup}>
                <div style={{ display: 'flex', gap: 4, marginBottom: 12 }}>
                  {[1,2,3,4,5].map(i => <div key={i} style={{ flex: 1, height: 1, background: '#C8A96E', opacity: 0.3 }} />)}
                </div>
                <div style={{ display: 'flex', gap: 8, alignItems: 'flex-end', justifyContent: 'center', marginBottom: 16 }}>
                  {['C','D','E','F','G'].map((n,i) => (
                    <div key={n} style={{ width: 24, height: 24, borderRadius: 12, background: i === 2 ? '#C8A96E' : 'rgba(200,169,110,0.15)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 10, color: i === 2 ? '#0C0A09' : '#78716C', fontWeight: 600, fontFamily: 'var(--sans, monospace)' }}>{n}</div>
                  ))}
                </div>
                <div style={{ background: '#292524', borderRadius: 8, padding: '10px 12px', fontSize: 12, color: '#A8A29E', lineHeight: 1.6 }}>
                  C to E is a <span style={{ color: '#C8A96E' }}>skip (3rd)</span> — both on lines. Your fingers jump one key.
                </div>
              </div>
              <div style={styles.previewLabel}>Interactive lessons</div>
              <div style={styles.previewDesc}>Step-by-step teaching with notation, audio narration, and a piano to try on.</div>
            </div>

            {/* Drill preview */}
            <div style={styles.previewCard}>
              <div style={styles.previewMockup}>
                <div style={{ textAlign: 'center', marginBottom: 12 }}>
                  <div style={{ fontSize: 11, color: '#78716C', marginBottom: 6 }}>What interval?</div>
                  <div style={{ display: 'flex', gap: 4, justifyContent: 'center', marginBottom: 8 }}>
                    {[1,2,3,4,5].map(i => <div key={i} style={{ flex: 1, maxWidth: 40, height: 1, background: '#FAFAF9', opacity: 0.15 }} />)}
                  </div>
                  <div style={{ display: 'flex', gap: 6, justifyContent: 'center' }}>
                    <div style={{ width: 10, height: 10, borderRadius: 5, background: '#C8A96E', position: 'relative', top: -2 }} />
                    <div style={{ width: 10, height: 10, borderRadius: 5, background: '#4ADE80', position: 'relative', top: 6 }} />
                  </div>
                </div>
                <div style={{ display: 'flex', gap: 6, justifyContent: 'center' }}>
                  {['2nd','3rd','4th','5th'].map((n,i) => (
                    <div key={n} style={{ padding: '8px 12px', borderRadius: 8, background: i === 1 ? 'rgba(74,222,128,0.15)' : '#292524', border: i === 1 ? '1px solid #4ADE80' : '1px solid #44403C', fontSize: 11, color: i === 1 ? '#4ADE80' : '#A8A29E', fontFamily: 'var(--sans, system-ui)' }}>{n}</div>
                  ))}
                </div>
              </div>
              <div style={styles.previewLabel}>Adaptive drills</div>
              <div style={styles.previewDesc}>AI targets your weak spots. Timed rounds. Answer by tapping or playing your piano.</div>
            </div>

            {/* Score preview */}
            <div style={styles.previewCard}>
              <div style={styles.previewMockup}>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 2, marginBottom: 10 }}>
                  {[0,1,2,3,4].map(i => <div key={i} style={{ height: 1, background: 'rgba(250,250,249,0.12)' }} />)}
                </div>
                <div style={{ display: 'flex', gap: 3, justifyContent: 'center', marginBottom: 10 }}>
                  {[12,8,16,12,20,16,8,12,16,20,12,8].map((h,i) => (
                    <div key={i} style={{ width: 3, height: h, borderRadius: 1.5, background: i === 4 ? '#C8A96E' : 'rgba(250,250,249,0.3)' }} />
                  ))}
                </div>
                <div style={{ display: 'flex', gap: 4, justifyContent: 'center' }}>
                  <div style={{ padding: '4px 10px', borderRadius: 6, background: '#292524', fontSize: 10, color: '#78716C' }}>Play</div>
                  <div style={{ padding: '4px 10px', borderRadius: 6, background: '#292524', fontSize: 10, color: '#78716C' }}>0.75x</div>
                </div>
              </div>
              <div style={styles.previewLabel}>400+ pieces</div>
              <div style={styles.previewDesc}>Full interactive scores from Bach to Chopin. Play along, slow down, follow the cursor.</div>
            </div>

            {/* Progress preview */}
            <div style={styles.previewCard}>
              <div style={styles.previewMockup}>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: 3, marginBottom: 10 }}>
                  {Array.from({ length: 21 }, (_, i) => (
                    <div key={i} style={{ aspectRatio: '1', borderRadius: 3, background: i < 14 ? (i % 3 === 0 ? '#4ADE80' : i % 5 === 0 ? '#FACC15' : 'rgba(74,222,128,0.3)') : '#292524' }} />
                  ))}
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 10, color: '#78716C' }}>
                  <span>14-day streak</span>
                  <span style={{ color: '#4ADE80' }}>87% accuracy</span>
                </div>
              </div>
              <div style={styles.previewLabel}>Track progress</div>
              <div style={styles.previewDesc}>Practice calendar, streak counter, interval accuracy grid. Know exactly where to focus.</div>
            </div>
          </div>
        </div>
      </section>

      {/* Features */}
      <section
        id="features"
        style={{ ...styles.section, background: "#1C1917" }}
      >
        <div style={styles.sectionInner}>
          <h2 style={styles.sectionTitle} className="landing-section-title">Everything you need</h2>
          <div style={styles.featureGrid} className="landing-feature-grid">
            {[
              {
                icon: "15",
                title: "Structured lessons",
                desc: "From the staff basics to Moonlight Sonata 3rd movement. Each lesson builds on the last. Real pieces, not toy exercises.",
              },
              {
                icon: "392",
                title: "Score library",
                desc: "Bach chorales, Chopin nocturnes, Debussy, Mozart, Beethoven. Full interactive sheet music rendered in your browser.",
              },
              {
                icon: "AI",
                title: "Targeted drills",
                desc: "AI identifies your weakest intervals and generates exercises that attack exactly where you struggle.",
              },
              {
                icon: "0.75x",
                title: "Narrated lessons",
                desc: "Every lesson step read aloud. Pause, slow down, replay. Learn at your own pace without reading walls of text.",
              },
              {
                icon: "C5",
                title: "Pitch detection",
                desc: "Answer drills by playing your real piano. The app listens, detects the note, and scores you in real time.",
              },
              {
                icon: "30d",
                title: "Progress tracking",
                desc: "Interval accuracy grid, practice calendar, streak counter. See exactly where you're strong and where to focus.",
              },
            ].map((f, i) => (
              <div key={i} style={styles.featureCard}>
                <div style={styles.featureIcon}>{f.icon}</div>
                <h3 style={styles.featureTitle}>{f.title}</h3>
                <p style={styles.featureDesc}>{f.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Journey */}
      <section style={styles.section}>
        <div style={styles.sectionInner}>
          <h2 style={styles.sectionTitle} className="landing-section-title">From zero to Moonlight Sonata</h2>
          <p style={styles.sectionSub}>
            15 lessons. Each one ends with a real piece you can play.
          </p>
          <div style={styles.journey}>
            {[
              { n: "1-3", label: "The fundamentals", pieces: "Happy Birthday, Ode to Joy, Minuet in G", color: "#4ADE80" },
              { n: "4-6", label: "Fluent reading", pieces: "Gymnop\u00e9die No.1, F\u00fcr Elise", color: "#FACC15" },
              { n: "7-9", label: "Expression", pieces: "Clair de Lune, Arabesque No.1", color: "#FB923C" },
              { n: "10-12", label: "Technique", pieces: "Bach Prelude BWV 846, Moonlight 1st mvt, Nocturne Op.9", color: "#F87171" },
              { n: "13-15", label: "Mastery", pieces: "Rondo alla Turca, Moonlight Sonata 3rd mvt", color: "#C8A96E" },
            ].map((j, i) => (
              <div key={i} style={styles.journeyRow}>
                <div
                  style={{
                    ...styles.journeyDot,
                    background: j.color,
                    boxShadow: `0 0 12px ${j.color}40`,
                  }}
                />
                <div style={styles.journeyContent}>
                  <div style={styles.journeyNum}>Lessons {j.n}</div>
                  <div style={styles.journeyLabel}>{j.label}</div>
                  <div style={styles.journeyPieces}>{j.pieces}</div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA */}
      <section
        style={{
          ...styles.section,
          background: "#1C1917",
          textAlign: "center" as const,
        }}
      >
        <div style={styles.sectionInner}>
          <h2
            style={{
              ...styles.sectionTitle,
              fontSize: 40,
              lineHeight: 1.2,
            }}
          >
            Your Gymnop&eacute;die moment<br />is one night away.
          </h2>
          <p
            style={{
              ...styles.sectionSub,
              maxWidth: 480,
              margin: "0 auto 32px",
            }}
          >
            Free to start. No credit card. 23 lessons from zero to reading real
            sheet music.
          </p>
          <a href="/login/" onClick={(e) => go(e, "/login/")} style={{ ...styles.primaryBtn, fontSize: 17, padding: "16px 48px" }}>
            Start learning now
          </a>
        </div>
      </section>

      {/* Footer */}
      <footer style={styles.footer} className="landing-footer">
        <span style={styles.footerLogo}>Sonata</span>
        <div style={{ display: 'flex', gap: 16, alignItems: 'center' }}>
          <a href="/terms/" onClick={(e) => go(e, "/terms/")} style={styles.footerText}>Terms</a>
          <a href="/privacy/" onClick={(e) => go(e, "/privacy/")} style={styles.footerText}>Privacy</a>
          <span style={styles.footerText}>Built by Adam Morris</span>
        </div>
      </footer>
    </div>
  );
}

// ============================================================
// MOBILE LANDING — Shown when running in Capacitor
// Minimal, single-screen, native-feeling welcome
// ============================================================
function MobileLanding({ ready, router }: { ready: boolean; router: ReturnType<typeof useRouter> }) {
  if (!ready) {
    return (
      <div style={m.page}>
        <div style={m.card}>
          <div style={m.logo}>Sonata</div>
        </div>
      </div>
    );
  }

  return (
    <div style={m.page}>
      <div style={m.card}>
        {/* Brand */}
        <div style={m.brand}>
          <div style={m.logo}>Sonata</div>
          <div style={m.tagline}>Read piano music by distance, not memorisation.</div>
        </div>

        {/* Visual — clean 5-line staff with an ascending/descending phrase */}
        <svg width="220" height="80" viewBox="0 0 220 80" style={m.visual} aria-hidden="true">
          {/* Staff lines */}
          <g stroke="#C8A96E" strokeWidth="1" opacity="0.35" strokeLinecap="round">
            <line x1="10" y1="20" x2="210" y2="20" />
            <line x1="10" y1="30" x2="210" y2="30" />
            <line x1="10" y1="40" x2="210" y2="40" />
            <line x1="10" y1="50" x2="210" y2="50" />
            <line x1="10" y1="60" x2="210" y2="60" />
          </g>
          {/* Note heads — rising then falling phrase (C D E F E D) */}
          <g fill="#C8A96E">
            <ellipse cx="32" cy="55" rx="6" ry="4.5" transform="rotate(-18 32 55)" />
            <ellipse cx="64" cy="50" rx="6" ry="4.5" transform="rotate(-18 64 50)" />
            <ellipse cx="96" cy="45" rx="6" ry="4.5" transform="rotate(-18 96 45)" />
            <ellipse cx="128" cy="40" rx="6" ry="4.5" transform="rotate(-18 128 40)" />
            <ellipse cx="160" cy="45" rx="6" ry="4.5" transform="rotate(-18 160 45)" />
            <ellipse cx="192" cy="50" rx="6" ry="4.5" transform="rotate(-18 192 50)" />
          </g>
          {/* Stems */}
          <g stroke="#C8A96E" strokeWidth="1.5" strokeLinecap="round">
            <line x1="37" y1="53" x2="37" y2="28" />
            <line x1="69" y1="48" x2="69" y2="23" />
            <line x1="101" y1="43" x2="101" y2="18" />
            <line x1="133" y1="38" x2="133" y2="13" />
            <line x1="165" y1="43" x2="165" y2="18" />
            <line x1="197" y1="48" x2="197" y2="23" />
          </g>
        </svg>

        {/* Hero copy */}
        <h1 style={m.heroText}>
          Learn to read sheet music{" "}
          <span style={m.heroAccent}>in days, not years.</span>
        </h1>

        {/* Chips */}
        <div style={m.chips}>
          <div style={m.chip}>23 lessons</div>
          <div style={m.chip}>First 3 free</div>
          <div style={m.chip}>$10/mo premium</div>
        </div>

        {/* CTAs */}
        <div style={m.ctas}>
          <button
            style={m.primaryBtn}
            onClick={() => navigate("/login/?mode=signup", router)}
          >
            Get started
          </button>
          <button
            style={m.secondaryBtn}
            onClick={() => navigate("/login/", router)}
          >
            I already have an account
          </button>
        </div>

        {/* Footer */}
        <div style={m.footer}>
          <button
            type="button"
            style={m.footerLink}
            onClick={() => navigate("/terms/", router)}
          >
            Terms
          </button>
          <span style={m.footerDot}>·</span>
          <button
            type="button"
            style={m.footerLink}
            onClick={() => navigate("/privacy/", router)}
          >
            Privacy
          </button>
        </div>
      </div>
    </div>
  );
}

const m: Record<string, React.CSSProperties> = {
  page: {
    minHeight: "100vh",
    background: "#0C0A09",
    color: "#FAFAF9",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    padding:
      "max(24px, env(safe-area-inset-top)) 20px max(24px, env(safe-area-inset-bottom))",
    fontFamily: "-apple-system, 'SF Pro Text', system-ui, sans-serif",
  },
  card: {
    width: "100%",
    maxWidth: 380,
    display: "flex",
    flexDirection: "column",
    alignItems: "center",
    textAlign: "center",
  },
  brand: {
    display: "flex",
    flexDirection: "column",
    alignItems: "center",
    gap: 8,
  },
  logo: {
    fontFamily: "ui-serif, 'New York', Georgia, serif",
    fontSize: 42,
    fontWeight: 400,
    color: "#C8A96E",
    letterSpacing: "-0.02em",
    lineHeight: 1,
  },
  tagline: {
    fontSize: 13,
    color: "#78716C",
    maxWidth: 260,
    lineHeight: 1.5,
  },
  visual: {
    display: "block",
    margin: "28px 0 20px",
    opacity: 0.9,
  },
  heroText: {
    fontFamily: "ui-serif, 'New York', Georgia, serif",
    fontSize: 26,
    fontWeight: 400,
    lineHeight: 1.25,
    letterSpacing: "-0.015em",
    margin: "0 0 20px",
    color: "#FAFAF9",
  },
  heroAccent: {
    color: "#C8A96E",
  },
  chips: {
    display: "flex",
    gap: 6,
    flexWrap: "wrap",
    justifyContent: "center",
    marginBottom: 28,
  },
  chip: {
    fontSize: 11,
    color: "#A8A29E",
    padding: "6px 12px",
    borderRadius: 20,
    border: "1px solid #292524",
    background: "rgba(28, 25, 23, 0.6)",
    whiteSpace: "nowrap",
  },
  ctas: {
    display: "flex",
    flexDirection: "column",
    gap: 10,
    width: "100%",
    marginBottom: 20,
  },
  primaryBtn: {
    padding: "16px 24px",
    background: "#C8A96E",
    color: "#0C0A09",
    border: "none",
    borderRadius: 12,
    fontSize: 16,
    fontWeight: 600,
    cursor: "pointer",
    fontFamily: "inherit",
    WebkitTapHighlightColor: "transparent",
  },
  secondaryBtn: {
    padding: "14px 24px",
    background: "transparent",
    color: "#A8A29E",
    border: "1px solid #292524",
    borderRadius: 12,
    fontSize: 14,
    fontWeight: 400,
    cursor: "pointer",
    fontFamily: "inherit",
    WebkitTapHighlightColor: "transparent",
  },
  footer: {
    display: "flex",
    alignItems: "center",
    gap: 8,
  },
  footerLink: {
    color: "#44403C",
    fontSize: 12,
    textDecoration: "none",
    background: "none",
    border: "none",
    padding: 4,
    cursor: "pointer",
    fontFamily: "inherit",
  },
  footerDot: {
    color: "#44403C",
    fontSize: 12,
  },
};

const styles: Record<string, React.CSSProperties> = {
  page: {
    background: "#0C0A09",
    color: "#FAFAF9",
    fontFamily: "'Outfit', system-ui, -apple-system, sans-serif",
    fontWeight: 300,
    lineHeight: 1.6,
    overflowX: "hidden",
    position: "relative",
  },
  nav: {
    position: "fixed",
    top: 0,
    left: 0,
    right: 0,
    zIndex: 100,
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    padding: "16px 32px",
    background: "rgba(12,10,9,0.85)",
    backdropFilter: "blur(12px)",
    borderBottom: "1px solid rgba(200,169,110,0.08)",
  },
  navLogo: {
    fontFamily: "'Instrument Serif', Georgia, serif",
    fontSize: 22,
    color: "#C8A96E",
  },
  navLinks: {
    display: "flex",
    alignItems: "center",
    gap: 28,
  },
  navLink: {
    color: "#78716C",
    textDecoration: "none",
    fontSize: 13,
    fontWeight: 400,
    transition: "color 0.2s",
  },
  navCta: {
    color: "#0C0A09",
    background: "#C8A96E",
    textDecoration: "none",
    fontSize: 13,
    fontWeight: 500,
    padding: "8px 20px",
    borderRadius: 8,
  },
  hero: {
    position: "relative",
    display: "flex",
    flexDirection: "column",
    alignItems: "center",
    textAlign: "center",
    padding: "160px 24px 120px",
    maxWidth: 800,
    margin: "0 auto",
    zIndex: 1,
  },
  heroBadge: {
    fontSize: 11,
    textTransform: "uppercase" as const,
    letterSpacing: "0.12em",
    color: "#C8A96E",
    border: "1px solid rgba(200,169,110,0.3)",
    borderRadius: 20,
    padding: "5px 16px",
    marginBottom: 24,
    fontWeight: 500,
  },
  heroTitle: {
    fontFamily: "'Instrument Serif', Georgia, serif",
    fontSize: 56,
    fontWeight: 400,
    lineHeight: 1.15,
    letterSpacing: "-0.02em",
    marginBottom: 20,
  },
  heroAccent: {
    color: "#C8A96E",
  },
  heroSub: {
    fontSize: 17,
    color: "#A8A29E",
    maxWidth: 560,
    lineHeight: 1.8,
    marginBottom: 36,
  },
  heroButtons: {
    display: "flex",
    gap: 12,
    flexWrap: "wrap",
    justifyContent: "center",
  },
  primaryBtn: {
    display: "inline-block",
    padding: "14px 36px",
    background: "#C8A96E",
    color: "#0C0A09",
    borderRadius: 10,
    textDecoration: "none",
    fontSize: 15,
    fontWeight: 500,
    fontFamily: "'Outfit', system-ui, sans-serif",
    transition: "all 0.2s",
  },
  ghostBtn: {
    display: "inline-block",
    padding: "14px 36px",
    background: "transparent",
    color: "#A8A29E",
    border: "1px solid #292524",
    borderRadius: 10,
    textDecoration: "none",
    fontSize: 15,
    fontWeight: 400,
    fontFamily: "'Outfit', system-ui, sans-serif",
  },
  staffLines: {
    position: "absolute",
    bottom: -20,
    left: "50%",
    transform: "translateX(-50%)",
    width: 300,
    display: "flex",
    flexDirection: "column",
    gap: 8,
    opacity: 0.06,
    pointerEvents: "none",
  },
  staffLine: {
    height: 1,
    background: "#C8A96E",
    borderRadius: 1,
  },
  section: {
    padding: "80px 24px",
  },
  sectionInner: {
    maxWidth: 960,
    margin: "0 auto",
  },
  sectionTitle: {
    fontFamily: "'Instrument Serif', Georgia, serif",
    fontSize: 32,
    fontWeight: 400,
    textAlign: "center" as const,
    marginBottom: 12,
    letterSpacing: "-0.02em",
  },
  sectionSub: {
    fontSize: 15,
    color: "#78716C",
    textAlign: "center" as const,
    marginBottom: 48,
    fontWeight: 300,
  },
  lede: {
    fontFamily: "'Instrument Serif', Georgia, serif",
    fontSize: 28,
    fontWeight: 400,
    textAlign: "center" as const,
    color: "#A8A29E",
    marginBottom: 40,
  },
  twoCol: {
    display: "grid",
    gridTemplateColumns: "1fr 1fr",
    gap: 16,
  },
  problemCard: {
    padding: "32px 28px",
    background: "#1C1917",
    border: "1px solid #292524",
    borderRadius: 14,
  },
  solutionCard: {
    borderColor: "rgba(200,169,110,0.2)",
    background:
      "linear-gradient(135deg, rgba(200,169,110,0.04) 0%, #1C1917 60%)",
  },
  problemIcon: {
    fontSize: 20,
    color: "#F87171",
    marginBottom: 12,
  },
  problemTitle: {
    fontSize: 16,
    fontWeight: 500,
    marginBottom: 8,
  },
  problemText: {
    fontSize: 14,
    color: "#A8A29E",
    lineHeight: 1.7,
  },
  threeCol: {
    display: "grid",
    gridTemplateColumns: "1fr 1fr 1fr",
    gap: 16,
  },
  methodCard: {
    padding: "28px 24px",
    background: "#0C0A09",
    border: "1px solid #292524",
    borderRadius: 14,
  },
  methodNum: {
    fontFamily: "'Instrument Serif', Georgia, serif",
    fontSize: 32,
    color: "#C8A96E",
    marginBottom: 8,
  },
  methodTitle: {
    fontSize: 15,
    fontWeight: 500,
    marginBottom: 8,
  },
  methodText: {
    fontSize: 13,
    color: "#A8A29E",
    lineHeight: 1.7,
  },
  story: {
    padding: "40px 0",
  },
  storyP: {
    fontSize: 16,
    color: "#A8A29E",
    lineHeight: 1.9,
    marginBottom: 24,
  },
  storyHighlight: {
    fontFamily: "'Instrument Serif', Georgia, serif",
    fontSize: 24,
    color: "#C8A96E",
    lineHeight: 1.5,
    margin: "32px 0",
    textAlign: "center" as const,
  },
  storySign: {
    fontFamily: "'Instrument Serif', Georgia, serif",
    fontSize: 18,
    fontStyle: "italic" as const,
    color: "#78716C",
    marginTop: 40,
  },
  featureGrid: {
    display: "grid",
    gridTemplateColumns: "1fr 1fr 1fr",
    gap: 16,
  },
  featureCard: {
    padding: "28px 24px",
    background: "#0C0A09",
    border: "1px solid #292524",
    borderRadius: 14,
  },
  featureIcon: {
    fontFamily: "'Instrument Serif', Georgia, serif",
    fontSize: 24,
    color: "#C8A96E",
    marginBottom: 12,
  },
  featureTitle: {
    fontSize: 15,
    fontWeight: 500,
    marginBottom: 6,
  },
  featureDesc: {
    fontSize: 13,
    color: "#78716C",
    lineHeight: 1.7,
  },
  journey: {
    display: "flex",
    flexDirection: "column",
    gap: 0,
    maxWidth: 520,
    margin: "0 auto",
    position: "relative",
  },
  journeyRow: {
    display: "flex",
    gap: 20,
    alignItems: "flex-start",
    position: "relative",
    paddingBottom: 32,
    paddingLeft: 6,
  },
  journeyDot: {
    width: 12,
    height: 12,
    borderRadius: "50%",
    flexShrink: 0,
    marginTop: 4,
  },
  journeyContent: {
    flex: 1,
  },
  journeyNum: {
    fontSize: 11,
    color: "#78716C",
    textTransform: "uppercase" as const,
    letterSpacing: "0.08em",
    fontWeight: 500,
  },
  journeyLabel: {
    fontSize: 16,
    fontWeight: 500,
    marginTop: 2,
  },
  journeyPieces: {
    fontSize: 13,
    color: "#78716C",
    marginTop: 4,
    fontStyle: "italic" as const,
  },
  footer: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    padding: "24px 32px",
    borderTop: "1px solid #292524",
  },
  footerLogo: {
    fontFamily: "'Instrument Serif', Georgia, serif",
    fontSize: 18,
    color: "#C8A96E",
  },
  footerText: {
    fontSize: 12,
    color: "#44403C",
  },
  previewGrid: {
    display: "grid",
    gridTemplateColumns: "1fr 1fr",
    gap: 16,
  },
  previewCard: {
    padding: "24px 20px",
    background: "#0C0A09",
    border: "1px solid #292524",
    borderRadius: 14,
  },
  previewMockup: {
    padding: "20px 16px",
    background: "#1C1917",
    borderRadius: 10,
    marginBottom: 16,
    minHeight: 120,
  },
  previewLabel: {
    fontSize: 15,
    fontWeight: 500,
    marginBottom: 4,
  },
  previewDesc: {
    fontSize: 13,
    color: "#78716C",
    lineHeight: 1.6,
  },
};

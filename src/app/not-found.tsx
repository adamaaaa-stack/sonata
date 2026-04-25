import Link from "next/link";
import "./app/sonata.css";

export default function NotFound() {
  return (
    <div style={{
      minHeight: '100vh', background: 'var(--cream)', color: 'var(--ink)',
      display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
      fontFamily: 'var(--sans)', padding: 24, textAlign: 'center',
    }}>
      <div style={{ fontSize: 60, marginBottom: 10 }}>😵‍💫</div>
      <div style={{ fontFamily: 'var(--serif)', fontStyle: 'italic', fontSize: 96, fontWeight: 900, color: 'var(--ink)', letterSpacing: '-0.04em', lineHeight: 0.9 }}>
        4<span style={{ color: 'var(--berry)' }}>0</span>4
      </div>
      <p style={{ color: 'var(--ink2)', fontSize: 17, margin: '12px 0 24px', fontFamily: 'var(--serif)', fontStyle: 'italic', fontWeight: 500 }}>
        This page doesn&apos;t exist.
      </p>
      <Link href="/" style={{
        display: 'inline-flex', alignItems: 'center', gap: 10,
        padding: '16px 32px',
        background: 'var(--berry)', color: 'var(--cream)',
        border: '3px solid var(--ink)', borderRadius: 'var(--r2)',
        boxShadow: '0 6px 0 var(--berry-deep)',
        textDecoration: 'none', fontSize: 16, fontWeight: 800,
        fontFamily: 'var(--sans)', textTransform: 'uppercase', letterSpacing: '0.04em',
      }}>
        ← Go home
      </Link>
    </div>
  );
}

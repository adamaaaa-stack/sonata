import Link from "next/link";

export default function NotFound() {
  return (
    <div style={{
      minHeight: '100vh', background: '#0C0A09', color: '#FAFAF9',
      display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
      fontFamily: "'Outfit', system-ui, sans-serif", padding: 24,
    }}>
      <div style={{ fontFamily: "'Instrument Serif', Georgia, serif", fontSize: 48, color: '#C8A96E', marginBottom: 8 }}>
        404
      </div>
      <p style={{ color: '#78716C', fontSize: 15, marginBottom: 24 }}>
        This page doesn&apos;t exist.
      </p>
      <Link href="/" style={{
        padding: '12px 28px', background: '#C8A96E', color: '#0C0A09',
        borderRadius: 10, textDecoration: 'none', fontSize: 14, fontWeight: 500,
      }}>
        Go home
      </Link>
    </div>
  );
}

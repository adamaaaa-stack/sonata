// ============================================================
// Sonata v2 Design System — shared atoms
// Chunky Duolingo-meets-music visual language.
// All colors come from --tokens in sonata.css (not hardcoded).
// ============================================================
import React from 'react';

// ------------------------------------------------------------
// Color map — mirrors the CSS custom properties so we can pick
// deep shadows automatically when a caller passes a base color.
// ------------------------------------------------------------
const COLORS = {
  gold:   { base: 'var(--gold)',   deep: 'var(--gold-deep)'  },
  coral:  { base: 'var(--coral)',  deep: 'var(--coral-deep)' },
  mint:   { base: 'var(--mint)',   deep: 'var(--mint-deep)'  },
  sky:    { base: 'var(--sky)',    deep: 'var(--sky-deep)'   },
  lilac:  { base: 'var(--lilac)',  deep: 'var(--lilac-deep)' },
  berry:  { base: 'var(--berry)',  deep: 'var(--berry-deep)' },
  peach:  { base: 'var(--peach)',  deep: 'var(--peach-deep)' },
  cream:  { base: 'var(--cream)',  deep: 'var(--ink)'        },
  paper:  { base: 'var(--paper)',  deep: 'var(--ink)'        },
  ink:    { base: 'var(--ink)',    deep: 'var(--ink2)'       },
} as const;

export type ChunkyColor = keyof typeof COLORS;

// ------------------------------------------------------------
// ChunkyButton — the primary CTA
// ------------------------------------------------------------
export function ChunkyButton({
  children,
  color = 'gold',
  textColor,
  size = 'md',
  icon,
  onClick,
  disabled,
  style,
  type = 'button',
  ariaLabel,
}: {
  children?: React.ReactNode;
  color?: ChunkyColor;
  textColor?: string;
  size?: 'sm' | 'md' | 'lg' | 'xl';
  icon?: React.ReactNode;
  onClick?: () => void;
  disabled?: boolean;
  style?: React.CSSProperties;
  type?: 'button' | 'submit';
  ariaLabel?: string;
}) {
  const c = COLORS[color];
  const pad =
    size === 'xl' ? '22px 44px' :
    size === 'lg' ? '18px 32px' :
    size === 'sm' ? '10px 18px' :
    '14px 26px';
  const fs = size === 'xl' ? 20 : size === 'lg' ? 18 : size === 'sm' ? 14 : 16;
  // Default text color: ink on light backgrounds, cream on dark ones
  const txt = textColor ?? (color === 'berry' || color === 'ink' || color === 'coral' ? 'var(--cream)' : 'var(--ink)');

  return (
    <button
      type={type}
      onClick={onClick}
      disabled={disabled}
      aria-label={ariaLabel}
      className="sn-btn sn-chunky"
      style={{
        padding: pad,
        fontSize: fs,
        fontWeight: 800,
        background: c.base,
        color: txt,
        borderRadius: 'var(--r2)',
        opacity: disabled ? 0.5 : 1,
        // CSS custom prop consumed by .sn-btn / .sn-chunky
        ['--shadow' as string]: c.deep,
        ...style,
      }}
    >
      {icon}
      {children}
    </button>
  );
}

// ------------------------------------------------------------
// Sticker — tiny rotated label badge
// ------------------------------------------------------------
export function Sticker({
  children,
  color = 'peach',
  rotate = -2,
  textColor,
  style,
}: {
  children: React.ReactNode;
  color?: ChunkyColor;
  rotate?: number;
  textColor?: string;
  style?: React.CSSProperties;
}) {
  const c = COLORS[color];
  const txt = textColor ?? (color === 'berry' || color === 'ink' || color === 'coral' ? 'var(--cream)' : 'var(--ink)');
  return (
    <span
      style={{
        display: 'inline-block',
        padding: '6px 14px',
        background: c.base,
        color: txt,
        border: '2.5px solid var(--ink)',
        borderRadius: 999,
        fontWeight: 800,
        fontSize: 13,
        fontFamily: 'var(--sans)',
        textTransform: 'uppercase',
        letterSpacing: '0.06em',
        transform: `rotate(${rotate}deg)`,
        boxShadow: '0 3px 0 var(--ink)',
        ...style,
      }}
    >
      {children}
    </span>
  );
}

// ------------------------------------------------------------
// StaffBG — repeating 5-line staff pattern layered at low opacity
// ------------------------------------------------------------
export function StaffBG({
  opacity = 0.3,
  style,
}: { opacity?: number; style?: React.CSSProperties }) {
  return (
    <div
      className="sn-staff-bg"
      aria-hidden="true"
      style={{
        position: 'absolute',
        inset: 0,
        opacity,
        pointerEvents: 'none',
        zIndex: 0,
        ...style,
      }}
    />
  );
}

// ------------------------------------------------------------
// FloatingNotes — ambient glyphs drifting in the background
// ------------------------------------------------------------
export function FloatingNotes({ count = 6 }: { count?: number }) {
  const glyphs = ['♪', '♫', '♬', '♩', '𝄞'];
  const colors = ['var(--gold)', 'var(--coral)', 'var(--sky)', 'var(--lilac)', 'var(--mint)', 'var(--berry)'];
  return (
    <div
      aria-hidden="true"
      style={{ position: 'absolute', inset: 0, pointerEvents: 'none', overflow: 'hidden', zIndex: 0 }}
    >
      {Array.from({ length: count }).map((_, i) => (
        <span
          key={i}
          style={{
            position: 'absolute',
            left: `${(i * 17 + 7) % 95}%`,
            top: `${(i * 23 + 5) % 90}%`,
            fontSize: 20 + ((i * 7) % 24),
            color: colors[i % colors.length],
            opacity: 0.35,
            fontFamily: 'var(--serif)',
            animation: `sn-float-slow ${5 + (i % 5)}s ease-in-out infinite ${i * 0.4}s`,
          }}
        >
          {glyphs[i % glyphs.length]}
        </span>
      ))}
    </div>
  );
}

// ------------------------------------------------------------
// StreakFlame — emoji flame + counter pill
// ------------------------------------------------------------
export function StreakFlame({
  count = 0,
  size = 'md',
}: { count?: number; size?: 'md' | 'lg' }) {
  return (
    <div
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        gap: 8,
        padding: size === 'lg' ? '8px 18px' : '4px 12px',
        background: 'var(--coral)',
        color: 'var(--cream)',
        border: '3px solid var(--ink)',
        borderRadius: 999,
        boxShadow: '0 4px 0 var(--ink)',
        fontFamily: 'var(--sans)',
        fontWeight: 800,
        fontSize: size === 'lg' ? 22 : 16,
      }}
    >
      <span
        aria-hidden="true"
        style={{
          display: 'inline-block',
          animation: 'sn-flame 1.6s ease-in-out infinite',
          fontSize: size === 'lg' ? 28 : 20,
        }}
      >
        🔥
      </span>
      {count}
    </div>
  );
}

// ------------------------------------------------------------
// DotRow — progress pagination for lesson spreads
// ------------------------------------------------------------
export function DotRow({
  total,
  current,
  color = 'gold',
}: { total: number; current: number; color?: ChunkyColor }) {
  const c = COLORS[color];
  return (
    <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
      {Array.from({ length: total }).map((_, i) => (
        <div
          key={i}
          style={{
            width: i === current ? 28 : 10,
            height: 10,
            borderRadius: 999,
            background: i <= current ? c.base : 'var(--parchment)',
            border: '2px solid var(--ink)',
            transition: 'all 0.3s cubic-bezier(0.34, 1.56, 0.64, 1)',
          }}
        />
      ))}
    </div>
  );
}

// ------------------------------------------------------------
// Candle — small flickering candle for ambient decoration
// ------------------------------------------------------------
export function Candle({
  x,
  y,
  size = 24,
}: { x: number | string; y: number | string; size?: number }) {
  return (
    <div
      aria-hidden="true"
      style={{
        position: 'absolute',
        left: x,
        top: y,
        width: size,
        height: size * 2.5,
        pointerEvents: 'none',
      }}
    >
      {/* Stick */}
      <div
        style={{
          position: 'absolute',
          bottom: 0,
          left: '50%',
          transform: 'translateX(-50%)',
          width: size * 0.45,
          height: size * 1.6,
          background: 'linear-gradient(180deg, var(--cream), var(--paper))',
          border: '2px solid var(--ink)',
          borderRadius: 3,
        }}
      />
      {/* Wick */}
      <div
        style={{
          position: 'absolute',
          bottom: size * 1.55,
          left: '50%',
          transform: 'translateX(-50%)',
          width: 2,
          height: size * 0.25,
          background: 'var(--ink)',
        }}
      />
      {/* Flame */}
      <div
        style={{
          position: 'absolute',
          bottom: size * 1.7,
          left: '50%',
          transform: 'translateX(-50%)',
          width: size * 0.35,
          height: size * 0.7,
          borderRadius: '50% 50% 50% 50% / 70% 70% 30% 30%',
          background: 'radial-gradient(ellipse at 50% 70%, var(--gold) 0%, var(--coral) 60%, transparent 100%)',
          animation: 'sn-candle 1.8s ease-in-out infinite',
          filter: 'blur(0.5px)',
        }}
      />
      {/* Halo */}
      <div
        style={{
          position: 'absolute',
          bottom: size * 1.2,
          left: '50%',
          transform: 'translateX(-50%)',
          width: size * 2.5,
          height: size * 2.5,
          borderRadius: '50%',
          background: 'radial-gradient(circle, rgba(232,169,60,0.22) 0%, transparent 60%)',
          animation: 'sn-candle 1.8s ease-in-out infinite',
        }}
      />
    </div>
  );
}

// ------------------------------------------------------------
// ChunkyCard — generic surface for menu tiles, stats, etc.
// ------------------------------------------------------------
export function ChunkyCard({
  children,
  color = 'cream',
  padding = 20,
  onClick,
  style,
  className,
}: {
  children: React.ReactNode;
  color?: ChunkyColor;
  padding?: number | string;
  onClick?: () => void;
  style?: React.CSSProperties;
  className?: string;
}) {
  const c = COLORS[color];
  const isInteractive = !!onClick;
  return (
    <div
      className={`sn-chunky${isInteractive ? ' sn-btn' : ''} ${className ?? ''}`}
      onClick={onClick}
      role={isInteractive ? 'button' : undefined}
      tabIndex={isInteractive ? 0 : undefined}
      style={{
        background: c.base,
        border: '3px solid var(--ink)',
        borderRadius: 'var(--r2)',
        padding,
        cursor: isInteractive ? 'pointer' : undefined,
        ['--shadow' as string]: c.deep,
        ...style,
      }}
    >
      {children}
    </div>
  );
}

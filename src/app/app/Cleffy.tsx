// ============================================================
// Cleffy v2 — character-forward mascot
// Stylized treble clef with face, cheeks, and chunky ink outline.
// Moods: happy, excited, dancing, shocked, sleepy, thinking, waving, sad
// ============================================================
import React from 'react';

export type CleffyMood =
  | 'happy'
  | 'excited'
  | 'dancing'
  | 'shocked'
  | 'sleepy'
  | 'thinking'
  | 'waving'
  | 'sad'
  | 'idle'      // legacy alias → happy
  | 'celebrating'; // legacy alias → excited

interface CleffyProps {
  size?: number;
  mood?: CleffyMood;
  color?: string;
  shadow?: string;
  className?: string;
}

// Colors come from design tokens; fallback hex values match --gold / --gold-deep
const INK = '#2A1E14';
const INK_DEEP = '#1A1209';
const DEFAULT_GOLD = '#E8A93C';
const DEFAULT_GOLD_DEEP = '#B37A14';
const GOLD_LITE = '#FFD987';
const CORAL = '#FF6B6B';
const BERRY = '#E84F8C';
const SKY = '#4FB4FF';

export function Cleffy({
  size = 120,
  mood = 'happy',
  color = DEFAULT_GOLD,
  shadow = DEFAULT_GOLD_DEEP,
  className,
}: CleffyProps) {
  // Normalize legacy moods
  const m = mood === 'idle' ? 'happy' : mood === 'celebrating' ? 'excited' : mood;

  const isExcited = m === 'excited';
  const isDancing = m === 'dancing';
  const isShocked = m === 'shocked';
  const isSleepy = m === 'sleepy';
  const isThinking = m === 'thinking';
  const isWaving = m === 'waving';
  const isSad = m === 'sad';
  const isHappy = m === 'happy' || isExcited || isDancing || isWaving;

  const anim =
    isExcited || isDancing
      ? 'sn-bounce 0.8s cubic-bezier(.34,1.56,.64,1) infinite'
      : isShocked
      ? 'sn-wiggle 0.3s ease-in-out 3'
      : 'sn-breathe 3s ease-in-out infinite';

  // Unique ids per color to avoid SVG id collisions
  const uid = React.useId();
  const glowId = `cf-glow-${uid}`;
  const bodyId = `cf-body-${uid}`;
  const shineId = `cf-shine-${uid}`;

  return (
    <div
      className={className}
      style={{
        width: size,
        height: size * 1.33,
        display: 'inline-block',
        position: 'relative',
        animation: anim,
      }}
      aria-hidden="true"
    >
      <svg
        width={size}
        height={size * 1.33}
        viewBox="0 0 120 160"
        style={{ overflow: 'visible' }}
      >
        <defs>
          <radialGradient id={glowId} cx="50%" cy="55%">
            <stop offset="0%" stopColor={color} stopOpacity="0.4" />
            <stop offset="100%" stopColor={color} stopOpacity="0" />
          </radialGradient>
          <linearGradient id={bodyId} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor={GOLD_LITE} />
            <stop offset="50%" stopColor={color} />
            <stop offset="100%" stopColor={shadow} />
          </linearGradient>
          <linearGradient id={shineId} x1="0" y1="0" x2="1" y2="1">
            <stop offset="0%" stopColor="#fff" stopOpacity="0.6" />
            <stop offset="100%" stopColor="#fff" stopOpacity="0" />
          </linearGradient>
        </defs>

        {/* Soft glow behind */}
        <ellipse cx="60" cy="85" rx="58" ry="72" fill={`url(#${glowId})`} />

        {/* Dark outline layer for chunky look */}
        <g>
          <path
            d="M 60 12 C 78 12, 88 28, 85 48 C 82 68, 55 78, 42 70 C 30 61, 34 42, 50 40 C 62 39, 68 50, 65 58"
            fill="none" stroke={INK} strokeWidth="16" strokeLinecap="round" strokeLinejoin="round"
          />
          <path
            d="M 60 18 L 60 112 C 60 128, 50 134, 42 131 C 34 128, 35 118, 45 117"
            fill="none" stroke={INK} strokeWidth="16" strokeLinecap="round" strokeLinejoin="round"
          />
          <circle cx="53" cy="136" r="9" fill={INK} />
        </g>

        {/* Gold body */}
        <g>
          <path
            d="M 60 12 C 78 12, 88 28, 85 48 C 82 68, 55 78, 42 70 C 30 61, 34 42, 50 40 C 62 39, 68 50, 65 58"
            fill="none" stroke={`url(#${bodyId})`} strokeWidth="11" strokeLinecap="round" strokeLinejoin="round"
          />
          <path
            d="M 60 18 L 60 112 C 60 128, 50 134, 42 131 C 34 128, 35 118, 45 117"
            fill="none" stroke={`url(#${bodyId})`} strokeWidth="11" strokeLinecap="round" strokeLinejoin="round"
          />
          <circle cx="53" cy="136" r="6.5" fill={`url(#${bodyId})`} />

          {/* Top shine */}
          <path
            d="M 62 16 C 74 16, 82 28, 80 42"
            fill="none" stroke={`url(#${shineId})`} strokeWidth="3" strokeLinecap="round"
          />
        </g>

        {/* Waving arm when mood=waving */}
        {isWaving && (
          <g style={{ animation: 'sn-wiggle 0.8s ease-in-out infinite', transformOrigin: '90px 60px' }}>
            <line x1="82" y1="52" x2="100" y2="38" stroke={INK} strokeWidth="8" strokeLinecap="round" />
            <line x1="82" y1="52" x2="100" y2="38" stroke={`url(#${bodyId})`} strokeWidth="5" strokeLinecap="round" />
            <circle cx="102" cy="36" r="6" fill={INK} />
            <circle cx="102" cy="36" r="4" fill={`url(#${bodyId})`} />
          </g>
        )}

        {/* Face */}
        <g>
          {/* Eyes */}
          {isSleepy ? (
            <>
              <path d="M 46 70 Q 52 74, 58 70" fill="none" stroke={INK} strokeWidth="3" strokeLinecap="round" />
              <path d="M 64 70 Q 70 74, 76 70" fill="none" stroke={INK} strokeWidth="3" strokeLinecap="round" />
            </>
          ) : isExcited || isDancing ? (
            <>
              <g transform="translate(51, 68)">
                <path d="M 0 -6 L 1.5 -1.5 L 6 -1 L 2.5 2 L 4 6 L 0 3.5 L -4 6 L -2.5 2 L -6 -1 L -1.5 -1.5 Z" fill={INK} />
              </g>
              <g transform="translate(71, 68)">
                <path d="M 0 -6 L 1.5 -1.5 L 6 -1 L 2.5 2 L 4 6 L 0 3.5 L -4 6 L -2.5 2 L -6 -1 L -1.5 -1.5 Z" fill={INK} />
              </g>
            </>
          ) : isShocked ? (
            <>
              <circle cx="51" cy="68" r="5" fill="#fff" stroke={INK} strokeWidth="1.5" />
              <circle cx="51" cy="68" r="2.5" fill={INK} />
              <circle cx="71" cy="68" r="5" fill="#fff" stroke={INK} strokeWidth="1.5" />
              <circle cx="71" cy="68" r="2.5" fill={INK} />
            </>
          ) : isThinking ? (
            <>
              <circle cx="51" cy="68" r="3.5" fill={INK} />
              <path d="M 66 65 Q 71 62, 76 65" fill="none" stroke={INK} strokeWidth="2.5" strokeLinecap="round" />
            </>
          ) : (
            <g style={{ animation: 'sn-blink 5s ease-in-out infinite', transformOrigin: '60px 68px' }}>
              <circle cx="51" cy="68" r="3.8" fill={INK} />
              <circle cx="71" cy="68" r="3.8" fill={INK} />
              <circle cx="52" cy="66.5" r="1.2" fill="#fff" />
              <circle cx="72" cy="66.5" r="1.2" fill="#fff" />
            </g>
          )}

          {/* Mouth */}
          {isShocked ? (
            <ellipse cx="61" cy="80" rx="3.5" ry="4.5" fill={INK} />
          ) : isSad ? (
            <path d="M 54 82 Q 61 76, 68 82" fill="none" stroke={INK} strokeWidth="2.5" strokeLinecap="round" />
          ) : isThinking ? (
            <path d="M 55 80 L 65 80" fill="none" stroke={INK} strokeWidth="2.5" strokeLinecap="round" />
          ) : isSleepy ? (
            <path d="M 56 80 Q 61 78, 66 80" fill="none" stroke={INK} strokeWidth="2" strokeLinecap="round" />
          ) : isHappy ? (
            <path
              d="M 52 78 Q 61 88, 70 78 Q 65 82, 61 82 Q 57 82, 52 78 Z"
              fill={CORAL}
              stroke={INK}
              strokeWidth="2.5"
              strokeLinejoin="round"
            />
          ) : (
            <path d="M 55 79 Q 61 84, 67 79" fill="none" stroke={INK} strokeWidth="2.8" strokeLinecap="round" />
          )}

          {/* Cheeks */}
          <ellipse cx="44" cy="77" rx="4" ry="2.8" fill={CORAL} opacity="0.65" />
          <ellipse cx="78" cy="77" rx="4" ry="2.8" fill={CORAL} opacity="0.65" />
        </g>

        {/* Dancing notes */}
        {isDancing && (
          <>
            <text x="14" y="40" fontSize="20" fill={BERRY} style={{ animation: 'sn-float 1.2s ease-in-out infinite' }}>♪</text>
            <text x="98" y="30" fontSize="22" fill={SKY} style={{ animation: 'sn-float 1.5s ease-in-out infinite .3s' }}>♫</text>
          </>
        )}

        {/* Zzz when sleepy */}
        {isSleepy && (
          <g>
            <text x="88" y="40" fontSize="18" fill={color} fontFamily="Georgia, serif" fontStyle="italic" style={{ animation: 'sn-pulse 2s ease-in-out infinite' }}>z</text>
            <text x="98" y="26" fontSize="14" fill={color} fontFamily="Georgia, serif" fontStyle="italic" style={{ animation: 'sn-pulse 2s ease-in-out infinite .5s' }}>z</text>
          </g>
        )}
      </svg>
      {/* Suppress unused warning */}
      {INK_DEEP && null}
    </div>
  );
}

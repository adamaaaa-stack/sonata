// ============================================================
// Cleffy — the Sonata mascot. A treble clef with a face.
// Eyes blink, the body has a gentle breathing motion,
// and mood changes his expression.
// ============================================================
import React from 'react';

export type CleffyMood = 'idle' | 'happy' | 'excited' | 'thinking' | 'sleepy' | 'waving';

interface CleffyProps {
  size?: number;
  mood?: CleffyMood;
  className?: string;
}

export function Cleffy({ size = 120, mood = 'idle', className }: CleffyProps) {
  const isExcited = mood === 'excited';
  const isHappy = mood === 'happy' || mood === 'excited' || mood === 'waving';
  const isSleepy = mood === 'sleepy';
  const isThinking = mood === 'thinking';

  return (
    <div className={`cleffy-wrap ${isExcited ? 'cleffy-bounce' : 'cleffy-breathe'} ${className || ''}`}
      style={{ width: size, height: size, display: 'inline-block', position: 'relative' }}>
      <svg width={size} height={size} viewBox="0 0 120 160" style={{ overflow: 'visible' }}>
        {/* Soft glow behind Cleffy */}
        <defs>
          <radialGradient id="cleffy-glow" cx="50%" cy="50%">
            <stop offset="0%" stopColor="#C8A96E" stopOpacity="0.35" />
            <stop offset="100%" stopColor="#C8A96E" stopOpacity="0" />
          </radialGradient>
          <linearGradient id="cleffy-gold" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#F0D89B" />
            <stop offset="55%" stopColor="#C8A96E" />
            <stop offset="100%" stopColor="#8F7333" />
          </linearGradient>
        </defs>

        <ellipse cx="60" cy="80" rx="55" ry="70" fill="url(#cleffy-glow)" />

        {/* Treble clef body — stylized, slightly chubby for friendliness */}
        <g>
          {/* Main curl — top spiral */}
          <path
            d="M 60 15
               C 75 15, 85 30, 82 48
               C 79 66, 55 75, 45 68
               C 35 61, 38 45, 52 42
               C 62 40, 68 50, 65 58"
            fill="none"
            stroke="url(#cleffy-gold)"
            strokeWidth="10"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
          {/* Vertical stem curving down */}
          <path
            d="M 60 20
               L 60 110
               C 60 125, 52 130, 45 128
               C 38 126, 38 118, 46 116"
            fill="none"
            stroke="url(#cleffy-gold)"
            strokeWidth="10"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
          {/* Bottom dot */}
          <circle cx="55" cy="132" r="6" fill="url(#cleffy-gold)" />
        </g>

        {/* Face — eyes live in the belly of the clef */}
        <g className={isSleepy ? '' : 'cleffy-blink'}>
          {isSleepy ? (
            <>
              <path d="M 48 68 Q 54 72, 60 68" fill="none" stroke="#0C0A09" strokeWidth="2.5" strokeLinecap="round" />
              <path d="M 64 68 Q 70 72, 76 68" fill="none" stroke="#0C0A09" strokeWidth="2.5" strokeLinecap="round" />
            </>
          ) : isExcited ? (
            <>
              {/* Star eyes */}
              <g transform="translate(52, 68)">
                <path d="M 0 -4 L 1 -1 L 4 -1 L 1.5 1 L 2.5 4 L 0 2 L -2.5 4 L -1.5 1 L -4 -1 L -1 -1 Z" fill="#0C0A09" />
              </g>
              <g transform="translate(72, 68)">
                <path d="M 0 -4 L 1 -1 L 4 -1 L 1.5 1 L 2.5 4 L 0 2 L -2.5 4 L -1.5 1 L -4 -1 L -1 -1 Z" fill="#0C0A09" />
              </g>
            </>
          ) : (
            <>
              <circle cx="52" cy="68" r="3" fill="#0C0A09" />
              <circle cx="72" cy="68" r="3" fill="#0C0A09" />
              {/* Shine highlights */}
              <circle cx="52.8" cy="67" r="0.8" fill="#FAFAF9" />
              <circle cx="72.8" cy="67" r="0.8" fill="#FAFAF9" />
            </>
          )}
        </g>

        {/* Mouth */}
        {isHappy ? (
          <path d="M 54 76 Q 62 84, 70 76" fill="none" stroke="#0C0A09" strokeWidth="2.5" strokeLinecap="round" />
        ) : isThinking ? (
          <circle cx="62" cy="78" r="1.5" fill="#0C0A09" />
        ) : isSleepy ? (
          <path d="M 56 78 Q 62 76, 68 78" fill="none" stroke="#0C0A09" strokeWidth="2" strokeLinecap="round" />
        ) : (
          <path d="M 56 77 Q 62 82, 68 77" fill="none" stroke="#0C0A09" strokeWidth="2.5" strokeLinecap="round" />
        )}

        {/* Rosy cheeks */}
        <ellipse cx="46" cy="75" rx="3" ry="2" fill="#FF9F7E" opacity="0.55" />
        <ellipse cx="78" cy="75" rx="3" ry="2" fill="#FF9F7E" opacity="0.55" />

        {/* Waving motion — tiny hand (only when waving) */}
        {mood === 'waving' && (
          <g className="cleffy-wave">
            <circle cx="92" cy="60" r="5" fill="url(#cleffy-gold)" />
          </g>
        )}

        {/* Zzz when sleepy */}
        {isSleepy && (
          <g className="cleffy-zzz">
            <text x="85" y="35" fontSize="14" fontFamily="Georgia, serif" fill="#C8A96E" fontWeight="bold">z</text>
            <text x="92" y="25" fontSize="10" fontFamily="Georgia, serif" fill="#C8A96E" fontWeight="bold">z</text>
          </g>
        )}
      </svg>
    </div>
  );
}

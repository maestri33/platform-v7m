import React from 'react';

export type MarqueeVariant = 'yellow' | 'green' | 'ink' | 'gold';

export interface MarqueeProps {
  items: string[];
  variant?: MarqueeVariant;
  /** Segundos por loop (default: 28) */
  speed?: number;
  /** Graus de rotação da faixa (default: 0) */
  tilt?: number;
  className?: string;
  /** Separador customizado (default: losango em CSS) */
  separator?: React.ReactNode;
}

const VARIANT_STYLES: Record<MarqueeVariant, { bg: string; text: string; border?: string }> = {
  yellow: {
    bg: 'var(--yellow, #ffc400)',
    text: 'var(--ink, #0b1220)',
  },
  green: {
    bg: 'var(--green-deep, #005238)',
    text: 'var(--paper, #ffffff)',
  },
  ink: {
    bg: 'var(--ink, #0b1220)',
    text: 'var(--paper, #ffffff)',
    border: '1px solid rgba(255, 255, 255, 0.14)',
  },
  gold: {
    bg: 'var(--char, #141416)',
    text: 'var(--gold, #d9b15a)',
    border: '1px solid rgba(217, 177, 90, 0.25)',
  },
};

/**
 * Faixa de texto em loop contínuo infinito (Zero-JS, CSS puro acelerado por GPU).
 * Acessível: track decorativo marcado com aria-hidden="true" e texto integral legível via .sr-only.
 */
export function Marquee({
  items,
  variant = 'yellow',
  speed = 28,
  tilt = 0,
  className = '',
  separator,
}: MarqueeProps) {
  const styleConfig = VARIANT_STYLES[variant] || VARIANT_STYLES.yellow;
  const copy = [...items, ...items];

  return (
    <div
      className={`v7m-marquee ${className}`.trim()}
      style={{
        overflow: 'clip',
        transform: tilt !== 0 ? `rotate(${tilt}deg)` : undefined,
        paddingBlock: '0.72rem',
        userSelect: 'none',
        background: styleConfig.bg,
        color: styleConfig.text,
        borderBlock: styleConfig.border,
      }}
    >
      <p className="sr-only">{items.join(' · ')}</p>
      <div
        className="v7m-marquee-track"
        aria-hidden="true"
        style={{
          display: 'flex',
          width: 'max-content',
          animation: `v7m-marquee-x ${speed}s linear infinite`,
        }}
      >
        <ul
          style={{
            display: 'flex',
            alignItems: 'center',
            listStyle: 'none',
            margin: 0,
            padding: 0,
            flex: 'none',
          }}
        >
          {copy.map((item, index) => (
            <li
              key={`track1-${index}-${item}`}
              style={{
                display: 'flex',
                alignItems: 'center',
                whiteSpace: 'nowrap',
                fontFamily: 'var(--font-display, inherit)',
                fontSize: '0.92rem',
                letterSpacing: '0.06em',
                textTransform: 'uppercase',
              }}
            >
              {item}
              {separator ?? (
                <span
                  aria-hidden="true"
                  style={{
                    display: 'inline-block',
                    width: '0.45em',
                    height: '0.45em',
                    marginInline: '1.4rem',
                    background: 'currentColor',
                    opacity: 0.55,
                    transform: 'rotate(45deg)',
                    borderRadius: '1.5px',
                  }}
                />
              )}
            </li>
          ))}
        </ul>
        <ul
          style={{
            display: 'flex',
            alignItems: 'center',
            listStyle: 'none',
            margin: 0,
            padding: 0,
            flex: 'none',
          }}
        >
          {copy.map((item, index) => (
            <li
              key={`track2-${index}-${item}`}
              style={{
                display: 'flex',
                alignItems: 'center',
                whiteSpace: 'nowrap',
                fontFamily: 'var(--font-display, inherit)',
                fontSize: '0.92rem',
                letterSpacing: '0.06em',
                textTransform: 'uppercase',
              }}
            >
              {item}
              {separator ?? (
                <span
                  aria-hidden="true"
                  style={{
                    display: 'inline-block',
                    width: '0.45em',
                    height: '0.45em',
                    marginInline: '1.4rem',
                    background: 'currentColor',
                    opacity: 0.55,
                    transform: 'rotate(45deg)',
                    borderRadius: '1.5px',
                  }}
                />
              )}
            </li>
          ))}
        </ul>
      </div>

      <style
        dangerouslySetInnerHTML={{
          __html: `
            @keyframes v7m-marquee-x {
              to { transform: translateX(-50%); }
            }
            @media (prefers-reduced-motion: reduce) {
              .v7m-marquee-track { animation: none !important; }
            }
          `,
        }}
      />
    </div>
  );
}

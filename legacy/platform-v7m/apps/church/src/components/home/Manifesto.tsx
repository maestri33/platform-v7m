import { useRef } from 'react';
import { gsap } from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import { useGSAP } from '@gsap/react';
import { ArrowLink } from '../Buttons';

gsap.registerPlugin(ScrollTrigger, useGSAP);

const WORDS: Array<{ t: string; gold?: boolean }> = [
  { t: 'Juntos,' },
  { t: 'caminhamos,', gold: true },
  { t: 'aprendemos', gold: true },
  { t: 'e' },
  { t: 'servimos,', gold: true },
  { t: 'construindo' },
  { t: 'uma' },
  { t: 'comunidade', gold: true },
  { t: 'viva', gold: true },
  { t: 'e' },
  { t: 'transformadora.', gold: true },
];

/**
 * S2 · Manifesto — seção pinned (150vh). Cada palavra "acende"
 * progressivamente com scrub (scroll-driven storytelling).
 * GSAP isolado neste componente (library isolation).
 */
export default function Manifesto() {
  const sectionRef = useRef<HTMLElement>(null);
  const textRef = useRef<HTMLParagraphElement>(null);
  const metaRef = useRef<HTMLDivElement>(null);

  useGSAP(
    () => {
      if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
      const words = textRef.current?.querySelectorAll('.manifesto-word');
      if (!words || !sectionRef.current) return;

      gsap.set(words, { opacity: 0.12, y: 8 });
      gsap.set(metaRef.current, { opacity: 0, y: 16 });

      gsap
        .timeline({
          scrollTrigger: {
            trigger: sectionRef.current,
            start: 'top top',
            end: '+=150%',
            scrub: 0.8,
            pin: true,
            anticipatePin: 1,
          },
        })
        .to(words, { opacity: 1, y: 0, stagger: 0.08, ease: 'none' })
        .to(metaRef.current, { opacity: 1, y: 0, ease: 'none', duration: 0.4 }, '>-0.2');
    },
    { scope: sectionRef }
  );

  return (
    <section
      ref={sectionRef}
      className="flex min-h-[100dvh] items-center bg-ink-warm"
      aria-label="Nossa identidade"
    >
      <div className="container-brand py-24 text-center">
        <p
          ref={textRef}
          className="mx-auto max-w-[20ch] font-display font-normal text-cream"
          style={{ fontSize: 'clamp(2rem, 5vw, 4rem)', lineHeight: 1.15, letterSpacing: '-0.015em' }}
        >
          {WORDS.map((w, i) => (
            <span key={i} className={`manifesto-word inline-block ${w.gold ? 'text-gold' : ''}`}>
              {w.t}
              {i < WORDS.length - 1 ? ' ' : ''}
            </span>
          ))}
        </p>
        <div ref={metaRef} className="mt-12 flex flex-col items-center gap-5">
          <span className="eyebrow">NOSSA IDENTIDADE</span>
          <ArrowLink to="/sobre">Conheça nossa história</ArrowLink>
        </div>
      </div>
    </section>
  );
}

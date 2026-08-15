import { useRef } from 'react';
import { motion, useInView, useReducedMotion } from 'framer-motion';
import GradientText from '../GradientText';

const EASE_OUT = [0.23, 1, 0.32, 1] as [number, number, number, number];
const GOLD_GRADIENT = ['#B4843C', '#E6D282', '#D2B264', '#F4EFE6'];

// "amor" recebe GradientText dourado — renderizado separadamente
const WORDS_BEFORE = ['Acima', 'de', 'tudo,', 'revistam-se', 'do'];
const WORDS_AFTER = ['.'];

/** S5 · Versículo — Colossenses 3:14 (momento delight) */
export default function VerseSection() {
  const reduce = useReducedMotion();
  const sectionRef = useRef<HTMLElement>(null);
  const inView = useInView(sectionRef, { once: true, amount: 0.3 });
  const amorRef = useRef<HTMLSpanElement>(null);

  const words = [...WORDS_BEFORE, 'amor', ...WORDS_AFTER];
  const lastDelay = (words.length - 1) * 0.06;

  const pulseGlow = () => {
    // Pulso único de glow dourado em "amor" ao completar o verso
    if (reduce || !amorRef.current) return;
    amorRef.current.animate(
      [
        { textShadow: '0 0 0px rgba(230,210,130,0)' },
        { textShadow: '0 0 32px rgba(230,210,130,0.4)' },
        { textShadow: '0 0 0px rgba(230,210,130,0)' },
      ],
      { duration: 1200, easing: 'cubic-bezier(0.23, 1, 0.32, 1)' }
    );
  };

  return (
    <section
      ref={sectionRef}
      className="relative overflow-hidden bg-ink py-[clamp(128px,18vh,200px)]"
      aria-label="Versículo"
    >
      {/* Aspas ornamentais gigantes */}
      <span
        className="pointer-events-none absolute left-1/2 top-8 -translate-x-1/2 select-none font-display text-[16rem] leading-none text-gold-dark opacity-30"
        aria-hidden
      >
        “
      </span>

      <div className="container-brand relative flex flex-col items-center text-center">
        <motion.img
          src="/flame.webp"
          alt=""
          width={20}
          height={32}
          className="h-8 w-auto"
          initial={{ opacity: 0, scale: 0.9 }}
          animate={inView ? { opacity: 1, scale: 1 } : undefined}
          transition={{ duration: reduce ? 0.2 : 0.5, ease: EASE_OUT }}
          aria-hidden
        />

        <blockquote className="fs-verse mt-10 max-w-[24ch] font-display italic text-cream">
          {WORDS_BEFORE.map((w, i) => (
            <span key={w}>
              <motion.span
                className="inline-block"
                initial={{ opacity: 0, transform: 'translateY(16px)', filter: 'blur(6px)' }}
                animate={
                  inView
                    ? { opacity: 1, transform: 'translateY(0px)', filter: 'blur(0px)' }
                    : undefined
                }
                transition={{ duration: reduce ? 0.2 : 0.7, delay: reduce ? 0 : i * 0.06, ease: EASE_OUT }}
              >
                {w}
              </motion.span>{' '}
            </span>
          ))}
          <motion.span
            className="inline-block"
            initial={{ opacity: 0, transform: 'translateY(16px)', filter: 'blur(6px)' }}
            animate={
              inView ? { opacity: 1, transform: 'translateY(0px)', filter: 'blur(0px)' } : undefined
            }
            transition={{
              duration: reduce ? 0.2 : 0.7,
              delay: reduce ? 0 : WORDS_BEFORE.length * 0.06,
              ease: EASE_OUT,
            }}
            onAnimationComplete={() => {
              if (inView) {
                window.setTimeout(pulseGlow, Math.max(0, (lastDelay - WORDS_BEFORE.length * 0.06) * 1000 + 700));
              }
            }}
          >
            <span ref={amorRef} className="inline-block">
              <GradientText
                colors={GOLD_GRADIENT}
                animationSpeed={8}
                className="!mx-0 inline-flex !cursor-text !rounded-none !backdrop-blur-none"
              >
                amor
              </GradientText>
            </span>
          </motion.span>
          <motion.span
            className="inline-block"
            initial={{ opacity: 0, transform: 'translateY(16px)', filter: 'blur(6px)' }}
            animate={
              inView ? { opacity: 1, transform: 'translateY(0px)', filter: 'blur(0px)' } : undefined
            }
            transition={{
              duration: reduce ? 0.2 : 0.7,
              delay: reduce ? 0 : lastDelay,
              ease: EASE_OUT,
            }}
          >
            .
          </motion.span>
        </blockquote>

        <motion.p
          className="eyebrow mt-10"
          initial={{ opacity: 0, transform: 'translateY(12px)' }}
          animate={inView ? { opacity: 1, transform: 'translateY(0px)' } : undefined}
          transition={{ duration: reduce ? 0.2 : 0.5, delay: reduce ? 0 : lastDelay + 0.3, ease: EASE_OUT }}
        >
          — Colossenses 3:14
        </motion.p>
      </div>
    </section>
  );
}

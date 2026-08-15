import { useRef } from 'react';
import { motion, useReducedMotion, useScroll, useTransform } from 'framer-motion';
import BlurText from '../BlurText';
import GradientText from '../GradientText';
import { StarButton, GhostButton } from '../Buttons';

const EASE_OUT = [0.23, 1, 0.32, 1] as [number, number, number, number];
const GOLD_GRADIENT = ['#B4843C', '#E6D282', '#D2B264', '#F4EFE6'];

const STATS = [
  { value: '100%', label: 'família envolvida' },
  { value: 'Jardim Amália', label: 'nosso bairro' },
  { value: 'Em construção', label: 'fé em movimento' },
];

/** S6 · Nova Casa — teaser CTA chama (delight #3) */
export default function NovaCasaTeaser() {
  const reduce = useReducedMotion();
  const sectionRef = useRef<HTMLElement>(null);
  const { scrollYProgress } = useScroll({
    target: sectionRef,
    offset: ['start end', 'end start'],
  });
  const bgY = useTransform(scrollYProgress, [0, 1], ['-8%', '8%']);

  return (
    <section
      ref={sectionRef}
      className="relative flex min-h-[90vh] items-center overflow-hidden"
      aria-label="Projeto Nova Casa"
    >
      {/* Background com parallax (scale 1.1 fixo) */}
      <motion.div className="absolute inset-0 scale-110" style={reduce ? undefined : { y: bgY }} aria-hidden>
        <img
          src="/nova-casa-render.jpg"
          alt=""
          className="h-full w-full object-cover"
          loading="lazy"
        />
      </motion.div>
      <div
        className="absolute inset-0"
        style={{
          background: 'linear-gradient(90deg, rgba(11,11,11,0.95) 20%, rgba(11,11,11,0.55))',
        }}
        aria-hidden
      />

      <div className="container-brand relative z-[1] py-24">
        <div className="max-w-[560px]">
          {/* Único lugar da home além do hero com paleta chama */}
          <BlurText
            text="PROJETO NOVA CASA"
            animateBy="words"
            delay={60}
            stepDuration={0.35}
            easing={EASE_OUT}
            threshold={0.2}
            className="eyebrow !text-flame-amber"
            animationFrom={{ filter: 'blur(6px)', opacity: 0, y: 8 }}
            animationTo={[{ filter: 'blur(0px)', opacity: 1, y: 0 }]}
          />

          <h2 className="fs-h2 mt-5 font-display font-medium text-cream">
            <BlurText
              text="O nosso sonho"
              animateBy="words"
              delay={80}
              stepDuration={0.5}
              easing={EASE_OUT}
              threshold={0.2}
              animationFrom={{ filter: 'blur(10px)', opacity: 0, y: 16 }}
              animationTo={[{ filter: 'blur(0px)', opacity: 1, y: 0 }]}
            />{' '}
            <GradientText
              colors={GOLD_GRADIENT}
              animationSpeed={8}
              className="!mx-0 inline-flex !cursor-text !rounded-none !backdrop-blur-none"
            >
              tomando forma
            </GradientText>
          </h2>

          <motion.p
            className="fs-lead mt-6 text-cream-2"
            initial={{ opacity: 0, transform: 'translateY(24px)' }}
            whileInView={{ opacity: 1, transform: 'translateY(0px)' }}
            viewport={{ once: true, amount: 0.2 }}
            transition={{ duration: reduce ? 0.2 : 0.6, delay: 0.2, ease: EASE_OUT }}
          >
            No coração do Jardim Amália, um novo tempo começa. Fé em movimento, tijolo a tijolo — e
            você faz parte dessa história.
          </motion.p>

          {/* Mini-stats */}
          <div className="mt-10 flex flex-wrap gap-12">
            {STATS.map((s, i) => (
              <motion.div
                key={s.label}
                initial={{ opacity: 0, transform: 'translateY(16px)' }}
                whileInView={{ opacity: 1, transform: 'translateY(0px)' }}
                viewport={{ once: true, amount: 0.2 }}
                transition={{ duration: reduce ? 0.2 : 0.5, delay: 0.3 + i * 0.06, ease: EASE_OUT }}
              >
                <div className="font-display text-2xl font-semibold text-gold">{s.value}</div>
                <div className="mt-1 text-xs uppercase tracking-[0.2em] text-cream-muted">
                  {s.label}
                </div>
              </motion.div>
            ))}
          </div>

          {/* CTAs */}
          <motion.div
            className="mt-10 flex flex-wrap gap-4"
            initial={{ opacity: 0, transform: 'translateY(24px)' }}
            whileInView={{ opacity: 1, transform: 'translateY(0px)' }}
            viewport={{ once: true, amount: 0.2 }}
            transition={{ duration: reduce ? 0.2 : 0.6, delay: 0.5, ease: EASE_OUT }}
          >
            <StarButton to="/nova-casa" starColor="#FAAA0A" sparkColor="#FAAA0A">
              Quero contribuir
            </StarButton>
            <GhostButton to="/nova-casa">Ver o projeto</GhostButton>
          </motion.div>
        </div>
      </div>
    </section>
  );
}

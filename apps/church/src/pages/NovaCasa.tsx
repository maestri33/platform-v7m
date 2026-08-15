import { useEffect, useRef, useState } from 'react';
import type { ReactNode } from 'react';
import {
  AnimatePresence,
  motion,
  useReducedMotion,
  useScroll,
  useTransform,
} from 'framer-motion';
import BlurText from '../components/BlurText';
import GradientText from '../components/GradientText';
import ScrollReveal from '../components/ScrollReveal';
import SplitText from '../components/SplitText';
import SpotlightCard from '../components/SpotlightCard';
import ClickSpark from '../components/ClickSpark';
import StarBorder from '../components/StarBorder';
import SectionHeader from '../components/SectionHeader';
import { PrimaryButton, GhostButton, ArrowLink } from '../components/Buttons';
import TimelineSection from '../components/novacasa/TimelineSection';

const EASE_OUT = [0.23, 1, 0.32, 1] as [number, number, number, number];
const EASE_IN_OUT = [0.77, 0, 0.175, 1] as [number, number, number, number];
const GOLD_GRADIENT = ['#B4843C', '#E6D282', '#D2B264', '#F4EFE6'];

const GALLERY = [
  { src: '/nova-casa-obra-1.jpg', caption: 'Fundação concluída' },
  { src: '/nova-casa-obra-2.jpg', caption: 'Estrutura em andamento' },
  { src: '/nova-casa-obra-3.jpg', caption: 'Mutirão da família' },
];

/** Monta os filhos somente após `ms` — delays exatos do spec de load (S1 hero) */
function Deferred({ ms, children }: { ms: number; children: ReactNode }) {
  const reduce = useReducedMotion();
  const [elapsed, setElapsed] = useState(false);
  useEffect(() => {
    if (reduce || elapsed) return;
    const t = window.setTimeout(() => setElapsed(true), ms);
    return () => window.clearTimeout(t);
  }, [elapsed, ms, reduce]);
  return reduce || elapsed ? <>{children}</> : null;
}

/* ------------------------------------------------------------------ */
/* S1 · Hero — "Fé em movimento" (100vh)                               */
/* ------------------------------------------------------------------ */
function Hero() {
  const reduce = useReducedMotion();
  const heroRef = useRef<HTMLElement>(null);
  const { scrollYProgress } = useScroll({
    target: heroRef,
    offset: ['start start', 'end start'],
  });
  // Parallax de fundo −12% + conteúdo opacity 1→0.3 nos primeiros 50vh
  const bgY = useTransform(scrollYProgress, [0, 1], ['-6%', '6%']);
  const contentOpacity = useTransform(scrollYProgress, [0, 0.5], [1, 0.3]);

  return (
    <section
      ref={heroRef}
      className="relative flex min-h-[100dvh] items-end justify-center overflow-hidden"
      aria-label="Projeto Nova Casa — Fé em movimento"
    >
      {/* Background full-bleed com parallax */}
      <motion.div
        className="absolute inset-0 scale-110"
        style={reduce ? undefined : { y: bgY }}
        aria-hidden
      >
        <img src="/nova-casa-render.jpg" alt="" className="h-full w-full object-cover" />
      </motion.div>
      <div
        className="absolute inset-0"
        style={{
          background:
            'linear-gradient(180deg, rgba(11,11,11,0.45) 0%, rgba(11,11,11,0.9) 90%)',
        }}
        aria-hidden
      />

      <motion.div
        className="container-brand relative z-[1] flex flex-col items-center pb-[clamp(96px,14vh,160px)] pt-32 text-center"
        style={reduce ? undefined : { opacity: contentOpacity }}
      >
        {/* Chama — ícone do projeto */}
        <motion.img
          src="/flame.webp"
          alt=""
          width={56}
          height={56}
          className="h-14 w-auto"
          style={{ filter: 'drop-shadow(0 0 80px rgba(250,90,10,0.4))' }}
          initial={reduce ? { opacity: 0 } : { opacity: 0, transform: 'scale(0.9)' }}
          animate={reduce ? { opacity: 1 } : { opacity: 1, transform: 'scale(1)' }}
          transition={{ duration: reduce ? 0.2 : 0.5, ease: EASE_OUT }}
          aria-hidden
        />

        {/* Eyebrow âmbar — delay 250ms */}
        <Deferred ms={250}>
          <BlurText
            text="PROJETO NOVA CASA · JARDIM AMÁLIA"
            animateBy="words"
            delay={60}
            stepDuration={0.35}
            easing={EASE_OUT}
            threshold={0.1}
            className="eyebrow mt-8 justify-center !text-flame-amber"
            animationFrom={{ filter: 'blur(6px)', opacity: 0, y: 8 }}
            animationTo={[{ filter: 'blur(0px)', opacity: 1, y: 0 }]}
          />
        </Deferred>

        {/* H1 — delay 450ms, word-level, stagger 80ms */}
        <h1 className="fs-hero mt-6 font-display font-medium text-cream">
          <Deferred ms={450}>
            <BlurText
              text="O nosso sonho"
              animateBy="words"
              delay={80}
              stepDuration={0.5}
              easing={EASE_OUT}
              threshold={0.1}
              className="justify-center"
              animationFrom={{ filter: 'blur(12px)', opacity: 0, y: 20 }}
              animationTo={[{ filter: 'blur(0px)', opacity: 1, y: 0 }]}
            />
          </Deferred>{' '}
          <motion.span
            className="inline-block"
            initial={reduce ? { opacity: 0 } : { opacity: 0, transform: 'translateY(20px)', filter: 'blur(12px)' }}
            animate={reduce ? { opacity: 1 } : { opacity: 1, transform: 'translateY(0px)', filter: 'blur(0px)' }}
            transition={{ duration: reduce ? 0.2 : 0.7, delay: reduce ? 0 : 0.85, ease: EASE_OUT }}
          >
            <GradientText
              colors={GOLD_GRADIENT}
              animationSpeed={8}
              className="!mx-0 inline-flex !cursor-text !rounded-none !backdrop-blur-none"
            >
              tomando forma
            </GradientText>
          </motion.span>
        </h1>

        {/* Lead — delay 900ms */}
        <motion.p
          className="fs-lead mt-8 max-w-[50ch] text-cream-2"
          initial={{ opacity: 0, transform: 'translateY(24px)' }}
          animate={{ opacity: 1, transform: 'translateY(0px)' }}
          transition={{ duration: reduce ? 0.2 : 0.6, delay: reduce ? 0 : 0.9, ease: EASE_OUT }}
        >
          Tijolo a tijolo, oração a oração — estamos construindo a nova casa da nossa família no
          Jardim Amália. Fé em movimento.
        </motion.p>

        {/* CTAs — stagger 80ms após o lead */}
        <div className="mt-10 flex flex-wrap items-center justify-center gap-4">
          <motion.span
            initial={{ opacity: 0, transform: 'translateY(24px)' }}
            animate={{ opacity: 1, transform: 'translateY(0px)' }}
            transition={{ duration: reduce ? 0.2 : 0.6, delay: reduce ? 0 : 1.05, ease: EASE_OUT }}
          >
            <a href="#contribuir" className="inline-block" aria-label="Quero contribuir — ir para formas de contribuir">
              <ClickSpark sparkColor="#FAAA0A" sparkCount={8} sparkRadius={24}>
                <StarBorder
                  as="span"
                  color="#FAAA0A"
                  speed="5s"
                  thickness={1}
                  className="rounded-full"
                  innerClassName="rounded-full border-transparent"
                >
                  <span className="block rounded-full bg-gold px-8 py-3.5 text-sm font-semibold text-ink transition-[background-color,box-shadow,transform] duration-200 hover:bg-gold-light hover:shadow-[0_0_32px_rgba(230,210,130,0.25)] active:scale-[0.97]">
                    Quero contribuir
                  </span>
                </StarBorder>
              </ClickSpark>
            </a>
          </motion.span>
          <motion.span
            initial={{ opacity: 0, transform: 'translateY(24px)' }}
            animate={{ opacity: 1, transform: 'translateY(0px)' }}
            transition={{ duration: reduce ? 0.2 : 0.6, delay: reduce ? 0 : 1.13, ease: EASE_OUT }}
          >
            <a
              href="#fases"
              className="inline-block rounded-full border border-gold-dark px-8 py-3.5 text-sm font-semibold text-gold transition-[background-color,transform] duration-200 hover:bg-[rgba(210,178,100,0.08)] active:scale-[0.98]"
            >
              Ver as fases
            </a>
          </motion.span>
        </div>
      </motion.div>
    </section>
  );
}

/* ------------------------------------------------------------------ */
/* S2 · Manifesto do projeto (ScrollReveal editorial)                  */
/* ------------------------------------------------------------------ */
function Manifesto() {
  const reduce = useReducedMotion();
  const quoteRef = useRef<HTMLDivElement>(null);

  const pulseGlow = () => {
    if (reduce || !quoteRef.current) return;
    quoteRef.current.animate(
      [
        { textShadow: '0 0 0px rgba(230,210,130,0)' },
        { textShadow: '0 0 28px rgba(230,210,130,0.4)' },
        { textShadow: '0 0 0px rgba(230,210,130,0)' },
      ],
      { duration: 1200, easing: 'cubic-bezier(0.23, 1, 0.32, 1)' }
    );
  };

  return (
    <section className="bg-ink py-[clamp(96px,14vh,160px)]" aria-label="Manifesto do projeto">
      <div className="container-brand flex flex-col items-center text-center">
        <SectionHeader
          eyebrow="POR QUE CONSTRUIR"
          title="Uma casa para a família, um farol para o bairro"
        />

        <div className="mt-14 flex max-w-[60ch] flex-col gap-8 text-left">
          {reduce ? (
            <>
              <p className="text-base leading-[1.7] text-cream-2">
                Somos uma família vivendo a unidade em amor — e estamos construindo a nossa nova
                casa no Jardim Amália. Este não é um projeto de pedra e cimento: é um projeto de
                pessoas, de gerações, de vidas que serão alcançadas.
              </p>
              <p className="text-base leading-[1.7] text-cream-2">
                Cada culto, cada oferta, cada hora de mutirão é um tijolo de fé. A Nova Casa será um
                lugar de celebração e alinhamento, de acolhimento e serviço — o nosso sonho tomando
                forma diante dos nossos olhos.
              </p>
            </>
          ) : (
            <>
              <ScrollReveal
                baseOpacity={0.15}
                baseRotation={0}
                enableBlur={false}
                containerClassName="!my-0"
                textClassName="!text-base !leading-[1.7] !font-normal text-cream-2"
              >
                Somos uma família vivendo a unidade em amor — e estamos construindo a nossa nova
                casa no Jardim Amália. Este não é um projeto de pedra e cimento: é um projeto de
                pessoas, de gerações, de vidas que serão alcançadas.
              </ScrollReveal>
              <ScrollReveal
                baseOpacity={0.15}
                baseRotation={0}
                enableBlur={false}
                containerClassName="!my-0"
                textClassName="!text-base !leading-[1.7] !font-normal text-cream-2"
              >
                Cada culto, cada oferta, cada hora de mutirão é um tijolo de fé. A Nova Casa será um
                lugar de celebração e alinhamento, de acolhimento e serviço — o nosso sonho tomando
                forma diante dos nossos olhos.
              </ScrollReveal>
            </>
          )}
        </div>

        {/* Pull-quote — delight #4 */}
        <div ref={quoteRef} className="mt-16">
          {reduce ? (
            <p className="font-display text-[1.75rem] italic text-gold">“Fé em movimento.”</p>
          ) : (
            <SplitText
              text="“Fé em movimento.”"
              tag="p"
              splitType="words"
              delay={80}
              duration={0.7}
              ease="power3.out"
              from={{ opacity: 0, y: 16 }}
              to={{ opacity: 1, y: 0 }}
              threshold={0.3}
              rootMargin="0px"
              textAlign="center"
              className="font-display text-[1.75rem] italic text-gold"
              onLetterAnimationComplete={pulseGlow}
            />
          )}
        </div>
      </div>
    </section>
  );
}

/* ------------------------------------------------------------------ */
/* S4 · Galeria da obra + lightbox                                     */
/* ------------------------------------------------------------------ */
function Gallery() {
  const reduce = useReducedMotion();
  const [selected, setSelected] = useState<number | null>(null);

  // Fecha com Escape + trava scroll enquanto o lightbox está aberto
  useEffect(() => {
    if (selected === null) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setSelected(null);
    };
    document.addEventListener('keydown', onKey);
    document.body.style.overflow = 'hidden';
    return () => {
      document.removeEventListener('keydown', onKey);
      document.body.style.overflow = '';
    };
  }, [selected]);

  return (
    <section className="bg-ink py-[clamp(96px,14vh,160px)]" aria-label="Galeria da obra">
      {/* Hover gate obrigatório (STANDARDS.md) */}
      <style>{`
        .nc-gallery-overlay { opacity: 0; transition: opacity 250ms cubic-bezier(0.23, 1, 0.32, 1); }
        .nc-gallery-caption { transform: translateY(8px); transition: transform 250ms cubic-bezier(0.23, 1, 0.32, 1); }
        .nc-gallery-img { transition: transform 600ms cubic-bezier(0.23, 1, 0.32, 1); }
        @media (hover: hover) and (pointer: fine) {
          .nc-gallery-item:hover .nc-gallery-overlay { opacity: 1; }
          .nc-gallery-item:hover .nc-gallery-caption { transform: translateY(0); }
          .nc-gallery-item:hover .nc-gallery-img { transform: scale(1.03); }
        }
      `}</style>

      <div className="container-brand">
        <SectionHeader eyebrow="A OBRA" title="Fé que se vê" />

        <div className="mt-14 grid grid-cols-1 gap-4 md:grid-cols-3">
          {GALLERY.map((g, i) => (
            <motion.button
              key={g.src}
              type="button"
              onClick={() => setSelected(i)}
              className="nc-gallery-item group relative block aspect-[3/2] w-full overflow-hidden rounded-sm text-left"
              aria-label={`Ampliar foto: ${g.caption}`}
              initial={
                reduce
                  ? { opacity: 0 }
                  : { opacity: 0, clipPath: 'inset(10%)', transform: 'translateY(16px)' }
              }
              whileInView={
                reduce
                  ? { opacity: 1 }
                  : { opacity: 1, clipPath: 'inset(0%)', transform: 'translateY(0px)' }
              }
              viewport={{ once: true, amount: 0.2 }}
              transition={{ duration: reduce ? 0.2 : 0.7, delay: reduce ? 0 : i * 0.07, ease: EASE_OUT }}
            >
              <img
                src={g.src}
                alt={g.caption}
                loading="lazy"
                className="nc-gallery-img h-full w-full object-cover"
              />
              <div
                className="nc-gallery-overlay absolute inset-0"
                style={{ background: 'linear-gradient(180deg, rgba(11,11,11,0.15) 30%, rgba(11,11,11,0.75) 100%)' }}
                aria-hidden
              />
              <span className="nc-gallery-caption absolute bottom-4 left-4 text-sm font-semibold text-cream">
                {g.caption}
              </span>
            </motion.button>
          ))}
        </div>
      </div>

      {/* Lightbox */}
      <AnimatePresence>
        {selected !== null && (
          <motion.div
            key="lightbox"
            className="fixed inset-0 z-[60] flex items-center justify-center p-6 backdrop-blur-md"
            style={{ background: 'rgba(11,11,11,0.92)' }}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: reduce ? 0 : 0.2, ease: EASE_IN_OUT }}
            onClick={() => setSelected(null)}
            role="dialog"
            aria-modal="true"
            aria-label={GALLERY[selected].caption}
          >
            <motion.figure
              className="relative max-h-full max-w-5xl"
              initial={reduce ? { opacity: 0 } : { opacity: 0, transform: 'scale(0.95)' }}
              animate={reduce ? { opacity: 1 } : { opacity: 1, transform: 'scale(1)' }}
              exit={reduce ? { opacity: 0 } : { opacity: 0, transform: 'scale(0.95)' }}
              transition={{ duration: reduce ? 0 : 0.25, ease: EASE_OUT }}
              onClick={(e) => e.stopPropagation()}
            >
              <img
                src={GALLERY[selected].src}
                alt={GALLERY[selected].caption}
                className="max-h-[80vh] w-auto rounded-sm object-contain"
              />
              <figcaption className="mt-4 text-center text-sm text-cream-2">
                {GALLERY[selected].caption}
              </figcaption>
              <button
                type="button"
                onClick={() => setSelected(null)}
                aria-label="Fechar"
                className="absolute -right-3 -top-3 flex h-10 w-10 items-center justify-center rounded-full border border-gold-dark bg-ink text-cream transition-colors duration-200 hover:text-gold"
              >
                <svg width="14" height="14" viewBox="0 0 14 14" fill="none" aria-hidden>
                  <path d="M1 1l12 12M13 1L1 13" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
                </svg>
              </button>
            </motion.figure>
          </motion.div>
        )}
      </AnimatePresence>
    </section>
  );
}

/* ------------------------------------------------------------------ */
/* S5 · Como contribuir (CTA principal da página)                      */
/* ------------------------------------------------------------------ */
const CONTRIBUIR = [
  {
    title: 'Oferte',
    text: 'Contribua com o projeto por Pix ou nos cultos. Toda semente conta.',
    cta: 'primary' as const,
    to: 'https://wa.me/5542999384069',
    label: 'Falar com a tesouraria',
  },
  {
    title: 'Ore',
    text: 'Sustente a obra em oração: toda quarta, o Alinhamento intercede pela Nova Casa.',
    cta: 'ghost' as const,
    to: '/cultos',
    label: 'Ver horários',
  },
  {
    title: 'Sirva',
    text: 'Mutirões de limpeza, transporte e apoio: suas mãos também constroem.',
    cta: 'ghost' as const,
    to: 'https://wa.me/5542999384069',
    label: 'Quero servir',
  },
];

function Contribuir() {
  const reduce = useReducedMotion();
  return (
    <section
      id="contribuir"
      className="border-t border-[rgba(250,170,10,0.25)] bg-ink-warm py-[clamp(96px,14vh,160px)]"
      aria-label="Como contribuir"
    >
      <div className="container-brand">
        <SectionHeader
          eyebrow="FAÇA PARTE"
          title="Cada tijolo conta uma história"
          eyebrowClassName="!text-flame-amber"
        />

        <div className="mt-14 grid grid-cols-1 gap-6 md:grid-cols-3">
          {CONTRIBUIR.map((c, i) => (
            <motion.div
              key={c.title}
              initial={{ opacity: 0, transform: 'translateY(40px)' }}
              whileInView={{ opacity: 1, transform: 'translateY(0px)' }}
              viewport={{ once: true, amount: 0.2 }}
              transition={{ duration: reduce ? 0.2 : 0.5, delay: reduce ? 0 : i * 0.06, ease: EASE_OUT }}
              className="h-full"
            >
              <SpotlightCard
                spotlightColor="rgba(250, 170, 10, 0.1)"
                className="card-brand flex h-full flex-col !border-[rgba(250,170,10,0.18)] p-8 lg:p-10"
              >
                <h3 className="font-display text-2xl font-semibold text-cream">{c.title}</h3>
                <p className="mt-3 flex-1 text-sm leading-[1.7] text-cream-2">{c.text}</p>
                <div className="mt-8">
                  {c.cta === 'primary' ? (
                    <PrimaryButton to={c.to} external>
                      {c.label}
                    </PrimaryButton>
                  ) : (
                    <GhostButton to={c.to} external={c.to.startsWith('http')}>
                      {c.label}
                    </GhostButton>
                  )}
                </div>
              </SpotlightCard>
            </motion.div>
          ))}
        </div>

        <motion.p
          className="mt-12 text-center text-sm text-cream-muted"
          initial={{ opacity: 0 }}
          whileInView={{ opacity: 1 }}
          viewport={{ once: true, amount: 0.2 }}
          transition={{ duration: reduce ? 0.2 : 0.5, delay: reduce ? 0 : 0.3, ease: EASE_OUT }}
        >
          Prestação de contas transparente: fale com a liderança após qualquer culto.
        </motion.p>
      </div>
    </section>
  );
}

/* ------------------------------------------------------------------ */
/* S6 · Fechamento — dedicação                                         */
/* ------------------------------------------------------------------ */
function Closing() {
  const reduce = useReducedMotion();
  return (
    <section
      className="bg-ink py-[clamp(128px,18vh,200px)]"
      aria-label="Dedicação"
    >
      <div className="container-brand flex flex-col items-center text-center">
        <motion.img
          src="/flame.webp"
          alt=""
          width={40}
          height={40}
          className="h-10 w-auto"
          initial={{ opacity: 0, transform: 'translateY(16px)' }}
          whileInView={{ opacity: 1, transform: 'translateY(0px)' }}
          viewport={{ once: true, amount: 0.25 }}
          transition={{ duration: reduce ? 0.2 : 0.5, ease: EASE_OUT }}
          aria-hidden
        />

        <div className="fs-verse mt-10 max-w-[24ch] font-display italic text-cream">
          {reduce ? (
            <p>“Acima de tudo, revistam-se do amor.”</p>
          ) : (
            <SplitText
              text="“Acima de tudo, revistam-se do amor.”"
              tag="p"
              splitType="words"
              delay={80}
              duration={0.7}
              ease="power3.out"
              from={{ opacity: 0, y: 16 }}
              to={{ opacity: 1, y: 0 }}
              threshold={0.25}
              rootMargin="0px"
              textAlign="center"
            />
          )}
        </div>

        <motion.p
          className="eyebrow mt-8"
          initial={{ opacity: 0, transform: 'translateY(12px)' }}
          whileInView={{ opacity: 1, transform: 'translateY(0px)' }}
          viewport={{ once: true, amount: 0.25 }}
          transition={{ duration: reduce ? 0.2 : 0.5, delay: reduce ? 0 : 0.6, ease: EASE_OUT }}
        >
          — Colossenses 3:14
        </motion.p>

        <motion.p
          className="mt-10 text-base text-cream-muted"
          initial={{ opacity: 0, transform: 'translateY(12px)' }}
          whileInView={{ opacity: 1, transform: 'translateY(0px)' }}
          viewport={{ once: true, amount: 0.25 }}
          transition={{ duration: reduce ? 0.2 : 0.5, delay: reduce ? 0 : 0.68, ease: EASE_OUT }}
        >
          Juntos, construímos. Juntos, celebraremos.
        </motion.p>

        <motion.div
          className="mt-10"
          initial={{ opacity: 0, transform: 'translateY(12px)' }}
          whileInView={{ opacity: 1, transform: 'translateY(0px)' }}
          viewport={{ once: true, amount: 0.25 }}
          transition={{ duration: reduce ? 0.2 : 0.5, delay: reduce ? 0 : 0.76, ease: EASE_OUT }}
        >
          <ArrowLink to="/">Voltar ao início</ArrowLink>
        </motion.div>
      </div>
    </section>
  );
}

export default function NovaCasa() {
  return (
    <>
      <Hero />
      <Manifesto />
      <TimelineSection />
      <Gallery />
      <Contribuir />
      <Closing />
    </>
  );
}

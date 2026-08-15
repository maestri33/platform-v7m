import { useEffect, useRef, useState } from 'react';
import { motion, useReducedMotion, useScroll, useTransform } from 'framer-motion';
import BlurText from '../components/BlurText';
import GradientText from '../components/GradientText';
import ScrollReveal from '../components/ScrollReveal';
import SpotlightCard from '../components/SpotlightCard';
import SectionHeader from '../components/SectionHeader';
import EditorialAccordion from '../components/EditorialAccordion';
import type { EditorialAccordionItem } from '../components/EditorialAccordion';
import { PrimaryButton, ArrowLink } from '../components/Buttons';

const EASE_OUT = [0.23, 1, 0.32, 1] as [number, number, number, number];
const GOLD_GRADIENT = ['#B4843C', '#E6D282', '#D2B264', '#F4EFE6'];

/** Monta o componente só após `ms` — escalona os BlurText do hero */
function useDelayedMount(ms: number) {
  const [ready, setReady] = useState(ms === 0);
  useEffect(() => {
    if (ms === 0) return;
    const t = window.setTimeout(() => setReady(true), ms);
    return () => window.clearTimeout(t);
  }, [ms]);
  return ready;
}

/* ---------------------------------- dados ---------------------------------- */

const HISTORIA: string[] = [
  'A IEADPG Jardim Amália nasceu do sonho de ver o Evangelho alcançar cada lar do nosso bairro. Como igreja da Assembleia de Deus em Ponta Grossa, carregamos uma herança pentecostal marcada pela chama do Espírito — e pelo compromisso de ser família para quem chega.',
  'Juntos, caminhamos, aprendemos e servimos, construindo uma comunidade viva e transformadora. Nossos cultos de domingo celebram; nossas quartas alinham; e todos os dias, vivemos a unidade em amor.',
  'Hoje, esse sonho ganha paredes: estamos construindo a nossa nova casa no Jardim Amália — um espaço para acolher gerações, servir a cidade e glorificar a Deus.',
];

const DNA: EditorialAccordionItem[] = [
  {
    title: 'Fé',
    body: 'Cremos no Deus vivo que transforma vidas. A fé é o fundamento de cada decisão, cada culto e cada passo do nosso projeto.',
  },
  {
    title: 'Unidade',
    body: 'Somos um só corpo em Cristo. A unidade não é ausência de diferenças — é o amor que as costura.',
  },
  {
    title: 'Família',
    body: 'Igreja não é prédio nem evento: é gente que pertence. Aqui, cada pessoa é recebida como família.',
  },
  {
    title: 'Palavra',
    body: 'A Bíblia é nossa regra de fé e prática. Nos cultos de Alinhamento e na vida diária, a Palavra é lâmpada para os nossos pés.',
  },
  {
    title: 'Amor',
    body: '“Acima de tudo, revistam-se do amor” (Cl 3:14). O amor é o nosso DNA mais visível — na recepção, no serviço e no cuidado.',
  },
  {
    title: 'Serviço',
    body: 'Servimos a Deus servindo pessoas: no bairro, na cidade e na construção da nossa nova casa.',
  },
];

const LIDERANCA = [
  {
    initials: 'AF',
    name: 'Pr. Ademir Ferreira',
    role: 'Pastor Presidente',
    bio: 'Pastoreia a família IEADPG com visão de Reino e coração de pai.',
  },
  {
    initials: 'LF',
    name: 'Pra. Luciana Ferreira',
    role: 'Pastora',
    bio: 'Serve ao lado do pastor Ademir, cuidando de pessoas e da comunhão.',
  },
  {
    initials: 'JA',
    name: 'Pr. João Pedro Alves',
    role: 'Líder de Jovens',
    bio: 'Conduz a nova geração em fé, unidade e propósito.',
  },
];

const GALERIA = [
  { img: '/about-worship.jpg', caption: 'Adoração', className: 'md:col-start-1 md:row-start-1 md:row-span-2' },
  { img: '/about-community.jpg', caption: 'Comunhão', className: 'md:col-start-2 md:col-span-2 md:row-start-1' },
  { img: '/about-word.jpg', caption: 'Palavra', className: 'md:col-start-2 md:col-span-2 md:row-start-2' },
];

/* --------------------------------- seções --------------------------------- */

/** S1 · Hero — "Somos família" (90vh), full-bleed + parallax −10% */
function Hero() {
  const reduce = useReducedMotion();
  const sectionRef = useRef<HTMLElement>(null);
  const { scrollYProgress } = useScroll({ target: sectionRef, offset: ['start start', 'end start'] });
  const bgY = useTransform(scrollYProgress, [0, 1], ['0%', '-10%']);

  const eyebrowReady = useDelayedMount(reduce ? 0 : 150);
  const line1Ready = useDelayedMount(reduce ? 0 : 350);
  const line2Ready = useDelayedMount(reduce ? 0 : 490); // 350 + 2 palavras × 70ms

  return (
    <section
      ref={sectionRef}
      className="relative flex min-h-[calc(90dvh-72px)] overflow-hidden bg-ink"
      aria-label="Quem somos"
    >
      {/* Imagem full-bleed com parallax scrub */}
      <motion.div className="absolute inset-0" style={reduce ? undefined : { y: bgY }} aria-hidden>
        <img
          src="/about-congregation.jpg"
          alt=""
          className={`w-full object-cover ${reduce ? 'h-full' : 'h-[115%]'}`}
        />
      </motion.div>
      {/* Overlay + vignette */}
      <div
        className="pointer-events-none absolute inset-0"
        aria-hidden
        style={{
          background:
            'linear-gradient(180deg, rgba(11,11,11,0.55) 0%, rgba(11,11,11,0.85) 100%), radial-gradient(ellipse 90% 70% at 50% 60%, transparent 40%, rgba(11,11,11,0.55) 100%)',
        }}
      />

      {/* Conteúdo centralizado no terço inferior */}
      <div className="container-brand relative z-[2] flex flex-1 flex-col items-center justify-end gap-6 pb-[clamp(72px,12vh,128px)] pt-24 text-center">
        <h1 className="sr-only">Somos uma família — IEADPG Jardim Amália</h1>

        <div aria-hidden>
          {eyebrowReady && (
            <BlurText
              text="QUEM SOMOS"
              animateBy="words"
              delay={60}
              stepDuration={0.45}
              easing={EASE_OUT}
              className="eyebrow justify-center"
              animationFrom={{ filter: 'blur(8px)', opacity: 0, y: 12 }}
              animationTo={[{ filter: 'blur(0px)', opacity: 1, y: 0 }]}
            />
          )}
        </div>

        <div className="fs-h1 font-display font-medium text-cream" aria-hidden>
          {line1Ready && (
            <BlurText
              text="Somos uma"
              animateBy="words"
              delay={70}
              stepDuration={0.6}
              easing={EASE_OUT}
              className="justify-center"
              animationFrom={{ filter: 'blur(10px)', opacity: 0, y: 16 }}
              animationTo={[{ filter: 'blur(0px)', opacity: 1, y: 0 }]}
            />
          )}
          {line2Ready && (
            <GradientText
              colors={GOLD_GRADIENT}
              animationSpeed={8}
              className="!mx-auto !cursor-text !rounded-none !backdrop-blur-none"
            >
              <BlurText
                text="família"
                animateBy="words"
                delay={70}
                stepDuration={0.6}
                easing={EASE_OUT}
                className="justify-center"
                animationFrom={{ filter: 'blur(10px)', opacity: 0, y: 16 }}
                animationTo={[{ filter: 'blur(0px)', opacity: 1, y: 0 }]}
              />
            </GradientText>
          )}
        </div>

        <motion.p
          className="fs-lead max-w-[48ch] text-cream-2"
          initial={{ opacity: 0, transform: 'translateY(16px)' }}
          animate={{ opacity: 1, transform: 'translateY(0px)' }}
          transition={{ duration: reduce ? 0.15 : 0.4, delay: reduce ? 0 : 0.7, ease: EASE_OUT }}
        >
          Uma comunidade viva no coração do Jardim Amália, caminhando junta em fé, unidade e amor.
        </motion.p>
      </div>
    </section>
  );
}

/** Parágrafo editorial com react-bits ScrollReveal (baseOpacity 0.15, word-level, scrub) */
function RevealParagraph({ text }: { text: string }) {
  const reduce = useReducedMotion();
  if (reduce) {
    return <p className="text-base leading-[1.7] text-cream-2">{text}</p>;
  }
  return (
    <ScrollReveal
      baseOpacity={0.15}
      baseRotation={0}
      enableBlur={false}
      containerClassName="!my-0"
      textClassName="!text-base !font-normal !leading-[1.7] text-cream-2 font-sans"
    >
      {text}
    </ScrollReveal>
  );
}

/** S2 · Nossa História — texto editorial + pull-quote */
function Historia() {
  const reduce = useReducedMotion();
  return (
    <section className="bg-ink py-[clamp(96px,14vh,160px)]" aria-label="Nossa história">
      <div className="container-brand">
        <div className="mx-auto max-w-[65ch]">
          <SectionHeader
            align="left"
            eyebrow="NOSSA HISTÓRIA"
            title="Fé em movimento desde o primeiro dia"
          />
          <div className="mt-12 space-y-8">
            <RevealParagraph text={HISTORIA[0]} />
            <RevealParagraph text={HISTORIA[1]} />

            {/* Pull-quote: borda esquerda desenha scaleY 0→1 + texto fade-up */}
            <blockquote className="relative py-2 pl-6">
              <motion.span
                aria-hidden
                className="absolute left-0 top-0 h-full w-[2px] bg-gold-dark"
                style={{ transformOrigin: 'top' }}
                initial={reduce ? false : { transform: 'scaleY(0)' }}
                whileInView={{ transform: 'scaleY(1)' }}
                viewport={{ once: true, amount: 0.4 }}
                transition={{ duration: 0.4, ease: EASE_OUT }}
              />
              <motion.p
                className="font-display text-2xl italic leading-[1.5] text-gold"
                initial={reduce ? false : { opacity: 0, transform: 'translateY(16px)' }}
                whileInView={{ opacity: 1, transform: 'translateY(0px)' }}
                viewport={{ once: true, amount: 0.4 }}
                transition={{ duration: 0.4, delay: reduce ? 0 : 0.1, ease: EASE_OUT }}
              >
                “O vínculo perfeito que nos reveste acima de tudo é o amor.”
              </motion.p>
            </blockquote>

            <RevealParagraph text={HISTORIA[2]} />
          </div>
        </div>
      </div>
    </section>
  );
}

/** S3 · DNA Expandido — acordeão editorial */
function Dna() {
  return (
    <section className="bg-ink-warm py-[clamp(96px,14vh,160px)]" aria-label="Nosso DNA">
      <div className="container-brand">
        <SectionHeader eyebrow="NOSSO DNA" title="Seis valores, uma só essência" />
        <div className="mt-16">
          <EditorialAccordion items={DNA} numerals />
        </div>
      </div>
    </section>
  );
}

/** S4 · Liderança — SpotlightCards tipográficos */
function Lideranca() {
  const reduce = useReducedMotion();
  return (
    <section className="bg-ink py-[clamp(96px,14vh,160px)]" aria-label="Liderança">
      <div className="container-brand">
        <SectionHeader eyebrow="LIDERANÇA" title="Pastores que servem a família" />

        <div className="mt-16 grid gap-8 sm:grid-cols-2 lg:grid-cols-3">
          {LIDERANCA.map((p, i) => (
            <motion.div
              key={p.name}
              initial={reduce ? false : { opacity: 0, transform: 'translateY(40px)' }}
              whileInView={{ opacity: 1, transform: 'translateY(0px)' }}
              viewport={{ once: true, amount: 0.2 }}
              transition={{ duration: 0.5, delay: reduce ? 0 : i * 0.06, ease: EASE_OUT }}
            >
              <SpotlightCard
                className="sobre-leader card-brand flex h-full flex-col items-center gap-4 !rounded-[2px] p-10 text-center"
                spotlightColor="rgba(210, 178, 100, 0.12)"
              >
                <span className="sobre-mono flex h-24 w-24 items-center justify-center rounded-full border border-[rgba(210,178,100,0.4)]">
                  <span className="font-display text-3xl font-semibold text-gold">{p.initials}</span>
                </span>
                <h3 className="font-display text-2xl font-semibold text-cream">{p.name}</h3>
                <p className="text-xs font-semibold uppercase tracking-[0.28em] text-gold">{p.role}</p>
                <p className="text-sm leading-relaxed text-cream-muted">{p.bio}</p>
              </SpotlightCard>
            </motion.div>
          ))}
        </div>

        <p className="mt-12 text-center text-sm text-cream-muted">
          Venha nos conhecer pessoalmente — domingo, 19h.
        </p>
      </div>
    </section>
  );
}

/** S5 · Galeria — mosaico editorial assimétrico */
function Galeria() {
  const reduce = useReducedMotion();
  return (
    <section className="bg-ink-warm py-[clamp(96px,14vh,160px)]" aria-label="Galeria">
      <div className="container-brand">
        <div className="grid gap-4 md:grid-cols-3 md:auto-rows-[280px] lg:auto-rows-[340px]">
          {GALERIA.map((g, i) => (
            <motion.figure
              key={g.img}
              className={`sobre-galeria-item group relative aspect-[4/3] overflow-hidden rounded-[2px] md:aspect-auto ${g.className}`}
              initial={reduce ? false : { opacity: 0, clipPath: 'inset(12% 0% 12% 0%)' }}
              whileInView={{ opacity: 1, clipPath: 'inset(0% 0% 0% 0%)' }}
              viewport={{ once: true, amount: 0.2 }}
              transition={{ duration: 0.7, delay: reduce ? 0 : i * 0.07, ease: EASE_OUT }}
            >
              <img
                src={g.img}
                alt={g.caption}
                className="sobre-galeria-img h-full w-full object-cover"
                loading="lazy"
              />
              <div
                aria-hidden
                className="sobre-galeria-overlay absolute inset-0"
                style={{ background: 'rgba(11,11,11,0.2)' }}
              />
              <figcaption className="sobre-galeria-caption absolute bottom-4 left-4 text-xs font-semibold uppercase tracking-[0.28em] text-cream-muted">
                {g.caption}
              </figcaption>
            </motion.figure>
          ))}
        </div>
      </div>
    </section>
  );
}

/** S6 · CTA final */
function CtaFinal() {
  const reduce = useReducedMotion();
  return (
    <section
      className="border-t border-[rgba(210,178,100,0.15)] bg-ink"
      aria-label="Planeje sua visita"
    >
      <div className="container-brand py-[clamp(96px,14vh,160px)]">
        <motion.div
          className="mx-auto flex max-w-[560px] flex-col items-center gap-6 text-center"
          initial={reduce ? false : { opacity: 0, transform: 'translateY(24px)' }}
          whileInView={{ opacity: 1, transform: 'translateY(0px)' }}
          viewport={{ once: true, amount: 0.25 }}
          transition={{ duration: 0.5, ease: EASE_OUT }}
        >
          <h3 className="fs-h3 font-display font-medium text-cream">Venha viver isso conosco.</h3>
          <p className="text-sm leading-relaxed text-cream-muted">Domingo às 19h · Jardim Amália</p>
          <div className="mt-2 flex flex-wrap items-center justify-center gap-6">
            <PrimaryButton to="/contato">Planeje sua visita</PrimaryButton>
            <ArrowLink to="/nova-casa">Conheça a Nova Casa</ArrowLink>
          </div>
        </motion.div>
      </div>
    </section>
  );
}

export default function Sobre() {
  return (
    <>
      {/* Hover gate (pointer:fine) + reduced-motion — STANDARDS.md */}
      <style>{`
        .sobre-galeria-img { transition: transform 600ms var(--ease-out); }
        .sobre-galeria-overlay { transition: opacity 600ms var(--ease-out); }
        .sobre-galeria-caption {
          opacity: 0; transform: translateY(8px);
          transition: opacity 250ms var(--ease-out), transform 250ms var(--ease-out);
        }
        .sobre-mono { transition: box-shadow 250ms var(--ease-out); }
        @media (hover: hover) and (pointer: fine) {
          .sobre-galeria-item:hover .sobre-galeria-img { transform: scale(1.04); }
          .sobre-galeria-item:hover .sobre-galeria-overlay { opacity: 0; }
          .sobre-galeria-item:hover .sobre-galeria-caption { opacity: 1; transform: translateY(0); }
          .sobre-leader:hover .sobre-mono { box-shadow: 0 0 32px rgba(210,178,100,0.2); }
        }
        @media (prefers-reduced-motion: reduce) {
          .sobre-galeria-caption { opacity: 1; transform: none; }
        }
      `}</style>
      <Hero />
      <Historia />
      <Dna />
      <Lideranca />
      <Galeria />
      <CtaFinal />
    </>
  );
}

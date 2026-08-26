import { useEffect, useRef, useState } from 'react';
import { motion, useReducedMotion, useScroll, useTransform } from 'framer-motion';
import DarkVeil from '../DarkVeil';
import BlurText from '../BlurText';
import GradientText from '../GradientText';
import { StarButton, GhostButton } from '../Buttons';

const EASE_OUT = [0.23, 1, 0.32, 1] as [number, number, number, number];
const GOLD_GRADIENT = ['#B4843C', '#E6D282', '#D2B264', '#F4EFE6'];

/** Monta o componente só após `ms` — usado para escalonar os BlurText do hero */
function useDelayedMount(ms: number) {
  const [ready, setReady] = useState(ms === 0);
  useEffect(() => {
    if (ms === 0) return;
    const t = window.setTimeout(() => setReady(true), ms);
    return () => window.clearTimeout(t);
  }, [ms]);
  return ready;
}

export default function Hero() {
  const reduce = useReducedMotion();
  const sectionRef = useRef<HTMLElement>(null);
  const { scrollYProgress } = useScroll({
    target: sectionRef,
    offset: ['start start', 'end start'],
  });
  // Parallax de saída: conteúdo sobe −15% e fade 1→0.2 nos primeiros 60vh
  const contentY = useTransform(scrollYProgress, [0, 0.6], ['0%', '-15%']);
  const contentOpacity = useTransform(scrollYProgress, [0, 0.6], [1, 0.2]);

  const eyebrowReady = useDelayedMount(reduce ? 0 : 200);
  const line2Ready = useDelayedMount(reduce ? 0 : 500);

  return (
    <section
      ref={sectionRef}
      className="darkveil-fallback relative flex min-h-[calc(100dvh-72px)] items-center justify-center overflow-hidden"
      aria-label="Boas-vindas"
    >
      {/* DarkVeil — único efeito pesado da página */}
      {!reduce && (
        <div className="absolute inset-0 z-0 opacity-85" aria-hidden>
          <DarkVeil
            hueShift={168}
            speed={0.3}
            noiseIntensity={0.015}
            scanlineIntensity={0.04}
            scanlineFrequency={0.6}
            warpAmount={0.25}
          />
        </div>
      )}
      {/* Tom quente + vignette radial nas bordas */}
      <div
        className="pointer-events-none absolute inset-0 z-[1]"
        aria-hidden
        style={{
          background:
            'radial-gradient(ellipse 90% 70% at 50% 65%, transparent 30%, rgba(11,11,11,0.7) 100%), radial-gradient(ellipse 60% 45% at 50% 70%, rgba(250,170,10,0.08), transparent 70%)',
        }}
      />

      <motion.div
        className="container-brand relative z-[2] flex flex-col items-center gap-8 py-24 text-center"
        style={reduce ? undefined : { y: contentY, opacity: contentOpacity }}
      >
        <h1 className="sr-only">
          Uma família vivendo a unidade em amor — IEADPG Jardim Amália
        </h1>

        {/* Chama */}
        <motion.img
          src="/flame.webp"
          alt=""
          width={39}
          height={64}
          className="h-16 w-auto"
          style={{ filter: 'drop-shadow(0 0 80px rgba(250,90,10,0.35))' }}
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: reduce ? 0.2 : 0.4, ease: EASE_OUT }}
          aria-hidden
        />

        {/* Eyebrow */}
        <div aria-hidden>
          {eyebrowReady && (
            <BlurText
              text="IGREJA EVANGÉLICA ASSEMBLEIA DE DEUS · PONTA GROSSA/PR"
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

        {/* H1 — linha 1 creme, linha 2 GradientText dourado */}
        <div className="font-display fs-hero font-medium text-cream" aria-hidden>
          <BlurText
            text="Uma família vivendo"
            animateBy="words"
            delay={80}
            stepDuration={0.5}
            easing={EASE_OUT}
            className="justify-center"
            animationFrom={{ filter: 'blur(12px)', opacity: 0, y: 20 }}
            animationTo={[{ filter: 'blur(0px)', opacity: 1, y: 0 }]}
          />
          {line2Ready && (
            <GradientText
              colors={GOLD_GRADIENT}
              animationSpeed={8}
              className="!mx-auto !cursor-text !rounded-none !backdrop-blur-none"
            >
              <BlurText
                text="a unidade em amor"
                animateBy="letters"
                delay={40}
                stepDuration={0.5}
                easing={EASE_OUT}
                className="justify-center"
                animationFrom={{ filter: 'blur(12px)', opacity: 0, y: 20 }}
                animationTo={[{ filter: 'blur(0px)', opacity: 1, y: 0 }]}
              />
            </GradientText>
          )}
        </div>

        {/* Lead */}
        <motion.p
          className="fs-lead max-w-[52ch] text-cream-2"
          initial={{ opacity: 0, transform: 'translateY(24px)' }}
          animate={{ opacity: 1, transform: 'translateY(0px)' }}
          transition={{
            duration: reduce ? 0.2 : 0.6,
            delay: reduce ? 0 : 0.9,
            ease: EASE_OUT,
          }}
        >
          Estamos construindo a nossa nova casa no Jardim Amália — e há um lugar guardado para você.
        </motion.p>

        {/* CTAs */}
        <motion.div
          className="flex flex-wrap items-center justify-center gap-4"
          initial={{ opacity: 0, transform: 'translateY(24px)' }}
          animate={{ opacity: 1, transform: 'translateY(0px)' }}
          transition={{
            duration: reduce ? 0.2 : 0.6,
            delay: reduce ? 0 : 1.1,
            ease: EASE_OUT,
          }}
        >
          <StarButton to="/contato" starColor="#D2B264">
            Planeje sua visita
          </StarButton>
          <GhostButton to="/nova-casa">Conheça o projeto Nova Casa</GhostButton>
        </motion.div>
      </motion.div>

      {/* Indicador de scroll */}
      <div className="absolute bottom-8 left-1/2 z-[2] flex -translate-x-1/2 flex-col items-center gap-3" aria-hidden>
        <span className="h-12 w-px overflow-hidden">
          <span className="block h-12 w-px animate-scroll-line bg-gold-dark" />
        </span>
        <span className="text-[10px] uppercase tracking-[0.3em] text-cream-muted">role</span>
      </div>
    </section>
  );
}

import { memo, useEffect, useState } from 'react';
import { motion, useReducedMotion } from 'framer-motion';
import BlurText from '../components/BlurText';
import GradientText from '../components/GradientText';
import SpotlightCard from '../components/SpotlightCard';
import SectionHeader from '../components/SectionHeader';
import EditorialAccordion from '../components/EditorialAccordion';
import type { EditorialAccordionItem } from '../components/EditorialAccordion';
import { PrimaryButton, GhostButton, ArrowLink } from '../components/Buttons';

const EASE_OUT = [0.23, 1, 0.32, 1] as [number, number, number, number];
const EASE_IN_OUT = [0.77, 0, 0.175, 1] as [number, number, number, number];
const GOLD_GRADIENT = ['#B4843C', '#E6D282', '#D2B264', '#F4EFE6'];
const MAPS_URL = 'https://maps.app.goo.gl/nKgD83xmGetsyDzKA';
const WHATSAPP_URL = 'https://wa.me/5542999384069';

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

const CULTOS = [
  {
    badge: 'DOMINGO',
    time: '19h',
    title: 'Celebração',
    copy: 'O culto da família reunida: louvor vibrante, Palavra que transforma e comunhão que aquece. Duração aproximada: 2h.',
    list: ['Louvor e adoração', 'Mensagem da Palavra', 'Espaço kids para as crianças', 'Café e comunhão ao final'],
    img: '/cultos-celebracao.jpg',
  },
  {
    badge: 'QUARTA',
    time: '20h',
    title: 'Alinhamento',
    copy: 'Uma pausa no meio da semana para alinhar o coração: estudo bíblico, oração e conversa franca. Duração aproximada: 1h30.',
    list: ['Estudo da Palavra', 'Oração e intercessão', 'Perguntas e diálogo', 'Comunhão em mesa'],
    img: '/cultos-alinhamento.jpg',
  },
];

const PASSOS = [
  {
    num: '01',
    title: 'Chegue',
    text: 'Rua Paulina Oliveira Gomes, 1071. Estacionamento no local; chegue 15 min antes.',
  },
  {
    num: '02',
    title: 'Seja recebido',
    text: 'Nossa equipe de recepção te acolhe na porta e ajuda com tudo.',
  },
  {
    num: '03',
    title: 'Viva o culto',
    text: 'Cante, ouça a Palavra, sinta-se em casa. Sem formalismos.',
  },
  {
    num: '04',
    title: 'Fique para o café',
    text: 'O melhor momento para conhecer a família é depois do “amém”.',
  },
];

const MINISTERIOS = [
  { title: 'Kids', line: 'O cuidado com os pequenos da família.' },
  { title: 'Louvor', line: 'Vozes e instrumentos a serviço da adoração.' },
  { title: 'Jovens', line: 'Uma geração alinhada e apaixonada.' },
  { title: 'Intercessão', line: 'A oração que sustenta a casa.' },
  { title: 'Recepção', line: 'O primeiro abraço de quem chega.' },
  { title: 'Mídia', line: 'Comunicação e tecnologia a serviço do Reino.' },
];

const FAQ: EditorialAccordionItem[] = [
  {
    title: 'Preciso me inscrever para visitar?',
    body: 'Não! É só chegar. Se quiser, avise pelo WhatsApp que te esperamos na porta.',
  },
  {
    title: 'Como é o estilo do culto?',
    body: 'Pentecostal clássico e acolhedor: louvor congregacional, Palavra expositiva e espaço para o mover do Espírito.',
  },
  {
    title: 'E as crianças?',
    body: 'O Ministério Kids recebe crianças durante o culto de domingo, com equipe dedicada e ambiente seguro.',
  },
  {
    title: 'Onde estaciono?',
    body: 'Temos estacionamento no local, na Rua Paulina Oliveira Gomes, 1071 — Jardim Amália.',
  },
  {
    title: 'Posso conhecer a obra da Nova Casa?',
    body: 'Claro! Fale com nossa liderança após qualquer culto ou visite a página do projeto.',
  },
];

/* --------------------------------- seções --------------------------------- */

/** S1 · Hero — tipográfico (70vh) com glow radial âmbar sutil */
function Hero() {
  const reduce = useReducedMotion();
  const eyebrowReady = useDelayedMount(reduce ? 0 : 150);
  const line1Ready = useDelayedMount(reduce ? 0 : 350);
  const line2Ready = useDelayedMount(reduce ? 0 : 630); // 350 + 4 palavras × 70ms

  return (
    <section
      className="relative flex min-h-[calc(70dvh-72px)] items-center justify-center overflow-hidden bg-ink"
      aria-label="Nossos encontros"
    >
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0"
        style={{
          background: 'radial-gradient(ellipse 60% 40% at 50% 0%, rgba(250,170,10,0.07), transparent)',
        }}
      />

      <div className="container-brand relative z-[2] flex flex-col items-center gap-7 py-20 text-center">
        <h1 className="sr-only">Há sempre um lugar para você</h1>

        <div aria-hidden>
          {eyebrowReady && (
            <BlurText
              text="NOSSOS ENCONTROS"
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
              text="Há sempre um lugar"
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
                text="para você"
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
          className="fs-lead max-w-[52ch] text-cream-2"
          initial={{ opacity: 0, transform: 'translateY(16px)' }}
          animate={{ opacity: 1, transform: 'translateY(0px)' }}
          transition={{ duration: reduce ? 0.15 : 0.4, delay: reduce ? 0 : 0.7, ease: EASE_OUT }}
        >
          Dois encontros semanais, uma só família. Chegue como está — você será recebido com amor.
        </motion.p>

        {/* Resumo imediato — pills ghost */}
        <div className="mt-2 flex flex-wrap items-center justify-center gap-4">
          {['Dom · 19h — Celebração', 'Qua · 20h — Alinhamento'].map((pill, i) => (
            <motion.span
              key={pill}
              className="rounded-full border border-gold-dark px-5 py-2 text-[13px] font-semibold text-gold"
              initial={{ opacity: 0, transform: 'translateY(16px)' }}
              animate={{ opacity: 1, transform: 'translateY(0px)' }}
              transition={{
                duration: reduce ? 0.15 : 0.4,
                delay: reduce ? 0 : 0.9 + i * 0.08,
                ease: EASE_OUT,
              }}
            >
              {pill}
            </motion.span>
          ))}
        </div>
      </div>
    </section>
  );
}

/** S2 · Cards de Culto — detalhe */
function CardsCulto() {
  const reduce = useReducedMotion();
  return (
    <section className="bg-ink-warm py-[clamp(96px,14vh,160px)]" aria-label="Cultos">
      <div className="container-brand">
        <div className="grid gap-8 lg:grid-cols-2">
          {CULTOS.map((c, i) => (
            <motion.div
              key={c.title}
              initial={reduce ? false : 'hidden'}
              whileInView="show"
              viewport={{ once: true, amount: 0.2 }}
              variants={{
                hidden: { opacity: 0, transform: 'translateY(48px)' },
                show: {
                  opacity: 1,
                  transform: 'translateY(0px)',
                  transition: {
                    duration: 0.6,
                    delay: i * 0.08,
                    ease: EASE_OUT,
                    staggerChildren: 0.03,
                    delayChildren: i * 0.08 + 0.45,
                  },
                },
              }}
            >
              <SpotlightCard
                className="card-brand culto-card h-full !rounded-[2px] !p-0"
                spotlightColor="rgba(210, 178, 100, 0.12)"
              >
                <div className="relative aspect-[16/10] overflow-hidden">
                  <img
                    src={c.img}
                    alt={c.title}
                    className="culto-card-img absolute inset-0 h-full w-full object-cover"
                    loading="lazy"
                  />
                </div>
                <div className="p-10">
                  <span className="eyebrow inline-block rounded-full border border-gold-dark px-3 py-1 !text-[11px]">
                    {c.badge}
                  </span>
                  <div className="mt-5 flex items-end gap-3">
                    <span className="font-display text-[4rem] font-semibold leading-none text-gold">
                      {c.time}
                    </span>
                    <img src="/icon-clock.svg" alt="" className="mb-2 h-6 w-6" aria-hidden />
                  </div>
                  <h3 className="fs-h3 mt-3 font-display font-semibold text-cream">{c.title}</h3>
                  <p className="mt-3 max-w-[52ch] text-[15px] leading-[1.7] text-cream-2">{c.copy}</p>
                  <ul className="mt-6 space-y-2.5">
                    {c.list.map((item) => (
                      <motion.li
                        key={item}
                        className="flex items-start gap-3 text-sm text-cream-2"
                        variants={{
                          hidden: { opacity: 0, transform: 'translateY(12px)' },
                          show: {
                            opacity: 1,
                            transform: 'translateY(0px)',
                            transition: { duration: 0.3, ease: EASE_OUT },
                          },
                        }}
                      >
                        <span aria-hidden className="mt-[7px] h-1.5 w-1.5 shrink-0 rotate-45 bg-gold" />
                        {item}
                      </motion.li>
                    ))}
                  </ul>
                  <div className="mt-8 flex flex-wrap items-center gap-5">
                    <PrimaryButton to={MAPS_URL} external>
                      Como chegar
                    </PrimaryButton>
                    <ArrowLink to={WHATSAPP_URL} external>
                      Avisar que vou
                    </ArrowLink>
                  </div>
                </div>
              </SpotlightCard>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
}

/** S3 · O que esperar — 4 passos conectados por hairline dourada */
function OQueEsperar() {
  const reduce = useReducedMotion();
  return (
    <section className="bg-ink py-[clamp(96px,14vh,160px)]" aria-label="O que esperar">
      <div className="container-brand">
        <SectionHeader eyebrow="PRIMEIRA VEZ?" title="O que esperar da sua visita" />

        <div className="relative mt-16">
          {/* Hairline conectora — desenha scaleX 0→1 (800ms --ease-in-out) */}
          <motion.span
            aria-hidden
            className="absolute left-[12.5%] right-[12.5%] top-[4px] hidden h-px bg-[rgba(210,178,100,0.25)] lg:block"
            style={{ transformOrigin: 'center' }}
            initial={reduce ? false : { transform: 'scaleX(0)' }}
            whileInView={{ transform: 'scaleX(1)' }}
            viewport={{ once: true, amount: 0.2 }}
            transition={{ duration: 0.8, ease: EASE_IN_OUT }}
          />
          <div className="grid gap-10 sm:grid-cols-2 lg:grid-cols-4">
            {PASSOS.map((p, i) => (
              <motion.div
                key={p.num}
                className="relative text-center"
                initial={reduce ? false : { opacity: 0, transform: 'translateY(32px)' }}
                whileInView={{ opacity: 1, transform: 'translateY(0px)' }}
                viewport={{ once: true, amount: 0.2 }}
                transition={{ duration: 0.5, delay: reduce ? 0 : i * 0.06, ease: EASE_OUT }}
              >
                <motion.span
                  aria-hidden
                  className="relative z-10 mx-auto block h-2 w-2 bg-gold"
                  initial={reduce ? false : { opacity: 0, transform: 'rotate(0deg)' }}
                  whileInView={{ opacity: 1, transform: 'rotate(45deg)' }}
                  viewport={{ once: true, amount: 0.2 }}
                  transition={{ duration: 0.3, delay: reduce ? 0 : 0.3 + i * 0.04, ease: EASE_OUT }}
                />
                <span className="mt-6 block font-display text-[2rem] italic leading-none text-gold-dark">
                  {p.num}
                </span>
                <h3 className="mt-3 font-display text-xl font-semibold text-cream">{p.title}</h3>
                <p className="mx-auto mt-2 max-w-[30ch] text-sm leading-relaxed text-cream-2">{p.text}</p>
              </motion.div>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}

/** S4 · Ministérios — grid 3×2 de SpotlightCards compactos */
function Ministerios() {
  const reduce = useReducedMotion();
  return (
    <section className="bg-ink-warm py-[clamp(96px,14vh,160px)]" aria-label="Ministérios">
      <div className="container-brand">
        <SectionHeader eyebrow="MINISTÉRIOS" title="Sirva com seus dons" />

        <div className="mt-16 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {MINISTERIOS.map((m, i) => (
            <motion.div
              key={m.title}
              initial={reduce ? false : { opacity: 0, transform: 'translateY(32px)' }}
              whileInView={{ opacity: 1, transform: 'translateY(0px)' }}
              viewport={{ once: true, amount: 0.2 }}
              transition={{ duration: 0.5, delay: reduce ? 0 : i * 0.05, ease: EASE_OUT }}
            >
              <SpotlightCard
                className="cultos-min-card card-brand flex h-full flex-col gap-3 !rounded-[2px] p-8"
                spotlightColor="rgba(210, 178, 100, 0.12)"
              >
                <span aria-hidden className="cultos-min-icon block h-2.5 w-2.5 rotate-45 bg-gold" />
                <h3 className="font-display text-xl font-semibold text-cream">{m.title}</h3>
                <p className="text-sm leading-relaxed text-cream-muted">{m.line}</p>
              </SpotlightCard>
            </motion.div>
          ))}
        </div>

        <div className="mt-12 text-center">
          <ArrowLink to={WHATSAPP_URL} external>
            Quero servir — fale conosco
          </ArrowLink>
        </div>
      </div>
    </section>
  );
}

/** S5 · FAQ — acordeão (mesmo componente do sobre.md S3) */
function Faq() {
  return (
    <section className="bg-ink py-[clamp(96px,14vh,160px)]" aria-label="Perguntas frequentes">
      <div className="container-brand">
        <SectionHeader eyebrow="DÚVIDAS" title="Perguntas frequentes" />
        <div className="mt-16">
          <EditorialAccordion items={FAQ} />
        </div>
      </div>
    </section>
  );
}

/** Pin dourado pulsante — único loop da página (1.6s --ease-out). Isolado + memo. */
const PulsingPin = memo(function PulsingPin() {
  const reduce = useReducedMotion();
  return (
    <div className="absolute inset-0 flex items-center justify-center">
      {/* Hairlines radiais — anéis concêntricos + crosshair */}
      <span aria-hidden className="absolute aspect-square h-[38%] rounded-full border border-[rgba(210,178,100,0.18)]" />
      <span aria-hidden className="absolute aspect-square h-[62%] rounded-full border border-[rgba(210,178,100,0.12)]" />
      <span aria-hidden className="absolute aspect-square h-[88%] rounded-full border border-[rgba(210,178,100,0.07)]" />
      <span aria-hidden className="absolute left-0 right-0 top-1/2 h-px bg-[rgba(210,178,100,0.1)]" />
      <span aria-hidden className="absolute bottom-0 left-1/2 top-0 w-px bg-[rgba(210,178,100,0.1)]" />

      {reduce ? (
        <img src="/icon-pin.svg" alt="" className="relative h-8 w-8" />
      ) : (
        <>
          {/* Ring hairline expandindo: opacity 0.6→0 */}
          <motion.span
            aria-hidden
            className="absolute h-16 w-16 rounded-full border border-gold"
            initial={{ opacity: 0.6, transform: 'scale(0.5)' }}
            animate={{ opacity: 0, transform: 'scale(1.4)' }}
            transition={{ duration: 1.6, repeat: Infinity, ease: EASE_OUT }}
          />
          {/* Pin: scale 1→1.15→1 */}
          <motion.img
            src="/icon-pin.svg"
            alt=""
            className="relative h-8 w-8"
            style={{ filter: 'drop-shadow(0 0 16px rgba(210,178,100,0.5))' }}
            animate={{ transform: ['scale(1)', 'scale(1.15)', 'scale(1)'] }}
            transition={{ duration: 1.6, repeat: Infinity, ease: EASE_IN_OUT }}
          />
        </>
      )}
    </div>
  );
});

/** S6 · Localização — faixa mapa (info | visual) */
function Localizacao() {
  const reduce = useReducedMotion();
  return (
    <section className="bg-ink-warm py-[clamp(96px,14vh,160px)]" aria-label="Como chegar">
      <div className="container-brand">
        <div className="grid items-center gap-12 lg:grid-cols-2">
          {/* Info */}
          <motion.div
            className="flex flex-col items-start gap-5"
            initial={reduce ? false : { opacity: 0, transform: 'translateY(24px)' }}
            whileInView={{ opacity: 1, transform: 'translateY(0px)' }}
            viewport={{ once: true, amount: 0.25 }}
            transition={{ duration: 0.5, ease: EASE_OUT }}
          >
            <div className="flex items-center gap-4">
              <motion.span
                aria-hidden
                className="block h-px w-12 bg-gold-dark"
                style={{ transformOrigin: 'center' }}
                initial={reduce ? false : { transform: 'scaleX(0)' }}
                whileInView={{ transform: 'scaleX(1)' }}
                viewport={{ once: true, amount: 0.2 }}
                transition={{ duration: 0.4, ease: EASE_OUT }}
              />
              <motion.span
                aria-hidden
                className="block h-1.5 w-1.5 rotate-45 bg-gold"
                initial={reduce ? false : { opacity: 0, transform: 'rotate(0deg) scale(0.9)' }}
                whileInView={{ opacity: 1, transform: 'rotate(45deg) scale(1)' }}
                viewport={{ once: true, amount: 0.2 }}
                transition={{ duration: 0.4, delay: reduce ? 0 : 0.1, ease: EASE_OUT }}
              />
              <span className="eyebrow">COMO CHEGAR</span>
            </div>
            <h3 className="fs-h3 font-display font-medium text-cream">
              Rua Paulina Oliveira Gomes, 1071
            </h3>
            <p className="flex items-center gap-2 text-base text-cream-2">
              <img src="/icon-pin.svg" alt="" className="h-5 w-5" aria-hidden />
              Jardim Amália · Ponta Grossa/PR
            </p>
            <div className="mt-2 flex flex-wrap items-center gap-4">
              <PrimaryButton to={MAPS_URL} external>
                Abrir no Google Maps
              </PrimaryButton>
              <GhostButton to={WHATSAPP_URL} external>
                WhatsApp
              </GhostButton>
            </div>
          </motion.div>

          {/* Visual — placeholder estilizado de mapa (sem iframe) */}
          <motion.div
            className="relative aspect-[4/3] overflow-hidden rounded-[2px] border border-[rgba(210,178,100,0.14)]"
            style={{
              background:
                'radial-gradient(ellipse 70% 60% at 50% 45%, rgba(250,170,10,0.06), transparent 65%), linear-gradient(180deg, #14100A 0%, #0B0B0B 100%)',
            }}
            initial={reduce ? false : { opacity: 0, transform: 'translateY(24px)' }}
            whileInView={{ opacity: 1, transform: 'translateY(0px)' }}
            viewport={{ once: true, amount: 0.25 }}
            transition={{ duration: 0.5, delay: reduce ? 0 : 0.1, ease: EASE_OUT }}
          >
            <PulsingPin />
          </motion.div>
        </div>
      </div>
    </section>
  );
}

export default function Cultos() {
  return (
    <>
      {/* Hover gate (pointer:fine) — glow do ícone losango (STANDARDS.md) */}
      <style>{`
        .cultos-min-icon { transition: box-shadow 250ms var(--ease-out); }
        @media (hover: hover) and (pointer: fine) {
          .cultos-min-card:hover .cultos-min-icon { box-shadow: 0 0 16px rgba(230,210,130,0.5); }
        }
      `}</style>
      <Hero />
      <CardsCulto />
      <OQueEsperar />
      <Ministerios />
      <Faq />
      <Localizacao />
    </>
  );
}

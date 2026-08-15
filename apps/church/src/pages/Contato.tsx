import { useEffect, useState } from 'react';
import type { FormEvent, ReactNode } from 'react';
import { AnimatePresence, motion, useReducedMotion } from 'framer-motion';
import BlurText from '../components/BlurText';
import GradientText from '../components/GradientText';
import SpotlightCard from '../components/SpotlightCard';
import ClickSpark from '../components/ClickSpark';
import { PrimaryButton, GhostButton } from '../components/Buttons';

const EASE_OUT = [0.23, 1, 0.32, 1] as [number, number, number, number];
const EASE_IN_OUT = [0.77, 0, 0.175, 1] as [number, number, number, number];
const GOLD_GRADIENT = ['#B4843C', '#E6D282', '#D2B264', '#F4EFE6'];

const MAPS_URL = 'https://maps.app.goo.gl/nKgD83xmGetsyDzKA';
const WA_URL = 'https://wa.me/5542999384069';

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
/* S1 · Hero compacto (50vh)                                           */
/* ------------------------------------------------------------------ */
function Hero() {
  const reduce = useReducedMotion();
  return (
    <section
      className="relative flex min-h-[50dvh] items-center justify-center overflow-hidden bg-ink"
      aria-label="Contato"
    >
      {/* Glow radial âmbar no topo */}
      <div
        className="pointer-events-none absolute inset-x-0 top-0 h-[70%]"
        style={{
          background:
            'radial-gradient(ellipse 70% 55% at 50% 0%, rgba(250,170,10,0.12), transparent 70%)',
        }}
        aria-hidden
      />

      <div className="container-brand relative z-[1] flex flex-col items-center py-24 text-center">
        {/* Eyebrow — 150ms */}
        <Deferred ms={150}>
          <BlurText
            text="CONTATO"
            animateBy="words"
            delay={60}
            stepDuration={0.35}
            easing={EASE_OUT}
            threshold={0.1}
            className="eyebrow justify-center"
            animationFrom={{ filter: 'blur(6px)', opacity: 0, y: 8 }}
            animationTo={[{ filter: 'blur(0px)', opacity: 1, y: 0 }]}
          />
        </Deferred>

        {/* H1 — delay 300ms, word-level, stagger 60ms */}
        <h1 className="fs-h1 mt-6 font-display font-medium text-cream">
          <Deferred ms={300}>
            <BlurText
              text="Vamos"
              animateBy="words"
              delay={60}
              stepDuration={0.5}
              easing={EASE_OUT}
              threshold={0.1}
              className="justify-center"
              animationFrom={{ filter: 'blur(10px)', opacity: 0, y: 16 }}
              animationTo={[{ filter: 'blur(0px)', opacity: 1, y: 0 }]}
            />
          </Deferred>{' '}
          <motion.span
            className="inline-block"
            initial={
              reduce
                ? { opacity: 0 }
                : { opacity: 0, transform: 'translateY(16px)', filter: 'blur(10px)' }
            }
            animate={
              reduce ? { opacity: 1 } : { opacity: 1, transform: 'translateY(0px)', filter: 'blur(0px)' }
            }
            transition={{ duration: reduce ? 0.2 : 0.6, delay: reduce ? 0 : 0.42, ease: EASE_OUT }}
          >
            <GradientText
              colors={GOLD_GRADIENT}
              animationSpeed={8}
              className="!mx-0 inline-flex !cursor-text !rounded-none !backdrop-blur-none"
            >
              conversar?
            </GradientText>
          </motion.span>
        </h1>

        {/* Lead — delay 650ms */}
        <motion.p
          className="fs-lead mt-6 max-w-[52ch] text-cream-2"
          initial={{ opacity: 0, transform: 'translateY(24px)' }}
          animate={{ opacity: 1, transform: 'translateY(0px)' }}
          transition={{ duration: reduce ? 0.2 : 0.6, delay: reduce ? 0 : 0.65, ease: EASE_OUT }}
        >
          Dúvidas, pedidos de oração ou planos de visita — nossa família está de portas abertas.
        </motion.p>
      </div>
    </section>
  );
}

/* ------------------------------------------------------------------ */
/* S2 · Canais rápidos — 3 cards                                       */
/* ------------------------------------------------------------------ */
const CHANNELS = [
  {
    icon: '/icon-whatsapp.svg',
    title: 'WhatsApp',
    info: '+55 42 99938-4069',
    extra: 'Resposta rápida em horário comercial.',
    cta: 'primary' as const,
    to: WA_URL,
    label: 'Chamar no WhatsApp',
  },
  {
    icon: '/icon-pin.svg',
    title: 'Visite-nos',
    info: 'Rua Paulina Oliveira Gomes, 1071 — Jardim Amália, Ponta Grossa/PR',
    extra: null,
    cta: 'ghost' as const,
    to: MAPS_URL,
    label: 'Abrir no Maps',
  },
  {
    icon: '/icon-clock.svg',
    title: 'Horários',
    info: 'Domingo 19h · Celebração',
    extra: 'Quarta 20h · Alinhamento',
    cta: 'ghost' as const,
    to: '/cultos',
    label: 'Sobre os cultos',
  },
];

function Channels() {
  const reduce = useReducedMotion();
  return (
    <section className="bg-ink-warm py-[clamp(96px,14vh,160px)]" aria-label="Canais rápidos">
      {/* Hover gate: glow do ícone */}
      <style>{`
        .ct-channel-icon { transition: filter 250ms cubic-bezier(0.23, 1, 0.32, 1); }
        @media (hover: hover) and (pointer: fine) {
          .ct-channel:hover .ct-channel-icon {
            filter: drop-shadow(0 0 12px rgba(230,210,130,0.5));
          }
        }
      `}</style>

      <div className="container-brand grid grid-cols-1 gap-6 md:grid-cols-3">
        {CHANNELS.map((c, i) => (
          <motion.div
            key={c.title}
            initial={{ opacity: 0, transform: 'translateY(40px)' }}
            whileInView={{ opacity: 1, transform: 'translateY(0px)' }}
            viewport={{ once: true, amount: 0.2 }}
            transition={{ duration: reduce ? 0.2 : 0.5, delay: reduce ? 0 : i * 0.06, ease: EASE_OUT }}
            className="h-full"
          >
            <SpotlightCard
              spotlightColor="rgba(210, 178, 100, 0.12)"
              className="ct-channel card-brand flex h-full flex-col p-8 lg:p-10"
            >
              <img src={c.icon} alt="" width={48} height={48} className="ct-channel-icon h-12 w-12" aria-hidden />
              <h2 className="mt-6 font-display text-2xl font-semibold text-cream">{c.title}</h2>
              <p className="mt-3 text-sm leading-[1.7] text-cream-2">{c.info}</p>
              {c.extra && <p className="mt-1 text-sm leading-[1.7] text-cream-2">{c.extra}</p>}
              <div className="mt-8 flex-1" />
              <div>
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
    </section>
  );
}

/* ------------------------------------------------------------------ */
/* S3 · Formulário — "Envie uma mensagem ou pedido de oração"          */
/* ------------------------------------------------------------------ */
const FIELD_CLS =
  'peer w-full rounded-sm border border-[rgba(210,178,100,0.18)] bg-ink-warm px-[18px] pb-2 pt-5 text-[15px] text-cream outline-none transition-[border-color,box-shadow] duration-150 placeholder-transparent focus:border-gold focus:shadow-[0_0_0_3px_rgba(210,178,100,0.12)]';
const LABEL_CLS =
  'pointer-events-none absolute left-[18px] top-[19px] origin-left text-[15px] text-cream-muted transition-[transform,color] duration-200 peer-focus:-translate-y-3 peer-focus:scale-[0.85] peer-focus:text-gold peer-[:not(:placeholder-shown)]:-translate-y-3 peer-[:not(:placeholder-shown)]:scale-[0.85]';
const LABEL_FLOAT_CLS =
  'pointer-events-none absolute left-[18px] top-[19px] origin-left -translate-y-3 scale-[0.85] text-[15px] text-gold';

function ContactForm() {
  const reduce = useReducedMotion();
  const [sending, setSending] = useState(false);
  const [sent, setSent] = useState(false);

  const onSubmit = (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (sending) return;
    setSending(true);
    // Frontend-only (mock): simula envio e mostra o estado de sucesso
    window.setTimeout(() => {
      setSending(false);
      setSent(true);
    }, 1200);
  };

  return (
    <section className="bg-ink py-[clamp(96px,14vh,160px)]" aria-label="Envie uma mensagem ou pedido de oração">
      <div className="container-brand">
        <div className="mx-auto max-w-[640px]">
          <div className="flex flex-col items-center gap-5 text-center">
            <span className="eyebrow">MENSAGEM</span>
            <h2 className="fs-h2 font-display font-medium text-cream">Como podemos te ajudar?</h2>
            <img src="/icon-heart.svg" alt="" width={24} height={24} className="h-6 w-6" aria-hidden />
          </div>

          <div className="mt-12">
            <AnimatePresence mode="wait">
              {!sent ? (
                <motion.form
                  key="form"
                  onSubmit={onSubmit}
                  className="flex flex-col gap-5"
                  initial={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  transition={{ duration: reduce ? 0 : 0.2, ease: EASE_IN_OUT }}
                >
                  <div className="relative">
                    <input id="ct-nome" name="nome" type="text" required placeholder=" " autoComplete="name" className={FIELD_CLS} style={{ transitionTimingFunction: 'var(--ease-out)' }} />
                    <label htmlFor="ct-nome" className={LABEL_CLS} style={{ transitionTimingFunction: 'var(--ease-out)' }}>
                      Nome
                    </label>
                  </div>

                  <div className="relative">
                    <input id="ct-contato" name="contato" type="text" required placeholder=" " autoComplete="email" className={FIELD_CLS} style={{ transitionTimingFunction: 'var(--ease-out)' }} />
                    <label htmlFor="ct-contato" className={LABEL_CLS} style={{ transitionTimingFunction: 'var(--ease-out)' }}>
                      WhatsApp ou e-mail
                    </label>
                  </div>

                  <div className="relative">
                    <select
                      id="ct-assunto"
                      name="assunto"
                      defaultValue="Quero visitar"
                      className={`${FIELD_CLS} appearance-none pr-12`}
                      style={{ transitionTimingFunction: 'var(--ease-out)' }}
                    >
                      <option>Quero visitar</option>
                      <option>Pedido de oração</option>
                      <option>Ministérios</option>
                      <option>Projeto Nova Casa</option>
                      <option>Outro</option>
                    </select>
                    <label htmlFor="ct-assunto" className={LABEL_FLOAT_CLS}>
                      Assunto
                    </label>
                    <svg
                      width="12"
                      height="8"
                      viewBox="0 0 12 8"
                      fill="none"
                      aria-hidden
                      className="pointer-events-none absolute right-[18px] top-1/2 -translate-y-1/2"
                    >
                      <path d="M1 1.5l5 5 5-5" stroke="#D2B264" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                    </svg>
                  </div>

                  <div className="relative">
                    <textarea id="ct-mensagem" name="mensagem" rows={5} placeholder=" " className={`${FIELD_CLS} resize-y`} style={{ transitionTimingFunction: 'var(--ease-out)' }} />
                    <label htmlFor="ct-mensagem" className={LABEL_CLS} style={{ transitionTimingFunction: 'var(--ease-out)' }}>
                      Mensagem
                    </label>
                  </div>

                  <ClickSpark sparkColor="#E6D282" sparkCount={8} sparkRadius={24}>
                    <button
                      type="submit"
                      disabled={sending}
                      className={`block w-full rounded-full bg-gold px-8 py-3.5 text-sm font-semibold text-ink transition-[background-color,box-shadow,transform] duration-200 hover:bg-gold-light hover:shadow-[0_0_32px_rgba(230,210,130,0.25)] active:scale-[0.97] disabled:cursor-wait ${
                        sending ? 'animate-pulse [animation-duration:1s]' : ''
                      }`}
                    >
                      {sending ? 'Enviando…' : 'Enviar mensagem'}
                    </button>
                  </ClickSpark>

                  <p className="text-center text-xs text-cream-muted">
                    Suas informações são tratadas com carinho e confidencialidade.
                  </p>
                </motion.form>
              ) : (
                <motion.div
                  key="success"
                  className="card-brand flex flex-col items-center gap-4 p-12 text-center"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ duration: reduce ? 0 : 0.35, ease: EASE_OUT }}
                  role="status"
                >
                  <motion.img
                    src="/flame.webp"
                    alt=""
                    width={48}
                    height={48}
                    className="h-12 w-auto"
                    initial={reduce ? { opacity: 0 } : { opacity: 0, transform: 'scale(0.9)' }}
                    animate={reduce ? { opacity: 1 } : { opacity: 1, transform: 'scale(1)' }}
                    transition={{ duration: reduce ? 0 : 0.35, ease: EASE_OUT }}
                    aria-hidden
                  />
                  <p className="font-display text-[1.75rem] text-cream">Mensagem enviada com amor.</p>
                  <p className="text-sm text-cream-2">Responderemos em breve. Deus abençoe!</p>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </div>
      </div>
    </section>
  );
}

/* ------------------------------------------------------------------ */
/* S4 · Localização + horários (faixa dupla)                           */
/* ------------------------------------------------------------------ */
const INFO_ROWS = [
  { label: 'Endereço', value: 'Rua Paulina Oliveira Gomes, 1071' },
  { label: 'Bairro', value: 'Jardim Amália' },
  { label: 'Cidade', value: 'Ponta Grossa · PR' },
];

function LocationBand() {
  const reduce = useReducedMotion();
  return (
    <section className="bg-ink-warm py-[clamp(96px,14vh,160px)]" aria-label="Como chegar">
      {/* Pulso do pin do mapa (loop 1.6s) */}
      <style>{`
        @keyframes ct-pin-pulse {
          0% { transform: scale(0.9); opacity: 0.8; }
          70% { transform: scale(2.2); opacity: 0; }
          100% { transform: scale(2.2); opacity: 0; }
        }
        .ct-pin-ring { animation: ct-pin-pulse 1.6s cubic-bezier(0.23, 1, 0.32, 1) infinite; }
        @media (prefers-reduced-motion: reduce) {
          .ct-pin-ring { animation: none; opacity: 0.3; transform: scale(1.6); }
        }
      `}</style>

      <div className="container-brand grid grid-cols-1 gap-12 lg:grid-cols-2 lg:gap-16">
        {/* Info */}
        <div>
          <span className="eyebrow">COMO CHEGAR</span>
          <h2 className="fs-h3 mt-5 font-display font-semibold text-cream">
            Jardim Amália, Ponta Grossa/PR
          </h2>

          <ul className="mt-8">
            {INFO_ROWS.map((r, i) => (
              <motion.li
                key={r.label}
                className="flex items-baseline justify-between gap-6 border-b border-[rgba(216,207,191,0.08)] py-4"
                initial={{ opacity: 0, transform: 'translateY(16px)' }}
                whileInView={{ opacity: 1, transform: 'translateY(0px)' }}
                viewport={{ once: true, amount: 0.2 }}
                transition={{ duration: reduce ? 0.2 : 0.5, delay: reduce ? 0 : 0.1 + i * 0.04, ease: EASE_OUT }}
              >
                <span className="text-xs uppercase tracking-[0.2em] text-cream-muted">{r.label}</span>
                <span className="text-right text-[15px] text-cream">{r.value}</span>
              </motion.li>
            ))}
            {[
              { label: 'Domingo', value: '19h — Celebração' },
              { label: 'Quarta', value: '20h — Alinhamento' },
            ].map((r, i) => (
              <motion.li
                key={r.label}
                className="flex items-baseline justify-between gap-6 border-b border-[rgba(216,207,191,0.08)] py-4"
                initial={{ opacity: 0, transform: 'translateY(16px)' }}
                whileInView={{ opacity: 1, transform: 'translateY(0px)' }}
                viewport={{ once: true, amount: 0.2 }}
                transition={{
                  duration: reduce ? 0.2 : 0.5,
                  delay: reduce ? 0 : 0.1 + (INFO_ROWS.length + i) * 0.04,
                  ease: EASE_OUT,
                }}
              >
                <span className="text-xs uppercase tracking-[0.2em] text-cream-muted">{r.label}</span>
                <span className="text-right font-display text-lg font-semibold text-gold">{r.value}</span>
              </motion.li>
            ))}
          </ul>

          <motion.div
            className="mt-10 flex flex-wrap gap-4"
            initial={{ opacity: 0, transform: 'translateY(16px)' }}
            whileInView={{ opacity: 1, transform: 'translateY(0px)' }}
            viewport={{ once: true, amount: 0.2 }}
            transition={{ duration: reduce ? 0.2 : 0.5, delay: reduce ? 0 : 0.35, ease: EASE_OUT }}
          >
            <PrimaryButton to={MAPS_URL} external>
              Abrir no Google Maps
            </PrimaryButton>
            <GhostButton to={WA_URL} external>
              WhatsApp
            </GhostButton>
          </motion.div>
        </div>

        {/* Mapa estilizado (placeholder) */}
        <motion.div
          className="relative aspect-[4/3] overflow-hidden rounded-sm border border-[rgba(210,178,100,0.14)]"
          style={{
            background:
              'radial-gradient(ellipse 80% 70% at 50% 45%, rgba(210,178,100,0.08), rgba(20,16,10,0.9) 60%, #0B0B0B 100%)',
          }}
          initial={{ opacity: 0 }}
          whileInView={{ opacity: 1 }}
          viewport={{ once: true, amount: 0.2 }}
          transition={{ duration: reduce ? 0.2 : 0.6, ease: EASE_OUT }}
          aria-label="Mapa estilizado — Jardim Amália, Ponta Grossa"
          role="img"
        >
          {/* Hairlines radiais */}
          {[0, 30, 60, 90, 120, 150].map((deg) => (
            <span
              key={deg}
              className="absolute left-1/2 top-1/2 h-px w-[70%] origin-left bg-[rgba(216,207,191,0.06)]"
              style={{ transform: `rotate(${deg}deg)` }}
              aria-hidden
            />
          ))}
          {/* Anel pulsante + pin dourado */}
          <span
            className="ct-pin-ring absolute left-1/2 top-1/2 h-10 w-10 -translate-x-1/2 -translate-y-1/2 rounded-full border border-gold"
            aria-hidden
          />
          <span
            className="absolute left-1/2 top-1/2 h-2.5 w-2.5 -translate-x-1/2 -translate-y-1/2 rounded-full bg-gold shadow-[0_0_24px_rgba(210,178,100,0.6)]"
            aria-hidden
          />
          {/* Overlay de canto */}
          <span className="absolute bottom-3 left-3 text-[10px] font-semibold uppercase tracking-[0.2em] text-cream-muted">
            Jardim Amália · PG
          </span>
        </motion.div>
      </div>
    </section>
  );
}

/* ------------------------------------------------------------------ */
/* S5 · Fechamento                                                     */
/* ------------------------------------------------------------------ */
function Closing() {
  const reduce = useReducedMotion();
  return (
    <section className="bg-ink py-[clamp(96px,14vh,160px)]" aria-label="Versículo">
      <motion.div
        className="container-brand flex flex-col items-center text-center"
        initial={{ opacity: 0, transform: 'translateY(20px)' }}
        whileInView={{ opacity: 1, transform: 'translateY(0px)' }}
        viewport={{ once: true, amount: 0.25 }}
        transition={{ duration: reduce ? 0.2 : 0.5, ease: EASE_OUT }}
      >
        <p className="max-w-[28ch] font-display text-2xl italic text-cream-2">
          “Acima de tudo, revistam-se do amor.”
        </p>
        <p className="eyebrow mt-6">— Colossenses 3:14</p>
      </motion.div>
    </section>
  );
}

export default function Contato() {
  return (
    <>
      <Hero />
      <Channels />
      <ContactForm />
      <LocationBand />
      <Closing />
    </>
  );
}

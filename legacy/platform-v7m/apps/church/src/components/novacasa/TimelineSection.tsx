import { useRef } from 'react';
import { gsap } from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import { useGSAP } from '@gsap/react';

gsap.registerPlugin(ScrollTrigger, useGSAP);

type Phase = {
  num: string;
  title: string;
  text: string;
  status: 'done' | 'active' | 'next';
  badge?: string;
};

const PHASES: Phase[] = [
  {
    num: '01',
    title: 'Fundação',
    text: 'Terreno preparado, fundações concretadas. A base está firme.',
    status: 'done',
    badge: 'Concluída',
  },
  {
    num: '02',
    title: 'Estrutura',
    text: 'Pilares e lajes subindo. A estrutura do nosso sonho ganha altura.',
    status: 'active',
    badge: 'Em andamento',
  },
  {
    num: '03',
    title: 'Vedação e cobertura',
    text: 'Paredes, telhado e esquadrias: a casa se fecha contra o tempo.',
    status: 'next',
  },
  {
    num: '04',
    title: 'Acabamento e dedicação',
    text: 'Interiores, som, iluminação — e a grande festa de inauguração.',
    status: 'next',
  },
];

function StatusMark({ status }: { status: Phase['status'] }) {
  if (status === 'done') {
    // ✓ concluída
    return (
      <svg width="16" height="16" viewBox="0 0 16 16" fill="none" aria-hidden className="shrink-0">
        <circle cx="8" cy="8" r="7" stroke="#A8B86B" strokeWidth="1.5" />
        <path d="M5 8.2l2 2 4-4.4" stroke="#A8B86B" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
    );
  }
  if (status === 'active') {
    // ◐ em andamento
    return (
      <svg width="16" height="16" viewBox="0 0 16 16" fill="none" aria-hidden className="shrink-0">
        <circle cx="8" cy="8" r="7" stroke="#FAAA0A" strokeWidth="1.5" />
        <path d="M8 1a7 7 0 0 1 0 14V1z" fill="#FAAA0A" opacity="0.85" />
      </svg>
    );
  }
  // ○ próxima / futura
  return (
    <svg width="16" height="16" viewBox="0 0 16 16" fill="none" aria-hidden className="shrink-0">
      <circle cx="8" cy="8" r="7" stroke="#B3A996" strokeWidth="1.5" opacity="0.6" />
    </svg>
  );
}

/**
 * S3 · Timeline das fases — pinned 200vh, scroll-driven (GSAP ScrollTrigger, scrub 1.0).
 * Isolada de Framer Motion (regra de isolamento de bibliotecas).
 * Reduced-motion: pin desativado — cartões em fluxo vertical estático.
 */
export default function TimelineSection() {
  const sectionRef = useRef<HTMLElement>(null);
  const barRef = useRef<HTMLDivElement>(null);
  const pctRef = useRef<HTMLSpanElement>(null);

  useGSAP(
    () => {
      const section = sectionRef.current;
      if (!section) return;
      const mm = gsap.matchMedia();

      mm.add('(prefers-reduced-motion: no-preference)', () => {
        const cards = gsap.utils.toArray<HTMLElement>('.nc-phase', section);
        const stack = section.querySelector<HTMLElement>('.nc-phase-stack');
        const head = section.querySelector<HTMLElement>('.nc-timeline-head');
        if (!cards.length || !stack) return;

        // Layout de pin: cartões empilhados (stack absoluto)
        gsap.set(stack, { height: 400 });
        gsap.set(cards, { position: 'absolute', top: 0, left: 0, right: 0 });
        gsap.set(cards.slice(1), { autoAlpha: 0, y: 60 });

        // Entrada do cabeçalho da seção
        if (head) {
          gsap.fromTo(
            head,
            { autoAlpha: 0, y: 24 },
            {
              autoAlpha: 1,
              y: 0,
              duration: 0.6,
              ease: 'power2.out',
              scrollTrigger: { trigger: section, start: 'top 70%', once: true },
            }
          );
        }

        const tl = gsap.timeline({
          defaults: { ease: 'none' },
          scrollTrigger: {
            trigger: section,
            start: 'top top',
            end: '+=200%',
            pin: true,
            scrub: 1,
            anticipatePin: 1,
            onUpdate: (self) => {
              if (pctRef.current) {
                pctRef.current.textContent = `${Math.round(self.progress * 100)}%`;
              }
            },
          },
        });

        for (let i = 1; i < cards.length; i++) {
          const at = i - 1;
          // Cartão ativo: translateY 60px→0 + opacity 0→1
          tl.to(cards[i], { autoAlpha: 1, y: 0, duration: 1 }, at);
          // Cartão anterior recua: opacity→0.35 + scale 0.98
          tl.to(cards[i - 1], { autoAlpha: 0.35, scale: 0.98, y: -16, duration: 1 }, at);
          // Cartões mais antigos saem de cena
          if (i >= 2) {
            tl.to(cards[i - 2], { autoAlpha: 0, duration: 0.6 }, at);
          }
        }

        // Contador de progresso preenche scaleX conforme scroll (origin left)
        tl.fromTo(
          barRef.current,
          { scaleX: 0 },
          { scaleX: 1, duration: cards.length - 1, ease: 'none' },
          0
        );
      });

      return () => mm.revert();
    },
    { scope: sectionRef }
  );

  return (
    <section ref={sectionRef} id="fases" className="relative bg-ink-warm" aria-label="Fases da obra">
      <style>{`
        @keyframes nc-badge-pulse {
          from { opacity: 0.6; }
          to { opacity: 1; }
        }
        .nc-badge-pulse { animation: nc-badge-pulse 1.4s cubic-bezier(0.23, 1, 0.32, 1) infinite alternate; }
        @media (prefers-reduced-motion: reduce) {
          .nc-badge-pulse { animation: none; }
        }
      `}</style>

      <div className="flex min-h-[100dvh] items-center py-24">
        <div className="container-brand grid w-full gap-14 lg:grid-cols-[minmax(0,5fr)_minmax(0,7fr)] lg:gap-20">
          {/* Coluna esquerda (sticky no pin) */}
          <div className="nc-timeline-head flex flex-col items-start gap-6">
            <span className="eyebrow">FASES DA OBRA</span>
            <h2 className="fs-h2 font-display font-medium text-cream">Do alicerce ao altar</h2>
            {/* Contador de progresso geral */}
            <div className="mt-2 flex items-center gap-4">
              <div className="relative h-px w-[200px] bg-[rgba(216,207,191,0.12)]">
                <div
                  ref={barRef}
                  className="absolute inset-0 bg-gold"
                  style={{ transform: 'scaleX(1)', transformOrigin: 'left' }}
                  aria-hidden
                />
              </div>
              <span ref={pctRef} className="font-display text-xl font-semibold text-gold">
                100%
              </span>
            </div>
            <p className="max-w-[40ch] text-sm leading-[1.7] text-cream-muted">
              Quatro fases, um só propósito: uma casa para a família e um farol para o bairro.
            </p>
          </div>

          {/* Coluna direita: cartões de fase (stack no pin / fluxo estático sem motion) */}
          <div className="nc-phase-stack relative flex flex-col gap-6">
            {PHASES.map((p) => (
              <article
                key={p.num}
                className="nc-phase rounded-sm border border-[rgba(250,170,10,0.18)] bg-ink p-8 lg:p-10"
              >
                <div className="flex items-start justify-between gap-6">
                  <span className="font-display text-[2.5rem] italic leading-none text-gold-dark">
                    {p.num}
                  </span>
                  {p.badge && (
                    <span
                      className={`inline-flex items-center gap-2 rounded-full border px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.18em] ${
                        p.status === 'done'
                          ? 'border-[rgba(168,184,107,0.35)] bg-[rgba(168,184,107,0.1)] text-[#B9C983]'
                          : 'nc-badge-pulse border-[rgba(250,170,10,0.4)] bg-[rgba(250,170,10,0.1)] text-flame-amber'
                      }`}
                    >
                      {p.badge}
                    </span>
                  )}
                </div>
                <h3 className="mt-4 font-display text-2xl font-semibold text-cream">
                  Fase {p.num} — {p.title}
                </h3>
                <p className="mt-3 text-sm leading-[1.7] text-cream-2">{p.text}</p>
                {/* Hairline de status */}
                <div className="mt-6 flex items-center gap-3 border-t border-[rgba(216,207,191,0.08)] pt-4">
                  <StatusMark status={p.status} />
                  <span className="text-xs uppercase tracking-[0.2em] text-cream-muted">
                    {p.status === 'done' ? 'Concluída' : p.status === 'active' ? 'Em andamento' : 'Próxima fase'}
                  </span>
                </div>
              </article>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}

import { useRef, useState } from 'react';
import { motion, useReducedMotion } from 'framer-motion';
import SpotlightCard from '../SpotlightCard';
import SectionHeader from '../SectionHeader';

const EASE_OUT = [0.23, 1, 0.32, 1] as [number, number, number, number];

const DNA = [
  { numeral: 'I.', title: 'Fé', desc: 'O fundamento inabalável de tudo o que somos e fazemos.' },
  { numeral: 'II.', title: 'Unidade', desc: 'Um só corpo, um só propósito, um só coração.' },
  { numeral: 'III.', title: 'Família', desc: 'Ninguém caminha sozinho; aqui, você pertence.' },
  { numeral: 'IV.', title: 'Palavra', desc: 'A Escritura como lâmpada e direção para a vida.' },
  { numeral: 'V.', title: 'Amor', desc: 'O vínculo perfeito que nos reveste acima de tudo.' },
  { numeral: 'VI.', title: 'Serviço', desc: 'Servir é a nossa forma mais concreta de amar.' },
];

/** S4 · DNA — "A essência de quem somos" */
export default function DnaSection() {
  const reduce = useReducedMotion();
  const revealedRef = useRef(0);
  const [shimmer, setShimmer] = useState(false);

  // Delight raro (gate de frequência): shimmer uma única vez por sessão
  const handleRevealComplete = () => {
    revealedRef.current += 1;
    if (revealedRef.current >= DNA.length && !shimmer) {
      try {
        if (sessionStorage.getItem('dna-shimmered')) return;
        sessionStorage.setItem('dna-shimmered', '1');
      } catch {
        /* storage indisponível — segue sem shimmer persistente */
      }
      setShimmer(true);
    }
  };

  return (
    <section className="bg-ink-warm py-[clamp(96px,14vh,160px)]" aria-label="Nosso DNA">
      <div className="container-brand">
        <SectionHeader
          eyebrow="NOSSO DNA"
          title="A essência de quem somos"
          lead="Seis valores que sustentam cada passo da nossa família."
        />

        <div className="relative mt-16">
          <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {DNA.map((d, i) => (
              <motion.div
                key={d.title}
                initial={reduce ? { opacity: 0 } : { opacity: 0, transform: 'translateY(32px)' }}
                whileInView={reduce ? { opacity: 1 } : { opacity: 1, transform: 'translateY(0px)' }}
                viewport={{ once: true, amount: 0.2 }}
                transition={{ duration: reduce ? 0.2 : 0.5, delay: reduce ? 0 : i * 0.05, ease: EASE_OUT }}
                onAnimationComplete={handleRevealComplete}
              >
                <SpotlightCard
                  className="dna-card h-full rounded-[2px] border border-[rgba(210,178,100,0.14)] bg-ink p-8 transition-[border-color,transform,box-shadow] [transition-duration:250ms]"
                  spotlightColor="rgba(210, 178, 100, 0.12)"
                >
                  <span className="dna-numeral font-display text-xl italic text-gold-dark">
                    {d.numeral}
                  </span>
                  <h3 className="mt-4 font-display text-2xl font-semibold text-cream">{d.title}</h3>
                  <p className="mt-3 text-[15px] leading-relaxed text-cream-2">{d.desc}</p>
                </SpotlightCard>
              </motion.div>
            ))}
          </div>

          {shimmer && (
            <div className="pointer-events-none absolute inset-0 overflow-hidden" aria-hidden>
              <div
                className="absolute inset-y-0 w-1/2 animate-dna-shimmer"
                style={{
                  background:
                    'linear-gradient(100deg, transparent, rgba(230,210,130,0.12) 45%, rgba(230,210,130,0.2) 50%, rgba(230,210,130,0.12) 55%, transparent)',
                }}
              />
            </div>
          )}
        </div>
      </div>
    </section>
  );
}

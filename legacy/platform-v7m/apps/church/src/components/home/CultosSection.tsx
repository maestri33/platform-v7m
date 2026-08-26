import { motion, useReducedMotion } from 'framer-motion';
import SpotlightCard from '../SpotlightCard';
import SectionHeader from '../SectionHeader';
import { ArrowLink } from '../Buttons';

const EASE_OUT = [0.23, 1, 0.32, 1] as [number, number, number, number];
const MAPS_URL = 'https://maps.app.goo.gl/nKgD83xmGetsyDzKA';

const CULTOS = [
  {
    eyebrow: 'DOMINGO',
    time: '19h',
    title: 'Celebração',
    copy: 'Louvor, Palavra e comunhão — a igreja reunida em família.',
    img: '/cultos-celebracao.jpg',
  },
  {
    eyebrow: 'QUARTA',
    time: '20h',
    title: 'Alinhamento',
    copy: 'Estudo da Palavra, oração e direção para a semana.',
    img: '/cultos-alinhamento.jpg',
  },
];

/** S3 · Cultos — "Momentos que nos reúnem" */
export default function CultosSection() {
  const reduce = useReducedMotion();
  return (
    <section className="bg-ink py-[clamp(96px,14vh,160px)]" aria-label="Cultos">
      <div className="container-brand">
        <SectionHeader eyebrow="CULTOS" title="Momentos que nos reúnem" />

        <div className="mt-16 grid gap-8 md:grid-cols-2">
          {CULTOS.map((c, i) => (
            <motion.div
              key={c.title}
              initial={reduce ? { opacity: 0 } : { opacity: 0, transform: 'translateY(48px)' }}
              whileInView={reduce ? { opacity: 1 } : { opacity: 1, transform: 'translateY(0px)' }}
              viewport={{ once: true, amount: 0.2 }}
              transition={{ duration: reduce ? 0.2 : 0.6, delay: reduce ? 0 : i * 0.08, ease: EASE_OUT }}
            >
              <SpotlightCard
                className="card-brand culto-card group !rounded-[2px] !p-0"
                spotlightColor="rgba(210, 178, 100, 0.12)"
              >
                <div className="relative h-[420px] overflow-hidden">
                  <img
                    src={c.img}
                    alt=""
                    className="culto-card-img absolute inset-0 h-full w-full object-cover"
                    loading="lazy"
                  />
                  <div
                    className="absolute inset-0"
                    style={{
                      background:
                        'linear-gradient(180deg, rgba(11,11,11,0.2), rgba(11,11,11,0.92) 75%)',
                    }}
                    aria-hidden
                  />
                  <div className="absolute inset-x-0 bottom-0 flex flex-col gap-2 p-8 md:p-10">
                    <span className="eyebrow">{c.eyebrow}</span>
                    <span
                      className="font-display font-semibold text-gold"
                      style={{ fontSize: 'clamp(3rem, 6vw, 4.5rem)', lineHeight: 1 }}
                    >
                      {c.time}
                    </span>
                    <h3 className="fs-h3 font-display font-semibold text-cream">{c.title}</h3>
                    <p className="max-w-[40ch] text-[15px] leading-relaxed text-cream-2">{c.copy}</p>
                    <ArrowLink to={MAPS_URL} external className="mt-2">
                      Como chegar
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

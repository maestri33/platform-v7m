import { motion, useReducedMotion } from 'framer-motion';
import { PrimaryButton, ArrowLink } from '../Buttons';

const EASE_OUT = [0.23, 1, 0.32, 1] as [number, number, number, number];
const MAPS_URL = 'https://maps.app.goo.gl/nKgD83xmGetsyDzKA';
const WHATSAPP_URL = 'https://wa.me/5542999384069';

/** S7 · Visite-nos — faixa final de conversão (sem stagger) */
export default function VisitBand() {
  const reduce = useReducedMotion();
  return (
    <section className="border-t border-[rgba(210,178,100,0.15)] bg-ink-warm" aria-label="Visite-nos">
      <div className="container-brand py-[clamp(96px,14vh,160px)]">
        <motion.div
          className="mx-auto flex max-w-[560px] flex-col items-center gap-6 text-center"
          initial={reduce ? { opacity: 0 } : { opacity: 0, transform: 'translateY(24px)' }}
          whileInView={reduce ? { opacity: 1 } : { opacity: 1, transform: 'translateY(0px)' }}
          viewport={{ once: true, amount: 0.25 }}
          transition={{ duration: reduce ? 0.2 : 0.5, ease: EASE_OUT }}
        >
          <h3 className="fs-h3 font-display font-medium text-cream">
            Há um lugar para você nesta família.
          </h3>
          <p className="text-sm leading-relaxed text-cream-muted">
            Domingo às 19h · Rua Paulina Oliveira Gomes, 1071 — Jardim Amália, Ponta Grossa/PR
          </p>
          <div className="mt-2 flex flex-wrap items-center justify-center gap-6">
            <PrimaryButton to={WHATSAPP_URL} external>
              Falar no WhatsApp
            </PrimaryButton>
            <ArrowLink to={MAPS_URL} external>
              Ver no mapa
            </ArrowLink>
          </div>
        </motion.div>
      </div>
    </section>
  );
}

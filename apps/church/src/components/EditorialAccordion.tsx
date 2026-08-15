import { useState } from 'react';
import { motion, useReducedMotion } from 'framer-motion';
import { Plus } from 'lucide-react';

const EASE_OUT = [0.23, 1, 0.32, 1] as [number, number, number, number];
const EASE_DRAWER = [0.32, 0.72, 0, 1] as [number, number, number, number];

const ROMAN = ['I', 'II', 'III', 'IV', 'V', 'VI', 'VII', 'VIII'];

export type EditorialAccordionItem = {
  title: string;
  body: string;
};

type Props = {
  items: EditorialAccordionItem[];
  /** Mostra numeral romano Cormorant itálico --gold-dark antes do título (sobre.md S3) */
  numerals?: boolean;
};

/**
 * Acordeão editorial (sobre.md S3 / cultos.md S5):
 * hairlines rgba(216,207,191,0.08) entre itens, título Cormorant 600,
 * chevron + rotaciona 45° (200ms), altura animada --ease-drawer 300ms,
 * sanfona (um aberto por vez), interruptível (framer-motion retarget).
 */
export default function EditorialAccordion({ items, numerals = false }: Props) {
  const [openIndex, setOpenIndex] = useState<number | null>(null);
  const reduce = useReducedMotion();

  return (
    <div className="mx-auto w-full max-w-[800px] border-t border-[rgba(216,207,191,0.08)]">
      {items.map((item, i) => {
        const open = openIndex === i;
        return (
          <motion.div
            key={item.title}
            className="border-b border-[rgba(216,207,191,0.08)]"
            initial={reduce ? false : { opacity: 0, transform: 'translateY(24px)' }}
            whileInView={{ opacity: 1, transform: 'translateY(0px)' }}
            viewport={{ once: true, amount: 0.2 }}
            transition={{ duration: 0.5, delay: reduce ? 0 : i * 0.05, ease: EASE_OUT }}
          >
            <button
              type="button"
              aria-expanded={open}
              onClick={() => setOpenIndex(open ? null : i)}
              className="group flex w-full items-center gap-6 py-6 text-left"
            >
              {numerals && (
                <span
                  aria-hidden
                  className="w-8 shrink-0 font-display text-xl italic text-gold-dark"
                >
                  {ROMAN[i]}.
                </span>
              )}
              <span className="flex-1 font-display font-semibold leading-[1.2] text-cream text-[clamp(1.5rem,3vw,2rem)]">
                {item.title}
              </span>
              <motion.span
                aria-hidden
                className="shrink-0 text-gold"
                initial={false}
                animate={{ transform: open ? 'rotate(45deg)' : 'rotate(0deg)' }}
                transition={{ duration: reduce ? 0 : 0.2, ease: EASE_OUT }}
              >
                <Plus size={22} strokeWidth={1.5} />
              </motion.span>
            </button>
            <motion.div
              initial={false}
              animate={{ height: open ? 'auto' : 0 }}
              transition={{ duration: reduce ? 0 : 0.3, ease: EASE_DRAWER }}
              className="overflow-hidden"
            >
              <p
                className={`max-w-[60ch] pb-6 text-[15px] leading-[1.7] text-cream-2 ${
                  numerals ? 'pl-14' : ''
                }`}
              >
                {item.body}
              </p>
            </motion.div>
          </motion.div>
        );
      })}
    </div>
  );
}

import { motion, useReducedMotion } from 'framer-motion';
import { CreditCard, QrCode, Check } from 'lucide-react';
import type { PaymentMethod } from '@/api/contract';
import {
  MOTION,
  pressMotion,
  shouldAnimateHover,
  useFinePointerHover,
} from './motion';

export interface MethodCardsProps {
  selected: PaymentMethod | null;
  onSelect: (method: PaymentMethod) => void;
}

interface MethodConfig {
  id: PaymentMethod;
  title: string;
  description: string;
  icon: React.ComponentType<{ className?: string; 'aria-hidden'?: boolean }>;
  badge: string;
}

const METHODS: MethodConfig[] = [
  {
    id: 'pix',
    title: 'Pix',
    description: 'Pague com QR Code ou copia-cola. Confirmação em segundos.',
    icon: QrCode,
    badge: 'Instantâneo',
  },
  {
    id: 'cartao',
    title: 'Cartão de crédito',
    description: 'Você será redirecionado para o checkout seguro do provedor.',
    icon: CreditCard,
    badge: 'Recorrente seguro',
  },
];

export default function MethodCards({ selected, onSelect }: MethodCardsProps) {
  const reduce = useReducedMotion();
  const animateHover = shouldAnimateHover(useFinePointerHover(), reduce);

  return (
    <div
      role="radiogroup"
      aria-label="Escolha o método de pagamento"
      className="grid grid-cols-1 gap-3 sm:grid-cols-2"
    >
      {METHODS.map((method) => {
        const isSelected = selected === method.id;
        const Icon = method.icon;
        return (
          <motion.button
            key={method.id}
            type="button"
            role="radio"
            aria-checked={isSelected}
            onClick={() => onSelect(method.id)}
            whileHover={
              animateHover
                ? {
                    y: -3,
                    transition: { duration: 0.18, ease: MOTION.easeOut },
                  }
                : undefined
            }
            whileTap={reduce ? undefined : pressMotion}
            transition={
              reduce
                ? { duration: 0.15 }
                : {
                    borderColor: { duration: 0.2, ease: MOTION.easeOut },
                    backgroundColor: { duration: 0.2, ease: MOTION.easeOut },
                    boxShadow: { duration: 0.2, ease: MOTION.easeOut },
                  }
            }
            className={[
              'group relative flex h-full flex-col items-start gap-3 rounded-sm border p-5 text-left transition-colors duration-150 ease-out',
              'focus-visible:outline-2 focus-visible:outline-gold focus-visible:outline-offset-2',
              isSelected
                ? 'border-gold bg-gold/[0.06] shadow-[0_24px_60px_rgba(210,178,100,0.08)]'
                : 'border-gold/20 bg-ink-2 hover:border-gold/40',
            ].join(' ')}
          >
            <div className="flex w-full items-start justify-between">
              <div
                className={[
                  'flex h-10 w-10 items-center justify-center rounded-sm border transition-colors duration-200',
                  isSelected
                    ? 'border-gold/60 bg-gold/10 text-gold'
                    : 'border-gold/25 text-cream-2 group-hover:border-gold/45 group-hover:text-cream',
                ].join(' ')}
              >
                <Icon className="h-5 w-5" aria-hidden />
              </div>
              {isSelected && (
                <motion.div
                  initial={
                    reduce
                      ? { opacity: 0 }
                      : { opacity: 0, scale: 0.6 }
                  }
                  animate={reduce ? { opacity: 1 } : { opacity: 1, scale: 1 }}
                  transition={
                    reduce
                      ? { duration: 0.15 }
                      : { duration: 0.22, ease: MOTION.easeOut }
                  }
                  className="flex h-6 w-6 items-center justify-center rounded-full bg-gold text-ink"
                  aria-hidden
                >
                  <Check className="h-3.5 w-3.5" strokeWidth={3} />
                </motion.div>
              )}
            </div>
            <div className="flex flex-col gap-1">
              <h3 className="font-display text-lg text-cream">{method.title}</h3>
              <p className="text-xs leading-relaxed text-cream-muted">
                {method.description}
              </p>
            </div>
            <span
              className={[
                'mt-1 inline-flex items-center rounded-sm border px-2 py-0.5 text-[10px] font-medium uppercase tracking-[0.18em]',
                isSelected
                  ? 'border-gold/40 text-gold'
                  : 'border-gold/15 text-cream-muted',
              ].join(' ')}
            >
              {method.badge}
            </span>
          </motion.button>
        );
      })}
    </div>
  );
}

export { MethodCards };

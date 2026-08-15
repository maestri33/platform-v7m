import { motion, useReducedMotion } from 'framer-motion';
import { normalizeDayOfMonth } from '@/api/contract';
import {
  MOTION,
  pressMotion,
  shouldAnimateHover,
  useFinePointerHover,
} from './motion';

const DAYS = Array.from({ length: 31 }, (_, i) => i + 1);

export interface DayPickerProps {
  value: number;
  onChange: (day: number) => void;
}

export default function DayPicker({ value, onChange }: DayPickerProps) {
  const reduce = useReducedMotion();
  const animateHover = shouldAnimateHover(useFinePointerHover(), reduce);
  const safeValue = normalizeDayOfMonth(value);

  return (
    <div className="flex flex-col gap-3">
      <div className="flex items-baseline justify-between">
        <span className="text-xs font-medium uppercase tracking-[0.18em] text-gold">
          Dia do mês
        </span>
        <span className="text-xs text-cream-muted">
          {safeValue === 1
            ? 'todo dia 1º'
            : `todo dia ${safeValue}`}
        </span>
      </div>
      <div
        role="radiogroup"
        aria-label="Dia do mês para a cobrança"
        className="grid grid-cols-7 gap-1.5"
      >
        {DAYS.map((day) => {
          const selected = day === safeValue;
          return (
            <motion.button
              key={day}
              type="button"
              role="radio"
              aria-checked={selected}
              aria-label={`Dia ${day}`}
              onClick={() => onChange(day)}
              whileHover={
                animateHover
                  ? {
                      y: -2,
                      transition: { duration: 0.15, ease: MOTION.easeOut },
                    }
                  : undefined
              }
              whileTap={reduce ? undefined : pressMotion}
              transition={
                reduce
                  ? { duration: 0.15 }
                  : {
                      backgroundColor: { duration: 0.2, ease: MOTION.easeOut },
                      borderColor: { duration: 0.2, ease: MOTION.easeOut },
                      color: { duration: 0.2, ease: MOTION.easeOut },
                    }
              }
              className={[
                'h-9 w-full rounded-sm border text-sm font-medium tabular-nums transition-colors duration-150 ease-out',
                'focus-visible:outline-2 focus-visible:outline-gold focus-visible:outline-offset-2',
                selected
                  ? 'border-gold bg-gold/10 text-gold'
                  : 'border-gold/20 bg-ink-2 text-cream-2 hover:border-gold/40 hover:text-cream',
              ].join(' ')}
            >
              {day}
            </motion.button>
          );
        })}
      </div>
      <p className="text-[11px] leading-relaxed text-cream-muted">
        Em meses com menos de {safeValue} dias (ex: fevereiro), a cobrança
        será feita no último dia do mês.
      </p>
    </div>
  );
}

export { DayPicker };

import { useId } from 'react';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { motion, useReducedMotion } from 'framer-motion';
import {
  MOTION,
  pressMotion,
  shouldAnimateHover,
  useFinePointerHover,
} from './motion';
import { formatBRLFromCents, parseBRLToCents } from './money';

const QUICK_AMOUNTS = [50, 100, 200, 500];

export interface AmountInputProps {
  /** Valor em centavos (inteiro). */
  valueCents: number;
  onChange: (cents: number) => void;
  error?: string;
}

export default function AmountInput({
  valueCents,
  onChange,
  error,
}: AmountInputProps) {
  const reduce = useReducedMotion();
  const animateHover = shouldAnimateHover(useFinePointerHover(), reduce);
  const id = useId();
  const display = valueCents > 0 ? formatBRLFromCents(valueCents) : '';
  const isValid = valueCents >= 100;

  return (
    <div className="flex flex-col gap-3">
      <Label htmlFor={id} className="text-sm font-medium text-cream">
        Valor da contribuição
      </Label>
      <div
        className={[
          'flex items-center gap-2 rounded-sm border bg-ink-2 px-4 py-3 transition-colors duration-200',
          'focus-within:border-gold',
          error
            ? 'border-destructive'
            : isValid
              ? 'border-gold/40'
              : 'border-gold/20',
        ].join(' ')}
      >
        <span className="text-sm font-medium text-cream-muted">R$</span>
        <Input
          id={id}
          inputMode="decimal"
          autoComplete="off"
          placeholder="0,00"
          value={display}
          onChange={(e) => onChange(parseBRLToCents(e.target.value))}
          aria-invalid={!!error}
          aria-describedby={error ? `${id}-error` : `${id}-hint`}
          className="border-0 bg-transparent px-0 text-xl font-medium text-cream placeholder:text-cream-muted/50 focus-visible:ring-0 focus-visible:ring-offset-0"
        />
      </div>

      {error ? (
        <p id={`${id}-error`} className="text-xs text-destructive">
          {error}
        </p>
      ) : (
        <p id={`${id}-hint`} className="text-xs text-cream-muted">
          Valor mínimo: R$ 1,00.
        </p>
      )}

      <div className="flex flex-wrap gap-2 pt-1">
        {QUICK_AMOUNTS.map((reais) => {
          const cents = reais * 100;
          const active = valueCents === cents;
          return (
            <motion.button
              key={reais}
              type="button"
              onClick={() => onChange(cents)}
              whileHover={
                animateHover
                  ? {
                      y: -1,
                      transition: { duration: 0.15, ease: MOTION.easeOut },
                    }
                  : undefined
              }
              whileTap={reduce ? undefined : pressMotion}
              className={[
                'h-9 rounded-sm border px-4 text-sm font-medium tabular-nums transition-colors duration-150 ease-out',
                'focus-visible:outline-2 focus-visible:outline-gold focus-visible:outline-offset-2',
                active
                  ? 'border-gold bg-gold/15 text-gold'
                  : 'border-gold/25 bg-transparent text-cream-2 hover:border-gold/50 hover:text-cream',
              ].join(' ')}
              aria-pressed={active}
            >
              R$ {reais}
            </motion.button>
          );
        })}
      </div>
    </div>
  );
}

export { AmountInput };

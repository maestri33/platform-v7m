import { useId } from 'react';
import { motion, useReducedMotion } from 'framer-motion';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Info } from 'lucide-react';
import DayPicker from './DayPicker';
import { stepMotion, uiTransition } from './motion';

export interface RecurrenceFieldProps {
  enabled: boolean;
  dayOfMonth: number;
  onEnabledChange: (enabled: boolean) => void;
  onDayChange: (day: number) => void;
}

export default function RecurrenceField({
  enabled,
  dayOfMonth,
  onEnabledChange,
  onDayChange,
}: RecurrenceFieldProps) {
  const reduce = useReducedMotion();
  const id = useId();
  const revealMotion = stepMotion(reduce);

  return (
    <TooltipProvider delayDuration={120}>
      <div className="flex flex-col gap-4">
        <div className="flex items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <Label
              htmlFor={id}
              className="text-sm font-medium text-cream cursor-pointer"
            >
              Cobrança recorrente
            </Label>
            <Tooltip>
              <TooltipTrigger asChild>
                <button
                  type="button"
                  aria-label="O que é cobrança recorrente?"
                  className="inline-flex h-5 w-5 items-center justify-center rounded-full text-cream-muted transition-colors duration-150 ease-out hover:text-gold focus-visible:outline-2 focus-visible:outline-gold focus-visible:outline-offset-2"
                >
                  <Info className="h-3.5 w-3.5" aria-hidden />
                </button>
              </TooltipTrigger>
              <TooltipContent
                side="top"
                className="max-w-[260px] border-gold/30 bg-ink-2 text-cream text-xs leading-relaxed"
              >
                Você autoriza uma cobrança mensal automática no dia escolhido.
                Pode ser no <strong className="text-gold">Pix</strong> ou{' '}
                <strong className="text-gold">cartão de crédito</strong>.
                Cancela quando quiser, sem multa.
              </TooltipContent>
            </Tooltip>
          </div>
          <Switch
            id={id}
            checked={enabled}
            onCheckedChange={onEnabledChange}
            aria-describedby={`${id}-desc`}
          />
        </div>

        <p id={`${id}-desc`} className="text-xs text-cream-muted">
          {enabled
            ? 'Todo mês será cobrado automaticamente no dia escolhido.'
            : 'Ative para doar mensalmente de forma automática.'}
        </p>

        {enabled && (
          <motion.div
            initial={revealMotion.initial}
            animate={revealMotion.animate}
            transition={uiTransition(reduce)}
          >
            <DayPicker value={dayOfMonth} onChange={onDayChange} />
          </motion.div>
        )}
      </div>
    </TooltipProvider>
  );
}

export { RecurrenceField };

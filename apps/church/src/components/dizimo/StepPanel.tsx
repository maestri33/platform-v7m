import { motion, useReducedMotion } from 'framer-motion';
import { stepMotion, uiTransition } from './motion';
import type { DizimoStep } from './useDizimoCapture';

export interface StepPanelProps {
  step: DizimoStep;
  className?: string;
  children: React.ReactNode;
}

/**
 * Wrapper animado de step. Aplica `stepMotion` (gentler em reduced-motion)
 * e `uiTransition` consistente em todos os painéis do fluxo.
 *
 * Extraído de `DizimoCapture.tsx` na Rodada 3 para permitir reutilização
 * (ex: em modais de confirmação, em outros fluxos transacionais).
 */
export default function StepPanel({ step, className, children }: StepPanelProps) {
  const reduce = useReducedMotion();
  return (
    <motion.div
      key={step}
      {...stepMotion(reduce)}
      transition={uiTransition(reduce)}
      className={className}
    >
      {children}
    </motion.div>
  );
}

export { StepPanel };

import { motion, useReducedMotion } from 'framer-motion';
import { CheckCircle2, XCircle, AlertCircle, Clock, RefreshCw } from 'lucide-react';
import { formatBRLFromCents } from './money';
import type { Charge, ChargeStatus } from '@/api/contract';
import { MOTION, pressMotion, stepMotion, uiTransition } from './motion';

export type StatusKey = ChargeStatus;

interface StatusConfig {
  icon: React.ComponentType<{ className?: string; 'aria-hidden'?: boolean }>;
  iconClass: string;
  title: string;
  message: (charge: Charge) => string;
  primary: { label: string; action: 'retry' | 'new' | 'close' };
}

const STATUS: Record<StatusKey, StatusConfig> = {
  paid: {
    icon: CheckCircle2,
    iconClass: 'text-gold border-gold/60 bg-gold/10',
    title: 'Contribuição confirmada',
    message: (c) =>
      c.recurrence_id
        ? `Recebemos sua primeira contribuição de ${formatBRLFromCents(c.amount_cents)}. A recorrência foi criada — você receberá um e-mail de confirmação.`
        : `Recebemos sua contribuição de ${formatBRLFromCents(c.amount_cents)}. Deus abençoe sua generosidade.`,
    primary: { label: 'Fazer nova contribuição', action: 'new' },
  },
  failed: {
    icon: XCircle,
    iconClass: 'text-destructive border-destructive/40 bg-destructive/10',
    title: 'Pagamento não concluído',
    message: () =>
      'Houve um problema ao processar seu pagamento. Tente novamente ou use outro método.',
    primary: { label: 'Tentar novamente', action: 'retry' },
  },
  expired: {
    icon: AlertCircle,
    iconClass: 'text-cream-muted border-gold/30 bg-gold/[0.04]',
    title: 'Tempo esgotado',
    message: () =>
      'O tempo para concluir esta contribuição expirou. Gere uma nova abaixo.',
    primary: { label: 'Gerar nova contribuição', action: 'new' },
  },
  pending: {
    icon: Clock,
    iconClass: 'text-gold border-gold/40 bg-gold/[0.06]',
    title: 'Aguardando confirmação',
    message: (c) =>
      `Estamos aguardando a confirmação do pagamento de ${formatBRLFromCents(c.amount_cents)}. Isso costuma levar alguns segundos.`,
    primary: { label: 'Verificar pagamento agora', action: 'retry' },
  },
  processing: {
    icon: Clock,
    iconClass: 'text-gold border-gold/40 bg-gold/[0.06]',
    title: 'Pagamento em processamento',
    message: (c) =>
      `O pagamento de ${formatBRLFromCents(c.amount_cents)} está sendo processado. Aguarde a confirmação.`,
    primary: { label: 'Verificar pagamento agora', action: 'retry' },
  },
};

export interface StatusScreenProps {
  charge: Charge;
  onRetry: () => void;
  onNew: () => void;
  onClose: () => void;
}

export default function StatusScreen({
  charge,
  onRetry,
  onNew,
  onClose,
}: StatusScreenProps) {
  const reduce = useReducedMotion();
  const entranceMotion = stepMotion(reduce);
  const config = STATUS[charge.status];
  const Icon = config.icon;

  const handlePrimary = () => {
    if (config.primary.action === 'retry') onRetry();
    else if (config.primary.action === 'new') onNew();
    else onClose();
  };

  return (
    <motion.div
      initial={entranceMotion.initial}
      animate={entranceMotion.animate}
      transition={uiTransition(reduce)}
      className="flex flex-col items-center gap-6 text-center"
      role="status"
      aria-live="polite"
    >
      <motion.div
        initial={reduce ? { opacity: 0 } : { scale: 0.85 }}
        animate={reduce ? { opacity: 1 } : { scale: 1 }}
        transition={
          reduce
            ? { duration: 0.15 }
            : { duration: 0.25, ease: MOTION.easeOut, delay: 0.05 }
        }
        className={[
          'flex h-16 w-16 items-center justify-center rounded-full border',
          config.iconClass,
        ].join(' ')}
        aria-hidden
      >
        <Icon className="h-8 w-8" />
      </motion.div>

      <div className="flex flex-col gap-2">
        <h2 className="font-display text-2xl text-cream">{config.title}</h2>
        <p className="max-w-md text-sm leading-relaxed text-cream-2">
          {config.message(charge)}
        </p>
      </div>

      <dl className="grid w-full max-w-sm grid-cols-2 gap-3 rounded-sm border border-gold/20 bg-ink-2 p-4 text-left text-xs">
        <div className="flex flex-col gap-1">
          <dt className="uppercase tracking-[0.18em] text-cream-muted">ID</dt>
          <dd className="font-mono text-cream-2">{charge.id}</dd>
        </div>
        <div className="flex flex-col gap-1">
          <dt className="uppercase tracking-[0.18em] text-cream-muted">Valor</dt>
          <dd className="text-cream-2 tabular-nums">
            {formatBRLFromCents(charge.amount_cents)}
          </dd>
        </div>
        {charge.recurrence_id && (
          <div className="col-span-2 flex flex-col gap-1">
            <dt className="uppercase tracking-[0.18em] text-cream-muted">
              Recorrência
            </dt>
            <dd className="font-mono text-cream-2">{charge.recurrence_id}</dd>
          </div>
        )}
      </dl>

      <div className="flex flex-wrap items-center justify-center gap-3">
        <motion.button
          type="button"
          onClick={handlePrimary}
          whileTap={
            reduce
              ? undefined
              : pressMotion
          }
          className="inline-flex items-center gap-2 rounded-sm border border-gold bg-gold px-5 py-2.5 text-sm font-semibold text-ink transition-colors duration-150 ease-out hover:bg-gold-light focus-visible:outline-2 focus-visible:outline-gold focus-visible:outline-offset-2"
        >
          <RefreshCw className="h-4 w-4" aria-hidden /> {config.primary.label}
        </motion.button>
        <button
          type="button"
          onClick={onClose}
          className="text-xs text-cream-muted underline-offset-4 hover:text-cream hover:underline focus-visible:outline-2 focus-visible:outline-gold focus-visible:outline-offset-2"
        >
          Voltar
        </button>
      </div>
    </motion.div>
  );
}

export { StatusScreen };

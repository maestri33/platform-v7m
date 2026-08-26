import { useCallback, useEffect, useRef, useState } from 'react';
import { motion, useReducedMotion } from 'framer-motion';
import { ShieldCheck, ArrowRight, Loader2 } from 'lucide-react';
import { formatBRLFromCents } from './money';
import { MOTION, pressMotion } from './motion';
import type { Charge } from '@/api/contract';

export interface CardRedirectProps {
  charge: Charge;
  /** Chamado quando o usuário clica em "ir agora" ou auto-redirect dispara. */
  onRedirect: (redirectUrl: string) => void;
}

export default function CardRedirect({ charge, onRedirect }: CardRedirectProps) {
  const reduce = useReducedMotion();
  const [secondsLeft, setSecondsLeft] = useState(3);
  const redirectedRef = useRef(false);
  const card = charge.payment.card!;

  const redirectOnce = useCallback(() => {
    if (redirectedRef.current) return;
    redirectedRef.current = true;
    setSecondsLeft(0);
    onRedirect(card.redirect_url);
  }, [card.redirect_url, onRedirect]);

  useEffect(() => {
    if (secondsLeft <= 0) {
      redirectOnce();
      return;
    }
    const id = globalThis.setTimeout(() => setSecondsLeft((s) => s - 1), 1000);
    return () => globalThis.clearTimeout(id);
  }, [secondsLeft, redirectOnce]);

  return (
    <div className="flex flex-col items-center gap-6 text-center">
      <motion.div
        initial={reduce ? { opacity: 1 } : { opacity: 0, scale: 0.9 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={
          reduce
            ? { duration: 0 }
            : { duration: 0.25, ease: MOTION.easeOut }
        }
        className="flex h-16 w-16 items-center justify-center rounded-full border border-gold/40 bg-gold/10"
        aria-hidden
      >
        <ShieldCheck className="h-8 w-8 text-gold" />
      </motion.div>

      <div className="flex flex-col gap-2">
        <h2 className="font-display text-2xl text-cream">
          Redirecionando para o checkout
        </h2>
        <p className="max-w-md text-sm leading-relaxed text-cream-2">
          Você será enviado para o ambiente seguro do nosso provedor de
          pagamentos para concluir a contribuição de{' '}
          <strong className="text-gold">
            {formatBRLFromCents(charge.amount_cents)}
          </strong>
          .
        </p>
      </div>

      <div className="flex items-center gap-2 text-xs text-cream-muted">
        <Loader2 className="h-3.5 w-3.5 animate-spin" aria-hidden />
        Redirecionando em {secondsLeft}s…
      </div>

      <motion.button
        type="button"
        onClick={redirectOnce}
        whileTap={
          reduce
            ? undefined
            : pressMotion
        }
        className="inline-flex items-center gap-2 rounded-sm border border-gold bg-gold px-6 py-3 text-sm font-semibold text-ink hover:bg-gold-light focus-visible:outline-2 focus-visible:outline-gold-light focus-visible:outline-offset-2"
      >
        Ir agora <ArrowRight className="h-4 w-4" aria-hidden />
      </motion.button>

      <p className="max-w-sm text-[11px] leading-relaxed text-cream-muted">
        Os dados do cartão serão preenchidos no ambiente seguro do provedor de
        pagamentos.
      </p>
    </div>
  );
}

export { CardRedirect };

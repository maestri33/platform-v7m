import { useEffect, useState } from 'react';
import { motion, useReducedMotion } from 'framer-motion';
import { Copy, Check, Clock } from 'lucide-react';
import { formatBRLFromCents } from './money';
import PixQrSvg from './PixQrSvg';
import { pressMotion } from './motion';
import type { Charge } from '@/api/contract';

export interface PixPaymentProps {
  charge: Charge;
  onVerify: () => Promise<void>;
  isVerifying: boolean;
  verificationError: string | null;
}

export default function PixPayment({
  charge,
  onVerify,
  isVerifying,
  verificationError,
}: PixPaymentProps) {
  const reduce = useReducedMotion();
  const [copied, setCopied] = useState(false);
  const [now, setNow] = useState(0);

  // Tick do countdown (visual)
  useEffect(() => {
    const updateNow = () => setNow(Date.now());
    updateNow();
    const id = globalThis.setInterval(updateNow, 1000);
    return () => globalThis.clearInterval(id);
  }, []);

  // Auto-clear "copiado" depois de 1.6s
  useEffect(() => {
    if (!copied) return;
    const id = globalThis.setTimeout(() => setCopied(false), 1600);
    return () => globalThis.clearTimeout(id);
  }, [copied]);

  const pix = charge.payment.pix!;
  const expiresMs = new Date(charge.expires_at).getTime();
  const remainingMs = Math.max(0, expiresMs - now);
  const remainingMin = Math.floor(remainingMs / 60_000);
  const remainingSec = Math.floor((remainingMs % 60_000) / 1000);
  const expired = remainingMs === 0;

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(pix.copy_paste);
      setCopied(true);
    } catch {
      // Fallback: cria textarea, seleciona, copia
      const ta = document.createElement('textarea');
      ta.value = pix.copy_paste;
      document.body.appendChild(ta);
      ta.select();
      try {
        document.execCommand('copy');
        setCopied(true);
      } catch {
        // silent — usuário pode copiar manualmente
      }
      document.body.removeChild(ta);
    }
  };

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-col gap-1 text-center sm:text-left">
        <h2 className="font-display text-2xl text-cream">Pague com Pix</h2>
        <p className="text-sm text-cream-2">
          Escaneie o QR Code ou copie o código abaixo. Confirmação automática
          em alguns segundos.
        </p>
      </div>

      <div className="grid grid-cols-1 gap-6 md:grid-cols-[auto_1fr]">
        <div className="flex flex-col items-center gap-3">
          <PixQrSvg
            payload={pix.qr_code_payload}
            className="rounded-sm border border-gold/30 bg-cream p-2"
          />
          <span className="text-[10px] uppercase tracking-[0.22em] text-cream-muted">
            QR Code · {formatBRLFromCents(charge.amount_cents)}
          </span>
        </div>

        <div className="flex flex-col gap-4">
          <div className="flex flex-col gap-2">
            <label
              htmlFor="pix-copy"
              className="text-xs font-medium uppercase tracking-[0.18em] text-gold"
            >
              Pix copia-cola
            </label>
            <div className="flex flex-col gap-2 sm:flex-row sm:items-stretch">
              <input
                id="pix-copy"
                readOnly
                value={pix.copy_paste}
                onFocus={(e) => e.currentTarget.select()}
                className="flex-1 rounded-sm border border-gold/20 bg-ink-2 px-3 py-2 font-mono text-[11px] text-cream-2 focus-visible:border-gold focus-visible:outline-2 focus-visible:outline-gold focus-visible:outline-offset-2"
              />
              <motion.button
                type="button"
                onClick={handleCopy}
                whileTap={
                  reduce
                    ? undefined
                    : pressMotion
                }
                className={[
                  'inline-flex items-center justify-center gap-2 rounded-sm border px-4 py-2 text-sm font-medium transition-colors duration-150 ease-out',
                  'focus-visible:outline-2 focus-visible:outline-gold focus-visible:outline-offset-2',
                  copied
                    ? 'border-gold bg-gold/15 text-gold'
                    : 'border-gold/40 bg-transparent text-cream hover:border-gold/70 hover:text-gold',
                ].join(' ')}
                aria-label={copied ? 'Código copiado' : 'Copiar código Pix'}
              >
                {copied ? (
                  <>
                    <Check className="h-4 w-4" aria-hidden /> Copiado
                  </>
                ) : (
                  <>
                    <Copy className="h-4 w-4" aria-hidden /> Copiar
                  </>
                )}
              </motion.button>
            </div>
          </div>

          <div
            className={[
              'flex items-center gap-2 rounded-sm border px-3 py-2 text-xs',
              expired
                ? 'border-destructive/40 bg-destructive/10 text-destructive'
                : 'border-gold/20 bg-gold/[0.04] text-cream-2',
            ].join(' ')}
            role="status"
            aria-live="polite"
          >
            <Clock className="h-3.5 w-3.5" aria-hidden />
            {expired ? (
              <span>QR Code expirado. Gere um novo abaixo.</span>
            ) : (
              <span>
                Expira em {remainingMin.toString().padStart(2, '0')}:
                {remainingSec.toString().padStart(2, '0')}
              </span>
            )}
          </div>

          <p className="text-[11px] leading-relaxed text-cream-muted">
            Assim que o pagamento for confirmado, esta página será atualizada
            automaticamente e você verá o recibo.
          </p>

          {verificationError && (
            <p className="text-xs text-destructive" role="alert">
              {verificationError}
            </p>
          )}

          <button
            type="button"
            onClick={() => void onVerify()}
            disabled={isVerifying}
            aria-busy={isVerifying}
            className="self-start text-xs text-gold underline-offset-4 hover:underline disabled:cursor-wait disabled:opacity-70 focus-visible:outline-2 focus-visible:outline-gold focus-visible:outline-offset-2"
          >
            {isVerifying
              ? 'Verificando pagamento…'
              : 'Já paguei, verificar agora'}
          </button>
        </div>
      </div>
    </div>
  );
}

export { PixPayment };

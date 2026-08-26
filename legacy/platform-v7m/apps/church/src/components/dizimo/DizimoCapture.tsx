import { AnimatePresence } from 'framer-motion';
import { Loader2 } from 'lucide-react';
import type { Charge, DizimoApi } from '@/api/contract';
import CardRedirect from './CardRedirect';
import DizimoForm from './DizimoForm';
import PixPayment from './PixPayment';
import StatusScreen from './StatusScreens';
import StepPanel from './StepPanel';
import { useDizimoCapture } from './useDizimoCapture';
import { defaultNavigateToHostedCheckout, type HostedCheckoutNavigator } from '@/lib/hostedCheckout';

export interface DizimoCaptureProps {
  /** Default do dia do mês (1–31). Default: 22. */
  defaultDayOfMonth?: number;
  /** Default do valor em centavos. Default: 10000 (R$ 100,00). */
  defaultAmountCents?: number;
  /**
   * Integração opcional do host após confirmação autoritativa por webhook ou
   * polling. Use para atualizar estado local/analytics uma única vez; a
   * persistência e o Dashboard financeiro pertencem ao backend.
   */
  onPaid?: (charge: Charge) => void;
  /** Adapter provider-agnostic obrigatório; a UI nunca escolhe mock implicitamente. */
  apiClient: DizimoApi;
  /**
   * Seam opcional para navegação ao checkout hospedado.
   * Default: `defaultNavigateToHostedCheckout` (`globalThis.location.assign`).
   * Para SSR/Next.js, forneça `useRouter().push`.
   */
  navigateToHostedCheckout?: HostedCheckoutNavigator;
}

export default function DizimoCapture({
  defaultDayOfMonth = 22,
  defaultAmountCents = 10000,
  onPaid,
  apiClient,
  navigateToHostedCheckout: navigate = defaultNavigateToHostedCheckout,
}: DizimoCaptureProps) {
  const capture = useDizimoCapture({
    apiClient,
    defaultDayOfMonth,
    defaultAmountCents,
    onPaid,
  });

  return (
    <div className="mx-auto w-full max-w-3xl">
      <div aria-live="polite" aria-atomic="true">
        <AnimatePresence mode="wait" initial={false}>
          {capture.step === 'form' && (
            <StepPanel step="form" className="flex flex-col gap-6">
              <DizimoForm
                form={capture.form}
                errors={capture.validationErrors}
                canSubmit={capture.canSubmit}
                submitError={capture.submitError}
                onChange={capture.setForm}
                onSubmit={() => void capture.submit()}
              />
            </StepPanel>
          )}

          {capture.step === 'submitting' && (
            <StepPanel
              step="submitting"
              className="flex flex-col items-center gap-4 rounded-sm border border-gold/20 bg-ink-2 p-12 text-center"
            >
              <Loader2 className="h-8 w-8 animate-spin text-gold" aria-hidden />
              <p className="text-sm text-cream-2">Criando sua contribuição…</p>
            </StepPanel>
          )}

          {capture.step === 'payment' && capture.charge && (
            <StepPanel
              step="payment"
              className="rounded-sm border border-gold/20 bg-ink-2 p-6 sm:p-8"
            >
              {capture.charge.method === 'pix' &&
                capture.charge.payment.pix && (
                  <PixPayment
                    charge={capture.charge}
                    onVerify={capture.verifyNow}
                    isVerifying={capture.isVerifying}
                    verificationError={capture.verificationError}
                  />
                )}
              {capture.charge.method === 'cartao' &&
                capture.charge.payment.card && (
                  <CardRedirect
                    charge={capture.charge}
                    onRedirect={navigate}
                  />
                )}
            </StepPanel>
          )}

          {capture.step === 'status' && capture.charge && (
            <StepPanel
              step="status"
              className="rounded-sm border border-gold/20 bg-ink-2 p-6 sm:p-8"
            >
              <StatusScreen
                charge={capture.charge}
                onRetry={() => void capture.verifyNow()}
                onNew={capture.newContribution}
                onClose={capture.newContribution}
              />
            </StepPanel>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}

export { DizimoCapture };
export type { DizimoStep as Step } from './useDizimoCapture';

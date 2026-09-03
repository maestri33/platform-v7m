"use client";

import { formatBRL } from "@/lib/money";
import {
  Button,
  FunnelEntryCard,
  FunnelHint,
  FunnelMain,
  FunnelStatusIcon,
  FunnelTitle,
  IconCheck,
  IconLock,
  IconReceipt,
  SecureLinkPill,
  SweepLine,
} from "@v7m/ui";

import { CHECKOUT_MSGS } from "./flow-data";
import styles from "./lead-flow.module.css";
import type { FlowActions, FlowState } from "./use-lead-flow";

const CHECKLIST = [
  "Identidade confirmada",
  "Contato confirmado",
  "Matrícula preparada",
  "Forma de pagamento definida",
];

/**
 * Checkout — passo 7 do funil de lead.
 * Padronizado utilizando o FunnelEntryCard do @v7m/ui.
 */
export function ScreenCheckout({
  s,
  act,
}: {
  s: FlowState;
  act: FlowActions;
}) {
  const methodLabel =
    s.checkoutMethod === "pix" ? "PIX à vista" : "Cartão de crédito";

  const value =
    s.checkoutPhase === "resume" && s.painelCheckout
      ? formatBRL(s.painelCheckout.amount)
      : s.checkoutMethod === "pix"
        ? formatBRL(s.pricing.pix)
        : `${s.pricing.card.installments}× de ${formatBRL(s.pricing.card.installment)}`;

  const success = s.checkoutPhase === "ready" || s.checkoutPhase === "done";

  return (
    <FunnelMain>
      <FunnelEntryCard
        className={s.checkoutPhase === "done" ? styles.coDissolve : ""}
      >
        {s.checkoutPhase === "error" ? (
          <>
            <FunnelStatusIcon tone="blue">
              <IconReceipt className="size-9" />
            </FunnelStatusIcon>
            <FunnelTitle>
              Não foi possível preparar seu pagamento.
            </FunnelTitle>
            <FunnelHint>
              Ocorreu um problema temporário ao criar seu checkout. Você pode
              tentar novamente em alguns instantes.
            </FunnelHint>
            <div className="flex w-full flex-col gap-2.5">
              <Button
                type="button"
                size="xl"
                variant="primary"
                onClick={act.retryCheckout}
                className="w-full"
              >
                Tentar novamente
              </Button>
              <Button
                type="button"
                size="xl"
                variant="secondary"
                onClick={act.goPlanos}
                className="w-full"
              >
                Escolher outra forma de pagamento
              </Button>
              <Button
                type="button"
                size="xl"
                variant="dangerSoft"
                onClick={act.openSupport}
                className="w-full"
              >
                Falar com o suporte
              </Button>
            </div>
          </>
        ) : (
          <>
            <div className="inline-flex items-center gap-2 rounded-full bg-brand-green-bg px-4 py-1.5 text-xs font-extrabold text-brand-green-dark">
              <IconCheck className="size-4" strokeWidth={2.6} />
              {methodLabel} · {value}
            </div>

            {s.checkoutPhase === "resume" && (
              <>
                <FunnelStatusIcon tone="green">
                  <IconLock className="size-9" strokeWidth={1.9} />
                </FunnelStatusIcon>
                <FunnelTitle>Seu pagamento continua aberto</FunnelTitle>
                <FunnelHint>
                  Deixamos tudo pronto do jeito que você escolheu. É só
                  continuar de onde parou — ou trocar a forma, se preferir.
                </FunnelHint>
                <SecureLinkPill url={s.checkoutUrl} />
                <div className="flex w-full flex-col gap-2.5 pt-1">
                  <Button
                    type="button"
                    size="xl"
                    variant="primary"
                    onClick={act.openCheckoutUrl}
                    className="w-full"
                  >
                    Continuar para o pagamento →
                  </Button>
                  <Button
                    type="button"
                    size="xl"
                    variant="secondary"
                    onClick={act.goPlanos}
                    className="w-full"
                  >
                    Trocar forma de pagamento
                  </Button>
                  <Button
                    type="button"
                    variant="linkMuted"
                    onClick={act.checkoutReopen}
                    className="self-center"
                  >
                    Voltar ao painel
                  </Button>
                </div>
              </>
            )}

            {s.checkoutPhase === "run" && (
              <>
                <div className="flex flex-col gap-2 self-stretch">
                  {CHECKLIST.map((item, i) => (
                    <div
                      key={item}
                      className={`${styles.dfadeup} flex items-center gap-2 text-sm font-semibold text-brand-ink`}
                      style={{ animationDelay: `${0.2 + i * 0.4}s` }}
                    >
                      <span
                        className="font-extrabold text-brand-green-dark"
                        aria-hidden
                      >
                        ✓
                      </span>
                      {item}
                    </div>
                  ))}
                </div>
                <div
                  className={`${styles.dfadeup} flex flex-col items-center gap-2.5 self-stretch`}
                  style={{ animationDelay: "1.7s" }}
                >
                  <SweepLine className="w-full" />
                  <FunnelStatusIcon tone="blue" size="md">
                    <IconLock className="size-5" strokeWidth={1.9} />
                  </FunnelStatusIcon>
                </div>
                <p
                  className="min-h-5 text-sm font-bold text-brand-blue"
                  role="status"
                >
                  {CHECKOUT_MSGS[s.checkoutMsg] ?? CHECKOUT_MSGS[0]}
                </p>
              </>
            )}

            {success && (
              <>
                <FunnelStatusIcon tone="green" className={styles.modalPop}>
                  <IconCheck className="size-9" pathClassName={styles.draw} />
                </FunnelStatusIcon>
                <FunnelTitle>Tudo pronto!</FunnelTitle>
                <FunnelHint>
                  Seu link de pagamento foi gerado. Assim que o pagamento for
                  confirmado, você volta aqui pra{" "}
                  <span className="font-bold text-brand-ink">
                    finalizar a matrícula
                  </span>{" "}
                  (uns documentos rapidinhos).
                </FunnelHint>
                <SecureLinkPill url={s.checkoutUrl} />
                <div className="h-1.5 w-full overflow-hidden rounded-full bg-brand-border">
                  <span
                    className={`${styles.cobar} block h-full bg-[linear-gradient(90deg,var(--color-brand-green-dark),var(--color-brand-green-light))]`}
                  />
                </div>
                {s.checkoutPhase === "done" && (
                  <>
                    <p className="text-sm font-bold text-brand-green-dark">
                      Abrindo o ambiente seguro 🔒 — conclua o pagamento por lá.
                    </p>
                    <Button
                      type="button"
                      size="xl"
                      variant="primary"
                      onClick={act.openCheckoutUrl}
                      className="w-full"
                    >
                      Não abriu? Ir para o pagamento →
                    </Button>
                    <Button
                      type="button"
                      variant="linkMuted"
                      onClick={act.checkoutReopen}
                      className="self-center"
                    >
                      Voltar ao painel
                    </Button>
                  </>
                )}
              </>
            )}
          </>
        )}
      </FunnelEntryCard>
    </FunnelMain>
  );
}

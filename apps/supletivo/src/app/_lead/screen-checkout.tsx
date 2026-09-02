"use client";

import { formatBRL } from "@/lib/money";
import { Button, FunnelEntryCard, SweepLine } from "@v7m/ui";

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
    <main id="conteudo" className="flex flex-1 px-6 py-3">
      <div className="m-auto w-full max-w-[400px]">
        <FunnelEntryCard
          className={s.checkoutPhase === "done" ? styles.coDissolve : ""}
        >
          {s.checkoutPhase === "error" ? (
            <>
              <span className="flex size-[72px] items-center justify-center rounded-full bg-brand-blue-bg text-brand-blue">
                <svg
                  className="size-9"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="1.7"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  aria-hidden
                >
                  <path d="M4 7h16M4 12h10M4 17h7" />
                  <path d="M17 14l4 4M21 14l-4 4" />
                </svg>
              </span>
              <h2 className="text-xl font-extrabold text-brand-ink">
                Não foi possível preparar seu pagamento.
              </h2>
              <p className="text-sm leading-relaxed text-brand-muted">
                Ocorreu um problema temporário ao criar seu checkout. Você pode
                tentar novamente em alguns instantes.
              </p>
              <div className="flex w-full flex-col gap-2.5">
                <Button
                  type="button"
                  onClick={act.retryCheckout}
                  className="w-full text-[17px]"
                >
                  Tentar novamente
                </Button>
                <Button
                  type="button"
                  variant="secondary"
                  onClick={act.goPlanos}
                  className="w-full text-[17px]"
                >
                  Escolher outra forma de pagamento
                </Button>
                <button
                  type="button"
                  onClick={act.openSupport}
                  className="flex min-h-[52px] w-full cursor-pointer items-center justify-center rounded-xl border-[1.5px] border-brand-danger/35 bg-brand-danger/10 px-5 text-[17px] font-bold text-brand-danger"
                >
                  Falar com o suporte
                </button>
              </div>
            </>
          ) : (
            <>
              <div className="inline-flex items-center gap-2 rounded-full bg-brand-green-bg px-4 py-[7px] text-[13px] font-extrabold text-brand-green-dark">
                <svg
                  className="size-[15px]"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2.6"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  aria-hidden
                >
                  <path d="M5 13l4 4L19 7" />
                </svg>
                {methodLabel} · {value}
              </div>

              {s.checkoutPhase === "resume" && (
                <>
                  <span className="flex size-[72px] items-center justify-center rounded-full bg-brand-green-bg text-brand-green-dark">
                    <svg
                      className="size-9"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="1.9"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      aria-hidden
                    >
                      <rect x="5" y="11" width="14" height="9" rx="2" />
                      <path d="M8 11V8a4 4 0 0 1 8 0v3" />
                    </svg>
                  </span>
                  <h2 className="text-[21px] font-extrabold text-brand-ink">
                    Seu pagamento continua aberto
                  </h2>
                  <p className="text-sm leading-relaxed text-brand-muted">
                    Deixamos tudo pronto do jeito que você escolheu. É só
                    continuar de onde parou — ou trocar a forma, se preferir.
                  </p>
                  <div className="flex max-w-full items-center gap-2 rounded-[10px] border border-brand-border bg-white/80 px-3 py-[9px]">
                    <svg
                      className="size-3.5 flex-none"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="var(--color-brand-green-dark)"
                      strokeWidth="2"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      aria-hidden
                    >
                      <rect x="5" y="11" width="14" height="9" rx="2" />
                      <path d="M8 11V8a4 4 0 0 1 8 0v3" />
                    </svg>
                    <span className="truncate text-xs font-bold text-brand-muted">
                      {s.checkoutUrl}
                    </span>
                  </div>
                  <div className="flex w-full flex-col gap-2.5 pt-1">
                    <Button
                      type="button"
                      onClick={act.openCheckoutUrl}
                      className="w-full text-base"
                    >
                      Continuar para o pagamento →
                    </Button>
                    <Button
                      type="button"
                      variant="secondary"
                      onClick={act.goPlanos}
                      className="w-full text-[15px]"
                    >
                      Trocar forma de pagamento
                    </Button>
                    <button
                      type="button"
                      onClick={act.checkoutReopen}
                      className="min-h-10 cursor-pointer self-center border-none bg-transparent text-[13px] font-bold text-brand-muted underline underline-offset-4"
                    >
                      Voltar ao painel
                    </button>
                  </div>
                </>
              )}

              {s.checkoutPhase === "run" && (
                <>
                  <div className="flex flex-col gap-2 self-stretch">
                    {CHECKLIST.map((item, i) => (
                      <div
                        key={item}
                        className={`${styles.dfadeup} flex items-center gap-2 text-[13px] font-semibold text-brand-ink`}
                        style={{ animationDelay: `${0.2 + i * 0.4}s` }}
                      >
                        <span
                          className="font-extrabold text-brand-green"
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
                    <span className="flex size-11 items-center justify-center rounded-full bg-brand-blue-bg text-brand-blue">
                      <svg
                        className="size-[22px]"
                        viewBox="0 0 24 24"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="1.9"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        aria-hidden
                      >
                        <rect x="5" y="11" width="14" height="9" rx="2" />
                        <path d="M8 11V8a4 4 0 0 1 8 0v3" />
                      </svg>
                    </span>
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
                  <span
                    className={`${styles.modalPop} flex size-[72px] items-center justify-center rounded-full bg-brand-green-bg text-brand-green-dark`}
                  >
                    <svg
                      className="size-9"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="2.4"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      aria-hidden
                    >
                      <path
                        className={styles.draw}
                        d="M5 13l4 4L19 7"
                        pathLength="1"
                      />
                    </svg>
                  </span>
                  <h2 className="text-[22px] font-extrabold text-brand-ink">
                    Tudo pronto!
                  </h2>
                  <p className="text-sm leading-relaxed text-brand-muted">
                    Seu link de pagamento foi gerado. Assim que o pagamento for
                    confirmado, você volta aqui pra{" "}
                    <span className="font-bold text-brand-ink">
                      finalizar a matrícula
                    </span>{" "}
                    (uns documentos rapidinhos).
                  </p>
                  <div className="flex max-w-full items-center gap-2 rounded-[10px] border border-brand-border bg-white/80 px-3 py-[9px]">
                    <svg
                      className="size-3.5 flex-none"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="var(--color-brand-green-dark)"
                      strokeWidth="2"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      aria-hidden
                    >
                      <rect x="5" y="11" width="14" height="9" rx="2" />
                      <path d="M8 11V8a4 4 0 0 1 8 0v3" />
                    </svg>
                    <span className="truncate text-xs font-bold text-brand-muted">
                      {s.checkoutUrl}
                    </span>
                  </div>
                  <div className="h-1.5 w-full overflow-hidden rounded-full bg-brand-border">
                    <span
                      className={`${styles.cobar} block h-full bg-[linear-gradient(90deg,var(--color-brand-green),var(--color-brand-green-light))]`}
                    />
                  </div>
                  {s.checkoutPhase === "done" && (
                    <>
                      <p className="text-[13px] font-bold text-brand-green-dark">
                        Abrindo o ambiente seguro 🔒 — conclua o pagamento por
                        lá.
                      </p>
                      <Button
                        type="button"
                        onClick={act.openCheckoutUrl}
                        className="w-full text-base"
                      >
                        Não abriu? Ir para o pagamento →
                      </Button>
                      <button
                        type="button"
                        onClick={act.checkoutReopen}
                        className="min-h-10 cursor-pointer self-center border-none bg-transparent text-[13px] font-bold text-brand-muted underline underline-offset-4"
                      >
                        Voltar ao painel
                      </button>
                    </>
                  )}
                </>
              )}
            </>
          )}
        </FunnelEntryCard>
      </div>
    </main>
  );
}

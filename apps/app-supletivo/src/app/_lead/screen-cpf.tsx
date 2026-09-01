"use client";

import {
  BackgroundGradient,
  CpfInputBoxes,
  FunnelEntryCard,
  StudentCredentialCard,
  InlineSpinner,
  StepBar,
  SweepLine,
} from "@v7m/ui";

import styles from "./lead-flow.module.css";
import type { FlowActions, FlowState } from "./use-lead-flow";

/** Documento digital sendo analisado — moldura premium + linha de leitura. */
function CpfDocument() {
  return (
    <div
      className={`${styles.walletFloat} relative mx-auto mb-1 mt-0.5 w-full max-w-[272px]`}
      aria-hidden
    >
      <SweepLine className="mb-3" />
      <BackgroundGradient className="overflow-hidden rounded-2xl bg-white">
        <div className="relative px-[18px] pb-[17px] pt-[15px] shadow-[inset_0_1px_0_rgba(255,255,255,0.8)]">
          <div className="flex items-center justify-between gap-2">
            <p className="text-[9px] font-extrabold tracking-[0.16em] text-brand-muted">
              CADASTRO DE PESSOA FÍSICA
            </p>
            <span className="flex size-[22px] items-center justify-center rounded-md bg-brand-green-bg text-brand-green-dark">
              <svg
                className="size-[13px]"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2.6"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <path d="M5 13l4 4L19 7" />
              </svg>
            </span>
          </div>
          <p className="mb-1.5 mt-2.5 font-mono text-[22px] font-extrabold tracking-[0.12em] text-brand-ink">
            •••.•••.•••-••
          </p>
          <div className="flex gap-1.5">
            <span className="h-[5px] flex-1 rounded-[3px] bg-brand-border" />
            <span className="h-[5px] flex-1 rounded-[3px] bg-brand-border" />
            <span className="h-[5px] w-[26px] flex-none rounded-[3px] bg-brand-border" />
          </div>
          <span
            className={`${styles.cpfScan} absolute inset-x-0 top-0 h-[38%] border-y-[1.5px] border-brand-green-light bg-[linear-gradient(180deg,transparent,rgba(56,209,120,0.28),transparent)] shadow-[0_0_16px_rgba(56,209,120,0.55)]`}
          />
        </div>
      </BackgroundGradient>
      <SweepLine reverse className="mt-3" />
    </div>
  );
}

/**
 * CPF (novo usuário) — passo 3, e o reveal do passo 4.
 * Padronizado com FunnelEntryCard e StudentCredentialCard do @v7m/ui.
 */
export function ScreenCpf({ s, act }: { s: FlowState; act: FlowActions }) {
  const discovery =
    s.cpfPhase === "discovery" || s.cpfPhase === "discoveryClose";
  const protocol = `7M-${(s.externalId || s.phone || "0000").replace(/-/g, "").slice(-4).toUpperCase()}`;
  const issuedAt = new Date().toLocaleDateString("pt-BR");

  return (
    <main id="conteudo" className="flex flex-1 px-6 py-3">
      <div className="m-auto flex w-full max-w-[380px] flex-col items-center gap-4">
        {!discovery ? (
          <FunnelEntryCard
            error={s.cardError}
            header={
              <div className="flex w-full flex-col gap-3">
                <StepBar step={2} label="CPF" />
                <div className="flex flex-col gap-1 text-center">
                  <p className="text-[11px] font-extrabold uppercase tracking-[0.12em] text-brand-green-dark">
                    Confirmação de identidade
                  </p>
                  <h2 className="text-[23px] font-extrabold tracking-tight text-brand-ink">
                    Qual é o seu CPF?
                  </h2>
                </div>
              </div>
            }
          >
            <div className="flex w-full flex-col items-center gap-4">
              <p className="text-center text-sm leading-relaxed text-brand-muted">
                Aquele numerozinho que a gente decora pra vida toda 😅. Manda o
                seu que eu confirmo na hora.
              </p>

              <CpfDocument />

              <CpfInputBoxes
                value={s.cpf}
                onChange={act.setCpf}
                disabled={s.cpfChecking}
              />

              <div aria-hidden className="h-px w-full bg-brand-border/60" />

              {s.cpfChecking ? (
                <div
                  className="flex items-center gap-2 text-sm font-bold text-brand-blue"
                  role="status"
                >
                  <InlineSpinner />
                  Confirmando seu CPF na Receita…
                </div>
              ) : (
                <p className="text-xs leading-normal text-brand-muted">
                  Pode digitar — confirmo sozinho assim que terminar.
                </p>
              )}
            </div>
          </FunnelEntryCard>
        ) : (
          <StudentCredentialCard
            name={s.discName}
            photo={s.discPhoto}
            age={s.discAge}
            protocol={protocol}
            issuedAt={issuedAt}
            onContinue={act.continueEmail}
          />
        )}
      </div>
    </main>
  );
}

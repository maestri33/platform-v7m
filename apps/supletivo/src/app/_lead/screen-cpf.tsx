"use client";

import {
  BackgroundGradient,
  CpfInputBoxes,
  FunnelEntryCard,
  FunnelEyebrow,
  FunnelHint,
  FunnelMain,
  FunnelStatus,
  FunnelTitle,
  IconCheck,
  StudentCredentialCard,
  StepBar,
  SweepLine,
} from "@v7m/ui";

import styles from "./lead-flow.module.css";
import type { FlowActions, FlowState } from "./use-lead-flow";

/** Documento digital sendo analisado — moldura premium + linha de leitura. */
function CpfDocument() {
  return (
    <div
      className={`${styles.walletFloat} relative mx-auto w-full max-w-[272px]`}
      aria-hidden
    >
      <SweepLine className="mb-3" />
      <BackgroundGradient className="overflow-hidden rounded-2xl bg-brand-surface">
        <div className="relative px-4 pb-4 pt-4">
          <div className="flex items-center justify-between gap-2">
            <p className="text-xs font-extrabold uppercase tracking-widest text-brand-muted">
              Cadastro de pessoa física
            </p>
            <span className="flex size-6 items-center justify-center rounded-md bg-brand-green-bg text-brand-green-dark">
              <IconCheck className="size-3.5" strokeWidth={2.6} />
            </span>
          </div>
          <p className="mb-1.5 mt-2.5 font-mono text-2xl font-extrabold tracking-widest text-brand-ink">
            •••.•••.•••-••
          </p>
          <div className="flex gap-1.5">
            <span className="h-[5px] flex-1 rounded-full bg-brand-border" />
            <span className="h-[5px] flex-1 rounded-full bg-brand-border" />
            <span className="h-[5px] w-6 flex-none rounded-full bg-brand-border" />
          </div>
          <span
            className={`${styles.cpfScan} absolute inset-x-0 top-0 h-[38%] border-y border-brand-green-light bg-[linear-gradient(180deg,transparent,rgba(56,209,120,0.28),transparent)] shadow-[0_0_16px_rgba(56,209,120,0.55)]`}
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
    <FunnelMain>
      {!discovery ? (
        <FunnelEntryCard
          error={s.cardError}
          header={
            <div className="flex w-full flex-col gap-3">
              <StepBar step={2} label="CPF" />
              <div className="flex flex-col gap-1 text-center">
                <FunnelEyebrow>Confirmação de identidade</FunnelEyebrow>
                <FunnelTitle>Qual é o seu CPF?</FunnelTitle>
              </div>
            </div>
          }
        >
          <div className="flex w-full flex-col items-center gap-4">
            <FunnelHint className="text-center">
              O Ministério da Educação exige o CPF do estudante para validação do histórico escolar e emissão oficial do certificado.
            </FunnelHint>

            <CpfDocument />

            <CpfInputBoxes
              value={s.cpf}
              onChange={act.setCpf}
              disabled={s.cpfChecking}
            />

            <div aria-hidden className="h-px w-full bg-brand-border" />

            {s.cpfChecking ? (
              <FunnelStatus>Validando seus dados junto à base oficial…</FunnelStatus>
            ) : (
              <FunnelHint>
                Avançaremos automaticamente assim que os 11 dígitos forem validados.
              </FunnelHint>
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
    </FunnelMain>
  );
}

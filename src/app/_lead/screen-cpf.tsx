"use client";

import { BackgroundGradient } from "@/components/ui/background-gradient";

import { MOCK_IDENTITY, mockAge } from "./flow-data";
import styles from "./lead-flow.module.css";
import { CpfBoxes, InlineSpinner, Parchment, ParchmentPhoto, SweepLine } from "./primitives";
import type { FlowActions, FlowState } from "./use-lead-flow";

/** Documento digital sendo analisado — moldura premium + linha de leitura. */
function CpfDocument() {
  return (
    <div className={`${styles.walletFloat} relative mx-auto mb-1 mt-0.5 w-full max-w-[272px]`} aria-hidden>
      <SweepLine className="mb-3" />
      <BackgroundGradient className="overflow-hidden rounded-2xl bg-white">
        <div className="relative px-[18px] pb-[17px] pt-[15px] shadow-[inset_0_1px_0_rgba(255,255,255,0.8)]">
          <div className="flex items-center justify-between gap-2">
            <p className="text-[9px] font-extrabold tracking-[0.16em] text-brand-muted">
              CADASTRO DE PESSOA FÍSICA
            </p>
            <span className="flex size-[22px] items-center justify-center rounded-md bg-brand-green-bg text-brand-green-dark">
              <svg className="size-[13px]" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.6" strokeLinecap="round" strokeLinejoin="round">
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
 * CPF (novo usuário) — passo 3, e o reveal do passo 4. Caixas 3·3·3-2 com
 * validação de dígito; confirma sozinho. CPF novo válido abre o pergaminho da
 * identidade (~3s) e segue sozinho pro e-mail.
 */
export function ScreenCpf({ s, act }: { s: FlowState; act: FlowActions }) {
  const discovery = s.cpfPhase === "discovery" || s.cpfPhase === "discoveryClose";
  const genderWord = MOCK_IDENTITY.sex === "F" ? "Matriculada" : "Matriculado";

  return (
    <main id="conteudo" className="flex flex-1 p-6">
      <div className="m-auto flex w-full max-w-[380px] flex-col gap-5">
        <div
          className={`flex flex-col items-center gap-4 rounded-[28px] bg-white/70 px-5 py-6 text-center backdrop-blur-xl ${s.cardError ? styles.shake : ""} ${
            s.cardError
              ? "border-[1.5px] border-brand-danger/65 shadow-[0_12px_34px_-8px_rgba(198,40,40,0.45),inset_0_1px_0_rgba(255,255,255,0.7)]"
              : "border border-white/50 shadow-[0_10px_34px_-10px_rgba(11,27,59,0.25),inset_0_1px_0_rgba(255,255,255,0.7)]"
          }`}
        >
          {!discovery && (
            <>
              <div className="flex flex-col gap-1">
                <p className="text-[11px] font-extrabold uppercase tracking-[0.12em] text-brand-green-dark">
                  Confirmação de identidade
                </p>
                <h2 className="text-[23px] font-extrabold tracking-tight text-brand-ink">
                  Qual é o seu CPF?
                </h2>
              </div>
              <div aria-hidden className="h-px w-full bg-brand-border opacity-70" />
              <p className="text-sm leading-relaxed text-brand-muted">
                Aquele numerozinho que a gente decora pra vida toda 😅. Manda o seu que eu confirmo
                na hora.
              </p>

              <CpfDocument />

              <CpfBoxes value={s.cpf} onChange={act.setCpf} disabled={s.cpfChecking} />
              <div aria-hidden className="h-px w-full bg-brand-border opacity-70" />
              {s.cpfChecking ? (
                <div className="flex items-center gap-2 text-sm font-bold text-brand-blue" role="status">
                  <InlineSpinner />
                  Confirmando seu CPF…
                </div>
              ) : (
                <p className="text-xs leading-normal text-brand-muted">
                  Pode digitar — confirmo sozinho assim que terminar.
                </p>
              )}
            </>
          )}

          {discovery && (
            <div className="flex w-full flex-col items-center gap-4 pb-2.5 pt-1">
              <p
                className={`${styles.pfade} text-[11px] font-extrabold uppercase tracking-[0.16em] text-brand-green-dark`}
                style={{ animationDelay: "0.05s" }}
              >
                ✦ Identidade encontrada ✦
              </p>
              <div
                className={`${styles.pscroll} ${s.cpfPhase === "discoveryClose" ? styles.closing : ""} flex w-full max-w-[300px] flex-col items-center`}
              >
                <Parchment
                  wide
                  rollerClassName="h-[19px]"
                  bodyClassName="px-[22px] pb-[30px] pt-[26px]"
                >
                  <div className="flex flex-col items-center gap-3">
                    <ParchmentPhoto
                      size={88}
                      className={styles.pfade}
                      style={{ animationDelay: "1.5s" }}
                    />
                    <div className={`${styles.pfade} text-center`} style={{ animationDelay: "1.75s" }}>
                      <p className="min-h-6 font-serif text-xl font-extrabold leading-tight tracking-[0.01em] text-[#3f2f12]">
                        {s.discName}
                      </p>
                    </div>
                    <div
                      aria-hidden
                      className={`${styles.pfade} h-px w-[54px] bg-[rgba(120,90,30,0.4)]`}
                      style={{ animationDelay: "2s" }}
                    />
                    <p
                      className={`${styles.pfade} text-center font-serif text-[14.5px] leading-[1.65] text-[#5b4a24]`}
                      style={{ animationDelay: "2.2s" }}
                    >
                      Depois de <strong className="text-[#3f2f12]">{mockAge()} anos</strong>,
                      <br />
                      chegou a sua hora.
                    </p>
                    <span
                      className={`${styles.pseal} mt-0.5 inline-flex items-center gap-1.5 rounded-full border border-[rgba(0,128,47,0.38)] bg-[rgba(0,128,47,0.12)] px-4 py-[7px] text-xs font-extrabold uppercase tracking-[0.07em] text-brand-green-dark`}
                      style={{ animationDelay: "2.5s" }}
                    >
                      ✓ {genderWord}
                    </span>
                  </div>
                </Parchment>
              </div>
            </div>
          )}
        </div>
      </div>
    </main>
  );
}

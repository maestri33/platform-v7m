"use client";

import { BackgroundGradient } from "@/components/ui/background-gradient";
import { InlineSpinner, StepBar, SweepLine } from "@v7m/ui";

import styles from "./lead-flow.module.css";
import {
  CpfBoxes,
  Parchment,
  ParchmentPortrait,
} from "./primitives";
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
 * identidade (~3s, toque pula) e segue sozinho pro e-mail.
 *
 * Pergaminho redesenhado (2026-07-25): retrato real do WhatsApp (monograma como
 * fallback), nome SEM embaralhar (decodificação lia como defeito), selo "Vaga
 * reservada" (o "Matriculada" prometia o que o passo 4 ainda não é — fica pro
 * momento em que for verdade), protocolo+data ancorando como documento.
 */
export function ScreenCpf({ s, act }: { s: FlowState; act: FlowActions }) {
  const discovery = s.cpfPhase === "discovery" || s.cpfPhase === "discoveryClose";
  // Protocolo de exibição: cauda do external_id (ou do phone, no protótipo solto).
  const protocol = `7M-${(s.externalId || s.phone || "0000").replace(/-/g, "").slice(-4).toUpperCase()}`;
  const issuedAt = new Date().toLocaleDateString("pt-BR");

  return (
    <main id="conteudo" className="flex flex-1 px-6 py-3">
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
              {/* Só na fase de input: quando o pergaminho abre, o passo já foi cumprido e a
                  tela vira documento — barra de progresso ali competiria com o reveal. */}
              <StepBar step={2} label="CPF" className="self-stretch" />
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
            <section
              aria-label={`Identidade confirmada: ${s.discName}. Vaga reservada em seu nome.`}
              className="flex w-full flex-col items-center gap-4 pb-2.5 pt-1"
            >
              <p
                className={`${styles.pfade} text-[11px] font-extrabold uppercase tracking-[0.16em] text-brand-green-dark`}
                style={{ animationDelay: "0.05s" }}
              >
                ✦ Identidade confirmada ✦
              </p>
              <div
                className={`${styles.pscroll} ${s.cpfPhase === "discoveryClose" ? styles.closing : ""} flex w-full max-w-[300px] flex-col items-center`}
              >
                <Parchment
                  wide
                  rollerClassName="h-[19px]"
                  bodyClassName="px-[22px] pb-[26px] pt-[24px]"
                >
                  <div className="flex flex-col items-center gap-3">
                    {/* Foto do WhatsApp (POST /lead/identity). Sem foto no zap → monograma:
                        é ilustração do reconhecimento, nunca prova de identidade. */}
                    <ParchmentPortrait
                      name={s.discName}
                      photo={s.discPhoto}
                      size={96}
                      className={styles.pfade}
                      style={{ animationDelay: "1s" }}
                    />
                    <p
                      className={`${styles.pnameIn} min-h-6 text-center font-serif text-xl font-bold leading-tight tracking-[0.01em] text-[#3f2f12]`}
                      style={{ animationDelay: "1.3s" }}
                    >
                      {s.discName}
                    </p>
                    <div
                      aria-hidden
                      className={`${styles.pfilete} h-px w-[118px] bg-[linear-gradient(90deg,transparent,rgba(120,90,30,0.62),transparent)]`}
                      style={{ animationDelay: "1.55s" }}
                    />
                    {/* Sem `birth_date` o backend não sabe a idade — some a linha inteira em
                        vez de estampar "Depois de  anos" no que precisa soar como documento. */}
                    {s.discAge !== null && (
                      <p
                        className={`${styles.pfade} text-center font-serif text-[14.5px] leading-[1.65] text-[#5b4a24]`}
                        style={{ animationDelay: "1.8s" }}
                      >
                        Depois de <strong className="text-[#3f2f12]">{s.discAge} anos</strong>,
                        <br />
                        chegou a sua hora.
                      </p>
                    )}
                    <span
                      className={`${styles.pseal} mt-0.5 inline-flex items-center gap-1.5 rounded-full border border-[rgba(120,90,30,0.42)] bg-[linear-gradient(180deg,rgba(255,251,233,0.9),rgba(232,214,166,0.75))] px-4 py-[7px] text-[11.5px] font-extrabold uppercase tracking-[0.07em] text-[#6b5017] shadow-[inset_0_1px_0_rgba(255,255,255,0.7)]`}
                      style={{ animationDelay: "2.1s" }}
                    >
                      ✦ Vaga reservada
                    </span>
                    <div
                      className={`${styles.pfade} flex flex-wrap items-center justify-center gap-x-3.5 gap-y-1 text-[9.5px] font-bold uppercase tracking-[0.1em] text-[rgba(90,68,24,0.72)]`}
                      style={{ animationDelay: "2.35s" }}
                    >
                      <span className="tabular-nums">Protocolo {protocol}</span>
                      <span className="tabular-nums">{issuedAt}</span>
                    </div>
                    <div aria-hidden className={`${styles.pfade} flex items-center gap-[5px]`} style={{ animationDelay: "2.35s" }}>
                      {[0, 1, 2].map((i) => (
                        <i key={i} className="block size-[5px] rounded-full bg-[#8d6220]" />
                      ))}
                      <i className="block h-[5px] w-4 rounded-[3px] bg-[#00752c]" />
                      {[4, 5].map((i) => (
                        <i key={i} className="block size-[5px] rounded-full bg-[rgba(120,90,30,0.28)]" />
                      ))}
                    </div>
                    <button
                      type="button"
                      onClick={act.continueEmail}
                      className={`${styles.pfade} cursor-pointer border-none bg-transparent p-1 text-[11px] font-semibold tracking-[0.02em] text-[rgba(90,68,24,0.7)]`}
                      style={{ animationDelay: "2.6s" }}
                    >
                      toque para continuar
                    </button>
                  </div>
                </Parchment>
              </div>
            </section>
          )}
        </div>
      </div>
    </main>
  );
}

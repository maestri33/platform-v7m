"use client";

import { Button, FunnelEntryCard, StepBar, InlineSpinner } from "@v7m/ui";

import styles from "./lead-flow.module.css";
import type { FlowActions, FlowState } from "./use-lead-flow";

/**
 * E-mail — passo 5 do funil de lead ("campo único, validação viva").
 * Padronizado utilizando o FunnelEntryCard do @v7m/ui.
 */
export function ScreenEmail({ s, act }: { s: FlowState; act: FlowActions }) {
  return (
    <main id="conteudo" className="flex flex-1 px-6 py-3">
      <div className="m-auto flex w-full max-w-[440px] flex-col gap-4">
        <FunnelEntryCard
          shake={s.emailShake}
          header={<StepBar step={3} total={4} label="e-mail" />}
        >
          {s.emailPhase === "input" && (
            <div className="flex flex-col gap-3.5">
              <div className="flex flex-col items-center gap-2 text-center">
                <span
                  aria-hidden
                  className="flex size-14 items-center justify-center rounded-[14px] bg-gradient-to-br from-brand-green to-brand-blue-bright text-white shadow-[0_8px_22px_rgba(0,156,59,0.35)]"
                >
                  <svg
                    className="size-[26px]"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  >
                    <rect x="3" y="5" width="18" height="14" rx="2" />
                    <path d="M3 7l9 6 9-6" />
                  </svg>
                </span>
                <h2 className="text-[21px] font-extrabold tracking-tight text-brand-ink">
                  Qual é seu melhor e-mail?
                </h2>
                <p className="text-[13px] leading-normal text-brand-muted">
                  É por ele que enviamos seu acesso e as confirmações.
                </p>
              </div>

              <div
                className={`flex items-center gap-2.5 rounded-[14px] border-[1.5px] bg-white/60 px-3.5 py-1.5 ${
                  s.emailError ? "border-brand-danger" : "border-brand-border"
                }`}
              >
                <label htmlFor="lead-email" className="sr-only">
                  Seu melhor e-mail
                </label>
                <input
                  id="lead-email"
                  inputMode="email"
                  autoComplete="email"
                  placeholder="seuemail@provedor.com"
                  value={s.email}
                  aria-invalid={s.emailError}
                  aria-describedby={s.emailHint ? "email-hint" : undefined}
                  onChange={(e) => act.onEmailInput(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") act.submitEmail();
                  }}
                  onFocus={(e) =>
                    // Teclado do celular cobre metade da tela — centraliza o campo ao focar.
                    e.currentTarget.scrollIntoView({
                      behavior: "smooth",
                      block: "center",
                    })
                  }
                  className="min-h-[52px] min-w-0 flex-1 border-none bg-transparent text-lg font-semibold text-brand-ink outline-none placeholder:font-normal placeholder:text-brand-muted/70"
                />
                <span
                  aria-hidden
                  data-email-dot={s.emailDot}
                  className={`size-2.5 shrink-0 rounded-full transition-colors duration-300 ${
                    s.emailDot === "valid"
                      ? "bg-brand-green"
                      : s.emailDot === "checking"
                        ? "bg-brand-yellow"
                        : "bg-brand-border"
                  }`}
                />
                <span className="sr-only" role="status">
                  {s.emailDot === "valid" ? "Formato do e-mail válido" : ""}
                </span>
              </div>

              {s.emailHint && (
                <p
                  id="email-hint"
                  role="status"
                  className="text-[13px] font-semibold text-brand-danger"
                >
                  Ainda falta um pequeno detalhe 😊 — confere se tem @ e o
                  domínio.
                </p>
              )}

              {s.emailSuggest && (
                <div className="flex flex-col gap-2 rounded-xl border border-brand-blue-bright/30 bg-brand-blue-bg px-3.5 py-3">
                  <p className="text-[13px] text-brand-ink">
                    Você quis dizer{" "}
                    <strong className="font-extrabold">
                      {s.emailSuggest}
                    </strong>
                    ?
                  </p>
                  <div className="flex flex-wrap items-center gap-2">
                    <button
                      type="button"
                      onClick={act.emailUseSuggestion}
                      aria-label={`Usar ${s.emailSuggest}`}
                      className="cursor-pointer rounded-full border-none bg-brand-blue-bright px-4 py-2 text-[13px] font-bold text-white"
                    >
                      Usar
                    </button>
                    <button
                      type="button"
                      onClick={act.emailKeepTyped}
                      className="cursor-pointer rounded-full border border-brand-border bg-transparent px-4 py-2 text-[13px] font-bold text-brand-muted"
                    >
                      Manter mesmo assim
                    </button>
                  </div>
                </div>
              )}

              {s.emailTemp && !s.emailSuggest && (
                <div className="rounded-xl border border-brand-yellow/60 bg-brand-yellow/15 px-3.5 py-3">
                  <p className="text-[13px] leading-normal text-brand-ink">
                    ⏳ Esse parece um e-mail temporário — ele some depois de um
                    tempo, e é por ele que enviamos seu acesso. Pode usar, mas um
                    e-mail seu de verdade é mais seguro.
                  </p>
                </div>
              )}

              <Button
                type="button"
                onClick={act.submitEmail}
              >
                Continuar
              </Button>
            </div>
          )}

          {s.emailPhase === "processing" && (
            <div
              className="flex flex-col items-center gap-3.5 py-7 text-center"
              role="status"
            >
              <InlineSpinner className="size-11" />
              <p className="text-base font-bold text-brand-ink">
                Verificando disponibilidade…
              </p>
            </div>
          )}

          {s.emailPhase === "success" && (
            <div
              className="flex flex-col items-center gap-3 py-7 text-center"
              role="status"
            >
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
              <p className="text-[19px] font-extrabold tracking-tight text-brand-ink">
                {s.emailAlreadyYours
                  ? "Perfeito, já é o seu e-mail"
                  : "Excelente!"}
              </p>
              <p className="text-[13px] font-semibold text-brand-muted">
                {s.email.trim()}
              </p>
            </div>
          )}

          {s.emailPhase === "flying" && (
            <div className="flex flex-col items-center gap-3 overflow-hidden pb-6 pt-4 text-center">
              <div
                className={`${styles.envelopeFly} w-[250px] max-w-[70%]`}
                aria-hidden
              >
                <svg
                  viewBox="0 0 240 170"
                  fill="none"
                  className="h-auto w-full"
                >
                  <rect
                    x="8"
                    y="18"
                    width="224"
                    height="140"
                    rx="14"
                    fill="#f4f7ff"
                    stroke="var(--color-brand-blue-bright)"
                    strokeWidth="4"
                  />
                  <path
                    d="M12 30 L120 104 L228 30"
                    stroke="var(--color-brand-blue-bright)"
                    strokeWidth="4"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    fill="none"
                  />
                  <path
                    d="M8 32 L120 108 L232 32 L232 24 C232 18 227 14 221 14 L19 14 C13 14 8 18 8 24 Z"
                    fill="var(--color-brand-blue-bright)"
                    opacity="0.12"
                  />
                  <circle
                    cx="196"
                    cy="128"
                    r="20"
                    fill="var(--color-brand-green)"
                  />
                  <path
                    d="M188 128l6 6 12-12"
                    stroke="#fff"
                    strokeWidth="3.5"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                </svg>
              </div>
              <p className="text-[15px] font-bold text-brand-ink">
                E-mail confirmado!
              </p>
            </div>
          )}

          {s.emailPhase === "taken" && (
            <div
              role="alert"
              className={`${styles.modalPop} flex flex-col items-center gap-3 px-1 py-4 text-center`}
            >
              <span className="relative flex size-20 items-center justify-center rounded-full bg-brand-blue-bg text-brand-blue">
                <span
                  className={`${styles.ringPulse} absolute inset-0 rounded-full border-2 border-brand-blue-bright`}
                />
                <svg
                  className="size-[38px]"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="1.7"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  aria-hidden
                >
                  <path d="M12 3l7 3v5c0 4.6-3.1 7.7-7 9-3.9-1.3-7-4.4-7-9V6z" />
                  <rect x="9.3" y="11.2" width="5.4" height="4.6" rx="1" />
                  <path d="M10.4 11.2v-1.1a1.6 1.6 0 0 1 3.2 0v1.1" />
                </svg>
              </span>
              <h2 className="text-xl font-extrabold tracking-tight text-brand-ink">
                Esse e-mail já está protegido
              </h2>
              <p className="text-[13px] leading-relaxed text-brand-muted">
                Ele já é o canal de acesso de outra conta. Se o e-mail é seu e
                você quer recuperar o acesso, o suporte te ajuda com segurança.
              </p>
              <Button
                type="button"
                onClick={act.emailSwap}
                className="w-full"
              >
                Trocar e-mail
              </Button>
              <button
                type="button"
                onClick={act.supportWhats}
                className="cursor-pointer rounded-full border border-brand-danger/40 bg-brand-danger-bg px-4 py-2.5 text-[13px] font-bold text-brand-danger"
              >
                Falar com o suporte
              </button>
            </div>
          )}
        </FunnelEntryCard>
      </div>
    </main>
  );
}

"use client";

import {
  Button,
  FunnelEntryCard,
  FunnelField,
  FunnelHint,
  FunnelMain,
  FunnelStatus,
  FunnelStatusIcon,
  FunnelTitle,
  IconCheck,
  IconMail,
  IconShield,
  StepBar,
} from "@v7m/ui";

import styles from "./lead-flow.module.css";
import type { FlowActions, FlowState } from "./use-lead-flow";

/**
 * E-mail — passo 5 do funil de lead ("campo único, validação viva").
 * Padronizado utilizando o FunnelEntryCard do @v7m/ui.
 */
export function ScreenEmail({ s, act }: { s: FlowState; act: FlowActions }) {
  return (
    <FunnelMain>
      <FunnelEntryCard
        shake={s.emailShake}
        // `self-stretch`: o card centraliza os filhos, e sem isso os segmentos
        // `flex-1` da barra colapsam (a barra sumia — bug pré-existente).
        header={
          <StepBar step={3} total={4} label="e-mail" className="self-stretch" />
        }
      >
        {s.emailPhase === "input" && (
          <div className="flex w-full flex-col gap-4">
            <div className="flex flex-col items-center gap-2 text-center">
              <span
                aria-hidden
                className="flex size-14 items-center justify-center rounded-xl bg-gradient-to-br from-brand-green-dark to-brand-blue-bright text-white shadow-[var(--shadow-button)]"
              >
                <IconMail className="size-7" />
              </span>
              <FunnelTitle>Qual é seu melhor e-mail?</FunnelTitle>
              <FunnelHint>
                É por ele que enviamos seu acesso e as confirmações.
              </FunnelHint>
            </div>

            <FunnelField invalid={s.emailError} row>
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
                className="min-h-14 min-w-0 flex-1 border-none bg-transparent text-lg font-semibold text-brand-ink outline-none placeholder:font-normal placeholder:text-brand-muted"
              />
              <span
                aria-hidden
                data-email-dot={s.emailDot}
                className={`size-2.5 shrink-0 rounded-full transition-colors duration-300 ${
                  s.emailDot === "valid"
                    ? "bg-brand-green-dark"
                    : s.emailDot === "checking"
                      ? "bg-brand-yellow"
                      : "bg-brand-border"
                }`}
              />
              <span className="sr-only" role="status">
                {s.emailDot === "valid" ? "Formato do e-mail válido" : ""}
              </span>
            </FunnelField>

            {s.emailHint && (
              <p
                id="email-hint"
                role="status"
                className="text-sm font-semibold text-brand-danger"
              >
                Ainda falta um pequeno detalhe 😊 — confere se tem @ e o
                domínio.
              </p>
            )}

            {s.emailSuggest && (
              <div className="flex flex-col gap-2 rounded-xl border border-brand-blue-bright/30 bg-brand-blue-bg px-4 py-3 text-left">
                <FunnelHint tone="ink">
                  Você quis dizer{" "}
                  <strong className="font-extrabold">{s.emailSuggest}</strong>?
                </FunnelHint>
                <div className="flex flex-wrap items-center gap-2">
                  <Button
                    type="button"
                    size="sm"
                    onClick={act.emailUseSuggestion}
                    aria-label={`Usar ${s.emailSuggest}`}
                  >
                    Usar
                  </Button>
                  <Button
                    type="button"
                    size="sm"
                    variant="outline"
                    onClick={act.emailKeepTyped}
                  >
                    Manter mesmo assim
                  </Button>
                </div>
              </div>
            )}

            {s.emailTemp && !s.emailSuggest && (
              <div className="rounded-xl border border-brand-yellow/60 bg-brand-yellow/15 px-4 py-3 text-left">
                <FunnelHint tone="ink">
                  ⏳ Esse parece um e-mail temporário — ele some depois de um
                  tempo, e é por ele que enviamos seu acesso. Pode usar, mas um
                  e-mail seu de verdade é mais seguro.
                </FunnelHint>
              </div>
            )}

            <Button type="button" size="xl" variant="primary" onClick={act.submitEmail}>
              Continuar
            </Button>
          </div>
        )}

        {s.emailPhase === "processing" && (
          <div className="flex flex-col items-center gap-4 py-6 text-center">
            <FunnelStatus>Verificando disponibilidade…</FunnelStatus>
          </div>
        )}

        {s.emailPhase === "success" && (
          <div
            className="flex flex-col items-center gap-3 py-6 text-center"
            role="status"
          >
            <FunnelStatusIcon tone="green" className={styles.modalPop}>
              <IconCheck className="size-9" />
            </FunnelStatusIcon>
            <FunnelTitle>
              {s.emailAlreadyYours
                ? "Perfeito, já é o seu e-mail"
                : "Excelente!"}
            </FunnelTitle>
            <p className="text-sm font-semibold text-brand-muted">
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
              <svg viewBox="0 0 240 170" fill="none" className="h-auto w-full">
                <rect
                  x="8"
                  y="18"
                  width="224"
                  height="140"
                  rx="14"
                  fill="var(--color-brand-blue-bg)"
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
                  fill="var(--color-brand-green-dark)"
                />
                <path
                  d="M188 128l6 6 12-12"
                  stroke="var(--color-brand-surface)"
                  strokeWidth="3.5"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              </svg>
            </div>
            <p className="text-base font-bold text-brand-ink">
              E-mail confirmado!
            </p>
          </div>
        )}

        {s.emailPhase === "taken" && (
          <div
            role="alert"
            className={`${styles.modalPop} flex w-full flex-col items-center gap-3 py-4 text-center`}
          >
            <FunnelStatusIcon tone="blue">
              <IconShield className="size-9" />
            </FunnelStatusIcon>
            <FunnelTitle>Esse e-mail já está protegido</FunnelTitle>
            <FunnelHint>
              Ele já é o canal de acesso de outra conta. Se o e-mail é seu e
              você quer recuperar o acesso, o suporte te ajuda com segurança.
            </FunnelHint>
            <Button
              type="button"
              size="xl"
              variant="primary"
              onClick={act.emailSwap}
              className="w-full"
            >
              Trocar e-mail
            </Button>
            <Button
              type="button"
              variant="dangerSoft"
              onClick={act.supportWhats}
            >
              Falar com o suporte
            </Button>
          </div>
        )}
      </FunnelEntryCard>
    </FunnelMain>
  );
}

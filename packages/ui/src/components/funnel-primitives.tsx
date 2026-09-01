"use client";

import type { ReactNode } from "react";

import styles from "./funnel-primitives.module.css";

/**
 * Pílula sutil de "← Voltar" — padrão consistente do funil com microinteração suave,
 * borda translúcida e elevação leve (estilo Creative Tim UI / glass).
 */
export function BackPill({
  onClick,
  children = "Voltar",
  className = "",
}: {
  onClick: () => void;
  children?: ReactNode;
  className?: string;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`inline-flex min-h-9 cursor-pointer items-center gap-1.5 self-start rounded-full border border-brand-border/80 bg-white/80 px-3.5 py-1.5 text-[13px] font-bold text-brand-ink shadow-sm backdrop-blur-md transition-all hover:bg-white hover:shadow-md hover:-translate-x-0.5 active:scale-[0.98] ${className}`}
    >
      <span aria-hidden className="transition-transform group-hover:-translate-x-0.5">←</span>
      <span>{children}</span>
    </button>
  );
}

/**
 * Barra de etapas do funil. Começa no OTP: a tela do telefone não tem — quem acabou
 * de digitar o número ainda não sabe que entrou num funil, e mostrar "1 de 4" ali
 * seria anunciar trabalho antes de ter vínculo. Cumprida = verde, atual = azul,
 * futura = borda.
 *
 * `compact` é a variante da tela de planos (4 de 4): centralizada, segmentos de
 * largura fixa e brilho no último quando é o passo atual — a chegada merece glow.
 */
export function StepBar({
  step,
  total = 4,
  label,
  className = "",
  compact = false,
}: {
  step: number;
  total?: number;
  label: string;
  /** Cards com `items-center` precisam de `self-stretch` — senão `flex-1` colapsa a barra. */
  className?: string;
  compact?: boolean;
}) {
  return (
    // `role="img"`: sem papel, o aria-label de uma div não é anunciado de forma confiável.
    <div
      role="img"
      aria-label={`Etapa ${step} de ${total} — ${label}`}
      className={`flex gap-1.5 ${compact ? "justify-center" : ""} ${className}`}
    >
      {Array.from({ length: total }, (_, i) => (
        <span
          key={i}
          className={`h-[5px] rounded-full ${compact ? "w-[34px]" : "flex-1"} ${
            i + 1 < step
              ? "bg-brand-green"
              : i + 1 === step
                ? `bg-brand-blue-bright ${
                    // Glow do protótipo (rgba(56,132,255,.7)) via token, não hex solto.
                    step === total
                      ? "shadow-[0_0_12px_color-mix(in_srgb,var(--color-brand-blue-bright)_70%,transparent)]"
                      : ""
                  }`
                : "bg-brand-border"
          }`}
        />
      ))}
    </div>
  );
}

/** Linha luminosa varrendo (scanline horizontal do CPF/checkout). */
export function SweepLine({ reverse = false, className = "" }: { reverse?: boolean; className?: string }) {
  const gradient = reverse
    ? "bg-[linear-gradient(90deg,transparent,var(--color-brand-blue-bright),var(--color-brand-green-light),transparent)]"
    : "bg-[linear-gradient(90deg,transparent,var(--color-brand-green-light),var(--color-brand-blue-bright),transparent)]";
  return <div aria-hidden className={`${styles.scanlineH} h-0.5 rounded-sm ${gradient} ${className}`} />;
}

/** Spinner inline pequeno (o "Verificando…" dos passos). */
export function InlineSpinner({ className = "size-4" }: { className?: string }) {
  return (
    <span
      aria-hidden
      className={`inline-block animate-spin rounded-full border-2 border-brand-blue-bright border-t-transparent ${className}`}
    />
  );
}

/** Pílula de reenvio de código (OTP) com suporte a contagem regressiva e estados. */
export interface ResendCodePillProps {
  waiting: boolean;
  seconds?: number;
  onClick: () => void;
  className?: string;
}

export function ResendCodePill({
  waiting,
  seconds = 0,
  onClick,
  className = "",
}: ResendCodePillProps) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={waiting}
      className={`inline-flex items-center gap-1.5 self-center rounded-full border px-3.5 py-1.5 text-xs font-bold transition-all duration-300 ${
        waiting
          ? "cursor-default border-brand-border/80 bg-white/60 text-brand-muted backdrop-blur-sm"
          : "cursor-pointer border-brand-green-dark/40 bg-brand-green-bg text-brand-green-dark shadow-sm hover:bg-brand-green/20 hover:shadow-md active:scale-[0.98]"
      } ${className}`}
    >
      <svg
        className="size-[13px]"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="2.2"
        strokeLinecap="round"
        strokeLinejoin="round"
        aria-hidden
      >
        <circle cx="12" cy="12" r="9" />
        <path d="M12 7v5l3 2" />
      </svg>
      {waiting ? `Reenviar em ${seconds}s` : "Reenviar código"}
    </button>
  );
}

/** Bolha de digitação de status do chatbot / assistente no funil. */
export function TypingBubble({ className = "" }: { className?: string }) {
  return (
    <div
      aria-hidden
      className={`inline-flex items-center gap-[7px] rounded-[18px_18px_18px_5px] bg-brand-blue-bg px-4 py-2.5 shadow-[0_8px_20px_-8px_rgba(1,33,105,0.35)] ${className}`}
    >
      <span
        className="size-[8px] animate-pulse rounded-full bg-brand-blue-bright"
        style={{ animationDuration: "1s", animationDelay: "0s" }}
      />
      <span
        className="size-[8px] animate-pulse rounded-full bg-brand-blue-bright"
        style={{ animationDuration: "1s", animationDelay: "0.2s" }}
      />
      <span
        className="size-[8px] animate-pulse rounded-full bg-brand-blue-bright"
        style={{ animationDuration: "1s", animationDelay: "0.4s" }}
      />
    </div>
  );
}


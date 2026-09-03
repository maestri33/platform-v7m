"use client";

import type { ElementType, ReactNode } from "react";

import styles from "./funnel-primitives.module.css";

/* ═══════════════════════════════════════════════════════════════════════════
 * Escala do funil — UMA definição para as sete telas (VIC / issue #160).
 *
 * Antes cada tela reinventava a mesma coisa com valor arbitrário: título em
 * `text-[23px]` aqui, `text-[21px]` ali, `text-[22px]` na outra; sobrelinha em
 * `tracking-[0.12em]` numa tela e `tracking-[0.14em]` na vizinha; dica em
 * `text-[13px]` sete vezes. Aqui embaixo cada papel tipográfico tem UM valor,
 * expresso na escala do Tailwind (que é o token), e as telas passam a compor
 * componentes em vez de repetir utilitários.
 * ═══════════════════════════════════════════════════════════════════════════ */

/** Sobrelinha verde em caixa alta ("ENTRAR OU CRIAR CADASTRO"). */
export function FunnelEyebrow({
  children,
  className = "",
}: {
  children: ReactNode;
  className?: string;
}) {
  return (
    <p
      className={`text-xs font-extrabold uppercase tracking-widest text-brand-green-dark ${className}`}
    >
      {children}
    </p>
  );
}

/**
 * Título do passo. `tone="onDark"` é a variante das telas que escrevem direto
 * sobre a aurora (planos) em vez de dentro do card.
 */
export function FunnelTitle({
  as,
  tone = "ink",
  children,
  className = "",
}: {
  as?: ElementType;
  tone?: "ink" | "onDark";
  children: ReactNode;
  className?: string;
}) {
  const Tag = (as ?? "h2") as ElementType;
  return (
    <Tag
      className={`text-2xl font-extrabold leading-tight tracking-tight ${
        tone === "onDark" ? "text-white" : "text-brand-ink"
      } ${className}`}
    >
      {children}
    </Tag>
  );
}

/** Texto de apoio / dica do passo. */
export function FunnelHint({
  tone = "muted",
  children,
  className = "",
}: {
  tone?: "muted" | "ink" | "onDark";
  children: ReactNode;
  className?: string;
}) {
  const color =
    tone === "ink"
      ? "text-brand-ink"
      : tone === "onDark"
        ? "text-white/90"
        : "text-brand-muted";
  return (
    <p className={`text-sm leading-relaxed ${color} ${className}`}>{children}</p>
  );
}

/** Rótulo de campo (caixa alta discreta acima do input). */
export function FunnelFieldLabel({
  htmlFor,
  children,
  className = "",
}: {
  htmlFor: string;
  children: ReactNode;
  className?: string;
}) {
  return (
    <label
      htmlFor={htmlFor}
      className={`text-xs font-bold uppercase tracking-widest text-brand-muted ${className}`}
    >
      {children}
    </label>
  );
}

/**
 * Moldura do campo do funil — o retângulo com borda e fundo claro que as telas
 * de telefone e e-mail desenhavam cada uma do seu jeito (`rounded-[18px]` +
 * `border-[1.5px]` numa, `rounded-[14px]` na outra).
 */
export function FunnelField({
  invalid = false,
  row = false,
  children,
  className = "",
}: {
  invalid?: boolean;
  /** Campo em linha (input + indicador ao lado), como o de e-mail. */
  row?: boolean;
  children: ReactNode;
  className?: string;
}) {
  return (
    <div
      className={`flex w-full gap-2 rounded-xl border bg-brand-bg px-4 text-left ${
        row ? "flex-row items-center py-1.5" : "flex-col py-3"
      } ${invalid ? "border-brand-danger" : "border-brand-border"} ${className}`}
    >
      {children}
    </div>
  );
}

/** Linha "estamos processando" (spinner + frase). Eram 4 cópias idênticas. */
export function FunnelStatus({
  children,
  className = "",
}: {
  children: ReactNode;
  className?: string;
}) {
  return (
    <p
      role="status"
      className={`flex items-center justify-center gap-2 text-sm font-bold text-brand-blue ${className}`}
    >
      <InlineSpinner />
      {children}
    </p>
  );
}

const STATUS_TONE = {
  green: "bg-brand-green-bg text-brand-green-dark",
  blue: "bg-brand-blue-bg text-brand-blue",
  danger: "bg-brand-danger-bg text-brand-danger",
} as const;

/**
 * Disco de ícone de estado (o `size-[72px] rounded-full bg-…` que e-mail e
 * checkout repetiam cinco vezes, cada um com um par de cores diferente).
 */
export function FunnelStatusIcon({
  tone = "green",
  size = "lg",
  children,
  className = "",
}: {
  tone?: keyof typeof STATUS_TONE;
  size?: "md" | "lg";
  children: ReactNode;
  className?: string;
}) {
  return (
    <span
      aria-hidden
      className={`flex items-center justify-center rounded-full ${
        size === "md" ? "size-11" : "size-18"
      } ${STATUS_TONE[tone]} ${className}`}
    >
      {children}
    </span>
  );
}

/** Chip do link seguro do gateway (duas cópias iguais dentro do checkout). */
export function SecureLinkPill({
  url,
  className = "",
}: {
  url?: string | null;
  className?: string;
}) {
  if (!url) return null;
  return (
    <span
      className={`flex max-w-full items-center gap-2 rounded-xl border border-brand-border bg-brand-bg px-3 py-2 ${className}`}
    >
      <IconLock className="size-4 flex-none text-brand-green-dark" />
      <span className="truncate text-xs font-bold text-brand-muted">{url}</span>
    </span>
  );
}

/* ── Ícones compartilhados ─────────────────────────────────────────────────
 * Os mesmos `path` viviam colados em quatro telas. Os `*Paths` existem porque
 * o TrustBadges recebe só os traços e desenha o `<svg>` por fora. */

function FunnelIcon({
  className = "size-5",
  strokeWidth = 2,
  children,
}: {
  className?: string;
  strokeWidth?: number;
  children: ReactNode;
}) {
  return (
    <svg
      className={className}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={strokeWidth}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden
    >
      {children}
    </svg>
  );
}

export const IconLockPaths = (
  <>
    <rect x="5" y="11" width="14" height="9" rx="2" />
    <path d="M8 11V8a4 4 0 0 1 8 0v3" />
  </>
);

export const IconShieldPaths = (
  <>
    <path d="M12 3l7 3v6c0 4-3 6.5-7 8-4-1.5-7-4-7-8V6l7-3z" />
    <path d="M9 12l2 2 4-4" />
  </>
);

export const IconMonitorPaths = (
  <>
    <rect x="3" y="4" width="18" height="12" rx="2" />
    <path d="M8 20h8M12 16v4" />
  </>
);

export function IconLock({ className, strokeWidth = 2 }: { className?: string; strokeWidth?: number }) {
  return (
    <FunnelIcon className={className} strokeWidth={strokeWidth}>
      {IconLockPaths}
    </FunnelIcon>
  );
}

export function IconShield({ className, strokeWidth = 1.7 }: { className?: string; strokeWidth?: number }) {
  return (
    <FunnelIcon className={className} strokeWidth={strokeWidth}>
      <path d="M12 3l7 3v5c0 4.6-3.1 7.7-7 9-3.9-1.3-7-4.4-7-9V6z" />
      <rect x="9.3" y="11.2" width="5.4" height="4.6" rx="1" />
      <path d="M10.4 11.2v-1.1a1.6 1.6 0 0 1 3.2 0v1.1" />
    </FunnelIcon>
  );
}

/** Visto. `pathClassName` deixa a tela animar o traço (checkout/e-mail). */
export function IconCheck({
  className,
  strokeWidth = 2.4,
  pathClassName,
}: {
  className?: string;
  strokeWidth?: number;
  pathClassName?: string;
}) {
  return (
    <FunnelIcon className={className} strokeWidth={strokeWidth}>
      <path className={pathClassName} d="M5 13l4 4L19 7" pathLength="1" />
    </FunnelIcon>
  );
}

export function IconMail({ className, strokeWidth = 2 }: { className?: string; strokeWidth?: number }) {
  return (
    <FunnelIcon className={className} strokeWidth={strokeWidth}>
      <rect x="3" y="5" width="18" height="14" rx="2" />
      <path d="M3 7l9 6 9-6" />
    </FunnelIcon>
  );
}

export function IconReceipt({ className, strokeWidth = 1.7 }: { className?: string; strokeWidth?: number }) {
  return (
    <FunnelIcon className={className} strokeWidth={strokeWidth}>
      <path d="M4 7h16M4 12h10M4 17h7" />
      <path d="M17 14l4 4M21 14l-4 4" />
    </FunnelIcon>
  );
}

export function IconCreditCard({ className, strokeWidth = 2 }: { className?: string; strokeWidth?: number }) {
  return (
    <FunnelIcon className={className} strokeWidth={strokeWidth}>
      <rect x="3" y="6" width="18" height="13" rx="2" />
      <path d="M3 10h18" />
      <circle cx="16.5" cy="14.5" r="1" />
    </FunnelIcon>
  );
}

/**
 * Casca da tela do funil. As sete telas escreviam sete variações da MESMA
 * coisa (`px-6 py-3` × `px-6 pt-3 pb-8`, e larguras `max-w-md` / `380px` /
 * `400px` / `440px` / `3xl`); aqui existem só duas larguras: a do card e a
 * larga (grade de planos). O `id="conteudo"` é o alvo do skip-link.
 */
export function FunnelMain({
  width = "card",
  children,
  className = "",
}: {
  width?: "card" | "wide";
  children: ReactNode;
  className?: string;
}) {
  return (
    <main id="conteudo" className="flex flex-1 px-6 py-4">
      <div
        className={`m-auto flex w-full flex-col items-center gap-4 ${
          width === "wide" ? "max-w-3xl" : "max-w-md"
        } ${className}`}
      >
        {children}
      </div>
    </main>
  );
}

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


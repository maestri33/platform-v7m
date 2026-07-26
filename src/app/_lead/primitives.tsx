"use client";

import { useRef, type ReactNode } from "react";

import styles from "./lead-flow.module.css";

/**
 * Pílula vermelha discreta de "← Voltar" — padrão repetível do protótipo
 * (mesma posição e estilo em todas as telas; substitui o BackLink antigo
 * dentro do funil, onde a navegação é por estado e não por rota).
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
      className={`inline-flex min-h-9 cursor-pointer items-center gap-1 self-start rounded-full border border-brand-danger/30 bg-brand-danger/10 px-3 py-1.5 text-[13px] font-bold text-brand-danger ${className}`}
    >
      <span aria-hidden>←</span>
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
 * A tela de planos (4 de 4) usa a mesma barra centralizada e com brilho no último
 * segmento; a variante entra quando chegarmos nela, não antes.
 */
export function StepBar({
  step,
  total = 4,
  label,
  className = "",
}: {
  step: number;
  total?: number;
  label: string;
  /** Cards com `items-center` precisam de `self-stretch` — senão `flex-1` colapsa a barra. */
  className?: string;
}) {
  return (
    // `role="img"`: sem papel, o aria-label de uma div não é anunciado de forma confiável.
    <div
      role="img"
      aria-label={`Etapa ${step} de ${total} — ${label}`}
      className={`flex gap-1.5 ${className}`}
    >
      {Array.from({ length: total }, (_, i) => (
        <span
          key={i}
          className={`h-[5px] flex-1 rounded-full ${
            i + 1 < step
              ? "bg-brand-green"
              : i + 1 === step
                ? "bg-brand-blue-bright"
                : "bg-brand-border"
          }`}
        />
      ))}
    </div>
  );
}

/**
 * CPF em caixas 3·3·3-2 (modelo posicional, irmão do OtpInput): separadores
 * "." após as caixas 3 e 6 e "-" após a 9. Colar/autofill distribui a partir
 * da caixa. O funil confirma sozinho no 11º dígito (sem botão).
 */
export function CpfBoxes({
  value,
  onChange,
  disabled = false,
}: {
  value: string;
  onChange: (next: string) => void;
  disabled?: boolean;
}) {
  const refs = useRef<Array<HTMLInputElement | null>>([]);
  const LENGTH = 11;

  function focusAt(i: number) {
    refs.current[Math.max(0, Math.min(i, LENGTH - 1))]?.focus();
  }

  function distribute(from: number, raw: string) {
    const digits = raw.replace(/\D+/g, "");
    if (!digits) return;
    const next = (value.slice(0, from) + digits).replace(/\D+/g, "").slice(0, LENGTH);
    onChange(next);
    focusAt(next.length);
  }

  function handleChange(i: number, raw: string) {
    const digits = raw.replace(/\D+/g, "");
    if (digits.length > 1) {
      distribute(i, digits);
      return;
    }
    const arr = value.padEnd(LENGTH).split("");
    arr[i] = digits;
    const next = arr.join("").replace(/\s+/g, "");
    onChange(next);
    if (digits && i < LENGTH - 1) focusAt(i + 1);
  }

  function handleKeyDown(i: number, e: React.KeyboardEvent<HTMLInputElement>) {
    if (e.key === "Backspace") {
      e.preventDefault();
      const arr = value.padEnd(LENGTH).split("");
      if (arr[i]?.trim()) {
        arr[i] = "";
        onChange(arr.join("").replace(/\s+/g, ""));
      } else if (i > 0) {
        arr[i - 1] = "";
        onChange(arr.join("").replace(/\s+/g, ""));
        focusAt(i - 1);
      }
    } else if (e.key === "ArrowLeft") {
      e.preventDefault();
      focusAt(i - 1);
    } else if (e.key === "ArrowRight") {
      e.preventDefault();
      focusAt(i + 1);
    }
  }

  return (
    <div
      role="group"
      aria-label="CPF, 11 dígitos"
      className="flex w-full items-center justify-center gap-1 rounded-[18px] border border-brand-blue/15 bg-brand-blue/5 px-3 py-4"
    >
      {Array.from({ length: LENGTH }, (_, i) => {
        const filled = !!value[i];
        const active = i === value.length && !disabled;
        return (
          <span key={i} className="contents">
            <input
              ref={(el) => {
                refs.current[i] = el;
              }}
              type="text"
              inputMode="numeric"
              autoComplete="off"
              maxLength={i === 0 ? LENGTH : 1}
              aria-label={`Dígito ${i + 1} do CPF`}
              disabled={disabled}
              value={value[i] ?? ""}
              onChange={(e) => handleChange(i, e.target.value)}
              onKeyDown={(e) => handleKeyDown(i, e)}
              onPaste={(e) => {
                e.preventDefault();
                distribute(i, e.clipboardData.getData("text"));
              }}
              className={`${active ? styles.activePulse : ""} h-12 min-w-0 flex-1 rounded-[10px] border-2 p-0 text-center text-lg font-extrabold text-brand-ink outline-none transition ${
                filled
                  ? "border-brand-green-dark bg-brand-green-bg/70"
                  : active
                    ? "border-brand-blue-bright bg-white/60"
                    : "border-brand-border bg-white/60"
              }`}
            />
            {(i === 2 || i === 5) && (
              <span aria-hidden className="shrink-0 px-px text-lg font-extrabold text-brand-muted">
                .
              </span>
            )}
            {i === 8 && (
              <span aria-hidden className="shrink-0 px-px text-lg font-extrabold text-brand-muted">
                -
              </span>
            )}
          </span>
        );
      })}
    </div>
  );
}

const WOOD =
  "z-[2] w-[103%] rounded-full bg-[linear-gradient(180deg,#7a5a2e,#4a3312_60%,#2f2009)] shadow-[0_5px_12px_rgba(0,0,0,0.3),inset_0_1px_0_rgba(255,255,255,0.25)]";

/**
 * Pergaminho com roletes de madeira — o "diplominha" da marca. Moldura
 * compartilhada entre o crachá do painel, a carteira do aluno (home) e o
 * reveal de identidade do CPF (que anima abrir/fechar por fora).
 */
export function Parchment({
  children,
  rollerClassName = "h-[15px]",
  bodyClassName = "px-[18px] pb-[22px] pt-5",
  wide = false,
}: {
  children: ReactNode;
  rollerClassName?: string;
  bodyClassName?: string;
  wide?: boolean;
}) {
  const roller = `${WOOD} ${rollerClassName} ${wide ? "w-[106%]" : "w-[103%]"}`;
  return (
    <>
      <div aria-hidden className={roller} />
      <div className="w-[96%]">
        <div
          className={`relative -my-[3px] border-x-2 border-[#d8c079] bg-[linear-gradient(180deg,#fbf4dd_0%,#f4e7c6_55%,#ecdcae_100%)] shadow-[inset_0_0_36px_rgba(150,110,40,0.2),inset_0_2px_0_rgba(255,255,255,0.5)] ${bodyClassName}`}
        >
          <div
            aria-hidden
            className="pointer-events-none absolute inset-[7px] rounded border border-[rgba(120,90,30,0.32)]"
          />
          <div className="relative flex flex-col items-center">{children}</div>
        </div>
      </div>
      <div aria-hidden className={roller} />
    </>
  );
}

/**
 * Retrato do pergaminho (redesenho 2026-07-25): a foto REAL de perfil do
 * WhatsApp num anel dourado + selo de origem; sem foto → monograma serifado —
 * escolha de desenho, não aviso de falta (o ícone de câmera lia como imagem
 * quebrada). Sépia leve pra selfie qualquer não brigar com o papel. A foto é
 * ILUSTRAÇÃO (pública, definida pelo usuário no zap), nunca prova de identidade.
 */
export function ParchmentPortrait({
  name,
  photo,
  size = 96,
  className = "",
  style,
}: {
  name: string;
  photo: string | null;
  size?: number;
  className?: string;
  style?: React.CSSProperties;
}) {
  const words = name.trim().split(/\s+/).filter(Boolean);
  const initials =
    ((words[0]?.[0] ?? "") + (words.length > 1 ? (words[words.length - 1]?.[0] ?? "") : ""))
      .toUpperCase() || "•";
  const inner = size - 12;
  return (
    <div
      style={{ width: size, height: size, ...style }}
      className={`relative grid place-items-center ${className}`}
    >
      <span
        aria-hidden
        className="absolute inset-0 rounded-full bg-[conic-gradient(from_200deg,#e6c983,#a9782c,#f0dda6,#8d6220,#e6c983)] shadow-[0_5px_16px_rgba(90,60,10,0.4)]"
      />
      {photo ? (
        <>
          {/* CDN volátil do WhatsApp: <img> cru de propósito — otimizar/permitir domínio no
              next/image não paga o custo pra uma URL que expira em dias. */}
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={photo}
            alt=""
            style={{ width: inner, height: inner }}
            className="relative rounded-full border-2 border-[#fbf4dd] object-cover [filter:sepia(0.32)_contrast(1.04)_saturate(0.94)]"
          />
          <span className="absolute -bottom-[3px] -right-1.5 rounded-full border-2 border-[#fbf4dd] bg-[#128c3e] px-[7px] py-[2px] text-[8.5px] font-extrabold uppercase tracking-[0.05em] text-white">
            WhatsApp
          </span>
        </>
      ) : (
        <span
          style={{ width: inner, height: inner }}
          className="relative grid place-items-center rounded-full border-2 border-[#fbf4dd] bg-[radial-gradient(circle_at_50%_30%,#fdf6e2,#e0cb95)] font-serif text-[30px] font-bold tracking-[0.03em] text-[#7a5a17]"
        >
          {initials}
        </span>
      )}
    </div>
  );
}

/**
 * Círculo de foto do pergaminho — placeholder no protótipo
 * (em produção a foto vem da consulta de identidade pelo CPF).
 */
export function ParchmentPhoto({
  size = 74,
  className = "",
  style,
}: {
  size?: number;
  className?: string;
  style?: React.CSSProperties;
}) {
  return (
    <div
      style={{ width: size, height: size, ...style }}
      className={`flex flex-col items-center justify-center gap-0.5 rounded-full border-[3px] border-[#c8a24e] bg-[radial-gradient(circle_at_50%_35%,#fffbe9,#e8d6a6)] text-[#a9863f] shadow-[0_4px_12px_rgba(90,60,10,0.35)] ${className}`}
    >
      <svg
        style={{ width: size * 0.3, height: size * 0.3 }}
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.7"
        strokeLinecap="round"
        strokeLinejoin="round"
        aria-hidden
      >
        <path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z" />
        <circle cx="12" cy="13" r="4" />
      </svg>
      <span className="text-[7px] font-extrabold uppercase tracking-[0.06em]">Foto</span>
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

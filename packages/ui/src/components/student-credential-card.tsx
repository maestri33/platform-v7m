"use client";

import type { ReactNode } from "react";

export interface StudentCredentialCardProps {
  name: string;
  photo?: string | null;
  age?: number | null;
  protocol: string;
  issuedAt: string;
  badgeText?: string;
  onContinue?: () => void;
  className?: string;
  children?: ReactNode;
}

/**
 * Cartão de credencial do estudante / confirmação de identidade — @v7m/ui.
 * Apresentação moderna, elegante e de alta confiança para confirmação de identidade.
 */
export function StudentCredentialCard({
  name,
  photo,
  age,
  protocol,
  issuedAt,
  badgeText = "✦ Vaga reservada",
  onContinue,
  className = "",
  children,
}: StudentCredentialCardProps) {
  const words = name.trim().split(/\s+/).filter(Boolean);
  const initials =
    ((words[0]?.[0] ?? "") + (words.length > 1 ? (words[words.length - 1]?.[0] ?? "") : ""))
      .toUpperCase() || "•";

  return (
    <div
      className={`relative flex w-full max-w-sm flex-col items-center gap-4 overflow-hidden rounded-[28px] border border-white/60 bg-gradient-to-b from-white/90 via-white/80 to-white/95 p-6 text-center shadow-[0_16px_40px_-12px_rgba(11,27,59,0.2),inset_0_1px_0_rgba(255,255,255,0.9)] backdrop-blur-xl transition-all ${className}`}
    >
      {/* Selo superior */}
      <div className="inline-flex items-center gap-1.5 rounded-full border border-brand-green/30 bg-brand-green-bg px-3.5 py-1.5 shadow-sm">
        <span className="size-2 rounded-full bg-brand-green animate-pulse" />
        <span className="text-[11px] font-extrabold uppercase tracking-[0.14em] text-brand-green-dark">
          {badgeText}
        </span>
      </div>

      {/* Avatar / Foto com anel de status */}
      <div className="relative my-1 grid size-24 place-items-center">
        <div
          aria-hidden
          className="absolute inset-0 rounded-full bg-gradient-to-tr from-brand-blue via-brand-green to-brand-blue-bright p-[3px] shadow-[0_6px_20px_rgba(0,156,59,0.25)]"
        >
          <div className="size-full rounded-full bg-white" />
        </div>
        {photo ? (
          <>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={photo}
              alt={name}
              className="relative size-[86px] rounded-full object-cover"
            />
            <span className="absolute -bottom-1 -right-1 rounded-full border-2 border-white bg-[#25D366] px-2 py-0.5 text-[9px] font-extrabold uppercase tracking-wider text-white shadow-sm">
              WhatsApp
            </span>
          </>
        ) : (
          <span className="relative grid size-[86px] place-items-center rounded-full bg-gradient-to-br from-brand-blue/10 to-brand-green/10 text-2xl font-extrabold text-brand-ink">
            {initials}
          </span>
        )}
      </div>

      {/* Nome e contexto */}
      <div className="flex flex-col gap-1">
        <h3 className="text-xl font-extrabold tracking-tight text-brand-ink">
          {name}
        </h3>
        {age !== null && age !== undefined && (
          <p className="text-sm font-medium text-brand-muted">
            Depois de <b className="text-brand-ink">{age} anos</b>, chegou a sua hora.
          </p>
        )}
      </div>

      <div aria-hidden className="h-px w-full bg-brand-border/60" />

      {/* Metadados / Protocolo */}
      <div className="flex w-full items-center justify-between text-xs font-bold text-brand-muted">
        <span className="rounded-md bg-brand-border/30 px-2.5 py-1">
          Protocolo: <b className="text-brand-ink">{protocol}</b>
        </span>
        <span className="rounded-md bg-brand-border/30 px-2.5 py-1">
          {issuedAt}
        </span>
      </div>

      {children}

      {/* Ação de continuar */}
      {onContinue && (
        <button
          type="button"
          onClick={onContinue}
          className="mt-2 inline-flex w-full min-h-[50px] cursor-pointer items-center justify-center gap-2 rounded-2xl bg-brand-green px-5 py-3 text-base font-extrabold text-white shadow-[0_8px_24px_rgba(0,156,59,0.35)] transition-all hover:bg-brand-green-dark active:scale-[0.98]"
        >
          <span>Continuar matrícula</span>
          <svg className="size-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
            <path d="M5 12h14M12 5l7 7-7 7" />
          </svg>
        </button>
      )}
    </div>
  );
}

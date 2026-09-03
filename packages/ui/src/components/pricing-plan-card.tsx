"use client";

import type { ReactNode } from "react";

export interface PricingPlanCardProps {
  title: string;
  badge?: string;
  icon: ReactNode;
  price: string;
  subPrice?: string;
  description: string;
  buttonLabel: string;
  isHighlighted?: boolean;
  onClick: () => void;
  className?: string;
}

/**
 * Card de seleção de plano e forma de pagamento — @v7m/ui.
 * Apresentação de alto impacto visual com destaque para Pix com desconto.
 */
export function PricingPlanCard({
  title,
  badge,
  icon,
  price,
  subPrice,
  description,
  buttonLabel,
  isHighlighted = false,
  onClick,
  className = "",
}: PricingPlanCardProps) {
  return (
    <button
      type="button"
      onClick={onClick}
      // Superfície OPACA como o FunnelEntryCard: em `bg-white/75` sobre a aurora
      // escura a descrição (`text-brand-muted`) media 3,3:1 — abaixo do AA.
      className={`relative flex w-full cursor-pointer flex-col gap-3 rounded-2xl bg-brand-surface p-6 text-left transition-all duration-300 hover:-translate-y-1 hover:shadow-[0_20px_45px_-12px_rgba(11,27,59,0.2)] active:scale-[0.99] ${
        isHighlighted
          ? "border-2 border-brand-green-dark shadow-[0_12px_32px_-8px_rgba(0,156,59,0.25)]"
          : "border border-brand-border shadow-[var(--shadow-card)]"
      } ${className}`}
    >
      {/* Badge superior opcional */}
      {badge && (
        <span className="absolute -top-3 left-6 rounded-full bg-brand-green-dark px-3.5 py-1 text-xs font-extrabold uppercase tracking-widest text-white shadow-md">
          {badge}
        </span>
      )}

      {/* Topo: Título + Ícone */}
      <div className="flex items-center justify-between gap-3 pt-1">
        <h3 className="text-xl font-extrabold text-brand-ink">{title}</h3>
        <span
          className={`flex size-12 items-center justify-center rounded-2xl shadow-sm ${
            isHighlighted
              ? "bg-brand-green-bg text-brand-green-dark"
              : "bg-brand-blue-bg text-brand-blue"
          }`}
        >
          {icon}
        </span>
      </div>

      {/* Preço grande */}
      <div className="flex flex-col">
        <span
          className={`text-4xl font-extrabold tracking-tight ${
            isHighlighted ? "text-brand-green-dark" : "text-brand-blue"
          }`}
        >
          {price}
        </span>
        {subPrice && (
          <span className="text-xs font-bold text-brand-muted">{subPrice}</span>
        )}
      </div>

      {/* Descrição */}
      <p className="text-sm leading-relaxed text-brand-muted">{description}</p>

      {/* Botão de Ação */}
      <div
        // `bg-brand-green` com texto branco media 3,6:1 (reprova AA em 14px);
        // `brand-green-dark` — o mesmo verde do Button `primary` — dá 5,0:1.
        className={`mt-2 flex min-h-14 w-full items-center justify-center gap-2 rounded-xl px-5 text-base font-extrabold text-white transition-all ${
          isHighlighted
            ? "bg-brand-green-dark shadow-[var(--shadow-button)] hover:bg-brand-green-dark/90"
            : "border-2 border-brand-blue bg-transparent !text-brand-blue hover:bg-brand-blue hover:!text-white"
        }`}
      >
        <span>{buttonLabel}</span>
        <svg
          className="size-4"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2.5"
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <path d="M5 12h14M12 5l7 7-7 7" />
        </svg>
      </div>
    </button>
  );
}

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
      className={`relative flex w-full cursor-pointer flex-col gap-3 rounded-[28px] p-6 text-left transition-all duration-300 hover:-translate-y-1 hover:shadow-[0_20px_45px_-12px_rgba(11,27,59,0.2)] active:scale-[0.99] ${
        isHighlighted
          ? "border-2 border-brand-green bg-gradient-to-b from-white/95 to-white/85 shadow-[0_12px_32px_-8px_rgba(0,156,59,0.25)]"
          : "border border-white/60 bg-white/75 shadow-[0_10px_30px_-10px_rgba(11,27,59,0.12)]"
      } backdrop-blur-xl ${className}`}
    >
      {/* Badge superior opcional */}
      {badge && (
        <span className="absolute -top-3 left-6 rounded-full bg-brand-green px-3.5 py-1 text-[11px] font-extrabold uppercase tracking-wider text-white shadow-md">
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
        className={`mt-2 flex min-h-[48px] w-full items-center justify-center gap-2 rounded-2xl px-5 text-base font-extrabold text-white transition-all ${
          isHighlighted
            ? "bg-brand-green shadow-[0_8px_20px_rgba(0,156,59,0.35)] hover:bg-brand-green-dark"
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

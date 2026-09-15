"use client";

import type { ReactNode } from "react";
import { CardContainer, CardBody, CardItem } from "../primitives/card";

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
  /** Ativa o efeito 3D parallax. Padrão: true */
  tilt?: boolean;
}

/**
 * Card de seleção de plano e forma de pagamento — @v7m/ui.
 * Apresentação de alto impacto visual com efeito 3D e destaque para Pix com desconto.
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
  tilt = true,
}: PricingPlanCardProps) {
  const cardContent = (
    <div
      onClick={onClick}
      role="button"
      tabIndex={0}
      onKeyDown={(e) => {
        if (e.key === "Enter" || e.key === " ") {
          e.preventDefault();
          onClick();
        }
      }}
      className={`relative flex w-full cursor-pointer flex-col gap-3 rounded-2xl bg-brand-surface p-6 text-left transition-all duration-300 hover:shadow-[0_20px_45px_-12px_rgba(11,27,59,0.2)] active:scale-[0.99] ${
        isHighlighted
          ? "border-2 border-brand-green-dark shadow-[0_12px_32px_-8px_rgba(0,156,59,0.25)]"
          : "border border-brand-border shadow-[var(--shadow-card)]"
      } ${className}`}
    >
      {/* Badge superior opcional com elevação 3D */}
      {badge && (
        <CardItem
          translateZ={50}
          className="absolute -top-3 left-6 rounded-full bg-brand-green-dark px-3.5 py-1 text-xs font-extrabold uppercase tracking-widest text-white shadow-md pointer-events-none"
        >
          {badge}
        </CardItem>
      )}

      {/* Topo: Título + Ícone */}
      <div className="flex items-center justify-between gap-3 pt-1">
        <CardItem translateZ={35}>
          <h3 className="text-xl font-extrabold text-brand-ink">{title}</h3>
        </CardItem>
        <CardItem translateZ={45}>
          <span
            className={`flex size-12 items-center justify-center rounded-2xl shadow-sm ${
              isHighlighted
                ? "bg-brand-green-bg text-brand-green-dark"
                : "bg-brand-blue-bg text-brand-blue"
            }`}
          >
            {icon}
          </span>
        </CardItem>
      </div>

      {/* Preço grande com elevação máxima */}
      <CardItem translateZ={60} className="flex flex-col">
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
      </CardItem>

      {/* Descrição */}
      <CardItem translateZ={25}>
        <p className="text-sm font-medium leading-relaxed text-brand-muted">
          {description}
        </p>
      </CardItem>

      {/* Botão de ação visual */}
      <CardItem translateZ={40} className="mt-2 w-full">
        <div
          className={`w-full py-3 px-4 rounded-xl text-center font-bold text-sm transition-colors ${
            isHighlighted
              ? "bg-brand-green-dark text-white hover:bg-brand-green-hover"
              : "bg-brand-blue text-white hover:bg-brand-blue/90"
          }`}
        >
          {buttonLabel}
        </div>
      </CardItem>
    </div>
  );

  if (tilt) {
    return (
      <CardContainer containerClassName="w-full p-0 py-2" className="w-full">
        <CardBody className="w-full">{cardContent}</CardBody>
      </CardContainer>
    );
  }

  return cardContent;
}

"use client";

import { formatBRL } from "@/lib/money";
import {
  BackPill,
  StepBar,
  PricingPlanCard,
  PlanConfirmModal,
  IconBadge,
} from "@v7m/ui";

import type { FlowActions, FlowState } from "./use-lead-flow";

function PixIcon({ className }: { className: string }) {
  return (
    <svg
      viewBox="0 0 512 512"
      className={className}
      fill="#32BCAD"
      aria-hidden
    >
      <path d="M392.5 122.9c-21.9 0-42.4 8.5-57.9 24l-63.9 63.9c-8 8-21.1 8.1-29.2 0l-63.6-63.6c-15.5-15.5-36-24-57.9-24h-8.3l80.7-80.7c25.1-25.1 65.8-25.1 90.9 0l80.4 80.4h-11.2zM119.9 389.4c21.9 0 42.4-8.5 57.9-24l63.6-63.6c7.8-7.8 21.4-7.8 29.2 0l63.9 63.9c15.5 15.5 36 24 57.9 24h11.2l-80.4 80.4c-25.1 25.1-65.8 25.1-90.9 0l-80.7-80.7h8.3zM430 175l55.8 55.8c25.1 25.1 25.1 65.8 0 90.9L430 377.5c-1.2-.5-2.6-.8-4-.8h-33.5c-15.1 0-29.9-6.1-40.6-16.8l-63.9-63.9c-20.1-20.2-55.2-20.2-75.4 0l-63.6 63.6c-10.7 10.7-25.5 16.8-40.6 16.8H70.6c-1.3 0-2.6.3-3.8.8l-56.1-56.1c-25.1-25.1-25.1-65.8 0-90.9L66.8 174c1.2.5 2.5.8 3.8.8h37.8c15.1 0 29.9 6.1 40.6 16.8l63.6 63.6c10.4 10.4 24 15.6 37.7 15.6s27.3-5.2 37.7-15.6l63.9-63.9c10.7-10.7 25.5-16.8 40.6-16.8H426c1.4 0 2.8-.3 4-.8z" />
    </svg>
  );
}

function CardIcon({ className }: { className: string }) {
  return (
    <svg viewBox="0 0 24 24" className={className} fill="none" aria-hidden>
      <rect
        x="2"
        y="4.5"
        width="20"
        height="15"
        rx="3"
        fill="var(--color-brand-blue-bright)"
      />
      <rect
        x="2"
        y="8"
        width="20"
        height="3.2"
        fill="#0b1b3b"
        opacity="0.85"
      />
      <rect
        x="5"
        y="14"
        width="6"
        height="2"
        rx="1"
        fill="#fff"
        opacity="0.9"
      />
      <circle cx="16.6" cy="15" r="1.9" fill="#ffdf00" />
      <circle cx="19" cy="15" r="1.9" fill="#fff" opacity="0.75" />
    </svg>
  );
}

/**
 * Planos — passo 6 do funil de lead.
 * Padronizado utilizando componentes PricingPlanCard e PlanConfirmModal do @v7m/ui.
 */
export function ScreenPlanos({ s, act }: { s: FlowState; act: FlowActions }) {
  const pricing = s.pricing;
  const isPix = s.planExpanded === "pix";

  const details = isPix
    ? [
        { label: "Valor total", value: formatBRL(pricing.pix) },
        {
          label: "Forma de pagamento",
          value: "Pix (QR Code ou copia-e-cola)",
        },
        { label: "Aprovação", value: "Na hora" },
        { label: "Acesso às aulas", value: "Liberado após confirmação" },
      ]
    : [
        {
          label: "Parcelas",
          value: `${pricing.card.installments}× de ${formatBRL(pricing.card.installment)}`,
        },
        { label: "Valor total", value: formatBRL(pricing.card.total) },
        { label: "Bandeiras", value: "Visa, Master, Elo e mais" },
        { label: "Acesso às aulas", value: "Liberado após aprovação" },
      ];

  return (
    <main id="conteudo" className="flex flex-1 px-6 pt-3 pb-8">
      <div className="mx-auto my-auto flex w-full max-w-3xl flex-col gap-5">
        <div className="flex flex-col items-center gap-3 text-center">
          <BackPill onClick={act.planosBack} />
          <IconBadge>
            <svg
              className="size-8"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
              aria-hidden
            >
              <rect x="3" y="6" width="18" height="13" rx="2" />
              <path d="M3 10h18" />
              <circle cx="16.5" cy="14.5" r="1" />
            </svg>
          </IconBadge>
          <h1 className="text-[28px] font-extrabold leading-tight text-white">
            Como você prefere pagar?
          </h1>
          <StepBar step={4} total={4} label="pagamento" compact />
          <p className="text-base leading-relaxed text-white/80">
            Falta só isso pra garantir sua vaga. Escolha o jeito que fica melhor
            pra você.
          </p>
        </div>

        <div className="grid grid-cols-1 gap-5 md:grid-cols-2">
          {/* Card Pix à vista */}
          <PricingPlanCard
            title="Pix à vista"
            badge="Melhor preço"
            icon={<PixIcon className="size-7" />}
            price={formatBRL(pricing.pix)}
            subPrice="pagamento único"
            description="Pagamento único, aprovação na hora. O jeito mais econômico de garantir sua vaga."
            buttonLabel="Escolher Pix"
            isHighlighted
            onClick={() => act.expandPlan("pix")}
          />

          {/* Card Cartão de Crédito */}
          <PricingPlanCard
            title="Cartão de crédito"
            icon={<CardIcon className="size-7" />}
            price={`${pricing.card.installments}× de ${formatBRL(pricing.card.installment)}`}
            subPrice={`Total de ${formatBRL(pricing.card.total)}`}
            description={`Parcele em até ${pricing.card.installments}× no cartão de crédito.`}
            buttonLabel="Escolher cartão"
            onClick={() => act.expandPlan("card")}
          />
        </div>

        {/* Modal de Confirmação do Plano */}
        {!!s.planExpanded && (
          <PlanConfirmModal
            isOpen={!!s.planExpanded}
            isPix={isPix}
            icon={
              isPix ? (
                <PixIcon className="size-8" />
              ) : (
                <CardIcon className="size-8" />
              )
            }
            title={isPix ? "Pix à vista" : "Cartão de crédito"}
            price={
              isPix
                ? formatBRL(pricing.pix)
                : `${pricing.card.installments}× de ${formatBRL(pricing.card.installment)}`
            }
            details={details}
            onConfirm={act.confirmPlan}
            onBack={act.collapsePlan}
          />
        )}
      </div>
    </main>
  );
}

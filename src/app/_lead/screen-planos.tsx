"use client";

import { BrandDots } from "@/components/ui/brand-dots";
import { IconBadge } from "@/components/ui/icon-badge";
import { formatBRL } from "@/lib/money";

import { PRICING } from "./flow-data";
import styles from "./lead-flow.module.css";
import { BackPill } from "./primitives";
import type { FlowActions, FlowState, PaymentMethod } from "./use-lead-flow";

function PixIcon({ className }: { className: string }) {
  return (
    <svg viewBox="0 0 512 512" className={className} fill="#32BCAD" aria-hidden>
      <path d="M392.5 122.9c-21.9 0-42.4 8.5-57.9 24l-63.9 63.9c-8 8-21.1 8.1-29.2 0l-63.6-63.6c-15.5-15.5-36-24-57.9-24h-8.3l80.7-80.7c25.1-25.1 65.8-25.1 90.9 0l80.4 80.4h-11.2zM119.9 389.4c21.9 0 42.4-8.5 57.9-24l63.6-63.6c7.8-7.8 21.4-7.8 29.2 0l63.9 63.9c15.5 15.5 36 24 57.9 24h11.2l-80.4 80.4c-25.1 25.1-65.8 25.1-90.9 0l-80.7-80.7h8.3zM430 175l55.8 55.8c25.1 25.1 25.1 65.8 0 90.9L430 377.5c-1.2-.5-2.6-.8-4-.8h-33.5c-15.1 0-29.9-6.1-40.6-16.8l-63.9-63.9c-20.1-20.2-55.2-20.2-75.4 0l-63.6 63.6c-10.7 10.7-25.5 16.8-40.6 16.8H70.6c-1.3 0-2.6.3-3.8.8l-56.1-56.1c-25.1-25.1-25.1-65.8 0-90.9L66.8 174c1.2.5 2.5.8 3.8.8h37.8c15.1 0 29.9 6.1 40.6 16.8l63.6 63.6c10.4 10.4 24 15.6 37.7 15.6s27.3-5.2 37.7-15.6l63.9-63.9c10.7-10.7 25.5-16.8 40.6-16.8H426c1.4 0 2.8-.3 4-.8z" />
    </svg>
  );
}

function CardIcon({ className }: { className: string }) {
  return (
    <svg viewBox="0 0 24 24" className={className} fill="none" aria-hidden>
      <rect x="2" y="4.5" width="20" height="15" rx="3" fill="var(--color-brand-blue-bright)" />
      <rect x="2" y="8" width="20" height="3.2" fill="#0b1b3b" opacity="0.85" />
      <rect x="5" y="14" width="6" height="2" rx="1" fill="#fff" opacity="0.9" />
      <circle cx="16.6" cy="15" r="1.9" fill="#ffdf00" />
      <circle cx="19" cy="15" r="1.9" fill="#fff" opacity="0.75" />
    </svg>
  );
}

/** Card expandido de confirmação do plano (overlay). */
function PlanExpanded({ method, act }: { method: PaymentMethod; act: FlowActions }) {
  const isPix = method === "pix";
  const details = isPix
    ? [
        { k: "Valor total", v: formatBRL(PRICING.pix) },
        { k: "Forma de pagamento", v: "Pix (QR Code ou copia-e-cola)" },
        { k: "Aprovação", v: "Na hora" },
        { k: "Acesso às aulas", v: "Liberado após confirmação" },
      ]
    : [
        { k: "Parcelas", v: `${PRICING.card.installments}× de ${formatBRL(PRICING.card.installment)}` },
        { k: "Valor total", v: formatBRL(PRICING.card.total) },
        { k: "Bandeiras", v: "Visa, Master, Elo e mais" },
        { k: "Acesso às aulas", v: "Liberado após aprovação" },
      ];
  return (
    <div
      className={`${styles.modalFade} fixed inset-0 z-[75] flex overflow-y-auto bg-brand-ink/45 p-5 backdrop-blur-[14px]`}
      onClick={act.collapsePlan}
      role="dialog"
      aria-modal="true"
      aria-label={isPix ? "Confirmar Pix à vista" : "Confirmar cartão de crédito"}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className={`${styles.planGrow} m-auto flex w-full max-w-[420px] flex-col overflow-hidden rounded-[28px] bg-white shadow-[0_30px_80px_-20px_rgba(11,27,59,0.55)]`}
      >
        <div
          className={`flex flex-col items-center gap-2.5 px-6 pb-5 pt-7 ${
            isPix
              ? "bg-[linear-gradient(135deg,var(--color-brand-green-dark),var(--color-brand-green))]"
              : "bg-[linear-gradient(135deg,#0b1b3b,var(--color-brand-blue-bright))]"
          }`}
        >
          <span className="flex size-16 items-center justify-center rounded-[18px] bg-white/90 shadow-[0_8px_20px_rgba(11,27,59,0.18)]">
            {isPix ? <PixIcon className="size-[34px]" /> : <CardIcon className="size-[34px]" />}
          </span>
          <h2 className="text-[21px] font-extrabold text-white">
            {isPix ? "Pix à vista" : "Cartão de crédito"}
          </h2>
          <p className="text-[32px] font-extrabold tracking-tight text-white">
            {isPix
              ? formatBRL(PRICING.pix)
              : `${PRICING.card.installments}× de ${formatBRL(PRICING.card.installment)}`}
          </p>
        </div>

        <div className="flex flex-col px-6 py-2">
          {details.map((d) => (
            <div key={d.k} className="flex items-center justify-between gap-3 border-b border-brand-border py-[13px]">
              <span className="text-[13px] font-semibold text-brand-muted">{d.k}</span>
              <span className="text-right text-sm font-extrabold text-brand-ink">{d.v}</span>
            </div>
          ))}
          <div className={`${styles.stampIn} mb-1.5 mt-[18px] self-center rounded-xl border-[3.5px] border-dashed border-brand-danger px-[26px] py-3 text-center`}>
            <p className="text-[19px] font-extrabold uppercase tracking-[0.1em] text-brand-danger">
              Taxa única
            </p>
            <p className="mt-1 text-sm font-bold text-brand-danger/85">
              Você não paga mais nada depois
            </p>
          </div>
          <div className="flex items-center justify-center gap-2 pb-1.5 pt-2.5">
            <svg className="size-4 flex-none" viewBox="0 0 24 24" fill="none" stroke="var(--color-brand-green-dark)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
              <path d="M12 3l7 3v5c0 4.6-3.1 7.7-7 9-3.9-1.3-7-4.4-7-9V6z" />
              <path d="M9.5 12l2 2 3.5-3.5" />
            </svg>
            <span className="text-xs font-semibold text-brand-muted">
              Pagamento processado em ambiente seguro e criptografado.
            </span>
          </div>
        </div>

        <div className="flex flex-col gap-2.5 px-6 pb-6 pt-4">
          <button
            type="button"
            onClick={act.confirmPlan}
            className={`flex min-h-14 w-full cursor-pointer items-center justify-center rounded-xl border-none px-5 text-lg font-bold text-white shadow-[0_10px_26px_-12px_rgba(11,27,59,0.5)] ${
              isPix ? "bg-brand-green-dark" : "bg-brand-blue-bright"
            }`}
          >
            {isPix ? "Confirmar e pagar com Pix" : "Confirmar e pagar no cartão"}
          </button>
          <button
            type="button"
            onClick={act.collapsePlan}
            className="flex min-h-12 w-full cursor-pointer items-center justify-center rounded-xl border border-brand-border bg-transparent px-5 text-[15px] font-bold text-brand-muted"
          >
            ← Voltar
          </button>
        </div>
      </div>
    </div>
  );
}

/**
 * Planos — passo 6 (escolha da forma de pagamento, por último no funil).
 * Pix à vista × Cartão parcelado; preços viriam de GET /pricing.
 */
export function ScreenPlanos({ s, act }: { s: FlowState; act: FlowActions }) {
  return (
    <main id="conteudo" className="flex flex-1 px-6 py-8">
      <div className="m-auto flex w-full max-w-3xl flex-col gap-7">
        <div className="flex flex-col items-center gap-3 text-center">
          <BackPill onClick={act.planosBack} />
          <IconBadge>
            <svg className="size-8" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
              <rect x="3" y="6" width="18" height="13" rx="2" />
              <path d="M3 10h18" />
              <circle cx="16.5" cy="14.5" r="1" />
            </svg>
          </IconBadge>
          <h1 className="text-[28px] font-extrabold leading-tight text-white">
            Como você prefere pagar?
          </h1>
          <BrandDots size="sm" center />
          <p className="text-base leading-relaxed text-white/70">
            Falta só isso pra garantir sua vaga. Escolhe o jeito que fica melhor pra você.
          </p>
        </div>

        <div className="grid grid-cols-[repeat(auto-fit,minmax(260px,1fr))] gap-4">
          <button
            type="button"
            onClick={() => act.expandPlan("pix")}
            className="relative flex cursor-pointer flex-col gap-3.5 rounded-3xl border-2 border-brand-green bg-white p-6 text-left shadow-[0_8px_24px_rgba(11,27,59,0.06)] transition duration-200 hover:-translate-y-1 hover:shadow-[0_18px_40px_rgba(11,27,59,0.18)]"
          >
            <span className="absolute -top-3 left-6 rounded-full bg-brand-green px-3 py-1 text-xs font-extrabold uppercase tracking-[0.03em] text-white">
              Melhor preço
            </span>
            <span className="flex items-center justify-between gap-3">
              <span className="text-xl font-extrabold text-brand-ink">Pix à vista</span>
              <span className="flex size-12 items-center justify-center rounded-[14px] bg-[rgba(50,188,173,0.12)]">
                <PixIcon className="size-7" />
              </span>
            </span>
            <span className="text-4xl font-extrabold text-brand-green">{formatBRL(PRICING.pix)}</span>
            <span className="text-sm leading-relaxed text-brand-muted">
              Pagamento único, aprovação na hora. O jeito mais econômico de garantir sua vaga.
            </span>
            <span className="mt-2 flex min-h-14 items-center justify-center rounded-xl bg-brand-green-dark px-5 text-lg font-bold tracking-tight text-white shadow-[0_10px_26px_-12px_rgba(0,156,59,0.55)]">
              Escolher Pix
            </span>
          </button>

          <button
            type="button"
            onClick={() => act.expandPlan("card")}
            className="flex cursor-pointer flex-col gap-3.5 rounded-3xl border border-brand-border bg-white p-6 text-left shadow-[0_8px_24px_rgba(11,27,59,0.06)] transition duration-200 hover:-translate-y-1 hover:shadow-[0_18px_40px_rgba(11,27,59,0.18)]"
          >
            <span className="flex items-center justify-between gap-3">
              <span className="text-xl font-extrabold text-brand-ink">Cartão de crédito</span>
              <span className="flex size-12 items-center justify-center rounded-[14px] bg-brand-blue-bg">
                <CardIcon className="size-7" />
              </span>
            </span>
            <span className="text-4xl font-extrabold text-brand-blue">
              {PRICING.card.installments}×{" "}
              <span className="text-2xl">de {formatBRL(PRICING.card.installment)}</span>
            </span>
            <span className="text-sm leading-relaxed text-brand-muted">
              Parcele em até {PRICING.card.installments}×. Total de {formatBRL(PRICING.card.total)} no
              cartão.
            </span>
            <span className="mt-2 flex min-h-14 items-center justify-center rounded-xl border-2 border-brand-blue bg-transparent px-5 text-lg font-bold tracking-tight text-brand-blue">
              Escolher cartão
            </span>
          </button>
        </div>
      </div>

      {s.planExpanded && <PlanExpanded method={s.planExpanded} act={act} />}
    </main>
  );
}

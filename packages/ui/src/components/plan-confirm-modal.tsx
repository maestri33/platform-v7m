"use client";

import { useEffect, useRef, type ReactNode } from "react";

export interface PlanDetailItem {
  label: string;
  value: string;
}

export interface PlanConfirmModalProps {
  isOpen: boolean;
  isPix: boolean;
  icon: ReactNode;
  title: string;
  price: string;
  details: PlanDetailItem[];
  stampTitle?: string;
  stampSubtitle?: string;
  onConfirm: () => void;
  onBack: () => void;
  confirmLabel?: string;
  isBusy?: boolean;
}

/**
 * Modal expandido de confirmação do plano escolhido — @v7m/ui.
 * Apresentação segura, carimbo de Taxa Única e confirmação direta.
 */
export function PlanConfirmModal({
  isOpen,
  isPix,
  icon,
  title,
  price,
  details,
  stampTitle = "TAXA ÚNICA",
  stampSubtitle = "Você não paga mais nada depois",
  onConfirm,
  onBack,
  confirmLabel,
  isBusy = false,
}: PlanConfirmModalProps) {
  const boxRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    if (!isOpen) return;

    boxRef.current?.querySelector<HTMLElement>("button:not([disabled])")?.focus();

    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onBack();
    };

    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [isOpen, onBack]);

  if (!isOpen) return null;

  const defaultButtonText = isPix
    ? "Confirmar e pagar com Pix"
    : "Confirmar e pagar no cartão";

  return (
    <div
      className="fixed inset-0 z-[75] flex items-center justify-center bg-brand-ink/50 p-5 backdrop-blur-md transition-opacity animate-in fade-in"
      onClick={onBack}
      role="dialog"
      aria-modal="true"
      aria-label={title}
    >
      <div
        ref={boxRef}
        onClick={(e) => e.stopPropagation()}
        className="relative flex w-full max-w-md flex-col overflow-hidden rounded-[28px] border border-white/60 bg-white shadow-[0_25px_60px_-15px_rgba(11,27,59,0.35)] animate-in zoom-in-95"
      >
        {/* Topo Gradiente */}
        <div
          className={`flex flex-col items-center gap-2.5 px-6 pb-5 pt-7 text-center text-white ${
            isPix
              ? "bg-gradient-to-br from-brand-green-dark to-brand-green"
              : "bg-gradient-to-br from-brand-ink to-brand-blue-bright"
          }`}
        >
          <span className="flex size-16 items-center justify-center rounded-2xl bg-white/95 text-brand-ink shadow-lg">
            {icon}
          </span>
          <h2 className="text-xl font-extrabold">{title}</h2>
          <p className="text-3xl font-extrabold tracking-tight">{price}</p>
        </div>

        {/* Linhas de Detalhe */}
        <div className="flex flex-col px-6 py-3">
          {details.map((d) => (
            <div
              key={d.label}
              className="flex items-center justify-between gap-3 border-b border-brand-border/60 py-3 text-sm"
            >
              <span className="font-semibold text-brand-muted">{d.label}</span>
              <span className="text-right font-extrabold text-brand-ink">
                {d.value}
              </span>
            </div>
          ))}

          {/* Carimbo de Taxa Única */}
          <div className="my-3 self-center rounded-2xl border-2 border-dashed border-brand-green/70 bg-brand-green-bg/50 px-5 py-2.5 text-center">
            <p className="text-base font-extrabold uppercase tracking-wider text-brand-green-dark">
              ✦ {stampTitle} ✦
            </p>
            <p className="text-xs font-bold text-brand-green-dark/80">
              {stampSubtitle}
            </p>
          </div>

          <div className="flex items-center justify-center gap-2 py-1 text-center">
            <svg
              className="size-4 flex-none text-brand-green"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <path d="M12 3l7 3v5c0 4.6-3.1 7.7-7 9-3.9-1.3-7-4.4-7-9V6z" />
              <path d="M9.5 12l2 2 3.5-3.5" />
            </svg>
            <span className="text-xs font-semibold text-brand-muted">
              Ambiente 100% seguro e criptografado
            </span>
          </div>
        </div>

        {/* Botões de Ação */}
        <div className="flex flex-col gap-2.5 px-6 pb-6 pt-2">
          <button
            type="button"
            onClick={onConfirm}
            disabled={isBusy}
            className={`flex min-h-[50px] w-full cursor-pointer items-center justify-center gap-2 rounded-2xl px-5 text-base font-extrabold text-white shadow-lg transition-all active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-50 ${
              isPix
                ? "bg-brand-green shadow-[0_8px_20px_rgba(0,156,59,0.3)] hover:bg-brand-green-dark"
                : "bg-brand-blue-bright shadow-[0_8px_20px_rgba(0,102,255,0.3)] hover:bg-brand-blue"
            }`}
          >
            {isBusy ? (
              <>
                <span className="size-4 animate-spin rounded-full border-2 border-white border-t-transparent" />
                <span>Gerando pagamento…</span>
              </>
            ) : (
              <span>{confirmLabel || defaultButtonText}</span>
            )}
          </button>

          <button
            type="button"
            onClick={onBack}
            disabled={isBusy}
            className="flex min-h-[44px] w-full cursor-pointer items-center justify-center rounded-2xl border border-brand-border bg-transparent px-4 text-sm font-bold text-brand-muted transition hover:bg-black/5 hover:text-brand-ink active:scale-[0.98]"
          >
            ← Voltar
          </button>
        </div>
      </div>
    </div>
  );
}

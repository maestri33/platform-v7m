"use client";

import { useEffect, useRef, type ReactNode } from "react";

export type FeedbackModalVariant =
  | "danger"
  | "warning"
  | "info"
  | "success"
  | "transient";

export interface FeedbackModalProps {
  isOpen?: boolean;
  title: string;
  description: ReactNode;
  variant?: FeedbackModalVariant;
  icon?: ReactNode;
  badgeText?: string;
  primaryAction?: {
    label: string;
    onClick: () => void;
    isBusy?: boolean;
    disabled?: boolean;
  };
  secondaryAction?: {
    label: string;
    onClick: () => void;
    disabled?: boolean;
  };
  onClose?: () => void;
  isSheet?: boolean;
  className?: string;
}

/**
 * Modal e Bottom-Sheet canônico de feedback / erro / persistência — @v7m/ui.
 * Totalmente desacoplado de bibliotecas externas pesadas, com foco automático,
 * trava de tecla Tab, fechamento no Escape e clique no backdrop.
 */
export function FeedbackModal({
  isOpen = true,
  title,
  description,
  variant = "danger",
  icon,
  badgeText,
  primaryAction,
  secondaryAction,
  onClose,
  isSheet = false,
  className = "",
}: FeedbackModalProps) {
  const boxRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    if (!isOpen) return;

    // Foco inicial no primeiro botão acionável
    const timer = setTimeout(() => {
      boxRef.current?.querySelector<HTMLElement>("button:not([disabled])")?.focus();
    }, 50);

    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        if (onClose) {
          onClose();
        } else if (primaryAction) {
          primaryAction.onClick();
        }
        return;
      }

      // Focus Trap nativo no modal
      if (e.key === "Tab" && boxRef.current) {
        const focusables = Array.from(
          boxRef.current.querySelectorAll<HTMLElement>(
            'button:not([disabled]), [href], input:not([disabled]), [tabindex="0"]'
          )
        );
        if (focusables.length === 0) return;

        const first = focusables[0];
        const last = focusables[focusables.length - 1];

        if (e.shiftKey && document.activeElement === first) {
          e.preventDefault();
          last.focus();
        } else if (!e.shiftKey && document.activeElement === last) {
          e.preventDefault();
          first.focus();
        }
      }
    };

    document.addEventListener("keydown", onKey);
    return () => {
      clearTimeout(timer);
      document.removeEventListener("keydown", onKey);
      // Retorna o foco pro primeiro input utilizável na tela
      document.querySelector<HTMLElement>("main input:not([disabled])")?.focus();
    };
  }, [isOpen, onClose, primaryAction]);

  if (!isOpen) return null;

  function handleBackdropClick() {
    if (onClose) {
      onClose();
    } else if (secondaryAction) {
      secondaryAction.onClick();
    } else if (primaryAction) {
      primaryAction.onClick();
    }
  }

  return (
    <div
      className={`fixed inset-0 z-[70] flex items-center justify-center bg-brand-ink/50 p-5 backdrop-blur-md transition-opacity duration-200 ${
        isSheet ? "items-end pb-[max(1rem,env(safe-area-inset-bottom))]" : ""
      }`}
      onClick={handleBackdropClick}
      role="dialog"
      aria-modal="true"
      aria-label={title}
    >
      <div
        ref={boxRef}
        onClick={(e) => e.stopPropagation()}
        className={`relative flex w-full max-w-sm flex-col items-center gap-4 rounded-[28px] border border-white/70 bg-white/95 p-6 text-center shadow-[0_20px_60px_-15px_rgba(11,27,59,0.3)] backdrop-blur-xl transition-all duration-300 animate-in fade-in zoom-in-95 ${
          isSheet
            ? "max-w-md rounded-b-[20px] rounded-t-[32px] pt-7"
            : ""
        } ${className}`}
      >
        {/* Selo opcional superior */}
        {badgeText && (
          <div className="inline-flex items-center gap-1.5 rounded-full border border-brand-green/30 bg-brand-green-bg px-3 py-1 text-[11px] font-extrabold uppercase tracking-wider text-brand-green-dark shadow-sm">
            <span>{badgeText}</span>
          </div>
        )}

        {/* Ícone contextual */}
        {icon ? (
          <div className="my-1 flex items-center justify-center">{icon}</div>
        ) : (
          <span
            className={`flex size-16 items-center justify-center rounded-full shadow-inner ${
              variant === "danger"
                ? "bg-brand-danger-bg text-brand-danger"
                : variant === "warning"
                  ? "bg-brand-yellow/20 text-brand-ink"
                  : variant === "success"
                    ? "bg-brand-green-bg text-brand-green-dark"
                    : "bg-brand-blue-bg text-brand-blue"
            }`}
          >
            {variant === "danger" && (
              <svg className="size-8" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <circle cx="12" cy="12" r="10" />
                <line x1="15" y1="9" x2="9" y2="15" />
                <line x1="9" y1="9" x2="15" y2="15" />
              </svg>
            )}
            {variant === "warning" && (
              <svg className="size-8" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z" />
                <line x1="12" y1="9" x2="12" y2="13" />
                <line x1="12" y1="17" x2="12.01" y2="17" />
              </svg>
            )}
            {variant === "success" && (
              <svg className="size-8" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <path d="M20 6L9 17l-5-5" />
              </svg>
            )}
            {(variant === "info" || variant === "transient") && (
              <svg className="size-8" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <circle cx="12" cy="12" r="10" />
                <line x1="12" y1="16" x2="12" y2="12" />
                <line x1="12" y1="8" x2="12.01" y2="8" />
              </svg>
            )}
          </span>
        )}

        {/* Título e Descrição */}
        <div className="flex flex-col gap-1.5">
          <h3 className="text-xl font-extrabold tracking-tight text-brand-ink">
            {title}
          </h3>
          <div className="text-sm leading-relaxed text-brand-muted">
            {description}
          </div>
        </div>

        {/* Ações */}
        <div className="mt-2 flex w-full flex-col gap-2.5">
          {primaryAction && (
            <button
              type="button"
              onClick={primaryAction.onClick}
              disabled={primaryAction.disabled || primaryAction.isBusy}
              className="inline-flex min-h-[48px] w-full cursor-pointer items-center justify-center gap-2 rounded-2xl bg-brand-green px-5 py-3 text-base font-extrabold text-white shadow-[0_8px_20px_rgba(0,156,59,0.3)] transition-all hover:bg-brand-green-dark active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-50"
            >
              {primaryAction.isBusy ? (
                <>
                  <span className="size-4 animate-spin rounded-full border-2 border-white border-t-transparent" />
                  <span>Aguarde…</span>
                </>
              ) : (
                <span>{primaryAction.label}</span>
              )}
            </button>
          )}

          {secondaryAction && (
            <button
              type="button"
              onClick={secondaryAction.onClick}
              disabled={secondaryAction.disabled}
              className="inline-flex min-h-[44px] w-full cursor-pointer items-center justify-center rounded-2xl border border-brand-border/80 bg-white/60 px-4 py-2 text-sm font-bold text-brand-ink transition-all hover:bg-white hover:shadow-sm active:scale-[0.98] disabled:opacity-50"
            >
              <span>{secondaryAction.label}</span>
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

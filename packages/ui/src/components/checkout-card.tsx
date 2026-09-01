"use client";

import type { ReactNode } from "react";

export interface CheckoutChecklistItem {
  label: string;
  isDone: boolean;
}

export interface CheckoutCardProps {
  methodLabel: string;
  amount: string;
  isProcessing?: boolean;
  statusMessage?: string;
  checklist?: string[];
  qrCodeUrl?: string;
  pixCode?: string;
  paymentUrl?: string;
  onCopyPix?: () => void;
  onOpenPaymentUrl?: () => void;
  onRetry?: () => void;
  onChangeMethod?: () => void;
  onGoBack?: () => void;
  isError?: boolean;
  errorMessage?: string;
  isSuccess?: boolean;
  className?: string;
  children?: ReactNode;
}

/**
 * Card de finalização e pagamento de checkout — @v7m/ui.
 * Apresenta timeline de preparação, exibição de QR Code e chave Pix Copia-e-Cola.
 */
export function CheckoutCard({
  methodLabel,
  amount,
  isProcessing = false,
  statusMessage,
  checklist = [],
  qrCodeUrl,
  pixCode,
  paymentUrl,
  onCopyPix,
  onOpenPaymentUrl,
  onRetry,
  onChangeMethod,
  onGoBack,
  isError = false,
  errorMessage,
  isSuccess = false,
  className = "",
  children,
}: CheckoutCardProps) {
  return (
    <div
      className={`relative flex w-full max-w-md flex-col items-center gap-4 rounded-[28px] border border-white/60 bg-white/90 p-6 text-center shadow-[0_16px_40px_-12px_rgba(11,27,59,0.2)] backdrop-blur-xl ${className}`}
    >
      {/* Badge do Método */}
      <div className="inline-flex items-center gap-2 rounded-full border border-brand-green/30 bg-brand-green-bg px-4 py-1.5 text-xs font-extrabold text-brand-green-dark shadow-sm">
        <svg
          className="size-4"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2.5"
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <path d="M5 13l4 4L19 7" />
        </svg>
        <span>
          {methodLabel} • {amount}
        </span>
      </div>

      {/* Estado de Erro */}
      {isError ? (
        <div className="flex w-full flex-col items-center gap-3">
          <span className="flex size-16 items-center justify-center rounded-full bg-brand-danger-bg text-brand-danger shadow-inner">
            <svg
              className="size-8"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <circle cx="12" cy="12" r="10" />
              <line x1="15" y1="9" x2="9" y2="15" />
              <line x1="9" y1="9" x2="15" y2="15" />
            </svg>
          </span>
          <h3 className="text-xl font-extrabold text-brand-ink">
            Não foi possível preparar seu pagamento
          </h3>
          <p className="text-sm leading-relaxed text-brand-muted">
            {errorMessage ||
              "Ocorreu uma instabilidade temporária. Você pode tentar novamente em instantes."}
          </p>

          <div className="mt-2 flex w-full flex-col gap-2.5">
            {onRetry && (
              <button
                type="button"
                onClick={onRetry}
                className="inline-flex min-h-[48px] w-full cursor-pointer items-center justify-center gap-2 rounded-2xl bg-brand-green px-5 py-3 text-base font-extrabold text-white shadow-md transition-all hover:bg-brand-green-dark active:scale-[0.98]"
              >
                Tentar novamente
              </button>
            )}
            {onChangeMethod && (
              <button
                type="button"
                onClick={onChangeMethod}
                className="inline-flex min-h-[44px] w-full cursor-pointer items-center justify-center rounded-2xl border border-brand-blue bg-transparent px-4 py-2 text-sm font-bold text-brand-blue transition-all hover:bg-brand-blue/10 active:scale-[0.98]"
              >
                Escolher outra forma de pagamento
              </button>
            )}
          </div>
        </div>
      ) : isProcessing ? (
        /* Estado de Processamento com Checklist */
        <div className="flex w-full flex-col items-center gap-4 py-2">
          {checklist.length > 0 && (
            <div className="flex w-full flex-col gap-2 rounded-2xl bg-brand-border/20 p-4 text-left">
              {checklist.map((item, idx) => (
                <div
                  key={item}
                  className="flex items-center gap-2.5 text-xs font-bold text-brand-ink"
                >
                  <span className="flex size-4 items-center justify-center rounded-full bg-brand-green text-[10px] text-white">
                    ✓
                  </span>
                  <span>{item}</span>
                </div>
              ))}
            </div>
          )}

          <div className="flex items-center gap-2.5 text-sm font-bold text-brand-blue">
            <span className="size-4 animate-spin rounded-full border-2 border-brand-blue border-t-transparent" />
            <span>{statusMessage || "Gerando seu checkout seguro…"}</span>
          </div>
        </div>
      ) : isSuccess || paymentUrl ? (
        /* Estado de Sucesso / Pronto para Pagar */
        <div className="flex w-full flex-col items-center gap-4">
          <span className="flex size-16 items-center justify-center rounded-full bg-brand-green-bg text-brand-green-dark shadow-inner">
            <svg
              className="size-8"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2.5"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <path d="M5 13l4 4L19 7" />
            </svg>
          </span>

          <div className="flex flex-col gap-1">
            <h3 className="text-xl font-extrabold text-brand-ink">
              Tudo pronto para o pagamento!
            </h3>
            <p className="text-sm leading-relaxed text-brand-muted">
              Assim que o pagamento for concluído, sua matrícula é liberada na
              hora.
            </p>
          </div>

          {/* QR Code se houver */}
          {qrCodeUrl && (
            <div className="flex flex-col items-center gap-2 rounded-2xl border border-brand-border/60 bg-white p-4 shadow-sm">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={qrCodeUrl}
                alt="QR Code Pix"
                className="size-48 object-contain"
              />
              <span className="text-xs font-bold text-brand-muted">
                Escaneie com o app do seu banco
              </span>
            </div>
          )}

          {/* Botão Copiar Chave Pix */}
          {pixCode && onCopyPix && (
            <button
              type="button"
              onClick={onCopyPix}
              className="inline-flex min-h-[48px] w-full cursor-pointer items-center justify-center gap-2 rounded-2xl border-2 border-brand-green bg-brand-green-bg px-5 py-2.5 text-sm font-extrabold text-brand-green-dark shadow-sm transition-all hover:bg-brand-green hover:text-white active:scale-[0.98]"
            >
              <svg
                className="size-4"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <rect x="9" y="9" width="13" height="13" rx="2" ry="2" />
                <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1" />
              </svg>
              <span>Copiar código Pix</span>
            </button>
          )}

          {/* Botão Ir para Checkout Externo */}
          {paymentUrl && onOpenPaymentUrl && (
            <button
              type="button"
              onClick={onOpenPaymentUrl}
              className="inline-flex min-h-[50px] w-full cursor-pointer items-center justify-center gap-2 rounded-2xl bg-brand-green px-5 py-3 text-base font-extrabold text-white shadow-[0_8px_24px_rgba(0,156,59,0.35)] transition-all hover:bg-brand-green-dark active:scale-[0.98]"
            >
              <span>Ir para o pagamento</span>
              <svg
                className="size-5"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2.5"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <path d="M5 12h14M12 5l7 7-7 7" />
              </svg>
            </button>
          )}

          <div className="flex w-full flex-col gap-2 pt-1">
            {onChangeMethod && (
              <button
                type="button"
                onClick={onChangeMethod}
                className="text-xs font-bold text-brand-blue hover:underline"
              >
                Trocar forma de pagamento
              </button>
            )}
            {onGoBack && (
              <button
                type="button"
                onClick={onGoBack}
                className="text-xs font-medium text-brand-muted hover:text-brand-ink"
              >
                Voltar
              </button>
            )}
          </div>
        </div>
      ) : null}

      {children}
    </div>
  );
}

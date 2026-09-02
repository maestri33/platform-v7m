"use client";

import { useState } from "react";
import { Button } from "./button";
import { Input } from "./input";
import { ErrorBox } from "../components/error-box";

function getErrorMessage(e: unknown): string {
  if (e instanceof Error) return e.message;
  if (typeof e === "string") return e;
  if (e && typeof e === "object" && "detail" in e && typeof e.detail === "string") return e.detail;
  return "Ocorreu um erro inesperado.";
}

export interface ConfirmDialogProps {
  /** Aberto? Controlado pelo pai. */
  open: boolean;
  title: string;
  /** Corpo — texto ou nós (ex.: resumo do pagamento). */
  body?: React.ReactNode;
  /** Alias/descrição opcional */
  description?: React.ReactNode;
  /** Rótulo do botão de confirmação (ex.: "Pagar R$ 50,00", "Adiantar fechamento"). */
  confirmLabel?: string;
  confirmText?: string;
  /** "danger" deixa o botão vermelho — use pra ações que movem dinheiro. */
  tone?: "primary" | "danger";
  variant?: "default" | "destructive" | "action" | string;
  onCancel?: () => void;
  onOpenChange?: (open: boolean) => void;
  requireReason?: boolean;
  reasonPlaceholder?: string;
  loading?: boolean;
  /**
   * Ação confirmada. Pode ser async — o diálogo segura o spinner e só fecha no
   * sucesso (no erro mostra a mensagem e mantém aberto pra nova tentativa).
   */
  onConfirm: (reason?: string) => void | Promise<void>;
}

/**
 * Modal de confirmação explícita.
 */
export function ConfirmDialog({
  open,
  title,
  body,
  description,
  confirmLabel,
  confirmText,
  tone = "primary",
  variant,
  onCancel,
  onOpenChange,
  requireReason = false,
  reasonPlaceholder = "Informe o motivo...",
  loading = false,
  onConfirm,
}: ConfirmDialogProps) {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [reason, setReason] = useState("");

  if (!open) return null;

  const effectiveConfirmLabel = confirmLabel || confirmText || "Confirmar";
  const effectiveBody = body || description;
  const isDanger = tone === "danger" || variant === "destructive";
  const isLoading = busy || loading;

  const handleClose = () => {
    if (isLoading) return;
    if (onCancel) onCancel();
    if (onOpenChange) onOpenChange(false);
  };

  async function handleConfirm() {
    if (requireReason && !reason.trim()) {
      setError("Por favor, preencha o motivo.");
      return;
    }
    setError(null);
    setBusy(true);
    try {
      await onConfirm(reason);
      handleClose();
    } catch (e: unknown) {
      setError(getErrorMessage(e));
    } finally {
      setBusy(false);
    }
  }

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label={title}
      className="fixed inset-0 z-50 flex items-center justify-center bg-brand-ink/45 p-5 pb-[max(1.25rem,env(safe-area-inset-bottom))] backdrop-blur-sm"
      onClick={(e) => {
        if (e.target === e.currentTarget && !isLoading) handleClose();
      }}
    >
      <div className="sheet-up flex w-full max-w-md flex-col gap-4 rounded-3xl bg-white p-6 shadow-xl border border-brand-border">
        <h2 className="text-xl font-extrabold text-brand-ink">{title}</h2>
        {effectiveBody ? (
          <div className="text-[15px] leading-relaxed text-brand-muted">{effectiveBody}</div>
        ) : null}

        {requireReason && (
          <div className="space-y-1.5 pt-1">
            <Input
              placeholder={reasonPlaceholder}
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              className="text-xs bg-slate-50"
            />
          </div>
        )}

        <ErrorBox message={error} />
        <div className="flex flex-col gap-2 sm:flex-row-reverse">
          <Button
            onClick={handleConfirm}
            loading={isLoading}
            disabled={isLoading || (requireReason && !reason.trim())}
            className={
              isDanger
                ? "bg-brand-danger text-white hover:bg-[#a31f1f] sm:flex-1"
                : "bg-brand-blue hover:bg-brand-blue-bright text-white sm:flex-1"
            }
          >
            {effectiveConfirmLabel}
          </Button>
          <Button variant="outline" disabled={isLoading} onClick={handleClose} className="sm:flex-1">
            Cancelar
          </Button>
        </div>
      </div>
    </div>
  );
}

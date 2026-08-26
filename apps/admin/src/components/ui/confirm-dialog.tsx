"use client";

import { useState } from "react";

import { Button } from "@/components/ui/button";
import { ErrorBox } from "@/components/ui/error-box";
import { getErrorMessage } from "@/lib/api";

interface ConfirmDialogProps {
  /** Aberto? Controlado pelo pai. */
  open: boolean;
  title: string;
  /** Corpo — texto ou nós (ex.: resumo do pagamento). */
  body: React.ReactNode;
  /** Rótulo do botão de confirmação (ex.: "Pagar R$ 50,00", "Adiantar fechamento"). */
  confirmLabel: string;
  /** "danger" deixa o botão vermelho — use pra ações que movem dinheiro. */
  tone?: "primary" | "danger";
  onCancel: () => void;
  /**
   * Ação confirmada. Pode ser async — o diálogo segura o spinner e só fecha no
   * sucesso (no erro mostra a mensagem e mantém aberto pra nova tentativa).
   */
  onConfirm: () => void | Promise<void>;
}

/**
 * Modal de confirmação explícita. OBRIGATÓRIO antes de qualquer ação que mova
 * dinheiro REAL no Asaas (pagamento avulso, adiantar fechamento). Gere o foco e
 * o backdrop; o pai controla `open`. Some no sucesso; erro fica inline.
 */
export function ConfirmDialog({
  open,
  title,
  body,
  confirmLabel,
  tone = "primary",
  onCancel,
  onConfirm,
}: ConfirmDialogProps) {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!open) return null;

  async function handleConfirm() {
    setError(null);
    setBusy(true);
    try {
      await onConfirm();
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
        if (e.target === e.currentTarget && !busy) onCancel();
      }}
    >
      <div className="sheet-up flex w-full max-w-md flex-col gap-4 rounded-3xl bg-white p-6 shadow-xl">
        <h2 className="text-xl font-extrabold text-brand-ink">{title}</h2>
        <div className="text-[15px] leading-relaxed text-brand-muted">{body}</div>
        <ErrorBox message={error} />
        <div className="flex flex-col gap-2 sm:flex-row-reverse">
          <Button
            onClick={handleConfirm}
            loading={busy}
            className={
              tone === "danger"
                ? "bg-brand-danger text-white hover:bg-[#a31f1f] sm:flex-1"
                : "sm:flex-1"
            }
          >
            {confirmLabel}
          </Button>
          <Button variant="secondary" disabled={busy} onClick={onCancel} className="sm:flex-1">
            Cancelar
          </Button>
        </div>
      </div>
    </div>
  );
}

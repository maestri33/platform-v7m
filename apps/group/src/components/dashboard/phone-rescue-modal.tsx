"use client";

import { useState } from "react";

import { Button } from "@/components/ui/button";
import { ErrorBox } from "@/components/ui/error-box";
import { TextField } from "@/components/ui/text-field";
import { getErrorMessage, setUserPhone } from "@/lib/api";

interface PhoneRescueModalProps {
  open: boolean;
  userExternalId: string | null;
  userName: string;
  onClose: () => void;
  onSuccess: () => void;
}

export function PhoneRescueModal({
  open,
  userExternalId,
  userName,
  onClose,
  onSuccess,
}: PhoneRescueModalProps) {
  const [newPhone, setNewPhone] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  if (!open || !userExternalId) return null;

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setSuccess(null);

    const digits = newPhone.replace(/\D/g, "");
    if (digits.length < 10) {
      setError("Informe um telefone com DDD válido.");
      return;
    }

    setBusy(true);
    try {
      if (!userExternalId) return;
      await setUserPhone(userExternalId, digits);
      setSuccess("Telefone de login alterado com sucesso!");
      setTimeout(() => {
        onSuccess();
        onClose();
        setNewPhone("");
      }, 700);
    } catch (err: unknown) {
      setError(getErrorMessage(err));
    } finally {
      setBusy(false);
    }
  }

  return (
    <div
      role="dialog"
      aria-modal="true"
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
    >
      <div onClick={onClose} className="fixed inset-0 bg-brand-ink/40 backdrop-blur-xs" />

      <div className="sheet-up relative z-10 w-full max-w-md rounded-2xl border border-brand-border bg-white p-6 shadow-2xl">
        <div className="flex items-center justify-between border-b border-brand-border/60 pb-3">
          <div>
            <h2 className="text-base font-extrabold text-brand-ink">Resgate de Telefone de Login</h2>
            <p className="text-xs text-brand-muted">
              Usuário: <strong className="text-brand-ink">{userName}</strong>
            </p>
          </div>

          <button
            type="button"
            onClick={onClose}
            aria-label="Fechar"
            className="cursor-pointer rounded-lg p-1.5 text-brand-muted hover:bg-slate-100 hover:text-brand-ink"
          >
            <svg className="size-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <line x1="18" y1="6" x2="6" y2="18" />
              <line x1="6" y1="6" x2="18" y2="18" />
            </svg>
          </button>
        </div>

        <form onSubmit={handleSubmit} className="mt-4 flex flex-col gap-3">
          <p className="text-xs text-brand-muted">
            Permite trocar o canal do OTP caso o usuário tenha perdido o chip do celular.
          </p>

          <TextField
            label="Novo Número de WhatsApp"
            placeholder="(11) 99999-9999"
            value={newPhone}
            onChange={(e) => setNewPhone(e.target.value)}
            required
            autoFocus
          />

          <ErrorBox message={error} />
          <ErrorBox message={success} success />

          <div className="flex items-center justify-end gap-2 border-t border-brand-border/60 pt-3">
            <Button type="button" variant="secondary" onClick={onClose} disabled={busy}>
              Cancelar
            </Button>
            <Button type="submit" loading={busy} className="bg-brand-green hover:bg-brand-green-dark">
              Atualizar Telefone
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}

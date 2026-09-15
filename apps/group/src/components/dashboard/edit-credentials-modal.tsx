"use client";

import { useState } from "react";

import { Button } from "@v7m/ui";
import { ErrorBox } from "@v7m/ui";
import { TextField } from "@v7m/ui";
import { getErrorMessage, setStudentPlatformCredentials } from "@/lib/api";

interface EditCredentialsModalProps {
  open: boolean;
  studentId: string | null;
  studentName: string;
  onClose: () => void;
  onSuccess: () => void;
}

export function EditCredentialsModal({
  open,
  studentId,
  studentName,
  onClose,
  onSuccess,
}: EditCredentialsModalProps) {
  const [login, setLogin] = useState("");
  const [password, setPassword] = useState("");
  const [url, setUrl] = useState("");
  const [notes, setNotes] = useState("");

  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  if (!open || !studentId) return null;

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setSuccess(null);

    if (!login.trim() || !password.trim()) {
      setError("Informe o login e a senha da plataforma.");
      return;
    }

    setBusy(true);
    try {
      if (!studentId) return;
      await setStudentPlatformCredentials(studentId, {
        platform_login: login.trim(),
        platform_password: password.trim(),
        platform_url: url.trim() || null,
        platform_notes: notes.trim() || null,
      });

      setSuccess("Credenciais da plataforma salvas com sucesso!");
      setTimeout(() => {
        onSuccess();
        onClose();
        setLogin("");
        setPassword("");
        setUrl("");
        setNotes("");
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
            <h2 className="text-base font-extrabold text-brand-ink">Credenciais da Plataforma</h2>
            <p className="text-xs text-brand-muted">
              Aluno: <strong className="text-brand-ink">{studentName}</strong>
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
          <TextField
            label="Login da Plataforma"
            placeholder="ex: aluno@plataforma.com"
            value={login}
            onChange={(e) => setLogin(e.target.value)}
            required
            autoFocus
          />

          <TextField
            label="Senha da Plataforma"
            placeholder="Senha gerada para o aluno"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
          />

          <TextField
            label="URL de Acesso (Opcional)"
            placeholder="https://ava.exemplo.com.br"
            value={url}
            onChange={(e) => setUrl(e.target.value)}
          />

          <TextField
            label="Observações Internas (Opcional)"
            placeholder="Anotações de acesso..."
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
          />

          <ErrorBox message={error} />
          <ErrorBox message={success} success />

          <div className="flex items-center justify-end gap-2 border-t border-brand-border/60 pt-3">
            <Button type="button" variant="secondary" onClick={onClose} disabled={busy}>
              Cancelar
            </Button>
            <Button type="submit" loading={busy} className="bg-brand-green hover:bg-brand-green-dark">
              Salvar Credenciais
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}

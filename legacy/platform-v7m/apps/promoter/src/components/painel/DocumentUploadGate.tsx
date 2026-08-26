"use client";

import { useEffect, useRef } from "react";

import { DocForm } from "@/app/(app)/documento/DocForm";
import type { DocumentSection } from "@/lib/api/types";

export function DocumentUploadGate({
  initial,
  reason,
}: {
  initial: DocumentSection;
  reason?: string | null;
}) {
  const dialogRef = useRef<HTMLDialogElement>(null);

  useEffect(() => {
    const dialog = dialogRef.current;
    if (dialog && !dialog.open) dialog.showModal();
  }, []);

  return (
    <dialog
      ref={dialogRef}
      aria-labelledby="document-gate-title"
      aria-describedby="document-gate-description"
      className="m-auto max-h-[calc(100dvh-2rem)] w-[min(34rem,calc(100%-2rem))] overflow-y-auto rounded-[var(--radius)] border border-[var(--surface-border-hover)] bg-[var(--surface)] p-0 text-[var(--surface-text)] shadow-2xl backdrop:bg-black/70"
    >
      <div className="space-y-5 p-5 sm:p-6">
        <div>
          <p className="text-xs font-bold uppercase tracking-[0.16em] text-brand-gold-ink">
            Cadastro pendente
          </p>
          <h2 id="document-gate-title" className="mt-1 font-display text-xl">
            {reason ? "Precisamos de um novo documento" : "Envie seu RG ou CNH"}
          </h2>
          <p
            id="document-gate-description"
            className="mt-2 text-sm leading-relaxed text-[var(--surface-text-muted)]"
          >
            Seu dashboard e seu link de indicação já estão liberados. Para receber
            comissões, precisamos validar um documento com foto.
          </p>
          {reason && (
            <p className="mt-3 rounded-[var(--radius-sm)] border border-warn/40 bg-warn/10 p-3 text-sm">
              {reason}
            </p>
          )}
        </div>

        <DocForm initial={initial} onComplete={() => window.location.reload()} />

        <button
          type="button"
          onClick={() => dialogRef.current?.close()}
          className="mx-auto block min-h-[44px] px-4 text-sm font-semibold text-[var(--surface-text-muted)] underline-offset-4 hover:text-[var(--surface-text)] hover:underline"
        >
          Continuar no painel por enquanto
        </button>
      </div>
    </dialog>
  );
}

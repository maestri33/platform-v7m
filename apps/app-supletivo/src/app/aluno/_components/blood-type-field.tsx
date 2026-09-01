"use client";

import { useState } from "react";

import { Button, Card, ErrorBox, SelectField } from "@v7m/ui";
import { type BloodType, getErrorMessage, postStudentBloodType } from "@/lib/api";

interface BloodTypeFieldProps {
  /** Já enviado (null se nunca enviou). */
  current: BloodType | null;
  /** false enquanto os docs obrigatórios não estão approved. */
  enabled: boolean;
  onSubmitted: (next: import("@/lib/api").StudentMe) => void;
}

const OPTIONS: { value: BloodType; label: string }[] = [
  { value: "A+", label: "A+" },
  { value: "A-", label: "A−" },
  { value: "B+", label: "B+" },
  { value: "B-", label: "B−" },
  { value: "AB+", label: "AB+" },
  { value: "AB-", label: "AB−" },
  { value: "O+", label: "O+" },
  { value: "O-", label: "O−" },
];

/**
 * Card com seletor de tipo sanguíneo. Fica desabilitado (cinza) enquanto os
 * documentos obrigatórios não estão approved — a regra de liberação mora no
 * back, mas a UI reflete o gating pra não confundir o aluno.
 */
export function BloodTypeField({ current, enabled, onSubmitted }: BloodTypeFieldProps) {
  const [value, setValue] = useState<BloodType | "">(current ?? "");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!enabled) {
    return (
      <Card pad="md" className="flex items-center gap-3 opacity-70">
        <span className="flex size-9 items-center justify-center rounded-full bg-brand-bg text-brand-muted">
          <svg className="size-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
            <rect x="5" y="11" width="14" height="10" rx="2" />
            <path d="M8 11V7a4 4 0 0 1 8 0v4" />
          </svg>
        </span>
        <div>
          <p className="text-[15px] font-bold text-brand-ink">Tipo sanguíneo</p>
          <p className="text-[13px] text-brand-muted">Envie os documentos para liberar.</p>
        </div>
      </Card>
    );
  }

  async function submit() {
    if (!value) {
      setError("Selecione seu tipo sanguíneo.");
      return;
    }
    setBusy(true);
    setError(null);
    try {
      const next = await postStudentBloodType(value);
      onSubmitted(next);
    } catch (e: unknown) {
      setError(getErrorMessage(e));
    } finally {
      setBusy(false);
    }
  }

  return (
    <Card pad="md" className="flex flex-col gap-3">
      <div className="flex items-center gap-3">
        <span className="flex size-9 items-center justify-center rounded-full bg-brand-blue-bg text-brand-blue">
          <svg className="size-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
            <path d="M12 3c4 5 6 8 6 11a6 6 0 1 1-12 0c0-3 2-6 6-11z" />
          </svg>
        </span>
        <div>
          <p className="text-[15px] font-bold text-brand-ink">Tipo sanguíneo</p>
          {current ? (
            <p className="text-[13px] text-brand-muted">Você informou {current}.</p>
          ) : (
            <p className="text-[13px] text-brand-muted">
              Precisamos pra liberar sua prova.
            </p>
          )}
        </div>
      </div>

      {current ? (
        <SelectField
          label="Atualizar tipo sanguíneo"
          options={OPTIONS}
          value={value}
          onChange={(e) => setValue(e.target.value as BloodType | "")}
        />
      ) : (
        <SelectField
          label="Qual seu tipo sanguíneo?"
          options={OPTIONS}
          value={value}
          onChange={(e) => setValue(e.target.value as BloodType | "")}
        />
      )}

      <ErrorBox message={error} />
      <Button onClick={submit} loading={busy} disabled={busy || !value}>
        {current ? "Atualizar" : "Confirmar tipo sanguíneo"}
      </Button>
    </Card>
  );
}

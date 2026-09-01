"use client";

import { useState } from "react";
import { Button } from "./button";
import { Card } from "./card";
import { ErrorBox } from "./error-box";
import { SelectField } from "./select-field";

export type BloodTypeValue = "A+" | "A-" | "B+" | "B-" | "AB+" | "AB-" | "O+" | "O-";

export interface BloodTypeCardProps {
  current?: BloodTypeValue | null;
  enabled: boolean;
  onSubmit: (bloodType: BloodTypeValue) => Promise<void> | void;
  loading?: boolean;
  className?: string;
}

const BLOOD_TYPE_OPTIONS: { value: BloodTypeValue; label: string }[] = [
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
 * Card canônico para coleta e confirmação do Tipo Sanguíneo do Aluno (@v7m/ui).
 * Desabilitado enquanto os documentos obrigatórios estiverem sob análise.
 */
export function BloodTypeCard({
  current = null,
  enabled,
  onSubmit,
  loading = false,
  className,
}: BloodTypeCardProps) {
  const [value, setValue] = useState<BloodTypeValue | "">(current ?? "");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const isSubmitting = loading || busy;

  if (!enabled) {
    return (
      <Card pad="md" className={`flex items-center gap-3 opacity-70 ${className ?? ""}`.trim()}>
        <span className="flex size-9 shrink-0 items-center justify-center rounded-full bg-brand-bg text-brand-muted">
          <svg
            className="size-5"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
            aria-hidden
          >
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

  async function handleSubmit() {
    if (!value) {
      setError("Selecione seu tipo sanguíneo.");
      return;
    }
    setBusy(true);
    setError(null);
    try {
      await onSubmit(value as BloodTypeValue);
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "Erro ao registrar tipo sanguíneo.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <Card pad="md" className={`flex flex-col gap-3 ${className ?? ""}`.trim()}>
      <div className="flex items-center gap-3">
        <span className="flex size-9 shrink-0 items-center justify-center rounded-full bg-brand-blue-bg text-brand-blue">
          <svg
            className="size-5"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
            aria-hidden
          >
            <path d="M12 3c4 5 6 8 6 11a6 6 0 1 1-12 0c0-3 2-6 6-11z" />
          </svg>
        </span>
        <div>
          <p className="text-[15px] font-bold text-brand-ink">Tipo sanguíneo</p>
          {current ? (
            <p className="text-[13px] text-brand-muted">Você informou {current}.</p>
          ) : (
            <p className="text-[13px] text-brand-muted">Precisamos pra liberar sua prova.</p>
          )}
        </div>
      </div>

      <SelectField
        label={current ? "Atualizar tipo sanguíneo" : "Qual seu tipo sanguíneo?"}
        options={BLOOD_TYPE_OPTIONS}
        value={value}
        onChange={(e) => setValue(e.target.value as BloodTypeValue | "")}
      />

      <ErrorBox message={error} />

      <Button
        onClick={handleSubmit}
        loading={isSubmitting}
        disabled={isSubmitting || !value}
      >
        {current ? "Atualizar" : "Confirmar tipo sanguíneo"}
      </Button>
    </Card>
  );
}

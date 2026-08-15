"use client";

import { useState, useSyncExternalStore, useTransition } from "react";

import { Button } from "@/components/ui/button";
import { Field, FieldError, ReadOnlyField, SelectField } from "@/components/ui/field";
import { LoadingOverlay } from "@/components/ui/loading-overlay";
import { NEXT_STAGE, wrongStatusHref } from "@/lib/candidate/funnel";
import { apiErrorMessage } from "@/lib/api/error-messages";
import { MARITAL_OPTIONS } from "@/lib/candidate/labels";
import { formatDateBR } from "@/lib/format";
import type { ProfileSection } from "@/lib/api/types";

type Props = {
  initial: ProfileSection;
};

const subscribeHydration = () => () => {};

export function PerfilForm({ initial }: Props) {
  const ready = useSyncExternalStore(
    subscribeHydration,
    () => true,
    () => false,
  );
  const [pending, startTransition] = useTransition();
  const [motherName, setMotherName] = useState(initial.mother_name ?? "");
  const [fatherName, setFatherName] = useState(initial.father_name ?? "");
  const [birthplace, setBirthplace] = useState(initial.birthplace ?? "");
  const [maritalStatus, setMaritalStatus] = useState(initial.marital_status ?? "");
  const [nationality, setNationality] = useState(initial.nationality ?? "");
  const [error, setError] = useState<string | null>(null);

  function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    startTransition(async () => {
      try {
        const res = await fetch("/api/me/profile", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            mother_name: motherName || null,
            father_name: fatherName || null,
            birthplace: birthplace || null,
            marital_status: maritalStatus || null,
            nationality: nationality || null,
          }),
        });
        const data: { detail?: string; code?: string; expected_status?: string } =
          await res.json();
        if (!res.ok) {
          const redir = wrongStatusHref(data.code, data.expected_status);
          if (redir) {
            window.location.assign(redir);
            return;
          }
          setError(apiErrorMessage(data.code, data.detail, data));
          return;
        }
        // Wizard auto-avançante: sucesso navega direto pro próximo passo.
        window.location.assign(NEXT_STAGE.profile);
      } catch {
        setError("A conexão oscilou. Tente de novo — nada foi perdido.");
      }
    });
  }

  return (
    <form onSubmit={onSubmit} className="space-y-5">
      {/* pending cobre fetch + navegação pro próximo passo (server component
          que busca dados) — o spinner do botão sozinho não deixa claro. */}
      {(!ready || pending) && (
        <LoadingOverlay label={ready ? "Salvando…" : "Preparando formulário…"} logo />
      )}
      <ReadOnlyField label="Nome" value={initial.name ?? "—"} />
      <ReadOnlyField
        label="Data de nascimento"
        value={formatDateBR(initial.birth_date)}
        hint="Confirmado pelo CPF, não editável."
      />
      <Field label="Nome da mãe" value={motherName} onChange={setMotherName} />
      <Field label="Nome do pai" value={fatherName} onChange={setFatherName} />
      <Field label="Naturalidade (cidade/UF)" value={birthplace} onChange={setBirthplace} />
      <SelectField
        label="Estado civil"
        value={maritalStatus}
        onChange={setMaritalStatus}
        options={MARITAL_OPTIONS}
      />
      <Field label="Nacionalidade" value={nationality} onChange={setNationality} />
      <FieldError>{error}</FieldError>
      <Button
        type="submit"
        size="xl"
        loading={pending}
        disabled={!ready}
        className="w-full"
      >
        {!ready ? "Preparando…" : pending ? "Salvando…" : "Salvar e continuar"}
      </Button>
    </form>
  );
}

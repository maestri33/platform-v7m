"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";

import { Field, FieldError } from "@/components/ui/field";
import { Button } from "@/components/ui/button";
import { LoadingOverlay } from "@/components/ui/loading-overlay";
import { UploadActions } from "@/components/ui/upload-actions";
import { NEXT_STAGE, wrongStatusHref } from "@/lib/candidate/funnel";
import {
  compressImage,
  FILE_TOO_LARGE_MSG,
  MAX_UPLOAD_BYTES,
} from "@/lib/images/compress";
import type { AddressProofBlock } from "@/lib/api/types";

type Props = { initial: AddressProofBlock | null };

export function AddressProofSection({ initial }: Props) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [relation, setRelation] = useState("");

  function submitKinship(event: React.FormEvent) {
    event.preventDefault();
    if (!relation.trim() || pending) return;
    setError(null);
    startTransition(async () => {
      try {
        const response = await fetch("/api/me/document/address-proof/kinship", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ relation: relation.trim() }),
        });
        const data: {
          detail?: string;
          address_proof?: AddressProofBlock | null;
        } = await response.json();
        if (!response.ok) {
          setError(data.detail ?? "Não conseguimos registrar o vínculo. Tente novamente.");
          return;
        }
        if (data.address_proof?.needs_kinship) {
          setError("Explique um pouco melhor de quem é a conta e qual é o vínculo com você.");
          return;
        }
        window.location.replace("/painel");
      } catch {
        setError("A conexão oscilou. Tente novamente — nada foi perdido.");
      }
    });
  }

  function onFile(rawFile: File) {
    if (pending) return;
    setError(null);
    startTransition(async () => {
      try {
        const file = await compressImage(rawFile);
        if (file.size > MAX_UPLOAD_BYTES) {
          setError(FILE_TOO_LARGE_MSG);
          return;
        }
        const body = new FormData();
        body.append("file", file, file.name);
        const response = await fetch("/api/me/document/address-proof", {
          method: "POST",
          body,
        });
        const data: { detail?: string; code?: string; expected_status?: string } =
          await response.json();
        if (!response.ok) {
          const redirectTo = wrongStatusHref(data.code, data.expected_status);
          if (redirectTo) {
            router.push(redirectTo);
            return;
          }
          setError(data.detail ?? "Não conseguimos receber o comprovante. Tente novamente.");
          return;
        }
        window.location.replace(NEXT_STAGE.address);
      } catch {
        setError("A conexão oscilou. Tente novamente — nada do cadastro foi perdido.");
      }
    });
  }

  if (initial?.needs_kinship) {
    return (
      <form onSubmit={submitKinship} className="space-y-4">
        {pending && <LoadingOverlay label="Registrando vínculo…" logo />}
        <p className="text-sm text-brand-muted">
          O comprovante está no nome de outra pessoa. Isso não impede o cadastro — diga de quem é a conta e qual é o vínculo com você.
        </p>
        <Field
          label="De quem é o comprovante?"
          value={relation}
          onChange={setRelation}
          placeholder="Ex.: está no nome da minha mãe, moro com ela"
          required
        />
        <Button type="submit" size="xl" loading={pending} className="w-full">
          Confirmar vínculo
        </Button>
        <FieldError>{error}</FieldError>
      </form>
    );
  }

  return (
    <div className="space-y-4">
      {pending && <LoadingOverlay label="Recebendo comprovante…" logo />}
      <p id="address-proof-label" className="text-sm text-brand-muted">
        Pode ser conta de luz, água, internet, telefone ou outro comprovante recente.
        Se estiver no nome de outra pessoa, a gente pergunta o vínculo depois — sem travar o cadastro.
      </p>
      {initial?.status === "rejected" && (
        <div className="banner banner-warn" role="status">
          <p className="font-semibold">Precisamos de outra foto do comprovante.</p>
          {initial.reason && <p className="mt-1 text-sm">{initial.reason}</p>}
        </div>
      )}
      <UploadActions
        onFile={onFile}
        disabled={pending}
        pending={pending}
        retry={Boolean(initial?.photo)}
      />
      <p className="field-hint">
        Depois do envio você já continua. A extração do endereço e a análise do titular rodam em segundo plano.
      </p>
      <FieldError>{error}</FieldError>
    </div>
  );
}

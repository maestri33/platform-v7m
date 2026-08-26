"use client";

import { useState, useSyncExternalStore } from "react";
import { useRouter } from "next/navigation";

import { Button } from "@/components/ui/button";
import { Field, FieldError, ReadOnlyField } from "@/components/ui/field";
import { LoadingOverlay } from "@/components/ui/loading-overlay";
import { NEXT_STAGE, wrongStatusHref } from "@/lib/candidate/funnel";
import { apiErrorMessage } from "@/lib/api/error-messages";
import { maskCep, validateCep } from "@/lib/auth/masks";
import type { AddressSection } from "@/lib/api/types";

type Props = {
  initial: AddressSection;
};

const subscribeHydration = () => () => {};

export function EnderecoForm({ initial }: Props) {
  const router = useRouter();
  const ready = useSyncExternalStore(
    subscribeHydration,
    () => true,
    () => false,
  );
  const [pending, setPending] = useState(false);
  const [cep, setCep] = useState(initial.zipcode ?? "");
  const [number, setNumber] = useState(initial.number ?? "");
  const [complement, setComplement] = useState(initial.complement ?? "");
  const [street, setStreet] = useState(initial.street ?? "");
  const [neighborhood, setNeighborhood] = useState(initial.neighborhood ?? "");
  const [city, setCity] = useState(initial.city ?? "");
  const [state, setState] = useState(initial.state ?? "");
  const [error, setError] = useState<string | null>(null);
  const [stage, setStage] = useState<"cep" | "rest">(
    initial.zipcode ? "rest" : "cep",
  );

  async function onCep(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    // Valida os 8 dígitos no cliente antes de bater no ViaCEP.
    const cepError = validateCep(cep);
    if (cepError) {
      setError(cepError);
      return;
    }
    setPending(true);
    try {
        const res = await fetch("/api/me/address", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ cep: cep.replace(/\D/g, "") }),
        });
        const data: {
          detail?: string;
          code?: string;
          expected_status?: string;
          address?: AddressSection;
        } = await res.json();
        if (!res.ok) {
          const redir = wrongStatusHref(data.code, data.expected_status);
          if (redir) {
            router.push(redir);
            return;
          }
          setError(apiErrorMessage(data.code, data.detail, data));
          return;
        }
        // Backend devolve o me_dict.canônico; pega o address e re-renderiza.
        const a = (data as { address?: AddressSection }).address;
        if (a) {
          setStreet(a.street ?? "");
          setNeighborhood(a.neighborhood ?? "");
          setCity(a.city ?? "");
          setState(a.state ?? "");
        }
        setStage("rest");
    } catch {
      setError("A conexão oscilou. Tente de novo — nada foi perdido.");
    } finally {
      setPending(false);
    }
  }

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setPending(true);
    try {
        const res = await fetch("/api/me/address", {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            number: number || null,
            complement: complement || null,
            street: street || null,
            neighborhood: neighborhood || null,
            city: city || null,
            state: state || null,
          }),
        });
        const data: {
          detail?: string;
          code?: string;
          expected_status?: string;
          status?: string;
        } = await res.json();
        if (!res.ok) {
          const redir = wrongStatusHref(data.code, data.expected_status);
          if (redir) {
            router.push(redir);
            return;
          }
          setError(apiErrorMessage(data.code, data.detail, data));
          return;
        }
        // Avança pelo STATUS REAL do me_dict, não às cegas: o back só sai de
        // `profile` com o comprovante de residência APROVADO. Se ainda não
        // avançou, o refresh re-renderiza a página, que mostra o sub-passo do
        // comprovante (AddressProofSection).
        if (data.status && data.status !== "profile" && data.status !== "started") {
          window.location.replace(NEXT_STAGE.address);
        } else {
          router.refresh();
        }
    } catch {
      setError("A conexão oscilou. Tente de novo — nada foi perdido.");
    } finally {
      setPending(false);
    }
  }

  if (stage === "cep") {
    return (
      <form onSubmit={onCep} className="space-y-5">
        {(!ready || pending) && (
          <LoadingOverlay label={ready ? "Buscando CEP…" : "Preparando formulário…"} logo />
        )}
        <Field
          label="CEP"
          value={cep}
          onChange={(v) => setCep(maskCep(v))}
          inputMode="numeric"
          placeholder="00000-000"
          required
        />
        <FieldError>{error}</FieldError>
        <Button
          type="submit"
          size="xl"
          loading={pending}
          disabled={!ready}
          className="w-full"
        >
          {!ready ? "Preparando…" : pending ? "Buscando…" : "Buscar CEP"}
        </Button>
      </form>
    );
  }

  return (
    <form onSubmit={onSubmit} className="space-y-5">
      {(!ready || pending) && (
        <LoadingOverlay label={ready ? "Salvando endereço…" : "Preparando formulário…"} logo />
      )}
      <div className="grid grid-cols-3 gap-3">
        <ReadOnlyField className="col-span-2" label="CEP" value={cep} />
        <Field label="Número" value={number} onChange={setNumber} required inputMode="numeric" />
      </div>
      <Field label="Rua" value={street} onChange={setStreet} />
      <Field label="Complemento" value={complement} onChange={setComplement} />
      <Field label="Bairro" value={neighborhood} onChange={setNeighborhood} />
      <div className="grid grid-cols-3 gap-3">
        <ReadOnlyField className="col-span-2" label="Cidade" value={city} />
        <ReadOnlyField className="col-span-1" label="UF" value={state} />
      </div>
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

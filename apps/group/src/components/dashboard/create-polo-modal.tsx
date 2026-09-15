"use client";

import { useState } from "react";

import { Button } from "@v7m/ui";
import { ErrorBox } from "@v7m/ui";
import { SelectField } from "@v7m/ui";
import { TextField } from "@v7m/ui";
import { createHub, getErrorMessage, setHubAddress, type Promoter } from "@/lib/api";

interface CreatePoloModalProps {
  open: boolean;
  onClose: () => void;
  promoters: Promoter[];
  onCreated: () => void;
}

const BRAND_PRESETS = [
  { value: "wyden", label: "Wyden (wyden)" },
  { value: "estacio", label: "Estácio (estacio)" },
  { value: "standard", label: "Standard (standard)" },
  { value: "custom", label: "+ Outra marca do catálogo" },
];

export function CreatePoloModal({ open, onClose, promoters, onCreated }: CreatePoloModalProps) {
  const [selectedPreset, setSelectedPreset] = useState("wyden");
  const [customBrand, setCustomBrand] = useState("");
  const [coordinatorId, setCoordinatorId] = useState("");

  // Endereço obrigatório
  const [cep, setCep] = useState("");
  const [street, setStreet] = useState("");
  const [number, setNumber] = useState("");
  const [complement, setComplement] = useState("");
  const [neighborhood, setNeighborhood] = useState("");
  const [city, setCity] = useState("");
  const [state, setState] = useState("");
  const [cepLoading, setCepLoading] = useState(false);

  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  if (!open) return null;

  const promoterOptions = promoters.map((p) => ({
    value: p.external_id,
    label: p.name
      ? `${p.name} ${p.phone ? `(${p.phone})` : ""} — ${p.external_id.slice(0, 6)}…`
      : `Promotor ${p.external_id.slice(0, 8)}…`,
  }));

  async function handleCepBlur() {
    const cleanCep = cep.replace(/\D/g, "");
    if (cleanCep.length === 8) {
      setCepLoading(true);
      try {
        const res = await fetch(`https://viacep.com.br/ws/${cleanCep}/json/`);
        const data = await res.json();
        if (!data.erro) {
          setStreet(data.logradouro || "");
          setNeighborhood(data.bairro || "");
          setCity(data.localidade || "");
          setState(data.uf || "");
        }
      } catch {
        // Fallback silencioso para preenchimento manual
      } finally {
        setCepLoading(false);
      }
    }
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setSuccess(null);

    const brand = selectedPreset === "custom" ? customBrand.trim().toLowerCase() : selectedPreset;
    if (!brand) {
      setError("Informe a marca do polo.");
      return;
    }

    if (!coordinatorId) {
      setError("Selecione obrigatoriamente um promotor como coordenador do polo.");
      return;
    }

    if (!cep.trim() && !street.trim()) {
      setError("Informe o endereço completo ou CEP do polo.");
      return;
    }

    setBusy(true);
    try {
      await createHub({
        brand,
        coordinator_external_id: coordinatorId,
        cep: cep.trim() || null,
        street: street.trim() || null,
        number: number.trim() || null,
        complement: complement.trim() || null,
        neighborhood: neighborhood.trim() || null,
        city: city.trim() || null,
        state: state.trim().toUpperCase() || null,
      });

      setSuccess(`Polo "${brand}" criado e coordenador vinculado com sucesso!`);
      setTimeout(() => {
        onCreated();
        onClose();
        // reset form
        setSelectedPreset("wyden");
        setCustomBrand("");
        setCoordinatorId("");
        setCep("");
        setStreet("");
        setNumber("");
        setComplement("");
        setNeighborhood("");
        setCity("");
        setState("");
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
      aria-labelledby="create-polo-title"
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
    >
      {/* Backdrop */}
      <div
        onClick={onClose}
        className="fixed inset-0 bg-brand-ink/40 backdrop-blur-xs transition-opacity"
      />

      {/* Modal Card */}
      <div className="sheet-up relative z-10 w-full max-w-lg rounded-2xl border border-brand-border bg-white p-6 shadow-2xl">
        <div className="flex items-center justify-between border-b border-brand-border/60 pb-3">
          <div className="flex items-center gap-2.5">
            <div className="flex size-9 items-center justify-center rounded-xl bg-brand-blue-bg text-brand-blue">
              <svg
                className="size-5"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
                aria-hidden="true"
              >
                <path d="M12 21s-7-5.6-7-11a7 7 0 1 1 14 0c0 5.4-7 11-7 11z" />
                <circle cx="12" cy="10" r="3" />
              </svg>
            </div>
            <div>
              <h2 id="create-polo-title" className="text-lg font-extrabold text-brand-ink">
                Criar Novo Polo
              </h2>
              <p className="text-xs text-brand-muted">
                Cadastre um polo do catálogo e vincule o coordenador responsável.
              </p>
            </div>
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

        <form onSubmit={handleSubmit} className="mt-4 flex flex-col gap-4">
          {/* Marca / Brand */}
          <div className="flex flex-col gap-1.5">
            <label className="text-[13px] font-bold text-brand-ink">Marca do Polo (Catálogo)</label>
            <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
              {BRAND_PRESETS.map((preset) => {
                const isSelected = selectedPreset === preset.value;
                return (
                  <button
                    key={preset.value}
                    type="button"
                    onClick={() => setSelectedPreset(preset.value)}
                    className={`cursor-pointer rounded-xl border px-3 py-2 text-center text-xs font-bold transition ${
                      isSelected
                        ? "border-brand-blue bg-brand-blue text-white shadow-xs"
                        : "border-brand-border bg-slate-50 text-brand-ink hover:bg-slate-100"
                    }`}
                  >
                    {preset.value === "custom" ? "+ Outra" : preset.value}
                  </button>
                );
              })}
            </div>

            {selectedPreset === "custom" && (
              <div className="mt-2">
                <TextField
                  label="Nome da Marca"
                  placeholder="ex: unifametro"
                  value={customBrand}
                  onChange={(e) => setCustomBrand(e.target.value)}
                  autoFocus
                />
              </div>
            )}
          </div>

          {/* Coordenador / Promotor Obrigatório */}
          <div>
            <div className="flex items-center justify-between">
              <label className="text-[13px] font-bold text-brand-ink">
                Coordenador do Polo <span className="text-red-500">*</span>
              </label>
              <span className="text-[11px] font-medium text-brand-blue">Promotor Ativo</span>
            </div>
            <div className="mt-1">
              <SelectField
                label=""
                value={coordinatorId}
                onChange={(e) => setCoordinatorId(e.target.value)}
                options={promoterOptions}
                placeholder="Selecione um promotor ativo como coordenador..."
              />
            </div>
            <p className="mt-1 text-[11px] text-brand-muted">
              O polo exige obrigatoriamente um promotor vinculado que atuará como coordenador.
            </p>
          </div>

          {/* Endereço Obrigatório do Polo */}
          <div className="rounded-xl border border-brand-border bg-slate-50 p-4">
            <div className="flex items-center justify-between border-b border-brand-border/60 pb-2">
              <div className="flex items-center gap-1.5 text-xs font-extrabold text-brand-ink">
                <svg className="size-4 text-brand-blue" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M20 10c0 6-8 12-8 12s-8-6-8-12a8 8 0 0 1 16 0Z" />
                  <circle cx="12" cy="10" r="3" />
                </svg>
                <span>Endereço do Polo</span>
                <span className="text-red-500">*</span>
              </div>
              {cepLoading && <span className="text-[11px] text-brand-blue animate-pulse">Buscando CEP...</span>}
            </div>

            <div className="mt-3 flex flex-col gap-3">
              <div className="grid grid-cols-1 gap-2 sm:grid-cols-3">
                <div className="sm:col-span-1">
                  <TextField
                    label="CEP"
                    inputMode="numeric"
                    placeholder="00000-000"
                    value={cep}
                    onChange={(e) => setCep(e.target.value)}
                    onBlur={handleCepBlur}
                  />
                </div>
                <div className="sm:col-span-2">
                  <TextField
                    label="Logradouro / Rua"
                    placeholder="ex: Av. Paulista"
                    value={street}
                    onChange={(e) => setStreet(e.target.value)}
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-2">
                <TextField
                  label="Número"
                  placeholder="ex: 1000"
                  value={number}
                  onChange={(e) => setNumber(e.target.value)}
                />
                <TextField
                  label="Complemento"
                  placeholder="ex: Sala 402, Bloco B"
                  value={complement}
                  onChange={(e) => setComplement(e.target.value)}
                />
              </div>

              <div className="grid grid-cols-3 gap-2">
                <div className="col-span-1">
                  <TextField
                    label="Bairro"
                    placeholder="ex: Centro"
                    value={neighborhood}
                    onChange={(e) => setNeighborhood(e.target.value)}
                  />
                </div>
                <div className="col-span-1">
                  <TextField
                    label="Cidade"
                    placeholder="ex: São Paulo"
                    value={city}
                    onChange={(e) => setCity(e.target.value)}
                  />
                </div>
                <div className="col-span-1">
                  <TextField
                    label="UF"
                    placeholder="SP"
                    maxLength={2}
                    value={state}
                    onChange={(e) => setState(e.target.value.toUpperCase())}
                  />
                </div>
              </div>
            </div>
          </div>


          <ErrorBox message={error} />
          <ErrorBox message={success} success />

          <div className="flex items-center justify-end gap-2 border-t border-brand-border/60 pt-3">
            <Button type="button" variant="secondary" onClick={onClose} disabled={busy}>
              Cancelar
            </Button>
            <Button type="submit" loading={busy} className="bg-brand-green hover:bg-brand-green-dark">
              Criar Polo
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}

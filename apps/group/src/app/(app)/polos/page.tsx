"use client";

import { useEffect, useState } from "react";

import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { ErrorBox } from "@/components/ui/error-box";
import { PageShell } from "@/components/ui/page-shell";
import { SelectField } from "@/components/ui/select-field";
import { Spinner, EmptyState } from "@/components/ui/spinner";
import { StatusPill } from "@/components/ui/status-pill";
import { TextField } from "@/components/ui/text-field";
import {
  createHub,
  getErrorMessage,
  listHubs,
  listPromoters,
  setDefaultHub,
  setHubAddress,
  setHubCoordinator,
  type Hub,
  type Promoter,
} from "@/lib/api";

export default function PolosPage() {
  const [hubs, setHubs] = useState<Hub[] | null>(null);
  const [promoters, setPromoters] = useState<Promoter[]>([]);
  const [error, setError] = useState<string | null>(null);

  function load() {
    Promise.all([listHubs(), listPromoters()])
      .then(([h, p]) => {
        setHubs(h);
        setPromoters(p);
      })
      .catch((e: unknown) => {
        setError(getErrorMessage(e));
        setHubs([]);
      });
  }

  useEffect(load, []);

  const promoterName = (id: string | null) => {
    if (!id) return "—";
    const p = promoters.find((x) => x.external_id === id);
    return p?.name || `${id.slice(0, 8)}…`;
  };

  const promoterOptions = promoters.map((p) => ({
    value: p.external_id,
    label: p.name || `${p.external_id.slice(0, 8)}…`,
  }));

  return (
    <PageShell
      title="Polos"
      subtitle="Cadastre polos, defina coordenadores, endereço e o polo padrão de captação."
    >
      <ErrorBox message={error} />

      <CreateHubForm promoterOptions={promoterOptions} onCreated={load} />

      <div className="mt-6 flex flex-col gap-3">
        <h2 className="text-lg font-extrabold text-brand-ink">Polos cadastrados</h2>
        {hubs === null ? (
          <div className="flex justify-center py-10">
            <Spinner />
          </div>
        ) : hubs.length === 0 ? (
          <EmptyState label="Nenhum polo cadastrado ainda." />
        ) : (
          hubs.map((hub) => (
            <HubCard
              key={hub.external_id}
              hub={hub}
              coordinatorName={promoterName(hub.coordinator_external_id)}
              promoterOptions={promoterOptions}
              onChanged={load}
            />
          ))
        )}
      </div>
    </PageShell>
  );
}

function CreateHubForm({
  promoterOptions,
  onCreated,
}: {
  promoterOptions: { value: string; label: string }[];
  onCreated: () => void;
}) {
  const [brand, setBrand] = useState("wyden");
  const [coord, setCoord] = useState("");
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
  const [ok, setOk] = useState<string | null>(null);

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
        // Silencioso
      } finally {
        setCepLoading(false);
      }
    }
  }

  async function submit() {
    setError(null);
    setOk(null);
    if (!brand.trim()) {
      setError("Informe a marca do polo.");
      return;
    }
    if (!coord) {
      setError("Selecione obrigatoriamente um promotor ativo como coordenador.");
      return;
    }
    if (!cep.trim() && !street.trim()) {
      setError("Informe o endereço ou CEP do polo.");
      return;
    }
    setBusy(true);
    try {
      await createHub({
        brand: brand.trim(),
        coordinator_external_id: coord,
        cep: cep.trim() || null,
        street: street.trim() || null,
        number: number.trim() || null,
        complement: complement.trim() || null,
        neighborhood: neighborhood.trim() || null,
        city: city.trim() || null,
        state: state.trim().toUpperCase() || null,
      });
      setOk("Polo criado com coordenador e endereço vinculados com sucesso.");
      setBrand("wyden");
      setCoord("");
      setCep("");
      setStreet("");
      setNumber("");
      setComplement("");
      setNeighborhood("");
      setCity("");
      setState("");
      onCreated();
    } catch (e: unknown) {
      setError(getErrorMessage(e));
    } finally {
      setBusy(false);
    }
  }

  return (
    <Card className="flex flex-col gap-4">
      <div className="flex items-center justify-between border-b border-brand-border/60 pb-3">
        <div>
          <h2 className="text-lg font-extrabold text-brand-ink">Novo Polo (Exclusivo Administrador)</h2>
          <p className="text-xs text-brand-muted">
            Cadastre o polo com marca do catálogo, promotor coordenador obrigatório e endereço.
          </p>
        </div>
        <span className="rounded-full bg-brand-blue-bg px-2.5 py-0.5 text-xs font-bold text-brand-blue">
          Superuser Only
        </span>
      </div>

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        <TextField
          label="Marca do Polo (Catálogo)"
          placeholder="ex: wyden, estacio, standard"
          value={brand}
          onChange={(e) => setBrand(e.target.value)}
        />
        <SelectField
          label="Promotor Coordenador (Obrigatório)"
          value={coord}
          onChange={(e) => setCoord(e.target.value)}
          options={promoterOptions}
          placeholder="Selecione o promotor coordenador..."
        />
      </div>

      {/* Endereço */}
      <div className="rounded-xl border border-brand-border bg-slate-50 p-4">
        <div className="flex items-center justify-between border-b border-brand-border/60 pb-2">
          <span className="text-xs font-bold text-brand-ink">Endereço do Polo (Obrigatório)</span>
          {cepLoading && <span className="text-[11px] text-brand-blue animate-pulse">Buscando CEP...</span>}
        </div>
        <div className="mt-3 flex flex-col gap-3">
          <div className="grid grid-cols-1 gap-2 sm:grid-cols-3">
            <TextField
              label="CEP"
              inputMode="numeric"
              placeholder="00000-000"
              value={cep}
              onChange={(e) => setCep(e.target.value)}
              onBlur={handleCepBlur}
            />
            <div className="sm:col-span-2">
              <TextField
                label="Logradouro"
                placeholder="Rua, Avenida..."
                value={street}
                onChange={(e) => setStreet(e.target.value)}
              />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-2">
            <TextField label="Número" placeholder="100" value={number} onChange={(e) => setNumber(e.target.value)} />
            <TextField label="Complemento" placeholder="Sala 10" value={complement} onChange={(e) => setComplement(e.target.value)} />
          </div>
          <div className="grid grid-cols-3 gap-2">
            <TextField label="Bairro" placeholder="Centro" value={neighborhood} onChange={(e) => setNeighborhood(e.target.value)} />
            <TextField label="Cidade" placeholder="Fortaleza" value={city} onChange={(e) => setCity(e.target.value)} />
            <TextField label="UF" placeholder="CE" maxLength={2} value={state} onChange={(e) => setState(e.target.value.toUpperCase())} />
          </div>
        </div>
      </div>

      <ErrorBox message={error} />
      <ErrorBox message={ok} success />
      <Button onClick={submit} loading={busy} className="bg-brand-green hover:bg-brand-green-dark">
        Criar Polo Completo
      </Button>
    </Card>
  );
}

function HubCard({
  hub,
  coordinatorName,
  promoterOptions,
  onChanged,
}: {
  hub: Hub;
  coordinatorName: string;
  promoterOptions: { value: string; label: string }[];
  onChanged: () => void;
}) {
  const [panel, setPanel] = useState<"none" | "coordinator" | "address">("none");
  const [confirmDefault, setConfirmDefault] = useState(false);

  const addressFormatted = hub.address
    ? `${hub.address.street || "Logradouro não informado"}${hub.address.number ? `, ${hub.address.number}` : ""}${hub.address.complement ? ` (${hub.address.complement})` : ""}${hub.address.neighborhood ? ` - ${hub.address.neighborhood}` : ""}${hub.address.city ? `, ${hub.address.city}` : ""}${hub.address.state ? `/${hub.address.state}` : ""}${hub.address.cep ? ` - CEP ${hub.address.cep}` : ""}`
    : "Endereço pendente de cadastro";

  return (
    <Card className="card-in flex flex-col gap-3">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="min-w-0">
          <div className="flex items-center gap-2">
            <h3 className="truncate text-base font-extrabold text-brand-ink uppercase">{hub.brand}</h3>
            {hub.is_default ? <StatusPill status="default" tone="green" label="Padrão" /> : null}
          </div>
          <p className="text-[13px] font-medium text-brand-ink">
            <span className="text-brand-muted">Coordenador:</span> {hub.coordinator_name || coordinatorName}
          </p>
          <p className="text-xs text-brand-muted mt-0.5 flex items-center gap-1">
            <svg className="size-3.5 shrink-0 text-brand-blue" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M20 10c0 6-8 12-8 12s-8-6-8-12a8 8 0 0 1 16 0Z" />
              <circle cx="12" cy="10" r="3" />
            </svg>
            <span className="truncate">{addressFormatted}</span>
          </p>
        </div>
        <div className="flex flex-wrap gap-1.5">
          <SmallBtn onClick={() => setPanel(panel === "coordinator" ? "none" : "coordinator")}>
            Coordenador
          </SmallBtn>
          <SmallBtn onClick={() => setPanel(panel === "address" ? "none" : "address")}>
            Endereço
          </SmallBtn>
          {!hub.is_default ? (
            <SmallBtn onClick={() => setConfirmDefault(true)}>Tornar padrão</SmallBtn>
          ) : null}
        </div>
      </div>

      {panel === "coordinator" ? (
        <CoordinatorPanel
          hub={hub}
          promoterOptions={promoterOptions}
          onDone={() => {
            setPanel("none");
            onChanged();
          }}
        />
      ) : null}

      {panel === "address" ? (
        <AddressPanel
          hub={hub}
          onDone={() => {
            setPanel("none");
            onChanged();
          }}
        />
      ) : null}

      <ConfirmDialog
        open={confirmDefault}
        title="Tornar este o polo padrão?"
        confirmLabel="Tornar padrão"
        onCancel={() => setConfirmDefault(false)}
        onConfirm={async () => {
          await setDefaultHub(hub.external_id);
          setConfirmDefault(false);
          onChanged();
        }}
        body={
          <>
            <strong>{hub.brand}</strong> vira o polo padrão de captação (fallback). O polo padrão
            atual deixa de ser. É único.
          </>
        }
      />
    </Card>
  );
}


function CoordinatorPanel({
  hub,
  promoterOptions,
  onDone,
}: {
  hub: Hub;
  promoterOptions: { value: string; label: string }[];
  onDone: () => void;
}) {
  const [value, setValue] = useState(hub.coordinator_external_id ?? "");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function save() {
    setError(null);
    if (!value) {
      setError("Escolha um promotor.");
      return;
    }
    setBusy(true);
    try {
      await setHubCoordinator(hub.external_id, value);
      onDone();
    } catch (e: unknown) {
      setError(getErrorMessage(e));
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="flex flex-col gap-3 rounded-xl border border-brand-border bg-white/50 p-4">
      <SelectField
        label="Coordenador do polo"
        value={value}
        onChange={(e) => setValue(e.target.value)}
        options={promoterOptions}
        placeholder="Selecione um promotor"
      />
      <ErrorBox message={error} />
      <Button onClick={save} loading={busy}>
        Salvar coordenador
      </Button>
    </div>
  );
}

function AddressPanel({ hub, onDone }: { hub: Hub; onDone: () => void }) {
  const [cep, setCep] = useState("");
  const [number, setNumber] = useState("");
  const [complement, setComplement] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function save() {
    setError(null);
    if (!cep.trim()) {
      setError("Informe o CEP.");
      return;
    }
    setBusy(true);
    try {
      await setHubAddress(hub.external_id, {
        cep: cep.trim(),
        number: number.trim() || null,
        complement: complement.trim() || null,
      });
      onDone();
    } catch (e: unknown) {
      setError(getErrorMessage(e));
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="flex flex-col gap-3 rounded-xl border border-brand-border bg-white/50 p-4">
      <p className="text-[13px] text-brand-muted">
        O endereço é preenchido pelo CEP (ViaCEP). CEP inexistente é rejeitado.
      </p>
      <TextField label="CEP" inputMode="numeric" placeholder="00000-000" value={cep} onChange={(e) => setCep(e.target.value)} />
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        <TextField label="Número" value={number} onChange={(e) => setNumber(e.target.value)} />
        <TextField label="Complemento" value={complement} onChange={(e) => setComplement(e.target.value)} />
      </div>
      <ErrorBox message={error} />
      <Button onClick={save} loading={busy}>
        Salvar endereço
      </Button>
    </div>
  );
}

function SmallBtn({ children, onClick }: { children: React.ReactNode; onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="min-h-9 rounded-lg bg-white/70 px-3 py-1 text-[13px] font-bold text-brand-blue ring-1 ring-brand-border transition hover:bg-brand-blue-bg"
    >
      {children}
    </button>
  );
}

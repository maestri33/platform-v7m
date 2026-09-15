"use client";

import { useState } from "react";

import { Button } from "@v7m/ui";
import { Card } from "@v7m/ui";
import { ConfirmDialog } from "@v7m/ui";
import { ErrorBox } from "@v7m/ui";
import { SelectField } from "@v7m/ui";
import { Spinner, EmptyState } from "@v7m/ui";
import { StatusPill } from "@v7m/ui";
import { TextField } from "@v7m/ui";
import {
  getErrorMessage,
  setDefaultHub,
  setHubAddress,
  setHubCoordinator,
  type Hub,
  type Promoter,
} from "@/lib/api";

interface PolosOverviewCardProps {
  hubs: Hub[] | null;
  promoters: Promoter[];
  loading: boolean;
  onRefresh: () => void;
  onOpenCreateModal: () => void;
  onImpersonateGestor: (hub: Hub) => void;
}

type FilterMode = "all" | "default" | "with_coord" | "without_coord";

export function PolosOverviewCard({
  hubs,
  promoters,
  loading,
  onRefresh,
  onOpenCreateModal,
  onImpersonateGestor,
}: PolosOverviewCardProps) {
  const [search, setSearch] = useState("");
  const [filterMode, setFilterMode] = useState<FilterMode>("all");
  const [confirmDefaultHub, setConfirmDefaultHub] = useState<Hub | null>(null);

  const promoterName = (id: string | null) => {
    if (!id) return "Sem coordenador";
    const p = promoters.find((x) => x.external_id === id);
    return p?.name || `${id.slice(0, 8)}…`;
  };

  const promoterOptions = promoters.map((p) => ({
    value: p.external_id,
    label: p.name || `${p.external_id.slice(0, 8)}…`,
  }));

  const filteredHubs = (hubs ?? []).filter((h) => {
    // Mode filter
    if (filterMode === "default" && !h.is_default) return false;
    if (filterMode === "with_coord" && !h.coordinator_external_id) return false;
    if (filterMode === "without_coord" && h.coordinator_external_id) return false;

    // Search query filter
    if (!search.trim()) return true;
    const q = search.toLowerCase();
    const brand = h.brand.toLowerCase();
    const coord = promoterName(h.coordinator_external_id).toLowerCase();
    const id = h.external_id.toLowerCase();
    return brand.includes(q) || coord.includes(q) || id.includes(q);
  });

  return (
    <Card className="flex flex-col gap-4">
      {/* Header with Search and Actions */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between border-b border-brand-border/60 pb-4">
        <div>
          <div className="flex items-center gap-2">
            <h2 className="text-lg font-extrabold text-brand-ink">Polos de Atendimento</h2>
            {hubs && (
              <span className="rounded-full bg-slate-100 px-2 py-0.5 text-xs font-bold text-brand-muted">
                {hubs.length}
              </span>
            )}
          </div>
          <p className="text-xs text-brand-muted">
            Monitore e gerencie os polos parceiros, alterne para a visão do gestor ou cadastre novos polos.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <Button
            type="button"
            onClick={onOpenCreateModal}
            className="bg-brand-green hover:bg-brand-green-dark"
          >
            <svg
              className="mr-1.5 size-4"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
            >
              <line x1="12" y1="5" x2="12" y2="19" />
              <line x1="5" y1="12" x2="19" y2="12" />
            </svg>
            Novo Polo
          </Button>
        </div>
      </div>

      {/* Filters and search bar */}
      <div className="flex flex-col gap-2.5 sm:flex-row sm:items-center sm:justify-between">
        <div className="relative flex-1">
          <input
            type="text"
            placeholder="Buscar polo por marca, coordenador ou ID..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full rounded-xl border border-brand-border bg-slate-50 px-3.5 py-2 pl-9 text-xs text-brand-ink transition placeholder:text-brand-muted focus:border-brand-blue focus:bg-white focus:outline-none"
          />
          <svg
            className="absolute left-3 top-2.5 size-4 text-brand-muted"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
          >
            <circle cx="11" cy="11" r="8" />
            <line x1="21" y1="21" x2="16.65" y2="16.65" />
          </svg>
        </div>

        <div className="flex flex-wrap gap-1">
          <FilterChip
            active={filterMode === "all"}
            onClick={() => setFilterMode("all")}
            label="Todos"
          />
          <FilterChip
            active={filterMode === "default"}
            onClick={() => setFilterMode("default")}
            label="Padrão"
          />
          <FilterChip
            active={filterMode === "with_coord"}
            onClick={() => setFilterMode("with_coord")}
            label="Com Coordenador"
          />
          <FilterChip
            active={filterMode === "without_coord"}
            onClick={() => setFilterMode("without_coord")}
            label="Sem Coordenador"
          />
        </div>
      </div>

      {/* Hubs Grid / List */}
      {loading && hubs === null ? (
        <div className="flex justify-center py-12">
          <Spinner />
        </div>
      ) : filteredHubs.length === 0 ? (
        <EmptyState label="Nenhum polo encontrado com os filtros atuais." />
      ) : (
        <div className="grid grid-cols-1 gap-3">
          {filteredHubs.map((hub) => (
            <HubItemRow
              key={hub.external_id}
              hub={hub}
              coordinatorName={promoterName(hub.coordinator_external_id)}
              promoterOptions={promoterOptions}
              onImpersonate={() => onImpersonateGestor(hub)}
              onMakeDefault={() => setConfirmDefaultHub(hub)}
              onChanged={onRefresh}
            />
          ))}
        </div>
      )}

      {/* Confirm make default dialog */}
      <ConfirmDialog
        open={confirmDefaultHub !== null}
        title="Tornar este o polo padrão?"
        confirmLabel="Confirmar como Padrão"
        onCancel={() => setConfirmDefaultHub(null)}
        onConfirm={async () => {
          if (!confirmDefaultHub) return;
          try {
            await setDefaultHub(confirmDefaultHub.external_id);
            setConfirmDefaultHub(null);
            onRefresh();
          } catch (err) {
            console.error(err);
          }
        }}
        body={
          <>
            <strong>{confirmDefaultHub?.brand}</strong> se tornará o polo padrão de captação
            (fallback). O polo padrão atual deixará de sê-lo.
          </>
        }
      />
    </Card>
  );
}

function HubItemRow({
  hub,
  coordinatorName,
  promoterOptions,
  onImpersonate,
  onMakeDefault,
  onChanged,
}: {
  hub: Hub;
  coordinatorName: string;
  promoterOptions: { value: string; label: string }[];
  onImpersonate: () => void;
  onMakeDefault: () => void;
  onChanged: () => void;
}) {
  const [panel, setPanel] = useState<"none" | "coordinator" | "address">("none");

  return (
    <div className="card-in flex flex-col gap-3 rounded-2xl border border-brand-border bg-white p-4 shadow-xs transition hover:border-brand-blue/30">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2">
            <h3 className="truncate text-base font-extrabold text-brand-ink uppercase">{hub.brand}</h3>
            {hub.is_default && (
              <StatusPill status="default" tone="green" label="Polo Padrão" />
            )}
          </div>
          <div className="mt-0.5 flex flex-wrap items-center gap-x-3 text-xs text-brand-muted">
            <span>
              Coordenador: <strong className="text-brand-ink">{hub.coordinator_name || coordinatorName}</strong>
            </span>
            <span>·</span>
            <span className="font-mono text-[11px]">ID: {hub.external_id.slice(0, 8)}…</span>
          </div>
          {hub.address && (
            <div className="mt-1 flex items-center gap-1 text-[11px] text-brand-muted">
              <svg className="size-3.5 shrink-0 text-brand-blue" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M20 10c0 6-8 12-8 12s-8-6-8-12a8 8 0 0 1 16 0Z" />
                <circle cx="12" cy="10" r="3" />
              </svg>
              <span className="truncate">
                {`${hub.address.street || "Logradouro"}${hub.address.number ? `, ${hub.address.number}` : ""}${hub.address.complement ? ` (${hub.address.complement})` : ""}${hub.address.neighborhood ? ` - ${hub.address.neighborhood}` : ""}${hub.address.city ? `, ${hub.address.city}` : ""}${hub.address.state ? `/${hub.address.state}` : ""}${hub.address.cep ? ` (${hub.address.cep})` : ""}`}
              </span>
            </div>
          )}
        </div>


        {/* Action Buttons */}
        <div className="flex flex-wrap items-center gap-2">
          {/* Botão Entrar como Gestor */}
          <button
            type="button"
            onClick={onImpersonate}
            className="flex cursor-pointer items-center gap-1.5 rounded-xl bg-amber-500/10 px-3.5 py-1.5 text-xs font-black text-amber-900 ring-1 ring-amber-500/30 transition hover:bg-amber-500 hover:text-white"
          >
            <svg
              className="size-4 shrink-0"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
            >
              <path d="M15 3h4a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2h-4" />
              <polyline points="10 17 15 12 10 7" />
              <line x1="15" y1="12" x2="3" y2="12" />
            </svg>
            <span>Entrar como Gestor</span>
          </button>

          <button
            type="button"
            onClick={() => setPanel(panel === "coordinator" ? "none" : "coordinator")}
            className="cursor-pointer rounded-xl border border-brand-border bg-slate-50 px-3 py-1.5 text-xs font-bold text-brand-ink hover:bg-slate-100"
          >
            Coordenador
          </button>

          <button
            type="button"
            onClick={() => setPanel(panel === "address" ? "none" : "address")}
            className="cursor-pointer rounded-xl border border-brand-border bg-slate-50 px-3 py-1.5 text-xs font-bold text-brand-ink hover:bg-slate-100"
          >
            Endereço
          </button>

          {!hub.is_default && (
            <button
              type="button"
              onClick={onMakeDefault}
              className="cursor-pointer rounded-xl border border-brand-border bg-slate-50 px-3 py-1.5 text-xs font-bold text-brand-muted hover:border-brand-green hover:text-brand-green"
            >
              Tornar padrão
            </button>
          )}
        </div>
      </div>

      {/* Coordinator quick panel */}
      {panel === "coordinator" && (
        <CoordinatorInlinePanel
          hub={hub}
          promoterOptions={promoterOptions}
          onDone={() => {
            setPanel("none");
            onChanged();
          }}
        />
      )}

      {/* Address quick panel */}
      {panel === "address" && (
        <AddressInlinePanel
          hub={hub}
          onDone={() => {
            setPanel("none");
            onChanged();
          }}
        />
      )}
    </div>
  );
}

function CoordinatorInlinePanel({
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
    <div className="mt-2 flex flex-col gap-2.5 rounded-xl border border-brand-border bg-slate-50/80 p-3.5">
      <SelectField
        label="Alterar Coordenador do Polo"
        value={value}
        onChange={(e) => setValue(e.target.value)}
        options={promoterOptions}
        placeholder="Selecione um promotor"
      />
      <ErrorBox message={error} />
      <div className="flex justify-end gap-2">
        <Button onClick={save} loading={busy} className="text-xs">
          Salvar Coordenador
        </Button>
      </div>
    </div>
  );
}

function AddressInlinePanel({ hub, onDone }: { hub: Hub; onDone: () => void }) {
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
    <div className="mt-2 flex flex-col gap-2.5 rounded-xl border border-brand-border bg-slate-50/80 p-3.5">
      <p className="text-xs text-brand-muted">
        O endereço é preenchido pelo CEP via integração oficial ViaCEP.
      </p>
      <TextField
        label="CEP"
        inputMode="numeric"
        placeholder="00000-000"
        value={cep}
        onChange={(e) => setCep(e.target.value)}
      />
      <div className="grid grid-cols-2 gap-2">
        <TextField label="Número" value={number} onChange={(e) => setNumber(e.target.value)} />
        <TextField label="Complemento" value={complement} onChange={(e) => setComplement(e.target.value)} />
      </div>
      <ErrorBox message={error} />
      <div className="flex justify-end gap-2">
        <Button onClick={save} loading={busy} className="text-xs">
          Salvar Endereço
        </Button>
      </div>
    </div>
  );
}

function FilterChip({
  active,
  onClick,
  label,
}: {
  active: boolean;
  onClick: () => void;
  label: string;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`cursor-pointer rounded-xl px-3 py-1.5 text-xs font-bold transition ${
        active
          ? "bg-brand-blue text-white shadow-xs"
          : "border border-brand-border bg-slate-50 text-brand-muted hover:bg-slate-100 hover:text-brand-ink"
      }`}
    >
      {label}
    </button>
  );
}

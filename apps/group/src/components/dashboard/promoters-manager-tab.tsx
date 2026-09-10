"use client";

import { useState } from "react";

import { Card } from "@v7m/ui";
import { Spinner, EmptyState } from "@v7m/ui";
import { StatusPill } from "@v7m/ui";
import { PhoneRescueModal } from "@/components/dashboard/phone-rescue-modal";
import type { Hub, Promoter } from "@/lib/api";

interface PromotersManagerTabProps {
  promoters: Promoter[];
  hubs: Hub[] | null;
  loading: boolean;
  onRefresh: () => void;
}

export function PromotersManagerTab({
  promoters,
  hubs,
  loading,
  onRefresh,
}: PromotersManagerTabProps) {
  const [search, setSearch] = useState("");
  const [rescueUser, setRescueUser] = useState<{ id: string; name: string } | null>(null);

  // Mapeia promotores para polos que eles coordenam
  const coordHubMap = new Map<string, string[]>();
  (hubs ?? []).forEach((h) => {
    if (h.coordinator_external_id) {
      const list = coordHubMap.get(h.coordinator_external_id) || [];
      list.push(h.brand);
      coordHubMap.set(h.coordinator_external_id, list);
    }
  });

  const filteredPromoters = promoters.filter((p) => {
    if (!search.trim()) return true;
    const q = search.toLowerCase();
    const name = String(p.name || "").toLowerCase();
    const id = String(p.external_id || "").toLowerCase();
    return name.includes(q) || id.includes(q);
  });

  const totalCoordinators = Array.from(coordHubMap.keys()).length;

  return (
    <div className="flex flex-col gap-5">
      {/* Top metrics */}
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        <div className="rounded-2xl border border-brand-border bg-white p-4">
          <span className="text-xs font-bold text-brand-muted">Total de Promotores Ativos</span>
          <p className="text-2xl font-black text-brand-ink">{promoters.length}</p>
        </div>
        <div className="rounded-2xl border border-brand-border bg-white p-4">
          <span className="text-xs font-bold text-brand-muted">Coordenadores de Polo</span>
          <p className="text-2xl font-black text-brand-blue">{totalCoordinators}</p>
        </div>
      </div>

      <Card className="flex flex-col gap-4">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between border-b border-brand-border/60 pb-3">
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-base font-extrabold text-brand-ink">Equipe de Promotores e Lideranças</h2>
              <span className="rounded-full bg-slate-100 px-2 py-0.5 text-xs font-bold text-brand-muted">
                {filteredPromoters.length}
              </span>
            </div>
            <p className="text-xs text-brand-muted">
              Gerencie a equipe comercial, promotores aptos a coordenar polos e faça resgate de telefone.
            </p>
          </div>
        </div>

        {/* Search */}
        <div className="relative max-w-md">
          <input
            type="text"
            placeholder="Buscar por nome ou ID do promotor..."
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

        {/* List */}
        {loading && promoters.length === 0 ? (
          <div className="flex justify-center py-12">
            <Spinner />
          </div>
        ) : filteredPromoters.length === 0 ? (
          <EmptyState label="Nenhum promotor encontrado." />
        ) : (
          <div className="grid grid-cols-1 gap-2.5">
            {filteredPromoters.map((promoter) => {
              const name = promoter.name || `Promotor (${promoter.external_id.slice(0, 8)}…)`;
              const coordHubs = coordHubMap.get(promoter.external_id) || [];
              const isCoord = coordHubs.length > 0;

              return (
                <div
                  key={promoter.external_id}
                  className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-brand-border bg-white p-4 shadow-xs transition hover:border-brand-blue/30"
                >
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="font-extrabold text-brand-ink">{name}</span>
                      <StatusPill
                        status={isCoord ? "active" : "neutral"}
                        tone={isCoord ? "green" : "neutral"}
                        label={isCoord ? `Coordena: ${coordHubs.join(", ")}` : "Promotor Ativo"}
                      />
                    </div>
                    <p className="mt-1 text-xs text-brand-muted font-mono">
                      ID: {promoter.external_id}
                    </p>
                  </div>

                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() =>
                        setRescueUser({ id: promoter.external_id, name: promoter.name || "Promotor" })
                      }
                      className="cursor-pointer rounded-xl border border-brand-border bg-slate-50 px-3 py-1.5 text-xs font-bold text-brand-ink hover:bg-slate-100"
                    >
                      Resgate de Telefone
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </Card>

      {/* Modal Resgate */}
      <PhoneRescueModal
        open={rescueUser !== null}
        userExternalId={rescueUser?.id || null}
        userName={rescueUser?.name || ""}
        onClose={() => setRescueUser(null)}
        onSuccess={onRefresh}
      />
    </div>
  );
}

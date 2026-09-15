"use client";

import { useState } from "react";
import Link from "next/link";

import { Button } from "@v7m/ui";
import { Card } from "@v7m/ui";
import { PhoneRescueModal } from "@/components/dashboard/phone-rescue-modal";
import { StatusPill } from "@v7m/ui";

import { TextField } from "@v7m/ui";
import { type Coordinator } from "@/lib/api";
import { maskBrPhone } from "@/lib/phone";
import { maskCpf } from "@/lib/cpf";
import { formatBRL } from "@/lib/money";

interface CoordinatorsManagerTabProps {
  coordinators: Coordinator[];
  loading: boolean;
  onRefresh: () => void;
}

export function CoordinatorsManagerTab({
  coordinators,
  loading,
  onRefresh,
}: CoordinatorsManagerTabProps) {
  const [search, setSearch] = useState("");
  const [phoneTarget, setPhoneTarget] = useState<Coordinator | null>(null);

  const filtered = coordinators.filter((c) => {
    const q = search.toLowerCase().trim();
    if (!q) return true;
    const matchName = (c.name || "").toLowerCase().includes(q);
    const matchPhone = (c.phone || "").includes(q);
    const matchCpf = (c.cpf || "").includes(q);
    const matchHub = c.hubs.some((h) =>
      h.brand.toLowerCase().includes(q) || (h.city || "").toLowerCase().includes(q)
    );
    return matchName || matchPhone || matchCpf || matchHub;
  });

  return (
    <div className="flex flex-col gap-4">
      {/* Action and Search bar */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="w-full sm:max-w-md">
          <TextField
            label="Buscar Coordenador"
            placeholder="Filtrar por nome, telefone, CPF ou polo..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>

        <div className="flex items-center gap-2">
          <Button variant="secondary" onClick={onRefresh} loading={loading}>
            Atualizar Coordenadores
          </Button>
          <Link
            href="/coordenadores"
            className="flex items-center gap-1 text-xs font-bold text-brand-blue hover:underline px-2"
          >
            Ver Página Completa &rarr;
          </Link>
        </div>
      </div>

      {filtered.length === 0 ? (
        <Card className="py-8 text-center text-xs text-brand-muted">
          Nenhum coordenador encontrado.
        </Card>
      ) : (
        <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
          {filtered.map((coord) => (
            <Card key={coord.external_id} className="flex flex-col justify-between gap-4">
              <div className="flex flex-col gap-3">
                <div className="flex items-start justify-between gap-2 border-b border-brand-border/60 pb-3">
                  <div>
                    <h3 className="text-sm font-extrabold text-brand-ink">
                      {coord.name || "Coordenador sem Nome"}
                    </h3>
                    <div className="mt-0.5 flex flex-wrap items-center gap-2 text-xs text-brand-muted">
                      {coord.phone ? (
                        <a
                          href={`https://wa.me/55${coord.phone}`}
                          target="_blank"
                          rel="noreferrer"
                          className="font-mono text-brand-blue hover:underline"
                        >
                          {maskBrPhone(coord.phone)}
                        </a>
                      ) : (
                        <span className="italic text-amber-600">Sem telefone</span>
                      )}
                      {coord.cpf && <span>• CPF: {maskCpf(coord.cpf)}</span>}
                    </div>
                  </div>

                  <StatusPill
                    status="active"
                    tone="blue"
                    label={`${coord.hubs_count} ${coord.hubs_count === 1 ? "Polo" : "Polos"}`}
                  />
                </div>

                <div className="grid grid-cols-3 gap-2 rounded-xl bg-slate-50 p-2 text-center text-xs">
                  <div>
                    <span className="text-[10px] uppercase font-bold text-brand-muted">Promotores</span>
                    <p className="font-extrabold text-brand-ink">{coord.promoters_count}</p>
                  </div>
                  <div>
                    <span className="text-[10px] uppercase font-bold text-brand-muted">Alunos</span>
                    <p className="font-extrabold text-brand-ink">{coord.students_count}</p>
                  </div>
                  <div>
                    <span className="text-[10px] uppercase font-bold text-brand-muted">Comissões</span>
                    <p className="font-extrabold text-emerald-700">
                      {formatBRL(Number(coord.total_commission || 0))}
                    </p>
                  </div>
                </div>

                {/* Polos List */}
                <div className="flex flex-col gap-1">
                  <span className="text-[11px] font-bold text-brand-ink">Polos Atribuídos:</span>
                  {coord.hubs.map((h) => (
                    <div
                      key={h.external_id}
                      className="flex items-center justify-between rounded-lg border border-brand-border bg-white px-2.5 py-1.5 text-xs"
                    >
                      <div className="flex items-center gap-1.5">
                        <span className="font-bold uppercase text-brand-ink">{h.brand}</span>
                        {h.is_default && (
                          <span className="rounded bg-amber-100 px-1 text-[9px] font-bold text-amber-800">
                            Padrão
                          </span>
                        )}
                        {(h.city || h.state) && (
                          <span className="text-[10px] text-brand-muted">
                            ({h.city ? `${h.city}/` : ""}{h.state})
                          </span>
                        )}
                      </div>
                      <span className="text-[10px] text-brand-muted">
                        {h.promoters_count} promotores • {h.students_count} alunos
                      </span>
                    </div>
                  ))}
                </div>
              </div>

              <div className="flex items-center justify-between border-t border-brand-border/60 pt-2.5">
                <span className="font-mono text-[10px] text-brand-muted">
                  ID: {coord.external_id.slice(0, 8)}...
                </span>
                <Button
                  variant="secondary"
                  className="min-h-9 px-3 text-xs"
                  onClick={() => setPhoneTarget(coord)}
                >
                  Resgatar Telefone
                </Button>

              </div>
            </Card>
          ))}
        </div>
      )}

      {/* Phone rescue modal */}
      {phoneTarget && (
        <PhoneRescueModal
          open={!!phoneTarget}
          onClose={() => setPhoneTarget(null)}
          onSuccess={() => {
            setPhoneTarget(null);
            onRefresh();
          }}
          userExternalId={phoneTarget.external_id}
          userName={phoneTarget.name || "Coordenador"}
        />
      )}
    </div>
  );
}


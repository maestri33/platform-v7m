"use client";

import { useEffect, useState } from "react";

import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { ErrorBox } from "@/components/ui/error-box";
import { PageShell } from "@/components/ui/page-shell";
import { PhoneRescueModal } from "@/components/dashboard/phone-rescue-modal";
import { Spinner } from "@/components/ui/spinner";

import { StatCard } from "@/components/ui/stat-card";
import { StatusPill } from "@/components/ui/status-pill";
import { TextField } from "@/components/ui/text-field";
import {
  getErrorMessage,
  listCoordinators,
  type Coordinator,
} from "@/lib/api";
import { maskBrPhone } from "@/lib/phone";
import { maskCpf } from "@/lib/cpf";
import { formatBRL } from "@/lib/money";

export default function CoordenadoresPage() {
  const [coordinators, setCoordinators] = useState<Coordinator[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState("");

  // Phone rescue state
  const [phoneTarget, setPhoneTarget] = useState<Coordinator | null>(null);

  async function loadData() {
    setLoading(true);
    setError(null);
    try {
      const data = await listCoordinators();
      setCoordinators(data);
    } catch (err: unknown) {
      setError(getErrorMessage(err));
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadData();
  }, []);

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

  const totalHubs = coordinators.reduce((acc, c) => acc + c.hubs_count, 0);
  const totalPromoters = coordinators.reduce((acc, c) => acc + c.promoters_count, 0);
  const totalStudents = coordinators.reduce((acc, c) => acc + c.students_count, 0);
  const totalCommissions = coordinators.reduce(
    (acc, c) => acc + Number(c.total_commission || 0),
    0
  );

  return (
    <PageShell
      title="Lideranças & Coordenadores"
      subtitle="Supervisão de coordenadores de polo, suas equipes de promotores, alunos matriculados e comissões."
    >
      {/* Top metrics */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-5 mb-6">
        <StatCard
          label="Coordenadores"
          value={String(coordinators.length)}
          tone={coordinators.length > 0 ? "blue" : "neutral"}
        />
        <StatCard
          label="Polos Geridos"
          value={String(totalHubs)}
          tone="neutral"
        />
        <StatCard
          label="Promotores na Rede"
          value={String(totalPromoters)}
          tone="neutral"
        />
        <StatCard
          label="Alunos nos Polos"
          value={String(totalStudents)}
          tone="neutral"
        />
        <StatCard
          label="Comissões Acumuladas"
          value={formatBRL(totalCommissions)}
          tone="green"
        />
      </div>

      <ErrorBox message={error} />

      {/* Filter and search */}
      <div className="mb-6 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="w-full sm:max-w-md">
          <TextField
            label="Buscar Coordenador"
            placeholder="Buscar por nome, telefone, CPF ou polo..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>

        <Button variant="secondary" onClick={loadData} loading={loading}>
          Atualizar Lista
        </Button>
      </div>

      {loading ? (
        <div className="flex justify-center py-12">
          <Spinner />
        </div>
      ) : filtered.length === 0 ? (
        <Card className="py-12 text-center text-xs text-brand-muted">
          Nenhum coordenador encontrado.
        </Card>
      ) : (
        <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
          {filtered.map((coord) => (
            <Card key={coord.external_id} className="flex flex-col justify-between gap-4">
              <div className="flex flex-col gap-3">
                {/* Header */}
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

                  <div className="flex flex-col items-end gap-1">
                    <StatusPill
                      status="active"
                      tone="blue"
                      label={`${coord.hubs_count} ${coord.hubs_count === 1 ? "Polo" : "Polos"}`}
                    />
                  </div>
                </div>

                {/* Metrics row */}
                <div className="grid grid-cols-3 gap-2 rounded-xl bg-slate-50 p-2.5 text-center text-xs">
                  <div>
                    <span className="text-[10px] uppercase font-bold text-brand-muted">Promotores</span>
                    <p className="font-extrabold text-brand-ink mt-0.5">{coord.promoters_count}</p>
                  </div>
                  <div>
                    <span className="text-[10px] uppercase font-bold text-brand-muted">Alunos</span>
                    <p className="font-extrabold text-brand-ink mt-0.5">{coord.students_count}</p>
                  </div>
                  <div>
                    <span className="text-[10px] uppercase font-bold text-brand-muted">Comissões</span>
                    <p className="font-extrabold text-emerald-700 mt-0.5">
                      {formatBRL(Number(coord.total_commission || 0))}
                    </p>
                  </div>
                </div>

                {/* Polos List */}
                <div>
                  <h4 className="text-xs font-bold text-brand-ink mb-1.5">Polos Sob Responsabilidade:</h4>
                  {coord.hubs.length === 0 ? (
                    <p className="text-xs italic text-brand-muted">Nenhum polo vinculado.</p>
                  ) : (
                    <div className="flex flex-col gap-1.5">
                      {coord.hubs.map((h) => (
                        <div
                          key={h.external_id}
                          className="flex items-center justify-between rounded-xl border border-brand-border bg-white px-3 py-2 text-xs"
                        >
                          <div className="flex items-center gap-2">
                            <span className="font-bold text-brand-ink uppercase">{h.brand}</span>
                            {h.is_default && (
                              <span className="rounded-md bg-amber-100 px-1.5 py-0.5 text-[10px] font-bold text-amber-800">
                                Padrão
                              </span>
                            )}
                            {(h.city || h.state) && (
                              <span className="text-brand-muted text-[11px]">
                                ({[h.city, h.state].filter(Boolean).join("/")})
                              </span>
                            )}
                          </div>

                          <div className="text-[11px] text-brand-muted">
                            <strong>{h.promoters_count}</strong> promotores • <strong>{h.students_count}</strong> alunos
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>

              {/* Action bar */}
              <div className="flex items-center justify-between border-t border-brand-border/60 pt-3">
                <span className="font-mono text-[10px] text-brand-muted">
                  ID: {coord.external_id.slice(0, 8)}...
                </span>
                <Button
                  variant="secondary"
                  className="min-h-9 px-3 text-xs"
                  onClick={() => setPhoneTarget(coord)}
                >
                  Resgatar / Trocar Telefone
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
            loadData();
          }}
          userExternalId={phoneTarget.external_id}
          userName={phoneTarget.name || "Coordenador"}
        />
      )}
    </PageShell>
  );
}


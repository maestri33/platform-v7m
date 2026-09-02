"use client";

import { useEffect, useState } from "react";
import { getErrorMessage, getNetworkTree, NetworkHubNode } from "@/lib/api";

export default function RedePage() {
  const [tree, setTree] = useState<NetworkHubNode[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [expandedHubs, setExpandedHubs] = useState<Record<string, boolean>>({});

  useEffect(() => {
    loadTree();
  }, []);

  async function loadTree() {
    setLoading(true);
    setError(null);
    try {
      const data = await getNetworkTree();
      const treeArray = Array.isArray(data) ? data : [];
      setTree(treeArray);
      // Expande todos por padrão
      const initExp: Record<string, boolean> = {};
      treeArray.forEach((h) => {
        if (h?.hub_external_id) initExp[h.hub_external_id] = true;
      });
      setExpandedHubs(initExp);
    } catch (err) {
      setError(getErrorMessage(err));
    } finally {
      setLoading(false);
    }
  }

  function toggleHub(id: string) {
    setExpandedHubs((prev) => ({ ...prev, [id]: !prev[id] }));
  }

  // Totais agregados
  const treeList = Array.isArray(tree) ? tree : [];
  const totalHubs = treeList.length;
  const totalPromoters = treeList.reduce((acc, h) => acc + (h.metrics?.total_promoters || 0), 0);
  const totalLeads = treeList.reduce((acc, h) => acc + (h.metrics?.total_leads || 0), 0);
  const totalPaid = treeList.reduce((acc, h) => acc + (h.metrics?.total_paid || 0), 0);
  const avgConversion = totalLeads > 0 ? ((totalPaid / totalLeads) * 100).toFixed(1) : "0.0";

  const filteredTree = treeList.filter((h) => {
    if (!search.trim()) return true;
    const s = search.toLowerCase();
    const matchHub = h.brand?.toLowerCase().includes(s) || (h.coordinator?.name && h.coordinator.name.toLowerCase().includes(s));
    const matchProm = Array.isArray(h.promoters) && h.promoters.some((p) => p.name?.toLowerCase().includes(s) || (p.phone && p.phone.includes(s)));
    return matchHub || matchProm;
  });

  return (
    <div className="space-y-6">
      {/* Cabeçalho */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-black tracking-tight text-brand-ink">
            Rede & Hierarquia de Captação
          </h1>
          <p className="text-sm text-brand-muted">
            Árvore genealógica de Coordenadores → Polos → Promotores → Matrículas e performance de conversão.
          </p>
        </div>
        <button
          onClick={loadTree}
          className="inline-flex items-center gap-2 rounded-xl border border-brand-border bg-white px-4 py-2 text-sm font-bold text-brand-ink shadow-sm transition hover:bg-slate-50"
        >
          <svg className="size-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
          </svg>
          Atualizar Rede
        </button>
      </div>

      {/* Cards de Métricas Consolidadas */}
      <div className="grid grid-cols-2 gap-4 sm:grid-cols-5">
        <div className="rounded-2xl border border-brand-border bg-white p-4 shadow-sm">
          <p className="text-xs font-bold text-brand-muted uppercase">Polos Ativos</p>
          <p className="mt-1 text-2xl font-black text-brand-ink">{totalHubs}</p>
        </div>
        <div className="rounded-2xl border border-brand-border bg-white p-4 shadow-sm">
          <p className="text-xs font-bold text-brand-muted uppercase">Promotores na Rede</p>
          <p className="mt-1 text-2xl font-black text-brand-blue">{totalPromoters}</p>
        </div>
        <div className="rounded-2xl border border-brand-border bg-white p-4 shadow-sm">
          <p className="text-xs font-bold text-brand-muted uppercase">Total de Leads</p>
          <p className="mt-1 text-2xl font-black text-brand-ink">{totalLeads}</p>
        </div>
        <div className="rounded-2xl border border-brand-border bg-white p-4 shadow-sm">
          <p className="text-xs font-bold text-brand-muted uppercase">Matrículas Pagas</p>
          <p className="mt-1 text-2xl font-black text-emerald-600">{totalPaid}</p>
        </div>
        <div className="rounded-2xl border border-brand-border bg-white p-4 shadow-sm">
          <p className="text-xs font-bold text-brand-muted uppercase">Taxa de Conversão</p>
          <p className="mt-1 text-2xl font-black text-brand-gold">{avgConversion}%</p>
        </div>
      </div>

      {/* Busca */}
      <div className="relative">
        <input
          type="text"
          placeholder="Buscar polo, coordenador ou promotor..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="w-full rounded-xl border border-brand-border bg-white px-4 py-2.5 pl-10 text-sm text-brand-ink placeholder-brand-muted focus:border-brand-blue focus:outline-none"
        />
        <svg className="absolute left-3.5 top-3 size-4 text-brand-muted" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
        </svg>
      </div>

      {/* Feedback de Erro / Loading */}
      {error && (
        <div className="rounded-xl border border-rose-200 bg-rose-50 p-4 text-sm font-medium text-rose-800">
          {error}
        </div>
      )}

      {loading ? (
        <div className="flex h-64 items-center justify-center rounded-2xl border border-brand-border bg-white p-8">
          <div className="flex items-center gap-3 text-sm font-bold text-brand-muted">
            <div className="size-5 animate-spin rounded-full border-2 border-brand-blue border-t-transparent" />
            Carregando árvore da rede...
          </div>
        </div>
      ) : filteredTree.length === 0 ? (
        <div className="flex h-48 flex-col items-center justify-center rounded-2xl border border-brand-border bg-white p-8 text-center">
          <p className="font-bold text-brand-ink">Nenhum nó de rede encontrado</p>
          <p className="text-xs text-brand-muted">Tente ajustar seus termos de busca.</p>
        </div>
      ) : (
        <div className="space-y-4">
          {filteredTree.map((hub) => {
            const isExpanded = expandedHubs[hub.hub_external_id] ?? true;
            return (
              <div
                key={hub.hub_external_id}
                className="overflow-hidden rounded-2xl border border-brand-border bg-white shadow-sm transition"
              >
                {/* Cabeçalho do Nó Polo */}
                <div
                  onClick={() => toggleHub(hub.hub_external_id)}
                  className="flex cursor-pointer flex-col gap-3 bg-slate-50/70 p-4 sm:flex-row sm:items-center sm:justify-between hover:bg-slate-100/70 transition"
                >
                  <div className="flex items-center gap-3">
                    <button className="flex size-7 items-center justify-center rounded-lg border border-brand-border bg-white text-brand-ink">
                      <svg
                        className={`size-4 transition-transform duration-200 ${isExpanded ? "rotate-90" : ""}`}
                        fill="none"
                        viewBox="0 0 24 24"
                        stroke="currentColor"
                      >
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                      </svg>
                    </button>
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-black text-brand-ink uppercase tracking-wide">
                          Polo {hub.brand}
                        </span>
                        {hub.is_default && (
                          <span className="rounded-full bg-brand-blue-bg px-2 py-0.5 text-[10px] font-bold text-brand-blue">
                            Padrão
                          </span>
                        )}
                      </div>
                      <p className="text-xs text-brand-muted">
                        Coordenador: <strong className="text-brand-ink">{hub.coordinator.name}</strong>{" "}
                        {hub.coordinator.phone ? `(${hub.coordinator.phone})` : ""}
                      </p>
                    </div>
                  </div>

                  {/* Resumo do Polo */}
                  <div className="flex items-center gap-4 text-xs font-bold">
                    <div className="rounded-xl border border-brand-border bg-white px-3 py-1.5 text-center">
                      <span className="text-brand-muted block text-[10px]">PROMOTORES</span>
                      <span className="text-brand-ink">{hub.metrics.total_promoters}</span>
                    </div>
                    <div className="rounded-xl border border-brand-border bg-white px-3 py-1.5 text-center">
                      <span className="text-brand-muted block text-[10px]">LEADS</span>
                      <span className="text-brand-ink">{hub.metrics.total_leads}</span>
                    </div>
                    <div className="rounded-xl border border-brand-border bg-white px-3 py-1.5 text-center">
                      <span className="text-brand-muted block text-[10px]">PAGOS</span>
                      <span className="text-emerald-600">{hub.metrics.total_paid}</span>
                    </div>
                    <div className="rounded-xl border border-brand-border bg-white px-3 py-1.5 text-center">
                      <span className="text-brand-muted block text-[10px]">CONVERSÃO</span>
                      <span className="text-brand-gold">{hub.metrics.conversion_rate}%</span>
                    </div>
                  </div>
                </div>

                {/* Lista de Promotores daquele Polo */}
                {isExpanded && (
                  <div className="divide-y divide-brand-border/60 border-t border-brand-border/60 p-2 sm:p-4">
                    {hub.promoters.length === 0 ? (
                      <p className="py-4 text-center text-xs text-brand-muted">
                        Nenhum promotor cadastrado neste polo ainda.
                      </p>
                    ) : (
                      <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
                        {hub.promoters.map((prom) => {
                          const promConv =
                            prom.conversion_rate != null
                              ? Number(prom.conversion_rate).toFixed(1)
                              : prom.leads_count > 0
                                ? ((prom.paid_count / prom.leads_count) * 100).toFixed(1)
                                : "0.0";
                          return (
                            <div
                              key={prom.external_id}
                              className="rounded-xl border border-brand-border/80 bg-white p-3.5 shadow-sm hover:border-brand-blue/50 transition"
                            >
                              <div className="flex items-start justify-between">
                                <div>
                                  <p className="font-bold text-brand-ink text-sm">{prom.name}</p>
                                  <p className="text-xs text-brand-muted">{prom.phone || "Sem telefone"}</p>
                                </div>
                                <span
                                  className={`rounded-full px-2 py-0.5 text-[10px] font-bold ${
                                    prom.status === "active"
                                      ? "bg-emerald-50 text-emerald-700"
                                      : "bg-amber-50 text-amber-700"
                                  }`}
                                >
                                  {prom.status === "active" ? "Ativo" : (prom.status || "Ativo")}
                                </span>
                              </div>

                              <div className="mt-3 grid grid-cols-3 gap-2 border-t border-slate-100 pt-2 text-center text-xs">
                                <div>
                                  <span className="block text-[10px] text-brand-muted">Leads</span>
                                  <span className="font-black text-brand-ink">{prom.leads_count ?? 0}</span>
                                </div>
                                <div>
                                  <span className="block text-[10px] text-brand-muted">Pagos</span>
                                  <span className="font-black text-emerald-600">{prom.paid_count ?? 0}</span>
                                </div>
                                <div>
                                  <span className="block text-[10px] text-brand-muted">Conversão</span>
                                  <span className="font-black text-brand-gold">{promConv}%</span>
                                </div>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

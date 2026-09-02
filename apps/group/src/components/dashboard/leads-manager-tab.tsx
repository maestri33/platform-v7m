"use client";

import { useState } from "react";

import { Card } from "@/components/ui/card";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { ErrorBox } from "@/components/ui/error-box";
import { Spinner, EmptyState } from "@/components/ui/spinner";
import { StatusPill } from "@/components/ui/status-pill";
import { markLeadPaid, type Hub, type LeadRow } from "@/lib/api";

interface LeadsManagerTabProps {
  leads: LeadRow[] | null;
  hubs: Hub[] | null;
  loading: boolean;
  onRefresh: () => void;
}

export function LeadsManagerTab({ leads, hubs, loading, onRefresh }: LeadsManagerTabProps) {
  const [search, setSearch] = useState("");
  const [selectedHub, setSelectedHub] = useState<string>("all");
  const [selectedStatus, setSelectedStatus] = useState<string>("all");
  const [actionSuccess, setActionSuccess] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);
  const [busyId, setBusyId] = useState<string | null>(null);

  const hubMap = new Map((hubs ?? []).map((h) => [h.external_id, h.brand]));

  const filteredLeads = (leads ?? []).filter((lead) => {
    // Filter by hub
    const hId = String(lead.hub_external_id || lead.hub_id || lead.hub || "");
    if (selectedHub !== "all" && hId !== selectedHub) return false;

    // Filter by status
    const status = String(lead.status || "").toLowerCase();
    if (selectedStatus === "paid" && status !== "paid" && status !== "pago") return false;
    if (selectedStatus === "pending" && (status === "paid" || status === "pago")) return false;

    // Filter by search
    if (!search.trim()) return true;
    const q = search.toLowerCase();
    const name = String(lead.name || lead.customer_name || "").toLowerCase();
    const phone = String(lead.phone || "").toLowerCase();
    const cpf = String(lead.cpf || "").toLowerCase();
    const id = String(lead.external_id || "").toLowerCase();
    return name.includes(q) || phone.includes(q) || cpf.includes(q) || id.includes(q);
  });

  const [selectedLeadForConfirm, setSelectedLeadForConfirm] = useState<LeadRow | null>(null);

  async function executeConfirmPaid() {
    if (!selectedLeadForConfirm) return;
    const leadId = String(selectedLeadForConfirm.external_id);
    setBusyId(leadId);
    setActionError(null);
    setActionSuccess(null);
    try {
      await markLeadPaid(leadId);
      setActionSuccess(`Pagamento de ${selectedLeadForConfirm.name || selectedLeadForConfirm.customer_name || "lead"} confirmado com sucesso! Promovido a matrícula.`);
      setSelectedLeadForConfirm(null);
      onRefresh();
    } catch (err: unknown) {
      setActionError(err instanceof Error ? err.message : "Falha ao confirmar pagamento.");
    } finally {
      setBusyId(null);
    }
  }

  const total = leads?.length ?? 0;
  const paidCount = (leads ?? []).filter((l) => {
    const s = String(l.status || "").toLowerCase();
    return s === "paid" || s === "pago";
  }).length;
  const conversionRate = total > 0 ? Math.round((paidCount / total) * 100) : 0;

  return (
    <div className="flex flex-col gap-5">
      {/* Quick KPIs */}
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
        <div className="rounded-2xl border border-brand-border bg-white p-4">
          <span className="text-xs font-bold text-brand-muted">Total de Leads Captados</span>
          <p className="text-2xl font-black text-brand-ink">{total}</p>
        </div>
        <div className="rounded-2xl border border-brand-border bg-white p-4">
          <span className="text-xs font-bold text-brand-muted">Leads Convertidos (Pagos)</span>
          <p className="text-2xl font-black text-brand-green-dark">{paidCount}</p>
        </div>
        <div className="rounded-2xl border border-brand-border bg-white p-4">
          <span className="text-xs font-bold text-brand-muted">Taxa de Conversão Global</span>
          <p className="text-2xl font-black text-brand-blue">{conversionRate}%</p>
        </div>
      </div>

      <Card className="flex flex-col gap-4">
        {/* Header & Filters */}
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between border-b border-brand-border/60 pb-3">
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-base font-extrabold text-brand-ink">Gestão Completa de Leads</h2>
              <span className="rounded-full bg-slate-100 px-2 py-0.5 text-xs font-bold text-brand-muted">
                {filteredLeads.length}
              </span>
            </div>
            <p className="text-xs text-brand-muted">
              Visualize contatos, status do funil, polos de captação e confirme pagamentos manualmente.
            </p>
          </div>
        </div>

        <ErrorBox message={actionError} />
        <ErrorBox message={actionSuccess} success />

        {/* Filter Toolbar */}
        <div className="grid grid-cols-1 gap-2.5 sm:grid-cols-12">
          {/* Search */}
          <div className="sm:col-span-6 relative">
            <input
              type="text"
              placeholder="Buscar por nome, telefone, CPF ou ID..."
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

          {/* Polo Selector */}
          <div className="sm:col-span-3">
            <select
              aria-label="Filtrar por polo"
              value={selectedHub}
              onChange={(e) => setSelectedHub(e.target.value)}
              className="w-full rounded-xl border border-brand-border bg-slate-50 px-3 py-2 text-xs font-bold text-brand-ink focus:border-brand-blue focus:bg-white focus:outline-none"
            >
              <option value="all">Todos os Polos</option>
              {(hubs ?? []).map((h) => (
                <option key={h.external_id} value={h.external_id}>
                  {h.brand}
                </option>
              ))}
            </select>
          </div>

          {/* Status Selector */}
          <div className="sm:col-span-3">
            <select
              aria-label="Filtrar por status"
              value={selectedStatus}
              onChange={(e) => setSelectedStatus(e.target.value)}
              className="w-full rounded-xl border border-brand-border bg-slate-50 px-3 py-2 text-xs font-bold text-brand-ink focus:border-brand-blue focus:bg-white focus:outline-none"
            >
              <option value="all">Todos os Status</option>
              <option value="paid">Somente Pagos</option>
              <option value="pending">Aguardando / Em Aberto</option>
            </select>
          </div>
        </div>

        {/* Leads Table / List */}
        {loading && leads === null ? (
          <div className="flex justify-center py-12">
            <Spinner />
          </div>
        ) : filteredLeads.length === 0 ? (
          <EmptyState label="Nenhum lead encontrado com os filtros selecionados." />
        ) : (
          <div className="grid grid-cols-1 gap-2.5">
            {filteredLeads.map((lead, idx) => {
              const extId = String(lead.external_id || idx);
              const name = String(lead.name || lead.customer_name || "Lead sem identificação");
              const phone = String(lead.phone || "—");
              const rawDigits = phone.replace(/\D/g, "");
              const status = String(lead.status || "novo");
              const isPaid = status.toLowerCase() === "paid" || status.toLowerCase() === "pago";
              const hubId = String(lead.hub_external_id || lead.hub_id || lead.hub || "");
              const hubBrand = hubMap.get(hubId) || "Padrão";

              return (
                <div
                  key={extId}
                  className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-brand-border bg-white p-4 shadow-xs transition hover:border-brand-blue/30"
                >
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="font-extrabold text-brand-ink">{name}</span>
                      <StatusPill status={status} tone={isPaid ? "green" : "amber"} label={status} />
                      <span className="rounded bg-brand-blue-bg px-2 py-0.5 text-[11px] font-extrabold text-brand-blue">
                        {hubBrand}
                      </span>
                    </div>

                    <div className="mt-1 flex flex-wrap items-center gap-x-3 text-xs text-brand-muted">
                      <span>Tel: <strong className="text-brand-ink">{phone}</strong></span>
                      {lead.cpf ? <span>· CPF: <strong className="text-brand-ink">{String(lead.cpf)}</strong></span> : null}
                      <span>· ID: <span className="font-mono">{extId.slice(0, 8)}…</span></span>
                    </div>
                  </div>

                  <div className="flex items-center gap-2">
                    {/* Botão WhatsApp */}
                    {rawDigits && (
                      <a
                        href={`https://wa.me/55${rawDigits.replace(/^55/, "")}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="flex items-center gap-1 rounded-xl border border-emerald-300 bg-emerald-50 px-3 py-1.5 text-xs font-bold text-emerald-800 hover:bg-emerald-100"
                      >
                        <svg className="size-3.5" viewBox="0 0 24 24" fill="currentColor">
                          <path d="M12.04 2c-5.46 0-9.91 4.45-9.91 9.91 0 1.75.46 3.45 1.32 4.95L2.05 22l5.25-1.38c1.45.79 3.08 1.21 4.74 1.21 5.46 0 9.91-4.45 9.91-9.91 0-2.65-1.03-5.14-2.9-7.01A9.816 9.816 0 0 0 12.04 2z" />
                        </svg>
                        <span>WhatsApp</span>
                      </a>
                    )}

                    {/* Botão Confirmar Pagamento */}
                    {!isPaid && (
                      <button
                        type="button"
                        disabled={busyId === extId}
                        onClick={() => setSelectedLeadForConfirm(lead)}
                        className="cursor-pointer rounded-xl bg-brand-green px-3 py-1.5 text-xs font-bold text-white shadow-2xs transition hover:bg-brand-green-dark disabled:opacity-50"
                      >
                        {busyId === extId ? "Confirmando..." : "Confirmar Pago"}
                      </button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}

        <ConfirmDialog
          open={selectedLeadForConfirm !== null}
          title="Confirmar pagamento manual de lead"
          tone="danger"
          confirmLabel="Confirmar pagamento e matricular"
          onCancel={() => setSelectedLeadForConfirm(null)}
          onConfirm={executeConfirmPaid}
          body={
            <>
              Você está prestes a marcar o lead{" "}
              <strong>
                {String(selectedLeadForConfirm?.name || selectedLeadForConfirm?.customer_name || "Lead")}
              </strong>{" "}
              (Tel: {String(selectedLeadForConfirm?.phone || "—")}) como <strong>PAGO</strong>.
              <br />
              <br />
              Esta ação <strong>promove o lead imediatamente para aluno/matrícula ativa</strong> e
              computa a comissão do promotor responsável. É uma ação financeira secundária com impacto operacional.
            </>
          }
        />
      </Card>
    </div>
  );
}

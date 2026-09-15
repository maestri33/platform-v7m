"use client";

import { useEffect, useState } from "react";

import { Button } from "@v7m/ui";
import { Card } from "@v7m/ui";
import { ErrorBox } from "@v7m/ui";
import { Spinner, EmptyState } from "@v7m/ui";
import { StatusPill } from "@v7m/ui";
import {
  getErrorMessage,
  listEnrollments,
  listLeads,
  listStudents,
  markLeadPaid,
  type EnrollmentRow,
  type Hub,
  type LeadRow,
  type Promoter,
  type StudentRow,
} from "@/lib/api";

interface GestorViewDrawerProps {
  hub: Hub | null;
  allHubs: Hub[];
  promoters: Promoter[];
  onClose: () => void;
  onSelectHub: (hub: Hub) => void;
}

type TabKey = "leads" | "enrollments" | "students" | "team" | "external";

export function GestorViewDrawer({
  hub,
  allHubs,
  promoters,
  onClose,
  onSelectHub,
}: GestorViewDrawerProps) {
  const [activeTab, setActiveTab] = useState<TabKey>("leads");
  const [leads, setLeads] = useState<LeadRow[] | null>(null);
  const [enrollments, setEnrollments] = useState<EnrollmentRow[] | null>(null);
  const [students, setStudents] = useState<StudentRow[] | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [actionSuccess, setActionSuccess] = useState<string | null>(null);
  const [filterQuery, setFilterQuery] = useState("");

  useEffect(() => {
    if (!hub) return;
    let cancelled = false;

    Promise.all([
      listLeads({ hub: hub.external_id }).catch(() => []),
      listEnrollments({ hub: hub.external_id }).catch(() => []),
      listStudents({ hub: hub.external_id }).catch(() => []),
    ])
      .then(([l, e, s]) => {
        if (!cancelled) {
          setLeads(l);
          setEnrollments(e);
          setStudents(s);
          setError(null);
        }
      })
      .catch((err: unknown) => {
        if (!cancelled) setError(getErrorMessage(err));
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [hub]);

  const [confirmPayLeadId, setConfirmPayLeadId] = useState<string | null>(null);

  if (!hub) return null;

  const coordinator = promoters.find((p) => p.external_id === hub.coordinator_external_id);
  const coordinatorName = coordinator?.name || "Sem coordenador designado";

  async function handleMarkPaid(leadId: string) {
    if (confirmPayLeadId !== leadId) {
      setConfirmPayLeadId(leadId);
      return;
    }
    setConfirmPayLeadId(null);
    try {
      await markLeadPaid(leadId);
      setActionSuccess("Pagamento confirmado! Lead promovido.");
      // Recarrega dados
      if (hub) {
        const [l, e] = await Promise.all([
          listLeads({ hub: hub.external_id }),
          listEnrollments({ hub: hub.external_id }),
        ]);
        setLeads(l);
        setEnrollments(e);
      }
    } catch (err: unknown) {
      setError(getErrorMessage(err));
    }
  }

  // Filtragem local nas abas
  const filteredLeads = (leads ?? []).filter((item) => {
    if (!filterQuery.trim()) return true;
    const q = filterQuery.toLowerCase();
    const name = String(item.name || item.customer_name || "").toLowerCase();
    const phone = String(item.phone || "").toLowerCase();
    const status = String(item.status || "").toLowerCase();
    return name.includes(q) || phone.includes(q) || status.includes(q);
  });

  const filteredEnrollments = (enrollments ?? []).filter((item) => {
    if (!filterQuery.trim()) return true;
    const q = filterQuery.toLowerCase();
    const name = String(item.student_name || item.name || "").toLowerCase();
    const status = String(item.status || "").toLowerCase();
    return name.includes(q) || status.includes(q);
  });

  const filteredStudents = (students ?? []).filter((item) => {
    if (!filterQuery.trim()) return true;
    const q = filterQuery.toLowerCase();
    const name = String(item.name || item.student_name || "").toLowerCase();
    return name.includes(q);
  });

  return (
    <div
      role="dialog"
      aria-modal="true"
      className="fixed inset-0 z-50 flex items-center justify-end overflow-hidden"
    >
      {/* Backdrop */}
      <div
        onClick={onClose}
        className="fixed inset-0 bg-brand-ink/50 backdrop-blur-xs transition-opacity"
      />

      {/* Side-Drawer Container */}
      <div className="relative z-10 flex h-full w-full max-w-4xl flex-col bg-brand-bg shadow-2xl transition-transform duration-300 sm:rounded-l-3xl">
        {/* Top Gestor Impersonation Banner */}
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-brand-border/80 bg-slate-900 px-5 py-4 text-white sm:rounded-tl-3xl">
          <div className="flex items-center gap-3">
            <div className="flex size-10 items-center justify-center rounded-xl bg-amber-500/20 text-amber-400 ring-1 ring-amber-500/40">
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
                <path d="M16 21v-2a4 4 0 0 0-8 0v2" />
                <circle cx="12" cy="7" r="4" />
              </svg>
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="rounded-md bg-amber-400/20 px-2 py-0.5 text-[11px] font-extrabold uppercase tracking-wider text-amber-300">
                  Visão do Gestor de Polo
                </span>
                {hub.is_default && (
                  <span className="rounded-md bg-brand-green/30 px-1.5 py-0.5 text-[10px] font-bold text-emerald-300">
                    Polo Padrão
                  </span>
                )}
              </div>
              <h2 className="text-lg font-black text-white">
                Polo: <span className="text-amber-300">{hub.brand}</span>
              </h2>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {/* Seletor rápido de polo */}
            <select
              aria-label="Trocar polo no modo gestor"
              value={hub.external_id}
              onChange={(e) => {
                const found = allHubs.find((h) => h.external_id === e.target.value);
                if (found) onSelectHub(found);
              }}
              className="cursor-pointer rounded-xl border border-slate-700 bg-slate-800 px-3 py-1.5 text-xs font-bold text-slate-200 hover:bg-slate-700"
            >
              {allHubs.map((h) => (
                <option key={h.external_id} value={h.external_id}>
                  {h.brand} {h.is_default ? "(Padrão)" : ""}
                </option>
              ))}
            </select>

            <button
              type="button"
              onClick={onClose}
              className="flex cursor-pointer items-center gap-1.5 rounded-xl bg-white/10 px-3 py-1.5 text-xs font-bold text-white hover:bg-white/20"
            >
              <svg className="size-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <line x1="18" y1="6" x2="6" y2="18" />
                <line x1="6" y1="6" x2="18" y2="18" />
              </svg>
              <span>Sair do Modo Gestor</span>
            </button>
          </div>
        </div>

        {/* Gestor Cockpit Stats Quickbar */}
        <div className="grid grid-cols-2 gap-2 border-b border-brand-border bg-white px-5 py-3 sm:grid-cols-4">
          <div className="flex flex-col">
            <span className="text-[11px] font-bold text-brand-muted">Coordenador</span>
            <span className="truncate text-xs font-extrabold text-brand-ink">{coordinatorName}</span>
          </div>
          <div className="flex flex-col">
            <span className="text-[11px] font-bold text-brand-muted">Total de Leads</span>
            <span className="text-xs font-extrabold text-brand-ink">{leads?.length ?? "—"}</span>
          </div>
          <div className="flex flex-col">
            <span className="text-[11px] font-bold text-brand-muted">Matrículas Ativas</span>
            <span className="text-xs font-extrabold text-brand-ink">{enrollments?.length ?? "—"}</span>
          </div>
          <div className="flex flex-col">
            <span className="text-[11px] font-bold text-brand-muted">Alunos Formados</span>
            <span className="text-xs font-extrabold text-brand-ink">{students?.length ?? "—"}</span>
          </div>
        </div>

        {/* Sub-nav Tabs */}
        <div className="flex items-center gap-1 overflow-x-auto border-b border-brand-border bg-slate-50 px-5 py-2">
          <TabButton
            active={activeTab === "leads"}
            onClick={() => setActiveTab("leads")}
            label="Leads do Polo"
            count={leads?.length}
          />
          <TabButton
            active={activeTab === "enrollments"}
            onClick={() => setActiveTab("enrollments")}
            label="Matrículas"
            count={enrollments?.length}
          />
          <TabButton
            active={activeTab === "students"}
            onClick={() => setActiveTab("students")}
            label="Alunos Concluídos"
            count={students?.length}
          />
          <TabButton
            active={activeTab === "team"}
            onClick={() => setActiveTab("team")}
            label="Equipe & Coordenador"
          />
          <TabButton
            active={activeTab === "external"}
            onClick={() => setActiveTab("external")}
            label="Portal Hub"
          />
        </div>

        {/* Search filter within drawer */}
        <div className="border-b border-brand-border/60 bg-white px-5 py-2.5">
          <div className="flex items-center gap-2">
            <div className="relative flex-1">
              <input
                type="text"
                placeholder="Buscar por nome, telefone ou status neste polo..."
                value={filterQuery}
                onChange={(e) => setFilterQuery(e.target.value)}
                className="w-full rounded-xl border border-brand-border bg-slate-50 px-3.5 py-1.5 pl-9 text-xs text-brand-ink focus:border-brand-blue focus:bg-white focus:outline-none"
              />
              <svg
                className="absolute left-3 top-2.5 size-3.5 text-brand-muted"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
              >
                <circle cx="11" cy="11" r="8" />
                <line x1="21" y1="21" x2="16.65" y2="16.65" />
              </svg>
            </div>
            {filterQuery && (
              <button
                type="button"
                onClick={() => setFilterQuery("")}
                className="cursor-pointer text-xs font-bold text-brand-muted hover:text-brand-ink"
              >
                Limpar
              </button>
            )}
          </div>
        </div>

        {/* Content Body */}
        <div className="flex-1 overflow-y-auto p-5">
          <ErrorBox message={error} />
          <ErrorBox message={actionSuccess} success />

          {loading ? (
            <div className="flex min-h-[260px] items-center justify-center">
              <Spinner />
            </div>
          ) : (
            <>
              {/* TAB 1: LEADS */}
              {activeTab === "leads" && (
                <div className="flex flex-col gap-3">
                  <div className="flex items-center justify-between">
                    <h3 className="text-sm font-extrabold text-brand-ink">
                      Leads Captados para este Polo ({filteredLeads.length})
                    </h3>
                  </div>

                  {filteredLeads.length === 0 ? (
                    <EmptyState label="Nenhum lead encontrado para este polo." />
                  ) : (
                    <div className="grid grid-cols-1 gap-2.5">
                      {filteredLeads.map((item, idx) => {
                        const extId = String(item.external_id || idx);
                        const leadStatus = String(item.status || "novo");
                        const name = String(item.name || item.customer_name || "Lead sem nome");
                        const phone = String(item.phone || "—");
                        const isPaid = leadStatus.toLowerCase() === "paid" || leadStatus.toLowerCase() === "pago";

                        return (
                          <div
                            key={extId}
                            className="flex flex-wrap items-center justify-between gap-2 rounded-xl border border-brand-border bg-white p-3.5 shadow-xs transition hover:border-brand-blue/40"
                          >
                            <div className="min-w-0 flex-1">
                              <div className="flex items-center gap-2">
                                <span className="font-extrabold text-brand-ink">{name}</span>
                                <StatusPill
                                  status={leadStatus}
                                  tone={isPaid ? "green" : "amber"}
                                  label={leadStatus}
                                />
                              </div>
                              <p className="mt-0.5 text-xs text-brand-muted">
                                Zap/Tel: <strong className="text-brand-ink">{phone}</strong> · ID:{" "}
                                <span className="font-mono">{extId.slice(0, 8)}…</span>
                              </p>
                            </div>

                            <div className="flex items-center gap-2">
                              {!isPaid && (
                                <button
                                  type="button"
                                  onClick={() => handleMarkPaid(extId)}
                                  className={`cursor-pointer rounded-lg px-2.5 py-1 text-xs font-bold ring-1 transition ${
                                    confirmPayLeadId === extId
                                      ? "bg-red-50 text-red-800 ring-red-300 hover:bg-red-100"
                                      : "bg-emerald-50 text-emerald-800 ring-emerald-200 hover:bg-emerald-100"
                                  }`}
                                >
                                  {confirmPayLeadId === extId ? "Tem certeza? Clique de novo" : "Confirmar Pago"}
                                </button>
                              )}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              )}

              {/* TAB 2: MATRÍCULAS */}
              {activeTab === "enrollments" && (
                <div className="flex flex-col gap-3">
                  <h3 className="text-sm font-extrabold text-brand-ink">
                    Matrículas em Andamento ({filteredEnrollments.length})
                  </h3>

                  {filteredEnrollments.length === 0 ? (
                    <EmptyState label="Nenhuma matrícula registrada neste polo." />
                  ) : (
                    <div className="grid grid-cols-1 gap-2.5">
                      {filteredEnrollments.map((item, idx) => {
                        const extId = String(item.external_id || idx);
                        const status = String(item.status || "ativa");
                        const studentName = String(item.student_name || item.name || "Matrícula");

                        return (
                          <div
                            key={extId}
                            className="flex items-center justify-between rounded-xl border border-brand-border bg-white p-3.5 shadow-xs"
                          >
                            <div>
                              <p className="font-extrabold text-brand-ink">{studentName}</p>
                              <p className="text-xs text-brand-muted font-mono">
                                Matrícula #{extId.slice(0, 8)}
                              </p>
                            </div>
                            <StatusPill status={status} tone="blue" label={status} />
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              )}

              {/* TAB 3: ALUNOS CONCLUÍDOS */}
              {activeTab === "students" && (
                <div className="flex flex-col gap-3">
                  <h3 className="text-sm font-extrabold text-brand-ink">
                    Alunos Vinculados ({filteredStudents.length})
                  </h3>

                  {filteredStudents.length === 0 ? (
                    <EmptyState label="Nenhum aluno concluído cadastrado neste polo." />
                  ) : (
                    <div className="grid grid-cols-1 gap-2.5">
                      {filteredStudents.map((item, idx) => {
                        const extId = String(item.external_id || idx);
                        const studentName = String(item.name || item.student_name || "Aluno");
                        const status = String(item.status || "ativo");

                        return (
                          <div
                            key={extId}
                            className="flex items-center justify-between rounded-xl border border-brand-border bg-white p-3.5 shadow-xs"
                          >
                            <div>
                              <p className="font-extrabold text-brand-ink">{studentName}</p>
                              <p className="text-xs text-brand-muted font-mono">ID: {extId.slice(0, 8)}…</p>
                            </div>
                            <StatusPill status={status} tone="green" label={status} />
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              )}

              {/* TAB 4: EQUIPE & COORDENADOR */}
              {activeTab === "team" && (
                <Card className="flex flex-col gap-4">
                  <div className="border-b border-brand-border/60 pb-3">
                    <h4 className="text-sm font-extrabold text-brand-ink">Coordenador do Polo</h4>
                    <p className="text-xs text-brand-muted">
                      O coordenador é responsável pela gestão e atendimento deste polo.
                    </p>
                  </div>

                  {coordinator ? (
                    <div className="flex items-center justify-between rounded-xl bg-slate-50 p-4">
                      <div>
                        <p className="text-base font-extrabold text-brand-ink">{coordinator.name}</p>
                        <p className="text-xs text-brand-muted font-mono">
                          ID: {coordinator.external_id}
                        </p>
                      </div>
                      <StatusPill status="active" tone="green" label="Coordenador Ativo" />
                    </div>
                  ) : (
                    <div className="rounded-xl border border-dashed border-amber-300 bg-amber-50 p-4 text-center">
                      <p className="text-xs font-bold text-amber-900">
                        Este polo não possui um coordenador designado no momento.
                      </p>
                    </div>
                  )}

                  <div className="mt-2">
                    <h4 className="text-sm font-extrabold text-brand-ink">Promotores Aptos</h4>
                    <p className="text-xs text-brand-muted">
                      Total de {promoters.length} promotores registrados na base.
                    </p>
                  </div>
                </Card>
              )}

              {/* TAB 5: PORTAL HUB (EXTERNAL) */}
              {activeTab === "external" && (
                <Card className="flex flex-col gap-4">
                  <div>
                    <h4 className="text-sm font-extrabold text-brand-ink">Acesso Direto ao Portal do Hub</h4>
                    <p className="text-xs text-brand-muted">
                      Para entrar no frontend dedicado de gestão de polo (`hub-v7m`), use o portal de liderança.
                    </p>
                  </div>

                  <div className="rounded-xl border border-brand-border bg-slate-50 p-4 text-xs">
                    <p className="font-bold text-brand-ink">Instruções para Login como Gestor:</p>
                    <ol className="mt-2 list-inside list-decimal space-y-1 text-brand-muted">
                      <li>Acesse o portal do Hub (`https://hub.maestri.group` ou `http://localhost:3002`).</li>
                      <li>Informe o telefone do coordenador (<strong className="text-brand-ink">{coordinatorName}</strong>).</li>
                      <li>O OTP de autenticação será disparado para o WhatsApp do coordenador.</li>
                    </ol>
                  </div>

                  <div className="flex gap-2">
                    <Button
                      as="a"
                      href="https://hub.maestri.group"
                      target="_blank"
                      rel="noopener noreferrer"
                      className="bg-brand-blue"
                    >
                      Abrir Portal do Hub em Nova Aba
                    </Button>
                  </div>
                </Card>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
}

function TabButton({
  active,
  onClick,
  label,
  count,
}: {
  active: boolean;
  onClick: () => void;
  label: string;
  count?: number;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`flex cursor-pointer items-center gap-1.5 whitespace-nowrap rounded-xl px-3.5 py-1.5 text-xs font-bold transition ${
        active
          ? "bg-brand-blue text-white shadow-xs"
          : "text-brand-muted hover:bg-white hover:text-brand-ink"
      }`}
    >
      <span>{label}</span>
      {typeof count === "number" && (
        <span
          className={`rounded-full px-1.5 py-0.2 text-[10px] font-black ${
            active ? "bg-white/20 text-white" : "bg-slate-200 text-brand-ink"
          }`}
        >
          {count}
        </span>
      )}
    </button>
  );
}

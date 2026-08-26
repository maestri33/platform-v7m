"use client";

import { useEffect, useState } from "react";
import Link from "next/link";

import { Card } from "@/components/ui/card";
import { ErrorBox } from "@/components/ui/error-box";
import { Spinner } from "@/components/ui/spinner";
import { CoordinatorsManagerTab } from "@/components/dashboard/coordinators-manager-tab";
import { CreatePoloModal } from "@/components/dashboard/create-polo-modal";
import { DashboardHeader } from "@/components/dashboard/dashboard-header";
import { GestorViewDrawer } from "@/components/dashboard/gestor-view-drawer";
import { KpiGrid } from "@/components/dashboard/kpi-grid";
import { LeadsManagerTab } from "@/components/dashboard/leads-manager-tab";
import { NotificationsEditorTab } from "@/components/dashboard/notifications-editor-tab";
import { PoloStatsBreakdown } from "@/components/dashboard/polo-stats-breakdown";
import { PolosOverviewCard } from "@/components/dashboard/polos-overview-card";
import { PromotersManagerTab } from "@/components/dashboard/promoters-manager-tab";
import { StudentsManagerTab } from "@/components/dashboard/students-manager-tab";
import {
  getClosingHealth,
  getErrorMessage,
  getFinanceBalance,
  getFinanceSummary,
  getSystemStatus,
  listCoordinators,
  listEnrollments,
  listHubs,
  listIntegrations,
  listLeads,
  listPromoters,
  listStudents,
  type ClosingHealth,
  type Coordinator,
  type EnrollmentRow,
  type FinanceBalance,
  type FinanceSummary,
  type Hub,
  type Integration,
  type LeadRow,
  type Promoter,
  type StudentRow,
  type SystemStatus,
} from "@/lib/api";
import { formatBRL } from "@/lib/money";

type MainTab = "overview" | "leads" | "students" | "promoters" | "coordinators" | "notifications";

export default function DashboardPage() {
  const [activeTab, setActiveTab] = useState<MainTab>("overview");

  // Data states
  const [hubs, setHubs] = useState<Hub[] | null>(null);
  const [promoters, setPromoters] = useState<Promoter[]>([]);
  const [coordinators, setCoordinators] = useState<Coordinator[]>([]);
  const [leads, setLeads] = useState<LeadRow[] | null>(null);
  const [enrollments, setEnrollments] = useState<EnrollmentRow[] | null>(null);
  const [students, setStudents] = useState<StudentRow[] | null>(null);
  const [closing, setClosing] = useState<ClosingHealth | null>(null);
  const [balance, setBalance] = useState<FinanceBalance | null>(null);
  const [system, setSystem] = useState<SystemStatus | null>(null);
  const [integrations, setIntegrations] = useState<Integration[] | null>(null);
  const [summary, setSummary] = useState<FinanceSummary | null>(null);


  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Modais e gavetas
  const [createModalOpen, setCreateModalOpen] = useState(false);
  const [impersonateHub, setImpersonateHub] = useState<Hub | null>(null);

  async function loadData(isRefresh = false) {
    if (isRefresh) setRefreshing(true);
    else setLoading(true);
    setError(null);

    try {
      const [
        hubsData,
        promotersData,
        coordinatorsData,
        leadsData,
        enrollmentsData,
        studentsData,
        closingData,
        balanceData,
        systemData,
        integrationsData,
        summaryData,
      ] = await Promise.all([
        listHubs().catch(() => []),
        listPromoters().catch(() => []),
        listCoordinators().catch(() => []),
        listLeads().catch(() => []),
        listEnrollments().catch(() => []),
        listStudents().catch(() => []),
        getClosingHealth().catch(() => null),
        getFinanceBalance().catch(() => null),
        getSystemStatus().catch(() => null),
        listIntegrations().catch(() => []),
        getFinanceSummary().catch(() => null),
      ]);

      setHubs(hubsData);
      setPromoters(promotersData);
      setCoordinators(coordinatorsData);
      setLeads(leadsData);
      setEnrollments(enrollmentsData);
      setStudents(studentsData);
      setClosing(closingData);
      setBalance(balanceData);
      setSystem(systemData);
      setIntegrations(integrationsData);
      setSummary(summaryData);
    } catch (err: unknown) {
      setError(getErrorMessage(err));
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }

  useEffect(() => {
    loadData();
  }, []);

  return (
    <div className="flex flex-col gap-6">
      {/* Header com ações rápidas */}
      <DashboardHeader
        onRefresh={() => loadData(true)}
        onOpenCreatePolo={() => setCreateModalOpen(true)}
        onOpenGestorMode={() => {
          if (hubs && hubs.length > 0) {
            setImpersonateHub(hubs.find((h) => h.is_default) || hubs[0]);
          } else {
            setCreateModalOpen(true);
          }
        }}
        refreshing={refreshing}
      />

      <ErrorBox message={error} />

      {/* Main Navigation Tabs */}
      <div className="flex items-center gap-1 overflow-x-auto rounded-2xl border border-brand-border bg-white p-1.5 shadow-2xs">
        <NavTabItem
          active={activeTab === "overview"}
          onClick={() => setActiveTab("overview")}
          label="Visão Geral & Polos"
          icon="M3 12l9-9 9 9M5 10v10h14V10"
          badge={hubs?.length}
        />
        <NavTabItem
          active={activeTab === "leads"}
          onClick={() => setActiveTab("leads")}
          label="Todos os Leads"
          icon="M3 5h18M3 12h18M3 19h12"
          badge={leads?.length}
        />
        <NavTabItem
          active={activeTab === "students"}
          onClick={() => setActiveTab("students")}
          label="Alunos & Matrículas"
          icon="M22 10L12 5 2 10l10 5 10-5z M6 12v5c0 1 3 2 6 2s6-1 6-2v-5"
          badge={(students?.length ?? 0) + (enrollments?.length ?? 0)}
        />
        <NavTabItem
          active={activeTab === "promoters"}
          onClick={() => setActiveTab("promoters")}
          label="Promotores & Equipe"
          icon="M16 21v-2a4 4 0 0 0-8 0v2 M12 7a4 4 0 1 0 0 0.01"
          badge={promoters.length}
        />
        <NavTabItem
          active={activeTab === "coordinators"}
          onClick={() => setActiveTab("coordinators")}
          label="Coordenadores"
          icon="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2 M9 7a4 4 0 1 0 0-8 4 4 0 0 0 0 8z M23 21v-2a4 4 0 0 0-3-3.87 M16 3.13a4 4 0 0 1 0 7.75"
          badge={coordinators.length}
        />
        <NavTabItem
          active={activeTab === "notifications"}
          onClick={() => setActiveTab("notifications")}
          label="Mensagens & Notificações"
          icon="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9"
        />
      </div>


      {/* ── TAB 1: VISÃO GERAL & POLOS ── */}
      {activeTab === "overview" && (
        <>
          {/* Grid de KPIs consolidados */}
          <KpiGrid
            hubs={hubs}
            leadsCount={leads?.length ?? null}
            enrollmentsCount={enrollments?.length ?? null}
            studentsCount={students?.length ?? null}
            closing={closing}
            balance={balance}
            system={system}
            loading={loading}
            onOpenCreatePolo={() => setCreateModalOpen(true)}
          />

          {/* Componente Principal de Polos */}
          <PolosOverviewCard
            hubs={hubs}
            promoters={promoters}
            loading={loading}
            onRefresh={() => loadData(true)}
            onOpenCreateModal={() => setCreateModalOpen(true)}
            onImpersonateGestor={(hub) => setImpersonateHub(hub)}
          />

          {/* Distribuição e Análise dos Polos */}
          <PoloStatsBreakdown hubs={hubs} leads={leads} />

          {/* Resumo Financeiro & Integrações */}
          <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
            {/* Resumo Financeiro */}
            <Card className="lg:col-span-2 flex flex-col gap-3">
              <div className="flex items-center justify-between border-b border-brand-border/60 pb-3">
                <div>
                  <h2 className="text-base font-extrabold text-brand-ink">Resumo Financeiro</h2>
                  <p className="text-xs text-brand-muted">
                    Consolidado de faturamento, obrigações e comissões.
                  </p>
                </div>
                <Link
                  href="/financeiro"
                  className="text-xs font-bold text-brand-blue hover:underline"
                >
                  Abrir Financeiro &rarr;
                </Link>
              </div>

              {loading && !summary ? (
                <div className="flex justify-center py-6">
                  <Spinner />
                </div>
              ) : summary ? (
                <SummaryBreakdown data={summary} />
              ) : (
                <p className="text-xs text-brand-muted">Sem dados de resumo financeiro disponíveis.</p>
              )}
            </Card>

            {/* Integrações */}
            <Card className="flex flex-col gap-3">
              <div className="flex items-center justify-between border-b border-brand-border/60 pb-3">
                <div>
                  <h2 className="text-base font-extrabold text-brand-ink">Integrações Ativas</h2>
                  <p className="text-xs text-brand-muted">Gateways e serviços conectados.</p>
                </div>
                <Link
                  href="/integracoes"
                  className="text-xs font-bold text-brand-blue hover:underline"
                >
                  Ver todas &rarr;
                </Link>
              </div>

              {loading && !integrations ? (
                <div className="flex justify-center py-6">
                  <Spinner />
                </div>
              ) : (
                <div className="flex flex-col gap-2">
                  {(integrations ?? []).slice(0, 5).map((item, idx) => {
                    const name = typeof item.name === "string" ? item.name : `Serviço ${idx + 1}`;
                    return (
                      <div
                        key={name}
                        className="flex items-center justify-between rounded-xl bg-slate-50 p-2.5 text-xs"
                      >
                        <span className="font-bold capitalize text-brand-ink">{name}</span>
                        <span className="flex items-center gap-1 font-semibold text-brand-green-dark">
                          <span className="size-1.5 rounded-full bg-brand-green" />
                          Conectado
                        </span>
                      </div>
                    );
                  })}
                </div>
              )}
            </Card>
          </div>
        </>
      )}

      {/* ── TAB 2: TODOS OS LEADS ── */}
      {activeTab === "leads" && (
        <LeadsManagerTab
          leads={leads}
          hubs={hubs}
          loading={loading}
          onRefresh={() => loadData(true)}
        />
      )}

      {/* ── TAB 3: ALUNOS & MATRÍCULAS ── */}
      {activeTab === "students" && (
        <StudentsManagerTab
          students={students}
          enrollments={enrollments}
          hubs={hubs}
          loading={loading}
          onRefresh={() => loadData(true)}
        />
      )}

      {/* ── TAB 4: PROMOTORES & EQUIPE ── */}
      {activeTab === "promoters" && (
        <PromotersManagerTab
          promoters={promoters}
          hubs={hubs}
          loading={loading}
          onRefresh={() => loadData(true)}
        />
      )}

      {/* ── TAB 5: COORDENADORES & LIDERANÇAS ── */}
      {activeTab === "coordinators" && (
        <CoordinatorsManagerTab
          coordinators={coordinators}
          loading={loading}
          onRefresh={() => loadData(true)}
        />
      )}

      {/* ── TAB 6: MENSAGENS & NOTIFICAÇÕES (EDITOR) ── */}
      {activeTab === "notifications" && <NotificationsEditorTab />}


      {/* Modal de Criação de Polo */}
      <CreatePoloModal
        open={createModalOpen}
        onClose={() => setCreateModalOpen(false)}
        promoters={promoters}
        onCreated={() => loadData(true)}
      />

      {/* Drawer do Modo "Entrar como Gestor" */}
      <GestorViewDrawer
        hub={impersonateHub}
        allHubs={hubs ?? []}
        promoters={promoters}
        onClose={() => setImpersonateHub(null)}
        onSelectHub={(hub) => setImpersonateHub(hub)}
      />
    </div>
  );
}

function NavTabItem({
  active,
  onClick,
  label,
  icon,
  badge,
}: {
  active: boolean;
  onClick: () => void;
  label: string;
  icon: string;
  badge?: number;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`flex cursor-pointer items-center gap-2 whitespace-nowrap rounded-xl px-4 py-2.5 text-xs font-bold transition ${
        active
          ? "bg-brand-blue text-white shadow-xs"
          : "text-brand-muted hover:bg-slate-50 hover:text-brand-ink"
      }`}
    >
      <svg
        className="size-4 shrink-0"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
        aria-hidden="true"
      >
        <path d={icon} />
      </svg>
      <span>{label}</span>
      {typeof badge === "number" && (
        <span
          className={`rounded-full px-1.5 py-0.2 text-[10px] font-black ${
            active ? "bg-white/20 text-white" : "bg-slate-200 text-brand-ink"
          }`}
        >
          {badge}
        </span>
      )}
    </button>
  );
}

function asNumber(v: unknown): number | null {
  if (typeof v === "number" && Number.isFinite(v)) return v;
  if (typeof v === "string" && v.trim() !== "" && Number.isFinite(Number(v))) return Number(v);
  return null;
}

function prettify(key: string): string {
  return key.replace(/_/g, " ").replace(/^\w/, (c) => c.toUpperCase());
}

function SummaryBreakdown({ data }: { data: FinanceSummary }) {
  const entries = Object.entries(data ?? {});
  if (entries.length === 0) {
    return <p className="text-xs text-brand-muted">Sem dados de resumo no momento.</p>;
  }
  return (
    <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
      {entries.map(([group, value]) => (
        <div key={group} className="rounded-xl border border-brand-border bg-slate-50/60 p-3">
          <p className="mb-1.5 text-[11px] font-extrabold uppercase tracking-wide text-brand-muted">
            {prettify(group)}
          </p>
          <SummaryValue value={value} />
        </div>
      ))}
    </div>
  );
}

function SummaryValue({ value }: { value: unknown }) {
  if (value && typeof value === "object" && !Array.isArray(value)) {
    const rows = Object.entries(value as Record<string, unknown>);
    return (
      <dl className="flex flex-col gap-1">
        {rows.map(([k, v]) => {
          const n = asNumber(v);
          const looksMoney = /total|valor|amount|reais|brl/i.test(k);
          return (
            <div key={k} className="flex items-center justify-between gap-2 text-xs">
              <dt className="text-brand-muted">{prettify(k)}</dt>
              <dd className="font-bold text-brand-ink">
                {n != null && looksMoney ? formatBRL(n) : String(v ?? "—")}
              </dd>
            </div>
          );
        })}
      </dl>
    );
  }
  const n = asNumber(value);
  return <p className="text-lg font-black text-brand-ink">{n != null ? n : String(value ?? "—")}</p>;
}

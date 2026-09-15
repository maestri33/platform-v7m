"use client";

import { Card } from "@v7m/ui";
import { Spinner } from "@v7m/ui";
import { StatusPill } from "@v7m/ui";
import { formatBRL } from "@/lib/money";
import type { ClosingHealth, FinanceBalance, Hub, SystemStatus } from "@/lib/api";

interface KpiGridProps {
  hubs: Hub[] | null;
  leadsCount: number | null;
  enrollmentsCount: number | null;
  studentsCount: number | null;
  closing: ClosingHealth | null;
  balance: FinanceBalance | null;
  system: SystemStatus | null;
  loading: boolean;
  onOpenCreatePolo?: () => void;
}

export function KpiGrid({
  hubs,
  leadsCount,
  enrollmentsCount,
  studentsCount,
  closing,
  balance,
  system,
  loading,
  onOpenCreatePolo,
}: KpiGridProps) {
  const totalHubs = hubs?.length ?? 0;
  const hubsWithCoordinator = hubs?.filter((h) => !!h.coordinator_external_id).length ?? 0;
  const defaultHub = hubs?.find((h) => h.is_default);

  const balanceNumber =
    typeof balance?.balance === "number"
      ? balance.balance
      : typeof balance?.balance === "string" && !isNaN(Number(balance.balance))
      ? Number(balance.balance)
      : null;

  return (
    <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
      {/* KPI 1: Polos Operacionais */}
      <Card className="flex flex-col justify-between p-4 transition hover:shadow-md">
        <div className="flex items-start justify-between gap-2">
          <div>
            <p className="text-[12px] font-extrabold uppercase tracking-wide text-brand-muted">
              Polos de Atendimento
            </p>
            <div className="mt-1 flex items-baseline gap-2">
              {loading && hubs === null ? (
                <Spinner />
              ) : (
                <span className="text-2xl font-black text-brand-ink">{totalHubs}</span>
              )}
              <span className="text-xs font-semibold text-brand-muted">
                {hubsWithCoordinator} com coordenador
              </span>
            </div>
          </div>
          <div className="flex size-9 shrink-0 items-center justify-center rounded-xl bg-brand-blue-bg text-brand-blue">
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
        </div>

        <div className="mt-3 flex items-center justify-between border-t border-brand-border/60 pt-2 text-[12px]">
          <span className="truncate text-brand-muted">
            Padrão: <strong className="text-brand-ink">{defaultHub ? defaultHub.brand : "Nenhum"}</strong>
          </span>
          {onOpenCreatePolo && (
            <button
              type="button"
              onClick={onOpenCreatePolo}
              className="cursor-pointer font-bold text-brand-blue hover:underline"
            >
              + Novo
            </button>
          )}
        </div>
      </Card>

      {/* KPI 2: Leads & Funil */}
      <Card className="flex flex-col justify-between p-4 transition hover:shadow-md">
        <div className="flex items-start justify-between gap-2">
          <div>
            <p className="text-[12px] font-extrabold uppercase tracking-wide text-brand-muted">
              Leads em Captação
            </p>
            <div className="mt-1 flex items-baseline gap-2">
              {loading && leadsCount === null ? (
                <Spinner />
              ) : (
                <span className="text-2xl font-black text-brand-ink">{leadsCount ?? "—"}</span>
              )}
              <span className="text-xs font-semibold text-brand-muted">no funil geral</span>
            </div>
          </div>
          <div className="flex size-9 shrink-0 items-center justify-center rounded-xl bg-brand-green-bg text-brand-green-dark">
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
              <path d="M3 5h18M3 12h18M3 19h12" />
            </svg>
          </div>
        </div>

        <div className="mt-3 flex items-center justify-between border-t border-brand-border/60 pt-2 text-[12px]">
          <span className="text-brand-muted">Matrículas / Concluídos:</span>
          <span className="font-bold text-brand-ink">
            {enrollmentsCount ?? "—"} / {studentsCount ?? "—"}
          </span>
        </div>
      </Card>

      {/* KPI 3: Saldo Asaas & Fechamento */}
      <Card className="flex flex-col justify-between p-4 transition hover:shadow-md">
        <div className="flex items-start justify-between gap-2">
          <div>
            <p className="text-[12px] font-extrabold uppercase tracking-wide text-brand-muted">
              Saldo & Fechamento
            </p>
            <div className="mt-1 flex items-baseline gap-2">
              {loading && !balance ? (
                <Spinner />
              ) : (
                <span className="text-2xl font-black text-brand-ink">
                  {balanceNumber !== null ? formatBRL(balanceNumber) : "Indisponível"}
                </span>
              )}
            </div>
          </div>
          <div className="flex size-9 shrink-0 items-center justify-center rounded-xl bg-emerald-50 text-emerald-700">
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
              <line x1="12" y1="1" x2="12" y2="23" />
              <path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6" />
            </svg>
          </div>
        </div>

        <div className="mt-3 flex items-center justify-between border-t border-brand-border/60 pt-2 text-[12px]">
          <span className="text-brand-muted">Saúde fechamento:</span>
          {closing ? (
            <span
              className={`font-bold ${
                closing.suficiente === true
                  ? "text-brand-green-dark"
                  : closing.suficiente === false
                  ? "text-brand-danger"
                  : "text-brand-muted"
              }`}
            >
              {closing.suficiente === true ? "Saldo Cobre" : closing.suficiente === false ? "Déficit" : "Indefinido"}
            </span>
          ) : (
            <span className="text-brand-muted">—</span>
          )}
        </div>
      </Card>

      {/* KPI 4: Servidor & Operação */}
      <Card className="flex flex-col justify-between p-4 transition hover:shadow-md">
        <div className="flex items-start justify-between gap-2">
          <div>
            <p className="text-[12px] font-extrabold uppercase tracking-wide text-brand-muted">
              Estado do Servidor
            </p>
            <div className="mt-1 flex items-baseline gap-2">
              {loading && !system ? (
                <Spinner />
              ) : (
                <div className="flex items-center gap-1.5">
                  <span className="text-2xl font-black text-brand-ink">
                    {system?.db_ok ? "Online" : "Instável"}
                  </span>
                  <span
                    className={`size-2.5 rounded-full ${
                      system?.db_ok ? "bg-brand-green" : "bg-brand-danger"
                    }`}
                  />
                </div>
              )}
            </div>
          </div>
          <div className="flex size-9 shrink-0 items-center justify-center rounded-xl bg-slate-100 text-slate-700">
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
              <rect x="2" y="2" width="20" height="8" rx="2" ry="2" />
              <rect x="2" y="14" width="20" height="8" rx="2" ry="2" />
              <line x1="6" y1="6" x2="6.01" y2="6" />
              <line x1="6" y1="18" x2="6.01" y2="18" />
            </svg>
          </div>
        </div>

        <div className="mt-3 flex items-center justify-between border-t border-brand-border/60 pt-2 text-[12px]">
          <span className="text-brand-muted">Fila qcluster:</span>
          <StatusPill
            status={system?.qcluster_alive ? "active" : "offline"}
            tone={system?.qcluster_alive ? "green" : "danger"}
            label={system?.qcluster_alive ? "Ativa" : "Parada"}
          />
        </div>
      </Card>
    </div>
  );
}

"use client";

import { Button } from "@/components/ui/button";
import { VersionBadge } from "@v7m/ui";

interface DashboardHeaderProps {
  onRefresh: () => void;
  onOpenCreatePolo: () => void;
  onOpenGestorMode: () => void;
  refreshing: boolean;
}

export function DashboardHeader({
  onRefresh,
  onOpenCreatePolo,
  onOpenGestorMode,
  refreshing,
}: DashboardHeaderProps) {
  return (
    <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
      <div>
        <div className="flex items-center gap-2">
          <h1 className="text-2xl font-black tracking-tight text-brand-ink">
            Cockpit do Administrador
          </h1>
          <span className="rounded-md bg-brand-blue-bg px-2 py-0.5 text-xs font-extrabold text-brand-blue">
            Master Staff
          </span>
          <VersionBadge />
        </div>
        <p className="mt-0.5 text-xs text-brand-muted">
          Visão consolidada de polos, saúde do fechamento financeiro, captação e serviços.
        </p>
      </div>

      <div className="flex flex-wrap items-center gap-2">
        <button
          type="button"
          onClick={onRefresh}
          disabled={refreshing}
          className="flex cursor-pointer items-center gap-1.5 rounded-xl border border-brand-border bg-white px-3.5 py-2 text-xs font-bold text-brand-ink shadow-2xs transition hover:bg-slate-50 disabled:opacity-60"
        >
          <svg
            className={`size-4 ${refreshing ? "animate-spin text-brand-blue" : "text-brand-muted"}`}
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
          >
            <path d="M21.5 2v6h-6M21.34 15.57a10 10 0 1 1-.57-8.38l5.67-5.67" />
          </svg>
          <span>{refreshing ? "Atualizando..." : "Atualizar"}</span>
        </button>

        <button
          type="button"
          onClick={onOpenGestorMode}
          className="flex cursor-pointer items-center gap-1.5 rounded-xl bg-amber-500/10 px-3.5 py-2 text-xs font-black text-amber-900 ring-1 ring-amber-500/30 transition hover:bg-amber-500 hover:text-white"
        >
          <svg className="size-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M15 3h4a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2h-4" />
            <polyline points="10 17 15 12 10 7" />
            <line x1="15" y1="12" x2="3" y2="12" />
          </svg>
          <span>Visão de Gestor</span>
        </button>

        <Button
          type="button"
          onClick={onOpenCreatePolo}
          className="bg-brand-green hover:bg-brand-green-dark"
        >
          <svg className="mr-1.5 size-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <line x1="12" y1="5" x2="12" y2="19" />
            <line x1="5" y1="12" x2="19" y2="12" />
          </svg>
          <span>Novo Polo</span>
        </Button>
      </div>
    </div>
  );
}

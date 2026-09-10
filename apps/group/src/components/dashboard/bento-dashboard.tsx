"use client";

import * as React from "react";
import Link from "next/link";
import { VersionBadge } from "@v7m/ui";
import { UserAvatar } from "@v7m/ui";
import { Spinner } from "@v7m/ui";
import { StatusPill } from "@v7m/ui";
import { formatBRL } from "@/lib/money";
import type { ClosingHealth, Coordinator, FinanceBalance, FinanceSummary, Hub, Integration, LeadRow, Promoter, StudentRow, SystemStatus } from "@/lib/api";
import type { UserProfile } from "@/lib/auth-context";
import {
  TrendingUp,
  Users,
  Building2,
  Wallet,
  Activity,
  ArrowUpRight,
  Sparkles,
  Zap,
  CheckCircle2,
  RefreshCw,
  Plus,
  Compass,
  FileCheck,
  GraduationCap,
  Network
} from "lucide-react";

interface BentoDashboardProps {
  user: UserProfile | null;
  hubs: Hub[] | null;
  promoters: Promoter[];
  coordinators: Coordinator[];
  leads: LeadRow[] | null;
  enrollmentsCount: number | null;
  students: StudentRow[] | null;
  closing: ClosingHealth | null;
  balance: FinanceBalance | null;
  system: SystemStatus | null;
  integrations: Integration[] | null;
  summary: FinanceSummary | null;
  loading: boolean;
  refreshing: boolean;
  onRefresh: () => void;
  onOpenCreatePolo: () => void;
  onOpenGestorMode: () => void;
}

export function BentoDashboard({
  user,
  hubs,
  promoters,
  coordinators,
  leads,
  enrollmentsCount,
  students,
  closing,
  balance,
  system,
  integrations,
  loading,
  refreshing,
  onRefresh,
  onOpenCreatePolo,
  onOpenGestorMode,
}: BentoDashboardProps) {
  const totalHubs = hubs?.length ?? 0;
  const hubsWithCoordinator = hubs?.filter((h) => !!h.coordinator_external_id).length ?? 0;
  const defaultHub = hubs?.find((h) => h.is_default);

  const leadsCount = leads?.length ?? 0;
  const studentsCount = students?.length ?? 0;
  const enrollCount = enrollmentsCount ?? 0;
  const conversionRate = leadsCount > 0 ? Math.round((enrollCount / leadsCount) * 100) : 0;

  const balanceNumber =
    typeof balance?.balance === "number"
      ? balance.balance
      : typeof balance?.balance === "string" && !isNaN(Number(balance.balance))
      ? Number(balance.balance)
      : null;

  const greeting = React.useMemo(() => {
    const hour = new Date().getHours();
    if (hour < 12) return "Bom dia";
    if (hour < 18) return "Boa tarde";
    return "Boa noite";
  }, []);

  const firstName = user?.name ? user.name.split(" ")[0] : "Gestor";

  return (
    <div className="space-y-4">
      {/* ── BENTO GRID CONTAINER ── */}
      <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
        
        {/* ── CARD 1: HERO & GREETING (Span 2 cols on lg) ── */}
        <div className="group relative overflow-hidden rounded-3xl border border-brand-border/80 bg-gradient-to-br from-slate-900 via-brand-ink to-slate-950 p-6 text-white shadow-xl lg:col-span-2">
          {/* Decorative ambient lighting */}
          <div className="pointer-events-none absolute -right-16 -top-16 size-64 rounded-full bg-brand-blue/20 blur-3xl transition-all duration-700 group-hover:bg-brand-blue/30" />
          <div className="pointer-events-none absolute -bottom-16 -left-16 size-64 rounded-full bg-emerald-500/15 blur-3xl transition-all duration-700 group-hover:bg-emerald-500/25" />

          <div className="relative z-10 flex flex-col justify-between h-full gap-6">
            {/* Top header row */}
            <div className="flex items-start justify-between gap-4">
              <div className="flex items-center gap-3.5">
                <UserAvatar
                  name={user?.name}
                  photoUrl={user?.photo_url || user?.avatar_url}
                  size="lg"
                  showStatus
                  status="online"
                  className="ring-2 ring-white/20 shadow-md"
                />
                <div>
                  <div className="flex items-center gap-2">
                    <h1 className="text-xl sm:text-2xl font-black tracking-tight text-white">
                      Cockpit do Administrador
                    </h1>
                    <span className="inline-flex items-center rounded-full bg-brand-green/20 px-2 py-0.5 text-[11px] font-bold text-brand-green-light border border-brand-green/30">
                      <Sparkles className="mr-1 size-3" /> Online
                    </span>
                  </div>
                  <p className="text-xs text-slate-300 font-medium mt-0.5">
                    {greeting}, <strong className="text-white">{firstName}</strong> — Gestão Estratégica V7M
                  </p>
                </div>
              </div>

              <div className="hidden sm:flex items-center gap-2">
                <VersionBadge />
              </div>
            </div>

            {/* Middle metrics preview */}
            <div className="grid grid-cols-3 gap-3 rounded-2xl bg-white/5 p-3.5 backdrop-blur-md border border-white/10">
              <div className="text-center sm:text-left">
                <span className="text-[11px] font-semibold text-slate-400 block">Polos Ativos</span>
                <span className="text-lg font-black text-white">{totalHubs}</span>
              </div>
              <div className="text-center sm:text-left border-x border-white/10 px-2">
                <span className="text-[11px] font-semibold text-slate-400 block">Promotores</span>
                <span className="text-lg font-black text-emerald-400">{promoters.length}</span>
              </div>
              <div className="text-center sm:text-left">
                <span className="text-[11px] font-semibold text-slate-400 block">Coordenadores</span>
                <span className="text-lg font-black text-amber-400">{coordinators.length}</span>
              </div>
            </div>

            {/* Quick Action Buttons */}
            <div className="flex flex-wrap items-center gap-2.5 pt-1">
              <button
                type="button"
                onClick={onRefresh}
                disabled={refreshing}
                className="inline-flex cursor-pointer items-center gap-1.5 rounded-xl bg-white/10 px-3.5 py-2 text-xs font-bold text-white backdrop-blur-md transition hover:bg-white/20 disabled:opacity-60"
              >
                <RefreshCw className={`size-3.5 ${refreshing ? "animate-spin text-brand-blue-bright" : ""}`} />
                <span>{refreshing ? "Atualizando..." : "Sincronizar"}</span>
              </button>

              <button
                type="button"
                onClick={onOpenGestorMode}
                className="inline-flex cursor-pointer items-center gap-1.5 rounded-xl bg-amber-500/20 px-3.5 py-2 text-xs font-bold text-amber-200 border border-amber-500/30 transition hover:bg-amber-500 hover:text-white"
              >
                <Compass className="size-3.5" />
                <span>Visão de Gestor</span>
              </button>

              <button
                type="button"
                onClick={onOpenCreatePolo}
                className="inline-flex cursor-pointer items-center gap-1.5 rounded-xl bg-brand-green px-4 py-2 text-xs font-bold text-white shadow-lg shadow-brand-green/30 transition hover:bg-brand-green-dark ml-auto"
              >
                <Plus className="size-4" />
                <span>Novo Polo</span>
              </button>
            </div>
          </div>
        </div>

        {/* ── CARD 2: FINANCIAL HEALTH & SALDO ASAAS ── */}
        <div className="group relative flex flex-col justify-between overflow-hidden rounded-3xl border border-brand-border bg-white p-5 shadow-sm transition duration-300 hover:shadow-md hover:border-brand-blue/40">
          <div className="flex items-start justify-between">
            <div className="space-y-1">
              <div className="flex items-center gap-1.5">
                <span className="size-2 rounded-full bg-emerald-500" />
                <h2 className="text-[11px] font-extrabold uppercase tracking-wider text-brand-muted">
                  Saldo & Fechamento
                </h2>
              </div>
              <div className="text-2xl font-black text-brand-ink">
                {loading && !balance ? (
                  <Spinner />
                ) : balanceNumber !== null ? (
                  formatBRL(balanceNumber)
                ) : (
                  "Indisponível"
                )}
              </div>
            </div>
            <div className="flex size-10 items-center justify-center rounded-2xl bg-emerald-50 text-emerald-600 border border-emerald-100 group-hover:scale-105 transition">
              <Wallet className="size-5" />
            </div>
          </div>

          {/* Sparkline & Fechamento */}
          <div className="my-3 space-y-2">
            <div className="flex items-center justify-between text-xs">
              <span className="text-brand-muted font-medium">Saúde Fechamento:</span>
              {closing ? (
                <span
                  className={`font-bold flex items-center gap-1 ${
                    closing.suficiente === true
                      ? "text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-200"
                      : "text-rose-700 bg-rose-50 px-2 py-0.5 rounded-full border border-rose-200"
                  }`}
                >
                  <CheckCircle2 className="size-3" />
                  {closing.suficiente === true ? "Saldo Cobre Repasse" : "Atenção Déficit"}
                </span>
              ) : (
                <span className="text-slate-400">—</span>
              )}
            </div>

            {/* SVG Sparkline */}
            <div className="h-8 w-full overflow-hidden rounded-lg bg-slate-50 p-1 flex items-end gap-1">
              {[35, 55, 40, 70, 60, 85, 95].map((val, idx) => (
                <div
                  key={idx}
                  style={{ height: `${val}%` }}
                  className={`flex-1 rounded-sm transition-all duration-500 ${
                    idx === 6 ? "bg-emerald-500" : "bg-emerald-200 group-hover:bg-emerald-300"
                  }`}
                />
              ))}
            </div>
          </div>

          <Link
            href="/financeiro"
            className="flex items-center justify-between border-t border-brand-border/60 pt-3 text-xs font-bold text-brand-blue hover:underline"
          >
            <span>Ver Balanço Completo</span>
            <ArrowUpRight className="size-4" />
          </Link>
        </div>

        {/* ── CARD 3: GROWTH & FUNIL DE CAPTAÇÃO ── */}
        <div className="group relative flex flex-col justify-between overflow-hidden rounded-3xl border border-brand-border bg-white p-5 shadow-sm transition duration-300 hover:shadow-md hover:border-brand-blue/40">
          <div className="flex items-start justify-between">
            <div className="space-y-1">
              <div className="flex items-center gap-1.5">
                <span className="size-2 rounded-full bg-brand-blue" />
                <h2 className="text-[11px] font-extrabold uppercase tracking-wider text-brand-muted">
                  Leads em Captação
                </h2>
              </div>
              <div className="flex items-baseline gap-2">
                <span className="text-2xl font-black text-brand-ink">
                  {loading && leads === null ? <Spinner /> : leadsCount}
                </span>
                <span className="text-xs font-semibold text-brand-muted">leads captados</span>
              </div>
            </div>
            <div className="flex size-10 items-center justify-center rounded-2xl bg-blue-50 text-brand-blue border border-blue-100 group-hover:scale-105 transition">
              <TrendingUp className="size-5" />
            </div>
          </div>

          {/* Visual Progress Funnel */}
          <div className="my-3 space-y-2">
            <div className="flex items-center justify-between text-xs font-semibold">
              <span className="text-brand-muted">Conversão:</span>
              <span className="text-brand-blue bg-blue-50 px-2 py-0.5 rounded-full border border-blue-100">
                {conversionRate}% ({enrollCount} matrículas)
              </span>
            </div>
            <div className="h-2.5 w-full overflow-hidden rounded-full bg-slate-100">
              <div
                style={{ width: `${Math.min(conversionRate, 100)}%` }}
                className="h-full rounded-full bg-gradient-to-r from-blue-500 to-emerald-500 transition-all duration-700"
              />
            </div>
            <div className="flex justify-between text-[11px] text-brand-muted pt-0.5">
              <span>{studentsCount} alunos ativos</span>
              <span>{enrollCount} concluídas</span>
            </div>
          </div>

          <Link
            href="/leads"
            className="flex items-center justify-between border-t border-brand-border/60 pt-3 text-xs font-bold text-brand-blue hover:underline"
          >
            <span>Gerenciar Leads & Funil</span>
            <ArrowUpRight className="size-4" />
          </Link>
        </div>

        {/* ── CARD 4: POLO NETWORK RADAR (Span 1 col) ── */}
        <div className="group relative flex flex-col justify-between overflow-hidden rounded-3xl border border-brand-border bg-white p-5 shadow-sm transition duration-300 hover:shadow-md hover:border-brand-blue/40">
          <div className="flex items-start justify-between">
            <div className="space-y-1">
              <div className="flex items-center gap-1.5">
                <span className="size-2 rounded-full bg-amber-500" />
                <h2 className="text-[11px] font-extrabold uppercase tracking-wider text-brand-muted">
                  Polos de Atendimento
                </h2>
              </div>
              <div className="text-2xl font-black text-brand-ink">
                {totalHubs}{" "}
                <span className="text-xs font-normal text-brand-muted">
                  ({hubsWithCoordinator} com coord.)
                </span>
              </div>
            </div>
            <div className="flex size-10 items-center justify-center rounded-2xl bg-amber-50 text-amber-600 border border-amber-100 group-hover:scale-105 transition">
              <Building2 className="size-5" />
            </div>
          </div>

          <div className="my-3 space-y-1.5 rounded-xl bg-slate-50 p-2.5 text-xs">
            <div className="flex items-center justify-between">
              <span className="text-brand-muted">Polo Matriz Padrão:</span>
              <span className="font-bold text-brand-ink truncate max-w-[120px]">
                {defaultHub ? defaultHub.brand : "Nenhum"}
              </span>
            </div>
            <div className="flex items-center justify-between text-[11px]">
              <span className="text-brand-muted">Promotores Alocados:</span>
              <span className="font-semibold text-emerald-700">{promoters.length} cadastrados</span>
            </div>
          </div>

          <Link
            href="/polos"
            className="flex items-center justify-between border-t border-brand-border/60 pt-3 text-xs font-bold text-brand-blue hover:underline"
          >
            <span>Ver Todos os Polos</span>
            <ArrowUpRight className="size-4" />
          </Link>
        </div>

        {/* ── CARD 5: SYSTEM TELEMETRY & INFRA (Span 1 col) ── */}
        <div className="group relative flex flex-col justify-between overflow-hidden rounded-3xl border border-brand-border bg-white p-5 shadow-sm transition duration-300 hover:shadow-md hover:border-brand-blue/40">
          <div className="flex items-start justify-between">
            <div className="space-y-1">
              <div className="flex items-center gap-1.5">
                <span className="size-2 rounded-full bg-emerald-500 animate-pulse" />
                <h2 className="text-[11px] font-extrabold uppercase tracking-wider text-brand-muted">
                  Estado do Servidor
                </h2>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-2xl font-black text-brand-ink">
                  {system?.db_ok ? "Online" : "Instável"}
                </span>
                <span
                  className={`size-2.5 rounded-full ${
                    system?.db_ok ? "bg-emerald-500" : "bg-rose-500"
                  }`}
                />
              </div>
            </div>
            <div className="flex size-10 items-center justify-center rounded-2xl bg-slate-100 text-slate-700 border border-slate-200 group-hover:scale-105 transition">
              <Activity className="size-5" />
            </div>
          </div>

          <div className="my-3 space-y-2 text-xs">
            <div className="flex items-center justify-between">
              <span className="text-brand-muted">Fila Django-Q:</span>
              <StatusPill
                status={system?.qcluster_alive ? "active" : "offline"}
                tone={system?.qcluster_alive ? "green" : "danger"}
                label={system?.qcluster_alive ? "Ativa" : "Parada"}
              />
            </div>
            <div className="flex items-center justify-between text-[11px]">
              <span className="text-brand-muted">Integrações Conectadas:</span>
              <span className="font-semibold text-slate-700">{integrations?.length || 4} ativas</span>
            </div>
          </div>

          <Link
            href="/integracoes"
            className="flex items-center justify-between border-t border-brand-border/60 pt-3 text-xs font-bold text-brand-blue hover:underline"
          >
            <span>Verificar Serviços</span>
            <ArrowUpRight className="size-4" />
          </Link>
        </div>

        {/* ── CARD 6: QUICK SHORTCUTS & GOVERNANCE (Span 2 cols on lg) ── */}
        <div className="overflow-hidden rounded-3xl border border-brand-border bg-gradient-to-r from-slate-50 via-white to-blue-50/40 p-5 shadow-sm lg:col-span-2">
          <div className="flex items-center justify-between pb-3 border-b border-brand-border/60">
            <div className="flex items-center gap-2">
              <Zap className="size-4 text-brand-blue" />
              <h2 className="text-sm font-extrabold text-brand-ink">Acessos Rápidos & Governança</h2>
            </div>
            <span className="text-[11px] font-mono text-slate-400 bg-white px-2 py-0.5 rounded-md border border-slate-200">
              Cmd+K
            </span>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 pt-3">
            <Link
              href="/documentos"
              className="flex flex-col items-center justify-center p-3 rounded-2xl bg-white border border-brand-border/80 shadow-2xs hover:border-brand-blue/50 hover:shadow-xs transition text-center group"
            >
              <FileCheck className="size-5 text-brand-blue mb-1.5 group-hover:scale-110 transition" />
              <span className="text-xs font-bold text-brand-ink">Mesa KYC</span>
              <span className="text-[10px] text-brand-muted">Auditoria</span>
            </Link>

            <Link
              href="/treino"
              className="flex flex-col items-center justify-center p-3 rounded-2xl bg-white border border-brand-border/80 shadow-2xs hover:border-brand-blue/50 hover:shadow-xs transition text-center group"
            >
              <GraduationCap className="size-5 text-emerald-600 mb-1.5 group-hover:scale-110 transition" />
              <span className="text-xs font-bold text-brand-ink">Treino LMS</span>
              <span className="text-[10px] text-brand-muted">Materiais</span>
            </Link>

            <Link
              href="/rede"
              className="flex flex-col items-center justify-center p-3 rounded-2xl bg-white border border-brand-border/80 shadow-2xs hover:border-brand-blue/50 hover:shadow-xs transition text-center group"
            >
              <Network className="size-5 text-indigo-600 mb-1.5 group-hover:scale-110 transition" />
              <span className="text-xs font-bold text-brand-ink">Rede</span>
              <span className="text-[10px] text-brand-muted">Downlines</span>
            </Link>

            <Link
              href="/coordenadores"
              className="flex flex-col items-center justify-center p-3 rounded-2xl bg-white border border-brand-border/80 shadow-2xs hover:border-brand-blue/50 hover:shadow-xs transition text-center group"
            >
              <Users className="size-5 text-amber-600 mb-1.5 group-hover:scale-110 transition" />
              <span className="text-xs font-bold text-brand-ink">Lideranças</span>
              <span className="text-[10px] text-brand-muted">Coordenadores</span>
            </Link>
          </div>
        </div>

      </div>
    </div>
  );
}

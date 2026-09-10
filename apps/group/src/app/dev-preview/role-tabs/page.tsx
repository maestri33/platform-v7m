"use client";

import * as React from "react";
import {
  Rocket,
  Building2,
  Crown,
  Users,
  TrendingUp,
  DollarSign,
  GraduationCap,
  ShieldCheck,
  ChevronRight,
  ArrowUpRight,
  Sparkles
} from "lucide-react";

export type RoleId = "promoter" | "hub" | "admin";

interface RoleConfig {
  id: RoleId;
  title: string;
  badge: string;
  color: string;
  activeTabGradient: string;
  accentGradient: string;
  icon: React.ComponentType<{ className?: string }>;
  description: string;
  metrics: Array<{ label: string; value: string; change: string; icon: React.ComponentType<{ className?: string }> }>;
  actions: Array<{ label: string; desc: string }>;
}

const ROLES_DATA: Record<RoleId, RoleConfig> = {
  promoter: {
    id: "promoter",
    title: "Portal do Promotor",
    badge: "Afiliado Oficial",
    color: "emerald",
    activeTabGradient: "from-emerald-600 to-teal-600 shadow-emerald-500/20 text-white border-emerald-500/40",
    accentGradient: "from-emerald-500/10 via-emerald-600/5 to-transparent border-emerald-500/20",
    icon: Rocket,
    description: "Ambiente focado em captação de alunos, geração de links de indicação, conversão de leads e extrato de comissões PIX.",
    metrics: [
      { label: "Comissões a Liquidar", value: "R$ 1.450,00", change: "+18% nesta semana", icon: DollarSign },
      { label: "Leads Captados", value: "42", change: "8 novos hoje", icon: Users },
      { label: "Matrículas Convertidas", value: "14", change: "Taxa de 33.3%", icon: TrendingUp },
    ],
    actions: [
      { label: "Copiar Link de Matrícula", desc: "Link parametrizado com cookie de 60 dias de atribuição" },
      { label: "Ver Extrato de Comissões", desc: "Fechamento automático toda sexta-feira às 18h" },
      { label: "Acessar Treinamento & LMS", desc: "Aulas práticas de persuasão e regras do MEC" },
    ]
  },
  hub: {
    id: "hub",
    title: "Liderança Regional",
    badge: "Coordenação de Polo",
    color: "blue",
    activeTabGradient: "from-blue-600 to-indigo-600 shadow-blue-500/20 text-white border-blue-500/40",
    accentGradient: "from-blue-500/10 via-blue-600/5 to-transparent border-blue-500/20",
    icon: Building2,
    description: "Ambiente do Coordenador de Polo: guarda pedagógica dos alunos matriculados, gestão da equipe local e aprovação de candidatos.",
    metrics: [
      { label: "Alunos Sob Custódia", value: "128", change: "Todos com RG validado", icon: GraduationCap },
      { label: "Candidatos a Promotor", value: "5 pendentes", change: "Aguardando homologação", icon: Users },
      { label: "Matrículas do Polo", value: "R$ 38.400", change: "Meta mensal 85%", icon: TrendingUp },
    ],
    actions: [
      { label: "Mesa de Triagem de Candidatos", desc: "Revisão e homologação de novos promotores do polo" },
      { label: "Gestão Acadêmica dos Alunos", desc: "Controle de frequência, prova presencial e diplomação" },
      { label: "Alertas & Inbox do Polo", desc: "Handoff imediato de alunos pós-liquidação financeira" },
    ]
  },
  admin: {
    id: "admin",
    title: "Administração Master",
    badge: "Governança Global",
    color: "amber",
    activeTabGradient: "from-amber-600 to-amber-500 shadow-amber-500/20 text-white border-amber-500/40",
    accentGradient: "from-amber-500/10 via-amber-600/5 to-transparent border-amber-500/20",
    icon: Crown,
    description: "Visão executiva consolidada: financeiro global, auditoria de contratos MEC/SISTEC, saúde da malha Proxmox e gestão de rede.",
    metrics: [
      { label: "Faturamento Mensal", value: "R$ 482.900", change: "+24% vs mês anterior", icon: DollarSign },
      { label: "Polos Ativos", value: "18 unidades", change: "100% operacionais", icon: Building2 },
      { label: "Conformidade MEC / RG", value: "99.8%", change: "Zero pendências críticas", icon: ShieldCheck },
    ],
    actions: [
      { label: "Mesa de Auditoria Documental", desc: "Verificação com IA multimodal de RG e comprovantes" },
      { label: "Painel de Soberania Financeira", desc: "Conciliação bancária Asaas PIX e InfinitePay cartão" },
      { label: "Governança & Topologia de Rede", desc: "Cluster HA OmniRoute (CT 135) e memória centralizada (CT 99)" },
    ]
  }
};

export default function RoleTabsPreviewPage() {
  const [activeRole, setActiveRole] = React.useState<RoleId>("admin");
  const [simulatedRoles, setSimulatedRoles] = React.useState<RoleId[]>(["promoter", "hub", "admin"]);

  const roleConfig = ROLES_DATA[activeRole];
  const CurrentIcon = roleConfig.icon;

  const toggleRole = (role: RoleId) => {
    if (simulatedRoles.includes(role)) {
      if (simulatedRoles.length === 1) return;
      const next = simulatedRoles.filter(r => r !== role);
      setSimulatedRoles(next);
      if (activeRole === role) {
        setActiveRole(next[0]);
      }
    } else {
      setSimulatedRoles([...simulatedRoles, role]);
    }
  };

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 p-4 sm:p-8 font-sans selection:bg-blue-500 selection:text-white">
      <div className="max-w-4xl mx-auto space-y-8">

        {/* Header do Exemplo */}
        <div className="border-b border-slate-800/80 pb-6 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <div className="flex items-center gap-2">
              <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-blue-500/10 text-blue-400 border border-blue-500/20 flex items-center gap-1">
                <Sparkles className="size-3" />
                PADRÃO ACETERNITY TABS
              </span>
              <span className="text-xs text-slate-500">v7m / apps/group</span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-black text-white mt-1 tracking-tight">
              Gestão Dinâmica de Roles & Ambientes
            </h1>
            <p className="text-sm text-slate-400 mt-1">
              Quando o usuário possui mais de uma role ativa, o seletor de Tabs animado é exibido no topo.
            </p>
          </div>

          {/* Simulador de Roles do Usuário */}
          <div className="bg-slate-900/90 border border-slate-800 rounded-xl p-3 text-xs space-y-2 shrink-0 backdrop-blur-md">
            <span className="text-slate-400 font-semibold block">Simular Roles Ativas do Usuário:</span>
            <div className="flex items-center gap-2">
              {(["promoter", "hub", "admin"] as RoleId[]).map((r) => {
                const checked = simulatedRoles.includes(r);
                return (
                  <button
                    key={r}
                    onClick={() => toggleRole(r)}
                    className={`px-2.5 py-1 rounded-lg font-bold border transition cursor-pointer ${
                      checked
                        ? "bg-blue-600 text-white border-blue-500 shadow-xs"
                        : "bg-slate-800/60 text-slate-400 border-slate-700 hover:text-slate-200"
                    }`}
                  >
                    {r === "promoter" ? "Promotor" : r === "hub" ? "Coordenador" : "Admin Master"}
                  </button>
                );
              })}
            </div>
          </div>
        </div>

        {/* ========================================================================= */}
        {/* TABS COMPONENT (ESTILO ACETERNITY) */}
        {/* ========================================================================= */}
        {simulatedRoles.length > 1 ? (
          <div className="flex justify-center sm:justify-start">
            <nav
              aria-label="Seleção de ambiente do usuário"
              className="inline-flex items-center gap-1.5 p-1.5 bg-slate-900/90 border border-slate-800/90 rounded-2xl backdrop-blur-xl shadow-2xl relative"
            >
              {simulatedRoles.map((roleId) => {
                const config = ROLES_DATA[roleId];
                const Icon = config.icon;
                const isActive = activeRole === roleId;

                return (
                  <button
                    key={roleId}
                    onClick={() => setActiveRole(roleId)}
                    className={`relative flex items-center gap-2.5 px-4 py-2.5 rounded-xl text-xs sm:text-sm font-bold transition-all duration-300 select-none cursor-pointer border ${
                      isActive
                        ? `bg-gradient-to-r ${config.activeTabGradient} shadow-md`
                        : "border-transparent text-slate-400 hover:text-slate-200 hover:bg-slate-800/60"
                    }`}
                  >
                    <Icon className="size-4 shrink-0" />
                    <span>{config.title}</span>
                    <span className={`text-[10px] uppercase tracking-wider px-1.5 py-0.5 rounded-md ${
                      isActive ? "bg-black/25 text-white/95 font-black" : "bg-slate-800 text-slate-400"
                    }`}>
                      {config.badge}
                    </span>
                  </button>
                );
              })}
            </nav>
          </div>
        ) : (
          <div className="bg-slate-900/50 border border-slate-800/80 rounded-xl p-3 flex items-center gap-3">
            <span className="text-xs text-slate-400">Usuário com papel único (Tabs em pílula simples):</span>
            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-lg bg-slate-800 text-xs font-bold text-white border border-slate-700">
              <CurrentIcon className="size-3.5" />
              {roleConfig.title}
            </span>
          </div>
        )}

        {/* ========================================================================= */}
        {/* CARREGAMENTO DINÂMICO DO AMBIENTE CORRESPONDENTE */}
        {/* ========================================================================= */}
        <div
          key={activeRole}
          className={`rounded-3xl border bg-gradient-to-b ${roleConfig.accentGradient} bg-slate-900/60 backdrop-blur-md p-6 sm:p-8 space-y-6 shadow-2xl transition-all duration-300 animate-in fade-in zoom-in-95`}
        >
          {/* Topo do Ambiente */}
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 border-b border-slate-800/80 pb-6">
            <div className="flex items-center gap-4">
              <div className={`size-12 rounded-2xl flex items-center justify-center border shadow-inner ${
                activeRole === "admin"
                  ? "bg-amber-500/10 border-amber-500/30 text-amber-400"
                  : activeRole === "hub"
                  ? "bg-blue-500/10 border-blue-500/30 text-blue-400"
                  : "bg-emerald-500/10 border-emerald-500/30 text-emerald-400"
              }`}>
                <CurrentIcon className="size-6" />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <h2 className="text-xl sm:text-2xl font-black text-white">{roleConfig.title}</h2>
                  <span className="px-2 py-0.5 rounded-full text-[11px] font-bold bg-white/10 text-white border border-white/10">
                    {roleConfig.badge}
                  </span>
                </div>
                <p className="text-xs sm:text-sm text-slate-400 mt-0.5">
                  {roleConfig.description}
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2 shrink-0">
              <span className="text-xs font-semibold text-slate-400">Ambiente Carregado:</span>
              <span className="text-xs font-mono font-bold text-white bg-slate-800 px-2.5 py-1 rounded-lg border border-slate-700 flex items-center gap-1">
                /{activeRole}
                <ArrowUpRight className="size-3 text-slate-400" />
              </span>
            </div>
          </div>

          {/* Grid de Métricas do Ambiente */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            {roleConfig.metrics.map((m, idx) => {
              const MIcon = m.icon;
              return (
                <div key={idx} className="bg-slate-950/60 border border-slate-800/80 rounded-2xl p-4 space-y-2 hover:border-slate-700 transition">
                  <div className="flex items-center justify-between text-slate-400">
                    <span className="text-xs font-bold uppercase tracking-wider">{m.label}</span>
                    <MIcon className="size-4 text-slate-500" />
                  </div>
                  <div className="text-2xl font-black text-white">{m.value}</div>
                  <div className="text-[11px] font-semibold text-slate-400">{m.change}</div>
                </div>
              );
            })}
          </div>

          {/* Ações Rápidas do Ambiente */}
          <div className="space-y-3">
            <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400">
              Ações & Ferramentas do Papel
            </h3>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              {roleConfig.actions.map((act, idx) => (
                <button
                  key={idx}
                  className="flex flex-col text-left p-3.5 rounded-2xl bg-slate-800/40 hover:bg-slate-800/80 border border-slate-700/60 hover:border-slate-600 transition group cursor-pointer"
                >
                  <div className="flex items-center justify-between w-full">
                    <span className="text-xs font-bold text-white group-hover:text-blue-400 transition">
                      {act.label}
                    </span>
                    <ChevronRight className="size-3.5 text-slate-500 group-hover:translate-x-0.5 transition" />
                  </div>
                  <span className="text-[11px] text-slate-400 mt-1">
                    {act.desc}
                  </span>
                </button>
              ))}
            </div>
          </div>

        </div>

      </div>
    </div>
  );
}

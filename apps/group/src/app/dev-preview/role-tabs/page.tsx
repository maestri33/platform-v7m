"use client";

import * as React from "react";
import { AceternityTabs, type Tab } from "@v7m/ui";
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
    accentGradient: "from-emerald-500/20 via-emerald-600/10 to-transparent border-emerald-500/30",
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
    accentGradient: "from-blue-500/20 via-blue-600/10 to-transparent border-blue-500/30",
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
    accentGradient: "from-amber-500/20 via-amber-600/10 to-transparent border-amber-500/30",
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
  const [simulatedRoles, setSimulatedRoles] = React.useState<RoleId[]>(["promoter", "hub", "admin"]);

  const toggleRole = (role: RoleId) => {
    if (simulatedRoles.includes(role)) {
      if (simulatedRoles.length === 1) return;
      setSimulatedRoles(simulatedRoles.filter(r => r !== role));
    } else {
      setSimulatedRoles([...simulatedRoles, role]);
    }
  };

  const tabs: Tab[] = simulatedRoles.map((roleId) => {
    const config = ROLES_DATA[roleId];
    const Icon = config.icon;

    return {
      title: config.title,
      value: config.id,
      icon: <Icon className="size-4 shrink-0" />,
      badge: config.badge,
      content: (
        <div className={`w-full h-full rounded-3xl border bg-gradient-to-b ${config.accentGradient} bg-slate-900/90 backdrop-blur-xl p-6 sm:p-8 space-y-6 shadow-2xl text-slate-100 flex flex-col justify-between`}>
          {/* Topo do Ambiente */}
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 border-b border-white/10 pb-6">
            <div className="flex items-center gap-4">
              <div className={`size-12 rounded-2xl flex items-center justify-center border shadow-inner ${
                config.id === "admin"
                  ? "bg-amber-500/20 border-amber-500/40 text-amber-400"
                  : config.id === "hub"
                  ? "bg-blue-500/20 border-blue-500/40 text-blue-400"
                  : "bg-emerald-500/20 border-emerald-500/40 text-emerald-400"
              }`}>
                <Icon className="size-6" />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <h2 className="text-xl sm:text-2xl font-black text-white">{config.title}</h2>
                  <span className="px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-white/10 text-white border border-white/15">
                    {config.badge}
                  </span>
                </div>
                <p className="text-xs sm:text-sm text-slate-300 mt-1">
                  {config.description}
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2 shrink-0">
              <span className="text-xs font-semibold text-slate-400">Ambiente Ativo:</span>
              <span className="text-xs font-mono font-bold text-white bg-slate-800/80 px-2.5 py-1 rounded-lg border border-slate-700 flex items-center gap-1">
                /{config.id}
                <ArrowUpRight className="size-3 text-slate-400" />
              </span>
            </div>
          </div>

          {/* Grid de Métricas do Ambiente */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            {config.metrics.map((m, idx) => {
              const MIcon = m.icon;
              return (
                <div key={idx} className="bg-slate-950/70 border border-white/10 rounded-2xl p-4 space-y-2">
                  <div className="flex items-center justify-between text-slate-400">
                    <span className="text-xs font-bold uppercase tracking-wider">{m.label}</span>
                    <MIcon className="size-4 text-slate-400" />
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
              {config.actions.map((act, idx) => (
                <button
                  key={idx}
                  type="button"
                  className="flex flex-col text-left p-3.5 rounded-2xl bg-slate-800/50 hover:bg-slate-800/90 border border-white/10 hover:border-white/20 transition group cursor-pointer"
                >
                  <div className="flex items-center justify-between w-full">
                    <span className="text-xs font-bold text-white group-hover:text-blue-400 transition">
                      {act.label}
                    </span>
                    <ChevronRight className="size-3.5 text-slate-400 group-hover:translate-x-0.5 transition" />
                  </div>
                  <span className="text-[11px] text-slate-400 mt-1">
                    {act.desc}
                  </span>
                </button>
              ))}
            </div>
          </div>
        </div>
      )
    };
  });

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 p-4 sm:p-8 font-sans selection:bg-blue-500 selection:text-white">
      <div className="max-w-4xl mx-auto space-y-8">

        {/* Header do Exemplo */}
        <div className="border-b border-slate-800/80 pb-6 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <div className="flex items-center gap-2">
              <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-blue-500/10 text-blue-400 border border-blue-500/20 flex items-center gap-1">
                <Sparkles className="size-3" />
                ACETERNITY UI TABS CANÔNICO
              </span>
              <span className="text-xs text-slate-500">v7m / @v7m/ui</span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-black text-white mt-1 tracking-tight">
              Gestão Dinâmica de Roles & Ambientes
            </h1>
            <p className="text-sm text-slate-400 mt-1">
              Efeito 3D FadeInDiv com reordenação de cards empilhados ao alternar entre os papéis do usuário.
            </p>
          </div>

          {/* Simulador de Roles do Usuário */}
          <div className="bg-slate-900/90 border border-slate-800 rounded-xl p-3 text-xs space-y-2 shrink-0 backdrop-blur-md">
            <span className="text-slate-400 font-semibold block">Simular Roles Ativas:</span>
            <div className="flex items-center gap-2">
              {(["promoter", "hub", "admin"] as RoleId[]).map((r) => {
                const checked = simulatedRoles.includes(r);
                return (
                  <button
                    key={r}
                    type="button"
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
        {/* COMPONENTE ACETERNITY TABS OFICIAL */}
        {/* ========================================================================= */}
        <div className="py-2">
          <AceternityTabs
            tabs={tabs}
            containerClassName="bg-slate-900/80 border border-slate-800 p-1.5 rounded-full"
            activeTabClassName="bg-gradient-to-r from-blue-600 to-indigo-600 shadow-lg"
            tabClassName="text-slate-300 hover:text-white"
          />
        </div>

      </div>
    </div>
  );
}

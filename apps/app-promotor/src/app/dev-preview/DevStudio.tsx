"use client";

import { useState } from "react";
import Link from "next/link";
import {
  Smartphone,
  Tablet,
  Monitor,
  CheckCircle2,
  Clock,
  AlertTriangle,
  RotateCcw,
  Sparkles,
  ShieldAlert,
  Zap,
  BookOpen,
  Users,
  DollarSign,
  Lock,
  Layers,
  Eye,
  Sliders,
} from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { CopyButton } from "@/components/ui/copy-button";
import { Countdown } from "@/components/ui/countdown";
import { StatusBanner } from "@/components/ui/status-banner";
import { FunnelStepper } from "@/components/ui/stepper";
import { ThemeToggle } from "@/components/ui/theme-toggle";
import { ShareActions } from "@/components/ui/share-actions";
import { formatBRL } from "@/lib/format";
import type { ChecklistItem, ChecklistItemState } from "@/lib/candidate/funnel";

type ScreenTab =
  | "painel"
  | "documento"
  | "endereco"
  | "pix"
  | "escolaridade"
  | "selfie"
  | "treinamento"
  | "leads"
  | "comissoes"
  | "ui_primitives";

type DeviceViewport = "iphone14" | "iphonese" | "pixel7" | "responsive";

interface DevScenarioState {
  role: "candidate" | "promoter" | "training" | "rejected";
  userName: string;
  refUrl: string;
  weekGoal: number;
  paidLeads: number;
  bonusAmount: string;
  totalReceived: string;
  preMatriculado: boolean;
  scholarshipPaid: number;
  // Estados dos 5 deveres
  docState: ChecklistItemState;
  addressState: ChecklistItemState;
  pixState: ChecklistItemState;
  educationState: ChecklistItemState;
  selfieState: ChecklistItemState;
  // Simulação de erro injetado
  injectedError: string | null;
}

const PRESET_SCENARIOS: Record<string, { label: string; icon: string; state: DevScenarioState }> = {
  fresh_candidate: {
    label: "Candidato Novo (0/5)",
    icon: "🌱",
    state: {
      role: "candidate",
      userName: "Lucas Recruta",
      refUrl: "https://supletivo.net.br/?ref=lucas01",
      weekGoal: 5,
      paidLeads: 0,
      bonusAmount: "500.00",
      totalReceived: "0.00",
      preMatriculado: false,
      scholarshipPaid: 0,
      docState: "todo",
      addressState: "todo",
      pixState: "todo",
      educationState: "todo",
      selfieState: "todo",
      injectedError: null,
    },
  },
  async_processing: {
    label: "Em Análise OCR (2/5 + Fila)",
    icon: "⏳",
    state: {
      role: "candidate",
      userName: "Mariana Silva",
      refUrl: "https://supletivo.net.br/?ref=mariana99",
      weekGoal: 5,
      paidLeads: 2,
      bonusAmount: "500.00",
      totalReceived: "0.00",
      preMatriculado: false,
      scholarshipPaid: 0,
      docState: "pending",
      addressState: "pending",
      pixState: "approved",
      educationState: "approved",
      selfieState: "todo",
      injectedError: null,
    },
  },
  with_issues: {
    label: "Ajuste Necessário (Reprovações)",
    icon: "⚠️",
    state: {
      role: "candidate",
      userName: "Carlos Eduardo",
      refUrl: "https://supletivo.net.br/?ref=carlos77",
      weekGoal: 5,
      paidLeads: 1,
      bonusAmount: "500.00",
      totalReceived: "0.00",
      preMatriculado: false,
      scholarshipPaid: 0,
      docState: "needs_action",
      addressState: "needs_action",
      pixState: "approved",
      educationState: "approved",
      selfieState: "needs_action",
      injectedError: null,
    },
  },
  promoter_active: {
    label: "Promotor Pleno (5/5 Aprovado)",
    icon: "⚡",
    state: {
      role: "promoter",
      userName: "Beatriz Promotora",
      refUrl: "https://supletivo.net.br/?ref=biav7m",
      weekGoal: 5,
      paidLeads: 3,
      bonusAmount: "500.00",
      totalReceived: "1200.00",
      preMatriculado: false,
      scholarshipPaid: 0,
      docState: "approved",
      addressState: "approved",
      pixState: "approved",
      educationState: "approved",
      selfieState: "approved",
      injectedError: null,
    },
  },
  goal_champion: {
    label: "Campeão da Meta (5/5 Leads + Bônus)",
    icon: "🏆",
    state: {
      role: "promoter",
      userName: "Rodrigo Campeão",
      refUrl: "https://supletivo.net.br/?ref=rodrigo_top",
      weekGoal: 5,
      paidLeads: 6,
      bonusAmount: "500.00",
      totalReceived: "3500.00",
      preMatriculado: false,
      scholarshipPaid: 0,
      docState: "approved",
      addressState: "approved",
      pixState: "approved",
      educationState: "approved",
      selfieState: "approved",
      injectedError: null,
    },
  },
  scholarship_student: {
    label: "Bolsista (Jornada do Aluno)",
    icon: "🎓",
    state: {
      role: "promoter",
      userName: "Aline Bolsista",
      refUrl: "https://supletivo.net.br/?ref=aline_bolsa",
      weekGoal: 5,
      paidLeads: 2,
      bonusAmount: "500.00",
      totalReceived: "400.00",
      preMatriculado: true,
      scholarshipPaid: 2,
      docState: "approved",
      addressState: "approved",
      pixState: "approved",
      educationState: "approved",
      selfieState: "approved",
      injectedError: null,
    },
  },
  training_locked: {
    label: "Trava de Treinamento (LMS Gate)",
    icon: "🔒",
    state: {
      role: "training",
      userName: "Diego Trainee",
      refUrl: "https://supletivo.net.br/?ref=diego",
      weekGoal: 5,
      paidLeads: 0,
      bonusAmount: "500.00",
      totalReceived: "0.00",
      preMatriculado: false,
      scholarshipPaid: 0,
      docState: "approved",
      addressState: "approved",
      pixState: "approved",
      educationState: "approved",
      selfieState: "approved",
      injectedError: null,
    },
  },
};

export function DevStudio() {
  const [activeTab, setActiveTab] = useState<ScreenTab>("painel");
  const [viewport, setViewport] = useState<DeviceViewport>("iphone14");
  const [state, setState] = useState<DevScenarioState>(PRESET_SCENARIOS.async_processing.state);
  const [highlightTargets, setHighlightTargets] = useState(false);
  const [highContrast, setHighContrast] = useState(false);
  const [showControls, setShowControls] = useState(true);

  // Calcula estatísticas do checklist
  const checklistItems: ChecklistItem[] = [
    {
      key: "documents",
      label: "Documento oficial (RG/CNH)",
      href: "#",
      state: state.docState,
      badgeLabel:
        state.docState === "approved"
          ? "Aprovado ✓"
          : state.docState === "pending"
            ? "Em análise ⏳"
            : state.docState === "needs_action"
              ? "Ajustar ⚠️"
              : "Pendente",
      description:
        state.docState === "approved"
          ? "Documento verificado com sucesso."
          : state.docState === "pending"
            ? "Foto recebida. OCR conferindo em segundo plano."
            : state.docState === "needs_action"
              ? "Foto ilegível ou incompleta. Envie novamente."
              : "Envie foto da frente e verso do RG ou da CNH.",
      icon: "🪪",
    },
    {
      key: "address",
      label: "Comprovante de residência",
      href: "#",
      state: state.addressState,
      badgeLabel:
        state.addressState === "approved"
          ? "Aprovado ✓"
          : state.addressState === "pending"
            ? "Em análise ⏳"
            : state.addressState === "needs_action"
              ? "Ajustar ⚠️"
              : "Pendente",
      description:
        state.addressState === "approved"
          ? "Comprovante conferido."
          : state.addressState === "pending"
            ? "Comprovante recebido. Análise em segundo plano."
            : state.addressState === "needs_action"
              ? "Confirme o titular ou envie outro comprovante."
              : "Conta de água, luz, gás ou telefone recente.",
      icon: "🏠",
    },
    {
      key: "pix",
      label: "Chave Pix para saque",
      href: "#",
      state: state.pixState,
      badgeLabel: state.pixState === "approved" ? "Validada ✓" : "Pendente",
      description:
        state.pixState === "approved"
          ? "Chave vinculada para receber suas comissões."
          : "Cadastre onde você quer receber seus pagamentos.",
      icon: "🔑",
    },
    {
      key: "education",
      label: "Escolaridade",
      href: "#",
      state: state.educationState,
      badgeLabel: state.educationState === "approved" ? "Registrada ✓" : "Pendente",
      description:
        state.educationState === "approved"
          ? "Nível de ensino registrado."
          : "Informe sua última série ou formação concluída.",
      icon: "🎓",
    },
    {
      key: "selfie",
      label: "Selfie & Acordo de parceria",
      href: "#",
      state: state.selfieState,
      badgeLabel:
        state.selfieState === "approved"
          ? "Assinado ✓"
          : state.selfieState === "pending"
            ? "Em análise ⏳"
            : state.selfieState === "needs_action"
              ? "Ajustar ⚠️"
              : "Pendente",
      description:
        state.selfieState === "approved"
          ? "Assinatura eletrônica confirmada."
          : state.selfieState === "pending"
            ? "Selfie recebida. Vivacidade em análise."
            : state.selfieState === "needs_action"
              ? "Tire outra selfie seguindo as orientações."
              : "Foto ao vivo sem óculos para assinar o acordo.",
      icon: "🤳",
    },
  ];

  const completedCount = checklistItems.filter((i) => i.state === "approved").length;
  const isAllApproved = completedCount === checklistItems.length;
  const hasPendingAnalysis = checklistItems.some((i) => i.state === "pending");
  const hasNeedsAction = checklistItems.some((i) => i.state === "needs_action");

  const viewportWidthClass =
    viewport === "iphone14"
      ? "w-[393px] h-[852px]"
      : viewport === "iphonese"
        ? "w-[375px] h-[667px]"
        : viewport === "pixel7"
          ? "w-[412px] h-[915px]"
          : "w-full max-w-lg min-h-[80vh]";

  return (
    <div className="flex flex-col min-h-screen bg-[#0d0f12] text-zinc-100 selection:bg-brand-gold/30">
      {/* Barra de Topo do Studio */}
      <header className="shrink-0 border-b border-zinc-800 bg-[#13161c] px-4 py-2.5 flex flex-wrap items-center justify-between gap-3 z-50">
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2">
            <span className="flex h-2.5 w-2.5 rounded-full bg-brand-gold animate-pulse" />
            <h1 className="text-sm font-bold tracking-wide uppercase text-brand-gold-ink">
              Modo Desenvolvedor · V7M Lab
            </h1>
          </div>
          <span className="text-xs px-2 py-0.5 rounded bg-zinc-800 text-zinc-400 font-mono">
            Next 16 · UI/UX Pro Max
          </span>
        </div>

        {/* Seletores de Viewport & A11y */}
        <div className="flex items-center gap-2">
          <div className="flex items-center rounded-lg bg-zinc-900 border border-zinc-800 p-0.5">
            <button
              type="button"
              onClick={() => setViewport("iphone14")}
              title="iPhone 14 Pro (393px)"
              className={`p-1.5 rounded text-xs flex items-center gap-1 ${
                viewport === "iphone14" ? "bg-brand-gold text-black font-semibold" : "text-zinc-400 hover:text-white"
              }`}
            >
              <Smartphone size={14} /> 393px
            </button>
            <button
              type="button"
              onClick={() => setViewport("iphonese")}
              title="iPhone SE (375px)"
              className={`p-1.5 rounded text-xs flex items-center gap-1 ${
                viewport === "iphonese" ? "bg-brand-gold text-black font-semibold" : "text-zinc-400 hover:text-white"
              }`}
            >
              <Smartphone size={14} /> 375px
            </button>
            <button
              type="button"
              onClick={() => setViewport("pixel7")}
              title="Pixel 7 (412px)"
              className={`p-1.5 rounded text-xs flex items-center gap-1 ${
                viewport === "pixel7" ? "bg-brand-gold text-black font-semibold" : "text-zinc-400 hover:text-white"
              }`}
            >
              <Tablet size={14} /> 412px
            </button>
            <button
              type="button"
              onClick={() => setViewport("responsive")}
              title="Responsivo"
              className={`p-1.5 rounded text-xs flex items-center gap-1 ${
                viewport === "responsive" ? "bg-brand-gold text-black font-semibold" : "text-zinc-400 hover:text-white"
              }`}
            >
              <Monitor size={14} /> Auto
            </button>
          </div>

          <button
            type="button"
            onClick={() => setHighlightTargets((v) => !v)}
            title="Destacar Touch Targets (< 44px)"
            className={`px-2.5 py-1.5 rounded text-xs border font-medium transition-colors ${
              highlightTargets
                ? "bg-red-500/20 border-red-500 text-red-300"
                : "bg-zinc-900 border-zinc-800 text-zinc-400 hover:text-zinc-200"
            }`}
          >
            🎯 Alvos ≥44px
          </button>

          <button
            type="button"
            onClick={() => setShowControls((v) => !v)}
            className="px-2.5 py-1.5 rounded text-xs bg-zinc-800 hover:bg-zinc-700 text-zinc-200 font-medium flex items-center gap-1"
          >
            <Sliders size={14} /> {showControls ? "Ocultar Controles" : "Abrir Controles"}
          </button>

          <ThemeToggle />
        </div>
      </header>

      {/* Grid Principal: Drawer de Controles + Canvas do Dispositivo */}
      <div className="flex-1 flex overflow-hidden">
        {/* Painel de Controles Lateral */}
        {showControls && (
          <aside className="w-80 shrink-0 border-r border-zinc-800 bg-[#101217] overflow-y-auto p-4 space-y-5 text-xs">
            {/* Presets 1-Click */}
            <div className="space-y-2">
              <p className="font-bold uppercase tracking-wider text-zinc-400 flex items-center gap-1.5">
                <Sparkles size={14} className="text-brand-gold" /> Cenários Prontos (1-Click)
              </p>
              <div className="grid grid-cols-1 gap-1.5">
                {Object.entries(PRESET_SCENARIOS).map(([key, item]) => (
                  <button
                    key={key}
                    type="button"
                    onClick={() => setState(item.state)}
                    className="flex items-center gap-2 rounded-lg border border-zinc-800 bg-zinc-900/60 p-2 text-left hover:border-brand-gold/50 hover:bg-zinc-900 transition-colors"
                  >
                    <span className="text-base">{item.icon}</span>
                    <span className="font-medium text-zinc-200">{item.label}</span>
                  </button>
                ))}
              </div>
            </div>

            {/* Ajustes Finos dos 5 Deveres */}
            <div className="space-y-3 pt-3 border-t border-zinc-800">
              <p className="font-bold uppercase tracking-wider text-zinc-400 flex items-center gap-1.5">
                <Layers size={14} className="text-brand-gold" /> Estados dos 5 Deveres
              </p>

              {(
                [
                  { key: "docState", label: "1. Documento (RG/CNH)" },
                  { key: "addressState", label: "2. Comprovante Residência" },
                  { key: "pixState", label: "3. Chave Pix DICT" },
                  { key: "educationState", label: "4. Escolaridade" },
                  { key: "selfieState", label: "5. Selfie & Acordo" },
                ] as const
              ).map((duty) => (
                <div key={duty.key} className="space-y-1 bg-zinc-900/40 p-2 rounded border border-zinc-800/80">
                  <span className="text-zinc-300 font-medium">{duty.label}</span>
                  <div className="grid grid-cols-4 gap-1">
                    {(["todo", "pending", "approved", "needs_action"] as const).map((st) => (
                      <button
                        key={st}
                        type="button"
                        onClick={() => setState((prev) => ({ ...prev, [duty.key]: st }))}
                        className={`px-1 py-0.5 rounded text-[10px] font-semibold text-center ${
                          state[duty.key] === st
                            ? st === "approved"
                              ? "bg-emerald-500 text-black"
                              : st === "pending"
                                ? "bg-amber-400 text-black"
                                : st === "needs_action"
                                  ? "bg-rose-500 text-white"
                                  : "bg-zinc-700 text-white"
                            : "bg-zinc-800 text-zinc-400 hover:text-white"
                        }`}
                      >
                        {st === "todo"
                          ? "Pendente"
                          : st === "pending"
                            ? "Análise"
                            : st === "approved"
                              ? "Aprovado"
                              : "Ajuste"}
                      </button>
                    ))}
                  </div>
                </div>
              ))}
            </div>

            {/* Ajustes Financeiros & Metas */}
            <div className="space-y-3 pt-3 border-t border-zinc-800">
              <p className="font-bold uppercase tracking-wider text-zinc-400 flex items-center gap-1.5">
                <DollarSign size={14} className="text-brand-gold" /> Metas & Comissões
              </p>
              <div className="space-y-1">
                <div className="flex justify-between text-zinc-300">
                  <span>Matrículas Pagas na Semana:</span>
                  <strong className="text-brand-gold font-bold">{state.paidLeads} / {state.weekGoal}</strong>
                </div>
                <input
                  type="range"
                  min="0"
                  max="10"
                  value={state.paidLeads}
                  onChange={(e) => setState((prev) => ({ ...prev, paidLeads: Number(e.target.value) }))}
                  className="w-full accent-brand-gold cursor-pointer"
                />
              </div>

              <div className="flex items-center justify-between pt-1">
                <span className="text-zinc-300">Bolsista de Estudos</span>
                <input
                  type="checkbox"
                  checked={state.preMatriculado}
                  onChange={(e) => setState((prev) => ({ ...prev, preMatriculado: e.target.checked }))}
                  className="accent-brand-gold h-4 w-4 rounded cursor-pointer"
                />
              </div>
            </div>

            {/* Injetor de Erros & Banners de Resiliência */}
            <div className="space-y-2 pt-3 border-t border-zinc-800">
              <p className="font-bold uppercase tracking-wider text-zinc-400 flex items-center gap-1.5">
                <ShieldAlert size={14} className="text-rose-400" /> Simular Erros da API
              </p>
              <div className="grid grid-cols-2 gap-1.5">
                {[
                  { label: "Sem Erro", val: null },
                  { label: "Rate Limit (429)", val: "RATE_LIMITED" },
                  { label: "Status 409", val: "WRONG_STATUS" },
                  { label: "Arquivo > 8MB", val: "FILE_TOO_LARGE" },
                  { label: "Rede Oscilou", val: "NETWORK_ERROR" },
                ].map((err) => (
                  <button
                    key={err.label}
                    type="button"
                    onClick={() => setState((prev) => ({ ...prev, injectedError: err.val }))}
                    className={`p-1.5 rounded text-[11px] font-medium border text-center ${
                      state.injectedError === err.val
                        ? "bg-rose-500/20 border-rose-500 text-rose-200"
                        : "bg-zinc-900 border-zinc-800 text-zinc-400 hover:text-zinc-200"
                    }`}
                  >
                    {err.label}
                  </button>
                ))}
              </div>
            </div>
          </aside>
        )}

        {/* Área Central: Navegação de Telas + Moldura do Dispositivo */}
        <main className="flex-1 flex flex-col overflow-hidden bg-[#090a0d]">
          {/* Barra de Seleção de Telas */}
          <nav className="shrink-0 border-b border-zinc-800 bg-[#101217] px-4 py-2 flex items-center gap-1.5 overflow-x-auto">
            {(
              [
                { id: "painel", label: "Painel Principal" },
                { id: "documento", label: "1. Documento" },
                { id: "endereco", label: "2. Comprovante" },
                { id: "pix", label: "3. Chave Pix" },
                { id: "escolaridade", label: "4. Escolaridade" },
                { id: "selfie", label: "5. Selfie" },
                { id: "treinamento", label: "Treinamento LMS" },
                { id: "leads", label: "Leads" },
                { id: "comissoes", label: "Comissões" },
                { id: "ui_primitives", label: "Primitivos UI" },
              ] as const
            ).map((tab) => (
              <button
                key={tab.id}
                type="button"
                onClick={() => setActiveTab(tab.id)}
                className={`px-3 py-1.5 rounded-md text-xs font-semibold whitespace-nowrap transition-colors ${
                  activeTab === tab.id
                    ? "bg-brand-gold text-black shadow-sm"
                    : "bg-zinc-900 text-zinc-300 hover:bg-zinc-800 hover:text-white border border-zinc-800"
                }`}
              >
                {tab.label}
              </button>
            ))}
          </nav>

          {/* Canvas com a Moldura do Dispositivo */}
          <div className="flex-1 overflow-y-auto p-4 sm:p-8 flex items-center justify-center">
            <div
              className={`${viewportWidthClass} transition-all duration-300 rounded-[28px] border-4 border-zinc-800 bg-brand-bg shadow-2xl overflow-hidden flex flex-col relative ${
                highlightTargets ? "[&_button]:ring-2 [&_button]:ring-red-500 [&_a]:ring-2 [&_a]:ring-red-500" : ""
              }`}
            >
              {/* Notch / Dynamic Island Simulator */}
              {viewport !== "responsive" && (
                <div className="w-full flex justify-center pt-2 pb-1 bg-brand-char shrink-0 z-40">
                  <div className="h-4 w-28 bg-black rounded-full" />
                </div>
              )}

              {/* Injected Error Banner */}
              {state.injectedError && (
                <div className="bg-rose-950 border-b border-rose-800 p-2.5 text-xs text-rose-200 flex items-center justify-between gap-2 z-50">
                  <span className="flex items-center gap-1.5">
                    <AlertTriangle size={14} className="text-rose-400" />
                    <strong>Erro Simulado ({state.injectedError}):</strong> A conexão oscilou ou foi rejeitada.
                  </span>
                  <button
                    type="button"
                    onClick={() => setState((prev) => ({ ...prev, injectedError: null }))}
                    className="underline text-[10px] text-rose-300 hover:text-white"
                  >
                    Fechar
                  </button>
                </div>
              )}

              {/* Conteúdo Renderizado da Tela Selecionada */}
              <div className="flex-1 overflow-y-auto p-4 space-y-4">
                {activeTab === "painel" && (
                  <SimulatedPainel
                    state={state}
                    checklist={checklistItems}
                    completedCount={completedCount}
                    isAllApproved={isAllApproved}
                    hasPendingAnalysis={hasPendingAnalysis}
                    hasNeedsAction={hasNeedsAction}
                    onNavigate={(tab) => setActiveTab(tab)}
                  />
                )}

                {activeTab === "documento" && <SimulatedDocumento state={state} onBack={() => setActiveTab("painel")} />}
                {activeTab === "endereco" && <SimulatedEndereco state={state} onBack={() => setActiveTab("painel")} />}
                {activeTab === "pix" && <SimulatedPix state={state} onBack={() => setActiveTab("painel")} />}
                {activeTab === "escolaridade" && <SimulatedEscolaridade state={state} onBack={() => setActiveTab("painel")} />}
                {activeTab === "selfie" && <SimulatedSelfie state={state} onBack={() => setActiveTab("painel")} />}
                {activeTab === "treinamento" && <SimulatedTreinamento state={state} />}
                {activeTab === "leads" && <SimulatedLeads state={state} />}
                {activeTab === "comissoes" && <SimulatedComissoes state={state} />}
                {activeTab === "ui_primitives" && <SimulatedPrimitives />}
              </div>

              {/* Bottom Nav Simulator */}
              <div className="shrink-0 border-t border-[var(--surface-border)] bg-brand-char px-4 py-2.5 flex items-center justify-around text-xs text-[var(--surface-text-muted)] z-40">
                <button
                  type="button"
                  onClick={() => setActiveTab("painel")}
                  className={`flex flex-col items-center gap-1 ${activeTab === "painel" ? "text-brand-gold-ink font-bold" : ""}`}
                >
                  <Zap size={16} /> Início
                </button>
                <button
                  type="button"
                  onClick={() => setActiveTab("leads")}
                  className={`flex flex-col items-center gap-1 ${activeTab === "leads" ? "text-brand-gold-ink font-bold" : ""}`}
                >
                  <Users size={16} /> Leads
                </button>
                <button
                  type="button"
                  onClick={() => setActiveTab("comissoes")}
                  className={`flex flex-col items-center gap-1 ${activeTab === "comissoes" ? "text-brand-gold-ink font-bold" : ""}`}
                >
                  <DollarSign size={16} /> Comissões
                </button>
                <button
                  type="button"
                  onClick={() => setActiveTab("treinamento")}
                  className={`flex flex-col items-center gap-1 ${activeTab === "treinamento" ? "text-brand-gold-ink font-bold" : ""}`}
                >
                  <BookOpen size={16} /> Treino
                </button>
              </div>
            </div>
          </div>
        </main>
      </div>
    </div>
  );
}

/* =========================================================================
 * SIMULAÇÕES DAS TELAS
 * ========================================================================= */

function SimulatedPainel({
  state,
  checklist,
  completedCount,
  isAllApproved,
  hasPendingAnalysis,
  hasNeedsAction,
  onNavigate,
}: {
  state: DevScenarioState;
  checklist: ChecklistItem[];
  completedCount: number;
  isAllApproved: boolean;
  hasPendingAnalysis: boolean;
  hasNeedsAction: boolean;
  onNavigate: (tab: ScreenTab) => void;
}) {
  const goal = state.weekGoal;
  const paid = state.paidLeads;
  const remaining = Math.max(0, goal - paid);
  const heroEmoji = paid >= goal ? "🏆" : paid >= Math.ceil(goal * 0.6) ? "⚡" : paid >= 1 ? "🔥" : "🌱";

  return (
    <div className="space-y-4">
      {/* Header com saudação e status */}
      <div className="flex items-center justify-between gap-3">
        <div className="min-w-0">
          <h1 className="font-display text-xl text-[var(--surface-text)] truncate">
            Olá, {state.userName}
          </h1>
          <p className="text-xs text-[var(--surface-text-muted)]">
            {isAllApproved ? "Promotor verificado · Saques liberados" : "Ativação instantânea · Indique e acumule"}
          </p>
        </div>
        <Badge tone={isAllApproved ? "ok" : "gold"}>{isAllApproved ? "Ativo" : "Iniciado"}</Badge>
      </div>

      {/* Link de captação */}
      <div className="rounded-[var(--radius)] border border-brand-gold/50 bg-[var(--surface)] p-3.5 space-y-2">
        <div className="flex items-center justify-between gap-2">
          <p className="text-[10px] font-bold uppercase tracking-wider text-brand-gold-ink dark:text-brand-gold-light">
            Seu link de indicação
          </p>
          <span className="text-[10px] text-brand-ok font-semibold">Liberado na hora ✓</span>
        </div>
        <ShareActions refUrl={state.refUrl} />
        <p className="text-[11px] text-[var(--surface-text-muted)]">
          Compartilhe com seus contatos. Cada matrícula confirmada é R$ 100,00 na sua conta.
        </p>
      </div>

      {/* HERO: Meta da semana (Contraste Dark corrigido) */}
      <div className="rounded-[var(--radius)] border border-brand-gold/40 bg-brand-char p-4 text-white">
        <div className="flex items-center justify-between gap-3 mb-2">
          <p className="text-[11px] font-bold uppercase tracking-[0.14em] text-brand-gold-light">Meta da semana</p>
          <p className="rounded-full bg-white/10 px-2.5 py-0.5 text-[11px] font-semibold whitespace-nowrap text-white">
            fecha em 3d 14h
          </p>
        </div>
        <p className="flex items-baseline gap-2 font-display">
          <span aria-hidden className="text-[1.5rem] leading-none">
            {heroEmoji}
          </span>
          <span className="text-2xl font-bold text-white">
            {paid}
            <span className="text-sm text-zinc-400 font-normal"> / {goal}</span>
          </span>
        </p>
        <div className="mt-2 flex gap-1.5" aria-hidden>
          {Array.from({ length: goal }, (_, i) => (
            <div
              key={i}
              className={`h-2 flex-1 rounded-full ${i < paid ? "bg-brand-gold" : "bg-white/15"}`}
            />
          ))}
        </div>
        <p className="mt-2 text-xs text-zinc-200">
          {paid >= goal
            ? `🏆 Bônus de ${formatBRL(state.bonusAmount)} garantido.`
            : `Faltam ${remaining} matrícula${remaining === 1 ? "" : "s"} pra meta.`}
        </p>

        {/* Badge Bolsa */}
        <div className="mt-3 flex items-center gap-2 rounded-lg bg-white/10 px-2.5 py-1.5 text-[11px] text-brand-gold-light border border-brand-gold/30">
          <Sparkles size={14} className="shrink-0 text-brand-gold" aria-hidden />
          <span>
            Bata 5 matrículas e ganhe <strong>R$ 1.000 no bolso + Bolsa 100% gratuita</strong>.
          </span>
        </div>
      </div>

      {/* Alerta de Loss Aversion: Reta final */}
      {remaining > 0 && paid >= 3 && (
        <div className="rounded-[var(--radius)] border border-amber-500/50 bg-amber-500/10 p-3 flex items-center justify-between gap-3">
          <div className="text-xs">
            <p className="font-bold text-amber-300">
              🔥 Você está a {remaining} matrícula{remaining > 1 ? "s" : ""} do Super Bônus de +R$ 500!
            </p>
            <p className="text-[11px] text-[var(--surface-text-muted)]">
              Não deixe seu bônus na mesa no fechamento desta sexta às 18h.
            </p>
          </div>
        </div>
      )}

      {/* Recebido × Previsto */}
      <div className="grid grid-cols-2 gap-2 text-[var(--surface-text)]">
        <div className="rounded-[var(--radius-sm)] bg-[var(--surface)] border border-[var(--surface-border)] px-3 py-2">
          <p className="text-[10px] uppercase tracking-wider text-[var(--surface-text-muted)]">Recebido</p>
          <p className="font-display text-sm tabular-nums">{formatBRL(state.totalReceived)}</p>
        </div>
        <div className="rounded-[var(--radius-sm)] bg-[var(--surface)] border border-brand-gold/30 px-3 py-2">
          <p className="text-[10px] uppercase tracking-wider text-brand-gold-ink dark:text-brand-gold-light">Previsto</p>
          <p className="font-display text-sm tabular-nums font-bold text-brand-gold">{formatBRL(paid * 100 + (paid >= goal ? 500 : 0))}</p>
        </div>
      </div>

      {/* Checklist dos Deveres */}
      {!isAllApproved && (
        <section className="auth-card space-y-3" aria-label="Deveres para liberação de saques">
          <div className="flex items-center justify-between gap-3">
            <div>
              <p className="text-xs font-semibold uppercase tracking-wide text-brand-gold-ink dark:text-brand-gold-light">Liberação de Saques</p>
              <h2 className="font-display text-base text-[var(--surface-text)]">{completedCount} de 5 deveres cumpridos</h2>
            </div>
            <Badge tone={hasNeedsAction ? "danger" : hasPendingAnalysis ? "gold" : "warn"}>
              {hasNeedsAction ? "Ajuste Necessário" : hasPendingAnalysis ? "Em Análise" : "Pendências"}
            </Badge>
          </div>

          <div
            className="h-2 overflow-hidden rounded-full bg-[var(--surface-border)]"
            role="progressbar"
            aria-valuemin={0}
            aria-valuemax={5}
            aria-valuenow={completedCount}
            aria-label={`Deveres concluídos: ${completedCount} de 5`}
          >
            <div
              className="h-full rounded-full bg-brand-gold transition-[width] duration-300 ease-out"
              style={{ width: `${(completedCount / 5) * 100}%` }}
            />
          </div>

          <p className="text-xs text-[var(--surface-text-muted)]">
            Suas comissões acumulam automaticamente. Conclua os deveres abaixo para liberar os saques via Pix toda sexta-feira.
          </p>

          <div className="space-y-2 pt-1">
            {checklist.map((item) => (
              <button
                key={item.key}
                type="button"
                onClick={() => onNavigate(item.key as ScreenTab)}
                className="w-full flex items-center justify-between gap-3 rounded-[var(--radius-sm)] border border-[var(--surface-border)] bg-[var(--surface)] p-3 text-left transition-colors hover:border-brand-gold/50 cursor-pointer"
              >
                <div className="min-w-0">
                  <p className="text-sm font-semibold text-[var(--surface-text)] flex items-center gap-1.5">
                    <span aria-hidden>{item.icon}</span> {item.label}
                  </p>
                  <p className="text-xs text-[var(--surface-text-muted)] truncate mt-0.5">{item.description}</p>
                </div>
                <div className="shrink-0">
                  <Badge
                    tone={
                      item.state === "approved"
                        ? "ok"
                        : item.state === "pending"
                          ? "gold"
                          : item.state === "needs_action"
                            ? "danger"
                            : "muted"
                    }
                  >
                    {item.badgeLabel}
                  </Badge>
                </div>
              </button>
            ))}
          </div>
        </section>
      )}
    </div>
  );
}

function SimulatedDocumento({ state, onBack }: { state: DevScenarioState; onBack: () => void }) {
  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <button type="button" onClick={onBack} className="text-xs text-brand-gold-ink underline cursor-pointer">
          ← Voltar ao painel
        </button>
        <Badge tone="gold">Etapa 1 de 5</Badge>
      </div>
      <div className="auth-card space-y-4">
        <h2 className="font-display text-lg">Seu documento (RG ou CNH)</h2>
        <p className="text-xs text-[var(--surface-text-muted)]">
          Envie foto da frente e do verso. O OCR lê os dados em segundo plano sem travar você.
        </p>
        <div className="border-2 border-dashed border-[var(--surface-border)] rounded-lg p-6 text-center space-y-2">
          <p className="text-2xl">📸</p>
          <p className="text-xs font-semibold">Tirar foto ou enviar arquivo</p>
          <p className="text-[11px] text-[var(--surface-text-muted)]">JPG, PNG ou PDF até 8MB</p>
        </div>
        <Button size="xl" className="w-full">
          Simular Envio do Documento
        </Button>
      </div>
    </div>
  );
}

function SimulatedEndereco({ state, onBack }: { state: DevScenarioState; onBack: () => void }) {
  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <button type="button" onClick={onBack} className="text-xs text-brand-gold-ink underline cursor-pointer">
          ← Voltar ao painel
        </button>
        <Badge tone="gold">Etapa 2 de 5</Badge>
      </div>
      <div className="auth-card space-y-4">
        <h2 className="font-display text-lg">Comprovante de residência</h2>
        <p className="text-xs text-[var(--surface-text-muted)]">
          Conta de luz, água ou telefone recente. Não precisa estar no seu nome se houver parentesco.
        </p>
        <div className="border-2 border-dashed border-[var(--surface-border)] rounded-lg p-6 text-center space-y-2">
          <p className="text-2xl">📄</p>
          <p className="text-xs font-semibold">Enviar foto do comprovante</p>
        </div>
        <Button size="xl" className="w-full">
          Simular Envio do Comprovante
        </Button>
      </div>
    </div>
  );
}

function SimulatedPix({ state, onBack }: { state: DevScenarioState; onBack: () => void }) {
  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <button type="button" onClick={onBack} className="text-xs text-brand-gold-ink underline cursor-pointer">
          ← Voltar ao painel
        </button>
        <Badge tone="gold">Etapa 3 de 5</Badge>
      </div>
      <div className="auth-card space-y-4">
        <h2 className="font-display text-lg">Chave Pix para Saque</h2>
        <p className="text-xs text-[var(--surface-text-muted)]">
          Onde suas comissões serão depositadas toda sexta-feira. Reconhecemos CPF, e-mail, telefone ou chave aleatória.
        </p>
        <input
          type="text"
          placeholder="Cole sua chave Pix aqui"
          defaultValue="123.456.789-00"
          className="w-full p-3 rounded bg-[var(--bg)] border border-[var(--surface-border)] text-sm"
        />
        <Button size="xl" className="w-full">
          Validar Chave Pix
        </Button>
      </div>
    </div>
  );
}

function SimulatedEscolaridade({ state, onBack }: { state: DevScenarioState; onBack: () => void }) {
  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <button type="button" onClick={onBack} className="text-xs text-brand-gold-ink underline cursor-pointer">
          ← Voltar ao painel
        </button>
        <Badge tone="gold">Etapa 4 de 5</Badge>
      </div>
      <div className="auth-card space-y-4">
        <h2 className="font-display text-lg">Sua Escolaridade</h2>
        <p className="text-xs text-[var(--surface-text-muted)]">
          Informe seu nível de ensino. O assistente de IA resume em 1 frase.
        </p>
        <div className="grid grid-cols-2 gap-2">
          {["Ensino Fundamental", "Ensino Médio Incompleto", "Ensino Médio Completo", "Superior"].map((level) => (
            <button
              key={level}
              type="button"
              className="p-3 rounded border border-[var(--surface-border)] bg-[var(--surface)] text-xs text-left hover:border-brand-gold/50"
            >
              {level}
            </button>
          ))}
        </div>
        <Button size="xl" className="w-full">
          Salvar Escolaridade
        </Button>
      </div>
    </div>
  );
}

function SimulatedSelfie({ state, onBack }: { state: DevScenarioState; onBack: () => void }) {
  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <button type="button" onClick={onBack} className="text-xs text-brand-gold-ink underline cursor-pointer">
          ← Voltar ao painel
        </button>
        <Badge tone="gold">Etapa 5 de 5</Badge>
      </div>
      <div className="auth-card space-y-4">
        <h2 className="font-display text-lg">Selfie & Acordo de Parceria</h2>
        <p className="text-xs text-[var(--surface-text-muted)]">
          Sua selfie é a assinatura digital do acordo de parceria.
        </p>
        <div className="border-2 border-dashed border-[var(--surface-border)] rounded-lg p-6 text-center space-y-2">
          <p className="text-2xl">🤳</p>
          <p className="text-xs font-semibold">Tirar selfie ao vivo</p>
        </div>
        <Button size="xl" className="w-full">
          Tirar Selfie e Assinar
        </Button>
      </div>
    </div>
  );
}

function SimulatedTreinamento({ state }: { state: DevScenarioState }) {
  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="font-display text-lg">Treinamento V7M</h2>
        <Badge tone="ok">2 de 3 Aulas</Badge>
      </div>
      <div className="space-y-2">
        <div className="p-3.5 rounded-lg border border-[var(--surface-border)] bg-[var(--surface)] space-y-1">
          <p className="text-xs font-bold text-brand-gold-ink">Módulo 1 · Introdução</p>
          <p className="text-sm font-semibold text-[var(--surface-text,#18181b)]">Como funciona o programa de promotores</p>
          <span className="text-[10px] text-emerald-400 font-semibold">Concluído ✓</span>
        </div>
        <div className="p-3.5 rounded-lg border border-brand-gold/40 bg-[var(--surface)] space-y-2">
          <p className="text-xs font-bold text-brand-gold-ink">Módulo 2 · Captação</p>
          <p className="text-sm font-semibold text-[var(--surface-text,#18181b)]">Técnicas de abordagem no WhatsApp</p>
          <Button size="md" className="w-full">
            Assistir Aula & Responder
          </Button>
        </div>
      </div>
    </div>
  );
}

function SimulatedLeads({ state }: { state: DevScenarioState }) {
  return (
    <div className="space-y-4">
      <h2 className="font-display text-lg">Seus Leads Cadastrados</h2>
      <div className="space-y-2">
        {[
          { name: "João Pedro", status: "Matrícula Paga", amount: "R$ 100,00", tone: "ok" as const },
          { name: "Camila Santos", status: "Aguardando Pagamento", amount: "Previsto", tone: "warn" as const },
          { name: "Marcos Lima", status: "Matrícula Paga", amount: "R$ 100,00", tone: "ok" as const },
        ].map((lead, i) => (
          <div key={i} className="p-3 rounded-lg border border-[var(--surface-border)] bg-[var(--surface)] flex items-center justify-between">
            <div>
              <p className="text-sm font-semibold">{lead.name}</p>
              <p className="text-xs text-[var(--surface-text-muted)]">{lead.amount}</p>
            </div>
            <Badge tone={lead.tone}>{lead.status}</Badge>
          </div>
        ))}
      </div>
    </div>
  );
}

function SimulatedComissoes({ state }: { state: DevScenarioState }) {
  return (
    <div className="space-y-4">
      <h2 className="font-display text-lg">Extrato Financeiro</h2>
      <div className="grid grid-cols-2 gap-2">
        <div className="p-3 rounded bg-[var(--surface)] border border-[var(--surface-border)]">
          <p className="text-[10px] text-[var(--surface-text-muted)] uppercase">Disponível</p>
          <p className="font-display text-base font-bold text-brand-ok">R$ 0,00</p>
        </div>
        <div className="p-3 rounded bg-[var(--surface)] border border-brand-gold/40">
          <p className="text-[10px] text-brand-gold-ink uppercase">Acumulado</p>
          <p className="font-display text-base font-bold text-brand-gold">R$ 300,00</p>
        </div>
      </div>
    </div>
  );
}

function SimulatedPrimitives() {
  return (
    <div className="space-y-4">
      <h2 className="font-display text-lg">Inventário de Primitivos UI</h2>
      <div className="space-y-3">
        <div className="space-y-1.5">
          <p className="text-xs font-bold text-zinc-400">Badges</p>
          <div className="flex flex-wrap gap-1.5">
            <Badge tone="ok">Aprovado ✓</Badge>
            <Badge tone="gold">Em Análise ⏳</Badge>
            <Badge tone="danger">Ajustar ⚠️</Badge>
            <Badge tone="warn">Pendente</Badge>
            <Badge tone="muted">Desativado</Badge>
          </div>
        </div>

        <div className="space-y-1.5">
          <p className="text-xs font-bold text-zinc-400">Botões</p>
          <div className="flex flex-wrap gap-2">
            <Button size="md">Primário MD</Button>
            <Button size="md" variant="ghost">Secundário Ghost</Button>
            <Button size="xl" loading>Carregando XL</Button>
          </div>
        </div>
      </div>
    </div>
  );
}

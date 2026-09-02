"use client";

import * as React from "react";
import Link from "next/link";
import { useQuery } from "@tanstack/react-query";
import { apiCollaborators } from "@/lib/api-collaborators";
import { useAuth } from "@/lib/auth-context";
import { PageShell } from "@/components/ui/page-shell";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Spinner } from "@/components/ui/spinner";
import { UserAvatar } from "@/components/ui/user-avatar";
import { Countdown } from "@/components/promoter/countdown";
import { ShareActions } from "@/components/promoter/share-actions";
import { PixDiagnosticDrawer } from "@/components/promoter/pix-diagnostic-drawer";
import { getFunnelChecklist } from "@/lib/candidate-funnel";
import {
  Trophy,
  Zap,
  Flame,
  Sprout,
  Sparkles,
  ArrowRight,
  ShieldCheck,
  AlertTriangle,
  Target,
  FileText,
  Home,
  KeyRound,
  GraduationCap,
  Camera,
  CheckCircle2,
  Clock,
  Share2,
  Building2,
  User as UserIcon,
  Wallet,
  Users,
} from "lucide-react";

const STEP_ICONS: Record<string, typeof FileText> = {
  document: FileText,
  selfie: Camera,
  address: Home,
  pix: KeyRound,
  education: GraduationCap,
};

export default function MinhasVendasPage() {
  const { user } = useAuth();

  const { data: me, isLoading: isLoadingPromoter } = useQuery({
    queryKey: ["promoter-me"],
    queryFn: () => apiCollaborators.getPromoterMe(),
  });

  const { data: candidateMe } = useQuery({
    queryKey: ["candidate-me"],
    queryFn: () => apiCollaborators.getCandidateMe(),
  });

  const { data: leads, isLoading: isLoadingLeads } = useQuery({
    queryKey: ["promoter-my-leads"],
    queryFn: () => apiCollaborators.listMyLeads(),
  });

  const { data: commissions } = useQuery({
    queryKey: ["promoter-my-commissions"],
    queryFn: () => apiCollaborators.listMyCommissions(),
  });

  const checklist = candidateMe ? getFunnelChecklist(candidateMe) : [];
  const completedCount = checklist.filter((item) => item.state === "approved").length;
  const isAllApproved = checklist.length > 0 && completedCount === checklist.length;
  const hasBlocks = (candidateMe?.blocks && candidateMe.blocks.length > 0) || false;

  const referralUrl =
    me?.referral_url ||
    (user?.external_id ? `https://supletivo.net.br/?ref=${user.external_id}` : "https://supletivo.net.br/?ref=v7m");

  const totalEarningsCents = me?.total_commissions_cents ?? 0;
  const totalEarnings = (totalEarningsCents / 100).toLocaleString("pt-BR", {
    style: "currency",
    currency: "BRL",
  });

  const availableEarningsCents = me?.available_commissions_cents ?? 0;
  const availableEarnings = (availableEarningsCents / 100).toLocaleString("pt-BR", {
    style: "currency",
    currency: "BRL",
  });

  // Meta da semana (5 matrículas)
  const weekGoal = 5;
  const paidLeads = leads?.filter((l) => l.status === "paid" || l.status === "enrolled")?.length ?? 0;
  const totalLeadsCount = leads?.length ?? 0;
  const pendingLeadsCount = leads?.filter((l) => l.status !== "paid" && l.status !== "enrolled")?.length ?? 0;
  const remaining = Math.max(0, weekGoal - paidLeads);
  const goalReached = paidLeads >= weekGoal;
  const bonusAmount = "R$ 500,00";

  // Previsão de Ganhos Semanal (Comissões R$ 100/lead + Bônus R$ 500 se atingir meta)
  const estimatedProjectedEarnings = (paidLeads * 100) + (goalReached ? 500 : 0);
  const projectedEarningsFormatted = estimatedProjectedEarnings.toLocaleString("pt-BR", {
    style: "currency",
    currency: "BRL",
  });

  // Data do próximo fechamento (próxima sexta às 18:00 UTC-3 / 21:00 UTC)
  const nextClosingAt = "2026-08-28T21:00:00.000Z";

  return (
    <PageShell
      title="Central de Vendas & Afiliados"
      description="Gerencie seus links de captação, acompanhe suas metas semanais e libere seus saques via PIX."
      badge={
        <div className="flex items-center gap-1.5 rounded-full bg-emerald-500/10 px-3 py-1 text-xs font-bold text-emerald-700 border border-emerald-500/30">
          <span className="size-2 rounded-full bg-emerald-500 animate-pulse" />
          <span>{isAllApproved ? "Promotor Verificado" : "Ativação Instantânea"}</span>
        </div>
      }
    >
      <div className="space-y-6 max-w-5xl">
        {/* Banner de Bloqueio se houver */}
        {hasBlocks && candidateMe?.blocks && (
          <div className="rounded-2xl border border-red-500/30 bg-red-500/5 p-4 space-y-2">
            <div className="flex items-center gap-2 text-xs font-bold text-red-700">
              <AlertTriangle className="size-4" />
              <span>Ajustes solicitados no seu cadastro</span>
            </div>
            {candidateMe.blocks.map((b) => (
              <div key={b.external_id} className="text-xs text-brand-ink flex items-center justify-between">
                <div>
                  <span className="font-semibold">{b.title}:</span> {b.description}
                </div>
                <Link href={b.action_route || "/onboarding"}>
                  <Button variant="outline" size="sm" className="text-xs h-7">
                    {b.action_label || "Regularizar"}
                  </Button>
                </Link>
              </div>
            ))}
          </div>
        )}

        {/* 1. HERO CARD: Meta da Semana, Loss Aversion & Contagem Regressiva */}
        <div className="relative overflow-hidden rounded-3xl bg-linear-to-br from-slate-950 via-slate-900 to-brand-char p-6 sm:p-7 text-white shadow-xl border border-white/10 bento-glow">
          <div className="pointer-events-none absolute -right-16 -top-16 size-64 rounded-full bg-amber-500/15 blur-3xl" />
          <div className="pointer-events-none absolute -bottom-16 -left-16 size-64 rounded-full bg-brand-blue/20 blur-3xl" />

          <div className="relative z-10 space-y-5">
            {/* Top row: Meta e Relógio */}
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
              <div className="flex items-center gap-3">
                <UserAvatar
                  name={user?.name}
                  photoUrl={user?.photo_url || user?.avatar_url}
                  size="md"
                  showStatus
                  status="online"
                  className="ring-2 ring-white/20"
                />
                <div>
                  <div className="flex items-center gap-2">
                    <span className="text-[11px] font-black uppercase tracking-widest text-amber-400">
                      Meta da Semana
                    </span>
                    {goalReached && (
                      <span className="rounded-full bg-amber-400/20 px-2 py-0.5 text-[10px] font-extrabold text-amber-300 border border-amber-400/30">
                        Meta Batida! 🏆
                      </span>
                    )}
                  </div>
                  <h2 className="text-lg sm:text-xl font-black text-white mt-0.5">
                    Olá, {user?.name ? user.name.split(" ")[0] : "Promotor"} 👋
                  </h2>
                </div>
              </div>

              <div className="inline-flex items-center gap-2 rounded-full bg-white/10 px-3 py-1.5 text-xs font-semibold backdrop-blur-md border border-white/10 text-slate-200">
                <Clock className="size-3.5 text-amber-400" />
                <span>
                  Fecha em{" "}
                  <Countdown target={nextClosingAt} urgentBelowHours={goalReached ? undefined : 24} />
                </span>
              </div>
            </div>

            {/* Middle: Barra de Progresso com Ícones Gamificados */}
            <div className="space-y-2.5">
              <div className="flex items-baseline justify-between">
                <div className="flex items-center gap-2.5">
                  <span className="text-2xl sm:text-3xl font-black text-white tracking-tight">
                    {paidLeads} <span className="text-sm font-medium text-slate-400">/ {weekGoal} matrículas</span>
                  </span>
                  <span className="text-amber-400 inline-block animate-bounce">
                    {paidLeads >= weekGoal ? (
                      <Trophy className="size-6 text-amber-400" />
                    ) : paidLeads >= 3 ? (
                      <Zap className="size-6 text-amber-400" />
                    ) : paidLeads >= 1 ? (
                      <Flame className="size-6 text-orange-400" />
                    ) : (
                      <Sprout className="size-6 text-emerald-400" />
                    )}
                  </span>
                </div>
                <span className="text-xs font-extrabold text-amber-300">
                  {goalReached ? "Super Bônus Garantido! 🎉" : `Faltam ${remaining} matrícula${remaining === 1 ? "" : "s"} para o bônus`}
                </span>
              </div>

              {/* 5 Barras Visuais */}
              <div className="grid grid-cols-5 gap-2">
                {Array.from({ length: weekGoal }, (_, i) => (
                  <div
                    key={i}
                    className={`h-2.5 rounded-full transition-all duration-500 ${
                      i < paidLeads
                        ? "bg-linear-to-r from-amber-400 to-amber-300 shadow-xs shadow-amber-400/50"
                        : "bg-white/15"
                    }`}
                  />
                ))}
              </div>
            </div>

            {/* Badge de Incentivo Bolsa + Renda Extra */}
            <div className="flex items-center gap-2.5 rounded-2xl bg-white/10 px-3.5 py-2.5 text-xs text-amber-200 backdrop-blur-md border border-white/10">
              <Sparkles className="size-4 shrink-0 text-amber-400" />
              <span>
                Bata 5 matrículas e ganhe <strong>R$ 1.000 no bolso ({bonusAmount} bônus + comissões)</strong> + <strong>Bolsa 100% gratuita</strong>.
              </span>
            </div>

            {/* Alerta de Loss Aversion na Reta Final */}
            {remaining > 0 && paidLeads >= 3 && (
              <div className="rounded-2xl border border-amber-400/40 bg-amber-400/15 p-3 flex items-center justify-between gap-3">
                <div className="text-xs">
                  <p className="font-extrabold text-amber-300">
                    🔥 Você está a {remaining} matrícula{remaining > 1 ? "s" : ""} do Super Bônus de +{bonusAmount}!
                  </p>
                  <p className="text-[11px] text-slate-300">
                    Não deixe seu dinheiro na mesa no fechamento desta sexta às 18h.
                  </p>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* 2. CENTRAL DE COMPARTILHAMENTO DO LINK (WhatsApp & QR Code) */}
        <Card className="border-brand-border shadow-md overflow-hidden bg-slate-950 text-white border-white/10">
          <CardHeader className="pb-3 border-b border-white/10">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
              <div className="flex items-center gap-2.5">
                <div className="p-2 rounded-xl bg-amber-400/20 text-amber-400">
                  <Share2 className="size-5" />
                </div>
                <div>
                  <CardTitle className="text-base text-white">Seu Link de Indicação Oficial</CardTitle>
                  <CardDescription className="text-slate-400">
                    Envie para amigos ou grupos. Cada matrícula gera R$ 100 no Pix toda sexta-feira.
                  </CardDescription>
                </div>
              </div>
              <span className="self-start sm:self-auto text-xs font-black text-amber-300 bg-amber-400/20 border border-amber-400/40 rounded-full px-3 py-1">
                R$ 100,00 / Matrícula
              </span>
            </div>
          </CardHeader>
          <CardContent className="pt-4">
            <ShareActions refUrl={referralUrl} />
          </CardContent>
        </Card>

        {/* 3. RESUMO DE GANHOS & MÉTRICAS PRINCIPAIS (SEMANAL) */}
        <div className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {/* Comissões a Receber (Semanal) */}
            <div className="rounded-2xl bg-linear-to-br from-emerald-50 to-white border border-emerald-500/30 p-4.5 shadow-sm space-y-1">
              <div className="flex items-center justify-between">
                <p className="text-[11px] font-bold uppercase tracking-wider text-emerald-700">
                  Comissões da Semana
                </p>
                <span className="text-[10px] font-extrabold px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-700 border border-emerald-500/20">
                  Sexta 18h
                </span>
              </div>
              <p className="text-2xl font-black text-emerald-600">
                {availableEarnings}
              </p>
              <p className="text-xs text-emerald-700 font-medium">
                {paidLeads} matrícula(s) paga(s)
              </p>
            </div>

            {/* Leads Captados */}
            <div className="rounded-2xl bg-white border border-brand-border p-4.5 shadow-sm space-y-1">
              <div className="flex items-center justify-between">
                <p className="text-[11px] font-bold uppercase tracking-wider text-brand-muted">
                  Leads Captados
                </p>
                <Users className="size-4 text-brand-blue" />
              </div>
              <p className="text-2xl font-black text-brand-ink">
                {totalLeadsCount}
              </p>
              <p className="text-xs text-brand-muted">
                Contatos através do seu link
              </p>
            </div>

            {/* Leads Que Faltam Pagar */}
            <div className="rounded-2xl bg-white border border-brand-border p-4.5 shadow-sm space-y-1">
              <div className="flex items-center justify-between">
                <p className="text-[11px] font-bold uppercase tracking-wider text-amber-700">
                  Faltam Pagar
                </p>
                <Clock className="size-4 text-amber-600" />
              </div>
              <p className="text-2xl font-black text-amber-600">
                {pendingLeadsCount}
              </p>
              <p className="text-xs text-brand-muted">
                Leads pendentes no checkout
              </p>
            </div>

            {/* Previsão de Ganhos */}
            <div className="rounded-2xl bg-white border border-brand-border p-4.5 shadow-sm space-y-1">
              <div className="flex items-center justify-between">
                <p className="text-[11px] font-bold uppercase tracking-wider text-indigo-700">
                  Previsão de Ganhos
                </p>
                <Trophy className="size-4 text-indigo-600" />
              </div>
              <p className="text-2xl font-black text-indigo-600">
                {projectedEarningsFormatted}
              </p>
              <p className="text-xs text-brand-muted">
                {goalReached ? "Comissões + Bônus Garantido!" : `Faltam ${remaining} para bônus de ${bonusAmount}`}
              </p>
            </div>
          </div>

          <div className="flex items-center justify-between px-1">
            <PixDiagnosticDrawer
              candidateMe={candidateMe}
              weekPaid={paidLeads}
              weekTotal={availableEarnings}
            />
            <Link
              href="/vendas/comissoes"
              className="text-xs font-bold text-brand-blue hover:underline"
            >
              Ver extrato completo de comissões &rarr;
            </Link>
          </div>
        </div>

        {/* 4. DADOS DO PERFIL & POLO VINCULADO */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {/* Card de Perfil */}
          <Card className="border-brand-border shadow-sm">
            <CardHeader className="pb-3 border-b border-brand-border/60">
              <CardTitle className="text-sm flex items-center gap-2">
                <UserIcon className="size-4 text-brand-blue" />
                Seu Perfil de Promotor
              </CardTitle>
            </CardHeader>
            <CardContent className="pt-3.5 space-y-2 text-xs">
              <div className="flex justify-between py-1 border-b border-slate-100">
                <span className="text-brand-muted">Nome:</span>
                <span className="font-semibold text-brand-ink">{user?.name || me?.name || "Promotor"}</span>
              </div>
              <div className="flex justify-between py-1 border-b border-slate-100">
                <span className="text-brand-muted">WhatsApp:</span>
                <span className="font-semibold text-brand-ink">{user?.phone || me?.phone || "—"}</span>
              </div>
              <div className="flex justify-between py-1">
                <span className="text-brand-muted">Chave Pix:</span>
                <span className="font-semibold text-brand-ink">
                  {me?.pix_key ? `${me.pix_key} (${me.pix_validated ? "Validada ✓" : "Pendente"})` : "Não cadastrada"}
                </span>
              </div>
            </CardContent>
          </Card>

          {/* Card do Polo Vinculado */}
          <Card className="border-brand-border shadow-sm">
            <CardHeader className="pb-3 border-b border-brand-border/60">
              <CardTitle className="text-sm flex items-center gap-2">
                <Building2 className="size-4 text-emerald-600" />
                Polo de Apoio Vinculado
              </CardTitle>
            </CardHeader>
            <CardContent className="pt-3.5 space-y-2 text-xs">
              <div className="flex justify-between py-1 border-b border-slate-100">
                <span className="text-brand-muted">Polo / Marca:</span>
                <span className="font-semibold text-brand-ink">{me?.hub_brand || "Polo Matriz V7M"}</span>
              </div>
              <div className="flex justify-between py-1 border-b border-slate-100">
                <span className="text-brand-muted">Código do Polo:</span>
                <span className="font-mono text-brand-ink">{me?.hub_external_id ? me.hub_external_id.slice(0, 13) + "..." : "Principal"}</span>
              </div>
              <div className="flex justify-between py-1">
                <span className="text-brand-muted">Repasse:</span>
                <span className="font-semibold text-emerald-600">Semanal (Sextas 18h)</span>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* 4. CHECKLIST DOS 5 DEVERES (Sem Bloquear Vendas) */}
        {!isAllApproved && checklist.length > 0 && (
          <Card className="border-brand-border shadow-sm">
            <CardHeader className="pb-3 border-b border-brand-border/60">
              <div className="flex items-center justify-between">
                <div>
                  <div className="flex items-center gap-2">
                    <p className="text-[11px] font-bold uppercase tracking-wider text-brand-blue">
                      Liberação de Saques
                    </p>
                    <span className="text-xs font-extrabold px-2 py-0.5 rounded-full bg-brand-blue/10 text-brand-blue">
                      {completedCount}/5 Concluídos
                    </span>
                  </div>
                  <CardTitle className="text-base mt-0.5">Deveres para Liberação de Saques</CardTitle>
                </div>
                <Link href="/onboarding">
                  <Button size="sm" className="text-xs">
                    Completar Cadastro &rarr;
                  </Button>
                </Link>
              </div>
            </CardHeader>
            <CardContent className="pt-4 space-y-4">
              {/* Barra de progresso dos deveres */}
              <div className="space-y-1.5">
                <div className="h-2 rounded-full bg-slate-100 overflow-hidden">
                  <div
                    className="h-full bg-brand-blue transition-all duration-500 rounded-full"
                    style={{ width: `${(completedCount / 5) * 100}%` }}
                  />
                </div>
                <p className="text-xs text-brand-muted">
                  Suas comissões acumulam automaticamente. Conclua os 5 itens no seu tempo para receber seus pagamentos via Pix toda semana.
                </p>
              </div>

              {/* Cards das 5 Etapas */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                {checklist.map((item) => {
                  const StepIcon = STEP_ICONS[item.key] || FileText;
                  const isApproved = item.state === "approved";
                  const isPending = item.state === "pending";

                  return (
                    <Link
                      key={item.key}
                      href={item.href}
                      className="flex items-center justify-between p-3 rounded-xl border border-brand-border/60 bg-slate-50/50 hover:bg-slate-100/70 transition"
                    >
                      <div className="flex items-center gap-2.5 min-w-0">
                        <div
                          className={`p-2 rounded-lg shrink-0 ${
                            isApproved
                              ? "bg-emerald-500/10 text-emerald-600"
                              : isPending
                                ? "bg-amber-500/10 text-amber-600"
                                : "bg-slate-200 text-slate-700"
                          }`}
                        >
                          <StepIcon className="size-4" />
                        </div>
                        <div className="min-w-0">
                          <p className="text-xs font-bold text-brand-ink truncate">{item.label}</p>
                          <p className="text-[11px] text-brand-muted truncate">{item.description}</p>
                        </div>
                      </div>

                      <span
                        className={`text-[10px] font-bold px-2 py-0.5 rounded-full shrink-0 ml-2 ${
                          isApproved
                            ? "bg-emerald-500/10 text-emerald-700"
                            : isPending
                              ? "bg-amber-500/10 text-amber-700"
                              : "bg-slate-200 text-slate-600"
                        }`}
                      >
                        {item.badgeLabel}
                      </span>
                    </Link>
                  );
                })}
              </div>
            </CardContent>
          </Card>
        )}

        {/* 5. LEADS RECENTES CAPTADOS */}
        <Card className="border-brand-border shadow-sm">
          <CardHeader className="flex flex-row items-center justify-between pb-3 border-b border-brand-border/60">
            <div>
              <CardTitle className="text-base flex items-center gap-2">
                <Target className="size-4 text-brand-blue" />
                Meus Leads & Indicações Recentes
              </CardTitle>
              <CardDescription>
                Contatos que acessaram e iniciaram matrícula pelo seu link
              </CardDescription>
            </div>
            <Link href="/vendas/leads">
              <Button variant="ghost" size="sm" className="text-xs text-brand-blue">
                Ver todos <ArrowRight className="size-3 ml-1" />
              </Button>
            </Link>
          </CardHeader>
          <CardContent className="pt-4">
            {isLoadingLeads ? (
              <div className="py-8 flex justify-center">
                <Spinner />
              </div>
            ) : !leads || leads.length === 0 ? (
              <div className="text-center py-8 text-xs text-brand-muted space-y-2">
                <p className="font-semibold text-brand-ink">Nenhum lead captado ainda.</p>
                <p>Compartilhe seu link de indicação no WhatsApp para começar a acumular comissões!</p>
              </div>
            ) : (
              <div className="divide-y divide-brand-border/50">
                {leads.slice(0, 5).map((lead) => (
                  <div
                    key={lead.external_id}
                    className="flex items-center justify-between py-3 hover:bg-slate-50/50 px-2 rounded-lg transition"
                  >
                    <div className="space-y-0.5">
                      <span className="font-bold text-xs text-brand-ink">
                        {lead.name || "Lead Sem Nome"}
                      </span>
                      <p className="text-[11px] text-brand-muted">
                        {lead.phone || "—"} • {new Date(lead.created_at).toLocaleDateString("pt-BR")}
                      </p>
                    </div>
                    <span
                      className={`text-[10px] font-bold px-2.5 py-0.5 rounded-full ${
                        lead.status === "paid" || lead.status === "enrolled"
                          ? "bg-emerald-500/10 text-emerald-700 border border-emerald-500/30"
                          : "bg-slate-100 text-slate-700"
                      }`}
                    >
                      {lead.status === "paid" || lead.status === "enrolled"
                        ? "Matrícula Paga ✓"
                        : lead.status}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </PageShell>
  );
}

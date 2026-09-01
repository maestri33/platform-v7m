"use client";

import * as React from "react";
import Link from "next/link";
import { useQuery } from "@tanstack/react-query";
import { apiCollaborators } from "@/lib/api-collaborators";
import { useAuth } from "@/lib/auth-context";
import { PageShell } from "@/components/ui/page-shell";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Spinner } from "@/components/ui/spinner";
import { ShareActions } from "@/components/promoter/share-actions";
import { CopyButton } from "@/components/ui/copy-button";
import {
  Trophy,
  Zap,
  ArrowRight,
  Users,
  Wallet,
  BookOpen,
  Share2,
  TrendingUp,
} from "lucide-react";

export default function PromoterDashboardPage() {
  const { user } = useAuth();

  const { data: me, isLoading: isLoadingPromoter } = useQuery({
    queryKey: ["promoter-me"],
    queryFn: () => apiCollaborators.getPromoterMe(),
  });

  const { data: leads, isLoading: isLoadingLeads } = useQuery({
    queryKey: ["promoter-my-leads"],
    queryFn: () => apiCollaborators.listMyLeads(),
  });

  const { data: commissions } = useQuery({
    queryKey: ["promoter-my-commissions"],
    queryFn: () => apiCollaborators.listMyCommissions(),
  });

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

  const pendingEarningsCents = me?.pending_commissions_cents ?? 0;
  const pendingEarnings = (pendingEarningsCents / 100).toLocaleString("pt-BR", {
    style: "currency",
    currency: "BRL",
  });

  const totalLeads = leads?.length ?? 0;
  const paidLeads = leads?.filter((l) => l.status === "paid" || l.status === "enrolled")?.length ?? 0;

  if (isLoadingPromoter) {
    return (
      <PageShell title="Portal do Promotor" subtitle="Carregando seus dados...">
        <div className="flex justify-center py-16">
          <Spinner />
        </div>
      </PageShell>
    );
  }

  return (
    <PageShell
      title="Portal do Promotor"
      subtitle="Divulgue seu link, acompanhe seus leads e gerencie seus ganhos."
    >
      <div className="flex flex-col gap-4 max-w-4xl mx-auto">
        {/* Card do Link de Indicação — Destaque Mobile First */}
        <Card className="border-brand-blue/20 bg-gradient-to-br from-brand-blue/10 via-brand-surface to-brand-surface shadow-xs">
          <CardHeader className="pb-2">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold uppercase tracking-wider text-brand-blue flex items-center gap-1.5">
                <Share2 className="size-3.5" />
                Seu Link Exclusivo de Vendas
              </span>
              {me?.hub_brand && (
                <span className="text-xs font-semibold text-brand-muted">
                  Polo: {me.hub_brand}
                </span>
              )}
            </div>
            <CardTitle className="text-lg font-bold text-brand-ink">
              Compartilhe e Ganhe por Matrícula
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="flex items-center gap-2 rounded-xl border border-brand-border bg-white p-2 text-xs">
              <span className="truncate font-mono text-brand-ink flex-1 px-1 select-all">
                {referralUrl}
              </span>
              <CopyButton text={referralUrl} />
            </div>
            <ShareActions refUrl={referralUrl} />
          </CardContent>
        </Card>

        {/* Métricas Principais (Grid Responsivo 2x2 no mobile) */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          <Card className="p-3.5 flex flex-col justify-between">
            <span className="text-xs font-semibold text-brand-muted flex items-center gap-1">
              <Wallet className="size-3.5 text-emerald-600" />
              Disponível
            </span>
            <span className="text-lg sm:text-xl font-extrabold text-emerald-600 mt-1">
              {availableEarnings}
            </span>
            <Link
              href="/promoter/comissoes"
              className="text-[11px] font-bold text-brand-blue hover:underline mt-2 flex items-center gap-0.5"
            >
              Extrato <ArrowRight className="size-3" />
            </Link>
          </Card>

          <Card className="p-3.5 flex flex-col justify-between">
            <span className="text-xs font-semibold text-brand-muted flex items-center gap-1">
              <TrendingUp className="size-3.5 text-amber-500" />
              A Liberar
            </span>
            <span className="text-lg sm:text-xl font-extrabold text-brand-ink mt-1">
              {pendingEarnings}
            </span>
            <span className="text-[11px] text-brand-muted mt-2">
              Em processamento
            </span>
          </Card>

          <Card className="p-3.5 flex flex-col justify-between">
            <span className="text-xs font-semibold text-brand-muted flex items-center gap-1">
              <Users className="size-3.5 text-brand-blue" />
              Meus Leads
            </span>
            <span className="text-lg sm:text-xl font-extrabold text-brand-ink mt-1">
              {totalLeads}
            </span>
            <Link
              href="/promoter/leads"
              className="text-[11px] font-bold text-brand-blue hover:underline mt-2 flex items-center gap-0.5"
            >
              Ver todos <ArrowRight className="size-3" />
            </Link>
          </Card>

          <Card className="p-3.5 flex flex-col justify-between">
            <span className="text-xs font-semibold text-brand-muted flex items-center gap-1">
              <Trophy className="size-3.5 text-purple-600" />
              Matrículas
            </span>
            <span className="text-lg sm:text-xl font-extrabold text-purple-600 mt-1">
              {paidLeads}
            </span>
            <span className="text-[11px] text-brand-muted mt-2">
              Total confirmadas
            </span>
          </Card>
        </div>

        {/* Acesso Rápido aos Módulos do Promotor */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          <Link href="/promoter/leads" className="group">
            <Card className="p-4 transition hover:border-brand-blue hover:shadow-xs flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="size-10 rounded-xl bg-blue-50 flex items-center justify-center text-brand-blue">
                  <Users className="size-5" />
                </div>
                <div>
                  <h4 className="text-sm font-bold text-brand-ink group-hover:text-brand-blue">
                    Gerenciar Leads
                  </h4>
                  <p className="text-xs text-brand-muted">Acompanhe contatos e status</p>
                </div>
              </div>
              <ArrowRight className="size-4 text-brand-muted group-hover:text-brand-blue group-hover:translate-x-0.5 transition" />
            </Card>
          </Link>

          <Link href="/promoter/comissoes" className="group">
            <Card className="p-4 transition hover:border-brand-blue hover:shadow-xs flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="size-10 rounded-xl bg-emerald-50 flex items-center justify-center text-emerald-600">
                  <Wallet className="size-5" />
                </div>
                <div>
                  <h4 className="text-sm font-bold text-brand-ink group-hover:text-emerald-600">
                    Comissões & PIX
                  </h4>
                  <p className="text-xs text-brand-muted">Extrato e dados de recebimento</p>
                </div>
              </div>
              <ArrowRight className="size-4 text-brand-muted group-hover:text-emerald-600 group-hover:translate-x-0.5 transition" />
            </Card>
          </Link>

          <Link href="/promoter/treino" className="group">
            <Card className="p-4 transition hover:border-brand-blue hover:shadow-xs flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="size-10 rounded-xl bg-amber-50 flex items-center justify-center text-amber-600">
                  <BookOpen className="size-5" />
                </div>
                <div>
                  <h4 className="text-sm font-bold text-brand-ink group-hover:text-amber-600">
                    Treinamentos
                  </h4>
                  <p className="text-xs text-brand-muted">Materiais de vendas e dicas</p>
                </div>
              </div>
              <ArrowRight className="size-4 text-brand-muted group-hover:text-amber-600 group-hover:translate-x-0.5 transition" />
            </Card>
          </Link>
        </div>
      </div>
    </PageShell>
  );
}

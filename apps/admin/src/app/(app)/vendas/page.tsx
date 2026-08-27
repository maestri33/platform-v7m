"use client";

import * as React from "react";
import Link from "next/link";
import { useQuery } from "@tanstack/react-query";
import { apiCollaborators } from "@/lib/api-collaborators";
import { useAuth } from "@/lib/auth-context";
import { PageShell } from "@/components/ui/page-shell";
import { StatCard } from "@/components/ui/stat-card";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { CopyButton } from "@/components/ui/copy-button";
import { QRCodeDialog } from "@/components/ui/qr-code-dialog";
import { Spinner } from "@/components/ui/spinner";
import {
  Rocket,
  DollarSign,
  Users,
  Target,
  Trophy,
  Share2,
  Sparkles,
  ArrowRight,
  GraduationCap,
} from "lucide-react";

export default function MinhasVendasPage() {
  const { user } = useAuth();

  const { data: me, isLoading } = useQuery({
    queryKey: ["promoter-me"],
    queryFn: () => apiCollaborators.getPromoterMe(),
  });

  const { data: leads } = useQuery({
    queryKey: ["promoter-my-leads"],
    queryFn: () => apiCollaborators.listMyLeads(),
  });

  const { data: commissions } = useQuery({
    queryKey: ["promoter-my-commissions"],
    queryFn: () => apiCollaborators.listMyCommissions(),
  });

  const referralUrl =
    me?.referral_url ||
    (user?.external_id ? `https://supletivo.net.br/?ref=${user.external_id}` : "");

  const totalEarnings = ((me?.total_commissions_cents || 0) / 100).toLocaleString("pt-BR", {
    style: "currency",
    currency: "BRL",
  });

  const availableEarnings = ((me?.available_commissions_cents || 0) / 100).toLocaleString(
    "pt-BR",
    { style: "currency", currency: "BRL" }
  );

  const pendingEarnings = ((me?.pending_commissions_cents || 0) / 100).toLocaleString("pt-BR", {
    style: "currency",
    currency: "BRL",
  });

  const totalSalesCount = me?.total_sales ?? leads?.filter((l) => l.status === "enrolled" || l.status === "paid").length ?? 0;

  return (
    <PageShell
      title="Minhas Vendas & Links"
      description="Gerencie seus links de captação, acompanhe suas comissões e acesse seus materiais."
      badge={
        <div className="flex items-center gap-1.5 rounded-full bg-emerald-500/10 px-3 py-1 text-xs font-semibold text-emerald-600 border border-emerald-500/30">
          <Rocket className="size-3.5" />
          <span>Promotor Ativo</span>
        </div>
      }
    >
      <div className="space-y-6">
        {/* KPI Stat Cards */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <StatCard
            label="Total Acumulado"
            value={totalEarnings}
            icon={DollarSign}
            tone="green"
          />
          <StatCard
            label="Disponível p/ Repasse"
            value={availableEarnings}
            sublabel="Fechamento toda sexta 18h"
            icon={Sparkles}
            tone="blue"
          />
          <StatCard
            label="Matrículas Pagas"
            value={totalSalesCount}
            icon={Trophy}
            tone="amber"
          />
          <StatCard
            label="Meus Leads"
            value={leads?.length || 0}
            icon={Users}
            tone="blue"
          />
        </div>

        {/* Central de Compartilhamento do Link de Afiliado */}
        {referralUrl && (
          <Card className="border-emerald-500/40 bg-linear-to-r from-emerald-500/5 via-white to-white shadow-2xs">
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className="p-2 rounded-lg bg-emerald-500/10 text-emerald-600">
                    <Share2 className="size-5" />
                  </div>
                  <div>
                    <CardTitle className="text-base">Seu Link de Indicação Oficial</CardTitle>
                    <CardDescription>
                      Compartilhe este link com potenciais alunos. Cada matrícula confirmada gera comissão na sua conta.
                    </CardDescription>
                  </div>
                </div>
                <span className="text-xs font-bold text-emerald-600 bg-emerald-500/10 border border-emerald-500/30 rounded-full px-2.5 py-0.5">
                  R$ 100 / Matrícula
                </span>
              </div>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2">
                <div className="flex-1 rounded-xl bg-slate-50 border border-brand-border px-3.5 py-2 text-xs font-mono text-brand-ink truncate select-all">
                  {referralUrl}
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  <CopyButton text={referralUrl} label="Copiar Link" />
                  <QRCodeDialog url={referralUrl} label="QR Code do Promotor" />
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Últimos Leads Captados */}
          <Card className="shadow-2xs">
            <CardHeader className="flex flex-row items-center justify-between pb-3">
              <div>
                <CardTitle className="text-base flex items-center gap-2">
                  <Target className="size-4 text-brand-blue" />
                  Meus Leads Recentes
                </CardTitle>
                <CardDescription>
                  Contatos que acessaram seu link de indicação
                </CardDescription>
              </div>
              <Link href="/vendas/leads">
                <Button variant="ghost" size="sm" className="text-xs text-brand-blue">
                  Ver todos <ArrowRight className="size-3 ml-1" />
                </Button>
              </Link>
            </CardHeader>
            <CardContent>
              {isLoading ? (
                <div className="py-8 flex justify-center">
                  <Spinner />
                </div>
              ) : !leads || leads.length === 0 ? (
                <div className="text-center py-6 text-xs text-brand-muted">
                  Nenhum lead captado ainda. Compartilhe seu link para começar a gerar vendas!
                </div>
              ) : (
                <div className="space-y-2">
                  {leads.slice(0, 5).map((lead) => (
                    <div
                      key={lead.external_id}
                      className="flex items-center justify-between p-3 rounded-xl border border-brand-border/60 bg-white hover:bg-slate-50 transition"
                    >
                      <div className="space-y-0.5">
                        <span className="font-semibold text-sm text-brand-ink">
                          {lead.name || "Lead Sem Nome"}
                        </span>
                        <p className="text-xs text-brand-muted">
                          {lead.phone || "—"} • {new Date(lead.created_at).toLocaleDateString("pt-BR")}
                        </p>
                      </div>
                      <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-slate-100 text-slate-700">
                        {lead.status}
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>

          {/* Extrato Recente de Comissões */}
          <Card className="shadow-2xs">
            <CardHeader className="flex flex-row items-center justify-between pb-3">
              <div>
                <CardTitle className="text-base flex items-center gap-2">
                  <DollarSign className="size-4 text-emerald-600" />
                  Últimas Comissões
                </CardTitle>
                <CardDescription>
                  Previsão de pagamento e histórico de repasses
                </CardDescription>
              </div>
              <Link href="/vendas/comissoes">
                <Button variant="ghost" size="sm" className="text-xs text-brand-blue">
                  Extrato completo <ArrowRight className="size-3 ml-1" />
                </Button>
              </Link>
            </CardHeader>
            <CardContent>
              {!commissions || commissions.length === 0 ? (
                <div className="text-center py-6 text-xs text-brand-muted">
                  Nenhuma comissão registrada até o momento.
                </div>
              ) : (
                <div className="space-y-2">
                  {commissions.slice(0, 5).map((c) => (
                    <div
                      key={c.external_id}
                      className="flex items-center justify-between p-3 rounded-xl border border-brand-border/60 bg-white"
                    >
                      <div className="space-y-0.5">
                        <span className="font-semibold text-sm text-brand-ink">
                          {c.student_name || "Comissão de Matrícula"}
                        </span>
                        <p className="text-xs text-brand-muted">
                          {new Date(c.created_at).toLocaleDateString("pt-BR")}
                        </p>
                      </div>
                      <div className="text-right">
                        <span className="font-bold text-sm text-emerald-600">
                          {c.amount_formatted || `R$ ${(c.amount_cents / 100).toFixed(2)}`}
                        </span>
                        <p className="text-[11px] text-brand-muted">{c.status}</p>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </PageShell>
  );
}

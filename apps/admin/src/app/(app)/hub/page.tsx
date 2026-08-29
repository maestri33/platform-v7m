"use client";

import * as React from "react";
import Link from "next/link";
import { useQuery } from "@tanstack/react-query";
import { apiLeadership } from "@/lib/api-leadership";
import { PageShell } from "@/components/ui/page-shell";
import { StatCard } from "@/components/ui/stat-card";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { StatusPill } from "@/components/ui/status-pill";
import { RiskBadge } from "@/components/common/risk-badge";
import { Spinner } from "@/components/ui/spinner";
import { evaluateReviewRisk, sortReviewsByRisk, type ReviewItem } from "@/lib/risk-analysis";
import {
  Inbox,
  GraduationCap,
  Users,
  Target,
  ArrowRight,
  Building2,
  AlertTriangle,
} from "lucide-react";

export default function HubDashboardPage() {
  const { data: leads, isLoading: loadingLeads } = useQuery({
    queryKey: ["hub-leads"],
    queryFn: () => apiLeadership.listLeads(),
  });

  const { data: enrollments, isLoading: loadingEnrollments } = useQuery({
    queryKey: ["hub-enrollments"],
    queryFn: () => apiLeadership.listEnrollments(),
  });

  const { data: reviews, isLoading: loadingReviews } = useQuery({
    queryKey: ["hub-reviews"],
    queryFn: () => apiLeadership.listReviews(),
  });

  const { data: promoters, isLoading: loadingPromoters } = useQuery({
    queryKey: ["hub-promoters"],
    queryFn: () => apiLeadership.listPromoters(),
  });

  const allReviews = React.useMemo(() => {
    if (!reviews) return [];
    const list: ReviewItem[] = [
      ...(reviews.enrollment_rg || []),
      ...(reviews.enrollment_selfie || []),
      ...(reviews.candidate_document || []),
      ...(reviews.candidate_selfie || []),
      ...(reviews.student_documents || []),
      ...(reviews.candidates_awaiting_approval || []),
      ...(reviews.locked_promoters || []),
    ];
    return sortReviewsByRisk(list);
  }, [reviews]);

  const totalReviewsCount = allReviews.length;
  const criticalReviewsCount = allReviews.filter(
    (r) => evaluateReviewRisk(r).level === "critical"
  ).length;

  return (
    <PageShell
      title="Visão Geral do Polo Regional"
      description="Painel operacional e métricas consolidadas da liderança regional."
      badge={
        <div className="flex items-center gap-1.5 rounded-full bg-brand-blue-bg px-3 py-1 text-xs font-semibold text-brand-blue border border-brand-blue/20">
          <Building2 className="h-3.5 w-3.5" />
          <span>Gestão do Polo</span>
        </div>
      }
      actions={
        <Link href="/hub/inbox">
          <Button variant="default" size="sm" className="gap-1.5 shadow-2xs">
            <Inbox className="h-4 w-4" />
            <span>Revisões ({totalReviewsCount})</span>
          </Button>
        </Link>
      }
    >
      <div className="space-y-6">
        {/* KPI Stat Cards */}
        <div id="stats" className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <StatCard
            label="Leads do Polo"
            value={leads?.length ?? (loadingLeads ? "..." : 0)}
            icon={Target}
            tone="blue"
          />
          <StatCard
            label="Matrículas do Polo"
            value={enrollments?.length ?? (loadingEnrollments ? "..." : 0)}
            icon={GraduationCap}
            tone="green"
          />
          <StatCard
            label="Revisões Pendentes"
            value={totalReviewsCount}
            sublabel={criticalReviewsCount > 0 ? `${criticalReviewsCount} críticas` : undefined}
            icon={Inbox}
            tone={criticalReviewsCount > 0 ? "danger" : "amber"}
          />
          <StatCard
            label="Promotores Ativos"
            value={promoters?.length ?? (loadingPromoters ? "..." : 0)}
            icon={Users}
            tone="blue"
          />
        </div>

        {/* Alerta de Risco */}
        {criticalReviewsCount > 0 && (
          <div className="flex items-center justify-between rounded-xl border border-brand-amber/40 bg-brand-amber-bg/50 p-4 text-sm text-brand-ink">
            <div className="flex items-center gap-3">
              <div className="rounded-lg bg-brand-amber/20 p-2 text-brand-amber">
                <AlertTriangle className="h-5 w-5" />
              </div>
              <div>
                <p className="font-semibold text-sm">
                  {criticalReviewsCount} item(ns) de alta prioridade na Central de Revisões do Polo
                </p>
                <p className="text-xs text-brand-muted">
                  A triagem de IA identificou divergências em documentos ou biometria facial que requerem atenção.
                </p>
              </div>
            </div>
            <Link href="/hub/inbox">
              <Button variant="outline" size="sm" className="shrink-0 bg-white">
                Revisar agora
              </Button>
            </Link>
          </div>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Fila de Revisões */}
          <Card className="shadow-2xs">
            <CardHeader className="flex flex-row items-center justify-between pb-3">
              <div>
                <CardTitle className="text-base flex items-center gap-2">
                  <Inbox className="h-4 w-4 text-brand-blue" />
                  Fila de Revisões
                </CardTitle>
                <CardDescription>
                  Ordenadas por risco e urgência com triagem assistiva
                </CardDescription>
              </div>
              <Link href="/hub/inbox">
                <Button variant="ghost" size="sm" className="text-xs text-brand-blue">
                  Ver todas <ArrowRight className="h-3 w-3 ml-1" />
                </Button>
              </Link>
            </CardHeader>
            <CardContent>
              <div id="reviews-preview" className="space-y-2">
                {loadingReviews ? (
                  <div className="py-8 flex justify-center">
                    <Spinner />
                  </div>
                ) : allReviews.length === 0 ? (
                  <div className="text-center py-6 text-xs text-brand-muted">
                    Nenhuma revisão pendente no momento.
                  </div>
                ) : (
                  allReviews.slice(0, 5).map((item, idx) => {
                    const risk = evaluateReviewRisk(item);
                    return (
                      <div
                        key={`${item.external_id}-${idx}`}
                        className="flex items-center justify-between p-3 rounded-xl border border-brand-border/60 bg-white hover:bg-brand-bg/60 transition-colors"
                      >
                        <div className="space-y-1">
                          <div className="flex items-center gap-2">
                            <span className="font-semibold text-sm text-brand-ink">
                              {item.name || item.doc_type || "Revisão RG"}
                            </span>
                            <RiskBadge level={risk.level} />
                          </div>
                          <p className="text-xs text-brand-muted">
                            Tipo: <strong>{item.kind || item.type || "Documento"}</strong>
                          </p>
                        </div>
                        <Link href="/hub/inbox">
                          <Button variant="outline" size="sm" className="text-xs h-8">
                            Analisar
                          </Button>
                        </Link>
                      </div>
                    );
                  })
                )}
              </div>
            </CardContent>
          </Card>

          {/* Últimas Matrículas */}
          <Card className="shadow-2xs">
            <CardHeader className="flex flex-row items-center justify-between pb-3">
              <div>
                <CardTitle className="text-base flex items-center gap-2">
                  <GraduationCap className="h-4 w-4 text-brand-green-dark" />
                  Últimas Matrículas do Polo
                </CardTitle>
                <CardDescription>
                  Conversões e status de pagamento dos alunos
                </CardDescription>
              </div>
              <Link href="/hub/matriculas">
                <Button variant="ghost" size="sm" className="text-xs text-brand-blue">
                  Ver todas <ArrowRight className="h-3 w-3 ml-1" />
                </Button>
              </Link>
            </CardHeader>
            <CardContent>
              <div id="enrollments-preview" className="space-y-2">
                {loadingEnrollments ? (
                  <div className="py-8 flex justify-center">
                    <Spinner />
                  </div>
                ) : !enrollments || enrollments.length === 0 ? (
                  <div className="text-center py-6 text-xs text-brand-muted">
                    Nenhuma matrícula recente no polo.
                  </div>
                ) : (
                  enrollments.slice(0, 5).map((enr) => (
                    <div
                      key={enr.external_id}
                      className="flex items-center justify-between p-3 rounded-xl border border-brand-border/60 bg-white hover:bg-brand-bg/60 transition-colors"
                    >
                      <div className="space-y-1">
                        <span className="font-semibold text-sm text-brand-ink">
                          {enr.student_name || "Matrícula Sem Nome"}
                        </span>
                        <p className="text-xs text-brand-muted">
                          Promotor: {enr.promoter_name || "Direto"}
                        </p>
                      </div>
                      <StatusPill status={enr.status} />
                    </div>
                  ))
                )}
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </PageShell>
  );
}

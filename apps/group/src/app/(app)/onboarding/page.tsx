"use client";

import * as React from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useQuery } from "@tanstack/react-query";
import { apiCollaborators } from "@/lib/api-collaborators";
import {
  getFunnelChecklist,
  candidateStageHref,
  type ChecklistStepKey,
} from "@/lib/candidate-funnel";
import { PageShell } from "@/components/ui/page-shell";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Spinner } from "@/components/ui/spinner";
import {
  FileText,
  Home,
  KeyRound,
  GraduationCap,
  Camera,
  ArrowRight,
  ShieldCheck,
  CheckCircle2,
  Clock,
  AlertCircle,
  Sparkles,
} from "lucide-react";

const STEP_ICONS: Record<ChecklistStepKey, React.ComponentType<{ className?: string }>> = {
  documents: FileText,
  address: Home,
  pix: KeyRound,
  education: GraduationCap,
  selfie: Camera,
};

export default function OnboardingHubPage() {
  const router = useRouter();

  const { data: me, isLoading, refetch } = useQuery({
    queryKey: ["candidate-me"],
    queryFn: () => apiCollaborators.getCandidateMe(),
  });

  const checklist = me ? getFunnelChecklist(me) : [];
  const completedCount = checklist.filter((item) => item.state === "approved").length;
  const isAllApproved = checklist.length > 0 && completedCount === checklist.length;
  const nextTarget = me ? candidateStageHref(me) : "/onboarding/documento";

  const handleContinue = () => {
    router.push(nextTarget);
  };

  return (
    <PageShell
      title="Ativação de Promotor & KYC"
      description="Conclua a verificação dos seus dados para liberar saques semanais de comissões via PIX."
      badge={
        <div className="flex items-center gap-1.5 rounded-full bg-brand-blue/10 px-3 py-1 text-xs font-semibold text-brand-blue border border-brand-blue/20">
          <ShieldCheck className="size-3.5" />
          <span>{isAllApproved ? "Verificação Concluída" : "Cadastro em Andamento"}</span>
        </div>
      }
    >
      <div className="max-w-3xl mx-auto space-y-6">
        {isLoading ? (
          <div className="py-16 flex flex-col items-center justify-center gap-3">
            <Spinner />
            <p className="text-xs text-brand-muted">Carregando status cadastral…</p>
          </div>
        ) : (
          <>
            {/* Hero Card com Progresso */}
            <Card className="border-brand-blue/30 bg-linear-to-br from-brand-blue-bg/40 via-white to-white shadow-2xs">
              <CardHeader className="pb-3">
                <div className="flex items-center justify-between">
                  <div className="space-y-1">
                    <CardTitle className="text-lg flex items-center gap-2">
                      <Sparkles className="size-5 text-brand-gold" />
                      {completedCount} de 5 Deveres Concluídos
                    </CardTitle>
                    <CardDescription>
                      {isAllApproved
                        ? "Todos os seus dados foram verificados com sucesso! Seus saques estão totalmente liberados."
                        : "Suas vendas continuam acumulando normalmente. Conclua os passos para liberação de repasses."}
                    </CardDescription>
                  </div>
                  {!isAllApproved && (
                    <Button onClick={handleContinue} className="shrink-0">
                      Continuar <ArrowRight className="size-4 ml-1.5" />
                    </Button>
                  )}
                </div>
              </CardHeader>
              <CardContent className="space-y-3">
                <div
                  className="h-2.5 overflow-hidden rounded-full bg-slate-100 border border-brand-border/60"
                  role="progressbar"
                  aria-valuemin={0}
                  aria-valuemax={5}
                  aria-valuenow={completedCount}
                >
                  <div
                    className="h-full rounded-full bg-brand-blue transition-all duration-500"
                    style={{ width: `${(completedCount / 5) * 100}%` }}
                  />
                </div>
              </CardContent>
            </Card>

            {/* Lista dos 5 Deveres Cadastrais */}
            <div className="space-y-3">
              <h2 className="text-sm font-bold uppercase tracking-wider text-brand-muted">
                Etapas de Verificação
              </h2>

              {checklist.map((item) => {
                const StepIcon = STEP_ICONS[item.key] || FileText;

                return (
                  <Link
                    key={item.key}
                    href={item.href}
                    className="flex items-center justify-between gap-4 p-4 rounded-xl border border-brand-border bg-white hover:border-brand-blue/50 hover:bg-slate-50/70 transition shadow-2xs group"
                  >
                    <div className="flex items-start gap-3.5 min-w-0">
                      <div className="mt-0.5 p-2 rounded-xl bg-brand-blue/10 text-brand-blue shrink-0 group-hover:scale-105 transition-transform">
                        <StepIcon className="size-5" />
                      </div>
                      <div className="min-w-0 space-y-0.5">
                        <p className="text-sm font-bold text-brand-ink truncate">
                          {item.label}
                        </p>
                        <p className="text-xs text-brand-muted truncate">
                          {item.description}
                        </p>
                      </div>
                    </div>

                    <div className="flex items-center gap-2 shrink-0">
                      {item.state === "approved" && (
                        <span className="flex items-center gap-1 text-xs font-semibold px-2.5 py-1 rounded-full bg-emerald-500/10 text-emerald-600 border border-emerald-500/30">
                          <CheckCircle2 className="size-3.5" />
                          Aprovado
                        </span>
                      )}
                      {item.state === "pending" && (
                        <span className="flex items-center gap-1 text-xs font-semibold px-2.5 py-1 rounded-full bg-amber-500/10 text-amber-600 border border-amber-500/30">
                          <Clock className="size-3.5" />
                          Em Análise
                        </span>
                      )}
                      {item.state === "needs_action" && (
                        <span className="flex items-center gap-1 text-xs font-semibold px-2.5 py-1 rounded-full bg-red-500/10 text-red-600 border border-red-500/30">
                          <AlertCircle className="size-3.5" />
                          Ajustar
                        </span>
                      )}
                      {item.state === "todo" && (
                        <span className="text-xs font-semibold px-2.5 py-1 rounded-full bg-slate-100 text-slate-600">
                          Pendente
                        </span>
                      )}
                      <ArrowRight className="size-4 text-brand-muted group-hover:text-brand-blue group-hover:translate-x-0.5 transition" />
                    </div>
                  </Link>
                );
              })}
            </div>

            <div className="pt-2 text-center">
              <Link
                href="/vendas"
                className="text-xs font-medium text-brand-blue hover:underline inline-flex items-center gap-1"
              >
                Voltar para o Painel de Vendas <ArrowRight className="size-3" />
              </Link>
            </div>
          </>
        )}
      </div>
    </PageShell>
  );
}

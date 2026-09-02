"use client";

import * as React from "react";
import Link from "next/link";
import { type CandidateMe } from "@/lib/api-collaborators";
import { getFunnelChecklist, candidateStageHref, type ChecklistStepKey } from "@/lib/candidate-funnel";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
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
  Zap,
} from "lucide-react";

const STEP_ICONS: Record<ChecklistStepKey, React.ComponentType<{ className?: string }>> = {
  documents: FileText,
  address: Home,
  pix: KeyRound,
  education: GraduationCap,
  selfie: Camera,
};

interface KycProgressBannerProps {
  candidateMe: CandidateMe | null | undefined;
}

export function KycProgressBanner({ candidateMe }: KycProgressBannerProps) {
  const checklist = candidateMe ? getFunnelChecklist(candidateMe) : [];
  const completedCount = checklist.filter((item) => item.state === "approved").length;
  const isAllApproved = checklist.length > 0 && completedCount === checklist.length;
  const nextTarget = candidateMe ? candidateStageHref(candidateMe) : "/onboarding";

  if (isAllApproved) {
    return (
      <div className="relative overflow-hidden rounded-2xl border border-emerald-500/30 bg-linear-to-r from-emerald-500/10 via-emerald-500/5 to-transparent p-4 text-emerald-950 shadow-xs">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-emerald-500/20 text-emerald-600">
              <ShieldCheck className="size-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-xs font-black uppercase tracking-wider text-emerald-700">
                  Conta Verificada & Ativa
                </span>
                <span className="flex size-2 rounded-full bg-emerald-500" />
              </div>
              <p className="text-sm font-semibold text-emerald-900 mt-0.5">
                Seus dados cadastrais e chave PIX foram aprovados. Saques semanais 100% liberados!
              </p>
            </div>
          </div>
          <Link href="/onboarding" className="shrink-0">
            <Button
              variant="outline"
              size="sm"
              className="text-xs font-bold border-emerald-500/40 text-emerald-800 hover:bg-emerald-500/10"
            >
              Ver Cadastro <ArrowRight className="size-3.5 ml-1" />
            </Button>
          </Link>
        </div>
      </div>
    );
  }

  return (
    <Card className="border-brand-blue/30 bg-linear-to-br from-brand-blue-bg/50 via-white to-white shadow-sm overflow-hidden">
      <CardContent className="p-5 sm:p-6 space-y-4">
        {/* Header do Alerta */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <span className="inline-flex items-center gap-1.5 rounded-full bg-brand-blue/10 px-2.5 py-0.5 text-[11px] font-black uppercase tracking-wider text-brand-blue border border-brand-blue/20">
                <Zap className="size-3" />
                Ativação em Andamento
              </span>
              <span className="text-xs font-extrabold text-brand-ink">
                {completedCount} de 5 deveres concluídos
              </span>
            </div>
            <h3 className="text-base font-extrabold text-brand-ink">
              Libere seus saques semanais via PIX
            </h3>
            <p className="text-xs text-brand-muted max-w-xl">
              Você já pode divulgar seus links e acumular comissões normalmente. Complete os 5 passos para liberar a transferência automática toda sexta-feira.
            </p>
          </div>

          <Link href={nextTarget} className="shrink-0">
            <Button className="font-bold text-xs gap-1.5 shadow-sm">
              <Sparkles className="size-3.5" />
              Completar Ativação
              <ArrowRight className="size-3.5" />
            </Button>
          </Link>
        </div>

        {/* Barra de Progresso */}
        <div className="space-y-1.5">
          <div
            className="h-2.5 w-full overflow-hidden rounded-full bg-slate-100 border border-brand-border/60"
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
        </div>

        {/* 5 Deveres em Grade Tátil */}
        <div className="grid grid-cols-1 sm:grid-cols-5 gap-2 pt-1">
          {checklist.map((item) => {
            const StepIcon = STEP_ICONS[item.key] || FileText;
            const isApproved = item.state === "approved";
            const isPending = item.state === "pending";
            const isNeedsAction = item.state === "needs_action";

            return (
              <Link
                key={item.key}
                href={item.href}
                className={`flex items-center sm:flex-col sm:items-start justify-between gap-2 p-2.5 rounded-xl border transition group ${
                  isApproved
                    ? "border-emerald-500/30 bg-emerald-50/50 hover:bg-emerald-50"
                    : isNeedsAction
                    ? "border-red-500/30 bg-red-50/50 hover:bg-red-50"
                    : isPending
                    ? "border-amber-500/30 bg-amber-50/50 hover:bg-amber-50"
                    : "border-brand-border/80 bg-white hover:bg-slate-50"
                }`}
              >
                <div className="flex items-center sm:flex-col sm:items-start gap-2 min-w-0">
                  <div
                    className={`flex size-7 shrink-0 items-center justify-center rounded-lg ${
                      isApproved
                        ? "bg-emerald-500/20 text-emerald-600"
                        : isNeedsAction
                        ? "bg-red-500/20 text-red-600"
                        : isPending
                        ? "bg-amber-500/20 text-amber-600"
                        : "bg-slate-100 text-slate-600 group-hover:bg-brand-blue/10 group-hover:text-brand-blue"
                    }`}
                  >
                    <StepIcon className="size-3.5" />
                  </div>
                  <span className="text-[12px] font-bold text-brand-ink truncate">
                    {item.label}
                  </span>
                </div>

                <div className="shrink-0 sm:mt-1">
                  {isApproved && (
                    <span className="inline-flex items-center gap-0.5 text-[10px] font-extrabold text-emerald-700">
                      <CheckCircle2 className="size-3" /> Concluído
                    </span>
                  )}
                  {isPending && (
                    <span className="inline-flex items-center gap-0.5 text-[10px] font-extrabold text-amber-700">
                      <Clock className="size-3" /> Em análise
                    </span>
                  )}
                  {isNeedsAction && (
                    <span className="inline-flex items-center gap-0.5 text-[10px] font-extrabold text-red-700">
                      <AlertCircle className="size-3" /> Ajustar
                    </span>
                  )}
                  {item.state === "todo" && (
                    <span className="text-[10px] font-semibold text-slate-500">
                      Pendente &rarr;
                    </span>
                  )}
                </div>
              </Link>
            );
          })}
        </div>
      </CardContent>
    </Card>
  );
}

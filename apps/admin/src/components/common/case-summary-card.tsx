import * as React from "react";
import { Sparkles, UserCheck } from "lucide-react";
import { RiskBadge } from "./risk-badge";
import { DivergenceBadge } from "./divergence-badge";
import type { RiskEvaluation } from "@/lib/risk-analysis";

interface CaseSummaryCardProps {
  evaluation: RiskEvaluation;
  className?: string;
}

export function CaseSummaryCard({ evaluation, className }: CaseSummaryCardProps) {
  const { level, summary, divergences, reasons } = evaluation;

  const borderClass = {
    critical: "border-brand-danger/40 bg-brand-danger-bg/30",
    warning: "border-amber-500/40 bg-amber-500/10",
    normal: "border-brand-blue/20 bg-brand-blue-bg/20",
  }[level];

  return (
    <div className={`rounded-xl border p-4 text-sm space-y-3 ${borderClass} ${className || ""}`}>
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Sparkles className="size-4 text-brand-blue" />
          <span className="font-semibold text-xs text-brand-ink uppercase tracking-wider">
            Síntese de IA da Validação
          </span>
        </div>
        <RiskBadge level={level} />
      </div>

      <p className="text-brand-ink font-medium text-sm leading-relaxed">
        {summary}
      </p>

      {divergences.length > 0 && (
        <div className="flex flex-wrap gap-1.5 pt-1">
          {divergences.map((div, i) => (
            <DivergenceBadge key={i} label={div} />
          ))}
        </div>
      )}

      {reasons.length > 0 && (
        <ul className="text-xs text-brand-muted space-y-1 list-disc list-inside pt-1">
          {reasons.map((r, i) => (
            <li key={i}>{r}</li>
          ))}
        </ul>
      )}

      <div className="flex items-center gap-2 pt-2 border-t border-brand-border/40 text-xs text-brand-muted">
        <UserCheck className="size-3.5 text-brand-blue" />
        <span>Decisão final estritamente humana requerida pelo Coordenador.</span>
      </div>
    </div>
  );
}

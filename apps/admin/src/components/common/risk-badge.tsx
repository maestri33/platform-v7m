import * as React from "react";
import { AlertCircle, AlertTriangle, CheckCircle } from "lucide-react";

interface RiskBadgeProps {
  level: "critical" | "warning" | "normal";
  showIcon?: boolean;
  className?: string;
}

export function RiskBadge({ level, showIcon = true, className = "" }: RiskBadgeProps) {
  if (level === "critical") {
    return (
      <span
        className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-bold bg-brand-danger-bg text-brand-danger border border-brand-danger/30 ${className}`}
      >
        {showIcon && <AlertCircle className="size-3 shrink-0" />}
        <span>Risco Alto</span>
      </span>
    );
  }

  if (level === "warning") {
    return (
      <span
        className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-bold bg-amber-500/10 text-amber-600 border border-amber-500/30 ${className}`}
      >
        {showIcon && <AlertTriangle className="size-3 shrink-0" />}
        <span>Atenção</span>
      </span>
    );
  }

  return (
    <span
      className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-bold bg-brand-green-bg text-brand-green-dark border border-brand-green/30 ${className}`}
    >
      {showIcon && <CheckCircle className="size-3 shrink-0" />}
      <span>Conforme</span>
    </span>
  );
}

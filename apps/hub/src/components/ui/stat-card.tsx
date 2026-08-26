import * as React from "react";
import { cn } from "@/lib/utils";

interface StatCardProps {
  label: string;
  value: number | string;
  sublabel?: string;
  icon?: React.ComponentType<{ className?: string }>;
  tone?: "blue" | "green" | "amber" | "danger" | "default";
  onClick?: () => void;
  className?: string;
}

export function StatCard({
  label,
  value,
  sublabel,
  icon: Icon,
  tone = "default",
  onClick,
  className,
}: StatCardProps) {
  const toneBg = {
    default: "bg-white border-brand-border text-brand-ink",
    blue: "bg-white border-brand-blue/30 text-brand-ink",
    green: "bg-white border-brand-green/30 text-brand-ink",
    amber: "bg-white border-brand-amber/30 text-brand-ink",
    danger: "bg-white border-brand-danger/30 text-brand-ink",
  }[tone];

  const iconBg = {
    default: "bg-brand-muted/10 text-brand-muted",
    blue: "bg-brand-blue-bg text-brand-blue",
    green: "bg-brand-green-bg text-brand-green",
    amber: "bg-brand-amber-bg text-brand-amber",
    danger: "bg-brand-danger-bg text-brand-danger",
  }[tone];

  return (
    <div
      onClick={onClick}
      className={cn(
        "rounded-xl border p-4 sm:p-5 shadow-xs transition-all",
        onClick && "cursor-pointer hover:shadow-md hover:border-brand-blue/40 active:scale-[0.99]",
        toneBg,
        className,
      )}
    >
      <div className="flex items-center justify-between">
        <span className="text-xs font-semibold uppercase tracking-wider text-brand-muted">
          {label}
        </span>
        {Icon && (
          <div className={cn("rounded-lg p-2", iconBg)}>
            <Icon className="h-4 w-4" />
          </div>
        )}
      </div>
      <div className="mt-2 flex items-baseline gap-2">
        <span className="text-2xl sm:text-3xl font-bold tracking-tight text-brand-ink">
          {value}
        </span>
        {sublabel && <span className="text-xs text-brand-muted">{sublabel}</span>}
      </div>
    </div>
  );
}

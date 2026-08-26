import * as React from "react";
import { FolderOpen } from "lucide-react";
import { cn } from "@/lib/utils";

interface EmptyStateProps {
  title?: string;
  description?: string;
  icon?: React.ComponentType<{ className?: string }>;
  action?: React.ReactNode;
  className?: string;
}

export function EmptyState({
  title = "Nenhum registro encontrado",
  description = "Não há dados nesta fila ou os filtros aplicados não retornaram resultados.",
  icon: Icon = FolderOpen,
  action,
  className,
}: EmptyStateProps) {
  return (
    <div
      className={cn(
        "flex flex-col items-center justify-center p-8 text-center rounded-xl border border-dashed border-brand-border bg-brand-bg/30 my-4",
        className,
      )}
    >
      <div className="rounded-full bg-brand-muted/10 p-3 mb-3 text-brand-muted">
        <Icon className="h-6 w-6" />
      </div>
      <h4 className="text-base font-semibold text-brand-ink">{title}</h4>
      <p className="mt-1 text-sm text-brand-muted max-w-sm">{description}</p>
      {action && <div className="mt-4">{action}</div>}
    </div>
  );
}

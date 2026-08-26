import type { ReactNode } from "react";

/**
 * PageShell — wrapper de página para o conteúdo do fit-viewport. Substitui o
 * GrainSection + Container antigos (o shell já provê fundo/padding).
 */
export function PageShell({
  children,
  width = "default",
}: {
  children: ReactNode;
  /** `narrow` = max-w-md (telas de candidato); `default` = max-w-2xl */
  width?: "default" | "narrow";
}) {
  return (
    <div
      className={
        width === "narrow"
          ? "max-w-md mx-auto space-y-5"
          : "max-w-2xl mx-auto space-y-5"
      }
    >
      {children}
    </div>
  );
}

/**
 * CompactHeader — cabeçalho de página compacto (sem o mb-8 do PageHeader
 * antigo, alinhado ao fit-viewport).
 */
export function CompactHeader({
  kicker,
  title,
  subtitle,
}: {
  kicker?: string;
  title: string;
  subtitle?: ReactNode;
}) {
  return (
    <header className="space-y-1">
      {kicker && (
        // gold-ink (--gold-ink = #8a6526) tem contraste AA sobre --paper-soft.
        // gold-light (--gold-soft = #f0d493) só é legível sobre escuro (auth).
        <p className="text-[11px] font-bold uppercase tracking-[0.16em] text-brand-gold-ink">
          {kicker}
        </p>
      )}
      <h1 className="page-title text-[var(--surface-text)]">{title}</h1>
      {subtitle && (
        <p className="text-sm text-[var(--surface-text-muted)]">{subtitle}</p>
      )}
    </header>
  );
}

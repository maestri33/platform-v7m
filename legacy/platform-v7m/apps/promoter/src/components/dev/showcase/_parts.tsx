"use client";

import type { ReactNode } from "react";

/**
 * Partes compartilhadas do showcase: cards rotulados pra cada componente /
 * variante. Mantém consistência visual entre todas as seções.
 */

/** Card de showcase: label do grupo + grid de variantes empilhadas. */
export function ShowcaseGroup({
  label,
  description,
  children,
}: {
  label: string;
  description?: string;
  children: ReactNode;
}) {
  return (
    <section
      aria-label={`Grupo: ${label}`}
      className="rounded-[var(--radius)] border border-[var(--surface-border)] bg-[var(--surface)] p-5"
      style={{ boxShadow: "var(--shadow-card)" }}
    >
      <div className="mb-4">
        <h2 className="font-display text-lg text-[var(--surface-text)]">
          {label}
        </h2>
        {description && (
          <p className="mt-0.5 text-xs text-[var(--surface-text-muted)]">
            {description}
          </p>
        )}
      </div>
      <div className="space-y-5">{children}</div>
    </section>
  );
}

/** Sub-bloco rotulado dentro de um grupo (cada variante = 1 Variant). */
export function Variant({
  label,
  hint,
  children,
  /** Controla a largura: "auto" deixa o conteúdo com seu próprio width. */
  width = "default",
}: {
  label: string;
  hint?: string;
  children: ReactNode;
  width?: "default" | "auto" | "narrow";
}) {
  return (
    <div
      className={
        "rounded-[var(--radius-sm)] border border-dashed border-[var(--surface-border)] bg-[var(--bg)] p-4 " +
        (width === "narrow" ? "max-w-md " : width === "auto" ? "inline-block " : "")
      }
    >
      <p className="mb-3 flex items-center gap-2 text-[11px] font-bold uppercase tracking-[0.14em] text-[var(--surface-text-muted)]">
        <span>{label}</span>
        {hint && (
          <span className="font-normal normal-case tracking-normal text-[var(--surface-text-muted)] opacity-75">
            — {hint}
          </span>
        )}
      </p>
      <div className="space-y-2">{children}</div>
    </div>
  );
}

/** Strip horizontal de variantes lado a lado (ícones, badges etc.). */
export function VariantRow({
  label,
  children,
}: {
  label: string;
  children: ReactNode;
}) {
  return (
    <div>
      <p className="mb-2 text-[11px] font-bold uppercase tracking-[0.14em] text-[var(--surface-text-muted)]">
        {label}
      </p>
      <div className="flex flex-wrap items-center gap-3">{children}</div>
    </div>
  );
}

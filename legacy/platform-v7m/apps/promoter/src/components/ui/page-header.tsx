import type { ReactNode } from "react";

/**
 * Cabeçalho de página: kicker + título + subtítulo.
 * Substitui o bloco repetido (kicker + h1 com `--text-h2-sm` inline + p) que
 * aparecia em todas as telas. `tone="dark"` para as telas de auth.
 */
export function PageHeader({
  kicker = "V7M · Promotor",
  title,
  subtitle,
  tone = "light",
  children,
}: {
  kicker?: string;
  title: ReactNode;
  subtitle?: ReactNode;
  tone?: "light" | "dark";
  children?: ReactNode;
}) {
  return (
    <header className="mb-8">
      {kicker && (
        <p className={`kicker ${tone === "dark" ? "text-brand-gold-light" : "text-brand-gold-ink"}`}>
          {kicker}
        </p>
      )}
      <h1 className={`page-title ${tone === "dark" ? "text-[var(--surface)]" : ""}`.trim()}>{title}</h1>
      {subtitle && (
        <p
          className={`mt-3 text-lg ${tone === "dark" ? "text-brand-muted-on-dark" : "text-[var(--surface-text-muted)]"}`}
        >
          {subtitle}
        </p>
      )}
      {children}
    </header>
  );
}

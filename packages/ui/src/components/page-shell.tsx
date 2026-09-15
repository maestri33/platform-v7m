import type { ReactNode } from "react";

export interface PageShellProps {
  /** Título grande da página (h1). */
  title: string;
  /** Subtítulo/descrição curta sob o título. */
  subtitle?: string;
  /** Alias para subtitle */
  description?: string;
  /** Badge/Etiqueta no cabeçalho */
  badge?: ReactNode;
  /** Ações no canto superior direito (botões, filtros). */
  actions?: ReactNode;
  children: ReactNode;
}

/**
 * Moldura padrão de toda tela de portal/admin: largura máxima 6xl centrada,
 * cabeçalho com título + badge + ações responsivas.
 */
export function PageShell({
  title,
  subtitle,
  description,
  badge,
  actions,
  children,
}: PageShellProps) {
  const desc = subtitle || description;

  return (
    <main id="conteudo" className="mx-auto w-full max-w-6xl flex-1 px-4 py-6 sm:px-6 sm:py-8">
      <div className="mb-6 flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div className="min-w-0 space-y-1">
          {badge ? <div className="mb-1.5 flex items-center">{badge}</div> : null}
          <h1 className="text-2xl font-extrabold tracking-tight text-brand-ink sm:text-[28px]">
            {title}
          </h1>
          {desc ? (
            <p className="text-[15px] leading-relaxed text-brand-muted">{desc}</p>
          ) : null}
        </div>
        {actions ? <div className="flex shrink-0 flex-wrap items-center gap-2">{actions}</div> : null}
      </div>
      {children}
    </main>
  );
}

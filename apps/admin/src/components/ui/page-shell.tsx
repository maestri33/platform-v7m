import type { ReactNode } from "react";

interface PageShellProps {
  /** Título grande da página (h1). */
  title: string;
  /** Subtítulo/descrição curta sob o título. */
  subtitle?: string;
  /** Ações no canto superior direito (botões, filtros). */
  actions?: ReactNode;
  children: ReactNode;
}

/**
 * Moldura padrão de toda tela do admin: largura máxima 6xl centrada, respiro,
 * cabeçalho com título + ações. O documento rola naturalmente (ver globals.css);
 * mobile-first — em telas estreitas o cabeçalho empilha.
 */
export function PageShell({ title, subtitle, actions, children }: PageShellProps) {
  return (
    <main id="conteudo" className="mx-auto w-full max-w-6xl flex-1 px-4 py-6 sm:px-6 sm:py-8">
      <div className="mb-6 flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div className="min-w-0">
          <h1 className="text-2xl font-extrabold tracking-tight text-brand-ink sm:text-[28px]">
            {title}
          </h1>
          {subtitle ? (
            <p className="mt-1 text-[15px] leading-relaxed text-brand-muted">{subtitle}</p>
          ) : null}
        </div>
        {actions ? <div className="flex shrink-0 flex-wrap items-center gap-2">{actions}</div> : null}
      </div>
      {children}
    </main>
  );
}

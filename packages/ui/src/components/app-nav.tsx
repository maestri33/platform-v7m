import type { ReactNode } from "react";

export interface AppNavProps {
  /** Nome da aplicação/marca a ser exibido no header (padrão: "Supletivo", com destaque) */
  appName?: string;
  /** Cor de destaque ou customizada para o branding se aplicável */
  brandColor?: string;
  /** Conteúdo ou elementos à direita da barra (ex.: status do token, doc links, whoami) */
  rightSlot?: ReactNode;
  /** Classes adicionais para o elemento <header> */
  className?: string;
}

/**
 * Shell canônico de navegação superior (NavBar) compartilhado no Design System @v7m/ui.
 * Totalmente agnóstico de lógica de negócio e hooks de sessão do app consumidor.
 */
export function AppNav({
  appName = "Supletivo",
  brandColor,
  rightSlot,
  className = "",
}: AppNavProps) {
  return (
    <header
      className={`sticky top-0 z-30 flex justify-center border-b border-white/10 bg-brand-ink/40 pt-[env(safe-area-inset-top)] backdrop-blur-xl ${className}`}
    >
      <div className="flex w-full max-w-lg items-center gap-3 px-6 py-2.5">
        <a
          href="/"
          className="inline-flex items-center gap-2.5 transition hover:opacity-90 focus:outline-none"
          aria-label="Supletivo Brasil"
        >
          <svg
            className="size-7 shrink-0"
            viewBox="0 0 48 48"
            aria-hidden="true"
            fill="none"
          >
            <path
              d="M24 3.5 44.5 24 24 44.5 3.5 24Z"
              stroke="var(--color-brand-yellow, #ffd700)"
              strokeWidth="3.6"
              strokeLinejoin="round"
            />
            <path
              d="M16 24.6l5.6 5.6L32 19.4"
              stroke="#ffffff"
              strokeWidth="4"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
          <span className="text-[15px] font-extrabold tracking-tight text-white">
            {appName === "Supletivo" ? (
              <>
                Supletivo{" "}
                <span
                  className={brandColor ? undefined : "text-brand-yellow font-black"}
                  style={brandColor ? { color: brandColor } : undefined}
                >
                  Brasil
                </span>
              </>
            ) : (
              appName
            )}
          </span>
        </a>
        {rightSlot ? (
          <div className="ml-auto flex items-center gap-2">{rightSlot}</div>
        ) : null}
      </div>
    </header>
  );
}

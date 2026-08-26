import type { ReactNode } from "react";
import Link from "next/link";

import { Container } from "@/components/layout/Container";
import { AppNav } from "@/components/layout/AppNav";
import { ThemeToggle } from "@/components/ui/theme-toggle";
import type { Session } from "@/lib/auth/server";

/**
 * Shell do app do promotor (candidato em onboarding → promotor pleno).
 *
 * Modelo assíncrono: fundo animado dark-luxury; navbar fixa (logo + tema)
 * com linha dourada; área de conteúdo com rolagem vertical natural (.app-scroll);
 * bottom-nav (Início · Leads · Comissões · Conta) sempre disponível.
 */
export function AppShell({
  session,
  children,
}: {
  session: Session;
  children: ReactNode;
}) {
  return (
    <div className="flex h-dvh flex-col overflow-hidden">
      <div className="app-bg grain" aria-hidden />
      <header className="shrink-0 z-40 bg-brand-char/70 backdrop-blur-md pt-[env(safe-area-inset-top)]">
        <Container className="py-3 flex items-center justify-between gap-4">
          <Link
            href="/painel"
            className="flex items-center gap-2 hover:opacity-90 transition-opacity"
          >
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src="/logo.svg" alt="V7M" className="h-5 w-auto" />
            <span className="text-brand-gold-ink font-display" aria-hidden="true">·</span>
            <span className="font-display text-[var(--surface-text-muted)] text-sm">
              Promotor
            </span>
          </Link>
          <div className="flex items-center gap-2">
            {process.env.NODE_ENV !== "production" && (
              <Link
                href="/dev-preview"
                className="rounded-full bg-brand-gold/20 border border-brand-gold/40 px-2 py-0.5 text-[10px] font-bold text-brand-gold-ink hover:bg-brand-gold hover:text-black transition-colors"
                title="Abrir Modo Desenvolvedor / QA Studio"
              >
                🧪 DEV
              </Link>
            )}
            <ThemeToggle />
            <span className="text-sm text-[var(--surface-text-muted)] hidden sm:inline">
              {session.name ?? "Você"}
            </span>
          </div>
        </Container>
        <div className="gold-rule" />
      </header>
      <main id="main" className="flex-1 app-scroll px-[var(--gutter)] py-5">
        {children}
      </main>
      <AppNav />
    </div>
  );
}



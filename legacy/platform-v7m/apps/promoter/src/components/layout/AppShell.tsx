import type { ReactNode } from "react";
import Link from "next/link";

import { Container } from "@/components/layout/Container";
import { AppNav } from "@/components/layout/AppNav";
import { AppFooter } from "@/components/layout/AppFooter";
import { TrainingGate } from "@/components/layout/TrainingGate";
import { FitViewport } from "@/components/ui/fit-viewport";
import { ThemeToggle } from "@/components/ui/theme-toggle";
import { isOnboarding, isPromoter, isTrainingLocked } from "@/lib/auth/roles";
import type { Session } from "@/lib/auth/server";

/**
 * Shell do app do promotor (candidato em onboarding → promotor pleno).
 *
 * App-like, alinhado à Auth: fundo animado dark-luxury; navbar fixa (logo +
 * tema) com a linha-gradiente dourada; UMA área de conteúdo que NUNCA scrolla —
 * se transborda, FitViewport escala pra caber (handoff §23). Rodapé do frame é
 * a bottom-nav (4 abas p/ promotor, 2 p/ candidato em onboarding) ou o footer
 * institucional quando não há nav. safe-area no topo e na base.
 *
 * Quem vê o quê: candidato em onboarding (2 abas + dashboard com grid);
 * training travado (TrainingGate empurra pro LMS, sem nav); promotor
 * (4 abas). coordinator/ staff acessam como promotor (coordenação mora
 * em hub.v7m.org).
 */
export function AppShell({
  session,
  children,
}: {
  session: Session;
  children: ReactNode;
}) {
  const locked = isTrainingLocked(session.roles);
  const promoter = isPromoter(session.roles);
  const onboarding = isOnboarding(session.roles);

  // Treinado (training trava) → sem nav, sem footer. Candidato puro em
  // onboarding → 2 abas. Promotor → 4 abas. Sem role interna → footer.
  const navVariant: "promoter" | "candidate" | null = locked
    ? null
    : promoter
      ? "promoter"
      : onboarding
        ? "candidate"
        : null;

  return (
    <div className="flex h-dvh flex-col overflow-hidden">
      <div className="app-bg grain" aria-hidden />
      <TrainingGate locked={locked} />
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
            <ThemeToggle />
            <span className="text-sm text-[var(--surface-text-muted)] hidden sm:inline">
              {session.name ?? "Você"}
            </span>
          </div>
        </Container>
        <div className="gold-rule" />
      </header>
      {/* Conteúdo NUNCA scrolla: FitViewport escala se transbordar. px respeita
          o gutter; o conteúdo das telas renderiza direto (sem GrainSection). */}
      <main id="main" className="flex-1 overflow-hidden px-[var(--gutter)] py-5">
        <FitViewport className="h-full">{children}</FitViewport>
      </main>
      {navVariant === "promoter" && <AppNav variant="promoter" />}
      {navVariant === "candidate" && <AppNav variant="candidate" />}
      {navVariant === null && !locked && <AppFooter />}
    </div>
  );
}


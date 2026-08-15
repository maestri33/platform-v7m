"use client";

import { Container } from "@/components/layout/Container";

import { AuthSection } from "./auth-section";
import { ComponentsSection } from "./components-section";
import { FormsSection } from "./forms-section";
import { OverviewSection } from "./overview-section";
import { PagesSection } from "./pages-section";
import { StatesSection } from "./states-section";

/**
 * Roteador de seção — client component que delega pra sub-seção específica.
 * Mantém o `app-scroll` do FitViewport ativo e não reescreve a casca.
 *
 * O `role` é passado adiante (a `auth` usa o `AuthShell` em vez do AppShell,
 * configurado no `dev-preview/page.tsx`).
 */
export function Showcase({ section, role }: { section: string; role?: string }) {
  switch (section) {
    case "components":
      return <ComponentsSection />;
    case "forms":
      return <FormsSection />;
    case "pages":
      // Único section role-aware: o "Painel — persona atual" reflete o role
      // selecionado no header. Os demais sections ignoram `role`.
      return <PagesSection role={role} />;
    case "states":
      return <StatesSection />;
    case "auth":
      return <AuthSection />;
    case "overview":
    default:
      return <OverviewSection />;
  }
}

/**
 * Layout compartilhado pelas seções (exceto `auth`, que tem o seu próprio
 * shell). Mantém o título + descrição e o `space-y` consistente.
 */
export function ShowcaseShell({
  kicker,
  title,
  description,
  children,
}: {
  kicker: string;
  title: string;
  description: string;
  children: React.ReactNode;
}) {
  return (
    <Container className="space-y-6">
      <header className="space-y-1">
        <p className="kicker text-brand-gold-ink">{kicker}</p>
        <h1 className="page-title text-[var(--surface-text)]">{title}</h1>
        <p className="text-sm text-[var(--surface-text-muted)]">{description}</p>
      </header>
      {children}
    </Container>
  );
}

// Re-export pra o `dev-preview/page.tsx` importar o que precisar.
export { OverviewSection } from "./overview-section";
export { AuthSection } from "./auth-section";

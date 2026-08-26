"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Home, Users, DollarSign, UserCircle, type LucideIcon } from "lucide-react";

/**
 * Bottom navigation do app.
 *
 * Dois layouts conforme o contexto (ver .reviews/api-spec-me-unificado.md):
 *  - `variant="promoter"` — 4 abas (Início · Leads · Comissões · Conta).
 *    É a base de todo mundo que virou promotor.
 *  - `variant="candidate"` — 2 abas (Início · Conta). Candidato em onboarding
 *    ainda não tem leads/comissões significativas (o painel mostra o alerta
 *    de hold + o grid de etapas), então as abas intermediárias confundiriam.
 *
 * Mobile-first: ícone+label, alvo de toque ≥44px. Rodapé do frame do AppShell
 * (flex `shrink-0`, NÃO `fixed`) — a faixa `.app-scroll` acima é que rola.
 * safe-area na base p/ o home indicator.
 */
type Variant = "promoter" | "candidate";

type NavItem = {
  href: string;
  label: string;
  icon: LucideIcon;
  /** Quando `true`, marca ativo só em match exato (default: prefix-match). */
  exact?: boolean;
};

const PROMOTER_ITEMS: NavItem[] = [
  { href: "/painel", label: "Início", icon: Home, exact: true },
  { href: "/leads", label: "Leads", icon: Users },
  { href: "/comissoes", label: "Comissões", icon: DollarSign },
  { href: "/conta", label: "Conta", icon: UserCircle },
];

const CANDIDATE_ITEMS: NavItem[] = [
  { href: "/painel", label: "Início", icon: Home, exact: true },
  { href: "/conta", label: "Conta", icon: UserCircle },
];

export function AppNav({
  variant = "promoter",
  activePath,
}: {
  variant?: Variant;
  /**
   * Sobrescreve o pathname usado pra marcar a aba ativa. Default: rota atual
   * do router (`usePathname`). Útil em showcases e e2e, onde a URL real (ex.:
   * `/dev-preview`) não casa com nenhuma aba — sem isso, nenhuma fica ativa.
   */
  activePath?: string;
}) {
  // usePathname sempre chamado (regra dos hooks); o override é aplicado depois.
  const routerPath = usePathname();
  const pathname = activePath ?? routerPath;
  const items = variant === "candidate" ? CANDIDATE_ITEMS : PROMOTER_ITEMS;

  return (
    <nav
      className="shrink-0 border-t border-[var(--surface-border)] bg-[var(--bg)]/95 backdrop-blur-sm pb-[env(safe-area-inset-bottom)]"
      aria-label="Navegação principal"
    >
      <div
        className={
          variant === "candidate"
            ? "mx-auto flex max-w-xs items-center justify-around"
            : "mx-auto flex max-w-md items-center justify-around"
        }
      >
        {items.map((it) => {
          const Icon = it.icon;
          const active = it.exact
            ? pathname === it.href
            : pathname.startsWith(it.href);

          return (
            <Link
              key={it.href}
              href={it.href}
              aria-current={active ? "page" : undefined}
              className={
                active
                  ? "flex min-h-14 min-w-[72px] flex-col items-center justify-center px-2 py-1 text-xs font-medium text-[var(--hero-kicker)] transition-colors"
                  : "flex min-h-14 min-w-[72px] flex-col items-center justify-center px-2 py-1 text-xs text-[var(--surface-text-muted)] transition-colors hover:text-[var(--surface-text)]"
              }
            >
              <Icon size={22} strokeWidth={active ? 2.2 : 1.8} aria-hidden="true" />
              <span>{it.label}</span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}

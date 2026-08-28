"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Home, Users, DollarSign, UserCircle, FileText } from "lucide-react";

/**
 * Bottom navigation do contexto PROMOTOR (base de todo mundo que passou do funil).
 * Mobile-first: 5 itens (Início · Leads · Docs · Comissões · Conta), ícone+label, alvo
 * de toque ≥44px. Rodapé do frame do AppShell (flex `shrink-0`, NÃO `fixed`) —
 * a faixa `.app-scroll` acima é que rola. safe-area na base p/ o home indicator.
 */
const ITEMS: {
  href: string;
  label: string;
  icon: typeof Home;
  exact?: boolean;
}[] = [
  { href: "/painel", label: "Início", icon: Home, exact: true },
  { href: "/leads", label: "Leads", icon: Users },
  { href: "/documentos", label: "Docs", icon: FileText },
  { href: "/comissoes", label: "Comissões", icon: DollarSign },
  { href: "/conta", label: "Conta", icon: UserCircle },
];

export function AppNav() {
  const pathname = usePathname();

  return (
    <nav
      className="shrink-0 border-t border-[var(--surface-border)] bg-[var(--bg)]/95 backdrop-blur-sm pb-[env(safe-area-inset-bottom)]"
      aria-label="Navegação principal"
    >
      <div className="mx-auto flex max-w-md items-center justify-around">
        {ITEMS.map((it) => {
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
                  ? "flex min-h-14 min-w-[72px] flex-col items-center justify-center px-2 py-1 text-xs font-semibold text-brand-gold-dark dark:text-brand-gold transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-gold/50 rounded-lg"
                  : "flex min-h-14 min-w-[72px] flex-col items-center justify-center px-2 py-1 text-xs text-[var(--surface-text-muted)] transition-colors hover:text-[var(--surface-text)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-gold/50 rounded-lg"
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

"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useAuth } from "@/lib/auth-context";
import { ContextSwitcher } from "@/components/layout/context-switcher";
import { BottomNav } from "@/components/layout/bottom-nav";

interface NavItem {
  href: string;
  label: string;
  icon: string;
}

const ADMIN_ITEMS: NavItem[] = [
  { href: "/dashboard", label: "Visão geral", icon: "M3 12l9-9 9 9M5 10v10h14V10" },
  { href: "/financeiro", label: "Financeiro", icon: "M3 6h18M3 12h18M3 18h18" },
  { href: "/documentos", label: "Mesa Documentos", icon: "M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z M14 2v6h6 M16 13H8 M16 17H8 M10 9H8" },
  { href: "/rede", label: "Rede & Downline", icon: "M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" },
  { href: "/polos", label: "Polos", icon: "M12 21s-7-5.6-7-11a7 7 0 1 1 14 0c0 5.4-7 11-7 11z M12 10h.01" },
  { href: "/coordenadores", label: "Coordenadores", icon: "M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2 M9 7a4 4 0 1 0 0-8 4 4 0 0 0 0 8z M23 21v-2a4 4 0 0 0-3-3.87 M16 3.13a4 4 0 0 1 0 7.75" },
  { href: "/treino", label: "Treino LMS", icon: "M4 6h16M4 12h10M4 18h7" },
  { href: "/matriculas", label: "Matrículas", icon: "M9 11l3 3 8-8 M21 12v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11" },
  { href: "/alunos", label: "Alunos", icon: "M22 10L12 5 2 10l10 5 10-5z M6 12v5c0 1 3 2 6 2s6-1 6-2v-5" },
  { href: "/leads", label: "Leads", icon: "M3 5h18M3 12h18M3 19h12" },
  { href: "/usuarios", label: "Usuários", icon: "M16 21v-2a4 4 0 0 0-8 0v2 M12 7a4 4 0 1 0 0 0.01" },
  { href: "/configuracoes", label: "Configurações", icon: "M12 15a3 3 0 1 0 0-6 3 3 0 0 0 0 6z M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z" },
  { href: "/integracoes", label: "Integrações", icon: "M9 3v6M15 3v6M4 9h16v4a6 6 0 0 1-12 0V9z" },
  { href: "/notificacoes", label: "Notificações", icon: "M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" },
];

const HUB_ITEMS: NavItem[] = [
  { href: "/hub", label: "Visão do Polo", icon: "M3 12l9-9 9 9M5 10v10h14V10" },
  { href: "/hub/candidatos", label: "Candidatos a Promotor", icon: "M16 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2 M9 7a4 4 0 1 0 0-8 4 4 0 0 0 0 8z M23 21v-2a4 4 0 0 0-3-3.87 M16 3.13a4 4 0 0 1 0 7.75" },
  { href: "/hub/equipe", label: "Equipe do Polo", icon: "M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" },
  { href: "/hub/matriculas", label: "Matrículas do Polo", icon: "M9 11l3 3 8-8 M21 12v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11" },
  { href: "/hub/leads", label: "Leads do Polo", icon: "M3 5h18M3 12h18M3 19h12" },
  { href: "/hub/alunos", label: "Alunos do Polo", icon: "M22 10L12 5 2 10l10 5 10-5z M6 12v5c0 1 3 2 6 2s6-1 6-2v-5" },
  { href: "/hub/inbox", label: "Alertas & Inbox", icon: "M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" },
];

const PROMOTER_ITEMS: NavItem[] = [
  { href: "/promoter", label: "Minhas Vendas", icon: "M13 2L3 14h9l-1 8 10-12h-9l1-8z" },
  { href: "/promoter/leads", label: "Meus Leads", icon: "M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z" },
  { href: "/promoter/comissoes", label: "Comissões & PIX", icon: "M12 1v22M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6" },
  { href: "/promoter/treino", label: "Capacitação & LMS", icon: "M4 6h16M4 12h10M4 18h7" },
  { href: "/onboarding", label: "Ativação & KYC", icon: "M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" },
  { href: "/conta", label: "Minha Conta", icon: "M16 21v-2a4 4 0 0 0-8 0v2 M12 7a4 4 0 1 0 0 0.01" },
];

export function AdminNav() {
  const pathname = usePathname();
  const { activeContext, logout } = useAuth();

  const isMasterPath =
    pathname === "/dashboard" ||
    pathname.startsWith("/admin") ||
    pathname.startsWith("/financeiro") ||
    pathname.startsWith("/documentos") ||
    pathname.startsWith("/rede") ||
    pathname.startsWith("/polos") ||
    pathname.startsWith("/coordenadores") ||
    pathname.startsWith("/treino") ||
    pathname.startsWith("/matriculas") ||
    pathname.startsWith("/alunos") ||
    pathname.startsWith("/leads") ||
    pathname.startsWith("/usuarios") ||
    pathname.startsWith("/configuracoes") ||
    pathname.startsWith("/integracoes") ||
    pathname.startsWith("/notificacoes");

  const isHubPath = pathname.startsWith("/hub");
  const isPromoterPath =
    pathname.startsWith("/promoter") ||
    pathname.startsWith("/vendas") ||
    pathname.startsWith("/onboarding") ||
    pathname.startsWith("/conta");

  let items = ADMIN_ITEMS;
  if (isHubPath || activeContext === "hub") {
    items = HUB_ITEMS;
  } else if (isPromoterPath || activeContext === "promoter") {
    items = PROMOTER_ITEMS;
  } else if (isMasterPath || activeContext === "admin") {
    items = ADMIN_ITEMS;
  }

  return (
    <>
      <aside
        aria-label="Navegação do painel"
        className="hidden md:flex flex-col w-64 border-r border-brand-border bg-white/70 backdrop-blur-md shrink-0 h-screen sticky top-0"
      >
        <div className="p-4 border-b border-brand-border flex items-center justify-between gap-3">
          <ContextSwitcher />
        </div>

        <nav className="flex-1 overflow-y-auto p-3 space-y-1">
          {items.map((it) => {
            const active = pathname === it.href || (it.href !== "/" && pathname.startsWith(it.href));
            return (
              <Link
                key={it.href}
                href={it.href}
                className={`flex items-center gap-3 px-3 py-2 rounded-xl text-sm font-semibold transition ${
                  active
                    ? "bg-brand-blue text-white shadow-sm"
                    : "text-brand-ink/80 hover:bg-slate-100 hover:text-brand-ink"
                }`}
              >
                <svg
                  className="w-4 h-4 shrink-0"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                >
                  <path d={it.icon} />
                </svg>
                <span className="truncate">{it.label}</span>
              </Link>
            );
          })}
        </nav>

        <div className="p-3 border-t border-brand-border">
          <button
            onClick={logout}
            className="w-full flex items-center gap-3 px-3 py-2 rounded-xl text-sm font-semibold text-brand-danger hover:bg-brand-danger/10 transition"
          >
            <svg
              className="w-4 h-4 shrink-0"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4M16 17l5-5-5-5M21 12H9" />
            </svg>
            <span>Sair do sistema</span>
          </button>
        </div>
      </aside>

      <BottomNav />
    </>
  );
}

export function AdminLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="mx-auto flex w-full max-w-6xl flex-1 flex-col gap-2 px-4 py-4 pb-28 sm:flex-row sm:gap-6 sm:px-6 sm:py-6 sm:pb-28">
      <div className="sm:w-56">
        <AdminNav />
      </div>
      <div className="min-w-0 flex-1">{children}</div>
    </div>
  );
}

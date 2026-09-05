"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useAuth } from "@/lib/auth-context";
import {
  Rocket,
  Users,
  Wallet,
  BookOpen,
  User,
  Building2,
  GraduationCap,
  UserCheck,
  Bell,
  LayoutDashboard,
  FileCheck2,
  Settings,
} from "lucide-react";

interface BottomNavItem {
  href: string;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
}

const PROMOTER_BOTTOM_ITEMS: BottomNavItem[] = [
  { href: "/promoter", label: "Início", icon: Rocket },
  { href: "/promoter/leads", label: "Leads", icon: Users },
  { href: "/promoter/comissoes", label: "Ganhos", icon: Wallet },
  { href: "/promoter/treino", label: "Treino", icon: BookOpen },
  { href: "/conta", label: "Conta", icon: User },
];

const HUB_BOTTOM_ITEMS: BottomNavItem[] = [
  { href: "/hub", label: "Polo", icon: Building2 },
  { href: "/hub/matriculas", label: "Matrículas", icon: GraduationCap },
  { href: "/hub/leads", label: "Leads", icon: Users },
  { href: "/hub/equipe", label: "Equipe", icon: UserCheck },
  { href: "/hub/inbox", label: "Alertas", icon: Bell },
];

const ADMIN_BOTTOM_ITEMS: BottomNavItem[] = [
  { href: "/dashboard", label: "Painel", icon: LayoutDashboard },
  { href: "/financeiro", label: "Financeiro", icon: Wallet },
  { href: "/documentos", label: "Documentos", icon: FileCheck2 },
  { href: "/polos", label: "Polos", icon: Building2 },
  { href: "/configuracoes", label: "Ajustes", icon: Settings },
];

export function BottomNav() {
  const pathname = usePathname();
  const { activeContext } = useAuth();

  // Seleciona itens com base no contexto ou rota ativa
  const isMasterPath =
    pathname === "/dashboard" ||
    pathname.startsWith("/admin") ||
    pathname.startsWith("/financeiro") ||
    pathname.startsWith("/documentos") ||
    pathname.startsWith("/rede") ||
    pathname.startsWith("/polos") ||
    pathname.startsWith("/coordenadores") ||
    pathname.startsWith("/configuracoes") ||
    pathname.startsWith("/integracoes");

  const items = isMasterPath
    ? ADMIN_BOTTOM_ITEMS
    : activeContext === "hub" || pathname.startsWith("/hub")
    ? HUB_BOTTOM_ITEMS
    : PROMOTER_BOTTOM_ITEMS;

  function isActive(href: string): boolean {
    if (href === "/dashboard" || href === "/hub" || href === "/promoter") {
      return pathname === href;
    }
    return pathname === href || pathname.startsWith(`${href}/`);
  }

  return (
    <nav
      aria-label="Navegação inferior mobile"
      className="fixed bottom-0 left-0 right-0 z-40 block border-t border-brand-border/60 bg-white/95 backdrop-blur-md pb-[max(env(safe-area-inset-bottom),0.5rem)] pt-1.5 shadow-lg sm:hidden"
    >
      <div className="grid grid-cols-5 items-center justify-around px-2">
        {items.map((item) => {
          const active = isActive(item.href);
          const Icon = item.icon;

          return (
            <Link
              key={item.href}
              href={item.href}
              data-testid={`bottom-nav-${item.href.replace(/[/]/g, "-").replace(/^-/, "") || "home"}`}
              className={`flex flex-col items-center justify-center gap-0.5 rounded-xl py-1 text-[10px] font-bold transition ${
                active
                  ? "text-brand-blue"
                  : "text-brand-muted hover:text-brand-ink"
              }`}
            >
              <div
                className={`flex size-7 items-center justify-center rounded-lg transition ${
                  active ? "bg-brand-blue/10 text-brand-blue" : ""
                }`}
              >
                <Icon className="size-4" />
              </div>
              <span className="truncate max-w-[56px] text-center leading-tight">
                {item.label}
              </span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}

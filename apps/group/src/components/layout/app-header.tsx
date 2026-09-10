"use client";

import Link from "next/link";
import { UnifiedNavbar, UserAvatar } from "@v7m/ui";
import { useAuth } from "@/lib/auth-context";

export function AppHeader() {
  const { user, activeContext } = useAuth();
  const firstName = user?.name?.split(" ")[0] ?? null;

  const roleLabel =
    activeContext === "admin"
      ? "Admin Master"
      : activeContext === "hub"
      ? "Liderança Regional"
      : "Portal do Promotor";

  const homeHref =
    activeContext === "hub"
      ? "/hub"
      : activeContext === "promoter"
      ? "/promoter"
      : "/admin";

  return (
    <UnifiedNavbar
      brand="group"
      context="portal"
      homeHref={user ? homeHref : "/"}
      rightAction={
        user ? (
          <div className="flex items-center gap-2 sm:gap-3">
            {/* Atalho Vendas / Promotor */}
            <Link
              href="/promoter"
              className={`inline-flex items-center gap-1.5 rounded-lg px-2.5 py-1 text-xs font-bold transition ${
                activeContext === "promoter"
                  ? "bg-emerald-600 text-white shadow-xs"
                  : "bg-white/10 text-white/90 hover:bg-white/20 border border-white/10"
              }`}
              title="Acessar Portal do Promotor"
            >
              <span>🚀</span>
              <span className="hidden sm:inline">Promotor</span>
            </Link>

            {/* Atalhos Rápidos RBAC */}
            {user.isCoordinator && (
              <Link
                href="/hub"
                className={`inline-flex items-center gap-1.5 rounded-lg px-2.5 py-1 text-xs font-bold transition ${
                  activeContext === "hub"
                    ? "bg-brand-blue text-white shadow-xs"
                    : "bg-white/10 text-white/90 hover:bg-white/20 border border-white/10"
                }`}
                title="Acessar Hub Regional"
              >
                <span>🏛️</span>
                <span className="hidden sm:inline">Hub Regional</span>
              </Link>
            )}

            {user.isStaff && (
              <Link
                href="/admin"
                className={`inline-flex items-center gap-1.5 rounded-lg px-2.5 py-1 text-xs font-bold transition ${
                  activeContext === "admin"
                    ? "bg-amber-500 text-white shadow-xs"
                    : "bg-white/10 text-white/90 hover:bg-white/20 border border-white/10"
                }`}
                title="Acessar Painel Master"
              >
                <span>👑</span>
                <span className="hidden sm:inline">Painel Master</span>
              </Link>
            )}

            <span className="hidden lg:inline-flex items-center rounded-full bg-white/10 px-2.5 py-0.5 text-xs font-semibold text-white/90 border border-white/10">
              {roleLabel}
            </span>
            <Link
              href="/conta"
              className="flex items-center gap-2.5 rounded-full bg-white/5 py-1 pl-2.5 pr-1.5 border border-white/10 transition hover:bg-white/10 hover:border-white/20"
              title="Acessar Minha Conta"
            >
              {firstName ? (
                <span className="max-w-[140px] truncate text-xs font-semibold text-white/90">
                  Olá, <span className="font-bold text-white">{firstName}</span>
                </span>
              ) : null}
              <UserAvatar
                name={user.name}
                photoUrl={user.photo_url || user.avatar_url}
                size="xs"
                showStatus
                status="online"
              />
            </Link>
          </div>
        ) : null
      }
    />
  );
}

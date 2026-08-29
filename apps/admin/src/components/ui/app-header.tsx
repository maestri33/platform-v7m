"use client";

import Link from "next/link";
import { useAuth } from "@/lib/auth-context";
import { UserAvatar } from "@/components/ui/user-avatar";

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
      : activeContext === "promotor"
      ? "/vendas"
      : "/dashboard";

  return (
    <header className="sticky top-0 z-30 flex justify-center border-b border-white/10 bg-brand-ink/90 pt-[env(safe-area-inset-top)] backdrop-blur-xl">
      <div className="flex w-full max-w-6xl items-center justify-between gap-3 px-5 py-3">
        <Link href={user ? homeHref : "/"} className="flex items-center gap-2.5 group">
          <span className="flex gap-1" aria-hidden>
            <span className="size-2 rounded-full bg-brand-green" />
            <span className="size-2 rounded-full bg-brand-yellow" />
            <span className="size-2 rounded-full bg-brand-blue-bright" />
          </span>
          <span className="text-sm font-extrabold tracking-tight text-white flex items-center gap-1.5 transition group-hover:text-white/90">
            V7M <span className="text-brand-green-light">Portal de Gestão</span>
          </span>
        </Link>

        {user ? (
          <div className="flex items-center gap-3">
            <span className="hidden sm:inline-flex items-center rounded-full bg-white/10 px-2.5 py-0.5 text-xs font-semibold text-white/90 border border-white/10">
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
        ) : null}
      </div>
    </header>
  );
}

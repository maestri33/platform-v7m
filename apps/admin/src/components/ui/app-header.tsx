"use client";

import Link from "next/link";
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
      : activeContext === "promotor"
      ? "/vendas"
      : "/dashboard";

  return (
    <header className="sticky top-0 z-30 flex justify-center border-b border-white/10 bg-brand-ink/90 pt-[env(safe-area-inset-top)] backdrop-blur-xl">
      <div className="flex w-full max-w-6xl items-center justify-between gap-3 px-5 py-3">
        <Link href={user ? homeHref : "/"} className="flex items-center gap-2.5">
          <span className="flex gap-1" aria-hidden>
            <span className="size-2 rounded-full bg-brand-green" />
            <span className="size-2 rounded-full bg-brand-yellow" />
            <span className="size-2 rounded-full bg-brand-blue-bright" />
          </span>
          <span className="text-sm font-extrabold tracking-tight text-white flex items-center gap-1.5">
            V7M <span className="text-brand-green-light">Portal de Gestão</span>
          </span>
        </Link>

        {user ? (
          <div className="flex items-center gap-3">
            <span className="hidden sm:inline-flex items-center rounded-full bg-white/10 px-2.5 py-0.5 text-xs font-semibold text-white/90 border border-white/10">
              {roleLabel}
            </span>
            {firstName ? (
              <span className="max-w-[200px] truncate text-sm font-semibold text-white/80">
                Olá, <span className="font-bold text-white">{firstName}</span>
              </span>
            ) : null}
          </div>
        ) : null}
      </div>
    </header>
  );
}

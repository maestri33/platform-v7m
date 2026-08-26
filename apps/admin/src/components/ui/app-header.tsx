"use client";

import Link from "next/link";
import { useEffect, useState, useSyncExternalStore } from "react";

import { whoami } from "@/lib/api";
import { getAccessToken, getServerAccessToken, subscribeStorage } from "@/lib/session";

/**
 * Barra fina no topo do admin, sempre visível: marca V7M Staff + "Olá, {nome}"
 * quando logado. Lê o token reativo (useSyncExternalStore) e busca o nome via
 * whoami. Clicar na marca leva ao dashboard.
 */
export function AppHeader() {
  const token = useSyncExternalStore(subscribeStorage, getAccessToken, getServerAccessToken);
  const [name, setName] = useState<string | null>(null);

  useEffect(() => {
    if (!token) {
      setName(null);
      return;
    }
    let cancelled = false;
    whoami()
      .then((who) => {
        if (!cancelled) {
          setName(typeof who.name === "string" && who.name.trim() ? who.name : null);
        }
      })
      .catch(() => {});
    return () => {
      cancelled = true;
    };
  }, [token]);

  const firstName = name?.split(" ")[0] ?? null;

  return (
    <header className="sticky top-0 z-30 flex justify-center border-b border-white/10 bg-brand-ink/90 pt-[env(safe-area-inset-top)] backdrop-blur-xl">
      <div className="flex w-full max-w-6xl items-center gap-3 px-5 py-3">
        <Link href={token ? "/dashboard" : "/"} className="flex items-center gap-2.5">
          <span className="flex gap-1" aria-hidden>
            <span className="size-2 rounded-full bg-brand-green" />
            <span className="size-2 rounded-full bg-brand-yellow" />
            <span className="size-2 rounded-full bg-brand-blue-bright" />
          </span>
          <span className="text-sm font-extrabold tracking-tight text-white">
            V7M <span className="text-brand-green-light">Staff</span>
          </span>
        </Link>
        {firstName ? (
          <span className="ml-auto max-w-[55%] truncate text-sm font-semibold text-white/70">
            Olá, <span className="font-bold text-white">{firstName}</span>
          </span>
        ) : null}
      </div>
    </header>
  );
}

"use client";

import { useEffect, useState, useSyncExternalStore } from "react";

import Link from "next/link";
import { DutyMiniPill } from "@v7m/ui";

import {
  getLeadSession,
  getServerLeadSession,
  subscribeLeadSession,
} from "@/app/_lead/lead-session";
import { whoami } from "@/lib/api";
import { getAccessToken, getServerAccessToken, subscribeStorage } from "@/lib/session";

/**
 * Barra fina no topo, sempre visível: marca; "Olá, {primeiro nome}" só quando logado.
 * O nome vem da sessão mockada do funil (protótipo) ou, nas rotas legadas,
 * do token real via whoami.
 */
export function AppHeader() {
  const lead = useSyncExternalStore(subscribeLeadSession, getLeadSession, getServerLeadSession);
  const token = useSyncExternalStore(subscribeStorage, getAccessToken, getServerAccessToken);
  // Guardado junto do token que o buscou: sem token (ou com outro) a exibição
  // deriva pra null sozinha — nada de setState síncrono no efeito pra "limpar".
  const [who, setWho] = useState<{ tok: string; name: string | null } | null>(null);

  useEffect(() => {
    if (!token) return;
    let cancelled = false;
    whoami()
      .then((w) => {
        if (!cancelled) {
          setWho({ tok: token, name: typeof w.name === "string" && w.name.trim() ? w.name : null });
        }
      })
      .catch(() => {});
    return () => {
      cancelled = true;
    };
  }, [token]);

  const whoamiName = token && who?.tok === token ? who.name : null;
  const firstName = (lead.loggedIn && lead.name ? lead.name : whoamiName)?.split(" ")[0] ?? null;

  return (
    <header className="sticky top-0 z-30 flex justify-center border-b border-white/10 bg-brand-ink/35 pt-[env(safe-area-inset-top)] backdrop-blur-xl">
      <div className="flex w-full max-w-lg items-center gap-3 px-6 py-3">
        <span className="flex gap-1" aria-hidden>
          <span className="size-2 rounded-full bg-brand-green" />
          <span className="size-2 rounded-full bg-brand-yellow" />
          <span className="size-2 rounded-full bg-brand-blue-bright" />
        </span>
        <span className="text-sm font-extrabold tracking-tight text-white">
          Supletivo <span className="text-brand-green-light">Brasil</span>
        </span>
        <div className="ml-auto flex items-center gap-2.5">
          <Link
            href="/documentos"
            className="flex items-center transition hover:opacity-90 focus:outline-none"
            title="Abrir Central de Documentos do Aluno"
          >
            <DutyMiniPill
              status={token ? "approved" : "empty"}
              label="Documentos"
              size="sm"
            />
          </Link>
          {firstName ? (
            <span className="max-w-[130px] truncate text-xs font-semibold text-white/75 hidden sm:inline">
              Olá, <span className="font-bold text-white">{firstName}</span>
            </span>
          ) : null}
        </div>
      </div>
    </header>
  );
}

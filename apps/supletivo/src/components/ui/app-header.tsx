"use client";

import { useEffect, useState, useSyncExternalStore } from "react";

import { AppNav } from "@v7m/ui";

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
    <AppNav
      rightSlot={
        <>
          {firstName ? (
            <span className="max-w-[130px] truncate text-xs font-semibold text-white/75 hidden sm:inline">
              Olá, <span className="font-bold text-white">{firstName}</span>
            </span>
          ) : null}
        </>
      }
    />
  );
}

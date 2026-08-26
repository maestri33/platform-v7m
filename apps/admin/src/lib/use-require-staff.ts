"use client";

import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";

import { ApiError, confirmStaff } from "@/lib/api";
import { clearSession, getAccessToken } from "@/lib/session";

type Phase = "checking" | "ok" | "denied";

/**
 * Guarda de toda tela autenticada do admin. Confirma que há token E que o usuário
 * é SUPERUSER (sonda GET /staff/system via confirmStaff). Sem token → /login;
 * 403 STAFF_ONLY → /login?denied=1 (limpa a sessão); outro erro também volta ao
 * login. Devolve a fase pra a página segurar o conteúdo enquanto "checking".
 *
 * Por que sondar e não confiar no whoami: o whoami não expõe is_superuser, e o
 * gate do staff é por flag no banco — só uma chamada protegida confirma de fato.
 */
export function useRequireStaff(): Phase {
  const router = useRouter();
  const [phase, setPhase] = useState<Phase>("checking");

  useEffect(() => {
    if (!getAccessToken()) {
      router.replace("/login");
      return;
    }
    let cancelled = false;
    confirmStaff()
      .then(() => {
        if (!cancelled) setPhase("ok");
      })
      .catch((e: unknown) => {
        if (cancelled) return;
        const denied = e instanceof ApiError && (e.status === 403 || e.status === 401);
        clearSession();
        setPhase("denied");
        router.replace(denied ? "/login?denied=1" : "/login");
      });
    return () => {
      cancelled = true;
    };
  }, [router]);

  return phase;
}

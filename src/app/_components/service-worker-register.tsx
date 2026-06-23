"use client";

import { useEffect } from "react";

/**
 * Registra o service worker (/sw.js) — só em produção e em contexto seguro (HTTPS).
 * Fica fora do dev de propósito: SW + chunks do Next em dev gera cache velho chato.
 * Renderiza nada; é só o efeito de registro.
 */
export function ServiceWorkerRegister() {
  useEffect(() => {
    if (process.env.NODE_ENV !== "production") return;
    if (typeof navigator === "undefined" || !("serviceWorker" in navigator)) return;

    const register = () => {
      navigator.serviceWorker.register("/sw.js", { scope: "/", updateViaCache: "none" }).catch(() => {
        /* registro best-effort: sem SW o app segue funcionando normalmente */
      });
    };

    if (document.readyState === "complete") {
      register();
      return;
    }
    window.addEventListener("load", register, { once: true });
    return () => window.removeEventListener("load", register);
  }, []);

  return null;
}

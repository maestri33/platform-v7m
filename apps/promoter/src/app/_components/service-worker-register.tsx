"use client";

import { useEffect } from "react";

// Registra o /sw.js APENAS em produção e quando o browser suporta. Em dev o SW
// fica fora do caminho (evita cache atrapalhar o hot-reload). Falha é silenciosa
// — o app funciona sem SW; ele é só progressive enhancement (PWA + estáticos).
export function ServiceWorkerRegister() {
  useEffect(() => {
    if (process.env.NODE_ENV !== "production") return;
    if (!("serviceWorker" in navigator)) return;

    const onLoad = () => {
      navigator.serviceWorker.register("/sw.js").catch(() => {});
    };
    window.addEventListener("load", onLoad);
    return () => window.removeEventListener("load", onLoad);
  }, []);

  return null;
}

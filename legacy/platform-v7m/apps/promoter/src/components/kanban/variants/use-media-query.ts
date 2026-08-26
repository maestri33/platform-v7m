"use client";

import { useSyncExternalStore } from "react";

/**
 * Hook de media query SSR-safe via `useSyncExternalStore`. Retorna
 * `false` no server e no primeiro render do cliente, depois sincroniza
 * com `window.matchMedia`. Sem `useEffect` + `useState` (que dispara
 * a lint `set-state-in-effect` do React 19).
 *
 * Override de teste: a query string `?compact=1` força o retorno
 * `true` (útil pra preview em viewport desktop). Em produção essa
 * override é no-op (NODE_ENV !== 'development').
 */
export function useMediaQuery(query: string): boolean {
  return useSyncExternalStore(
    (notify) => {
      if (typeof window === "undefined" || !window.matchMedia) return () => {};
      const mq = window.matchMedia(query);
      mq.addEventListener("change", notify);
      return () => mq.removeEventListener("change", notify);
    },
    () => {
      if (typeof window === "undefined") return false;
      if (
        process.env.NODE_ENV !== "production" &&
        new URLSearchParams(window.location.search).get("compact") === "1"
      ) {
        return true;
      }
      return window.matchMedia(query).matches;
    },
    () => false,
  );
}

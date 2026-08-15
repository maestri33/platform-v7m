"use client";

import { useEffect } from "react";

/**
 * Sincroniza o `<meta name="theme-color">` com o tema resolvido em runtime.
 *
 * O Next.js `viewport.themeColor` é gerado no SSR com `prefers-color-scheme`
 * como media query, mas NÃO reage à escolha manual do usuário no ThemeToggle.
 * Este componente:
 *  1. Remove o(s) `<meta name="theme-color">` injetado(s) pelo Next.
 *  2. Cria/atualiza uma tag própria que reflete o `data-theme` atual do <html>.
 *  3. Observa mudanças no `data-theme` (ciclo do toggle) e no `prefers-color-scheme`
 *     (mudança do sistema) e atualiza a tag.
 *
 * Cores alinhadas com os tokens `--paper-soft` e `--black` em globals.css.
 */
export function ThemeColorSync() {
  useEffect(() => {
    const LIGHT = "#f5f4f1"; // = --paper-soft
    const DARK = "#0b0b0c"; // = --black

    function current(): "light" | "dark" {
      return document.documentElement.dataset.theme === "dark" ? "dark" : "light";
    }

    function apply() {
      // Remove as tags geradas pelo Next viewport.themeColor (elas têm `media`
      // mas o navegador nem sempre as revaldia após a primeira paint, e elas
      // não reagem à escolha manual do usuário no ThemeToggle).
      document
        .querySelectorAll('meta[name="theme-color"][media]')
        .forEach((el) => el.remove());

      let meta = document.querySelector<HTMLMetaElement>(
        'meta[name="theme-color"]:not([media])',
      );
      if (!meta) {
        meta = document.createElement("meta");
        meta.name = "theme-color";
        document.head.appendChild(meta);
      }
      meta.content = current() === "dark" ? DARK : LIGHT;
    }

    // Primeira sync após hydration
    apply();

    // Reage ao ThemeToggle (que muta data-theme) e ao sistema (matchMedia)
    const html = document.documentElement;
    const obs = new MutationObserver(apply);
    obs.observe(html, { attributes: true, attributeFilter: ["data-theme"] });

    const mq = window.matchMedia("(prefers-color-scheme: dark)");
    const onSystem = () => {
      // Só atualiza se o usuário está em "system" (não escolheu manualmente)
      if (document.documentElement.dataset.themeChoice === "system") apply();
    };
    mq.addEventListener("change", onSystem);

    return () => {
      obs.disconnect();
      mq.removeEventListener("change", onSystem);
    };
  }, []);

  return null;
}

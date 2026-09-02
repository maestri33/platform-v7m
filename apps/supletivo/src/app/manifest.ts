import type { MetadataRoute } from "next";

/**
 * Web App Manifest (servido em /manifest.webmanifest pela convenção do Next).
 * Permite "Adicionar à tela inicial" e abrir em standalone (sem barra do browser).
 * Cores e ícones na identidade da bandeira.
 */
export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "Supletivo Brasil — conclua seus estudos",
    short_name: "Supletivo",
    description:
      "Conclua o Ensino Fundamental ou Médio pelo Supletivo Brasil. Matrícula rápida e 100% online.",
    start_url: "/",
    scope: "/",
    display: "standalone",
    orientation: "portrait",
    lang: "pt-BR",
    dir: "ltr",
    background_color: "#f4f6fb",
    theme_color: "#012169",
    categories: ["education"],
    // SVG vetorial (escala em qualquer densidade). "any" usa a marca arredondada;
    // "maskable" usa um SVG full-bleed com a marca dentro da safe-zone.
    icons: [
      { src: "/icon.svg", sizes: "any", type: "image/svg+xml", purpose: "any" },
      { src: "/icons/maskable.svg", sizes: "any", type: "image/svg+xml", purpose: "maskable" },
    ],
  };
}

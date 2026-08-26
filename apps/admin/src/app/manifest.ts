import type { MetadataRoute } from "next";

/**
 * Web App Manifest do admin. noindex (painel interno). Cores da bandeira.
 */
export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "V7M Staff — administração da plataforma",
    short_name: "V7M Staff",
    description: "Painel administrativo da plataforma V7M / Supletivo Brasil.",
    start_url: "/",
    scope: "/",
    display: "standalone",
    lang: "pt-BR",
    dir: "ltr",
    background_color: "#f4f6fb",
    theme_color: "#012169",
    categories: ["business", "productivity"],
    icons: [{ src: "/icon.svg", sizes: "any", type: "image/svg+xml", purpose: "any" }],
  };
}

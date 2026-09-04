import type { NextConfig } from "next";
import { fileURLToPath } from "node:url";

/**
 * API upstream (Django Ninja). Server-side only — the browser never sees it.
 * Requests to /api/* are proxied here, which kills CORS and mixed-content:
 * the browser only ever talks to the Next origin.
 */
const URL_BACKEND = process.env.URL_BACKEND ?? "http://backend-web:8000";

const CSP = [
  "default-src 'self'",
  "script-src 'self' 'unsafe-inline' https://static.cloudflareinsights.com",
  "style-src 'self' 'unsafe-inline'",
  "img-src 'self' data: blob:",
  "font-src 'self' data:",
  "connect-src 'self' https://viacep.com.br https://*.maestri.group https://*.supletivo.net.br https://*.v7m.org https://cloudflareinsights.com https://*.cloudflareinsights.com",
  "frame-ancestors 'none'",
  "object-src 'none'",
  "base-uri 'self'",
  "form-action 'self'",
].join("; ");

const SECURITY_HEADERS = [
  { key: "Content-Security-Policy", value: CSP },
  { key: "X-Content-Type-Options", value: "nosniff" },
  { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
  { key: "Permissions-Policy", value: "camera=(), microphone=(), geolocation=()" },
  {
    key: "Link",
    value:
      '</.well-known/api-catalog>; rel="api-catalog", </.well-known/mcp/server-card.json>; rel="service-desc", </.well-known/agent-skills/index.json>; rel="describedby"',
  },
];

const nextConfig: NextConfig = {
  output: "standalone",
  turbopack: {
    root: fileURLToPath(new URL("../../", import.meta.url)),
  },
  transpilePackages: ["@v7m/api-client", "@v7m/ui"],
  env: {
    GIT_SHA: process.env.GIT_SHA ?? "unknown",
    BUILD_AT: process.env.BUILD_AT ?? "unknown",
  },
  async headers() {
    return [
      { source: "/:path*", headers: SECURITY_HEADERS },
      {
        source: "/.well-known/:path*",
        headers: [
          { key: "Access-Control-Allow-Origin", value: "*" },
          { key: "Access-Control-Allow-Methods", value: "GET, OPTIONS" },
          { key: "Access-Control-Allow-Headers", value: "Content-Type, Authorization, Accept" },
          { key: "Cache-Control", value: "public, max-age=3600" },
        ],
      },
    ];
  },
  async rewrites() {
    return [
      { source: "/api/:path*", destination: `${URL_BACKEND}/api/:path*` },
      { source: "/media/:path*", destination: `${URL_BACKEND}/media/:path*` },
    ];
  },
  async redirects() {
    return [
      { source: "/admin", destination: "/dashboard", permanent: false },
      { source: "/painel", destination: "/dashboard", permanent: false },
      { source: "/vendas", destination: "/promoter", permanent: false },
      { source: "/vendas/leads", destination: "/promoter/leads", permanent: false },
      { source: "/vendas/comissoes", destination: "/promoter/comissoes", permanent: false },
      { source: "/vendas/treinamento", destination: "/promoter/treino", permanent: false },
      { source: "/comissoes", destination: "/promoter/comissoes", permanent: false },
      { source: "/pix", destination: "/conta", permanent: false },
      { source: "/treinamento", destination: "/promoter/treino", permanent: false },
      { source: "/equipe", destination: "/rede", permanent: false },
      { source: "/candidatos", destination: "/leads", permanent: false },
    ];
  },
};

export default nextConfig;

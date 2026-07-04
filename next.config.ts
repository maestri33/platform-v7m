import type { NextConfig } from "next";

/**
 * API upstream (Django Ninja). Server-side only — the browser never sees it.
 * Requests to /api/* are proxied here, which kills CORS and mixed-content:
 * the browser only ever talks to the Next origin.
 */
const URL_BACKEND = process.env.URL_BACKEND ?? "http://10.1.20.30";

const CSP = [
  "default-src 'self'",
  "script-src 'self' 'unsafe-inline'",
  "style-src 'self' 'unsafe-inline'",
  "img-src 'self' data: blob:",
  "font-src 'self' data:",
  "connect-src 'self' https://servicodados.ibge.gov.br",
  "frame-ancestors 'none'",
  "object-src 'none'",
  "base-uri 'self'",
  "form-action 'self'",
].join("; ");

const SECURITY_HEADERS = [
  { key: "Content-Security-Policy", value: CSP },
  { key: "X-Content-Type-Options", value: "nosniff" },
  { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
  { key: "Permissions-Policy", value: "camera=(self), microphone=(), geolocation=()" },
];

const nextConfig: NextConfig = {
  transpilePackages: ["@supletivo/ui"],
  // Proveniência do build: inlinado a partir do que o deploy.yml exporta antes
  // do `npm run build`. Exposto em /healthz para auditar o commit que está no ar.
  env: {
    GIT_SHA: process.env.GIT_SHA ?? "unknown",
    BUILD_AT: process.env.BUILD_AT ?? "unknown",
  },
  // Libera o acesso ao dev server pela rede local (ex.: testar no celular).
  allowedDevOrigins: ["10.1.30.34"],
  async headers() {
    return [
      { source: "/:path*", headers: SECURITY_HEADERS },
      // SW sempre revalidado: um deploy novo nunca fica preso num /sw.js velho.
      {
        source: "/sw.js",
        headers: [{ key: "Cache-Control", value: "no-cache, no-store, must-revalidate" }],
      },
    ];
  },
  async rewrites() {
    return [
      { source: "/api/:path*", destination: `${URL_BACKEND}/api/:path*` },
      // /media/* (diploma, histórico, foto da retirada, docs do aluno) servido pelo Django no mesmo
      // host do /api: proxiado pela mesma origem pra casar com a CSP img-src 'self' e evitar CORS.
      { source: "/media/:path*", destination: `${URL_BACKEND}/media/:path*` },
    ];
  },
};

export default nextConfig;

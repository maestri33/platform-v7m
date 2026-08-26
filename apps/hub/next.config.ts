import type { NextConfig } from "next";
import { fileURLToPath } from "node:url";

const URL_BACKEND = process.env.URL_BACKEND ?? process.env.HUB_BACKEND_ORIGIN ?? "http://127.0.0.1:8001";

const isDev = process.env.NODE_ENV === "development";

const CSP = [
  "default-src 'self'",
  `script-src 'self' 'unsafe-inline'${isDev ? " 'unsafe-eval'" : ""}`,
  "style-src 'self' 'unsafe-inline'",
  "img-src 'self' data: blob:",
  "font-src 'self' data:",
  "connect-src 'self' https://*.maestri.group https://*.supletivo.net.br https://*.v7m.org",
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
];

const nextConfig: NextConfig = {
  output: "standalone",
  turbopack: {
    root: fileURLToPath(new URL("../../", import.meta.url)),
  },
  transpilePackages: ["@v7m/api-client", "@v7m/ui"],
  allowedDevOrigins: ["127.0.0.1", "localhost"],
  env: {
    GIT_SHA: process.env.GIT_SHA ?? "unknown",
    BUILD_AT: process.env.BUILD_AT ?? "unknown",
  },
  async headers() {
    return [{ source: "/:path*", headers: SECURITY_HEADERS }];
  },
  async rewrites() {
    return [
      { source: "/api/:path*", destination: `${URL_BACKEND}/api/:path*` },
      { source: "/media/:path*", destination: `${URL_BACKEND}/media/:path*` },
    ];
  },
};

export default nextConfig;

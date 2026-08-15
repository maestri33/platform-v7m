import type { NextConfig } from "next";

// Headers de segurança (régua do app dos alunos). DIFERENÇA proposital: aqui o
// browser só fala com a própria origem Next — os route handlers (`app/api/*`)
// é que falam com o backend server-side, carregando o cookie HttpOnly. Por isso
// `connect-src 'self'` basta e NÃO existe rewrite `/api/:path*` (o supletivo usa
// token client-side + rewrite; nós mantemos cookie + proxy).
const isDev = process.env.NODE_ENV === "development";

const csp = [
  "default-src 'self'",
  "base-uri 'self'",
  "form-action 'self'",
  "frame-ancestors 'none'",
  "object-src 'none'",
  "img-src 'self' data: blob:",
  "font-src 'self' data:",
  "style-src 'self' 'unsafe-inline'",
  // Next injeta runtime/hydration inline; em dev o React Refresh precisa de eval.
  `script-src 'self' 'unsafe-inline'${isDev ? " 'unsafe-eval'" : ""}`,
  "connect-src 'self'",
  "worker-src 'self' blob:",
  "manifest-src 'self'",
].join("; ");

const nextConfig: NextConfig = {
  turbopack: {
    root: __dirname,
  },

  // Build self-contido p/ deploy (1 LXC + reverse proxy, CONVENTION §11):
  // gera `.next/standalone` com o server Node mínimo (sem node_modules inteiro).
  output: "standalone",

  async headers() {
    return [
      {
        source: "/:path*",
        headers: [
          { key: "Content-Security-Policy", value: csp },
          { key: "X-Content-Type-Options", value: "nosniff" },
          { key: "X-Frame-Options", value: "DENY" },
          { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
          { key: "Permissions-Policy", value: "camera=(self), microphone=(), geolocation=()" },
        ],
      },
    ];
  },
};

export default nextConfig;

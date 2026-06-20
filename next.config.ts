import type { NextConfig } from "next";

/**
 * API upstream (Django Ninja). Server-side only — the browser never sees it.
 * Requests to /api/* are proxied here, which kills CORS and mixed-content:
 * the browser only ever talks to the Next origin.
 */
const URL_BACKEND = process.env.URL_BACKEND ?? "http://10.1.20.30";

const nextConfig: NextConfig = {
  async rewrites() {
    return [{ source: "/api/:path*", destination: `${URL_BACKEND}/api/:path*` }];
  },
};

export default nextConfig;

import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  output: "standalone",
  poweredByHeader: false,
  // origin sem gzip: o Cloudflare aplica brotli/zstd na borda (melhor razão)
  compress: false,
  async headers() {
    return [
      {
        // HTML no default do Next sai com s-maxage=1 ano — deploy não propaga
        source: "/",
        headers: [
          {
            key: "Cache-Control",
            value: "public, max-age=0, s-maxage=60, stale-while-revalidate=86400",
          },
        ],
      },
      {
        source: "/:path*",
        headers: [
          { key: "X-Content-Type-Options", value: "nosniff" },
          { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
          { key: "X-Frame-Options", value: "DENY" },
        ],
      },
      {
        // trilha pesada de vídeo/posters: cache de 1h + revalidação em
        // background (sem immutable — os nomes de arquivo são reutilizados)
        source: "/scroll-world/:path*",
        headers: [
          {
            key: "Cache-Control",
            value: "public, max-age=3600, stale-while-revalidate=86400",
          },
        ],
      },
      {
        source:
          "/:file(icon\\.png|apple-icon\\.png|opengraph-image\\.jpg|favicon\\.ico)",
        headers: [
          {
            key: "Cache-Control",
            value: "public, max-age=3600, stale-while-revalidate=86400",
          },
        ],
      },
      {
        source:
          "/:file(ieadpg-logo\\.webp|flame\\.webp|ieadpg-logo\\.png|flame\\.png)",
        headers: [
          {
            key: "Cache-Control",
            value: "public, max-age=3600, stale-while-revalidate=86400",
          },
        ],
      },
    ];
  },
};

export default nextConfig;

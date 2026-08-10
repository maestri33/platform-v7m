import type { MetadataRoute } from "next";

export default function sitemap(): MetadataRoute.Sitemap {
  return [
    {
      url: "https://ieadpg.org/",
      // data fixa: bump manual quando copy/estrutura mudar de verdade
      // (lastmod que muda a cada deploy vira ruído e o Google passa a ignorar)
      lastModified: new Date("2026-08-10"),
      changeFrequency: "monthly",
      priority: 1,
    },
  ];
}

import { writeFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';

// Páginas fora do sitemap (só a 404 — legais entram, já com CNPJ real).
const EXCLUDE = new Set(['404/']);

/**
 * Gera sitemap.xml e robots.txt no build, a partir do `site` do astro.config.
 * @returns {import('astro').AstroIntegration}
 */
export default function seoFiles() {
  /** @type {string | undefined} */
  let site;

  return {
    name: 'seo-files',
    hooks: {
      'astro:config:done': ({ config }) => {
        site = config.site;
      },
      'astro:build:done': async ({ dir, pages, logger }) => {
        if (!site) {
          logger.warn('`site` não configurado — sitemap.xml/robots.txt não gerados.');
          return;
        }
        const base = site.endsWith('/') ? site : `${site}/`;
        // ISO 8601 completo com offset (W3C Datetime). `Z` ≡ `+00:00`.
        const lastmod = new Date().toISOString();

        const urls = pages
          .filter((p) => !EXCLUDE.has(p.pathname))
          .map(
            (p) =>
              `  <url>\n    <loc>${base}${p.pathname}</loc>\n    <lastmod>${lastmod}</lastmod>\n  </url>`
          )
          .join('\n');

        const sitemap = `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${urls}\n</urlset>\n`;
        const robots = `User-agent: *\nAllow: /\n\nSitemap: ${base}sitemap.xml\n`;

        await writeFile(fileURLToPath(new URL('./sitemap.xml', dir)), sitemap, 'utf-8');
        await writeFile(fileURLToPath(new URL('./robots.txt', dir)), robots, 'utf-8');
        logger.info('sitemap.xml e robots.txt gerados.');
      },
    },
  };
}

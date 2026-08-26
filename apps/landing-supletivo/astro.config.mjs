// @ts-check
import { defineConfig } from 'astro/config';
import { loadEnv } from 'vite';
import seoFiles from './integrations/seo-files.mjs';

// SITE = domínio canônico (canonical, OG, sitemap.xml, robots.txt).
// Configurável via .env ou variável de ambiente no build.
const env = loadEnv(process.env.NODE_ENV ?? 'production', process.cwd(), '');
const SITE = env.SITE ?? 'https://supletivo.net.br';

export default defineConfig({
  site: SITE,
  output: 'static',
  trailingSlash: 'ignore',
  build: {
    // CSS pequeno → inline no HTML, elimina request render-blocking
    inlineStylesheets: 'always',
  },
  integrations: [seoFiles()],
});

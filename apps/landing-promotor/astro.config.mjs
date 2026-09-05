// @ts-check
import { defineConfig } from 'astro/config';
import react from '@astrojs/react';
import seoFiles from './integrations/seo-files.mjs';

// SITE = domínio canônico (canonical, OG, sitemap.xml, robots.txt).
// Configurável via .env ou variável de ambiente no build.
const SITE = process.env.SITE ?? 'https://maestri.group';

export default defineConfig({
  site: SITE,
  output: 'static',
  trailingSlash: 'ignore',
  // CSS scoped via `.astro-xxxx` em vez de `[data-astro-cid-xxxx]`:
  // árvore de a11y/DOM limpa, mesma especificidade (0,1,0).
  scopedStyleStrategy: 'class',
  build: {
    // CSS pequeno → inline no HTML, elimina request render-blocking
    inlineStylesheets: 'always',
  },
  integrations: [react(), seoFiles()],
});

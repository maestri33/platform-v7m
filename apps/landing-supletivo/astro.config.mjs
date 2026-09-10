// @ts-check
import { defineConfig } from 'astro/config';
import react from '@astrojs/react';
import tailwindcss from '@tailwindcss/vite';
import seoFiles from './integrations/seo-files.mjs';

// SITE = domínio canônico (canonical, OG, sitemap.xml, robots.txt).
// Configurável via .env ou variável de ambiente no build.
const SITE = process.env.SITE ?? 'https://supletivo.net.br';

export default defineConfig({
  site: SITE,
  output: 'static',
  trailingSlash: 'ignore',
  build: {
    // CSS pequeno → inline no HTML, elimina request render-blocking
    inlineStylesheets: 'always',
  },
  vite: {
    plugins: [tailwindcss()],
    build: {
      chunkSizeWarningLimit: 800,
      rollupOptions: {
        output: {
          manualChunks(id) {
            if (id.includes('node_modules/motion')) return 'vendor-motion';
            if (id.includes('node_modules/react')) return 'vendor-react';
          },
        },
      },
    },
  },
  integrations: [react(), seoFiles()],
});


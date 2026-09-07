#!/usr/bin/env node
/**
 * Script de Rebuild Atômico da Landing Page Astro (@v7m/landing-supletivo).
 * Executado quando as configurações de valores/preços são alteradas no backend
 * ou via webhooks de revalidação de conteúdo estático.
 */
import { execSync } from 'node:child_process';
import { existsSync, readFileSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const REPO_ROOT = resolve(__dirname, '..');
const DIST_INDEX = resolve(REPO_ROOT, 'apps/landing-supletivo/dist/index.html');

console.log('🔄 [Astro Rebuild] Iniciando compilação de @v7m/landing-supletivo com dados frescos da API...');

const startTime = Date.now();

try {
  // Executa o build estático do Astro
  execSync('pnpm --filter @v7m/landing-supletivo build', {
    cwd: REPO_ROOT,
    stdio: 'inherit',
    env: {
      ...process.env,
      NODE_ENV: 'production',
    },
  });

  if (!existsSync(DIST_INDEX)) {
    throw new Error(`Arquivo esperado de saída não encontrado: ${DIST_INDEX}`);
  }

  const html = readFileSync(DIST_INDEX, 'utf-8');
  const duration = ((Date.now() - startTime) / 1000).toFixed(2);

  console.log(`✅ [Astro Rebuild] Sucesso! Páginas e ilhas compiladas em ${duration}s.`);
  console.log(`   - Output gerado: ${DIST_INDEX} (${(html.length / 1024).toFixed(1)} KB)`);
} catch (error) {
  console.error('❌ [Astro Rebuild] Falha durante a compilação do Astro:', error);
  process.exit(1);
}

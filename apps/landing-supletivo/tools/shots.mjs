/**
 * Screenshots de verificação das peças SVG animadas, por seção.
 * Congela cada animação num frame legível antes de capturar.
 * Uso: PORT=<porta> node tools/shots.mjs (preview já rodando)
 */
import { chromium } from '@playwright/test';
import { createConnection } from 'node:net';
import { existsSync, readdirSync } from 'node:fs';
import { join } from 'node:path';

// --- port autodetect --------------------------------------------------------
// O `npm run preview` por padrão escuta em :4321, mas esse host tem
// `landing-promotor` e `app-supletivo` ocupando o mesmo. Aceita PORT na env,
// depois tenta :4321, depois 4325, 4399.
async function pickPort() {
  const candidates = [
    Number(process.env.PORT),
    4321, 4325, 4399, 4500, 4600, 4700, 4800, 5000,
  ].filter(Boolean);
  for (const p of candidates) {
    if (await open(p)) return p;
  }
  throw new Error('No preview server found on: ' + candidates.join(', '));
}
function open(port) {
  return new Promise((resolveP) => {
    const sock = createConnection({ host: '127.0.0.1', port });
    const done = (ok) => { sock.destroy(); resolveP(ok); };
    sock.setTimeout(800, () => done(false));
    sock.once('connect', () => done(true));
    sock.once('error', () => done(false));
  });
}

// --- chromium resolve -------------------------------------------------------
// Playwright 1.60 quer chromium-1223 mas essa imagem tem 1228 (cache pré-
// instalado). Resolvemos o binário mais novo presente em
// `~/.cache/ms-playwright/chromium-*/chrome-linux64/chrome` e caímos pra
// `/usr/bin/chromium` se não houver.
function resolveChromium() {
  const home = process.env.HOME || '/root';
  const root = process.env.PLAYWRIGHT_BROWSERS_PATH || join(home, '.cache', 'ms-playwright');
  const candidates = [];
  if (existsSync(root)) {
    for (const name of readdirSync(root)) {
      if (/^chromium-\d+$/.test(name)) {
        const p = join(root, name, 'chrome-linux64', 'chrome');
        if (existsSync(p)) candidates.push(p);
      }
    }
  }
  candidates.sort().reverse();
  if (candidates.length) return candidates[0];
  for (const sys of ['/usr/bin/chromium', '/usr/bin/chromium-browser', '/usr/bin/google-chrome']) {
    if (existsSync(sys)) return sys;
  }
  return null;
}

const port = await pickPort();
const URL = `http://127.0.0.1:${port}/`;
console.log(`[shots] preview at ${URL} (override with PORT=<n>)`);

const EXEC = resolveChromium();
if (!EXEC) {
  console.error('No chromium binary found. Run `npx playwright install chromium` or `apt-get install -y chromium`.');
  process.exit(1);
}
const browser = await chromium.launch({ executablePath: EXEC, args: ['--no-sandbox'] });
const page = await browser.newPage({ viewport: { width: 1280, height: 800 } });
await page.goto(URL, { waitUntil: 'networkidle' });

// estados visuais determinísticos
await page.evaluate(() => {
  document.querySelectorAll('[data-reveal],[data-seal],[data-cert]').forEach((el) => el.classList.add('in-view'));
  document.querySelectorAll('[data-lit]').forEach((el) => el.classList.add('lit'));
});

// Screenshots por seção — `locator.screenshot()` lê o bounding box do
// elemento (não do viewport scrollado) e contorna o bug do
// `html { scroll-behavior: smooth }` que faz `page.screenshot()` capturar
// o frame não-scrollado depois de um `window.scrollTo({behavior:'instant'})`.
const shots = [
  ['espelho', 'mirror'],
  ['elegibilidade', 'eligibility'],
  ['confianca', 'trust'],
  ['faq', 'faq'],
  ['final', 'final'],
];

for (const [id, name] of shots) {
  if (name === 'eligibility') {
    // clica "18 ou mais" → cancela deve levantar
    await page.locator('section#elegibilidade').scrollIntoViewIfNeeded();
    await page.waitForTimeout(200);
    await page.click('[data-elig="18mais"]');
    await page.waitForTimeout(900);
  }
  await page.locator(`section#${id}`).screenshot({ path: `tools/shot-${name}.png` });
  console.log(`  shot-${name}.png`);
}

await browser.close();
console.log('shots ok');

/**
 * Screenshots de verificação das seções, por âncora.
 * Congela cada animação num frame legível antes de capturar.
 * Uso: node tools/shots.mjs (preview já rodando em :4321)
 */
import { chromium } from '@playwright/test';

const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: 1280, height: 800 } });
await page.goto('http://localhost:4321/', { waitUntil: 'networkidle' });

// estados visuais determinísticos
await page.evaluate(() => {
  document.querySelectorAll('[data-reveal],[data-seal]').forEach((el) => el.classList.add('in-view'));
  document.querySelectorAll('[data-lit]').forEach((el) => el.classList.add('lit'));
});

const shots = [
  ['como-funciona', 'steps'],
  ['ganhos', 'earnings'],
  ['caminho', 'path'],
  ['confianca', 'trust'],
  ['faq', 'faq'],
  ['final', 'final'],
];

for (const [id, name] of shots) {
  await page.evaluate((sel) => {
    document.getElementById(sel)?.scrollIntoView({ behavior: 'instant', block: 'start' });
  }, id);
  await page.waitForTimeout(450);
  await page.screenshot({ path: `tools/shot-${name}.png` });
}

// footer
await page.evaluate(() => window.scrollTo({ top: document.body.scrollHeight, behavior: 'instant' }));
await page.waitForTimeout(450);
await page.screenshot({ path: 'tools/shot-footer.png' });

await browser.close();
console.log('shots ok');

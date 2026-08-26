const {chromium} = require('playwright');
const fs = require('fs');
const path = require('path');

const BASE = 'http://localhost:4321';
const PAGES = ['/', '/privacidade', '/termos'];
const VIEWPORTS = [
  { name: '360px', width: 360, height: 800 },
  { name: '768px', width: 768, height: 1024 },
  { name: '1440px', width: 1440, height: 900 },
];

const outDir = path.join(__dirname, '..', 'shots', 'verification');
fs.mkdirSync(outDir, { recursive: true });

(async () => {
  const browser = await chromium.launch();
  for (const page of PAGES) {
    for (const vp of VIEWPORTS) {
      const ctx = await browser.newContext({ viewport: { width: vp.width, height: vp.height } });
      const tab = await ctx.newPage();
      await tab.goto(`${BASE}${page}`, { waitUntil: 'networkidle', timeout: 15000 });
      const slug = page === '/' ? 'home' : page.replace(/\//g, '');
      const file = path.join(outDir, `${slug}-${vp.name}.png`);
      await tab.screenshot({ path: file, fullPage: true });
      console.log(`✓ ${file}`);
      await ctx.close();
    }
  }
  await browser.close();
})();

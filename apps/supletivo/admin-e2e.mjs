import { chromium } from 'playwright';
import fs from 'fs';
import path from 'path';

const outDir = 'C:\\Users\\maestri33\\dev\\v7m\\screenshots\\e2e';
if (!fs.existsSync(outDir)) {
  fs.mkdirSync(outDir, { recursive: true });
}

async function takeScreenshots(page, name) {
  // Desktop
  await page.setViewportSize({ width: 1440, height: 900 });
  await page.waitForTimeout(2000);
  await page.screenshot({ path: path.join(outDir, `admin-desktop-${name}.png`), fullPage: true });

  // Mobile
  await page.setViewportSize({ width: 390, height: 844 });
  await page.waitForTimeout(2000);
  await page.screenshot({ path: path.join(outDir, `admin-mobile-${name}.png`), fullPage: true });
}

(async () => {
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext();
  const page = await context.newPage();
  
  try {
    console.log('Navigating to login...');
    await page.goto('http://localhost:3003/login', { waitUntil: 'networkidle' });
    await takeScreenshots(page, 'login');

    console.log('Logging in...');
    await page.fill('input[type="text"], input[name="cpf"]', '11144477735');
    await page.fill('input[type="password"], input[name="password"]', '1993');
    await page.click('button[type="submit"]');
    
    await page.waitForTimeout(3000);
    console.log('Taking dashboard screenshot...');
    await takeScreenshots(page, 'dashboard');

    const paths = [
      { url: 'http://localhost:3003/financeiro', name: 'financeiro' },
      { url: 'http://localhost:3003/treinamento', name: 'treinamento' },
      { url: 'http://localhost:3003/integracoes', name: 'integracoes' }
    ];

    for (const p of paths) {
      console.log(`Navigating to ${p.name}...`);
      await page.goto(p.url, { waitUntil: 'networkidle' });
      await takeScreenshots(page, p.name);
    }
  } catch (error) {
    console.error('Error during execution:', error);
  } finally {
    await browser.close();
  }
})();

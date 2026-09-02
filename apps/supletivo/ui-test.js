const { chromium } = require('playwright');
const fs = require('fs');
const path = require('path');

const routes = ['/', '/painel', '/documento', '/endereco', '/pix', '/escolaridade', '/selfie', '/treinamento'];
const baseUrl = 'http://localhost:3001';
const screenshotDir = 'C:\\Users\\maestri33\\dev\\v7m\\screenshots\\e2e\\';

(async () => {
  if (!fs.existsSync(screenshotDir)) {
    fs.mkdirSync(screenshotDir, { recursive: true });
  }

  const browser = await chromium.launch();
  
  for (const route of routes) {
    const routeName = route === '/' ? 'index' : route.replace('/', '');
    
    // Desktop
    let context = await browser.newContext({
      viewport: { width: 1440, height: 900 }
    });
    let page = await context.newPage();
    try {
      await page.goto(`${baseUrl}${route}`, { waitUntil: 'networkidle', timeout: 10000 });
      await page.screenshot({ path: path.join(screenshotDir, `v7m-desktop-${routeName}.png`) });
    } catch (e) {
      console.error(`Error loading desktop ${route}: ${e.message}`);
    }
    await context.close();

    // Mobile
    context = await browser.newContext({
      viewport: { width: 390, height: 844 },
      userAgent: 'Mozilla/5.0 (iPhone; CPU iPhone OS 15_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/15.0 Mobile/15E148 Safari/604.1'
    });
    page = await context.newPage();
    try {
      await page.goto(`${baseUrl}${route}`, { waitUntil: 'networkidle', timeout: 10000 });
      await page.screenshot({ path: path.join(screenshotDir, `v7m-mobile-${routeName}.png`) });
    } catch (e) {
      console.error(`Error loading mobile ${route}: ${e.message}`);
    }
    await context.close();
    console.log(`Screenshots taken for ${route}`);
  }

  await browser.close();
})();

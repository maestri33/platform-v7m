import { chromium, devices } from 'playwright';
import fs from 'fs';
import path from 'path';

const outDir = 'c:\\Users\\maestri33\\dev\\v7m\\screenshots\\e2e';
if (!fs.existsSync(outDir)) {
  fs.mkdirSync(outDir, { recursive: true });
}

const routes = [
  '/',
  '/login',
  '/cpf',
  '/email',
  '/planos',
  '/checkout',
  '/aluno',
  '/kit',
  '/matricula'
];

const baseUrl = 'http://localhost:3020';

(async () => {
  const browser = await chromium.launch();
  
  // Mobile setup (iPhone 12 - 390x844)
  const mobileContext = await browser.newContext({
    viewport: { width: 390, height: 844 },
    userAgent: 'Mozilla/5.0 (iPhone; CPU iPhone OS 14_4 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/14.0.3 Mobile/15E148 Safari/604.1'
  });
  const mobilePage = await mobileContext.newPage();

  // Desktop setup (1440x900)
  const desktopContext = await browser.newContext({
    viewport: { width: 1440, height: 900 }
  });
  const desktopPage = await desktopContext.newPage();

  for (const route of routes) {
    const url = `${baseUrl}${route}`;
    const safeRoute = route === '/' ? 'home' : route.replace(/\//g, '-').replace(/^-|-$/g, '');
    
    console.log(`Visiting ${url}`);
    
    // Mobile
    try {
      await mobilePage.goto(url, { waitUntil: 'networkidle', timeout: 10000 });
      await mobilePage.waitForTimeout(1000); // give it a sec to render any animations/redirects
      await mobilePage.screenshot({ path: path.join(outDir, `supletivo-mobile-${safeRoute}.png`) });
    } catch (e) {
      console.error(`Error on mobile ${route}:`, e.message);
    }

    // Desktop
    try {
      await desktopPage.goto(url, { waitUntil: 'networkidle', timeout: 10000 });
      await desktopPage.waitForTimeout(1000); // give it a sec to render any animations/redirects
      await desktopPage.screenshot({ path: path.join(outDir, `supletivo-desktop-${safeRoute}.png`) });
    } catch (e) {
      console.error(`Error on desktop ${route}:`, e.message);
    }
  }

  await browser.close();
  console.log('Done!');
})();

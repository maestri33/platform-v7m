import { chromium } from 'playwright';
import fs from 'fs';
import path from 'path';

const outDir = 'c:\\Users\\maestri33\\dev\\v7m\\screenshots\\e2e';
if (!fs.existsSync(outDir)) {
  fs.mkdirSync(outDir, { recursive: true });
}

const baseUrl = 'http://localhost:3020';

const routes = [
  { name: 'home', path: '/' },
  { name: 'login', path: '/login' },
  { name: 'cpf', path: '/cpf' },
  { name: 'email', path: '/email' },
  { name: 'planos', path: '/planos' },
  { name: 'checkout', path: '/checkout' },
  { name: 'aluno-preview-pending', path: '/aluno/preview?status=pending_documents' },
  { name: 'aluno-preview-review', path: '/aluno/preview?status=under_review' },
  { name: 'aluno-preview-approved', path: '/aluno/preview?status=documents_approved' },
  { name: 'matricula-preview-rg', path: '/matricula/preview?step=rg' },
  { name: 'matricula-preview-address', path: '/matricula/preview?step=address' },
  { name: 'matricula-preview-education', path: '/matricula/preview?step=education' },
  { name: 'matricula-preview-selfie', path: '/matricula/preview?step=selfie' },
  { name: 'matricula-preview-credentials', path: '/matricula/preview?step=credentials' },
  { name: 'kit', path: '/kit' },
  { name: 'provas', path: '/provas' },
];

(async () => {
  console.log('Launching browser...');
  const browser = await chromium.launch();

  // Mobile Context (iPhone 12 - 390x844)
  const mobileContext = await browser.newContext({
    viewport: { width: 390, height: 844 },
    userAgent: 'Mozilla/5.0 (iPhone; CPU iPhone OS 14_4 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/14.0.3 Mobile/15E148 Safari/604.1',
    deviceScaleFactor: 2,
  });
  const mobilePage = await mobileContext.newPage();

  // Desktop Context (1440x900)
  const desktopContext = await browser.newContext({
    viewport: { width: 1440, height: 900 },
    deviceScaleFactor: 2,
  });
  const desktopPage = await desktopContext.newPage();

  for (const item of routes) {
    const url = `${baseUrl}${item.path}`;
    console.log(`[Mobile] Capturing ${item.name} from ${url}`);
    try {
      await mobilePage.goto(url, { waitUntil: 'networkidle', timeout: 8000 });
      await mobilePage.waitForTimeout(600);
      await mobilePage.screenshot({
        path: path.join(outDir, `v2-mobile-${item.name}.png`),
        fullPage: false,
      });
    } catch (e) {
      console.error(`Error on mobile ${item.name}: ${e.message}`);
    }

    console.log(`[Desktop] Capturing ${item.name} from ${url}`);
    try {
      await desktopPage.goto(url, { waitUntil: 'networkidle', timeout: 8000 });
      await desktopPage.waitForTimeout(600);
      await desktopPage.screenshot({
        path: path.join(outDir, `v2-desktop-${item.name}.png`),
        fullPage: false,
      });
    } catch (e) {
      console.error(`Error on desktop ${item.name}: ${e.message}`);
    }
  }

  // Also capture Home with typing / interaction
  console.log('Capturing Home input states...');
  try {
    await mobilePage.goto(`${baseUrl}/`, { waitUntil: 'networkidle' });
    await mobilePage.waitForTimeout(500);
    const inputMobile = mobilePage.locator('#lead-phone');
    if (await inputMobile.count() > 0) {
      await inputMobile.fill('(11) 9876');
      await mobilePage.waitForTimeout(300);
      await mobilePage.screenshot({ path: path.join(outDir, 'v2-mobile-home-typing.png') });
    }

    await desktopPage.goto(`${baseUrl}/`, { waitUntil: 'networkidle' });
    await desktopPage.waitForTimeout(500);
    const inputDesktop = desktopPage.locator('#lead-phone');
    if (await inputDesktop.count() > 0) {
      await inputDesktop.fill('(11) 9876');
      await desktopPage.waitForTimeout(300);
      await desktopPage.screenshot({ path: path.join(outDir, 'v2-desktop-home-typing.png') });
    }
  } catch (e) {
    console.error('Error capturing input interaction:', e.message);
  }

  await browser.close();
  console.log('All screenshots captured successfully!');
})();

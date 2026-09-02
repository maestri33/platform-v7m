import { chromium } from 'playwright';
import fs from 'fs';
import path from 'path';

const outDir = 'C:\\Users\\maestri33\\dev\\v7m\\screenshots\\e2e';
if (!fs.existsSync(outDir)) {
  fs.mkdirSync(outDir, { recursive: true });
}

const tokens = {
  "access_token": "eyJhbGciOiJSUzI1NiIsInR5cCI6IkpXVCJ9.eyJ0b2tlbl90eXBlIjoiYWNjZXNzIiwiZXhwIjoxNzg3MTc2ODg4LCJpYXQiOjE3ODcxNzUwODgsImp0aSI6IjUyNDU1NDdlNjZkZTQxMDViMWQ3MWY5YTA4NDIxOWQyIiwiZXh0ZXJuYWxfaWQiOiIxNjdjMjBmNS0zYWRmLTQ2NmEtOTIwYi0zN2ZhMTc3NmE2ODAiLCJyb2xlcyI6WyJjb29yZGluYXRvciIsInByb21vdGVyIiwic3RhZmYiXSwidG9rZW5fdmVyc2lvbiI6MCwiaXNzIjoic3VwbGV0aXZvIn0.WoDDRab7rmzpVPjsSjm6arE1IAbjOaSL0ePNyNeCDMv4XkVUdJ_bercX-mUFOjexhiQD7dQ0wZjaKtavXzwjg943H1_R--78FPX-BKUzZ0SBqrT02HX0chqGdQh6_xZqfREkRy2X5LvT5gZK4bY9PTwUGHvAyAL9Grbvd3BN9hv3yc5S5HO4pyt389FTtmDrxQEkiWYGe2DikBL8kljscnynRzoqY-NtnGUa7Ua5A2v-RGry9QdbgW7E2xTbTGTtXTDcp7aPOW136bl7K3JstJZ1XFLNSnsAoEMWAijgmOzEto7NP-h85zEtst83gRKX4iepGlgSR1WSYm7fCtEX1Q",
  "refresh_token": "eyJhbGciOiJSUzI1NiIsInR5cCI6IkpXVCJ9.eyJ0b2tlbl90eXBlIjoicmVmcmVzaCIsImV4cCI6MTc4NzI2MTQ4OCwiaWF0IjoxNzg3MTc1MDg4LCJqdGkiOiI0NWUwMTQ0NWMxNjY0ZDhjYTJjNDZiMmE5ODJiZTQ5YiIsImV4dGVybmFsX2lkIjoiMTY3YzIwZjUtM2FkZi00NjZhLTkyMGItMzdmYTE3NzZhNjgwIiwicm9sZXMiOlsiY29vcmRpbmF0b3IiLCJwcm9tb3RlciIsInN0YWZmIl0sInRva2VuX3ZlcnNpb24iOjAsImlzcyI6InN1cGxldGl2byJ9.gEOQQQTIhcatai4j4W6lBc_twKNyXtIRMk7ebIu8NwHWo8YE178XR_rhKFTFpWupl9vKIaeX0aaAEoWDYOUVwF9P4BsRKxaWKkleoLynihdBJG494VqqtWuXTQHKwen8K47zydF3PJ02kky8JjsNQ4Xe-gN9vuXjjc67YDystfBhJwW2Xj-LRToZ9QjtLDWh2mRVkbqoolMIaVPKTpFGkkoEDBPRkhbS25iwfmRtUA3Oga4u_52zyjPLeeTtOCyIytmHrQdpwl6BsttA84VmR6zbVXPvqMuyFy-olgyym1lhJtw1Q2XWxpSUyMHG1g3pKsD4RV_mz_SwCHMat-2cAw",
  "token_type": "bearer"
};

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
    console.log('Injecting auth state...');
    await page.goto('http://localhost:3003/healthz'); // go somewhere to set localStorage
    await page.evaluate((val) => {
      window.localStorage.setItem('staff.login', JSON.stringify(val));
    }, tokens);

    const paths = [
      { url: 'http://localhost:3003/dashboard', name: 'dashboard' },
      { url: 'http://localhost:3003/dashboard/leads', name: 'dashboard-leads' },
      { url: 'http://localhost:3003/dashboard/alunos', name: 'dashboard-alunos' },
      { url: 'http://localhost:3003/financeiro', name: 'financeiro' },
      { url: 'http://localhost:3003/treinamento', name: 'treinamento' },
      { url: 'http://localhost:3003/integracoes', name: 'integracoes' }
    ];

    for (const p of paths) {
      console.log(`Navigating to ${p.name}...`);
      await page.goto(p.url, { waitUntil: 'networkidle' });
      await takeScreenshots(page, p.name);
    }
    console.log('Done!');
  } catch (error) {
    console.error('Error during execution:', error);
  } finally {
    await browser.close();
  }
})();

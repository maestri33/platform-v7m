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

async function capture(page, name) {
  // Desktop 1440x900
  await page.setViewportSize({ width: 1440, height: 900 });
  await page.waitForTimeout(1000);
  await page.screenshot({ path: path.join(outDir, `admin-desktop-${name}.png`), fullPage: true });

  // Mobile 390x844
  await page.setViewportSize({ width: 390, height: 844 });
  await page.waitForTimeout(1000);
  await page.screenshot({ path: path.join(outDir, `admin-mobile-${name}.png`), fullPage: true });

  // Restore Desktop for subsequent actions if needed
  await page.setViewportSize({ width: 1440, height: 900 });
  await page.waitForTimeout(500);
}

(async () => {
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext();
  const page = await context.newPage();

  try {
    console.log('--- 1. Login Page (Unauthenticated) ---');
    await page.goto('http://localhost:3003/login', { waitUntil: 'networkidle' });
    await capture(page, 'login-phone');

    console.log('--- 2. Injecting auth and visiting Dashboard ---');
    await page.evaluate((val) => {
      window.localStorage.setItem('staff.login', JSON.stringify(val));
      window.localStorage.setItem('staff.session', JSON.stringify({ externalId: val.external_id, phone: '11999999999' }));
    }, tokens);

    await page.goto('http://localhost:3003/dashboard', { waitUntil: 'networkidle' });
    await page.waitForTimeout(1500);
    console.log('Capturing Dashboard - Overview...');
    await capture(page, 'dashboard-overview');

    // Dashboard Tabs
    const dashTabs = [
      { name: 'leads', label: 'Todos os Leads' },
      { name: 'students', label: 'Alunos & Matrículas' },
      { name: 'promoters', label: 'Promotores & Equipe' },
      { name: 'coordinators', label: 'Coordenadores' },
      { name: 'notifications', label: 'Mensagens & Notificações' },
    ];

    for (const tab of dashTabs) {
      console.log(`Clicking dashboard tab: ${tab.label}...`);
      const btn = page.locator(`button:has-text("${tab.label}")`).first();
      if (await btn.isVisible()) {
        await btn.click();
        await page.waitForTimeout(1000);
        await capture(page, `dashboard-tab-${tab.name}`);
      }
    }

    // Return to overview tab
    const overviewBtn = page.locator(`button:has-text("Visão Geral & Polos")`).first();
    if (await overviewBtn.isVisible()) {
      await overviewBtn.click();
      await page.waitForTimeout(800);
    }

    // Open Novo Polo modal
    console.log('Opening Novo Polo modal...');
    const novoPoloBtn = page.locator('button:has-text("Novo Polo"), button:has-text("+ Polo"), button:has-text("Criar Polo")').first();
    if (await novoPoloBtn.isVisible()) {
      await novoPoloBtn.click();
      await page.waitForTimeout(800);
      await capture(page, 'dashboard-modal-novo-polo');
      // close modal
      const closeBtn = page.locator('button:has-text("Cancelar"), button:has-text("Fechar")').first();
      if (await closeBtn.isVisible()) await closeBtn.click();
      await page.waitForTimeout(500);
    }

    // Open Gestor Drawer
    console.log('Opening Entrar como Gestor drawer...');
    const gestorBtn = page.locator('button:has-text("Entrar como Gestor"), button:has-text("Modo Gestor")').first();
    if (await gestorBtn.isVisible()) {
      await gestorBtn.click();
      await page.waitForTimeout(1000);
      await capture(page, 'dashboard-drawer-gestor');
      // close drawer
      const closeGestor = page.locator('button:has-text("Sair do Modo Gestor")').first();
      if (await closeGestor.isVisible()) await closeGestor.click();
      await page.waitForTimeout(500);
    }

    // Page: Financeiro
    console.log('--- Navigating to /financeiro ---');
    await page.goto('http://localhost:3003/financeiro', { waitUntil: 'networkidle' });
    await page.waitForTimeout(1200);
    await capture(page, 'financeiro-payouts');

    const finTabs = [
      { name: 'comissoes', label: 'Comissões' },
      { name: 'pagamento', label: 'Pagamento avulso' },
      { name: 'fechamento', label: 'Fechamento' },
    ];
    for (const t of finTabs) {
      console.log(`Clicking financeiro tab: ${t.label}...`);
      const btn = page.locator(`button:has-text("${t.label}")`).first();
      if (await btn.isVisible()) {
        await btn.click();
        await page.waitForTimeout(1000);
        await capture(page, `financeiro-${t.name}`);
      }
    }

    // Page: Polos
    console.log('--- Navigating to /polos ---');
    await page.goto('http://localhost:3003/polos', { waitUntil: 'networkidle' });
    await page.waitForTimeout(1200);
    await capture(page, 'polos');

    // Page: Coordenadores
    console.log('--- Navigating to /coordenadores ---');
    await page.goto('http://localhost:3003/coordenadores', { waitUntil: 'networkidle' });
    await page.waitForTimeout(1200);
    await capture(page, 'coordenadores');

    // Page: Treino
    console.log('--- Navigating to /treino ---');
    await page.goto('http://localhost:3003/treino', { waitUntil: 'networkidle' });
    await page.waitForTimeout(1200);
    await capture(page, 'treino');

    // Page: Matriculas
    console.log('--- Navigating to /matriculas ---');
    await page.goto('http://localhost:3003/matriculas', { waitUntil: 'networkidle' });
    await page.waitForTimeout(1200);
    await capture(page, 'matriculas');

    // Page: Alunos
    console.log('--- Navigating to /alunos ---');
    await page.goto('http://localhost:3003/alunos', { waitUntil: 'networkidle' });
    await page.waitForTimeout(1200);
    await capture(page, 'alunos');

    // Page: Leads
    console.log('--- Navigating to /leads ---');
    await page.goto('http://localhost:3003/leads', { waitUntil: 'networkidle' });
    await page.waitForTimeout(1200);
    await capture(page, 'leads');

    // Page: Usuarios
    console.log('--- Navigating to /usuarios ---');
    await page.goto('http://localhost:3003/usuarios', { waitUntil: 'networkidle' });
    await page.waitForTimeout(1200);
    await capture(page, 'usuarios');

    // Page: Configuracoes
    console.log('--- Navigating to /configuracoes ---');
    await page.goto('http://localhost:3003/configuracoes', { waitUntil: 'networkidle' });
    await page.waitForTimeout(1200);
    await capture(page, 'configuracoes-boss');

    const configTabs = [
      { name: 'pricing', label: 'Preços do Curso' },
      { name: 'commissions', label: 'Comissões & Metas' },
      { name: 'integrations', label: 'Chaves & Conexões' },
      { name: 'balances', label: 'Saldos & Liquidez' },
    ];
    for (const t of configTabs) {
      console.log(`Clicking configuracoes tab: ${t.label}...`);
      const btn = page.locator(`button:has-text("${t.label}")`).first();
      if (await btn.isVisible()) {
        await btn.click();
        await page.waitForTimeout(1000);
        await capture(page, `configuracoes-${t.name}`);
      }
    }

    // Page: Integracoes
    console.log('--- Navigating to /integracoes ---');
    await page.goto('http://localhost:3003/integracoes', { waitUntil: 'networkidle' });
    await page.waitForTimeout(1200);
    await capture(page, 'integracoes');

    // Page: Logs
    console.log('--- Navigating to /logs ---');
    await page.goto('http://localhost:3003/logs', { waitUntil: 'networkidle' });
    await page.waitForTimeout(1200);
    await capture(page, 'logs-unrouted');

    const logTabs = [
      { name: 'ai', label: 'Chamadas de IA' },
      { name: 'checks', label: 'Validações' },
    ];
    for (const t of logTabs) {
      console.log(`Clicking logs tab: ${t.label}...`);
      const btn = page.locator(`button:has-text("${t.label}")`).first();
      if (await btn.isVisible()) {
        await btn.click();
        await page.waitForTimeout(1000);
        await capture(page, `logs-${t.name}`);
      }
    }

    // Page: Notificacoes
    console.log('--- Navigating to /notificacoes ---');
    await page.goto('http://localhost:3003/notificacoes', { waitUntil: 'networkidle' });
    await page.waitForTimeout(1200);
    await capture(page, 'notificacoes');

    console.log('=== All screenshots successfully captured! ===');
  } catch (error) {
    console.error('Error during execution:', error);
  } finally {
    await browser.close();
  }
})();

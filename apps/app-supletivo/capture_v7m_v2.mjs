import { chromium } from 'playwright';
import fs from 'fs';
import path from 'path';

const outDir = 'c:\\Users\\maestri33\\dev\\v7m\\screenshots\\e2e';
if (!fs.existsSync(outDir)) {
  fs.mkdirSync(outDir, { recursive: true });
}

const BASE = 'http://localhost:3001';

const MOBILE = { width: 390, height: 844 };
const DESKTOP = { width: 1440, height: 900 };

async function run() {
  const browser = await chromium.launch({ headless: true });

  console.log('--- Ingressando nos testes e capturas do App V7M (Portal do Promotor :3001) ---');

  // 1. Contextos Mobile e Desktop
  const mobileCtx = await browser.newContext({
    viewport: MOBILE,
    deviceScaleFactor: 2,
    userAgent: 'Mozilla/5.0 (iPhone; CPU iPhone OS 16_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/16.0 Mobile/15E148 Safari/604.1'
  });
  const desktopCtx = await browser.newContext({
    viewport: DESKTOP,
    deviceScaleFactor: 1
  });

  const mobilePage = await mobileCtx.newPage();
  const desktopPage = await desktopCtx.newPage();

  // Helper para tirar screenshot
  async function take(page, filename, description) {
    const fullPath = path.join(outDir, filename);
    await page.screenshot({ path: fullPath, fullPage: false });
    console.log(`[OK] Capturado: ${filename} - ${description}`);
  }

  // --- CENÁRIO 1: TELA INICIAL (ENTRADA / LOGIN COM NOVO BOTÃO AJUDA E PREFIXO +55) ---
  console.log('\n[1] Capturando Tela Inicial (/) Mobile e Desktop...');
  await mobilePage.goto(BASE, { waitUntil: 'networkidle', timeout: 15000 });
  await mobilePage.waitForTimeout(600);
  await take(mobilePage, 'v7m-v2-mobile-home.png', 'Home Mobile - Visão Inicial');

  await desktopPage.goto(BASE, { waitUntil: 'networkidle', timeout: 15000 });
  await desktopPage.waitForTimeout(600);
  await take(desktopPage, 'v7m-v2-desktop-home.png', 'Home Desktop - Visão Inicial');

  // --- CENÁRIO 2: INTERAÇÃO NO INPUT DE TELEFONE (+55 PREENCHIDO E FOCO) ---
  console.log('\n[2] Capturando Estado com Telefone Digitado e Foco...');
  const mobilePhoneInput = mobilePage.locator('#auth-phone');
  await mobilePhoneInput.fill('11987654321');
  await mobilePage.waitForTimeout(300);
  await take(mobilePage, 'v7m-v2-mobile-phone-filled.png', 'Home Mobile - Telefone Preenchido');

  const desktopPhoneInput = desktopPage.locator('#auth-phone');
  await desktopPhoneInput.fill('11987654321');
  await desktopPage.waitForTimeout(300);
  await take(desktopPage, 'v7m-v2-desktop-phone-filled.png', 'Home Desktop - Telefone Preenchido');

  // --- CENÁRIO 3: ERRO DE VALIDAÇÃO (TELEFONE INVÁLIDO) ---
  console.log('\n[3] Capturando Feedback de Erro de Validação...');
  await mobilePhoneInput.fill('119999'); // incompleto
  await mobilePage.locator('button[type="submit"]').click();
  await mobilePage.waitForTimeout(400);
  await take(mobilePage, 'v7m-v2-mobile-validation-error.png', 'Home Mobile - Erro de validação');

  await desktopPhoneInput.fill('119999');
  await desktopPage.locator('button[type="submit"]').click();
  await desktopPage.waitForTimeout(400);
  await take(desktopPage, 'v7m-v2-desktop-validation-error.png', 'Home Desktop - Erro de validação');

  // --- CENÁRIO 4: HOVER / FOCO NO BOTÃO DE AJUDA ---
  console.log('\n[4] Capturando Foco no Botão de Ajuda...');
  const helpBtn = desktopPage.locator('header a:has-text("Ajuda")');
  if (await helpBtn.isVisible()) {
    await helpBtn.hover();
    await desktopPage.waitForTimeout(300);
    await take(desktopPage, 'v7m-v2-desktop-help-hover.png', 'Home Desktop - Hover no Botão Ajuda');
  }

  // --- CENÁRIO 5: DEV STUDIO / PREVIEWS DE TELAS INTERNAS (:3001/dev-preview) ---
  console.log('\n[5] Capturando Dev Studio e Telas Internas...');
  await desktopPage.goto(`${BASE}/dev-preview`, { waitUntil: 'networkidle', timeout: 15000 });
  await desktopPage.waitForTimeout(800);
  await take(desktopPage, 'v7m-v2-desktop-devstudio-painel.png', 'DevStudio - Painel Promotor (Desktop)');

  await mobilePage.goto(`${BASE}/dev-preview`, { waitUntil: 'networkidle', timeout: 15000 });
  await mobilePage.waitForTimeout(800);
  await take(mobilePage, 'v7m-v2-mobile-devstudio-painel.png', 'DevStudio - Painel Promotor (Mobile)');

  // Percorrer as abas do DevStudio para capturar as telas internas individuais
  const tabs = [
    { id: 'documento', name: 'Documento (RG/CNH)' },
    { id: 'endereco', name: 'Comprovante Endereço' },
    { id: 'pix', name: 'Chave PIX' },
    { id: 'escolaridade', name: 'Escolaridade' },
    { id: 'selfie', name: 'Selfie com Documento' },
    { id: 'treinamento', name: 'Treinamento' },
    { id: 'leads', name: 'Gestão de Leads' },
    { id: 'comissoes', name: 'Comissões & Extrato' }
  ];

  for (const tab of tabs) {
    try {
      console.log(`\n- Acessando aba DevStudio: ${tab.name} (${tab.id})`);
      // No desktop
      const desktopTabBtn = desktopPage.locator(`button:has-text("${tab.name.split(' ')[0]}")`).first();
      if (await desktopTabBtn.count() > 0) {
        await desktopTabBtn.click();
        await desktopPage.waitForTimeout(500);
        await take(desktopPage, `v7m-v2-desktop-${tab.id}.png`, `Desktop - ${tab.name}`);
      }

      // No mobile
      const mobileTabBtn = mobilePage.locator(`button:has-text("${tab.name.split(' ')[0]}")`).first();
      if (await mobileTabBtn.count() > 0) {
        await mobileTabBtn.click();
        await mobilePage.waitForTimeout(500);
        await take(mobilePage, `v7m-v2-mobile-${tab.id}.png`, `Mobile - ${tab.name}`);
      }
    } catch (err) {
      console.warn(`Aviso ao capturar tab ${tab.id}: ${err.message}`);
    }
  }

  // --- CENÁRIO 6: PÁGINA 404 / ROTA INEXISTENTE ---
  console.log('\n[6] Capturando Página 404 Customizada...');
  await desktopPage.goto(`${BASE}/rota-inexistente-teste`, { waitUntil: 'networkidle' });
  await desktopPage.waitForTimeout(500);
  await take(desktopPage, 'v7m-v2-desktop-404.png', 'Desktop - 404 Custom');

  await mobilePage.goto(`${BASE}/rota-inexistente-teste`, { waitUntil: 'networkidle' });
  await mobilePage.waitForTimeout(500);
  await take(mobilePage, 'v7m-v2-mobile-404.png', 'Mobile - 404 Custom');

  await browser.close();
  console.log('\n=== Todos os screenshots foram gerados com sucesso! ===\n');
}

run().catch(err => {
  console.error('Erro ao executar suite de screenshot:', err);
  process.exit(1);
});

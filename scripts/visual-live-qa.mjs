import { chromium } from "playwright";

async function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function runLiveQa() {
  console.log("=========================================================");
  console.log(" 🌐 INICIANDO AUDITORIA VISUAL E2E EM QA / PRODUÇÃO");
  console.log("    (Navegador aberto em modo visual com slowMo)");
  console.log("=========================================================\n");

  const browser = await chromium.launch({
    headless: false,
    slowMo: 600, // Pausa de 600ms para você acompanhar visualmente
    args: ["--start-maximized"],
  });

  const context = await browser.newContext({
    viewport: null, // Usa resolução total da janela maximizada
  });

  const page = await context.newPage();

  try {
    // -------------------------------------------------------------
    // ETAPA 1: Landing Supletivo Brasil (supletivo.net.br)
    // -------------------------------------------------------------
    console.log("▶ [1/4] Acessando Landing Supletivo (https://supletivo.net.br)...");
    await page.goto("https://supletivo.net.br", { waitUntil: "networkidle", timeout: 30000 });
    await sleep(2000);

    console.log("  📜 Rolando a página para visualização das seções...");
    await page.evaluate(() => window.scrollBy({ top: 700, behavior: "smooth" }));
    await sleep(1500);
    await page.evaluate(() => window.scrollBy({ top: 900, behavior: "smooth" }));
    await sleep(1500);
    await page.evaluate(() => window.scrollBy({ top: 1200, behavior: "smooth" }));
    await sleep(1500);
    await page.evaluate(() => window.scrollTo({ top: document.body.scrollHeight, behavior: "smooth" }));
    await sleep(2000);

    // -------------------------------------------------------------
    // ETAPA 2: Portal do Aluno & Funil (app.supletivo.net.br)
    // -------------------------------------------------------------
    console.log("▶ [2/4] Acessando Portal do Aluno (https://app.supletivo.net.br)...");
    await page.goto("https://app.supletivo.net.br", { waitUntil: "networkidle", timeout: 30000 });
    await sleep(2000);

    const phoneInput = page.locator("input[type='tel']").or(page.locator("#lead-phone")).first();
    if (await phoneInput.isVisible()) {
      console.log("  ✍️ Preenchendo número de teste no funil...");
      await phoneInput.click();
      await phoneInput.pressSequentially("43996648750", { delay: 120 });
      await sleep(1500);
    }

    console.log("  🧭 Explorando rota de checkout...");
    await page.goto("https://app.supletivo.net.br/checkout", { waitUntil: "networkidle", timeout: 20000 }).catch(() => {});
    await sleep(2500);

    // -------------------------------------------------------------
    // ETAPA 3: Landing Promotores V7M (maestri.group)
    // -------------------------------------------------------------
    console.log("▶ [3/4] Acessando Landing Promotores (https://maestri.group)...");
    await page.goto("https://maestri.group", { waitUntil: "networkidle", timeout: 30000 });
    await sleep(2000);

    console.log("  📜 Rolando seções institucionais e benefícios...");
    await page.evaluate(() => window.scrollBy({ top: 600, behavior: "smooth" }));
    await sleep(1500);
    await page.evaluate(() => window.scrollBy({ top: 800, behavior: "smooth" }));
    await sleep(1500);
    await page.evaluate(() => window.scrollTo({ top: document.body.scrollHeight, behavior: "smooth" }));
    await sleep(2000);

    // -------------------------------------------------------------
    // ETAPA 4: Portal Unificado V7M (app.maestri.group / portal)
    // -------------------------------------------------------------
    console.log("▶ [4/4] Acessando Portal V7M Unificado (https://app.maestri.group)...");
    await page.goto("https://app.maestri.group", { waitUntil: "networkidle", timeout: 30000 });
    await sleep(2500);

    const loginInput = page.locator("input[type='tel'], input[type='text'], #identifier").first();
    if (await loginInput.isVisible()) {
      console.log("  ✍️ Interagindo com tela de autenticação do portal...");
      await loginInput.click();
      await loginInput.pressSequentially("43996648750", { delay: 100 });
      await sleep(1500);
    }

    // Healthcheck final
    console.log("▶ Verificando Healthz da API Backend...");
    await page.goto("https://api.maestri.group/api/v1/health/healthz", { waitUntil: "networkidle", timeout: 15000 });
    await sleep(2000);

    console.log("\n=========================================================");
    console.log("  🎉 AUDITORIA VISUAL E2E CONCLUÍDA COM SUCESSO!");
    console.log("=========================================================\n");
  } catch (err) {
    console.error("❌ Erro durante auditoria visual:", err.message);
  } finally {
    console.log("Fechando navegador em 5 segundos...");
    await sleep(5000);
    await browser.close();
  }
}

runLiveQa();

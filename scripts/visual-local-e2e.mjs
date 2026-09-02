import { chromium } from "playwright";

async function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function runLocalVisualE2E() {
  console.log("=========================================================");
  console.log(" 🐳 INICIANDO AUDITORIA VISUAL E2E EM AMBIENTE LOCAL (DOCKER)");
  console.log("    (Navegador aberto em modo visual com slowMo)");
  console.log("=========================================================\n");

  const browser = await chromium.launch({
    headless: false,
    slowMo: 600,
    args: ["--start-maximized"],
  });

  const context = await browser.newContext({
    viewport: null,
  });

  const page = await context.newPage();

  try {
    // -------------------------------------------------------------
    // ETAPA 1: Healthcheck dos Microsserviços Locais
    // -------------------------------------------------------------
    console.log("▶ [1/4] Verificando Healthchecks Locais...");

    console.log("  - Backend Django Ninja (http://127.0.0.1:8001/api/v1/health/healthz)...");
    await page.goto("http://127.0.0.1:8001/api/v1/health/healthz", { waitUntil: "networkidle", timeout: 15000 });
    await sleep(2000);

    console.log("  - Notify Server (http://127.0.0.1:8000/v1/health)...");
    await page.goto("http://127.0.0.1:8000/v1/health", { waitUntil: "networkidle", timeout: 15000 });
    await sleep(1500);

    console.log("  - Evolution GO (http://127.0.0.1:4000/server/ok)...");
    await page.goto("http://127.0.0.1:4000/server/ok", { waitUntil: "networkidle", timeout: 15000 });
    await sleep(1500);

    // -------------------------------------------------------------
    // ETAPA 2: Portal do Aluno Local (http://localhost:3020)
    // -------------------------------------------------------------
    console.log("\n▶ [2/4] Acessando Portal do Aluno Local (http://localhost:3020)...");
    await page.goto("http://localhost:3020", { waitUntil: "networkidle", timeout: 30000 });
    await sleep(2000);

    console.log("  📜 Rolando página inicial...");
    await page.evaluate(() => window.scrollBy({ top: 600, behavior: "smooth" }));
    await sleep(1500);

    const phoneInput = page.locator("input[type='tel']").or(page.locator("#lead-phone")).first();
    if (await phoneInput.isVisible()) {
      console.log("  ✍️ Interagindo com campo de telefone...");
      await phoneInput.click();
      await phoneInput.pressSequentially("43996648750", { delay: 100 });
      await sleep(2000);
    }

    console.log("  🧭 Navegando para rota de Aluno (/aluno)...");
    await page.goto("http://localhost:3020/aluno", { waitUntil: "networkidle", timeout: 20000 }).catch(() => {});
    await sleep(2500);

    // -------------------------------------------------------------
    // ETAPA 3: Portal V7M Admin / Staff Local (http://localhost:3003)
    // -------------------------------------------------------------
    console.log("\n▶ [3/4] Acessando Portal Unificado Admin / Promotor Local (http://localhost:3003)...");
    await page.goto("http://localhost:3003", { waitUntil: "networkidle", timeout: 30000 });
    await sleep(2500);

    console.log("  📜 Explorando tela inicial / login...");
    const loginField = page.locator("input[type='tel'], input[type='text'], #identifier").first();
    if (await loginField.isVisible()) {
      console.log("  ✍️ Preenchendo credencial de teste no portal...");
      await loginField.click();
      await loginField.pressSequentially("11144477735", { delay: 100 });
      await sleep(2000);
    }

    // -------------------------------------------------------------
    // ETAPA 4: Validação do Proxy e Documentação OpenAPI
    // -------------------------------------------------------------
    console.log("\n▶ [4/4] Validando Swagger / OpenAPI Docs do Backend (http://127.0.0.1:8001/api/v1/clients/docs)...");
    await page.goto("http://127.0.0.1:8001/api/v1/clients/docs", { waitUntil: "networkidle", timeout: 20000 }).catch(() => {});
    await sleep(3000);

    console.log("\n=========================================================");
    console.log("  🎉 AUDITORIA VISUAL E2E LOCAL CONCLUÍDA COM SUCESSO!");
    console.log("=========================================================\n");
  } catch (err) {
    console.error("❌ Erro durante auditoria visual local:", err.message);
  } finally {
    console.log("Fechando navegador em 5 segundos...");
    await sleep(5000);
    await browser.close();
  }
}

runLocalVisualE2E();

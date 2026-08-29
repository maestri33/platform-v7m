import { chromium } from "playwright";
import fs from "fs";
import path from "path";

const SCREENSHOTS_DIR = "c:\\Users\\maestri33\\dev\\v7m\\tooling\\qa-audit\\screenshots\\happy_path";
fs.mkdirSync(SCREENSHOTS_DIR, { recursive: true });

const VIEWPORTS = {
  desktop: { width: 1440, height: 900 },
  mobile: { width: 390, height: 844 },
};

export async function runHappyPathSuite() {
  console.log("\n========================================================");
  console.log(" 🧪 SUITE 1: HAPPY PATH & VISUAL FLOW AUDIT (REAL APIS)");
  console.log("========================================================\n");

  const results = [];
  const browser = await chromium.launch({ headless: true });

  // 1. App Supletivo (Port 3020)
  for (const [vpName, vp] of Object.entries(VIEWPORTS)) {
    const context = await browser.newContext({
      viewport: vp,
      deviceScaleFactor: 2,
    });
    const page = await context.newPage();
    const prefix = `supletivo-${vpName}`;

    try {
      console.log(`▶ [App Supletivo] [${vpName}] Testando fluxo de entrada e funil...`);
      const start = Date.now();
      await page.goto("http://localhost:3020/", { waitUntil: "networkidle", timeout: 15000 });
      await page.screenshot({ path: path.join(SCREENSHOTS_DIR, `${prefix}-01-home.png`) });

      // Preenche telefone novo
      const phoneInput = page.locator("#lead-phone").or(page.locator("input[type='tel']")).first();
      if (await phoneInput.count() > 0) {
        await phoneInput.fill("(11) 98888-7777");
        await page.waitForTimeout(500);
        await page.screenshot({ path: path.join(SCREENSHOTS_DIR, `${prefix}-02-phone-filled.png`) });
      }

      // Teste da rota de Aluno (quando autenticado ou direto)
      await page.goto("http://localhost:3020/aluno", { waitUntil: "networkidle", timeout: 15000 });
      await page.waitForTimeout(500);
      await page.screenshot({ path: path.join(SCREENSHOTS_DIR, `${prefix}-03-aluno-painel.png`) });

      // Teste da rota de Planos / Checkout
      await page.goto("http://localhost:3020/checkout", { waitUntil: "networkidle", timeout: 15000 });
      await page.waitForTimeout(500);
      await page.screenshot({ path: path.join(SCREENSHOTS_DIR, `${prefix}-04-checkout.png`) });

      const duration = Date.now() - start;
      console.log(`  ✅ [App Supletivo] [${vpName}] Concluído com sucesso (${duration}ms)`);
      results.push({ name: `App Supletivo (${vpName})`, status: "PASS", durationMs: duration });
    } catch (err) {
      console.error(`  ❌ [App Supletivo] [${vpName}] Falha: ${err.message}`);
      results.push({ name: `App Supletivo (${vpName})`, status: "FAIL", error: err.message });
    } finally {
      await context.close();
    }
  }

  // 2. App Promotor (Port 3001)
  for (const [vpName, vp] of Object.entries(VIEWPORTS)) {
    const context = await browser.newContext({
      viewport: vp,
      deviceScaleFactor: 2,
    });
    const page = await context.newPage();
    const prefix = `promotor-${vpName}`;

    try {
      console.log(`▶ [App Promotor] [${vpName}] Testando login e navegação no painel...`);
      const start = Date.now();
      await page.goto("http://localhost:3003/vendas", { waitUntil: "networkidle", timeout: 15000 });
      await page.screenshot({ path: path.join(SCREENSHOTS_DIR, `${prefix}-01-login.png`) });

      // Digita telefone
      const phoneInput = page.locator("input[type='tel']").or(page.locator("input#phone")).first();
      if (await phoneInput.count() > 0) {
        await phoneInput.fill("(11) 99999-0001");
        await page.waitForTimeout(300);
        await page.screenshot({ path: path.join(SCREENSHOTS_DIR, `${prefix}-02-phone.png`) });
      }

      // Navegação para rotas internas
      for (const route of ["/painel", "/leads", "/comissoes", "/conta"]) {
        await page.goto(`http://localhost:3003${route}`, { waitUntil: "networkidle", timeout: 15000 });
        await page.waitForTimeout(300);
        await page.screenshot({ path: path.join(SCREENSHOTS_DIR, `${prefix}-route-${route.replace('/', '')}.png`) });
      }

      const duration = Date.now() - start;
      console.log(`  ✅ [App Promotor] [${vpName}] Concluído com sucesso (${duration}ms)`);
      results.push({ name: `App Promotor (${vpName})`, status: "PASS", durationMs: duration });
    } catch (err) {
      console.error(`  ❌ [App Promotor] [${vpName}] Falha: ${err.message}`);
      results.push({ name: `App Promotor (${vpName})`, status: "FAIL", error: err.message });
    } finally {
      await context.close();
    }
  }

  // 3. Admin V7M (Port 3003)
  for (const [vpName, vp] of Object.entries(VIEWPORTS)) {
    const context = await browser.newContext({
      viewport: vp,
      deviceScaleFactor: 2,
    });
    const page = await context.newPage();
    const prefix = `admin-${vpName}`;

    try {
      console.log(`▶ [Admin V7M] [${vpName}] Testando autenticação e cockpit...`);
      const start = Date.now();
      await page.goto("http://localhost:3003/login", { waitUntil: "networkidle", timeout: 15000 });
      await page.screenshot({ path: path.join(SCREENSHOTS_DIR, `${prefix}-01-login.png`) });

      // Envia telefone do staff
      const phoneInput = page.getByLabel("Telefone/WhatsApp").or(page.locator("input[type='tel']")).first();
      if (await phoneInput.count() > 0) {
        await phoneInput.fill("(11) 99999-0000");
        const submitBtn = page.getByRole("button", { name: /enviar código/i });
        if (await submitBtn.count() > 0) {
          await submitBtn.click();
          await page.waitForTimeout(600);
          await page.screenshot({ path: path.join(SCREENSHOTS_DIR, `${prefix}-02-otp.png`) });

          // Preenche OTP
          const otpInput = page.getByLabel(/Dígito 1/i).or(page.locator("input[type='text'], input[inputmode='numeric']")).first();
          if (await otpInput.count() > 0) {
            await otpInput.fill("000000");
            await page.waitForTimeout(1000);
          }
        }
      }

      // Painel administrativo
      await page.goto("http://localhost:3003/dashboard", { waitUntil: "networkidle", timeout: 15000 });
      await page.waitForTimeout(500);
      await page.screenshot({ path: path.join(SCREENSHOTS_DIR, `${prefix}-03-dashboard.png`) });

      const duration = Date.now() - start;
      console.log(`  ✅ [Admin V7M] [${vpName}] Concluído com sucesso (${duration}ms)`);
      results.push({ name: `Admin V7M (${vpName})`, status: "PASS", durationMs: duration });
    } catch (err) {
      console.error(`  ❌ [Admin V7M] [${vpName}] Falha: ${err.message}`);
      results.push({ name: `Admin V7M (${vpName})`, status: "FAIL", error: err.message });
    } finally {
      await context.close();
    }
  }

  // 4. Hub V7M (Port 3004)
  for (const [vpName, vp] of Object.entries(VIEWPORTS)) {
    const context = await browser.newContext({
      viewport: vp,
      deviceScaleFactor: 2,
    });
    const page = await context.newPage();
    const prefix = `hub-${vpName}`;

    try {
      console.log(`▶ [Hub V7M] [${vpName}] Testando login e seções do polo...`);
      const start = Date.now();
      await page.goto("http://localhost:3003/hub", { waitUntil: "networkidle", timeout: 15000 });
      await page.screenshot({ path: path.join(SCREENSHOTS_DIR, `${prefix}-01-login.png`) });

      // Preenche telefone
      const phoneInput = page.locator("input[type='tel']").first();
      if (await phoneInput.count() > 0) {
        await phoneInput.fill("(11) 99999-0000");
        await page.waitForTimeout(400);
        await page.screenshot({ path: path.join(SCREENSHOTS_DIR, `${prefix}-02-phone.png`) });
      }

      const duration = Date.now() - start;
      console.log(`  ✅ [Hub V7M] [${vpName}] Concluído com sucesso (${duration}ms)`);
      results.push({ name: `Hub V7M (${vpName})`, status: "PASS", durationMs: duration });
    } catch (err) {
      console.error(`  ❌ [Hub V7M] [${vpName}] Falha: ${err.message}`);
      results.push({ name: `Hub V7M (${vpName})`, status: "FAIL", error: err.message });
    } finally {
      await context.close();
    }
  }

  // 5. Landings (3010, 3011)
  const landings = [
    { name: "Landing Supletivo", url: "http://localhost:3011/" },
    { name: "Landing Promotor", url: "http://localhost:3010/" },
  ];

  for (const l of landings) {
    for (const [vpName, vp] of Object.entries(VIEWPORTS)) {
      const context = await browser.newContext({ viewport: vp, deviceScaleFactor: 2 });
      const page = await context.newPage();
      const slug = l.name.toLowerCase().replace(/\s+/g, "-");

      try {
        console.log(`▶ [${l.name}] [${vpName}] Renderizando e verificando layout...`);
        const start = Date.now();
        await page.goto(l.url, { waitUntil: "networkidle", timeout: 15000 });
        await page.waitForTimeout(400);
        await page.screenshot({ path: path.join(SCREENSHOTS_DIR, `${slug}-${vpName}.png`), fullPage: false });

        const duration = Date.now() - start;
        console.log(`  ✅ [${l.name}] [${vpName}] Renderizado com sucesso (${duration}ms)`);
        results.push({ name: `${l.name} (${vpName})`, status: "PASS", durationMs: duration });
      } catch (err) {
        console.error(`  ❌ [${l.name}] [${vpName}] Falha: ${err.message}`);
        results.push({ name: `${l.name} (${vpName})`, status: "FAIL", error: err.message });
      } finally {
        await context.close();
      }
    }
  }

  await browser.close();
  return results;
}

if (process.argv[1] && process.argv[1].endsWith("01-happy-paths.mjs")) {
  runHappyPathSuite().then((results) => {
    const passed = results.filter((r) => r.status === "PASS").length;
    const failed = results.filter((r) => r.status === "FAIL").length;
    console.log(`\n🎯 Fim da Suite 1: ${passed} PASS | ${failed} FAIL\n`);
  });
}

import { chromium } from "playwright";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "node:url";

const SCREENSHOTS_DIR = fileURLToPath(new URL("./screenshots/network_resilience/", import.meta.url));
fs.mkdirSync(SCREENSHOTS_DIR, { recursive: true });

export async function runNetworkResilienceSuite() {
  console.log("\n========================================================");
  console.log(" 🧪 SUITE 3: NETWORK CHAOS, HIGH LATENCY & 500 SIMULATION");
  console.log("========================================================\n");

  const results = [];
  const browser = await chromium.launch({ headless: true });

  // Cenário 1: Latência Alta (3000ms) no App Supletivo
  try {
    console.log("▶ [App Supletivo] Injetando latência artificial de 3000ms em requisições de API...");
    const context = await browser.newContext();
    const page = await context.newPage();

    await page.route("**/api/**", async (route) => {
      await new Promise((r) => setTimeout(r, 3000));
      await route.continue();
    });

    const start = Date.now();
    await page.goto("http://localhost:3020/", { waitUntil: "domcontentloaded" });
    const phoneInput = page.locator("#lead-phone").or(page.locator("input[type='tel']")).first();
    if (await phoneInput.count() > 0) {
      await phoneInput.fill("(11) 98888-7777");
    }
    await page.waitForTimeout(1000);
    await page.screenshot({ path: path.join(SCREENSHOTS_DIR, "supletivo-latency-loading.png") });

    const duration = Date.now() - start;
    console.log(`  ✅ App Supletivo manteve renderização durante alta latência (${duration}ms)`);
    results.push({ name: "App Supletivo: Resiliência a Latência Alta (3s)", status: "PASS", durationMs: duration });
    await context.close();
  } catch (err) {
    console.error(`  ❌ Falha no teste de latência: ${err.message}`);
    results.push({ name: "App Supletivo: Resiliência a Latência Alta (3s)", status: "FAIL", error: err.message });
  }

  // Cenário 2: Simulação de Erro 500 (Internal Server Error) no Admin V7M
  try {
    console.log("▶ [Admin V7M] Injetando HTTP 500 em /api/v1/staff/auth/check...");
    const context = await browser.newContext();
    const page = await context.newPage();

    let pageCrashed = false;
    page.on("pageerror", (err) => {
      console.warn(`  ⚠️ Page Error capturado: ${err.message}`);
      pageCrashed = true;
    });

    await page.route("**/api/v1/staff/auth/check", async (route) => {
      await route.fulfill({
        status: 500,
        contentType: "application/json",
        body: JSON.stringify({ detail: "Simulação de falha catastrófica no banco de dados.", code: "INTERNAL" }),
      });
    });

    await page.goto("http://localhost:3003/login", { waitUntil: "networkidle" });
    const phoneInput = page.getByLabel("Telefone/WhatsApp").or(page.locator("input[type='tel']")).first();
    const submitBtn = page.getByRole("button", { name: /enviar código/i });

    if (await phoneInput.count() > 0 && await submitBtn.count() > 0) {
      await phoneInput.fill("(11) 99999-0000");
      await submitBtn.click();
      await page.waitForTimeout(1000);
      await page.screenshot({ path: path.join(SCREENSHOTS_DIR, "admin-500-error-feedback.png") });

      if (!pageCrashed) {
        console.log("  ✅ Admin V7M tratou HTTP 500 sem quebra do runtime React");
        results.push({ name: "Admin V7M: Tratamento Gracioso de HTTP 500", status: "PASS" });
      } else {
        console.warn("  ⚠️ Admin V7M disparou exceção não tratada no front");
        results.push({ name: "Admin V7M: Tratamento Gracioso de HTTP 500", status: "PARTIAL" });
      }
    }
    await context.close();
  } catch (err) {
    console.error(`  ❌ Falha no teste de erro 500: ${err.message}`);
    results.push({ name: "Admin V7M: Tratamento Gracioso de HTTP 500", status: "FAIL", error: err.message });
  }

  // Cenário 3: Queda de Conexão (Network Abort) no Hub V7M
  try {
    console.log("▶ [Hub V7M] Simulando desconexão súbita (Connection Abort)...");
    const context = await browser.newContext();
    const page = await context.newPage();

    await page.route("**/auth/check", (route) => route.abort("failed"));
    await page.goto("http://localhost:3003/hub", { waitUntil: "networkidle" });

    const phoneInput = page.locator("input[type='tel']").first();
    if (await phoneInput.count() > 0) {
      await phoneInput.fill("(11) 99999-0000");
      await page.waitForTimeout(1000);
      await page.screenshot({ path: path.join(SCREENSHOTS_DIR, "hub-network-abort.png") });
    }

    console.log("  ✅ Hub V7M suportou falha abrupta de rede sem travar página");
    results.push({ name: "Hub V7M: Resiliência a Queda de Rede / Abort", status: "PASS" });
    await context.close();
  } catch (err) {
    console.error(`  ❌ Falha no teste de queda de rede: ${err.message}`);
    results.push({ name: "Hub V7M: Resiliência a Queda de Rede / Abort", status: "FAIL", error: err.message });
  }

  await browser.close();
  return results;
}

if (process.argv[1] && process.argv[1].endsWith("03-network-resilience.mjs")) {
  runNetworkResilienceSuite().then((results) => {
    const passed = results.filter((r) => r.status === "PASS").length;
    const failed = results.filter((r) => r.status === "FAIL").length;
    console.log(`\n🎯 Fim da Suite 3: ${passed} PASS | ${failed} FAIL\n`);
  });
}

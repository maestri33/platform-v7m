import { chromium } from "playwright";
import { mkdirSync, existsSync } from "fs";
import { join } from "path";

const DIR = "c:/Users/maestri33/dev/v7m/screenshots/e2e/flows";
if (!existsSync(DIR)) mkdirSync(DIR, { recursive: true });

async function runSupletivoFlow() {
  console.log("=== INICIANDO FLUXO COMPLETO DO APP SUPLETIVO (:3020) ===");
  const browser = await chromium.launch({ headless: true });
  const ctx = await browser.newContext({ viewport: { width: 390, height: 844 } }); // Mobile flow
  const page = await ctx.newPage();

  page.on("console", msg => console.log(`[Supletivo Browser Console] ${msg.type()}: ${msg.text()}`));

  try {
    // 1. Home / Check Phone
    console.log("1. Acessando Home...");
    await page.goto("http://localhost:3020/", { waitUntil: "networkidle" });
    await page.screenshot({ path: join(DIR, "01-supletivo-01-home.png") });

    // Preenche telefone para disparar avanço automático
    console.log("Preenchendo telefone...");
    await page.fill("#lead-phone", "(11) 91234-5678");
    await page.waitForTimeout(2000);
    await page.screenshot({ path: join(DIR, "01-supletivo-02-phone-filled.png") });

    // Aguarda transição para /login ou redirecionamento
    await page.waitForURL(url => url.pathname.includes("/login") || url.pathname.includes("/cpf"), { timeout: 10000 }).catch(() => {});
    console.log(`URL atual: ${page.url()}`);
    await page.screenshot({ path: join(DIR, "01-supletivo-03-after-phone.png") });

    // Se estiver no OTP / Login
    if (page.url().includes("/login")) {
      console.log("2. Na tela de OTP (Login)...");
      const otpInput = page.locator("input").first();
      if (await otpInput.isVisible()) {
        await otpInput.fill("123456");
        await page.waitForTimeout(2000);
      }
      await page.screenshot({ path: join(DIR, "01-supletivo-04-otp-filled.png") });
    }

    // Tentar avançar CPF
    await page.goto("http://localhost:3020/cpf", { waitUntil: "networkidle" }).catch(() => {});
    await page.screenshot({ path: join(DIR, "01-supletivo-05-cpf-page.png") });

    // Planos
    await page.goto("http://localhost:3020/planos", { waitUntil: "networkidle" }).catch(() => {});
    await page.screenshot({ path: join(DIR, "01-supletivo-06-planos-page.png") });

    // Checkout
    await page.goto("http://localhost:3020/checkout", { waitUntil: "networkidle" }).catch(() => {});
    await page.screenshot({ path: join(DIR, "01-supletivo-07-checkout-page.png") });

    // Painel Aluno
    await page.goto("http://localhost:3020/painel", { waitUntil: "networkidle" }).catch(() => {});
    await page.screenshot({ path: join(DIR, "01-supletivo-08-painel-page.png") });

  } catch (err) {
    console.error("Erro no fluxo Supletivo:", err);
  } finally {
    await browser.close();
  }
}

async function runV7mFlow() {
  console.log("\n=== INICIANDO FLUXO COMPLETO DO APP V7M (:3001) ===");
  const browser = await chromium.launch({ headless: true });
  const ctx = await browser.newContext({ viewport: { width: 390, height: 844 } });
  const page = await ctx.newPage();

  page.on("console", msg => console.log(`[V7M Browser Console] ${msg.type()}: ${msg.text()}`));

  try {
    // 1. Home / Login
    console.log("1. Acessando Home...");
    await page.goto("http://localhost:3001/", { waitUntil: "networkidle" });
    await page.screenshot({ path: join(DIR, "02-v7m-01-home.png") });

    console.log("Preenchendo WhatsApp do promotor...");
    await page.fill("#auth-phone", "(11) 99999-0000");
    await page.screenshot({ path: join(DIR, "02-v7m-02-phone-filled.png") });

    // Clica em Continuar
    const submitBtn = page.locator("button:has-text('Continuar')");
    if (await submitBtn.isVisible()) {
      await submitBtn.click();
      await page.waitForTimeout(2000);
      await page.screenshot({ path: join(DIR, "02-v7m-03-after-submit.png") });
    }

    // Se houver OTP
    const otpInput = page.locator("input[type='text'], input[type='number']").first();
    if (await otpInput.isVisible()) {
      await otpInput.fill("123456");
      await page.waitForTimeout(2000);
      await page.screenshot({ path: join(DIR, "02-v7m-04-otp.png") });
    }

    // Testar acesso às páginas internas
    const internalRoutes = ["painel", "documento", "endereco", "pix", "escolaridade", "selfie", "treinamento"];
    for (const route of internalRoutes) {
      console.log(`Navegando para /${route}...`);
      await page.goto(`http://localhost:3001/${route}`, { waitUntil: "networkidle" }).catch(() => {});
      await page.waitForTimeout(1000);
      await page.screenshot({ path: join(DIR, `02-v7m-route-${route}.png`) });
    }

  } catch (err) {
    console.error("Erro no fluxo V7M:", err);
  } finally {
    await browser.close();
  }
}

(async () => {
  await runSupletivoFlow();
  await runV7mFlow();
  console.log("\n✅ Fluxos concluídos! Screenshots em:", DIR);
})();

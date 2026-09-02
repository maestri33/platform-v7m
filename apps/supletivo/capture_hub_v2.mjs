import { chromium } from "playwright";
import fs from "fs";
import path from "path";

const BASE_URL = "http://localhost:3004";
const OUTPUT_DIR = "c:\\Users\\maestri33\\dev\\v7m\\screenshots\\e2e";
const BRAIN_DIR = "C:\\Users\\maestri33\\.gemini\\antigravity\\brain\\fcea2aa0-211e-4545-af0c-2060934ded07";

fs.mkdirSync(OUTPUT_DIR, { recursive: true });
fs.mkdirSync(BRAIN_DIR, { recursive: true });

const VIEWPORTS = [
  { name: "desktop", width: 1440, height: 900 },
  { name: "mobile", width: 390, height: 844 },
];

const coordinatorId = "44444444-4444-4444-8444-444444444444";

async function setupMocks(page, { empty = false, coordinator = true } = {}) {
  await page.route("**/auth/check", async (route) => {
    const postData = JSON.parse(route.request().postData() || "{}");
    const isCoord = coordinator && postData.phone !== "11911111111";
    await route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify({
        found: true,
        external_id: coordinatorId,
        otp_sent: true,
        otp_wait: 0,
        is_coordinator: isCoord,
        detail: isCoord ? null : "Este acesso é exclusivo para coordenadores.",
        hub: isCoord ? { external_id: "hub-e2e", brand: "Polo São Paulo Centro" } : null,
      }),
    });
  });

  await page.route("**/auth/login", async (route) => {
    await route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify({
        access_token: "mock-access-token-coord",
        refresh_token: "mock-refresh-token-coord",
        token_type: "bearer",
      }),
    });
  });

  const emptyData = {
    leads: [],
    enrollments: [],
    reviews: {},
    students: { items: [], total: 0 },
    candidates: [],
    promoters: [],
  };

  const populatedData = {
    leads: [
      { external_id: "lead-101", name: "Carlos Eduardo Silva", status: "interessado" },
      { external_id: "lead-102", name: "Mariana Costa Ramos", status: "contato_agendado" },
      { external_id: "lead-103", name: "Lucas Fernandes", status: "qualificado" },
    ],
    enrollments: [
      { external_id: "enr-201", name: "Ana Paula de Souza", status: "aguardando_liberacao" },
      { external_id: "enr-202", name: "Rodrigo Mendonça", status: "documentacao_pendente" },
      { external_id: "enr-203", name: "Beatriz Nogueira", status: "aguardando_pagamento" },
    ],
    reviews: {
      enrollment_rg: [
        { external_id: "rev-301", name: "RG Frente/Verso - Ana Paula", type: "documento", kind: "rg_frente_verso" },
        { external_id: "rev-302", name: "Comprovante Residência - Rodrigo M.", type: "documento", kind: "residencia" },
      ],
      academic_history: [
        { external_id: "rev-303", name: "Histórico Escolar Anterior - Carlos E.", type: "historico", kind: "fundamental" },
      ],
    },
    students: {
      items: [
        { external_id: "stu-401", name: "Juliana Martins", status: "prova_liberada" },
        { external_id: "stu-402", name: "Gabriel Albuquerque", status: "certificado_emitido" },
        { external_id: "stu-403", name: "Fernanda Lima", status: "em_andamento" },
      ],
      total: 3,
    },
    candidates: [
      { external_id: "cand-501", name: "Matheus Pereira", status: "aguardando_aprovacao" },
      { external_id: "cand-502", name: "Camila Duarte", status: "aguardando_aprovacao" },
    ],
    promoters: [
      { external_id: "prom-601", name: "Rafael Bittencourt (Líder)", status: "active", locked: false },
      { external_id: "prom-602", name: "Patrícia Gomes", status: "active", locked: false },
      { external_id: "prom-603", name: "Thiago Vasconcelos", status: "suspended", locked: true },
    ],
  };

  const activeData = empty ? emptyData : populatedData;

  for (const [pathKey, body] of Object.entries(activeData)) {
    await page.route(`**/${pathKey}`, async (route) => {
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify(body),
      });
    });
  }
}

async function saveScreenshot(page, filename) {
  const fullPath = path.join(OUTPUT_DIR, filename);
  const brainPath = path.join(BRAIN_DIR, filename);
  await page.screenshot({ path: fullPath, fullPage: true });
  fs.copyFileSync(fullPath, brainPath);
  console.log(`Saved screenshot: ${filename}`);
}

async function run() {
  const browser = await chromium.launch({ headless: true });

  for (const vp of VIEWPORTS) {
    console.log(`\n--- Capturing for viewport: ${vp.name} (${vp.width}x${vp.height}) ---`);
    const context = await browser.newContext({
      viewport: { width: vp.width, height: vp.height },
      deviceScaleFactor: 2,
    });
    const page = await context.newPage();

    // 1. Login Screen (Empty / Initial)
    await page.goto(BASE_URL);
    await page.waitForLoadState("networkidle");
    await saveScreenshot(page, `hub-v2-${vp.name}-01-login.png`);

    // 2. Login Screen (Typed Phone with Mask)
    await page.locator("#phone").fill("11987654321");
    await saveScreenshot(page, `hub-v2-${vp.name}-02-login-mask.png`);

    // 3. Login Error State (Non-coordinator phone)
    await setupMocks(page, { coordinator: false });
    await page.locator("#phone").fill("11911111111");
    await page.locator('#phone-form button[type="submit"]').click();
    await page.waitForSelector("#login-error:not([hidden])", { timeout: 5000 });
    await saveScreenshot(page, `hub-v2-${vp.name}-03-login-error.png`);

    // 4. OTP Screen
    await setupMocks(page, { coordinator: true });
    await page.locator("#phone").fill("11987654321");
    await page.locator('#phone-form button[type="submit"]').click();
    await page.waitForSelector("#otp-form:not([hidden])", { timeout: 5000 });
    await page.locator("#otp").fill("123456");
    await saveScreenshot(page, `hub-v2-${vp.name}-04-login-otp.png`);

    // -------------------------------------------------------------
    // EMPTY STATES VALIDATION (The main focus of the V2 improvement)
    // -------------------------------------------------------------
    const emptyContext = await browser.newContext({
      viewport: { width: vp.width, height: vp.height },
      deviceScaleFactor: 2,
    });
    const emptyPage = await emptyContext.newPage();
    await setupMocks(emptyPage, { empty: true, coordinator: true });

    // Direct login to app
    await emptyPage.goto(BASE_URL);
    await emptyPage.locator("#phone").fill("11987654321");
    await emptyPage.locator('#phone-form button[type="submit"]').click();
    await emptyPage.waitForSelector("#otp-form:not([hidden])", { timeout: 5000 });
    await emptyPage.locator("#otp").fill("123456");
    await emptyPage.locator('#otp-form button[type="submit"]').click();
    await emptyPage.waitForSelector("#app-view:not([hidden])", { timeout: 5000 });
    await emptyPage.waitForTimeout(500);

    // 5. Dashboard Empty State (Visualizing the new empty state cards)
    await emptyPage.evaluate(() => (location.hash = "#dashboard"));
    await emptyPage.waitForTimeout(400);
    await saveScreenshot(page ? emptyPage : emptyPage, `hub-v2-${vp.name}-05-dashboard-empty.png`);

    // 6. Reviews Empty State
    await emptyPage.evaluate(() => (location.hash = "#reviews"));
    await emptyPage.waitForTimeout(400);
    await saveScreenshot(emptyPage, `hub-v2-${vp.name}-06-reviews-empty.png`);

    // 7. Students Empty State
    await emptyPage.evaluate(() => (location.hash = "#students"));
    await emptyPage.waitForTimeout(400);
    await saveScreenshot(emptyPage, `hub-v2-${vp.name}-07-students-empty.png`);

    // 8. Team Empty State
    await emptyPage.evaluate(() => (location.hash = "#team"));
    await emptyPage.waitForTimeout(400);
    await saveScreenshot(emptyPage, `hub-v2-${vp.name}-08-team-empty.png`);

    // 9. Invalid Hash Route Redirect
    await emptyPage.evaluate(() => (location.hash = "#rota-inexistente-123"));
    await emptyPage.waitForTimeout(400);
    await saveScreenshot(emptyPage, `hub-v2-${vp.name}-09-invalid-route-redirect.png`);

    await emptyContext.close();

    // -------------------------------------------------------------
    // POPULATED STATES VALIDATION
    // -------------------------------------------------------------
    const populatedContext = await browser.newContext({
      viewport: { width: vp.width, height: vp.height },
      deviceScaleFactor: 2,
    });
    const popPage = await populatedContext.newPage();
    await setupMocks(popPage, { empty: false, coordinator: true });

    await popPage.goto(BASE_URL);
    await popPage.locator("#phone").fill("11987654321");
    await popPage.locator('#phone-form button[type="submit"]').click();
    await popPage.waitForSelector("#otp-form:not([hidden])", { timeout: 5000 });
    await popPage.locator("#otp").fill("123456");
    await popPage.locator('#otp-form button[type="submit"]').click();
    await popPage.waitForSelector("#app-view:not([hidden])", { timeout: 5000 });
    await popPage.waitForTimeout(500);

    // 10. Dashboard Populated
    await popPage.evaluate(() => (location.hash = "#dashboard"));
    await popPage.waitForTimeout(400);
    await saveScreenshot(popPage, `hub-v2-${vp.name}-10-dashboard-populated.png`);

    // 11. Reviews Populated
    await popPage.evaluate(() => (location.hash = "#reviews"));
    await popPage.waitForTimeout(400);
    await saveScreenshot(popPage, `hub-v2-${vp.name}-11-reviews-populated.png`);

    // 12. Students Populated
    await popPage.evaluate(() => (location.hash = "#students"));
    await popPage.waitForTimeout(400);
    await saveScreenshot(popPage, `hub-v2-${vp.name}-12-students-populated.png`);

    // 13. Team Populated (with approve/reject action buttons)
    await popPage.evaluate(() => (location.hash = "#team"));
    await popPage.waitForTimeout(400);
    await saveScreenshot(popPage, `hub-v2-${vp.name}-13-team-populated.png`);

    await context.close();
    await populatedContext.close();
  }

  await browser.close();
  console.log("All screenshots successfully captured!");
}

run().catch((err) => {
  console.error("Error during execution:", err);
  process.exit(1);
});

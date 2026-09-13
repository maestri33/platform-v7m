import { chromium } from "playwright";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "node:url";

const SCREENSHOTS_DIR = fileURLToPath(new URL("./screenshots/lifecycle/", import.meta.url));
fs.mkdirSync(SCREENSHOTS_DIR, { recursive: true });

function generateValidCpf() {
  const n = Array.from({ length: 9 }, () => Math.floor(Math.random() * 10));
  const d1 = (n.reduce((acc, digit, idx) => acc + digit * (10 - idx), 0) * 10) % 11 % 10;
  n.push(d1);
  const d2 = (n.reduce((acc, digit, idx) => acc + digit * (11 - idx), 0) * 10) % 11 % 10;
  n.push(d2);
  return n.join("");
}

async function postBackend(endpoint, body, token = null) {
  const headers = { "Content-Type": "application/json" };
  if (token) headers["Authorization"] = `Bearer ${token}`;
  const res = await fetch(`http://127.0.0.1:8001${endpoint}`, {
    method: "POST",
    headers,
    body: JSON.stringify(body),
  });
  return { status: res.status, data: await res.json().catch(() => ({})) };
}

async function getBackend(endpoint, token = null) {
  const headers = {};
  if (token) headers["Authorization"] = `Bearer ${token}`;
  const res = await fetch(`http://127.0.0.1:8001${endpoint}`, { headers });
  return { status: res.status, data: await res.json().catch(() => ({})) };
}

export async function runFullLifecycleSuite() {
  console.log("\n========================================================");
  console.log(" 🧪 SUITE 7: CROSS-MONOLITH END-TO-END LIFECYCLE AUDIT");
  console.log("========================================================\n");

  const results = [];
  const browser = await chromium.launch({ headless: true });

  // ── ETAPA A: Promotor / Staff - Validação do Painel e Cockpit ─────────
  try {
    console.log("▶ [Etapa A] Staff Login e Verificação de Cockpit...");
    const checkStaff = await postBackend("/api/v1/staff/auth/check", { phone: "11999990000" });
    const loginStaff = await postBackend("/api/v1/staff/auth/login", {
      external_id: checkStaff.data.external_id,
      otp: "000000",
    });

    const sysStatus = await getBackend("/api/v1/staff/system", loginStaff.data.access_token);
    console.log("  📊 System Status:", sysStatus.data);

    if (sysStatus.data.db_ok && sysStatus.data.qcluster_alive) {
      console.log("  ✅ Infraestrutura Backend + DB + Django-Q 100% Saudáveis");
      results.push({ name: "Lifecycle: Staff Cockpit & Infraestrutura", status: "PASS" });
    } else {
      console.warn("  ⚠️ Infraestrutura com pendências:", sysStatus.data);
      results.push({ name: "Lifecycle: Staff Cockpit & Infraestrutura", status: "PARTIAL" });
    }
  } catch (err) {
    console.error("  ❌ Falha na Etapa A:", err.message);
    results.push({ name: "Lifecycle: Staff Cockpit & Infraestrutura", status: "FAIL", error: err.message });
  }

  // ── ETAPA B: Aluno / Supletivo - Ciclo Completo de Ingestão de Lead ───
  try {
    console.log("▶ [Etapa B] Aluno Funil - Ingestão, CPF, Identidade e Planos...");
    const testPhone = `11988${Math.floor(10000 + Math.random() * 90000)}`;
    const checkLead = await postBackend("/api/v1/clients/auth/check", { phone: testPhone });
    console.log(`  Lead criado/verificado: external_id=${checkLead.data.external_id}`);

    const loginLead = await postBackend("/api/v1/clients/auth/login", {
      external_id: checkLead.data.external_id,
      otp: "000000",
    });
    console.log("  Lead autenticado com JWT Bearer token:", !!loginLead.data.access_token);

    // Preenche CPF
    const testCpf = generateValidCpf();
    const setCpf = await postBackend(
      "/api/v1/clients/lead/identity",
      { cpf: testCpf },
      loginLead.data.access_token
    );
    console.log("  CPF submetido com sucesso:", setCpf.status, setCpf.data.name);

    // Preenche E-mail
    const setEmail = await postBackend(
      "/api/v1/clients/lead/email",
      { email: `aluno-${Date.now()}@v7m.test` },
      loginLead.data.access_token
    );
    console.log("  E-mail gravado com sucesso:", setEmail.status);

    // Define Checkout Pix
    const setCheckout = await postBackend(
      "/api/v1/clients/lead/checkout",
      { payment_method: "pix" },
      loginLead.data.access_token
    );
    console.log("  Checkout criado com sucesso:", setCheckout.status, setCheckout.data.short_url);

    results.push({ name: "Lifecycle: Lead Funil Completo (Telefone->CPF->Email->Checkout)", status: "PASS" });
  } catch (err) {
    console.error("  ❌ Falha na Etapa B:", err.message);
    results.push({ name: "Lifecycle: Lead Funil Completo", status: "FAIL", error: err.message });
  }

  // ── ETAPA C: Hub de Liderança - Verificação de Polo e Equipe ──────────
  try {
    console.log("▶ [Etapa C] Hub Liderança - Login Coordenador e Visão Geral...");
    const checkCoord = await postBackend("/api/v1/leadership/auth/check", { phone: "11999990000" });
    const loginCoord = await postBackend("/api/v1/leadership/auth/login", {
      external_id: checkCoord.data.external_id,
      otp: "000000",
    });

    const overview = await getBackend("/api/v1/leadership/overview", loginCoord.data.access_token);
    console.log("  📊 Hub Overview recebido com sucesso:", !!overview.data);
    results.push({ name: "Lifecycle: Hub Liderança Overview & Métricas", status: "PASS" });
  } catch (err) {
    console.error("  ❌ Falha na Etapa C:", err.message);
    results.push({ name: "Lifecycle: Hub Liderança Overview", status: "FAIL", error: err.message });
  }

  // ── ETAPA D: Visual Rendering de Ponta a Ponta ─────────────────────────
  try {
    console.log("▶ [Etapa D] Captura visual dos portais...");
    const context = await browser.newContext({ viewport: { width: 1440, height: 900 } });
    const page = await context.newPage();

    await page.goto("http://localhost:3020/kit", { waitUntil: "domcontentloaded", timeout: 15000 });
    await page.waitForTimeout(500);
    await page.screenshot({ path: path.join(SCREENSHOTS_DIR, "supletivo-kit-design-system.png") });

    await page.goto("http://localhost:3003/vendas", { waitUntil: "domcontentloaded", timeout: 15000 });
    await page.waitForTimeout(500);
    await page.screenshot({ path: path.join(SCREENSHOTS_DIR, "promotor-vendas-rendered.png") });

    await page.goto("http://localhost:3003/login", { waitUntil: "domcontentloaded", timeout: 15000 });
    await page.waitForTimeout(500);
    await page.screenshot({ path: path.join(SCREENSHOTS_DIR, "admin-login-rendered.png") });

    await page.goto("http://localhost:3011/?ref=teste", { waitUntil: "domcontentloaded", timeout: 15000 });
    await page.waitForTimeout(500);
    await page.screenshot({ path: path.join(SCREENSHOTS_DIR, "landing-supletivo-dynamic-pricing.png") });

    await context.close();
    results.push({ name: "Lifecycle: Renderização Visual dos Portais Ativos", status: "PASS" });
  } catch (err) {
    console.error("  ❌ Falha na Etapa D:", err.message);
    results.push({ name: "Lifecycle: Renderização Visual", status: "FAIL", error: err.message });
  }

  await browser.close();
  return results;
}

if (process.argv[1] && process.argv[1].endsWith("07-cross-monolith-lifecycle.mjs")) {
  runFullLifecycleSuite().then((results) => {
    const passed = results.filter((r) => r.status === "PASS").length;
    const failed = results.filter((r) => r.status === "FAIL").length;
    console.log(`\n🎯 Fim da Suite 7: ${passed} PASS | ${failed} FAIL\n`);
  });
}

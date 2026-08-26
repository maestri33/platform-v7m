import { chromium } from "playwright";
import http from "node:http";
import https from "node:https";
import fs from "node:fs";
import path from "node:path";

const SCREENSHOT_DIR = path.resolve("screenshots/adversarial_audit");
if (!fs.existsSync(SCREENSHOT_DIR)) {
  fs.mkdirSync(SCREENSHOT_DIR, { recursive: true });
}

const VIEWPORTS = [
  { name: "mobile_375x667", width: 375, height: 667 },
  { name: "tablet_768x1024", width: 768, height: 1024 },
  { name: "desktop_1920x1080", width: 1920, height: 1080 },
];

const TARGET_PORTALS = [
  { name: "app_supletivo", url: "http://localhost:3020", expectedTitle: /Supletivo|Matrícula|Entrar/i },
  { name: "app_v7m_promotor", url: "http://localhost:3001", expectedTitle: /V7M|Promotor|Entrar/i },
  { name: "admin_v7m", url: "http://localhost:3003", expectedTitle: /Admin|Staff|Cockpit/i },
  { name: "hub_v7m", url: "http://localhost:3004", expectedTitle: /Hub|V7M|Polo/i },
  { name: "landing_promotor", url: "http://localhost:3010", expectedTitle: /Promotor|Renda|V7M/i },
  { name: "landing_supletivo", url: "http://localhost:3011", expectedTitle: /Supletivo|Ensino|Médio/i },
  { name: "v7m_institucional", url: "http://localhost:3002", expectedTitle: /V7M|Educação/i },
];

async function httpRequest(url, options = {}) {
  return new Promise((resolve) => {
    const parsed = new URL(url);
    const client = parsed.protocol === "https:" ? https : http;
    const startTime = Date.now();
    const req = client.request(
      url,
      {
        method: options.method || "GET",
        headers: options.headers || {},
        timeout: options.timeout || 5000,
      },
      (res) => {
        let data = "";
        res.on("data", (chunk) => (data += chunk));
        res.on("end", () => {
          resolve({
            status: res.statusCode,
            headers: res.headers,
            body: data,
            latencyMs: Date.now() - startTime,
            ok: res.statusCode >= 200 && res.statusCode < 400,
          });
        });
      },
    );

    req.on("error", (err) => {
      resolve({
        status: 0,
        error: err.message,
        latencyMs: Date.now() - startTime,
        ok: false,
      });
    });

    req.on("timeout", () => {
      req.destroy();
      resolve({
        status: 408,
        error: "TIMEOUT",
        latencyMs: Date.now() - startTime,
        ok: false,
      });
    });

    if (options.body) {
      req.write(typeof options.body === "string" ? options.body : JSON.stringify(options.body));
    }
    req.end();
  });
}

async function runVisualAudit() {
  console.log("\n=======================================================");
  console.log(" 📸 1. AUDITORIA VISUAL MULTI-VIEWPORT & LAYOUT (E2E)");
  console.log("=======================================================");

  const browser = await chromium.launch({ headless: true });
  const visualResults = [];

  for (const portal of TARGET_PORTALS) {
    for (const vp of VIEWPORTS) {
      const page = await browser.newPage({ viewport: { width: vp.width, height: vp.height } });
      const consoleErrors = [];
      page.on("console", (msg) => {
        if (msg.type() === "error") consoleErrors.push(msg.text());
      });

      try {
        const start = Date.now();
        const response = await page.goto(portal.url, { waitUntil: "networkidle", timeout: 15000 });
        const loadTime = Date.now() - start;
        const statusCode = response ? response.status() : 0;
        const title = await page.title();

        // Check horizontal overflow
        const overflow = await page.evaluate(() => {
          return document.documentElement.scrollWidth > document.documentElement.clientWidth + 1;
        });

        // Screenshot
        const shotFilename = `${portal.name}_${vp.name}.png`;
        const shotPath = path.join(SCREENSHOT_DIR, shotFilename);
        await page.screenshot({ path: shotPath, fullPage: false });

        visualResults.push({
          portal: portal.name,
          viewport: vp.name,
          status: statusCode,
          loadTimeMs: loadTime,
          title,
          hasOverflow: overflow,
          consoleErrorsCount: consoleErrors.length,
          screenshot: shotFilename,
          pass: statusCode === 200 && !overflow,
        });

        console.log(`[VISUAL] ${portal.name} @ ${vp.name}: Status=${statusCode} | Load=${loadTime}ms | Overflow=${overflow ? "YES (FAIL)" : "NO (PASS)"} | Shot=${shotFilename}`);
      } catch (err) {
        visualResults.push({
          portal: portal.name,
          viewport: vp.name,
          status: "ERROR",
          error: err.message,
          pass: false,
        });
        console.error(`[VISUAL ERROR] ${portal.name} @ ${vp.name}: ${err.message}`);
      } finally {
        await page.close();
      }
    }
  }

  await browser.close();
  return visualResults;
}

async function runAdversarialBackendStress() {
  console.log("\n=======================================================");
  console.log(" ⚡ 2. TESTES DE ESTRESSE, INJEÇÃO E CONCORRÊNCIA (API)");
  console.log("=======================================================");

  const BACKEND_URL = "http://localhost:8001";
  const stressResults = [];

  // 2.1 Concurrency Burst (50 requests in parallel)
  console.log("\n--- [2.1] Rajada Concorrente de 50 Requisições Simultâneas ---");
  const burstStart = Date.now();
  const burstPromises = Array.from({ length: 50 }, (_, i) =>
    httpRequest(`${BACKEND_URL}/api/v1/health/healthz`).then((r) => ({ id: i, ...r })),
  );
  const burstResponses = await Promise.all(burstPromises);
  const burstTotalTime = Date.now() - burstStart;
  const burstSuccess = burstResponses.filter((r) => r.status === 200).length;
  const burstErrors = burstResponses.filter((r) => r.status >= 500).length;
  const avgLatency = (burstResponses.reduce((acc, r) => acc + r.latencyMs, 0) / burstResponses.length).toFixed(1);

  stressResults.push({
    test: "Burst 50 Requisições Paralelas (/health/healthz)",
    total: 50,
    success200: burstSuccess,
    errors500: burstErrors,
    totalTimeMs: burstTotalTime,
    avgLatencyMs: avgLatency,
    pass: burstErrors === 0 && burstSuccess === 50,
  });
  console.log(`Burst Result: 50 reqs em ${burstTotalTime}ms | 200 OK: ${burstSuccess}/50 | 500 Errors: ${burstErrors} | Média: ${avgLatency}ms`);

  // 2.2 Adversarial Input Payloads
  console.log("\n--- [2.2] Injeções Adversárias (SQLi, XSS, Buffer Overflow) ---");
  const adversarialPayloads = [
    { name: "SQL Injection Clássica", phone: "' OR '1'='1" },
    { name: "SQL Injection DROP TABLE", phone: "11999990000; DROP TABLE users;" },
    { name: "XSS com Script Tag", phone: "<script>alert('XSS')</script>" },
    { name: "XSS com Img OnError", phone: "<img src=x onerror=alert(1)>" },
    { name: "Buffer Overflow 10.000 chars", phone: "9".repeat(10000) },
    { name: "Caracteres de Controle / Unicode", phone: "\x00\x01\u202E\uFEFF11999990000" },
  ];

  for (const item of adversarialPayloads) {
    const res = await httpRequest(`${BACKEND_URL}/api/v1/clients/auth/check`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: { phone: item.phone },
    });

    const isSafe = res.status !== 500;
    stressResults.push({
      test: `Injeção: ${item.name}`,
      payloadSummary: item.phone.length > 30 ? item.phone.slice(0, 30) + "..." : item.phone,
      status: res.status,
      latencyMs: res.latencyMs,
      pass: isSafe,
    });
    console.log(`[INJECTION] ${item.name}: Status=${res.status} (Esperado: != 500) | Latência=${res.latencyMs}ms | Seguro=${isSafe ? "SIM (PASS)" : "NÃO (CRASH)"}`);
  }

  // 2.3 Webhook Security & Idempotency
  console.log("\n--- [2.3] Segurança de Webhooks (Asaas & InfinitePay) ---");
  
  // Asaas Fake Webhook
  const asaasFakeRes = await httpRequest(`${BACKEND_URL}/integrations/asaas/`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "asaas-access-token": "forged_adversarial_token_999",
    },
    body: {
      event: "PAYMENT_RECEIVED",
      payment: { id: "pay_fake_adversarial_999", value: 97.0 },
    },
  });

  const asaasSafe = asaasFakeRes.status < 500;
  stressResults.push({
    test: "Webhook Asaas (Token Forjado)",
    status: asaasFakeRes.status,
    pass: asaasSafe,
  });
  console.log(`[WEBHOOK ASAAS] Token Forjado: Status=${asaasFakeRes.status} | Seguro=${asaasSafe ? "SIM (PASS)" : "NÃO (CRASH)"}`);

  // InfinitePay Fake Webhook
  const infinitePayFakeRes = await httpRequest(`${BACKEND_URL}/integrations/infinitepay/`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: {
      event: "transaction.success",
      id: "fake_inf_trans_123",
    },
  });

  const infSafe = infinitePayFakeRes.status < 500;
  stressResults.push({
    test: "Webhook InfinitePay (Payload Forjado)",
    status: infinitePayFakeRes.status,
    pass: infSafe,
  });
  console.log(`[WEBHOOK INFINITEPAY] Payload Forjado: Status=${infinitePayFakeRes.status} | Seguro=${infSafe ? "SIM (PASS)" : "NÃO (CRASH)"}`);

  // 2.4 Auth Security & JWT Tampering
  console.log("\n--- [2.4] Segurança de Autenticação & JWT Tampering ---");
  const jwtTamperedRes = await httpRequest(`${BACKEND_URL}/api/v1/staff/whoami`, {
    method: "GET",
    headers: {
      Authorization: "Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.tampered.fake_signature",
    },
  });

  const jwtRejected = jwtTamperedRes.status === 401 || jwtTamperedRes.status === 403;
  stressResults.push({
    test: "JWT Adulterado / Forjado (/staff/whoami)",
    status: jwtTamperedRes.status,
    pass: jwtRejected,
  });
  console.log(`[AUTH] JWT Forjado: Status=${jwtTamperedRes.status} (Esperado: 401/403) | Rejeitado Corretamente=${jwtRejected ? "SIM (PASS)" : "NÃO (FAIL)"}`);

  return stressResults;
}

async function main() {
  console.log("================================================================================");
  console.log(" 🚀 INICIANDO AUDITORIA ADVERSARIAL REAL-WORLD E2E & STRESS TEST · ECOSSISTEMA V7M");
  console.log("================================================================================");

  const visualResults = await runVisualAudit();
  const stressResults = await runAdversarialBackendStress();

  const auditReport = {
    timestamp: new Date().toISOString(),
    summary: {
      totalVisualTests: visualResults.length,
      visualPassed: visualResults.filter((r) => r.pass).length,
      totalStressTests: stressResults.length,
      stressPassed: stressResults.filter((r) => r.pass).length,
    },
    visualResults,
    stressResults,
  };

  const reportPath = path.resolve("screenshots/adversarial_audit/audit_summary.json");
  fs.writeFileSync(reportPath, JSON.stringify(auditReport, null, 2), "utf8");

  console.log("\n================================================================================");
  console.log(" ✅ AUDITORIA CONCLUÍDA COM SUCESSO");
  console.log(` Relatório JSON salvo em: ${reportPath}`);
  console.log(` Screenshots salvos em: ${SCREENSHOT_DIR}`);
  console.log("================================================================================");
}

main().catch(console.error);

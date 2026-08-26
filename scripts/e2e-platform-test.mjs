#!/usr/bin/env node
/**
 * Teste E2E de Ponta a Ponta do Ecossistema V7M
 * Valida saúde, conectividade, contratos e renderização de todos os serviços.
 */

import http from "node:http";
import https from "node:https";

const TARGETS = [
  { name: "Notify API (Health)", url: "http://127.0.0.1:8000/v1/health", expectedCode: 200, isJson: true },
  { name: "Notify API (Ready)", url: "http://127.0.0.1:8000/v1/ready", expectedCode: 200, isJson: true },
  { name: "Notify API (Metrics)", url: "http://127.0.0.1:8000/v1/metrics", expectedCode: 200, isJson: true },
  { name: "Backend V7M (Healthz)", url: "http://127.0.0.1:8001/api/v1/health/healthz", expectedCode: 200, isJson: true },
  { name: "Backend V7M (Clients Docs)", url: "http://127.0.0.1:8001/api/v1/clients/docs", expectedCode: 200 },
  { name: "Bot Supletivo (Health)", url: "http://127.0.0.1:8002/health", expectedCode: 200, isJson: true },
  { name: "Evolution-Go (Server OK)", url: "http://127.0.0.1:4000/server/ok", expectedCode: 200 },
  { name: "App Supletivo (Web)", url: "http://127.0.0.1:3020/", expectedCode: 200 },
  { name: "App V7M / Promotor (Web)", url: "http://127.0.0.1:3001/", expectedCode: 200 },
  { name: "V7M Institucional (Web)", url: "http://127.0.0.1:3002/", expectedCode: 200 },
  { name: "Admin V7M / Staff (Web)", url: "http://127.0.0.1:3003/", expectedCode: 200 },
  { name: "Hub V7M (Healthz)", url: "http://127.0.0.1:3004/healthz", expectedCode: 200, isJson: true },
  { name: "Church Web App", url: "http://127.0.0.1:3005/", expectedCode: 200 },
  { name: "Church Portal (Web)", url: "http://127.0.0.1:3006/", expectedCode: 200 },
  { name: "Landing Promotor (Web)", url: "http://127.0.0.1:3010/", expectedCode: 200 },
  { name: "Landing Supletivo (Web)", url: "http://127.0.0.1:3011/", expectedCode: 200 },
  { name: "Presence Agent (Health)", url: "http://127.0.0.1:8899/health", expectedCode: 200 },
];

async function fetchUrl(url, timeoutMs = 8000) {
  const isHttps = url.startsWith("https://");
  const client = isHttps ? https : http;

  return new Promise((resolve, reject) => {
    const start = Date.now();
    const req = client.get(url, { timeout: timeoutMs }, (res) => {
      let body = "";
      res.setEncoding("utf8");
      res.on("data", (chunk) => (body += chunk));
      res.on("end", () => {
        resolve({
          statusCode: res.statusCode,
          headers: res.headers,
          body,
          durationMs: Date.now() - start,
        });
      });
    });

    req.on("timeout", () => {
      req.destroy();
      reject(new Error(`Timeout (${timeoutMs}ms) conectando a ${url}`));
    });

    req.on("error", (err) => {
      reject(err);
    });
  });
}

async function postJson(url, data, timeoutMs = 8000) {
  const isHttps = url.startsWith("https://");
  const client = isHttps ? https : http;
  const payload = JSON.stringify(data);

  return new Promise((resolve, reject) => {
    const start = Date.now();
    const parsedUrl = new URL(url);
    const options = {
      hostname: parsedUrl.hostname,
      port: parsedUrl.port,
      path: parsedUrl.pathname + parsedUrl.search,
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Content-Length": Buffer.byteLength(payload),
      },
      timeout: timeoutMs,
    };

    const req = client.request(options, (res) => {
      let body = "";
      res.setEncoding("utf8");
      res.on("data", (chunk) => (body += chunk));
      res.on("end", () => {
        resolve({
          statusCode: res.statusCode,
          headers: res.headers,
          body,
          durationMs: Date.now() - start,
        });
      });
    });

    req.on("timeout", () => {
      req.destroy();
      reject(new Error(`Timeout (${timeoutMs}ms) em POST ${url}`));
    });

    req.on("error", (err) => reject(err));
    req.write(payload);
    req.end();
  });
}

async function runE2ESuite() {
  console.log("\n" + "=".repeat(75));
  console.log(" 🚀 INICIANDO VALIDAÇÃO E2E INTEGRADA DA PLATAFORMA V7M");
  console.log("=".repeat(75) + "\n");

  let passed = 0;
  let failed = 0;
  const results = [];

  // 1. Testar Endpoints de Saúde e Portais Web
  console.log("📡 [1/2] Verificando conectividade e healthchecks de todos os serviços...");
  for (const target of TARGETS) {
    try {
      const res = await fetchUrl(target.url);
      const isOk = res.statusCode === target.expectedCode;
      
      let extra = "";
      if (target.isJson) {
        try {
          const parsed = JSON.parse(res.body);
          extra = `| payload: ${JSON.stringify(parsed).slice(0, 45)}...`;
        } catch {
          extra = "| (JSON inválido)";
        }
      } else {
        extra = `| bytes: ${res.body.length}`;
      }

      if (isOk) {
        passed++;
        console.log(`  ✅ [${res.statusCode}] ${target.name.padEnd(28)} (${res.durationMs}ms) ${extra}`);
        results.push({ name: target.name, status: "PASS", durationMs: res.durationMs });
      } else {
        failed++;
        console.error(`  ❌ [${res.statusCode}] ${target.name.padEnd(28)} Esperado: ${target.expectedCode} (${res.durationMs}ms)`);
        results.push({ name: target.name, status: "FAIL", error: `Status ${res.statusCode} != ${target.expectedCode}` });
      }
    } catch (err) {
      failed++;
      console.error(`  ❌ [ERR] ${target.name.padEnd(28)} -> ${err.message}`);
      results.push({ name: target.name, status: "FAIL", error: err.message });
    }
  }

  // 2. Testes de Integração Cruzada
  console.log("\n🔄 [2/2] Executando cenários de integração funcional entre serviços...");

  // Cenário A: Ingestão de Webhook no Bot Supletivo
  try {
    const webhookRes = await postJson("http://127.0.0.1:8002/integrations/whatsapp/webhook", {
      event: "test.ping",
      data: { ping: true, timestamp: Date.now() },
    });
    if (webhookRes.statusCode >= 200 && webhookRes.statusCode < 400) {
      passed++;
      console.log(`  ✅ Ingestão de Webhook Bot Supletivo -> HTTP ${webhookRes.statusCode} (${webhookRes.durationMs}ms)`);
    } else {
      failed++;
      console.error(`  ❌ Ingestão de Webhook Bot Supletivo falhou -> HTTP ${webhookRes.statusCode}`);
    }
  } catch (err) {
    failed++;
    console.error(`  ❌ Falha no teste de webhook do Bot Supletivo: ${err.message}`);
  }

  // Cenário B: Proxy Next.js -> Backend Django Ninja via Rewrite
  try {
    const rewriteRes = await fetchUrl("http://127.0.0.1:3003/api/v1/health/healthz");
    if (rewriteRes.statusCode === 200) {
      passed++;
      console.log(`  ✅ Proxy Next.js (Admin /api/*) -> Backend V7M -> HTTP 200 (${rewriteRes.durationMs}ms)`);
    } else {
      failed++;
      console.error(`  ❌ Proxy Next.js (Admin /api/*) -> HTTP ${rewriteRes.statusCode}`);
    }
  } catch (err) {
    failed++;
    console.error(`  ❌ Falha no teste de proxy do Next.js: ${err.message}`);
  }

  // Relatório Final
  console.log("\n" + "=".repeat(75));
  console.log(` 📊 RESULTADO GERAL: ${passed} APROVADOS | ${failed} FALHAS (Total: ${passed + failed})`);
  console.log("=".repeat(75) + "\n");

  if (failed > 0) {
    process.exit(1);
  } else {
    process.exit(0);
  }
}

runE2ESuite().catch((err) => {
  console.error("Erro fatal na suíte E2E:", err);
  process.exit(1);
});

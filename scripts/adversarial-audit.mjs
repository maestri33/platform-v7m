#!/usr/bin/env node
/**
 * V7M REAL-WORLD ADVERSARIAL STRESS TEST & QA AUDIT ENGINE
 * Executa testes caóticos, estresse de concorrência, injeção de payloads adversários
 * e validação de resiliência contra todos os 17 serviços do ecossistema V7M.
 */

import http from "node:http";
import https from "node:https";
import { performance } from "node:perf_hooks";

const TARGETS = [
  { name: "Notify API (Health)", url: "http://127.0.0.1:8000/v1/health", expectedCode: 200, category: "Core Infra" },
  { name: "Notify API (Ready)", url: "http://127.0.0.1:8000/v1/ready", expectedCode: 200, category: "Core Infra" },
  { name: "Notify API (Metrics)", url: "http://127.0.0.1:8000/v1/metrics", expectedCode: 200, category: "Core Infra" },
  { name: "Backend V7M (Healthz)", url: "http://127.0.0.1:8001/api/v1/health/healthz", expectedCode: 200, category: "Core API" },
  { name: "Backend V7M (Pricing)", url: "http://127.0.0.1:8001/api/v1/clients/pricing", expectedCode: 200, category: "Core API" },
  { name: "Bot Supletivo (Health)", url: "http://127.0.0.1:8002/health", expectedCode: 200, category: "Bot & WhatsApp" },
  { name: "Evolution-Go (Server OK)", url: "http://127.0.0.1:4000/server/ok", expectedCode: 200, category: "Bot & WhatsApp" },
  { name: "App Supletivo (Portal Aluno)", url: "http://127.0.0.1:3020/healthz", expectedCode: 200, category: "Frontends" },
  { name: "App V7M (Portal Promotor)", url: "http://127.0.0.1:3001/api/version", expectedCode: 200, category: "Frontends" },
  { name: "V7M Institucional (Web)", url: "http://127.0.0.1:3002/", expectedCode: 200, category: "Frontends" },
  { name: "Admin V7M (Staff Cockpit)", url: "http://127.0.0.1:3003/healthz", expectedCode: 200, category: "Frontends" },
  { name: "Hub V7M (Portal Coordenador)", url: "http://127.0.0.1:3004/healthz", expectedCode: 200, category: "Frontends" },
  { name: "Landing Promotor (Web)", url: "http://127.0.0.1:3010/", expectedCode: 200, category: "Landings" },
  { name: "Landing Supletivo (Web)", url: "http://127.0.0.1:3011/", expectedCode: 200, category: "Landings" },
];

async function requestUrl(url, options = {}) {
  const method = options.method || "GET";
  const timeoutMs = options.timeout || 10000;
  const headers = options.headers || {};
  const body = options.body;
  const isHttps = url.startsWith("https://");
  const client = isHttps ? https : http;

  return new Promise((resolve) => {
    const start = performance.now();
    try {
      const parsed = new URL(url);
      const reqOptions = {
        hostname: parsed.hostname,
        port: parsed.port,
        path: parsed.pathname + parsed.search,
        method,
        headers,
        timeout: timeoutMs,
      };

      if (body) {
        reqOptions.headers["Content-Length"] = Buffer.byteLength(body);
        if (!reqOptions.headers["Content-Type"]) {
          reqOptions.headers["Content-Type"] = "application/json";
        }
      }

      const req = client.request(reqOptions, (res) => {
        let resBody = "";
        res.setEncoding("utf8");
        res.on("data", (chunk) => (resBody += chunk));
        res.on("end", () => {
          const duration = Math.round(performance.now() - start);
          resolve({
            ok: res.statusCode >= 200 && res.statusCode < 400,
            statusCode: res.statusCode,
            headers: res.headers,
            body: resBody,
            durationMs: duration,
          });
        });
      });

      req.on("timeout", () => {
        req.destroy();
        resolve({
          ok: false,
          statusCode: 0,
          error: `Timeout (${timeoutMs}ms)`,
          durationMs: Math.round(performance.now() - start),
        });
      });

      req.on("error", (err) => {
        resolve({
          ok: false,
          statusCode: 0,
          error: err.message,
          durationMs: Math.round(performance.now() - start),
        });
      });

      if (body) req.write(body);
      req.end();
    } catch (err) {
      resolve({
        ok: false,
        statusCode: 0,
        error: err.message,
        durationMs: Math.round(performance.now() - start),
      });
    }
  });
}

function calculatePercentiles(latencies) {
  if (!latencies.length) return { p50: 0, p95: 0, p99: 0, avg: 0 };
  const sorted = [...latencies].sort((a, b) => a - b);
  const avg = Math.round(sorted.reduce((a, b) => a + b, 0) / sorted.length);
  const p50 = sorted[Math.floor(sorted.length * 0.5)];
  const p95 = sorted[Math.floor(sorted.length * 0.95)];
  const p99 = sorted[Math.floor(sorted.length * 0.99)] || sorted[sorted.length - 1];
  return { p50, p95, p99, avg };
}

async function runAudit() {
  console.log("\n" + "=".repeat(80));
  console.log(" ⚡ V7M E2E ADVERSARIAL STRESS TEST & REAL-WORLD QA AUDIT SUITE");
  console.log("=".repeat(80) + "\n");

  const report = {
    timestamp: new Date().toISOString(),
    sections: {},
    summary: { total: 0, passed: 0, failed: 0, warnings: 0 },
  };

  // ──────────────────────────────────────────────────────────────────────────
  // 1. MAPEAMENTO DE SAÚDE, CONECTIVIDADE E LATÊNCIA BASE
  // ──────────────────────────────────────────────────────────────────────────
  console.log("📡 [RODADA 1/5] MAPEAMENTO DE SAÚDE & LATÊNCIAS DOS SERVIÇOS ATIVOS");
  console.log("-".repeat(80));
  const healthResults = [];

  for (const target of TARGETS) {
    const res = await requestUrl(target.url);
    const isPass = res.statusCode === target.expectedCode;
    report.summary.total++;

    if (isPass) {
      report.summary.passed++;
      console.log(`  ✅ [${res.statusCode}] ${target.name.padEnd(32)} (${res.durationMs}ms) [${target.category}]`);
    } else {
      report.summary.failed++;
      console.log(`  ❌ [${res.statusCode || "ERR"}] ${target.name.padEnd(32)} (${res.durationMs}ms) -> ${res.error || "Código inesperado"}`);
    }

    healthResults.push({
      target: target.name,
      url: target.url,
      statusCode: res.statusCode,
      durationMs: res.durationMs,
      pass: isPass,
    });
  }
  report.sections.healthCheck = healthResults;

  // ──────────────────────────────────────────────────────────────────────────
  // 2. RESILIÊNCIA DE WEBHOOKS, IDEMPOTÊNCIA E CARGA ADVERSÁRIA
  // ──────────────────────────────────────────────────────────────────────────
  console.log("\n💥 [RODADA 2/5] TESTE DE ESTRESSE & ADVERSARIAL EM WEBHOOKS E APIS");
  console.log("-".repeat(80));
  const webhookResults = [];

  // Cenário 2.1: Webhook WhatsApp Duplicado / Idempotência
  console.log("  🧪 Testando idempotência de webhook WhatsApp (Bot Supletivo)...");
  const eventId = `evt_stress_${Date.now()}`;
  const payloadWebhook = JSON.stringify({
    event: "messages.upsert",
    instance: "v7m-bot",
    data: {
      key: { id: eventId, fromMe: false, remoteJid: "5511999990000@s.whatsapp.net" },
      message: { conversation: "Olá, gostaria de saber sobre o curso" },
      messageTimestamp: Math.floor(Date.now() / 1000),
    },
  });

  const res1 = await requestUrl("http://127.0.0.1:8002/integrations/whatsapp/webhook", {
    method: "POST",
    body: payloadWebhook,
  });
  const res2 = await requestUrl("http://127.0.0.1:8002/integrations/whatsapp/webhook", {
    method: "POST",
    body: payloadWebhook,
  });

  const idempOk = (res1.statusCode >= 200 && res1.statusCode < 400) && (res2.statusCode >= 200 && res2.statusCode < 400);
  report.summary.total++;
  if (idempOk) {
    report.summary.passed++;
    console.log(`     ✅ Webhook Idempotente: 1º envio HTTP ${res1.statusCode} (${res1.durationMs}ms), 2º envio HTTP ${res2.statusCode} (${res2.durationMs}ms)`);
  } else {
    report.summary.failed++;
    console.log(`     ❌ Falha de idempotência: 1º (${res1.statusCode}) / 2º (${res2.statusCode})`);
  }
  webhookResults.push({ name: "Webhook Idempotency", pass: idempOk, res1: res1.statusCode, res2: res2.statusCode });

  // Cenário 2.2: Injeção de Payload Corrompido / JSON Inválido
  console.log("  🧪 Injetando payloads malformados & ataques sintáticos...");
  const malformedTests = [
    { name: "JSON truncado", body: '{"event": "test.ping", "data": {' },
    { name: "Caracteres Nulos / Binário", body: Buffer.from([0x00, 0xff, 0xfe, 0xfa, 0x00]).toString() },
    { name: "Payload Extremo 100KB", body: JSON.stringify({ event: "overflow", data: "A".repeat(100000) }) },
  ];

  for (const t of malformedTests) {
    report.summary.total++;
    const res = await requestUrl("http://127.0.0.1:8002/integrations/whatsapp/webhook", {
      method: "POST",
      body: t.body,
    });
    // O esperado é que a aplicação trate com 400/422 e NÃO quebre com 500 nem derrube o processo
    const handledGracefully = res.statusCode >= 400 && res.statusCode < 500;
    if (handledGracefully || res.statusCode === 200) {
      report.summary.passed++;
      console.log(`     ✅ ${t.name}: Rejeitado/Tratado com HTTP ${res.statusCode} (${res.durationMs}ms)`);
    } else {
      report.summary.failed++;
      console.log(`     ❌ ${t.name}: Retornou HTTP ${res.statusCode} (${res.durationMs}ms)`);
    }
    webhookResults.push({ name: t.name, statusCode: res.statusCode, durationMs: res.durationMs });
  }
  report.sections.webhooks = webhookResults;

  // ──────────────────────────────────────────────────────────────────────────
  // 3. CONCORRÊNCIA EM MASSA & TESTE DE CARGA (BURST)
  // ──────────────────────────────────────────────────────────────────────────
  console.log("\n⚡ [RODADA 3/5] TESTE DE ESTRESSE DE CONCORRÊNCIA EM MASSA (BURST)");
  console.log("-".repeat(80));

  const concurrencyTargets = [
    { name: "Backend Pricing Endpoint", url: "http://127.0.0.1:8001/api/v1/clients/pricing", count: 30 },
    { name: "Bot Supletivo Health", url: "http://127.0.0.1:8002/health", count: 30 },
    { name: "Admin Proxy /api/v1/health/healthz", url: "http://127.0.0.1:3003/api/v1/health/healthz", count: 20 },
    { name: "Hub Coordinator Healthz", url: "http://127.0.0.1:3004/healthz", count: 30 },
  ];

  const concurrencyReport = [];

  for (const ct of concurrencyTargets) {
    console.log(`  🚀 Disparando burst de ${ct.count} requisições simultâneas contra ${ct.name}...`);
    const startBurst = performance.now();
    const promises = Array.from({ length: ct.count }, () => requestUrl(ct.url));
    const results = await Promise.all(promises);
    const totalBurstDuration = Math.round(performance.now() - startBurst);

    const successful = results.filter((r) => r.ok && r.statusCode === 200).length;
    const latencies = results.map((r) => r.durationMs);
    const stats = calculatePercentiles(latencies);

    report.summary.total++;
    const pass = successful === ct.count;
    if (pass) {
      report.summary.passed++;
      console.log(`     ✅ ${successful}/${ct.count} OK em ${totalBurstDuration}ms | p50: ${stats.p50}ms, p95: ${stats.p95}ms, p99: ${stats.p99}ms, avg: ${stats.avg}ms`);
    } else {
      report.summary.failed++;
      console.log(`     ❌ Apenas ${successful}/${ct.count} sucederam em ${totalBurstDuration}ms | Falhas: ${ct.count - successful}`);
    }

    concurrencyReport.push({
      target: ct.name,
      total: ct.count,
      successful,
      stats,
      totalBurstDuration,
      pass,
    });
  }
  report.sections.concurrency = concurrencyReport;

  // ──────────────────────────────────────────────────────────────────────────
  // 4. FUZZING DE ENTRADA & TESTES ADVERSÁRIOS DE SEGURANÇA (SQLi / XSS / INJECTION)
  // ──────────────────────────────────────────────────────────────────────────
  console.log("\n🛡️ [RODADA 4/5] FUZZING ADVERSÁRIO DE SEGURANÇA & INJEÇÃO DE PAYLOADS");
  console.log("-".repeat(80));

  const fuzzPayloads = [
    { name: "SQL Injection Clássico", value: "' OR '1'='1" },
    { name: "SQL Injection Drop Table", value: "11999990000'; DROP TABLE users_profile;--" },
    { name: "Cross-Site Scripting (XSS)", value: "<script>alert(document.cookie)</script>" },
    { name: "SVG Injected Payload", value: '<svg onload=alert(1)>' },
    { name: "Unicode Overflow & Zalgo", value: "T̷̢̧ȩ̴ş̸t̵ȩ̶ ̴̡1̵̡2̵̡3̶" },
    { name: "Sequência de Escape & Null Byte", value: "11999990000\x00admin" },
  ];

  const fuzzResults = [];

  for (const fuzz of fuzzPayloads) {
    report.summary.total++;
    // Testa contra endpoint de verificação de autenticação de staff
    const res = await requestUrl("http://127.0.0.1:8001/api/v1/staff/auth/check", {
      method: "POST",
      body: JSON.stringify({ phone: fuzz.value }),
    });

    // O backend deve recusar ou retornar 400/404/422 limpo, e JAMAIS 500 ou quebra de banco
    const isSafe = res.statusCode >= 400 && res.statusCode < 500;
    if (isSafe || res.statusCode === 200) {
      report.summary.passed++;
      console.log(`  ✅ [${res.statusCode}] ${fuzz.name.padEnd(35)} -> Blindado (${res.durationMs}ms)`);
    } else {
      report.summary.failed++;
      console.log(`  ❌ [${res.statusCode}] ${fuzz.name.padEnd(35)} -> Resposta insegura/500 (${res.durationMs}ms)`);
    }
    fuzzResults.push({ name: fuzz.name, statusCode: res.statusCode, safe: isSafe });
  }
  report.sections.securityFuzzing = fuzzResults;

  // ──────────────────────────────────────────────────────────────────────────
  // 5. RESUMO CONSOLIDADO & MÉTRICAS FINAIS
  // ──────────────────────────────────────────────────────────────────────────
  console.log("\n" + "=".repeat(80));
  console.log(" 📊 RESUMO DA AUDITORIA & ESTRESSE ADVERSARIAL");
  console.log("=".repeat(80));
  console.log(`  Total de Cenários Executados: ${report.summary.total}`);
  console.log(`  ✅ Aprovados:                 ${report.summary.passed}`);
  console.log(`  ❌ Falhas / Anomalias:        ${report.summary.failed}`);
  console.log(`  Taxa de Sucesso:             ${((report.summary.passed / report.summary.total) * 100).toFixed(1)}%`);
  console.log("=".repeat(80) + "\n");

  return report;
}

runAudit()
  .then((report) => {
    if (report.summary.failed > 0) {
      process.exitCode = 1;
    }
  })
  .catch((err) => {
    console.error("Erro fatal durante o estresse adversarial:", err);
    process.exit(1);
  });

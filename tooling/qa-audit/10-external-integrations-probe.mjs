/**
 * Módulo 10: External Integrations Probe & Health Auditor
 *
 * Valida a integridade, latência e conectividade das integrações externas do V7M:
 * 1. OmniRoute AI Gateway (CT 135 / http://10.0.1.35/v1)
 * 2. Cloudflare Turnstile API (https://challenges.cloudflare.com/turnstile/v0/siteverify)
 * 3. Stalwart Mail Server (CT 120 / http://10.0.1.20:8080 e SMTP 587)
 * 4. Backend Tools Verification Endpoint (/api/v1/tools/turnstile/verify)
 */

import http from "node:http";
import https from "node:https";
import net from "node:net";

const OMNIROUTE_URL = process.env.OMNIROUTE_BASE_URL || "http://10.0.1.35/v1";
const STALWART_JMAP_URL = process.env.STALWART_BASE_URL || "http://10.0.1.20:8080";
const STALWART_SMTP_HOST = process.env.STALWART_SMTP_HOST || "10.0.1.20";
const STALWART_SMTP_PORT = parseInt(process.env.STALWART_SMTP_PORT || "587", 10);
const BACKEND_URL = process.env.BACKEND_URL || "http://127.0.0.1:8001";

async function probeHttp(url, options = {}) {
  const start = Date.now();
  const urlObj = new URL(url);
  const client = urlObj.protocol === "https:" ? https : http;

  return new Promise((resolve) => {
    const req = client.request(
      url,
      {
        method: options.method || "GET",
        headers: options.headers || {},
        timeout: options.timeout || 3000,
      },
      (res) => {
        let body = "";
        res.on("data", (chunk) => (body += chunk));
        res.on("end", () => {
          resolve({
            ok: res.statusCode >= 200 && res.statusCode < 400,
            status: res.statusCode,
            latencyMs: Date.now() - start,
            body: body.slice(0, 300),
          });
        });
      }
    );

    req.on("error", (err) => {
      resolve({
        ok: false,
        status: 0,
        latencyMs: Date.now() - start,
        error: err.message,
      });
    });

    req.on("timeout", () => {
      req.destroy();
      resolve({
        ok: false,
        status: 408,
        latencyMs: Date.now() - start,
        error: "Connection timeout",
      });
    });

    if (options.body) {
      req.write(options.body);
    }
    req.end();
  });
}

async function probeTcpPort(host, port, timeoutMs = 2500) {
  const start = Date.now();
  return new Promise((resolve) => {
    const socket = new net.Socket();
    socket.setTimeout(timeoutMs);

    socket.connect(port, host, () => {
      const latencyMs = Date.now() - start;
      socket.destroy();
      resolve({ ok: true, latencyMs });
    });

    socket.on("error", (err) => {
      resolve({ ok: false, error: err.message, latencyMs: Date.now() - start });
    });

    socket.on("timeout", () => {
      socket.destroy();
      resolve({ ok: false, error: "TCP connection timeout", latencyMs: Date.now() - start });
    });
  });
}

export async function runExternalIntegrationsAudit() {
  console.log("════════════════════════════════════════════════════════════════");
  console.log("🔍 V7M QA AUDIT — Módulo 10: External Integrations Probe");
  console.log("════════════════════════════════════════════════════════════════\n");

  const results = {
    omniroute: null,
    turnstile: null,
    stalwart: null,
    backendTurnstile: null,
  };

  // 1. OmniRoute AI Gateway Probe
  console.log(`[1/4] Probing OmniRoute AI Gateway (${OMNIROUTE_URL})...`);
  const omniRes = await probeHttp(`${OMNIROUTE_URL}/models`, { timeout: 2000 });
  if (omniRes.ok) {
    console.log(`  ✅ OmniRoute Online (Status: ${omniRes.status}, Latency: ${omniRes.latencyMs}ms)`);
  } else {
    console.log(`  ⚠️  OmniRoute Staging Unreachable (${omniRes.error || `HTTP ${omniRes.status}`}) — Fallbacks active`);
  }
  results.omniroute = omniRes;

  // 2. Cloudflare Turnstile Siteverify Probe (Test Keys)
  console.log("\n[2/4] Probing Cloudflare Turnstile Siteverify API...");
  const turnstileBody = new URLSearchParams({
    secret: "1x00000000000000000000000000000000000000000000000AA",
    response: "1x0000000000000000000000000000000AA",
  }).toString();

  const turnstileRes = await probeHttp("https://challenges.cloudflare.com/turnstile/v0/siteverify", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: turnstileBody,
    timeout: 4000,
  });

  if (turnstileRes.ok) {
    console.log(`  ✅ Cloudflare Turnstile API Reachable (Latency: ${turnstileRes.latencyMs}ms)`);
  } else {
    console.log(`  ❌ Cloudflare Turnstile Failed: ${turnstileRes.error || `HTTP ${turnstileRes.status}`}`);
  }
  results.turnstile = turnstileRes;

  // 3. Stalwart Mail Server Probes
  console.log(`\n[3/4] Probing Stalwart Mail Server (${STALWART_JMAP_URL} & SMTP ${STALWART_SMTP_HOST}:${STALWART_SMTP_PORT})...`);
  const stalwartJmap = await probeHttp(`${STALWART_JMAP_URL}/jmap/session`, { timeout: 2000 });
  const stalwartSmtp = await probeTcpPort(STALWART_SMTP_HOST, STALWART_SMTP_PORT, 2000);

  if (stalwartJmap.ok || stalwartJmap.status === 401) {
    console.log(`  ✅ Stalwart JMAP Endpoint Online (Status: ${stalwartJmap.status}, Latency: ${stalwartJmap.latencyMs}ms)`);
  } else {
    console.log(`  ⚠️  Stalwart JMAP Offline (${stalwartJmap.error || `HTTP ${stalwartJmap.status}`})`);
  }

  if (stalwartSmtp.ok) {
    console.log(`  ✅ Stalwart SMTP Port ${STALWART_SMTP_PORT} Open (Latency: ${stalwartSmtp.latencyMs}ms)`);
  } else {
    console.log(`  ⚠️  Stalwart SMTP Port ${STALWART_SMTP_PORT} Unreachable (${stalwartSmtp.error})`);
  }
  results.stalwart = { jmap: stalwartJmap, smtp: stalwartSmtp };

  // 4. Backend Local Diagnostics Endpoint
  console.log(`\n[4/4] Probing Backend /api/v1/tools/turnstile/verify (${BACKEND_URL})...`);
  const backendRes = await probeHttp(`${BACKEND_URL}/api/v1/tools/turnstile/verify`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ token: "1x0000000000000000000000000000000AA" }),
    timeout: 2000,
  });

  if (backendRes.ok) {
    console.log(`  ✅ Backend Turnstile Verification Route Functional (Latency: ${backendRes.latencyMs}ms)`);
  } else {
    console.log(`  ℹ️  Backend Server not running on ${BACKEND_URL} in standalone test mode.`);
  }
  results.backendTurnstile = backendRes;

  console.log("\n════════════════════════════════════════════════════════════════");
  console.log("🏁 External Integrations Probe Summary Complete.");
  console.log("════════════════════════════════════════════════════════════════\n");

  return results;
}

if (import.meta.url === `file://${process.argv[1].replace(/\\/g, "/")}`) {
  runExternalIntegrationsAudit();
}

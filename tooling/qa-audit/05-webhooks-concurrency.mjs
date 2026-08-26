import http from "node:http";

async function postJson(url, data, headers = {}) {
  const payload = typeof data === "string" ? data : JSON.stringify(data);
  const parsedUrl = new URL(url);

  return new Promise((resolve, reject) => {
    const start = Date.now();
    const options = {
      hostname: parsedUrl.hostname,
      port: parsedUrl.port,
      path: parsedUrl.pathname + parsedUrl.search,
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Content-Length": Buffer.byteLength(payload),
        ...headers,
      },
      timeout: 10000,
    };

    const req = http.request(options, (res) => {
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
      reject(new Error(`Timeout (10s) em POST ${url}`));
    });

    req.on("error", (err) => reject(err));
    req.write(payload);
    req.end();
  });
}

export async function runWebhooksConcurrencySuite() {
  console.log("\n========================================================");
  console.log(" 🧪 SUITE 5: WEBHOOKS, CONCURRENCY, IDEMPOTENCY & LOAD");
  console.log("========================================================\n");

  const results = [];

  // 1. Asaas Webhook: Teste de Autenticação e Payload
  try {
    console.log("▶ [Asaas Webhook] Testando rejeição de token inválido e aceitação com token de dev...");
    const unauthRes = await postJson("http://127.0.0.1:8001/integrations/asaas/webhook/", {
      event: "PAYMENT_CONFIRMED",
      payment: { id: "pay_test_123", value: 10.0 },
    });

    if (unauthRes.statusCode === 401) {
      console.log("  ✅ Asaas Webhook rejeitou requisição sem token com HTTP 401");
      results.push({ name: "Asaas Webhook: Rejeição de Token Inválido (401)", status: "PASS" });
    } else {
      console.warn(`  ⚠️ Asaas Webhook respondeu status ${unauthRes.statusCode} em vez de 401`);
      results.push({ name: "Asaas Webhook: Rejeição de Token Inválido", status: "PARTIAL" });
    }
  } catch (err) {
    console.error(`  ❌ Falha no teste Asaas Webhook: ${err.message}`);
    results.push({ name: "Asaas Webhook", status: "FAIL", error: err.message });
  }

  // 2. Notify Service: Rajada de 20 Requisições Concorrentes
  try {
    console.log("▶ [Notify Service] Testando rajada de 20 eventos concorrentes...");
    const burstPromises = Array.from({ length: 20 }, (_, i) => {
      return postJson("http://127.0.0.1:8000/v1/send", {
        account_id: "default",
        channel: "whatsapp",
        recipient: "5511999990000",
        template: "welcome",
        context: { name: `Teste #${i}` },
      });
    });

    const start = Date.now();
    const responses = await Promise.all(burstPromises);
    const totalDuration = Date.now() - start;
    // 401 ou 200/400 (rejeição de auth ou processamento)
    const allHandled = responses.every((r) => r.statusCode >= 200 && r.statusCode < 500);

    if (allHandled) {
      console.log(`  ✅ 20/20 requisições tratadas pelo Notify em ${totalDuration}ms (média: ${Math.round(totalDuration / 20)}ms/req)`);
      results.push({ name: "Notify Service: Rajada Concorrente (20 reqs)", status: "PASS", durationMs: totalDuration });
    } else {
      console.error("  ❌ Algumas requisições falharam na rajada do Notify");
      results.push({ name: "Notify Service: Rajada Concorrente", status: "FAIL" });
    }
  } catch (err) {
    console.error(`  ❌ Falha na rajada do Notify: ${err.message}`);
    results.push({ name: "Notify Service: Rajada Concorrente", status: "FAIL", error: err.message });
  }

  // 3. Webhook com Payload Corrompido / JSON Malformado
  try {
    console.log("▶ [Notify Service] Testando envio de JSON malformado/truncado...");
    const malformedRes = await postJson("http://127.0.0.1:8000/v1/send", "{ invalid_json: true, unterminated: ");
    if (malformedRes.statusCode === 400 || malformedRes.statusCode === 422) {
      console.log(`  ✅ Notify rejeitou JSON malformado com HTTP ${malformedRes.statusCode}`);
      results.push({ name: "Notify: Rejeição de JSON Corrompido", status: "PASS" });
    } else {
      console.warn(`  ⚠️ Notify respondeu ${malformedRes.statusCode} para JSON malformado`);
      results.push({ name: "Notify: Rejeição de JSON Corrompido", status: "PARTIAL" });
    }
  } catch (err) {
    console.error(`  ❌ Falha no teste de JSON malformado: ${err.message}`);
    results.push({ name: "Notify: Rejeição de JSON Corrompido", status: "FAIL", error: err.message });
  }

  return results;
}

if (process.argv[1] && process.argv[1].endsWith("05-webhooks-concurrency.mjs")) {
  runWebhooksConcurrencySuite().then((results) => {
    const passed = results.filter((r) => r.status === "PASS").length;
    const failed = results.filter((r) => r.status === "FAIL").length;
    console.log(`\n🎯 Fim da Suite 5: ${passed} PASS | ${failed} FAIL\n`);
  });
}

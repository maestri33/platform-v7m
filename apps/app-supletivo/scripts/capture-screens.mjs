import { chromium } from "@playwright/test";
import fs from "fs";
import path from "path";

const outDir = path.resolve("./screenshots");
if (!fs.existsSync(outDir)) {
  fs.mkdirSync(outDir, { recursive: true });
}

async function run() {
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({
    viewport: { width: 400, height: 850 },
    deviceScaleFactor: 2,
  });

  const page = await context.newPage();

  // Mock API routes so all screens have realistic rich data
  await page.route("**/api/v1/clients/lead/me", (route) =>
    route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify({
        external_id: "l1",
        status: "pending",
        created_at: "2026-07-20T00:00:00Z",
        customer: { name: "José Carlos de Souza", cpf: "52998224725", email: "jose@gmail.com" },
        promoter: { external_id: "p1" },
        checkout: {
          payment_method: "pix",
          provider: "asaas",
          amount: "988.00",
          is_paid: false,
          url: "https://pagamento.parceiro.com.br/c/VIVA77",
        },
      }),
    }),
  );

  await page.route("**/api/v1/clients/student/me", (route) =>
    route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify({
        status: "awaiting_documents",
        blood_type: null,
        documents: [
          { type: "certificate", applies: true, required: true, validation_status: "approved" },
          { type: "transcript", applies: true, required: true, validation_status: "approved" },
          { type: "address_proof", applies: true, required: true, validation_status: "approved" },
          { type: "id_card", applies: true, required: true, validation_status: "approved" },
          { type: "birth_certificate", applies: true, required: false, validation_status: "not_sent" },
          { type: "military", applies: false, required: false, validation_status: "not_applicable" },
        ],
      }),
    }),
  );

  // 1. Home / Telefone
  await page.goto("http://localhost:3000/");
  await page.waitForTimeout(500);
  await page.screenshot({ path: path.join(outDir, "01-home.png"), fullPage: true });
  console.log("Captured 01-home.png");

  // 2. Login / OTP
  await page.evaluate(() => {
    window.localStorage.setItem(
      "supletivo.session",
      JSON.stringify({ phone: "11999887766", externalId: "3f8b1c2e-0a4d-4f11-9e77-2b6d5c8a1e90" }),
    );
  });
  await page.goto("http://localhost:3000/login");
  await page.waitForTimeout(500);
  await page.screenshot({ path: path.join(outDir, "02-login-otp.png"), fullPage: true });
  console.log("Captured 02-login-otp.png");

  // 3. CPF Screen
  await page.goto("http://localhost:3000/cpf");
  await page.waitForTimeout(500);
  await page.screenshot({ path: path.join(outDir, "03-cpf.png"), fullPage: true });
  console.log("Captured 03-cpf.png");

  // 4. Email Screen
  await page.goto("http://localhost:3000/email");
  await page.waitForTimeout(500);
  await page.screenshot({ path: path.join(outDir, "04-email.png"), fullPage: true });
  console.log("Captured 04-email.png");

  // 5. Planos Screen
  await page.goto("http://localhost:3000/planos");
  await page.waitForTimeout(500);
  await page.screenshot({ path: path.join(outDir, "05-planos.png"), fullPage: true });
  console.log("Captured 05-planos.png");

  // 6. Painel do Lead
  await page.evaluate(() => {
    window.localStorage.setItem(
      "supletivo.login",
      JSON.stringify({ access_token: "mock-token", refresh_token: "mock-refresh", token_type: "bearer" }),
    );
  });
  await page.goto("http://localhost:3000/painel");
  await page.waitForTimeout(500);
  await page.screenshot({ path: path.join(outDir, "06-painel-lead.png"), fullPage: true });
  console.log("Captured 06-painel-lead.png");

  // 7. Matrícula - RG
  await page.evaluate(() => {
    window.localStorage.setItem(
      "supletivo.session",
      JSON.stringify({ phone: "11999887766", externalId: "e1", roles: ["student"] }),
    );
  });
  await page.goto("http://localhost:3000/matricula");
  await page.waitForTimeout(500);
  await page.screenshot({ path: path.join(outDir, "07-matricula.png"), fullPage: true });
  console.log("Captured 07-matricula.png");

  // 8. Portal do Aluno
  await page.goto("http://localhost:3000/aluno");
  await page.waitForTimeout(500);
  await page.screenshot({ path: path.join(outDir, "08-aluno.png"), fullPage: true });
  console.log("Captured 08-aluno.png");

  // 9. Portal de Provas
  await page.route("**/api/v1/clients/student/me", (route) =>
    route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify({
        status: "exam_released",
        blood_type: "O+",
        documents: [],
      }),
    }),
  );
  await page.goto("http://localhost:3000/provas");
  await page.waitForTimeout(500);
  await page.screenshot({ path: path.join(outDir, "09-provas.png"), fullPage: true });
  console.log("Captured 09-provas.png");

  await browser.close();
  console.log("All screenshots captured successfully!");
}

run().catch(console.error);
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

  await context.addInitScript(() => {
    window.localStorage.setItem(
      "supletivo.session",
      JSON.stringify({ phone: "11999887766", externalId: "e1", roles: ["student"] }),
    );
    window.localStorage.setItem(
      "supletivo.login",
      JSON.stringify({ access_token: "mock-token", refresh_token: "mock-refresh", token_type: "bearer" }),
    );
  });

  const page = await context.newPage();

  const MOCK_ENROLLMENT_BASE = {
    external_id: "e1",
    status: "rg",
    profile: { name: "José Carlos de Souza", cpf: "52998224725", birth_date: "1990-05-15", mother_name: "Maria de Souza", marital_status: "single" },
    address: { cep: "01310-100", street: "Av Paulista", number: "1000", complement: "", neighborhood: "Bela Vista", city: "São Paulo", state: "SP", kinship: "self" },
    education: { last_level: "elementary", last_grade: 8, completed: true, school_name: "Escola Estadual", school_state: "SP", school_city: "São Paulo" },
    rg: { number: "12.345.678-9", issuer: "SSP", state: "SP" },
    selfie: { status: "approved" },
  };

  let currentEnrollment = { ...MOCK_ENROLLMENT_BASE };

  await page.route("**/api/v1/clients/enrollment/me", (route) =>
    route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify(currentEnrollment),
    }),
  );

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

  // 1. Matrícula - RG
  currentEnrollment = { ...MOCK_ENROLLMENT_BASE, status: "rg" };
  await page.goto("http://localhost:3000/matricula");
  await page.waitForTimeout(600);
  await page.screenshot({ path: path.join(outDir, "09-matricula-rg.png"), fullPage: true });
  console.log("Captured 09-matricula-rg.png");

  // 2. Matrícula - Address
  currentEnrollment = { ...MOCK_ENROLLMENT_BASE, status: "address" };
  await page.goto("http://localhost:3000/matricula");
  await page.waitForTimeout(600);
  await page.screenshot({ path: path.join(outDir, "10-matricula-address.png"), fullPage: true });
  console.log("Captured 10-matricula-address.png");

  // 3. Matrícula - Education
  currentEnrollment = { ...MOCK_ENROLLMENT_BASE, status: "education" };
  await page.goto("http://localhost:3000/matricula");
  await page.waitForTimeout(600);
  await page.screenshot({ path: path.join(outDir, "11-matricula-education.png"), fullPage: true });
  console.log("Captured 11-matricula-education.png");

  // 4. Matrícula - Selfie
  currentEnrollment = { ...MOCK_ENROLLMENT_BASE, status: "selfie" };
  await page.goto("http://localhost:3000/matricula");
  await page.waitForTimeout(600);
  await page.screenshot({ path: path.join(outDir, "12-matricula-selfie.png"), fullPage: true });
  console.log("Captured 12-matricula-selfie.png");

  // 5. Planos with Pix expanded
  await page.goto("http://localhost:3000/planos");
  await page.waitForTimeout(400);
  await page.getByRole("button", { name: "Escolher Pix" }).click();
  await page.waitForTimeout(400);
  await page.screenshot({ path: path.join(outDir, "06-planos-pix-expanded.png"), fullPage: true });
  console.log("Captured 06-planos-pix-expanded.png");

  await browser.close();
  console.log("All extra screenshots captured!");
}

run().catch(console.error);
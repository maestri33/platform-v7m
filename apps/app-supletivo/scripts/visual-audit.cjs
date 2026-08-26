const { chromium } = require("@playwright/test");
const path = require("path");
const fs = require("fs");

const OUT_DIR = "C:/Users/maestri33/.gemini/antigravity/brain/3e9b6244-eac0-4b3f-8932-16ee9351bf7d/screenshots";
if (!fs.existsSync(OUT_DIR)) {
  fs.mkdirSync(OUT_DIR, { recursive: true });
}

const BASE_URL = "http://localhost:3000";

const ME_PENDING = {
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
};

const STUDENT_DOCS_MOCK = {
  status: "awaiting_documents",
  blood_type: null,
  documents: [
    { type: "certificate", applies: true, required: true, validation_status: "not_sent" },
    { type: "transcript", applies: true, required: true, validation_status: "not_sent" },
    { type: "address_proof", applies: true, required: true, validation_status: "not_sent" },
    { type: "id_card", applies: true, required: true, validation_status: "not_sent" },
    { type: "birth_certificate", applies: true, required: false, validation_status: "not_sent" },
    { type: "military", applies: false, required: false, validation_status: "not_applicable" },
  ],
};

const STUDENT_BLOOD_MOCK = {
  status: "blood_type_pending",
  blood_type: null,
  documents: [
    { type: "certificate", applies: true, required: true, validation_status: "approved" },
    { type: "transcript", applies: true, required: true, validation_status: "approved" },
    { type: "address_proof", applies: true, required: true, validation_status: "approved" },
    { type: "id_card", applies: true, required: true, validation_status: "approved" },
    { type: "birth_certificate", applies: true, required: false, validation_status: "approved" },
    { type: "military", applies: false, required: false, validation_status: "not_applicable" },
  ],
};

const STUDENT_PROVAS_MOCK = {
  status: "exam_released",
  blood_type: "O+",
  documents: [
    { type: "certificate", applies: true, required: true, validation_status: "approved" },
    { type: "transcript", applies: true, required: true, validation_status: "approved" },
    { type: "address_proof", applies: true, required: true, validation_status: "approved" },
    { type: "id_card", applies: true, required: true, validation_status: "approved" },
    { type: "birth_certificate", applies: true, required: false, validation_status: "approved" },
    { type: "military", applies: false, required: false, validation_status: "not_applicable" },
  ],
};

async function capture() {
  console.log("Launching Chromium...");
  const browser = await chromium.launch();

  const viewports = [
    { name: "mobile", width: 390, height: 844, scale: 2 },
    { name: "desktop", width: 1280, height: 850, scale: 1 },
  ];

  for (const vp of viewports) {
    console.log(`Starting capture for ${vp.name}...`);
    const context = await browser.newContext({
      viewport: { width: vp.width, height: vp.height },
      deviceScaleFactor: vp.scale,
    });
    const page = await context.newPage();

    // 1. Home / Phone check
    console.log(`[${vp.name}] 1. Home`);
    await page.goto(`${BASE_URL}/`, { waitUntil: "domcontentloaded" });
    await page.waitForTimeout(500);
    await page.screenshot({ path: path.join(OUT_DIR, `01-${vp.name}-home.png`), fullPage: true });

    // 2. Login / OTP
    console.log(`[${vp.name}] 2. Login`);
    await page.goto(`${BASE_URL}/login`, { waitUntil: "domcontentloaded" });
    await page.waitForTimeout(500);
    await page.screenshot({ path: path.join(OUT_DIR, `02-${vp.name}-login.png`), fullPage: true });

    // 3. CPF (with mock session)
    console.log(`[${vp.name}] 3. CPF`);
    await page.addInitScript(() => {
      window.localStorage.setItem("supletivo.session", JSON.stringify({ phone: "11912345678", externalId: "e1" }));
      window.localStorage.setItem("supletivo.login", JSON.stringify({ access_token: "t", refresh_token: "r", token_type: "bearer" }));
    });
    await page.goto(`${BASE_URL}/cpf`, { waitUntil: "domcontentloaded" });
    await page.waitForTimeout(500);
    await page.screenshot({ path: path.join(OUT_DIR, `03-${vp.name}-cpf.png`), fullPage: true });

    // 4. Email
    console.log(`[${vp.name}] 4. Email`);
    await page.goto(`${BASE_URL}/email`, { waitUntil: "domcontentloaded" });
    await page.waitForTimeout(500);
    await page.screenshot({ path: path.join(OUT_DIR, `04-${vp.name}-email.png`), fullPage: true });

    // 5. Planos
    console.log(`[${vp.name}] 5. Planos`);
    await page.goto(`${BASE_URL}/planos`, { waitUntil: "domcontentloaded" });
    await page.waitForTimeout(500);
    await page.screenshot({ path: path.join(OUT_DIR, `05-${vp.name}-planos.png`), fullPage: true });

    // 6. Painel (with mock lead/me)
    console.log(`[${vp.name}] 6. Painel`);
    await page.route("**/api/v1/clients/lead/me", (route) =>
      route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify(ME_PENDING) })
    );
    await page.goto(`${BASE_URL}/painel`, { waitUntil: "domcontentloaded" });
    await page.waitForTimeout(500);
    await page.screenshot({ path: path.join(OUT_DIR, `06-${vp.name}-painel.png`), fullPage: true });

    // 7. Matrícula - Step 1 RG
    console.log(`[${vp.name}] 7. Matricula`);
    await page.goto(`${BASE_URL}/matricula`, { waitUntil: "domcontentloaded" });
    await page.waitForTimeout(500);
    await page.screenshot({ path: path.join(OUT_DIR, `07-${vp.name}-matricula-rg.png`), fullPage: true });

    // 8. Aluno - Documentos
    console.log(`[${vp.name}] 8. Aluno Docs`);
    await page.route("**/api/v1/clients/student/me", (route) =>
      route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify(STUDENT_DOCS_MOCK) })
    );
    await page.goto(`${BASE_URL}/aluno`, { waitUntil: "domcontentloaded" });
    await page.waitForTimeout(500);
    await page.screenshot({ path: path.join(OUT_DIR, `08-${vp.name}-aluno-docs.png`), fullPage: true });

    // 9. Aluno - Blood Type Pending
    console.log(`[${vp.name}] 9. Aluno Blood`);
    await page.route("**/api/v1/clients/student/me", (route) =>
      route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify(STUDENT_BLOOD_MOCK) })
    );
    await page.goto(`${BASE_URL}/aluno`, { waitUntil: "domcontentloaded" });
    await page.waitForTimeout(500);
    await page.screenshot({ path: path.join(OUT_DIR, `09-${vp.name}-aluno-blood.png`), fullPage: true });

    // 10. Provas - Exam Schedule
    console.log(`[${vp.name}] 10. Provas`);
    await page.route("**/api/v1/clients/student/me", (route) =>
      route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify(STUDENT_PROVAS_MOCK) })
    );
    await page.goto(`${BASE_URL}/provas`, { waitUntil: "domcontentloaded" });
    await page.waitForTimeout(500);
    await page.screenshot({ path: path.join(OUT_DIR, `10-${vp.name}-provas.png`), fullPage: true });

    await context.close();
  }

  await browser.close();
  console.log("All screenshots captured successfully in", OUT_DIR);
}

capture().catch((e) => {
  console.error(e);
  process.exit(1);
});
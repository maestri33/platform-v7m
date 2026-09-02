import { chromium } from "@playwright/test";
import fs from "fs";
import path from "path";

const outDir = path.resolve("./screenshots");

async function run() {
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({
    viewport: { width: 400, height: 850 },
    deviceScaleFactor: 2,
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

  await page.route("**/api/v1/clients/enrollment/me", (route) =>
    route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify(MOCK_ENROLLMENT_BASE),
    }),
  );

  await page.evaluate(() => {
    window.localStorage.setItem(
      "supletivo.session",
      JSON.stringify({ phone: "11999887766", externalId: "e1", roles: ["student"] }),
    );
    window.localStorage.setItem(
      "supletivo.login",
      JSON.stringify({ access_token: "mock-token", refresh_token: "mock-refresh", token_type: "bearer" }),
    );
  });

  // Step 1: RG
  await page.goto("http://localhost:3000/matricula");
  await page.waitForTimeout(600);
  await page.screenshot({ path: path.join(outDir, "07-matricula-rg.png"), fullPage: true });
  console.log("Captured 07-matricula-rg.png");

  // Step 2: Address
  await page.route("**/api/v1/clients/enrollment/me", (route) =>
    route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify({ ...MOCK_ENROLLMENT_BASE, status: "address" }),
    }),
  );
  await page.goto("http://localhost:3000/matricula");
  await page.waitForTimeout(600);
  await page.screenshot({ path: path.join(outDir, "07-matricula-address.png"), fullPage: true });
  console.log("Captured 07-matricula-address.png");

  // Step 3: Education
  await page.route("**/api/v1/clients/enrollment/me", (route) =>
    route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify({ ...MOCK_ENROLLMENT_BASE, status: "education" }),
    }),
  );
  await page.goto("http://localhost:3000/matricula");
  await page.waitForTimeout(600);
  await page.screenshot({ path: path.join(outDir, "07-matricula-education.png"), fullPage: true });
  console.log("Captured 07-matricula-education.png");

  // Step 4: Selfie
  await page.route("**/api/v1/clients/enrollment/me", (route) =>
    route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify({ ...MOCK_ENROLLMENT_BASE, status: "selfie" }),
    }),
  );
  await page.goto("http://localhost:3000/matricula");
  await page.waitForTimeout(600);
  await page.screenshot({ path: path.join(outDir, "07-matricula-selfie.png"), fullPage: true });
  console.log("Captured 07-matricula-selfie.png");

  await browser.close();
}

run().catch(console.error);
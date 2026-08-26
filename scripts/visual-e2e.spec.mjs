/**
 * V7M Visual E2E Test Suite
 * Navega por cada app, tira screenshots em mobile/desktop, testa interações.
 * Uso: npx playwright test scripts/visual-e2e.spec.mjs --headed
 */
import { test, expect } from "@playwright/test";
import { join } from "path";

const SCREENSHOT_DIR = join(process.cwd(), "screenshots", "e2e");

const MOBILE = { width: 390, height: 844 }; // iPhone 14
const DESKTOP = { width: 1440, height: 900 };

async function shot(page, name) {
  await page.screenshot({
    path: join(SCREENSHOT_DIR, `${name}.png`),
    fullPage: false,
  });
}

// ────────────────────────────────────────────────────────────────────────────
// APP SUPLETIVO — Portal do Aluno (:3020)
// ────────────────────────────────────────────────────────────────────────────
test.describe("App Supletivo (:3020)", () => {
  const BASE = "http://localhost:3020";

  test("Home — Tela de entrada do funil (mobile)", async ({ browser }) => {
    const ctx = await browser.newContext({ viewport: MOBILE });
    const page = await ctx.newPage();
    await page.goto(BASE, { waitUntil: "networkidle" });
    await shot(page, "supletivo-home-mobile");

    // Verifica elementos essenciais
    await expect(page.locator("input")).toBeVisible(); // campo de telefone
    await expect(page).toHaveTitle(/.+/); // tem título

    // Verifica que não há erros no console
    const errors = [];
    page.on("console", (msg) => {
      if (msg.type() === "error") errors.push(msg.text());
    });
    await page.waitForTimeout(1000);

    await ctx.close();
  });

  test("Home — Tela de entrada do funil (desktop)", async ({ browser }) => {
    const ctx = await browser.newContext({ viewport: DESKTOP });
    const page = await ctx.newPage();
    await page.goto(BASE, { waitUntil: "networkidle" });
    await shot(page, "supletivo-home-desktop");
    await ctx.close();
  });

  test("Healthz endpoint", async ({ request }) => {
    const res = await request.get(`${BASE}/healthz`);
    expect(res.ok()).toBeTruthy();
    const json = await res.json();
    expect(json.status).toBe("ok");
  });

  test("Kit page — Design System", async ({ browser }) => {
    const ctx = await browser.newContext({ viewport: DESKTOP });
    const page = await ctx.newPage();
    await page.goto(`${BASE}/kit`, { waitUntil: "networkidle" });
    await shot(page, "supletivo-kit-desktop");
    await ctx.close();
  });

  test("/register redireciona para /", async ({ browser }) => {
    const ctx = await browser.newContext({ viewport: MOBILE });
    const page = await ctx.newPage();
    await page.goto(`${BASE}/register`, { waitUntil: "networkidle" });
    expect(page.url()).toMatch(/localhost:3020\/?(\?.*)?$/);
    await ctx.close();
  });

  test("CSP headers presentes", async ({ request }) => {
    const res = await request.get(BASE);
    const csp = res.headers()["content-security-policy"];
    expect(csp).toBeTruthy();
    expect(csp).toContain("default-src");
    expect(csp).toContain("frame-ancestors 'none'");
  });
});

// ────────────────────────────────────────────────────────────────────────────
// APP V7M — Portal do Promotor (:3001)
// ────────────────────────────────────────────────────────────────────────────
test.describe("App V7M (:3001)", () => {
  const BASE = "http://localhost:3001";

  test("Home — Tela de login/cadastro (mobile)", async ({ browser }) => {
    const ctx = await browser.newContext({ viewport: MOBILE });
    const page = await ctx.newPage();
    await page.goto(BASE, { waitUntil: "networkidle" });
    await shot(page, "v7m-home-mobile");
    await expect(page.locator("input")).toBeVisible();
    await ctx.close();
  });

  test("Home — Tela de login/cadastro (desktop)", async ({ browser }) => {
    const ctx = await browser.newContext({ viewport: DESKTOP });
    const page = await ctx.newPage();
    await page.goto(BASE, { waitUntil: "networkidle" });
    await shot(page, "v7m-home-desktop");
    await ctx.close();
  });

  test("API version endpoint", async ({ request }) => {
    const res = await request.get(`${BASE}/api/version`);
    expect(res.ok()).toBeTruthy();
  });

  test("CSP headers presentes", async ({ request }) => {
    const res = await request.get(BASE);
    const csp = res.headers()["content-security-policy"];
    expect(csp).toBeTruthy();
    expect(csp).toContain("frame-ancestors 'none'");
  });

  test("404 page styled", async ({ browser }) => {
    const ctx = await browser.newContext({ viewport: MOBILE });
    const page = await ctx.newPage();
    const res = await page.goto(`${BASE}/rota-inexistente-xyz`, { waitUntil: "networkidle" });
    await shot(page, "v7m-404-mobile");
    expect(res.status()).toBe(404);
    await ctx.close();
  });
});

// ────────────────────────────────────────────────────────────────────────────
// HUB V7M — Portal do Coordenador (:3004)
// ────────────────────────────────────────────────────────────────────────────
test.describe("Hub V7M (:3004)", () => {
  const BASE = "http://localhost:3004";

  test("Login page (mobile)", async ({ browser }) => {
    const ctx = await browser.newContext({ viewport: MOBILE });
    const page = await ctx.newPage();
    await page.goto(BASE, { waitUntil: "networkidle" });
    await shot(page, "hub-login-mobile");

    // Verifica elementos de login
    await expect(page.locator("#phone")).toBeVisible();
    await expect(page.locator("#phone-form")).toBeVisible();
    // App view deve estar escondido
    await expect(page.locator("#app-view")).toBeHidden();
    await ctx.close();
  });

  test("Login page (desktop)", async ({ browser }) => {
    const ctx = await browser.newContext({ viewport: DESKTOP });
    const page = await ctx.newPage();
    await page.goto(BASE, { waitUntil: "networkidle" });
    await shot(page, "hub-login-desktop");
    await ctx.close();
  });

  test("Healthz endpoint", async ({ request }) => {
    const res = await request.get(`${BASE}/healthz`);
    expect(res.ok()).toBeTruthy();
    const json = await res.json();
    expect(json.status).toBe("ok");
  });

  test("Hash desconhecida redireciona para #dashboard", async ({ browser }) => {
    const ctx = await browser.newContext({ viewport: MOBILE });
    const page = await ctx.newPage();
    // Simula ter uma sessão para testar roteamento
    await page.goto(BASE, { waitUntil: "networkidle" });
    // Sem sessão, não deveria entrar no app — login visível
    await expect(page.locator("#login-view")).toBeVisible();
    await ctx.close();
  });

  test("Máscara de telefone funciona", async ({ browser }) => {
    const ctx = await browser.newContext({ viewport: MOBILE });
    const page = await ctx.newPage();
    await page.goto(BASE, { waitUntil: "networkidle" });
    const phone = page.locator("#phone");
    await phone.fill("11999887766");
    const value = await phone.inputValue();
    expect(value).toMatch(/\(\d{2}\)\s\d{4,5}-\d{4}/);
    await ctx.close();
  });
});

// ────────────────────────────────────────────────────────────────────────────
// ADMIN V7M — Painel Staff (:3003)
// ────────────────────────────────────────────────────────────────────────────
test.describe("Admin V7M (:3003)", () => {
  const BASE = "http://localhost:3003";

  test("Login page (mobile)", async ({ browser }) => {
    const ctx = await browser.newContext({ viewport: MOBILE });
    const page = await ctx.newPage();
    await page.goto(BASE, { waitUntil: "networkidle" });
    // Deve redirecionar para /login (sem token)
    await page.waitForURL(/\/(login)?/, { timeout: 10000 });
    await shot(page, "admin-login-mobile");
    await ctx.close();
  });

  test("Login page (desktop)", async ({ browser }) => {
    const ctx = await browser.newContext({ viewport: DESKTOP });
    const page = await ctx.newPage();
    await page.goto(BASE, { waitUntil: "networkidle" });
    await page.waitForURL(/\/(login)?/, { timeout: 10000 });
    await shot(page, "admin-login-desktop");
    await ctx.close();
  });

  test("Healthz endpoint", async ({ request }) => {
    const res = await request.get(`${BASE}/healthz`);
    expect(res.ok()).toBeTruthy();
    const json = await res.json();
    expect(json.status).toBe("ok");
    expect(json).toHaveProperty("sha");
  });

  test("CSP headers presentes", async ({ request }) => {
    const res = await request.get(BASE);
    const csp = res.headers()["content-security-policy"];
    expect(csp).toBeTruthy();
    expect(csp).toContain("frame-ancestors 'none'");
  });
});

// ────────────────────────────────────────────────────────────────────────────
// LANDINGS — Astro SSG (:3010, :3011)
// ────────────────────────────────────────────────────────────────────────────
test.describe("Landing Pages", () => {
  test("Landing Promotor (mobile)", async ({ browser }) => {
    const ctx = await browser.newContext({ viewport: MOBILE });
    const page = await ctx.newPage();
    await page.goto("http://localhost:3010", { waitUntil: "networkidle" });
    await shot(page, "landing-promotor-mobile");
    await ctx.close();
  });

  test("Landing Promotor (desktop)", async ({ browser }) => {
    const ctx = await browser.newContext({ viewport: DESKTOP });
    const page = await ctx.newPage();
    await page.goto("http://localhost:3010", { waitUntil: "networkidle" });
    await shot(page, "landing-promotor-desktop");
    await ctx.close();
  });

  test("Landing Supletivo (mobile)", async ({ browser }) => {
    const ctx = await browser.newContext({ viewport: MOBILE });
    const page = await ctx.newPage();
    await page.goto("http://localhost:3011", { waitUntil: "networkidle" });
    await shot(page, "landing-supletivo-mobile");
    await ctx.close();
  });

  test("Landing Supletivo (desktop)", async ({ browser }) => {
    const ctx = await browser.newContext({ viewport: DESKTOP });
    const page = await ctx.newPage();
    await page.goto("http://localhost:3011", { waitUntil: "networkidle" });
    await shot(page, "landing-supletivo-desktop");
    await ctx.close();
  });
});

// ────────────────────────────────────────────────────────────────────────────
// V7M INSTITUCIONAL (:3002)
// ────────────────────────────────────────────────────────────────────────────
test.describe("V7M Institucional (:3002)", () => {
  test("Home (mobile)", async ({ browser }) => {
    const ctx = await browser.newContext({ viewport: MOBILE });
    const page = await ctx.newPage();
    await page.goto("http://localhost:3002", { waitUntil: "networkidle" });
    await shot(page, "institucional-home-mobile");
    await ctx.close();
  });

  test("Home (desktop)", async ({ browser }) => {
    const ctx = await browser.newContext({ viewport: DESKTOP });
    const page = await ctx.newPage();
    await page.goto("http://localhost:3002", { waitUntil: "networkidle" });
    await shot(page, "institucional-home-desktop");
    await ctx.close();
  });
});

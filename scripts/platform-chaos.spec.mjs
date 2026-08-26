import { test, expect } from "@playwright/test";
import { join } from "path";
import { mkdirSync } from "fs";

const SCREENSHOT_DIR = join(process.cwd(), "screenshots", "audit");
mkdirSync(SCREENSHOT_DIR, { recursive: true });

const VIEWPORTS = {
  mobile: { width: 390, height: 844 },   // iPhone 14
  tablet: { width: 768, height: 1024 },  // iPad
  desktop: { width: 1440, height: 900 }, // Mac/PC Full
};

async function capture(page, name) {
  await page.screenshot({
    path: join(SCREENSHOT_DIR, `${name}.png`),
    fullPage: false,
  });
}

test.describe("Plataforma V7M — Auditoria Visual, Comportamental & Caos E2E", () => {
  // ── 1. HUB V7M (Portal do Coordenador :3004) ───────────────────────────────
  test("Hub V7M: Renderização & Formulário de Acesso (Mobile & Desktop)", async ({ browser }) => {
    for (const [mode, vp] of Object.entries(VIEWPORTS)) {
      const ctx = await browser.newContext({ viewport: vp });
      const page = await ctx.newPage();
      await page.goto("http://localhost:3004", { waitUntil: "networkidle" });
      await capture(page, `hub-login-${mode}`);

      // Validação visual de elementos críticos
      await expect(page.locator("#login-title")).toContainText("Acesso do coordenador");
      await expect(page.locator("#phone")).toBeVisible();
      await expect(page.locator("#phone-form button[type='submit']")).toBeEnabled();

      // Teste de máscara de telefone
      await page.locator("#phone").fill("11999990000");
      expect(await page.locator("#phone").inputValue()).toBe("(11) 99999-0000");

      await ctx.close();
    }
  });

  test("Hub V7M: Comportamento sob Entrada Inválida & Erro Inline", async ({ page }) => {
    await page.goto("http://localhost:3004", { waitUntil: "networkidle" });
    await page.locator("#phone").fill("11999");
    await page.locator("#phone-form button[type='submit']").click();

    // Deve exibir erro amigável
    await expect(page.locator("#login-error")).toBeVisible();
    await expect(page.locator("#login-error")).toContainText("Informe um telefone válido com DDD");
    await capture(page, "hub-invalid-phone-error");
  });

  // ── 2. ADMIN V7M (Cockpit Staff :3003) ────────────────────────────────────
  test("Admin V7M: Tela de Login Staff & Responsividade", async ({ browser }) => {
    for (const [mode, vp] of Object.entries(VIEWPORTS)) {
      const ctx = await browser.newContext({ viewport: vp });
      const page = await ctx.newPage();
      await page.goto("http://localhost:3003/login", { waitUntil: "networkidle" });
      await capture(page, `admin-login-${mode}`);

      await expect(page.getByRole("heading", { name: /Acesso do staff/i })).toBeVisible();
      await expect(page.getByLabel(/Telefone\/WhatsApp/i)).toBeVisible();

      // Validação de overflow horizontal (anti-breakage)
      const scrollWidth = await page.evaluate(() => document.documentElement.scrollWidth);
      const clientWidth = await page.evaluate(() => document.documentElement.clientWidth);
      expect(scrollWidth).toBeLessThanOrEqual(clientWidth + 1);

      await ctx.close();
    }
  });

  // ── 3. APP SUPLETIVO (Portal do Aluno :3020) ──────────────────────────────
  test("App Supletivo: Home & Entrada do Funil do Aluno", async ({ browser }) => {
    for (const [mode, vp] of Object.entries(VIEWPORTS)) {
      const ctx = await browser.newContext({ viewport: vp });
      const page = await ctx.newPage();
      await page.goto("http://localhost:3020", { waitUntil: "networkidle" });
      await capture(page, `supletivo-funnel-home-${mode}`);

      await expect(page.locator("input")).toBeVisible();
      await ctx.close();
    }
  });

  // ── 4. APP V7M (Portal do Promotor :3001) ─────────────────────────────────
  test("App V7M: Entrada CPF-First do Promotor", async ({ browser }) => {
    for (const [mode, vp] of Object.entries(VIEWPORTS)) {
      const ctx = await browser.newContext({ viewport: vp });
      const page = await ctx.newPage();
      await page.goto("http://localhost:3001", { waitUntil: "networkidle" });
      await capture(page, `promotor-login-cpf-${mode}`);

      await expect(page.getByText(/Qual é o seu CPF\?|Promotor V7M/i).first()).toBeVisible();
      await ctx.close();
    }
  });

  test("App V7M: Validação de CPF Inválido no Formulário", async ({ page }) => {
    await page.goto("http://localhost:3001", { waitUntil: "networkidle" });
    const cpfInput = page.locator("#auth-cpf, input[type='text']").first();
    await cpfInput.fill("123.456.789-00");
    await page.getByRole("button", { name: /Continuar/i }).click();

    // Deve exibir alerta de validação de CPF inválido
    await expect(page.getByRole("alert")).toBeVisible();
    await capture(page, "promotor-cpf-invalid-alert");
  });

  // ── 5. LANDINGS & INSTITUCIONAL (:3010, :3011, :3002) ─────────────────────
  test("Landing Promotor (:3010) & Landing Supletivo (:3011) Visuais", async ({ browser }) => {
    const ctx = await browser.newContext({ viewport: VIEWPORTS.desktop });
    const page = await ctx.newPage();

    await page.goto("http://localhost:3010", { waitUntil: "networkidle" });
    await capture(page, "landing-promotor-desktop");
    await expect(page).toHaveTitle(/.+/);

    await page.goto("http://localhost:3011", { waitUntil: "networkidle" });
    await capture(page, "landing-supletivo-desktop");
    await expect(page).toHaveTitle(/.+/);

    await page.goto("http://localhost:3002", { waitUntil: "networkidle" });
    await capture(page, "institucional-home-desktop");
    await expect(page).toHaveTitle(/.+/);

    await ctx.close();
  });
});

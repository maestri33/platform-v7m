import { test, expect } from "@playwright/test";

// spec: specs/admin-coverage.plan.md
// seed: tests/e2e/seed.spec.ts

test.describe("7. Setup Inicial da Plataforma (First-Run Wizard)", () => {
  test.beforeEach(async ({ page, context }) => {
    // Garante que não há sessão residual de staff nos cookies ou localStorage
    await context.clearCookies();
    await page.addInitScript(() => {
      window.localStorage.clear();
      window.sessionStorage.clear();
    });

    // Configura mock simulando plataforma NÃO inicializada (bootstrapped: false)
    await page.route("**/api/**", async (route) => {
      const url = route.request().url();

      if (url.includes("/staff/bootstrap/status")) {
        return route.fulfill({
          status: 200,
          contentType: "application/json",
          body: JSON.stringify({
            bootstrapped: false,
            setup_required: true,
          }),
        });
      }

      if (url.includes("/staff/system") || url.includes("/healthz")) {
        return route.fulfill({
          status: 200,
          contentType: "application/json",
          body: JSON.stringify({
            ok: true,
            bootstrapped: false,
            version: "1.0.0",
          }),
        });
      }

      return route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({}),
      });
    });
  });

  test("7.1 Renderização do Wizard de Setup Inicial", async ({ page }) => {
    await page.goto("/setup");

    // Valida título e indicador First Run
    await expect(page.getByRole("heading", { name: "Setup Inicial da Plataforma" })).toBeVisible({ timeout: 15_000 });
    await expect(page.getByText("Configure a conta-mãe do administrador")).toBeVisible();

    // Valida o primeiro passo (1. Conta Master)
    await expect(page.getByRole("heading", { name: "1. Conta Master" })).toBeVisible();
    await expect(page.getByRole("button", { name: "Avançar →" })).toBeVisible();
  });

  test("7.2 Validação de Campos Obrigatórios no Setup", async ({ page }) => {
    await page.goto("/setup");
    await expect(page.getByRole("heading", { name: "Setup Inicial da Plataforma" })).toBeVisible({ timeout: 15_000 });

    // Tenta avançar sem preencher a senha master obrigatória
    const nextBtn = page.getByRole("button", { name: "Avançar →" });
    await nextBtn.click();

    // Valida mensagem de validação
    await expect(
      page.getByText("Defina uma senha master de contingência com pelo menos 4 caracteres."),
    ).toBeVisible();
  });

  test("7.3 Validação de Confirmação de Senha Idêntica", async ({ page }) => {
    await page.goto("/setup");
    await expect(page.getByRole("heading", { name: "Setup Inicial da Plataforma" })).toBeVisible({ timeout: 15_000 });

    // Digita senhas diferentes
    await page.getByRole("textbox", { name: "Senha Master de Contingência" }).fill("master123");
    await page.getByRole("textbox", { name: "Confirmar Senha Master" }).fill("diferente456");

    const nextBtn = page.getByRole("button", { name: "Avançar →" });
    await nextBtn.click();

    // Valida que exibe erro de senhas não coincidem
    await expect(
      page.getByText("As senhas não coincidem. Digite a mesma senha no campo de confirmação."),
    ).toBeVisible();

    // Corrige para senhas idênticas e avança
    await page.getByRole("textbox", { name: "Confirmar Senha Master" }).fill("master123");
    await nextBtn.click();

    // Valida que avançou para o Passo 2
    await expect(page.getByRole("heading", { name: "2. Preços do Curso & Bolsa do Promotor Estudante" })).toBeVisible();
  });
});

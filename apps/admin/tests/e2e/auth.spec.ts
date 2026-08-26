import { test, expect } from "@playwright/test";
import { setupApiMocks } from "./helpers/mock-api";

// spec: specs/admin-coverage.plan.md
// seed: tests/e2e/seed.spec.ts

test.describe("1. Autenticação e Guards de Acesso", () => {
  test.beforeEach(async ({ page }) => {
    await setupApiMocks(page);
  });

  test("1.1 Redirecionamento automático quando desautenticado", async ({ page }) => {
    // 1. Navegar diretamente para /dashboard sem token
    await page.goto("/dashboard");

    // 2. Verificar que o guard redireciona para /login
    await expect(page).toHaveURL(/.*login/);
    await expect(page.getByRole("heading", { name: "Acesso do staff" })).toBeVisible();
    await expect(page.getByRole("button", { name: "Enviar código" })).toBeVisible();
  });

  test("1.2 Fluxo de Login do Staff em 2 passos (Telefone → OTP)", async ({ page }) => {
    // 1. Navegar para /login
    await page.goto("/login");
    await expect(page.getByRole("heading", { name: "Acesso do staff" })).toBeVisible();

    // 2. Preencher telefone válido
    const phoneInput = page.getByRole("textbox", { name: /telefone/i });
    await phoneInput.fill("11999999999");

    // 3. Clicar em Enviar código
    const sendButton = page.getByRole("button", { name: "Enviar código" });
    await expect(sendButton).toBeEnabled();
    await sendButton.click();

    // 4. Verificar transição para tela de confirmação de código
    await expect(page.getByRole("heading", { name: "Confirme o código" })).toBeVisible();
    await expect(page.getByText("Mandei um código pro WhatsApp")).toBeVisible();

    // 5. Preenche os 6 dígitos do OTP diretamente no primeiro input (ativa distribute)
    const firstOtpInput = page.locator("input[inputmode='numeric']").first();
    await expect(firstOtpInput).toBeVisible();
    await firstOtpInput.fill("123456");

    // 6. Clica em Entrar se não auto-submeteu
    const loginButton = page.getByRole("button", { name: "Entrar", exact: true });
    if (await loginButton.isEnabled()) {
      await loginButton.click().catch(() => {});
    }

    // 7. Deve autenticar e redirecionar para o dashboard
    await expect(page).toHaveURL(/.*dashboard/, { timeout: 15_000 });
  });

  test("1.3 Acesso negado para usuário não-staff (403 NOT_STAFF)", async ({ page }) => {
    await page.goto("/login?denied=1");

    await expect(
      page.getByText(/Esse acesso é restrito ao staff|Sua conta não tem permissão de administrador/i),
    ).toBeVisible();
    await expect(page).toHaveURL(/.*login.*/);
  });

  test("1.4 Fluxo de Login de Contingência com Senha Master", async ({ page }) => {
    await page.goto("/login");

    // Alterna para o modo de Senha Master
    const toggleButton = page.getByRole("button", { name: /Entrar com Senha Master/i });
    await expect(toggleButton).toBeVisible();
    await toggleButton.click();

    await expect(page.getByRole("heading", { name: "Acesso com Senha Master" })).toBeVisible();

    // Preenche credenciais master
    await page.getByRole("textbox", { name: /E-mail, Telefone ou CPF/i }).fill("admin@v7m.org");
    await page.getByLabel(/Senha Master/i).fill("senha_master_secreta");

    // Submete o login
    const loginButton = page.getByRole("button", { name: "Entrar com Senha Master" });
    await loginButton.click();

    // Deve autenticar e redirecionar para o dashboard
    await expect(page).toHaveURL(/.*dashboard/, { timeout: 15_000 });
  });
});

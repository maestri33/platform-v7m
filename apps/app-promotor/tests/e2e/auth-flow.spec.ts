import { test, expect } from "@playwright/test";

test.describe("Autenticação & Entrada OTP", () => {
  test.beforeEach(async ({ request }) => {
    await request.post("http://127.0.0.1:8765/__reset");
  });

  test("Login com OTP válido e redirecionamento para o painel", async ({ page }) => {
    // 1. Navegar para a página inicial '/'
    await page.goto("/");
    await expect(page.locator("body")).toBeVisible();

    // 2. Informar CPF válido e clicar em Continuar
    await page.locator("#auth-cpf, #auth-phone, input").first().fill("52998224725");
    await page.getByRole("button", { name: /continuar/i }).click();

    // 3. Preencher o código '000000' e clicar em Entrar
    await expect(page.getByLabel(/código de 6 dígitos/i)).toBeVisible();
    await page.getByLabel(/código de 6 dígitos/i).fill("000000");
    await page.getByRole("button", { name: /entrar/i }).click();

    // Deve redirecionar após autenticação
    await expect(page).toHaveURL(/\/(painel|documento|continuar)/);
  });
});

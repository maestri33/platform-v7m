import { test, expect } from "@playwright/test";

test.describe("Painel do Promotor · BlocksBanner", () => {
  test.beforeEach(async ({ request, page }) => {
    await request.post("http://127.0.0.1:8765/__reset");
    await request.post("http://127.0.0.1:8765/__promote");

    // Autentica o promotor com CPF válido
    await page.goto("/");
    await page.locator("#auth-cpf, #auth-phone, input").first().fill("52998224725");
    await page.getByRole("button", { name: /continuar/i }).click();
    await page.getByLabel(/código de 6 dígitos/i).fill("000000");
    await page.getByRole("button", { name: /entrar/i }).click();
    await expect(page).toHaveURL(/\/painel/);
  });

  test("Exibição de BlocksBanner sem travar o aplicativo", async ({ request, page }) => {
    // Injeta bloco de validação no mock backend
    await request.post("http://127.0.0.1:8765/__blocks");

    await page.goto("/painel");

    // O banner deve ser exibido com título, descrição e link de ação
    await expect(page.getByRole("complementary", { name: /avisos de validação de cadastro/i })).toBeVisible();
    await expect(page.getByText(/foto do rg ilegível/i)).toBeVisible();
    await expect(page.getByRole("link", { name: /reenviar rg/i })).toBeVisible();

    // O restante do app continua completamente utilizável (ex: link de indicação ativo)
    await expect(page.getByText(/seu link de indicação/i)).toBeVisible();
  });
});

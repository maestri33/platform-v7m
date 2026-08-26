import { test, expect } from "@playwright/test";

test.describe("Comissões & Diagnóstico Pix", () => {
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

  test("Exibição das 3 métricas de ganhos e abertura do diagnóstico Pix", async ({ page }) => {
    // 1. Navegar para a página de comissões
    await page.goto("/comissoes");
    await expect(page).toHaveURL(/\/comissoes/);

    // 2. Verificar as 3 colunas de ganhos
    await expect(page.getByText(/acumulado recebido/i)).toBeVisible();
    await expect(page.getByText(/sai na sexta/i)).toBeVisible();
    await expect(page.getByText(/bloqueado por validação/i)).toBeVisible();

    // 3. Abrir o diagnóstico Pix
    const diagBtn = page.getByRole("button", { name: /diagnóstico/i });
    await expect(diagBtn).toBeVisible();
    await diagBtn.click();

    // 4. A gaveta de diagnóstico deve exibir os detalhes
    await expect(page.getByRole("dialog", { name: /diagnóstico de repasse pix/i })).toBeVisible();
    await expect(page.getByText(/status do seu repasse pix/i)).toBeVisible();
    await expect(page.getByText(/como funciona o fechamento/i)).toBeVisible();
    await expect(page.getByText(/chave pix cadastrada/i)).toBeVisible();

    // 5. Fechar diagnóstico
    await page.getByRole("button", { name: /entendido/i }).click();
    await expect(page.getByRole("dialog", { name: /diagnóstico de repasse pix/i })).toHaveCount(0);
  });
});

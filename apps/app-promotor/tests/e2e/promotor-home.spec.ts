import { test, expect } from "@playwright/test";

/**
 * Spec: specs/promotor-home.md
 * Gerado por: playwright-test-generator
 * Validado por: playwright-test-healer
 */
test.describe("Promotor Home & Central de Vendas", () => {
  test.beforeEach(async ({ request, page }) => {
    await request.post("http://127.0.0.1:8765/__reset");
    await request.post("http://127.0.0.1:8765/__promote");

    // Autentica o promotor com CPF de teste
    await page.goto("/");
    await page.locator("#auth-cpf, #auth-phone, input").first().fill("52998224725");
    await page.getByRole("button", { name: /continuar/i }).click();
    await page.getByLabel(/código de 6 dígitos/i).fill("000000");
    await page.getByRole("button", { name: /entrar/i }).click();
    await expect(page).toHaveURL(/\/painel/, { timeout: 15_000 });
  });

  test("TC-PROMOTOR-001: Visualização do link de indicação, QR Code e templates WhatsApp", async ({ page }) => {
    // 1. O painel deve carregar com saudação, meta e link de indicação
    await expect(page.getByRole("heading", { name: /olá,/i })).toBeVisible();
    await expect(page.getByText(/seu link de indicação/i)).toBeVisible();

    // 2. Abrir o modal de QR Code
    const qrBtn = page.getByRole("button", { name: /qr code/i });
    await expect(qrBtn).toBeVisible();
    await qrBtn.click();

    // 3. O modal deve exibir o QR code e botão de cópia
    const dialog = page.getByRole("dialog", { name: /qr code/i });
    await expect(dialog).toBeVisible();
    await expect(dialog.getByRole("button", { name: "Copiar link" })).toBeVisible();

    // 4. Fechar o modal
    await dialog.getByRole("button", { name: /fechar/i }).click();
    await expect(page.getByRole("dialog", { name: /qr code/i })).toHaveCount(0);

    // 5. Trocar modelo de mensagem para WhatsApp
    const trocarModeloBtn = page.getByText(/trocar modelo/i);
    await expect(trocarModeloBtn).toBeVisible();
    await trocarModeloBtn.click();

    // Deve exibir as opções de template
    await expect(page.getByRole("button", { name: /bolsa & oportunidade/i })).toBeVisible();
    await page.getByRole("button", { name: /bolsa & oportunidade/i }).click();

    // Template selecionado deve ser atualizado na interface
    await expect(page.getByText(/Bolsa & Oportunidade/i)).toBeVisible();
  });
});

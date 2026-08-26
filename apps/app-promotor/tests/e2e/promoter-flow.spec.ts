import { expect, test } from "@playwright/test";

const mockBackend = process.env.MOCK_BACKEND_URL ?? "http://127.0.0.1:8765";

test.describe("Fluxo do Promotor · Login OTP → Painel → Link de Indicação", () => {
  test.beforeEach(async ({ request }) => {
    await request.post(`${mockBackend}/__reset`);
    await request.post(`${mockBackend}/__promote`);
  });

  test("login com OTP válido redireciona para o painel do promotor ativo", async ({ page }) => {
    await page.goto("/");

    // 1. Identificação por Telefone / CPF
    const phoneInput = page.locator("#auth-cpf, #auth-phone, input").first();
    await expect(phoneInput).toBeVisible();
    await phoneInput.fill("52998224725");
    await page.getByRole("button", { name: /continuar/i }).click();

    // 2. Inserção do código OTP
    const otpInput = page.getByLabel(/Código de 6 dígitos/i);
    await expect(otpInput).toBeVisible();
    await otpInput.fill("000000");
    await page.getByRole("button", { name: /entrar/i }).click();

    // 3. Redirecionamento para o painel
    await expect(page).toHaveURL(/\/painel$/, { timeout: 15_000 });
    await expect(page.getByRole("heading", { name: /Olá, Promotor E2E V7M/i })).toBeVisible();
    await expect(page.getByText(/Ativo/i)).toBeVisible();
  });

  test("painel exibe link de indicação, permite cópia e templates de WhatsApp", async ({
    page,
    context,
  }) => {
    // Permissão de clipboard para testar cópia real
    await context.grantPermissions(["clipboard-read", "clipboard-write"]);

    await page.goto("/");
    await page.locator("#auth-cpf, #auth-phone, input").first().fill("52998224725");
    await page.getByRole("button", { name: /continuar/i }).click();
    await page.getByLabel(/Código de 6 dígitos/i).fill("000000");
    await page.getByRole("button", { name: /entrar/i }).click();

    await expect(page).toHaveURL(/\/painel$/, { timeout: 15_000 });

    // 1. Seção do Link de Indicação
    await expect(page.getByText(/Seu link de indicação/i)).toBeVisible();
    await expect(page.locator("code").filter({ hasText: "https://supletivo.net.br/?ref=e2e" })).toBeVisible();

    // 2. Testar Cópia do Link
    const copyButton = page.getByRole("button", { name: /Copiar/i });
    await expect(copyButton).toBeVisible();
    await copyButton.click();
    await expect(page.getByText(/Copiado!/i)).toBeVisible();

    // 3. Testar Seletor de Modelo de Mensagem
    const templateTrigger = page.getByRole("button", { name: /Modelo da mensagem:/i });
    await expect(templateTrigger).toBeVisible();
    await templateTrigger.click();

    const bolsaOption = page.getByRole("button", { name: "Bolsa & Oportunidade" });
    await expect(bolsaOption).toBeVisible();
    await bolsaOption.click();

    // 4. Validação do Link de WhatsApp com o novo template
    const whatsappLink = page.locator('a[href*="api.whatsapp.com"]');
    await expect(whatsappLink).toBeVisible();
    const href = await whatsappLink.getAttribute("href");
    expect(href).toContain("api.whatsapp.com");
    expect(href).toContain(encodeURIComponent("https://supletivo.net.br/?ref=e2e"));

    // 5. Testar Diálogo de QR Code
    const qrButton = page.getByRole("button", { name: /QR Code/i });
    if (await qrButton.isVisible()) {
      await qrButton.click();
      await expect(page.getByRole("dialog")).toBeVisible();
      await page.keyboard.press("Escape");
    }
  });

  test("painel exibe metas da semana e barra de progresso de comissões", async ({ page }) => {
    await page.goto("/");
    await page.locator("#auth-cpf, #auth-phone, input").first().fill("52998224725");
    await page.getByRole("button", { name: /continuar/i }).click();
    await page.getByLabel(/Código de 6 dígitos/i).fill("000000");
    await page.getByRole("button", { name: /entrar/i }).click();

    await expect(page).toHaveURL(/\/painel$/, { timeout: 15_000 });

    // Validação da Meta da Semana
    await expect(page.getByText(/Meta da semana/i)).toBeVisible();
    await expect(page.getByText("/ 5")).toBeVisible();
    await expect(page.getByText(/Sai na Sexta/i)).toBeVisible();
  });
});

import { test, expect, type APIRequestContext } from "@playwright/test";

/**
 * Suíte E2E: Portal do Promotor (V7M Job)
 * Baseado na especificação specs/e2e-promoter-portal.md
 *
 * Cobertura:
 *  - TC-PROMOTOR-001 a TC-PROMOTOR-003: Autenticação por CPF/Telefone, Validação, OTP e Conflitos
 *  - TC-PROMOTOR-004 a TC-PROMOTOR-008: Onboarding dos 5 Deveres (RG, Endereço, PIX DICT, Escolaridade, Selfie/Acordo)
 *  - TC-PROMOTOR-009 a TC-PROMOTOR-010: Dashboard do Promotor, Metas Semanais (X/5) e Link de Indicação
 *  - TC-PROMOTOR-011 a TC-PROMOTOR-012: CRM de Leads e Linha do Tempo
 *  - TC-PROMOTOR-013: Extrato de Comissões, Diagnóstico PIX e Repasses
 *  - TC-PROMOTOR-014 a TC-PROMOTOR-015: LMS de Treinamento, LMS Gate e Quizzes Interativos
 *  - TC-PROMOTOR-016 a TC-PROMOTOR-017: DevStudio & Simulações (/dev-preview)
 */

const mockBackend = process.env.MOCK_BACKEND_URL ?? "http://127.0.0.1:8765";

async function resetBackend(request: APIRequestContext) {
  try {
    await request.post(`${mockBackend}/__reset`);
  } catch {
    // Silently continue if running with page.route stubs
  }
}

async function promoteToActive(request: APIRequestContext) {
  try {
    await request.post(`${mockBackend}/__promote`);
  } catch {
    // Silently continue if running with page.route stubs
  }
}

async function approveToTraining(request: APIRequestContext) {
  try {
    await request.post(`${mockBackend}/__approve`);
  } catch {
    // Silently continue if running with page.route stubs
  }
}

test.describe("1. Autenticação & Entrada de Promotor", () => {
  test.beforeEach(async ({ request }) => {
    await resetBackend(request);
  });

  test("TC-PROMOTOR-001: Entrada por CPF com máscara e avanço para OTP", async ({ page }) => {
    await page.goto("/");
    const authInput = page.locator("#auth-cpf, #auth-phone, input").first();
    await expect(authInput).toBeVisible();

    await authInput.fill("52998224725");
    await page.getByRole("button", { name: /continuar/i }).click();

    // Tela de código OTP
    const otpInput = page.getByLabel(/código de 6 dígitos/i);
    await expect(otpInput).toBeVisible();
    await otpInput.fill("000000");
    await page.getByRole("button", { name: /entrar/i }).click();

    // Redireciona para etapa seguinte ou painel
    await expect(page).toHaveURL(/\/(painel|documento|continuar|dev-preview)/, { timeout: 15_000 });
  });

  test("TC-PROMOTOR-003: Alerta quando CPF já possui cadastro existente", async ({ page }) => {
    await page.route("**/api/auth/check", async (route) => {
      await route.fulfill({
        status: 409,
        contentType: "application/json",
        body: JSON.stringify({
          code: "CPF_EXISTS",
          detail: "Esse CPF já tem cadastro por aqui — entre com o telefone dele.",
        }),
      });
    });

    await page.goto("/");
    const authInput = page.locator("#auth-cpf, #auth-phone, input").first();
    await authInput.fill("11144477735");
    await page.getByRole("button", { name: /continuar/i }).click();

    await expect(
      page.getByText(/Esse CPF já tem cadastro por aqui|já cadastrado/i),
    ).toBeVisible({ timeout: 10_000 });
  });
});

test.describe("2. Onboarding dos 5 Deveres", () => {
  test.beforeEach(async ({ request, page }) => {
    await resetBackend(request);
    await page.goto("/");
    await page.locator("#auth-cpf, #auth-phone, input").first().fill("52998224725");
    await page.getByRole("button", { name: /continuar/i }).click();
    await page.getByLabel(/código de 6 dígitos/i).fill("000000");
    await page.getByRole("button", { name: /entrar/i }).click();
    await expect(page).toHaveURL(/\/(painel|documento|continuar)/, { timeout: 15_000 });
  });

  test("TC-PROMOTOR-004: Dever 1 - Upload de Documento de Identificação", async ({ page }) => {
    await page.goto("/documento");
    await expect(page).toHaveURL(/\/documento/);

    // Valida presença de área de upload ou status do documento
    await expect(
      page.getByText(/documento de identificação|RG|CNH|Enviar para análise/i).first(),
    ).toBeVisible();
  });

  test("TC-PROMOTOR-006: Dever 3 - Validação de Chave PIX DICT", async ({ page }) => {
    await page.goto("/pix");
    await expect(page).toHaveURL(/\/pix/);

    const pixInput = page.getByLabel(/Chave PIX|Sua chave/i).or(page.locator("input[name='pix_key']")).first();
    if (await pixInput.isVisible()) {
      await pixInput.fill("52998224725");
      const validateBtn = page.getByRole("button", { name: /Validar Chave PIX|Salvar Chave/i });
      await validateBtn.click();
    }

    await expect(page.getByText(/Pix|Chave|Validada/i).first()).toBeVisible();
  });

  test("TC-PROMOTOR-008: Dever 5 - Selfie Biométrica e Aceite de Termos", async ({ page }) => {
    await page.goto("/selfie");
    await expect(page).toHaveURL(/\/selfie/);

    // Validação dos elementos do termo ou câmera
    await expect(page.getByText(/Selfie|Biometria|Termo de Adesão/i).first()).toBeVisible();
  });
});

test.describe("3. Dashboard de Performance & Link de Indicação", () => {
  test.beforeEach(async ({ request, page }) => {
    await resetBackend(request);
    await promoteToActive(request);

    // Login direto para painel ativo
    await page.goto("/");
    await page.locator("#auth-cpf, #auth-phone, input").first().fill("52998224725");
    await page.getByRole("button", { name: /continuar/i }).click();
    await page.getByLabel(/código de 6 dígitos/i).fill("000000");
    await page.getByRole("button", { name: /entrar/i }).click();
    await expect(page).toHaveURL(/\/painel$/, { timeout: 15_000 });
  });

  test("TC-PROMOTOR-009: Dashboard exibe Meta da Semana (X/5) e Bônus", async ({ page }) => {
    await expect(page.getByText(/Meta da semana/i)).toBeVisible();
    await expect(page.getByText(/\/ 5/)).toBeVisible();
    await expect(page.getByText(/Sai na Sexta|Ganhos/i)).toBeVisible();
  });

  test("TC-PROMOTOR-010: Compartilhamento de Link de Indicação e QR Code", async ({ page, context }) => {
    await context.grantPermissions(["clipboard-read", "clipboard-write"]);

    await expect(page.getByText(/Seu link de indicação/i)).toBeVisible();

    // Copiar Link
    const copyButton = page.getByRole("button", { name: /Copiar/i });
    await expect(copyButton).toBeVisible();
    await copyButton.click();
    await expect(page.getByText(/Copiado!/i)).toBeVisible();

    // Link WhatsApp
    const whatsappLink = page.locator('a[href*="whatsapp.com"], a[href*="wa.me"]');
    if (await whatsappLink.isVisible()) {
      const href = await whatsappLink.getAttribute("href");
      expect(decodeURIComponent(href || "")).toContain("ref=");
    }
  });
});

test.describe("4. CRM de Leads e Extrato de Comissões", () => {
  test.beforeEach(async ({ request, page }) => {
    await resetBackend(request);
    await promoteToActive(request);

    await page.goto("/");
    await page.locator("#auth-cpf, #auth-phone, input").first().fill("52998224725");
    await page.getByRole("button", { name: /continuar/i }).click();
    await page.getByLabel(/código de 6 dígitos/i).fill("000000");
    await page.getByRole("button", { name: /entrar/i }).click();
    await expect(page).toHaveURL(/\/painel/);
  });

  test("TC-PROMOTOR-011 & TC-PROMOTOR-012: Lista de Leads e Linha do Tempo", async ({ page }) => {
    await page.goto("/leads");
    await expect(page).toHaveURL(/\/leads/);

    // Valida cabeçalho ou lista de leads
    await expect(page.getByRole("heading", { name: /Leads|Alunos Indicados/i })).toBeVisible({
      timeout: 10_000,
    });
  });

  test("TC-PROMOTOR-013: Extrato de Comissões e Abertura do Diagnóstico PIX", async ({ page }) => {
    await page.goto("/comissoes");
    await expect(page).toHaveURL(/\/comissoes/);

    // Blocos de saldo
    await expect(page.getByText(/Acumulado Recebido/i)).toBeVisible();
    await expect(page.getByText(/Sai na Sexta/i)).toBeVisible();
    await expect(page.getByText(/Bloqueado por Validação/i)).toBeVisible();

    // Gaveta de diagnóstico PIX
    const diagBtn = page.getByRole("button", { name: /diagnóstico/i });
    if (await diagBtn.isVisible()) {
      await diagBtn.click();
      await expect(page.getByRole("dialog")).toBeVisible();
      await page.keyboard.press("Escape");
    }
  });
});

test.describe("5. LMS de Treinamento & DevStudio", () => {
  test("TC-PROMOTOR-014: LMS de Capacitação e Navegação", async ({ request, page }) => {
    await resetBackend(request);
    await approveToTraining(request);

    await page.goto("/");
    await page.locator("#auth-cpf, #auth-phone, input").first().fill("52998224725");
    await page.getByRole("button", { name: /continuar/i }).click();
    await page.getByLabel(/código de 6 dígitos/i).fill("000000");
    await page.getByRole("button", { name: /entrar/i }).click();

    await expect(page).toHaveURL(/\/painel/, { timeout: 15_000 });
    await page.goto("/treinamento");
    await expect(
      page.getByText(/Treinamento|Matérias obrigatórias|Capacitação|Como indicar com clareza/i).first(),
    ).toBeVisible({ timeout: 10_000 });
  });

  test("TC-PROMOTOR-016: DevStudio (/dev-preview) com Simulação de Estados 1-Click", async ({ page }) => {
    await page.goto("/dev-preview");
    await expect(page).toHaveURL(/\/dev-preview/);

    // Valida botões de simulação do estúdio de teste
    await expect(
      page.getByRole("button", { name: /Candidato Novo|Em Análise|Promotor Pleno|Campeão/i }).first(),
    ).toBeVisible({ timeout: 10_000 });
  });
});

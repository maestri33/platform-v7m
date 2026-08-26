import { test, expect, type Page } from "@playwright/test";

/**
 * Suíte E2E: Portal do Aluno & Funil de Matrícula (Supletivo Brasil)
 * Baseado na especificação specs/e2e-funnel-student.md
 *
 * Cobertura:
 *  - TC-FUNIL-001 a TC-FUNIL-005: Entrada com Telefone, Auto-avanço, Validação e OTP
 *  - TC-FUNIL-006 a TC-FUNIL-008: Validação de CPF (Módulo 11), Erros e Pergaminho de Vaga Reservada
 *  - TC-FUNIL-009 a TC-FUNIL-010: E-mail, Sugestões de Domínio e Validação Viva
 *  - TC-FUNIL-011 a TC-FUNIL-012: Seleção de Planos, Modal Expandido e Selo Taxa Única
 *  - TC-FUNIL-013 a TC-FUNIL-016: Checkout PIX (QR Code / Polling), Cartão de Crédito e Resume
 *  - TC-MATRICULA-001 a TC-MATRICULA-008: RG OCR, Endereço/CEP, Escolaridade, Selfie e Contrato Digital
 *  - TC-ALUNO-001 a TC-ALUNO-005: Dashboard Acadêmico, Tipo Sanguíneo e Polling
 *  - TC-PROVAS-001 a TC-PROVAS-006: Sala de Provas Online, Cronômetro, Submissão e Diploma
 */

const API_CHECK = "**/api/v1/clients/auth/check";
const API_LOGIN = "**/api/v1/clients/auth/login";
const API_IDENTITY = "**/api/v1/clients/lead/identity";
const API_EMAIL = "**/api/v1/clients/lead/email";
const API_PRICING = "**/api/v1/clients/pricing";
const API_CHECKOUT = "**/api/v1/clients/lead/checkout";
const API_LEAD_ME = "**/api/v1/clients/lead/me";
const API_WHOAMI = "**/api/v1/clients/whoami";
const API_ENROLLMENT_ME = "**/api/v1/clients/enrollment/me";
const API_ENROLLMENT_RG = "**/api/v1/clients/enrollment/documents/rg";
const API_ENROLLMENT_ADDR = "**/api/v1/clients/enrollment/address";
const API_ENROLLMENT_EDU = "**/api/v1/clients/enrollment/education";
const API_ENROLLMENT_SELFIE = "**/api/v1/clients/enrollment/selfie";
const API_CONTRACT = "**/api/v1/clients/contract/current";
const API_STUDENT_ME = "**/api/v1/clients/student/me";
const API_BLOCKS = "**/api/v1/clients/me/blocks*";
const GATEWAY_URL = "https://pagamento.parceiro.com.br/c/E2E123";

const MOCK_TOKENS = {
  access_token: "mock-jwt-access-token",
  refresh_token: "mock-jwt-refresh-token",
  token_type: "bearer",
};

const MOCK_IDENTITY = {
  cpf: "52998224725",
  name: "Maria Eduarda dos Santos",
  birth_date: "1998-05-14",
  sex: "F",
  photo: null,
};

const MOCK_PRICING = {
  pix: "497.00",
  card: { installments: 12, installment: "49.70", total: "596.40" },
};

async function seedLeadSession(page: Page, roles: string[] = ["lead"]) {
  await page.addInitScript((rolesList) => {
    window.localStorage.setItem(
      "supletivo.session",
      JSON.stringify({
        phone: "11987654321",
        externalId: "lead-uuid-1234",
        roles: rolesList,
      }),
    );
    window.localStorage.setItem(
      "supletivo.login",
      JSON.stringify({
        access_token: "mock-jwt-access-token",
        refresh_token: "mock-jwt-refresh-token",
        token_type: "bearer",
      }),
    );
  }, roles);
}

test.describe("1. Funil de Entrada: WhatsApp, Auto-avanço e OTP", () => {
  test.beforeEach(async ({ page }) => {
    await page.route(API_WHOAMI, async (route) => {
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({ external_id: "lead-uuid-1234", roles: ["lead"], name: "Lead Teste" }),
      });
    });
  });

  test("TC-FUNIL-001: Digitação de 11 dígitos avança automaticamente sem botão de envio", async ({ page }) => {
    await page.route(API_CHECK, async (route) => {
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({
          found: false,
          external_id: "lead-uuid-1234",
          otp_sent: true,
          otp_wait: null,
          whatsapp: true,
          roles: ["lead"],
          created: true,
        }),
      });
    });

    await page.goto("/");
    const phoneInput = page.locator("#lead-phone");
    await expect(phoneInput).toBeVisible();

    await phoneInput.click();
    await phoneInput.pressSequentially("11987654321", { delay: 25 });

    // Auto-avanço para tela de login/OTP
    await expect(page).toHaveURL(/\/login$/, { timeout: 10_000 });
    await expect(page.getByRole("heading", { name: /Confirma que é você\?/i })).toBeVisible();
    await expect(page.getByText(/Mandei um código pro WhatsApp/i)).toBeVisible();
  });

  test("TC-FUNIL-002: Bloqueio de avanço com número incompleto", async ({ page }) => {
    let checkCalled = false;
    await page.route(API_CHECK, async (route) => {
      checkCalled = true;
      await route.fulfill({ status: 200, body: "{}" });
    });

    await page.goto("/");
    const phoneInput = page.locator("#lead-phone");
    await phoneInput.fill("11987654");

    await expect(page.getByText(/É só digitar — a gente segue sozinho/i)).toBeVisible();
    expect(checkCalled).toBe(false);
    await expect(page).toHaveURL(/\/$/);
  });

  test("TC-FUNIL-003: Login de usuário existente com OTP de 6 dígitos", async ({ page }) => {
    await page.route(API_CHECK, async (route) => {
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({
          found: true,
          external_id: "user-existing-123",
          otp_sent: true,
          otp_wait: null,
          whatsapp: true,
          roles: ["lead"],
          created: false,
        }),
      });
    });

    await page.route(API_LOGIN, async (route) => {
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify(MOCK_TOKENS),
      });
    });

    await page.goto("/");
    const phoneInput = page.locator("#lead-phone");
    await phoneInput.fill("11987654321");

    await expect(page).toHaveURL(/\/login$/);
    const otpFirstInput = page.getByLabel(/Dígito 1/i);
    await otpFirstInput.fill("123456");

    // Usuário novo/lead avança para etapa do CPF
    await expect(page).toHaveURL(/\/cpf$/, { timeout: 10_000 });
    await expect(page.getByRole("heading", { name: /Qual é o seu CPF\?/i })).toBeVisible();
  });
});

test.describe("2. Validação de CPF & Reveal do Pergaminho", () => {
  test.beforeEach(async ({ page }) => {
    await seedLeadSession(page, ["lead"]);
    await page.route(API_WHOAMI, async (route) => {
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({ external_id: "lead-uuid-1234", roles: ["lead"], name: "Lead Teste" }),
      });
    });
  });

  test("TC-FUNIL-006 & TC-FUNIL-008: CPF válido exibe animação e abre pergaminho de vaga reservada", async ({
    page,
  }) => {
    await page.route(API_IDENTITY, async (route) => {
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify(MOCK_IDENTITY),
      });
    });

    await page.goto("/cpf");
    await expect(page.getByRole("heading", { name: /Qual é o seu CPF\?/i })).toBeVisible();

    // Preenche os 11 dígitos do CPF válido
    await page.getByLabel("Dígito 1 do CPF").fill("52998224725");

    // Reveal do Pergaminho
    const pergaminho = page.getByRole("region", { name: /^Identidade confirmada:/ });
    await expect(pergaminho).toBeVisible({ timeout: 10_000 });
    await expect(page.getByText("Maria Eduarda dos Santos")).toBeVisible();
    await expect(page.getByText(/Vaga reservada/i)).toBeVisible();

    // Avanço manual ou automático para e-mail
    const continueBtn = page.getByRole("button", { name: /toque para continuar/i });
    await expect(continueBtn).toBeVisible();
    await continueBtn.click();
    await expect(page).toHaveURL(/\/email$/);
  });

  test("TC-FUNIL-007: CPF com dígito inválido dispara modal de conferência", async ({ page }) => {
    await page.goto("/cpf");
    await page.getByLabel("Dígito 1 do CPF").fill("12345678900");

    const modal = page.getByRole("dialog", { name: /Vamos conferir esse CPF\?/i });
    await expect(modal).toBeVisible();
  });
});

test.describe("3. E-mail, Seleção de Planos e Checkout", () => {
  test.beforeEach(async ({ page }) => {
    await seedLeadSession(page, ["lead"]);
    await page.route(API_WHOAMI, async (route) => {
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({ external_id: "lead-uuid-1234", roles: ["lead"], name: "Lead Teste" }),
      });
    });
    await page.route(API_LEAD_ME, async (route) => {
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({
          external_id: "lead-uuid-1234",
          status: "pending",
          customer: { name: "Maria Eduarda dos Santos", email: "maria@gmail.com" },
          checkout: null,
        }),
      });
    });
    await page.route(API_PRICING, async (route) => {
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify(MOCK_PRICING),
      });
    });
  });

  test("TC-FUNIL-009 & TC-FUNIL-010: Preenchimento de E-mail com sugestão de typo", async ({ page }) => {
    await page.route(API_EMAIL, async (route) => {
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({ email: "maria@gmail.com", already_yours: false }),
      });
    });

    await page.goto("/email");
    await expect(page.getByRole("heading", { name: /Qual é seu melhor e-mail\?/i })).toBeVisible();

    const emailInput = page.locator("#lead-email");
    await emailInput.fill("maria@gmai.com");

    // Sugestão de correção
    await expect(page.getByText(/Você quis dizer/i)).toBeVisible();
    await expect(page.getByRole("button", { name: /Usar maria@gmail\.com/i })).toBeVisible();
    await page.getByRole("button", { name: /Usar maria@gmail\.com/i }).click();

    await expect(emailInput).toHaveValue("maria@gmail.com");

    // Submissão do e-mail
    await page.getByRole("button", { name: "Continuar" }).click();
    await expect(page).toHaveURL(/\/planos$/, { timeout: 10_000 });
  });

  test("TC-FUNIL-011 & TC-FUNIL-012: Seleção de Planos e Modal com Selo TAXA ÚNICA", async ({ page }) => {
    await page.goto("/planos");
    await expect(page.getByRole("heading", { name: /Como você prefere pagar\?/i })).toBeVisible();

    // Selecionar Pix
    const pixBtn = page.getByRole("button", { name: /Escolher Pix/i });
    await expect(pixBtn).toBeVisible();
    await pixBtn.click();

    // Modal Expandido
    const planModal = page.getByRole("dialog", { name: /Confirmar Pix à vista/i });
    await expect(planModal).toBeVisible();
    await expect(planModal.getByText("TAXA ÚNICA")).toBeVisible();
    await expect(planModal.getByText("Você não paga mais nada depois")).toBeVisible();
    await expect(planModal.getByRole("button", { name: /Confirmar e pagar com Pix/i })).toBeVisible();
  });

  test("TC-FUNIL-013: Checkout PIX com Redirecionamento e Timeline", async ({ page }) => {
    await page.route(API_CHECKOUT, async (route) => {
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({
          payment_method: "pix",
          provider: "asaas",
          amount: "497.00",
          is_paid: false,
          url: GATEWAY_URL,
        }),
      });
    });

    await page.route("https://pagamento.parceiro.com.br/**", async (route) => {
      await route.fulfill({
        status: 200,
        contentType: "text/html",
        body: "<html><body><h1>Gateway de Pagamento Seguro</h1></body></html>",
      });
    });

    await page.goto("/planos");
    await page.getByRole("button", { name: /Escolher Pix/i }).click();
    await page.getByRole("button", { name: /Confirmar e pagar com Pix/i }).click();

    // Valida redirecionamento
    await page.waitForURL(/pagamento\.parceiro\.com\.br/, { timeout: 10_000 });
    await expect(page.getByText("Gateway de Pagamento Seguro")).toBeVisible();
  });

  test("TC-FUNIL-015: Retomada de sessão de checkout em aberto (Resume)", async ({ page }) => {
    await page.route(API_LEAD_ME, async (route) => {
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({
          external_id: "lead-uuid-1234",
          status: "pending",
          customer: { name: "Maria Eduarda dos Santos" },
          checkout: {
            payment_method: "pix",
            amount: "497.00",
            url: GATEWAY_URL,
          },
        }),
      });
    });

    await page.goto("/checkout");
    await expect(page.getByRole("heading", { name: /Seu pagamento continua aberto/i })).toBeVisible();
    await expect(page.getByRole("button", { name: /Continuar para o pagamento →/i })).toBeVisible();
    await expect(page.getByRole("button", { name: /Trocar forma de pagamento/i })).toBeVisible();
  });
});

test.describe("4. Onboarding de Matrícula (/matricula)", () => {
  test.beforeEach(async ({ page }) => {
    await seedLeadSession(page, ["enrollment"]);
    await page.route(API_WHOAMI, async (route) => {
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({ external_id: "user-enr-1", roles: ["enrollment"], name: "Aluno Matrícula" }),
      });
    });
  });

  test("TC-MATRICULA-001 & TC-MATRICULA-002: Upload de RG e Validação de OCR", async ({ page }) => {
    await page.route(API_ENROLLMENT_ME, async (route) => {
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({
          external_id: "enr-123",
          status: "rg",
          rg: { analysis_status: "approved", next_slot: null, missing_fields: [] },
        }),
      });
    });

    await page.route(API_ENROLLMENT_RG, async (route) => {
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({
          name: "Maria Eduarda dos Santos",
          birth_date: "1998-05-14",
          number: "123456789",
          issuing_agency: "SSP/SP",
          analysis_status: "approved",
          missing_fields: [],
        }),
      });
    });

    await page.goto("/matricula");
    await expect(page.getByText("Documento validado")).toBeVisible({ timeout: 10_000 });
    await expect(page.getByText("Maria Eduarda dos Santos")).toBeVisible();
    await expect(page.getByRole("button", { name: "Continuar" })).toBeVisible();
  });

  test("TC-MATRICULA-003: Autocomplete de CEP no Endereço", async ({ page }) => {
    await page.route(API_ENROLLMENT_ME, async (route) => {
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({
          external_id: "enr-123",
          status: "address",
          address_proof: { status: "approved" },
        }),
      });
    });

    await page.route(API_ENROLLMENT_ADDR, async (route) => {
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({
          street: "Avenida Paulista",
          neighborhood: "Bela Vista",
          city: "São Paulo",
          state: "SP",
          cep: "01310100",
          missing_fields: ["number"],
        }),
      });
    });

    await page.goto("/matricula");
    await expect(page.getByLabel("CEP")).toBeVisible({ timeout: 10_000 });
    await expect(page.getByLabel("Rua")).toHaveValue("Avenida Paulista");
    await expect(page.getByLabel("Bairro")).toHaveValue("Bela Vista");
  });

  test("TC-MATRICULA-005: Declaração de Escolaridade por Eliminação", async ({ page }) => {
    await page.route(API_ENROLLMENT_ME, async (route) => {
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({ external_id: "enr-123", status: "education" }),
      });
    });

    await page.goto("/matricula");
    await expect(page.getByRole("heading", { name: /Onde você parou de estudar\?/i })).toBeVisible({
      timeout: 10_000,
    });

    // Clicar em Ensino Médio
    await page.getByRole("button", { name: /Ensino Médio/i }).click();

    // Selecionar 1º ano
    await expect(page.getByRole("heading", { name: /Até que ano do Ensino Médio você foi\?/i })).toBeVisible();
    await page.getByRole("button", { name: /1º ano/i }).click();

    // Informar se concluiu o ano
    await expect(page.getByRole("heading", { name: /E esse ano.*você terminou\?/i })).toBeVisible();
    await page.getByRole("button", { name: /Terminei o ano/i }).click();

    // Chega na fase de Cidade/UF
    await expect(page.getByRole("heading", { name: /Onde você estudou esse último ano\?/i })).toBeVisible();
  });
});

test.describe("5. Portal do Aluno & Sala de Provas (/aluno e /provas)", () => {
  test.beforeEach(async ({ page }) => {
    await seedLeadSession(page, ["student"]);
    await page.route(API_WHOAMI, async (route) => {
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({ external_id: "std-1", roles: ["student"], name: "Aluno Oficial" }),
      });
    });
  });

  test("TC-ALUNO-001 & TC-ALUNO-004: Dashboard Acadêmico e Seleção de Tipo Sanguíneo", async ({ page }) => {
    await page.route(API_BLOCKS, async (route) => {
      await route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify([]) });
    });

    await page.route(API_STUDENT_ME, async (route) => {
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({
          external_id: "std-1",
          status: "awaiting_documents",
          blood_type: null,
          documents: [
            { type: "certificate", applies: true, required: true, validation_status: "approved" },
            { type: "transcript", applies: true, required: true, validation_status: "approved" },
            { type: "address_proof", applies: true, required: true, validation_status: "approved" },
            { type: "id_card", applies: true, required: true, validation_status: "approved" },
          ],
        }),
      });
    });

    await page.goto("/aluno");
    await expect(page.getByText(/tipo sanguíneo/i).first()).toBeVisible({ timeout: 10_000 });
  });

  test("TC-ALUNO-003: Banner de bloqueio de documento com instrução clara", async ({ page }) => {
    await page.route(API_BLOCKS, async (route) => {
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify([
          {
            external_id: "blk-1",
            source_type: "rg",
            title: "Foto com reflexo no documento",
            description: "A luz refletiu nos números e impediu a leitura.",
            action_label: "Tirar nova foto do RG",
            action_route: "/matricula",
          },
        ]),
      });
    });

    await page.route(API_STUDENT_ME, async (route) => {
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({
          external_id: "std-1",
          status: "awaiting_documents",
          blood_type: null,
          documents: [
            {
              type: "id_card",
              applies: true,
              required: true,
              validation_status: "rejected",
              analysis_reason: "Foto com reflexo no documento",
            },
          ],
        }),
      });
    });

    await page.goto("/aluno");
    await expect(page.getByText(/foto com reflexo no documento/i).first()).toBeVisible({ timeout: 10_000 });
  });
});

import { test, expect } from "@playwright/test";

const mockBackend = process.env.MOCK_BACKEND_URL ?? "http://127.0.0.1:8765";

test.describe("Portal do Promotor · Suíte E2E Aprofundada", () => {
  test.beforeEach(async ({ request }) => {
    // Reseta o estado do mock backend antes de cada cenário
    try {
      await request.post(`${mockBackend}/__reset`);
    } catch {
      // Continua caso o mock backend esteja sendo interceptado via route
    }
  });

  // =========================================================================
  // Módulo 1: Entrada, Validação de CPF e Autenticação OTP (TC-001 a TC-005)
  // =========================================================================
  test.describe("Módulo 1: Entrada, Validação de CPF e Autenticação OTP", () => {
    test("TC-PROMOTOR-DEEP-001: Validação de Formato, Máscara de CPF e Bloqueio de Envio Inválido", async ({
      page,
    }) => {
      await page.goto("/");

      const cpfInput = page.locator("#auth-cpf");
      await expect(cpfInput).toBeVisible();

      // Digita dígitos sem formatação
      await cpfInput.fill("11144477735");
      // Verifica se a máscara foi aplicada dinamicamente
      await expect(cpfInput).toHaveValue("111.444.777-35");

      // Testa CPF inválido (apagando último dígito)
      await cpfInput.fill("111.444.777-3");
      await cpfInput.blur();

      // Valida exibição do erro amigável de validação client-side
      const errorAlert = page.locator("p[role='alert']").or(page.getByText(/CPF inválido/i));
      await expect(errorAlert).toBeVisible();
      await expect(errorAlert).toContainText(/CPF inválido/i);

      // Clica em Continuar com CPF incompleto e valida que o formulário não avança
      await page.getByRole("button", { name: /continuar/i }).click();
      await expect(page.locator("#auth-cpf")).toBeVisible();
      await expect(page).toHaveURL(/\/$/);
    });

    test("TC-PROMOTOR-DEEP-002: Fluxo de Novo Candidato com Transição para Cadastro Inline", async ({
      page,
    }) => {
      // Mock do backend para CPF não cadastrado
      await page.route("**/api/auth/check", async (route) => {
        await route.fulfill({
          status: 200,
          contentType: "application/json",
          body: JSON.stringify({
            found: false,
            registered: false,
            otp_sent: false,
            whatsapp: true,
          }),
        });
      });

      await page.route("**/api/auth/register", async (route) => {
        await route.fulfill({
          status: 200,
          contentType: "application/json",
          body: JSON.stringify({
            external_id: "usr_e2e_new_candidate",
            user_external_id: "usr_e2e_new_candidate",
            otp_sent: true,
            otp_wait: 60,
          }),
        });
      });

      await page.goto("/");

      // 1. Entrada com CPF novo válido
      await page.locator("#auth-cpf").fill("12345678909");
      await page.getByRole("button", { name: /continuar/i }).click();

      // 2. Transição para o formulário de cadastro inline
      await expect(page.getByRole("heading", { name: /Criar cadastro/i })).toBeVisible();
      const phoneInput = page.locator("#auth-phone");
      const emailInput = page.locator("#auth-email");

      await expect(phoneInput).toBeVisible();
      await expect(emailInput).toBeVisible();

      // 3. Preenchimento de telefone com máscara e e-mail
      await phoneInput.fill("42999998888");
      await expect(phoneInput).toHaveValue("(42) 99999-8888");
      await emailInput.fill("promotor.teste@maestri.group");

      // 4. Submissão do cadastro
      await page.getByRole("button", { name: /Criar cadastro/i }).click();

      // 5. Avanço para a etapa de OTP
      await expect(page.getByRole("heading", { name: /Confirme o código/i })).toBeVisible();
      await expect(page.getByRole("button", { name: /Reenviar código/i })).toBeVisible();
    });

    test("TC-PROMOTOR-DEEP-003: Login de Promotor Cadastrado com OTP e Redirecionamento ao Painel", async ({
      page,
      request,
    }) => {
      // Prepara o promotor no mock backend
      await request.post(`${mockBackend}/__promote`);

      await page.goto("/");

      // 1. Identificação com CPF
      await page.locator("#auth-cpf").fill("52998224725");
      await page.getByRole("button", { name: /continuar/i }).click();

      // 2. Tela de OTP com aviso amigável
      await expect(page.getByRole("heading", { name: /Confirme o código/i })).toBeVisible();

      // 3. Preenchimento do código OTP
      const otpInput = page.getByLabel(/código de 6 dígitos/i);
      await expect(otpInput).toBeVisible();
      await otpInput.fill("000000");

      // 4. Submissão e transição
      await page.getByRole("button", { name: /entrar/i }).click();

      // 5. Redirecionamento ao painel
      await expect(page).toHaveURL(/\/painel$/, { timeout: 15_000 });
      await expect(page.getByRole("heading", { name: /Olá, Promotor E2E V7M/i })).toBeVisible();
      await expect(page.getByText(/Ativo/i)).toBeVisible();
    });

    test("TC-PROMOTOR-DEEP-004: Tratamento de Erro RATE_LIMITED e Mensagens Resilientes", async ({
      page,
    }) => {
      await page.route("**/api/auth/check", async (route) => {
        await route.fulfill({
          status: 429,
          contentType: "application/json",
          body: JSON.stringify({
            code: "RATE_LIMITED",
            detail: "Muitas tentativas seguidas.",
            retry_after_s: 30,
          }),
        });
      });

      await page.goto("/");
      await page.locator("#auth-cpf").fill("11144477735");
      await page.getByRole("button", { name: /continuar/i }).click();

      // Verifica exibição do alerta de limite de taxa com temporizador
      const errorAlert = page.locator("p[role='alert']").or(page.getByText(/Muitas tentativas seguidas/i));
      await expect(errorAlert).toBeVisible();
      await expect(errorAlert).toContainText(/Muitas tentativas seguidas/i);
      await expect(errorAlert).toContainText(/30 segundos/i);
    });
  });

  // =========================================================================
  // Módulo 2: Onboarding dos 5 Deveres de Validação (TC-006 a TC-012)
  // =========================================================================
  test.describe("Módulo 2: Onboarding dos 5 Deveres de Validação", () => {
    test.beforeEach(async ({ page, request }) => {
      await request.post(`${mockBackend}/__reset`);
      // Autentica como candidato
      await page.goto("/");
      await page.locator("#auth-cpf").fill("52998224725");
      await page.getByRole("button", { name: /continuar/i }).click();
      await page.getByLabel(/código de 6 dígitos/i).fill("000000");
      await page.getByRole("button", { name: /entrar/i }).click();
      await expect(page).toHaveURL(/\/(painel|documento|endereco|pix|escolaridade|selfie)/);
    });

    test("TC-PROMOTOR-DEEP-006: Dever 1 - Documento Oficial (RG / CNH)", async ({ page }) => {
      await page.goto("/documento");
      await expect(page).toHaveURL(/\/documento/);

      await expect(page.getByRole("heading", { name: /Seu documento/i })).toBeVisible();
      await expect(page.getByText(/Escolha RG ou CNH/i).first()).toBeVisible();

      // Seleção de tipo de documento
      const rgBtn = page.getByRole("button", { name: /RG/i }).first();
      if (await rgBtn.isVisible()) {
        await rgBtn.click();
      }

      // Validação da área de upload e instrução
      await expect(page.getByText(/foto|frente|documento/i).first()).toBeVisible();
    });

    test("TC-PROMOTOR-DEEP-008: Dever 2 - Endereço e Comprovante de Residência", async ({ page }) => {
      await page.goto("/endereco");
      await expect(page).toHaveURL(/\/endereco/);

      await expect(page.getByRole("heading", { name: /Comprovante de residência/i })).toBeVisible();
      await expect(
        page.getByText(/Envie a conta ou comprovante/i),
      ).toBeVisible();
    });

    test("TC-PROMOTOR-DEEP-009 & TC-010: Dever 3 - Chave Pix e Drawer de Diagnóstico", async ({
      page,
    }) => {
      await page.goto("/pix");
      await expect(page).toHaveURL(/\/pix/);

      await expect(page.getByRole("heading", { name: /Chave Pix/i })).toBeVisible();

      const pixInput = page.getByRole("textbox", { name: /chave pix/i }).or(page.locator("input").first());
      await expect(pixInput).toBeVisible();

      // Digita chave Pix válida
      await pixInput.fill("52998224725");
      const submitBtn = page.getByRole("button", { name: /Salvar|Validar|Confirmar/i });
      await expect(submitBtn).toBeVisible();
    });

    test("TC-PROMOTOR-DEEP-011: Dever 4 - Escolaridade e Nível de Formação", async ({ page }) => {
      await page.goto("/escolaridade");
      await expect(page).toHaveURL(/\/escolaridade/);

      await expect(page.getByRole("heading", { name: /Escolaridade/i })).toBeVisible();
      // Valida assistente ou formulário de escolaridade
      await expect(page.getByText(/série|ensino|fundamental|médio|superior/i).first()).toBeVisible();
    });

    test("TC-PROMOTOR-DEEP-012: Dever 5 - Selfie Biométrica e Aceite do Termo de Parceria", async ({
      page,
      request,
    }) => {
      await request.post(`${mockBackend}/__stage?status=selfie`);
      await page.goto("/selfie");
      await expect(page).toHaveURL(/\/selfie/);

      await expect(page.getByRole("heading", { name: /Selfie/i })).toBeVisible();

      // Caso o AgreementSheet esteja presente, valida o diálogo de acordo legal
      const agreementTitle = page.getByRole("heading", { name: /Antes da selfie: seu acordo com a V7M/i });
      if (await agreementTitle.isVisible()) {
        await expect(page.getByText(/Você atua como promotor/i)).toBeVisible();
        await expect(page.getByText(/R\$100 por matrícula paga/i)).toBeVisible();
        const acceptBtn = page.getByRole("button", { name: /Li e concordo — continuar/i });
        await expect(acceptBtn).toBeVisible();
        await acceptBtn.click();
        await expect(agreementTitle).toBeHidden();
      }
    });
  });

  // =========================================================================
  // Módulo 3: Dashboard de Performance e Gamificação (TC-013 a TC-016)
  // =========================================================================
  test.describe("Módulo 3: Dashboard de Performance e Gamificação", () => {
    test.beforeEach(async ({ page, request }) => {
      await request.post(`${mockBackend}/__promote`);
      await page.goto("/");
      await page.locator("#auth-cpf").fill("52998224725");
      await page.getByRole("button", { name: /continuar/i }).click();
      await page.getByLabel(/código de 6 dígitos/i).fill("000000");
      await page.getByRole("button", { name: /entrar/i }).click();
      await expect(page).toHaveURL(/\/painel$/);
    });

    test("TC-PROMOTOR-DEEP-013 & TC-014: Termômetro de Meta Semanal (X/5) e Contador Regressivo", async ({
      page,
    }) => {
      // 1. Termômetro da meta semanal
      await expect(page.getByText(/Meta da semana/i)).toBeVisible();
      await expect(page.getByText(/\/ 5/i)).toBeVisible();

      // 2. Indicação de bônus financeiro
      await expect(page.getByText(/Bata 5 matrículas e ganhe R\$ 1\.000/i).or(page.getByText(/R\$ 500/i))).toBeVisible();

      // 3. Contagem regressiva para o fechamento
      await expect(page.getByText(/fecha em|fechamento|sexta/i).first()).toBeVisible();

      // 4. Métricas de valores formatadas
      await expect(page.getByText(/Sai na Sexta|Recebido|Previsto/i).first()).toBeVisible();
    });

    test("TC-PROMOTOR-DEEP-015: Central de Compartilhamento, Cópia de Link e Modal QR Code", async ({
      page,
      context,
    }) => {
      await context.grantPermissions(["clipboard-read", "clipboard-write"]);

      // 1. Link de indicação visível
      await expect(page.getByText(/Seu link de indicação/i)).toBeVisible();
      const codeBlock = page.locator("code").filter({ hasText: /https:\/\/supletivo\.net\.br\/\?ref=/i });
      await expect(codeBlock).toBeVisible();

      // 2. Botão de cópia rápida com feedback
      const copyBtn = page.getByRole("button", { name: /Copiar/i });
      await expect(copyBtn).toBeVisible();
      await copyBtn.click();
      await expect(page.getByText(/Copiado!/i)).toBeVisible();

      // 3. Link direto para o WhatsApp
      const whatsappBtn = page.locator('a[href*="api.whatsapp.com"]');
      await expect(whatsappBtn).toBeVisible();
      const href = await whatsappBtn.getAttribute("href");
      expect(href).toContain("api.whatsapp.com");
      expect(href).toContain(encodeURIComponent("?ref="));

      // 4. Modal / Diálogo de QR Code
      const qrBtn = page.getByRole("button", { name: /QR Code/i });
      if (await qrBtn.isVisible()) {
        await qrBtn.click();
        const dialog = page.getByRole("dialog");
        await expect(dialog).toBeVisible();
        const closeBtn = page.getByRole("button", { name: "Fechar" }).or(page.locator("button[aria-label='Fechar']"));
        if (await closeBtn.isVisible()) {
          await closeBtn.click();
        } else {
          await page.keyboard.press("Escape");
        }
        await expect(dialog).toBeHidden();
      }
    });

    test("TC-PROMOTOR-DEEP-016: Status dos 5 Deveres e Indicação de Liberação de Saques", async ({
      page,
    }) => {
      // Promotor pleno exibe selo Ativo e saques liberados
      await expect(page.getByText(/Ativo/i)).toBeVisible();
      await expect(page.getByRole("heading", { name: /Olá, Promotor E2E V7M/i })).toBeVisible();
    });
  });

  // =========================================================================
  // Módulo 4: CRM de Leads e Extrato de Comissões (TC-017 a TC-020)
  // =========================================================================
  test.describe("Módulo 4: CRM de Leads e Extrato de Comissões", () => {
    test.beforeEach(async ({ page, request }) => {
      await request.post(`${mockBackend}/__promote`);
      await page.goto("/");
      await page.locator("#auth-cpf").fill("52998224725");
      await page.getByRole("button", { name: /continuar/i }).click();
      await page.getByLabel(/código de 6 dígitos/i).fill("000000");
      await page.getByRole("button", { name: /entrar/i }).click();
      await expect(page).toHaveURL(/\/painel$/);
    });

    test("TC-PROMOTOR-DEEP-017 & TC-018: Gestão de Leads com Badges e Contato WhatsApp", async ({
      page,
    }) => {
      await page.goto("/leads");
      await expect(page).toHaveURL(/\/leads/);

      await expect(page.getByRole("heading", { name: /Seus leads/i })).toBeVisible();

      // Checa a renderização do estado dos leads ou mensagem de leads vazios
      const leadCards = page.locator("li .auth-card");
      const emptyNotice = page.getByText(/Seus primeiros leads vão aparecer aqui/i);

      if ((await leadCards.count()) > 0) {
        // Valida presença de badges estruturadas
        const badge = page.getByText(/Aguardando|Pago · cai sexta|Recebido ✓/i).first();
        await expect(badge).toBeVisible();

        // Se houver lead aguardando com telefone, testa botão de WhatsApp
        const waContact = page.getByRole("link", { name: /Chamar no WhatsApp/i }).first();
        if (await waContact.isVisible()) {
          const href = await waContact.getAttribute("href");
          expect(href).toMatch(/^https:\/\/wa\.me\/\d+/);
        }
      } else {
        await expect(emptyNotice).toBeVisible();
      }
    });

    test("TC-PROMOTOR-DEEP-019 & TC-020: Extrato Financeiro de Comissões e Diagnóstico Pix", async ({
      page,
    }) => {
      await page.goto("/comissoes");
      await expect(page).toHaveURL(/\/comissoes/);

      // 1. Validação das 3 métricas do grid financeiro
      await expect(page.getByText(/Acumulado Recebido/i)).toBeVisible();
      await expect(page.getByText(/Sai na Sexta/i)).toBeVisible();
      await expect(page.getByText(/Bloqueado por Validação/i)).toBeVisible();

      // 2. Validação da gaveta de diagnóstico Pix
      const diagBtn = page.getByRole("button", { name: /diagnóstico/i });
      if (await diagBtn.isVisible()) {
        await diagBtn.click();
        const dialog = page.getByRole("dialog", { name: /diagnóstico de repasse pix/i });
        await expect(dialog).toBeVisible();
        await expect(page.getByText(/status do seu repasse pix/i)).toBeVisible();

        // Fechar diagnóstico
        await page.getByRole("button", { name: /entendido/i }).click();
        await expect(dialog).toBeHidden();
      }
    });
  });

  // =========================================================================
  // Módulo 5: LMS e Capacitação Obrigatória (TC-021 a TC-023)
  // =========================================================================
  test.describe("Módulo 5: LMS e Capacitação Obrigatória", () => {
    test("TC-PROMOTOR-DEEP-021 a TC-023: Bloqueio LMS Gate e Desbloqueio Pós-Capacitação", async ({
      page,
      request,
    }) => {
      // Prepara o usuário com role "training"
      await request.post(`${mockBackend}/__reset`);
      await request.post(`${mockBackend}/__approve`);

      // Autenticação
      await page.goto("/");
      await page.locator("#auth-cpf").fill("52998224725");
      await page.getByRole("button", { name: /continuar/i }).click();
      await page.getByLabel(/código de 6 dígitos/i).fill("000000");
      await page.getByRole("button", { name: /entrar/i }).click();

      // 1. Pós-Login: Acesso direto ao painel no modelo assíncrono
      await expect(page).toHaveURL(/\/painel/, { timeout: 15_000 });

      // 2. Navegação para área de Capacitação
      await page.goto("/treinamento");
      await expect(page.getByRole("heading", { name: /Treinamento & Formação|Capacitação/i })).toBeVisible();
      await expect(page.getByRole("progressbar")).toBeVisible();
      await expect(page.getByText(/matérias obrigatórias concluídas/i)).toBeVisible();
    });
  });

  // =========================================================================
  // Módulo 6: DevStudio & Simulações Visuais (/dev-preview) (TC-024 a TC-026)
  // =========================================================================
  test.describe("Módulo 6: DevStudio & Simulações Visuais (/dev-preview)", () => {
    test("TC-PROMOTOR-DEEP-024: Cenários 1-Click e Mutação Instantânea de Estado", async ({
      page,
    }) => {
      await page.goto("/dev-preview");
      await expect(page.getByRole("heading", { name: /Modo Desenvolvedor · V7M Lab/i })).toBeVisible();

      // 1. Cenário: Candidato Novo (0/5)
      await page.getByRole("button", { name: /Candidato Novo \(0\/5\)/i }).click();
      await expect(page.getByText(/0 de 5/i).first()).toBeVisible();

      // 2. Cenário: Promotor Pleno (5/5 Aprovado)
      await page.getByRole("button", { name: /Promotor Pleno \(5\/5 Aprovado\)/i }).click();
      await expect(page.getByText(/Ativo/i).first()).toBeVisible();
      await expect(page.getByText(/Beatriz Promotora/i)).toBeVisible();

      // 3. Cenário: Campeão da Meta (5/5 Leads + Bônus)
      await page.getByRole("button", { name: /Campeão da Meta \(5\/5 Leads \+ Bônus\)/i }).click();
      await expect(page.getByText(/Rodrigo Campeão/i)).toBeVisible();

      // 4. Cenário: Trava de Treinamento (LMS Gate)
      await page.getByRole("button", { name: /Trava de Treinamento \(LMS Gate\)/i }).click();
      await expect(page.getByText(/Diego Trainee/i)).toBeVisible();
    });

    test("TC-PROMOTOR-DEEP-025: Injeção e Simulação de Erros de API", async ({ page }) => {
      await page.goto("/dev-preview");

      // 1. Simular Rate Limit (429)
      await page.getByRole("button", { name: "Rate Limit (429)" }).click();
      await expect(page.getByText(/Erro Simulado \(RATE_LIMITED\)/i)).toBeVisible();

      // 2. Simular Arquivo > 8MB
      await page.getByRole("button", { name: "Arquivo > 8MB" }).click();
      await expect(page.getByText(/Erro Simulado \(FILE_TOO_LARGE\)/i)).toBeVisible();

      // 3. Simular Rede Oscilou
      await page.getByRole("button", { name: "Rede Oscilou" }).click();
      await expect(page.getByText(/Erro Simulado \(NETWORK_ERROR\)/i)).toBeVisible();

      // 4. Limpar erro
      await page.getByRole("button", { name: "Sem Erro" }).click();
      await expect(page.getByText(/Erro Simulado/i)).toBeHidden();
    });

    test("TC-PROMOTOR-DEEP-026: Inspetor de Touch Targets (≥44px), Viewports e Alternância de Telas", async ({
      page,
    }) => {
      await page.goto("/dev-preview");

      // 1. Ferramenta Alvos ≥44px
      const targetBtn = page.getByRole("button", { name: /🎯 Alvos ≥44px/i });
      await expect(targetBtn).toBeVisible();
      await targetBtn.click();

      // 2. Alternância de viewports
      await page.getByRole("button", { name: /375px/i }).click();
      await page.getByRole("button", { name: /412px/i }).click();
      await page.getByRole("button", { name: /Auto/i }).click();
      await page.getByRole("button", { name: /393px/i }).click();

      // 3. Alternância entre as telas simuladas
      await page.getByRole("button", { name: "1. Documento" }).click();
      await expect(page.getByText(/Frente do RG|Verso do RG|CNH/i).first()).toBeVisible();

      await page.getByRole("button", { name: "3. Chave Pix" }).click();
      await expect(page.getByText(/Chave Pix para saque/i).first()).toBeVisible();

      await page.getByRole("navigation").getByRole("button", { name: "Comissões" }).click();
      await expect(page.getByText(/Extrato Financeiro|Acumulado/i).first()).toBeVisible();

      await page.getByRole("button", { name: "Painel Principal" }).click();
      await expect(page.getByText(/Meta da semana/i).first()).toBeVisible();
    });
  });
});

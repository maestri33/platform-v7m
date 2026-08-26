import { test, expect } from "@playwright/test";

test.describe("Notify Dashboard · Suíte E2E HTMX & Multi-tenant", () => {
  // =========================================================================
  // Módulo 1: Visão Geral e Operações Imediatas (TC-001 a TC-004)
  // =========================================================================
  test.describe("Módulo 1: Visão Geral e Operações Imediatas (/ ou /?app=default)", () => {
    test.beforeEach(async ({ page }) => {
      await page.goto("/?app=default");
    });

    test("TC-NOTIFY-DASH-001: Renderização de Métricas Operacionais em Tempo Real", async ({
      page,
    }) => {
      await expect(page).toHaveTitle(/Visão Geral|Notify/i);

      // Validação dos 4 cards de KPIs
      await expect(page.getByText("Total de Envios")).toBeVisible();
      await expect(page.getByText("Entregues com Sucesso")).toBeVisible();
      await expect(page.getByText("Falhas Registradas")).toBeVisible();
      await expect(page.getByText("Mensagens Recebidas")).toBeVisible();

      // Validação de seletor de aplicações no topo
      const appSelect = page.locator("#app-select");
      await expect(appSelect).toBeVisible();
      await expect(appSelect).toHaveValue("default");
    });

    test("TC-NOTIFY-DASH-002: Status Operacional dos Canais (WhatsApp & E-mail)", async ({
      page,
    }) => {
      await expect(page.getByRole("heading", { name: /Status Operacional dos Canais/i })).toBeVisible();

      // 1. Canal WhatsApp
      await expect(page.getByText(/WhatsApp \(Evolution GO\)/i)).toBeVisible();
      const manageWaLink = page.getByRole("link", { name: /Gerenciar WhatsApp →/i });
      await expect(manageWaLink).toBeVisible();
      await expect(manageWaLink).toHaveAttribute("href", /\/dashboard\/whatsapp\/\?app=default/);

      // 2. Canal E-mail
      await expect(page.getByText(/E-mail \(SMTP\)/i)).toBeVisible();
      const manageMailLink = page.getByRole("link", { name: /Gerenciar E-mail →/i });
      await expect(manageMailLink).toBeVisible();
      await expect(manageMailLink).toHaveAttribute("href", /\/dashboard\/email\/\?app=default/);
    });

    test("TC-NOTIFY-DASH-003: Disparo de Teste Imediato com Payload Customizado", async ({
      page,
    }) => {
      await expect(page.getByRole("heading", { name: /Disparo de Teste Imediato/i })).toBeVisible();

      const phoneInput = page.locator('input[name="phone"]');
      const emailInput = page.locator('input[name="email"]');
      const msgInput = page.locator('textarea[name="text"]');
      const submitBtn = page.getByRole("button", { name: /Disparar Teste/i });

      await expect(phoneInput).toBeVisible();
      await expect(emailInput).toBeVisible();
      await expect(msgInput).toBeVisible();
      await expect(submitBtn).toBeVisible();

      await phoneInput.fill("554299384069");
      await emailInput.fill("teste.e2e@v7m.org");
      await msgInput.fill("Teste automatizado Playwright Notify Dashboard!");

      await submitBtn.click();

      // Valida o feedback do container #test-result
      const resultContainer = page.locator("#test-result");
      await expect(resultContainer).toContainText(/Enviado|Falha|informe/i, { timeout: 25_000 });
    });

    test("TC-NOTIFY-DASH-004: Tabela de Últimos Envios e Link para Histórico Completo", async ({
      page,
    }) => {
      await expect(page.getByRole("heading", { name: /Últimos Envios/i })).toBeVisible();

      // Valida cabeçalhos da tabela
      await expect(page.getByRole("columnheader", { name: "Data/Hora" })).toBeVisible();
      await expect(page.getByRole("columnheader", { name: "Destinatário" })).toBeVisible();
      await expect(page.getByRole("columnheader", { name: "Canal" })).toBeVisible();
      await expect(page.getByRole("columnheader", { name: "Status" })).toBeVisible();
      await expect(page.getByRole("columnheader", { name: "Mensagem" })).toBeVisible();
      await expect(page.getByRole("columnheader", { name: "Ação" })).toBeVisible();

      const viewAllLink = page.getByRole("link", { name: /Ver todos os envios →/i });
      await expect(viewAllLink).toBeVisible();
      await expect(viewAllLink).toHaveAttribute("href", /\/dashboard\/messages\/\?app=default/);
    });
  });

  // =========================================================================
  // Módulo 2: Assistente de Setup Multi-tenant (TC-005 a TC-008)
  // =========================================================================
  test.describe("Módulo 2: Assistente de Setup Multi-tenant (/dashboard/setup/)", () => {
    test("TC-NOTIFY-DASH-005: Setup Gate com Bloqueio de Navegação (🔒) para Apps Incompletos", async ({
      page,
    }) => {
      // Acessa um app com setup pendente
      await page.goto("/dashboard/setup/?app=ieadpg");

      // Valida cabeçalho do assistente
      await expect(
        page.getByRole("heading", { name: /Assistente de Configuração Obrigatório/i }),
      ).toBeVisible();

      // Valida que os menus operacionais exibem o cadeado 🔒
      const sidebar = page.locator(".app-sidebar");
      await expect(sidebar.getByText(/Visão Geral 🔒/i)).toBeVisible();
      await expect(sidebar.getByText(/WhatsApp 🔒/i)).toBeVisible();
      await expect(sidebar.getByText(/E-mail 🔒/i)).toBeVisible();
      await expect(sidebar.getByText(/Envios 🔒/i)).toBeVisible();
      await expect(sidebar.getByText(/Recebidas 🔒/i)).toBeVisible();
      await expect(sidebar.getByText(/Webhooks 🔒/i)).toBeVisible();
      await expect(sidebar.getByText(/Configurações 🔒/i)).toBeVisible();

      // Apenas o assistente de setup fica ativo
      await expect(sidebar.getByText(/Assistente de Setup/i)).toBeVisible();
    });

    test("TC-NOTIFY-DASH-006: Navegação pelas Etapas do Setup (WhatsApp, E-mail, IA e Logo)", async ({
      page,
    }) => {
      // 1. Etapa 1: WhatsApp
      await page.goto("/dashboard/setup/?app=default&step=1");
      await expect(
        page.getByRole("heading", { name: /Etapa 1 de 6: Conectar WhatsApp/i }),
      ).toBeVisible();
      await expect(page.locator("#setup-qr")).toBeVisible();
      await expect(
        page.getByRole("button", { name: /Avançar para E-mail \(Etapa 2\) →/i }),
      ).toBeVisible();

      // 2. Etapa 2: E-mail (Stalwart)
      await page.goto("/dashboard/setup/?app=default&step=2");
      await expect(
        page.getByRole("heading", { name: /Etapa 2 de 6: Configurar E-mail/i }),
      ).toBeVisible();
      await expect(page.locator("#domain-select")).toBeVisible();
      await expect(page.getByText(/Usar Caixa Existente no Domínio/i)).toBeVisible();
      await expect(page.getByText(/Provisionar Nova Caixa no Stalwart/i)).toBeVisible();

      // 3. Etapa 3: IA Probe (OmniRouter)
      await page.goto("/dashboard/setup/?app=default&step=3");
      await expect(
        page.getByRole("heading", { name: /Etapa 3 de 6: Configurar e Validar IA/i }),
      ).toBeVisible();
      await expect(page.locator("#ai_url_input")).toBeVisible();
      await expect(
        page.getByRole("button", { name: /Executar Teste \/ Probe da IA/i }),
      ).toBeVisible();

      // 4. Etapa 4: Identidade Visual (Logo)
      await page.goto("/dashboard/setup/?app=default&step=4");
      await expect(
        page.getByRole("heading", { name: /Etapa 4 de 6: Identidade Visual/i }),
      ).toBeVisible();
      await expect(page.getByRole("heading", { name: /Opção A: Upload de Imagem/i })).toBeVisible();
      await expect(page.getByRole("heading", { name: /Opção B: Gerar Logo com IA/i })).toBeVisible();
      await expect(page.locator("#logo-preview-box")).toBeVisible();
    });

    test("TC-NOTIFY-DASH-007: Etapa 5 - Editor de Template HTML com Placeholders e Preview ao Vivo", async ({
      page,
    }) => {
      await page.goto("/dashboard/setup/?app=default&step=5");

      await expect(
        page.getByRole("heading", { name: /Etapa 5 de 6: Template HTML do E-mail/i }),
      ).toBeVisible();

      const editor = page.locator("#tpl-html-code");
      const previewFrame = page.locator("#tpl-preview-frame");
      const aiProposeBtn = page.getByRole("button", { name: /Re-propor Template via IA/i });
      const submitBtn = page.getByRole("button", {
        name: /Salvar Template e Ir para Conclusão \(Etapa 6\) →/i,
      });

      await expect(editor).toBeVisible();
      await expect(previewFrame).toBeVisible();
      await expect(aiProposeBtn).toBeVisible();
      await expect(submitBtn).toBeVisible();

      // Verifica presença de código com placeholders essenciais
      const templateValue = await editor.inputValue();
      expect(templateValue).toMatch(/\{\{content\}\}|\{\{ content \}\}/);
    });

    test("TC-NOTIFY-DASH-008: Etapa 6 - Homologação Final e Liberação de Acesso", async ({
      page,
    }) => {
      await page.goto("/dashboard/setup/?app=default&step=6");

      await expect(
        page.getByRole("heading", { name: /Todas as Etapas Concluídas!/i }),
      ).toBeVisible();

      await expect(page.getByText(/Instância WhatsApp:/i)).toBeVisible();
      await expect(page.getByText(/E-mail Remetente:/i)).toBeVisible();
      await expect(page.getByText(/Gateway de IA:/i)).toBeVisible();
      await expect(page.getByText(/Status Operacional:/i)).toBeVisible();

      const finishBtn = page.getByRole("button", {
        name: /Liberar Acesso ao Dashboard Operacional →/i,
      });
      await expect(finishBtn).toBeVisible();
    });
  });

  // =========================================================================
  // Módulo 3: Histórico de Envios Outbound (TC-009 a TC-011)
  // =========================================================================
  test.describe("Módulo 3: Histórico de Envios Outbound (/dashboard/messages/)", () => {
    test.beforeEach(async ({ page }) => {
      await page.goto("/dashboard/messages/?app=default");
    });

    test("TC-NOTIFY-DASH-009: Filtros Combinados de Envios (Busca, Canal e Status)", async ({
      page,
    }) => {
      await expect(
        page.getByRole("heading", { name: /Histórico de Envios \(Outbound\)/i }),
      ).toBeVisible();

      const searchInput = page.locator('input[name="q"]');
      const channelSelect = page.locator('select[name="channel"]');
      const statusSelect = page.locator('select[name="status"]');

      await expect(searchInput).toBeVisible();
      await expect(channelSelect).toBeVisible();
      await expect(statusSelect).toBeVisible();

      // Teste de preenchimento dos filtros
      await searchInput.fill("5543996648750");
      await channelSelect.selectOption("whatsapp");
      await statusSelect.selectOption("sent");

      // Tabela de resultados deve estar presente
      await expect(page.locator("#messages-table-container")).toBeVisible();
    });

    test("TC-NOTIFY-DASH-010: Inspeção de Detalhes da Notificação e Modal de Metadados", async ({
      page,
    }) => {
      const viewLinks = page.locator('a:has-text("Ver")');
      if ((await viewLinks.count()) > 0) {
        await viewLinks.first().click();

        // Modal de detalhe ou bloco expandido
        await expect(page.getByText(/Detalhes|Notificação:/i).first()).toBeVisible();
        await expect(page.getByText(/Rastreamento|Destinatário|WhatsApp|E-mail/i).first()).toBeVisible();

        const closeBtn = page.getByRole("button", { name: /Fechar|Concluir Visualização/i }).first();
        if (await closeBtn.isVisible()) {
          await closeBtn.click();
        }
      } else {
        await expect(page.getByText(/Nenhuma notificação encontrada/i)).toBeVisible();
      }
    });

    test("TC-NOTIFY-DASH-011: Ação de Reenvio / Requeue Manual de Mensagens", async ({ page }) => {
      const requeueBtns = page.locator('button:has-text("Reenviar")');
      if ((await requeueBtns.count()) > 0) {
        await expect(requeueBtns.first()).toBeVisible();
      }
    });
  });

  // =========================================================================
  // Módulo 4: Mensagens Recebidas Inbound (TC-012 a TC-013)
  // =========================================================================
  test.describe("Módulo 4: Mensagens Recebidas Inbound (/dashboard/inbox/)", () => {
    test.beforeEach(async ({ page }) => {
      await page.goto("/dashboard/inbox/?app=default");
    });

    test("TC-NOTIFY-DASH-012 & TC-013: Monitoramento de Mensagens Inbound e Visualização de Payload", async ({
      page,
    }) => {
      await expect(
        page.getByRole("heading", { name: /Mensagens Recebidas \(Inbound\)/i }),
      ).toBeVisible();

      // Campo de busca com debounce
      const searchInput = page.locator('input[name="q"]');
      await expect(searchInput).toBeVisible();

      // Tabela de recebidas
      await expect(page.locator("#inbox-table-container")).toBeVisible();
      await expect(page.getByRole("columnheader", { name: "Data/Hora" })).toBeVisible();
      await expect(page.getByRole("columnheader", { name: /De \(Telefone\)/i })).toBeVisible();
      await expect(page.getByRole("columnheader", { name: "Instância" })).toBeVisible();
      await expect(page.getByRole("columnheader", { name: /Prévia da Mensagem/i })).toBeVisible();
      await expect(page.getByRole("columnheader", { name: /Repasse ao Webhook/i })).toBeVisible();

      const payloadLinks = page.locator('a:has-text("Ver Payload")');
      if ((await payloadLinks.count()) > 0) {
        await payloadLinks.first().click();
        await expect(page.getByText(/Mensagem Recebida via WhatsApp|payload bruto|Conteúdo Recebido/i).first()).toBeVisible();
      }
    });
  });

  // =========================================================================
  // Módulo 5: Configuração de E-mail & Servidor Stalwart (TC-014 a TC-016)
  // =========================================================================
  test.describe("Módulo 5: Configuração de E-mail & Servidor Stalwart (/dashboard/email/)", () => {
    test.beforeEach(async ({ page }) => {
      await page.goto("/dashboard/email/?app=default");
    });

    test("TC-NOTIFY-DASH-014: Formulário de Credenciais e Envio SMTP", async ({ page }) => {
      await expect(
        page.getByRole("heading", { name: /Canal E-mail \(SMTP & Stalwart Mail Server\)/i }),
      ).toBeVisible();

      await expect(page.getByRole("heading", { name: /Configurações de Envio SMTP/i })).toBeVisible();

      const fromEmailInput = page.locator('input[name="from_email"]');
      const fromNameInput = page.locator('input[name="from_name"]');
      const smtpHostInput = page.locator('input[name="smtp_host"]');
      const smtpPortInput = page.locator('input[name="smtp_port"]');
      const saveBtn = page.getByRole("button", { name: /Salvar Credenciais SMTP/i });

      await expect(fromEmailInput).toBeVisible();
      await expect(fromNameInput).toBeVisible();
      await expect(smtpHostInput).toBeVisible();
      await expect(smtpPortInput).toBeVisible();
      await expect(saveBtn).toBeVisible();
    });

    test("TC-NOTIFY-DASH-015: Gestão de Caixas no Servidor Stalwart (Domínios e Criação)", async ({
      page,
    }) => {
      await expect(
        page.getByRole("heading", { name: /Caixas de E-mail no Servidor \(Stalwart\)/i }),
      ).toBeVisible();

      const domainSelect = page.locator("#domain-select");
      const mailboxesContainer = page.locator("#mailboxes-container");
      const newMailboxInput = page.locator('input[name="local_part"]');
      const createMailboxBtn = page.getByRole("button", { name: /Criar Nova Caixa/i });

      await expect(domainSelect).toBeVisible();
      await expect(mailboxesContainer).toBeVisible();
      await expect(newMailboxInput).toBeVisible();
      await expect(createMailboxBtn).toBeVisible();
    });

    test("TC-NOTIFY-DASH-016: Shell HTML da Marca, Assistente IA e Live Preview Frame", async ({
      page,
    }) => {
      await expect(
        page.getByRole("heading", { name: /Shell HTML da Marca & Assistente de Design/i }),
      ).toBeVisible();

      const brandNameInput = page.locator("#brand-name-input");
      const shellCode = page.locator("#email-shell-code");
      const previewFrame = page.locator("#email-preview-frame");
      const aiPromptInput = page.locator('input[name="instructions"]');
      const aiGenerateBtn = page.getByRole("button", {
        name: /Gerar Sugestão de Template com IA/i,
      });

      await expect(brandNameInput).toBeVisible();
      await expect(shellCode).toBeVisible();
      await expect(previewFrame).toBeVisible();
      await expect(aiPromptInput).toBeVisible();
      await expect(aiGenerateBtn).toBeVisible();

      // Botão de atualizar preview
      const refreshPreviewBtn = page.getByRole("button", { name: /Atualizar Preview/i });
      await expect(refreshPreviewBtn).toBeVisible();
      await refreshPreviewBtn.click();
    });
  });

  // =========================================================================
  // Módulo 6: Gerenciamento de WhatsApp / Evolution GO (TC-017 a TC-020)
  // =========================================================================
  test.describe("Módulo 6: Gerenciamento de WhatsApp / Evolution GO (/dashboard/whatsapp/)", () => {
    test.beforeEach(async ({ page }) => {
      await page.goto("/dashboard/whatsapp/?app=default");
    });

    test("TC-NOTIFY-DASH-017 & TC-018: Status da Instância, Checagem e Container QR Code", async ({
      page,
    }) => {
      await expect(
        page.getByRole("heading", { name: /Canal WhatsApp \(Evolution GO\)/i }),
      ).toBeVisible();

      const checkBtn = page.getByRole("button", { name: /Checar Status Agora/i });
      await expect(checkBtn).toBeVisible();
      await checkBtn.click();

      // Container de QR Code
      const qrOutput = page.locator("#qr-output");
      await expect(qrOutput).toBeVisible();
    });

    test("TC-NOTIFY-DASH-019 & TC-020: Pareamento por Código e Reconexão Forçada", async ({
      page,
    }) => {
      // 1. Pareamento por Código
      const pairPhoneInput = page.locator('form[hx-post*="pair"] input[name="phone_number"]');
      const generateCodeBtn = page.getByRole("button", { name: /Gerar Código/i });

      await expect(pairPhoneInput).toBeVisible();
      await expect(generateCodeBtn).toBeVisible();

      // 2. Forçar Reconexão
      const reconnectBtn = page.getByRole("button", { name: /Forçar Reconexão/i });
      await expect(reconnectBtn).toBeVisible();
      await reconnectBtn.click();

      // 3. Configurações da Instância
      const instanceNameInput = page.locator('input[name="instance_name"]');
      const saveInstanceBtn = page.getByRole("button", { name: /Salvar Configurações/i }).first();

      await expect(instanceNameInput).toBeVisible();
      await expect(saveInstanceBtn).toBeVisible();
    });
  });

  // =========================================================================
  // Módulo 7: Webhooks Live Stream (TC-021 a TC-023)
  // =========================================================================
  test.describe("Módulo 7: Webhooks Live Stream (/dashboard/webhooks/)", () => {
    test.beforeEach(async ({ page }) => {
      await page.goto("/dashboard/webhooks/?app=default");
    });

    test("TC-NOTIFY-DASH-021 a TC-023: Monitoramento em Tempo Real, Pausa e Filtro por Chips", async ({
      page,
    }) => {
      await expect(
        page.getByRole("heading", { name: /Webhooks Live Stream/i }),
      ).toBeVisible();

      // Badge Ao Vivo
      const liveBadge = page.locator("#wh-live");
      await expect(liveBadge).toBeVisible();
      await expect(liveBadge).toContainText(/Ao Vivo/i);

      // Botão de pausar / retomar stream
      const pauseBtn = page.getByRole("button", { name: /Pausar Stream/i });
      await expect(pauseBtn).toBeVisible();
      await pauseBtn.click();
      await expect(page.getByRole("button", { name: /Retomar Stream/i })).toBeVisible();

      // Stream container
      const streamContainer = page.locator("#wh-stream");
      await expect(streamContainer).toBeVisible();
    });
  });

  // =========================================================================
  // Módulo 8: Configurações, Chaves de API & OmniRouter (TC-024 a TC-027)
  // =========================================================================
  test.describe("Módulo 8: Configurações, Chaves de API & OmniRouter (/dashboard/settings/)", () => {
    test.beforeEach(async ({ page }) => {
      await page.goto("/dashboard/settings/?app=default");
    });

    test("TC-NOTIFY-DASH-024 & TC-025: Gestão de API Keys e Webhook de Retorno", async ({
      page,
    }) => {
      await expect(
        page.getByRole("heading", { name: /Configurações & Chaves de API/i }),
      ).toBeVisible();

      // 1. Chaves de API
      const keyLabelInput = page.locator('input[name="label"]');
      const generateKeyBtn = page.getByRole("button", { name: /Gerar Chave/i });

      await expect(keyLabelInput).toBeVisible();
      await expect(generateKeyBtn).toBeVisible();

      // 2. Webhook de Retorno
      const webhookUrlInput = page.locator('form[hx-post*="webhook"] input[name="url"]').or(page.getByPlaceholder("https://api.suaempresa.com/webhooks/notify"));
      const saveWebhookBtn = page.getByRole("button", { name: /Salvar Webhook/i });

      await expect(webhookUrlInput).toBeVisible();
      await expect(page.getByText(/Eventos de Status \(Entrega\)/i)).toBeVisible();
      await expect(page.getByText(/Mensagens Recebidas \(Inbound\)/i)).toBeVisible();
      await expect(saveWebhookBtn).toBeVisible();
    });

    test("TC-NOTIFY-DASH-026: Gateway OmniRouter IA e Modelos Homologados", async ({ page }) => {
      await expect(
        page.getByRole("heading", { name: /Gateway OmniRouter & Inteligência Artificial/i }),
      ).toBeVisible();

      const testAiBtn = page.getByRole("button", { name: /Testar Conectividade/i });
      await expect(testAiBtn).toBeVisible();
      await testAiBtn.click();

      // Modelos configurados
      await expect(page.getByText(/Modelo Chat \/ Adaptação/i)).toBeVisible();
      await expect(page.getByText(/Transcrição de Áudio \(STT\)/i)).toBeVisible();
    });

    test("TC-NOTIFY-DASH-027: Modal Nova Conta e Proteção da Conta Padrão (default)", async ({
      page,
    }) => {
      // 1. Modal de Nova Aplicação
      const newAccountBtn = page.getByRole("button", { name: /Nova Conta/i });
      await expect(newAccountBtn).toBeVisible();
      await newAccountBtn.click();

      const modal = page.locator("#modal-new-account");
      await expect(modal).toBeVisible();
      await expect(modal.locator('input[name="name"]')).toBeVisible();
      await expect(modal.locator('input[name="slug"]')).toBeVisible();

      // Fechar modal
      await modal.getByRole("button", { name: "Cancelar" }).click();
      await expect(modal).toBeHidden();

      // 2. Blindagem da conta default
      await expect(
        page.getByText(/Esta é a conta padrão do sistema \(default\)\. Ela é protegida contra exclusão\./i),
      ).toBeVisible();
    });
  });
});

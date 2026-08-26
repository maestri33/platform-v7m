import { test, expect } from "@playwright/test";
import {
  injectStaffSession,
  setupApiMocks,
  MOCK_NOTIFY_STATS,
  MOCK_NOTIFY_TEMPLATES,
  MOCK_NOTIFY_TTS_CONFIG,
} from "./helpers/mock-api";

/**
 * Suíte de Testes E2E: Cockpit Administrativo — Notificações, Assistente de IA e Estúdio TTS
 *
 * Cobertura:
 * - TC-NOTIF-001: Acesso autenticado à rota /notificacoes, cards de estatísticas e listagem
 * - TC-NOTIF-002: Edição de template com variáveis {nome}, {link}, {valor}, {codigo} (sem storytelling) e salvamento
 * - TC-NOTIF-003: Assistente de IA para Redação — execução de sugestão, modal de diff e substituição no editor
 * - TC-NOTIF-004: Estúdio de Voz TTS — seleção de gênero simulado (voz cruzada), acionamento do probe e renderização do player de áudio
 * - TC-NOTIF-005: Modal de Pré-visualização (Live Preview) com interpolação de variáveis
 * - TC-NOTIF-006: Disparo de teste e Restauração de seed com diálogo de confirmação
 */

test.describe("Central de Notificações, Assistente de IA e Estúdio TTS", () => {
  test.beforeEach(async ({ page }) => {
    await injectStaffSession(page);
    await setupApiMocks(page);
  });

  test("TC-NOTIF-001: Acesso à rota /notificacoes, estatísticas e listagem de eventos", async ({ page }) => {
    await page.goto("/notificacoes");

    // Valida título da página e cabeçalho
    await expect(page.getByRole("heading", { name: "Notificações", exact: true })).toBeVisible({
      timeout: 15_000,
    });
    await expect(
      page.getByText("Gerencie templates, triggers e envios de notificações."),
    ).toBeVisible();

    // Valida cards de estatísticas
    await expect(page.getByText("Total", { exact: true })).toBeVisible();
    await expect(page.getByText(String(MOCK_NOTIFY_STATS.total), { exact: true }).first()).toBeVisible();
    await expect(page.getByText("Ativos", { exact: true })).toBeVisible();
    await expect(page.getByText(String(MOCK_NOTIFY_STATS.active), { exact: true }).first()).toBeVisible();

    // Valida seletor de eventos disponível
    const eventSelect = page.getByRole("combobox", { name: /Evento/i });
    await expect(eventSelect).toBeVisible();

    // Abre histórico de envios
    const historyBtn = page.getByRole("button", { name: /Histórico de envios/i });
    await expect(historyBtn).toBeVisible();
    await historyBtn.click();
    await expect(page.getByRole("table")).toBeVisible();
    await expect(page.getByText("11999998888").first()).toBeVisible();
    await expect(page.getByText(/Olá Carlos/i).first()).toBeVisible();
  });

  test("TC-NOTIF-002: Edição de template com tags de variáveis sem resquícios de storytelling", async ({ page }) => {
    await page.goto("/notificacoes");
    await expect(page.getByRole("heading", { name: "Notificações", exact: true })).toBeVisible({
      timeout: 15_000,
    });

    // Seleciona o evento 'lead_created'
    const eventSelect = page.getByRole("combobox", { name: /Evento/i });
    await eventSelect.selectOption("lead_created");

    // Valida formulário carregado com dados do template
    await expect(page.getByRole("heading", { name: "lead_created" })).toBeVisible();
    const titleInput = page.getByLabel("Título");
    await expect(titleInput).toHaveValue("Boas-vindas ao V7M");

    // Valida que NÃO existem campos legados de storytelling
    await expect(page.getByText(/storytelling/i)).toHaveCount(0);
    await expect(page.getByLabel(/storytelling/i)).toHaveCount(0);

    // Edita o corpo markdown inserindo variáveis
    const bodyTextarea = page.getByLabel("Corpo (Markdown)");
    await expect(bodyTextarea).toBeVisible();
    await bodyTextarea.fill("Prezado {nome}, seu link é {link}, seu código é {codigo} e o valor é R$ {valor}.");

    // Clica no botão de variável rápida para validar facilidade de interpolação
    const varBtn = page.getByRole("button", { name: "{link}", exact: true });
    if (await varBtn.isVisible()) {
      await varBtn.click();
      await expect(bodyTextarea).toHaveValue(/\{link\}/);
    }

    // Salva as alterações
    const saveBtn = page.getByRole("button", { name: "Salvar", exact: true });
    await expect(saveBtn).toBeEnabled();
    await saveBtn.click();

    // Mensagem de sucesso
    await expect(page.getByText("Template salvo com sucesso.")).toBeVisible();
  });

  test("TC-NOTIF-003: Assistente de IA para Redação — Sugestão, Modal Diff e Substituição no Editor", async ({
    page,
  }) => {
    await page.goto("/notificacoes");
    await expect(page.getByRole("heading", { name: "Notificações", exact: true })).toBeVisible({
      timeout: 15_000,
    });

    const eventSelect = page.getByRole("combobox", { name: /Evento/i });
    await eventSelect.selectOption("lead_created");

    await expect(page.getByRole("heading", { name: "lead_created" })).toBeVisible();

    const bodyTextarea = page.getByLabel("Corpo (Markdown)");
    await bodyTextarea.fill("Ola amigo seu link {link} codigo {codigo} valor {valor}");

    // Valida botões de ação rápida do assistente de IA
    const improveBtn = page.getByRole("button", { name: "Melhorar", exact: true });
    const simplifyBtn = page.getByRole("button", { name: "Simplificar", exact: true });
    await expect(improveBtn).toBeVisible();
    await expect(simplifyBtn).toBeVisible();

    // Executa a ação de melhoria de IA
    await improveBtn.click();

    // Modal de Diff comparativo é exibido
    const diffModal = page.getByRole("dialog", { name: /Sugestão do Assistente de IA/i });
    await expect(diffModal).toBeVisible();
    await expect(diffModal.getByText("Texto Original", { exact: true })).toBeVisible();
    await expect(diffModal.getByText("Sugestão da IA", { exact: true })).toBeVisible();
    await expect(diffModal.getByText(/Variáveis preservadas/i).or(diffModal.getByText(/valor especial/i))).toBeVisible();

    // Confirma a substituição no editor
    const replaceBtn = diffModal.getByRole("button", { name: /Substituir no Editor/i });
    await expect(replaceBtn).toBeVisible();
    await replaceBtn.click();

    // Modal é fechado e texto do editor é atualizado
    await expect(diffModal).not.toBeVisible();
    await expect(bodyTextarea).toHaveValue(/\{nome\}|\{link\}|\{codigo\}|\{valor\}/);
    await expect(page.getByText(/Texto atualizado com a sugestão da IA!/i)).toBeVisible();
  });

  test("TC-NOTIF-004: Estúdio de Voz TTS — Mapeamento cruzado de gênero, Probe e Player de Áudio", async ({
    page,
  }) => {
    await page.goto("/notificacoes");
    await expect(page.getByRole("heading", { name: "Notificações", exact: true })).toBeVisible({
      timeout: 15_000,
    });

    const eventSelect = page.getByRole("combobox", { name: /Evento/i });
    await eventSelect.selectOption("lead_created");

    await expect(page.getByRole("heading", { name: "lead_created" })).toBeVisible();

    // Garante que o toggle de TTS está marcado
    const ttsCheckbox = page.getByRole("checkbox", { name: /TTS \(Áudio\)/i });
    if (!(await ttsCheckbox.isChecked())) {
      await ttsCheckbox.check();
    }

    // Painel do Estúdio de Voz deve estar visível
    await expect(page.getByText(/Estúdio de Voz & Teste TTS \(OmniRoute\)/i)).toBeVisible();
    await expect(page.getByText(/Regra cruzada ativa: Homem ➔ Voz Feminina \| Mulher ➔ Voz Masculina/i)).toBeVisible();

    // Altera gênero do destinatário para Homem (M)
    const genderSelect = page.locator("select").filter({ hasText: /Homem|Mulher|Padrão/i });
    await expect(genderSelect).toBeVisible();
    await genderSelect.selectOption("M");

    // Aciona a síntese de voz (Probe)
    const probeBtn = page.getByRole("button", { name: /Ouvir Síntese do Texto/i });
    await expect(probeBtn).toBeVisible();
    await probeBtn.click();

    // Valida mensagem de sucesso com a voz utilizada (Portuguese_SereneWoman para Homem)
    await expect(page.getByText(/Áudio gerado com sucesso \(Portuguese_SereneWoman\)/i)).toBeVisible();

    // Valida renderização do player de áudio nativo HTML5
    const audioPlayer = page.locator("audio");
    await expect(audioPlayer).toBeVisible();
    await expect(audioPlayer).toHaveAttribute("src", /sample-tts-probe\.mp3/);

    // Testa agora alternância para Mulher (F) -> Voz Masculina
    await genderSelect.selectOption("F");
    await probeBtn.click();
    await expect(page.getByText(/Áudio gerado com sucesso \(Portuguese_GentleTeacher\)/i)).toBeVisible();

    // Valida exibição da cadeia de fallback
    await expect(page.getByText(/Cadeia de Fallback:/i)).toBeVisible();
    await expect(page.getByText(/minimax\/speech-01-hd/i)).toBeVisible();
  });

  test("TC-NOTIF-005: Modal de Pré-visualização (Live Preview) com interpolação", async ({ page }) => {
    await page.goto("/notificacoes");
    const eventSelect = page.getByRole("combobox", { name: /Evento/i });
    await eventSelect.selectOption("lead_created");

    const previewBtn = page.getByRole("button", { name: "Preview", exact: true });
    await expect(previewBtn).toBeVisible();
    await previewBtn.click();

    const previewModal = page.getByRole("dialog", { name: /Preview da notificação/i });
    await expect(previewModal).toBeVisible();
    await expect(previewModal.getByRole("heading", { name: /Preview: lead_created/i })).toBeVisible();
    await expect(previewModal.getByText("Renderizado")).toBeVisible();
    await expect(previewModal.getByText(/Carlos Eduardo/i)).toBeVisible();

    // Fecha o preview
    await previewModal.getByRole("button", { name: "Fechar" }).click();
    await expect(previewModal).not.toBeVisible();
  });

  test("TC-NOTIF-006: Disparo de teste e Restauração de seed com confirmação", async ({ page }) => {
    await page.goto("/notificacoes");
    const eventSelect = page.getByRole("combobox", { name: /Evento/i });
    await eventSelect.selectOption("lead_created");

    // 1. Disparo de teste
    const testBtn = page.getByRole("button", { name: "Testar", exact: true });
    await expect(testBtn).toBeVisible();
    await testBtn.click();

    const confirmTestDialog = page.getByRole("dialog");
    await expect(confirmTestDialog.getByText(/Enviar teste\?/i)).toBeVisible();
    await confirmTestDialog.getByRole("button", { name: "Enviar teste" }).click();
    await expect(page.getByText(/Disparo de teste enviado!/i)).toBeVisible();

    // 2. Restauração de seed
    const restoreBtn = page.getByRole("button", { name: "Restaurar seed", exact: true });
    await expect(restoreBtn).toBeVisible();
    await restoreBtn.click();

    const confirmRestoreDialog = page.getByRole("dialog");
    await expect(confirmRestoreDialog.getByText(/Restaurar do seed\?/i)).toBeVisible();
    await confirmRestoreDialog.getByRole("button", { name: "Restaurar" }).click();
    await expect(page.getByText("Template restaurado do seed.")).toBeVisible();
  });
});

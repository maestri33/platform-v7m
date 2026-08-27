import { test, expect } from "@playwright/test";
import { injectStaffSession, setupApiMocks } from "./helpers/mock-api";

// spec: specs/full_audit.plan.md (Seção 3.1)
// seed: tests/e2e/seed.spec.ts

test.describe("2. Cockpit do Administrador e Navegação", () => {
  test.beforeEach(async ({ page }) => {
    await injectStaffSession(page);
    await setupApiMocks(page);
  });

  test("2.1 Renderização do Cockpit e KPIs Principais", async ({ page }) => {
    await page.goto("/dashboard");

    // Valida título da aplicação e cockpit (Bento Hero tile)
    await expect(
      page.getByRole("heading", { name: "Cockpit do Administrador" }),
    ).toBeVisible({ timeout: 15_000 });

    // Valida cards mestres do Bento Grid
    await expect(page.getByRole("heading", { name: "Polos de Atendimento" }).first()).toBeVisible();
    await expect(page.getByRole("heading", { name: "Leads em Captação" }).first()).toBeVisible();
    await expect(page.getByRole("heading", { name: /Saldo & Fechamento/ }).first()).toBeVisible();
    await expect(page.getByRole("heading", { name: "Estado do Servidor" }).first()).toBeVisible();

    // Valida navegação lateral
    const nav = page.getByRole("navigation", { name: "Seções" });
    await expect(nav).toBeVisible();
    await expect(nav.getByRole("link", { name: "Visão geral" })).toBeVisible();
    await expect(nav.getByRole("link", { name: "Financeiro" })).toBeVisible();
    await expect(nav.getByRole("link", { name: "Alunos" })).toBeVisible();
  });

  test("2.2 Alternância de Abas Superiores do Dashboard", async ({ page }) => {
    await page.goto("/dashboard");
    await expect(
      page.getByRole("heading", { name: "Cockpit do Administrador" }),
    ).toBeVisible({ timeout: 15_000 });

    // 1. Aba Todos os Leads
    await page.getByRole("button", { name: /Todos os Leads/i }).click();
    await expect(page.getByRole("heading", { name: "Gestão Completa de Leads" })).toBeVisible();
    await expect(page.getByText("Fernanda Costa")).toBeVisible();

    // 2. Aba Alunos & Matrículas
    await page.getByRole("button", { name: /Alunos & Matrículas/i }).click();
    await expect(page.getByText("Carlos Eduardo Silva").first()).toBeVisible();

    // 3. Aba Promotores & Equipe
    await page.getByRole("button", { name: /Promotores & Equipe/i }).click();
    await expect(page.getByText("Lucas Rocha").first()).toBeVisible();

    // 4. Aba Coordenadores
    await page.getByRole("button", { name: /Coordenadores/i }).click();
    await expect(page.getByText("Mariana Souza").first()).toBeVisible();

    // 5. Aba Mensagens & Notificações
    await page.getByRole("button", { name: /Mensagens & Notificações/i }).click();
    await expect(page.getByRole("heading", { name: /Editor de Mensagens e Notificações|Mensagens & Notificações/i })).toBeVisible();

    // 6. Retorna para Visão Geral & Polos — Bento grid reappears
    await page.getByRole("button", { name: /Visão Geral & Polos/i }).click();
    await expect(page.getByRole("heading", { name: /Cockpit do Administrador|Polos de Atendimento/i }).first()).toBeVisible();
  });

  test("2.3 Abertura e Fechamento do Drawer de Gestor de Polo", async ({ page }) => {
    await page.goto("/dashboard");
    await expect(
      page.getByRole("heading", { name: "Cockpit do Administrador" }),
    ).toBeVisible({ timeout: 15_000 });

    // Clica no botão Visão de Gestor no header
    const gestorButton = page.getByRole("button", { name: "Visão de Gestor" });
    await expect(gestorButton).toBeVisible();
    await gestorButton.click();

    // Valida abertura lateral do Drawer do Gestor
    await expect(page.getByText(/Visão do Gestor/i).first()).toBeVisible();

    // Fecha o modo gestor
    const closeGestorBtn = page.getByRole("button", { name: "Sair do Modo Gestor" });
    await expect(closeGestorBtn).toBeVisible();
    await closeGestorBtn.click();

    // Drawer fecha
    await expect(page.getByText("Visualizando a plataforma sob a ótica operacional")).not.toBeVisible();
  });

  test("2.4 Modal de Criação de Polo pelo Dashboard", async ({ page }) => {
    await page.goto("/dashboard");
    await expect(
      page.getByRole("heading", { name: "Cockpit do Administrador" }),
    ).toBeVisible({ timeout: 15_000 });

    // Clica no botão Novo Polo no header
    const newPoloBtn = page.getByRole("button", { name: "Novo Polo" }).first();
    await expect(newPoloBtn).toBeVisible();
    await newPoloBtn.click();

    // Valida modal de criação aberto
    await expect(page.getByRole("heading", { name: "Criar Novo Polo" })).toBeVisible();
    await expect(page.getByText("Marca do Polo (Catálogo)")).toBeVisible();
    await expect(page.getByText("Coordenador do Polo")).toBeVisible();

    // Preenche CEP e valida autopreenchimento
    const cepInput = page.getByRole("dialog").getByLabel("CEP");
    await cepInput.fill("01310100");
    await cepInput.blur();

    await expect(page.getByLabel("Logradouro / Rua")).toHaveValue(/Paulista/i);
    await expect(page.getByRole("dialog").getByLabel("Bairro")).toHaveValue(/Bela Vista/i);
    await expect(page.getByRole("dialog").getByLabel("Cidade")).toHaveValue(/São Paulo/i);

    // Fecha modal
    await page.getByRole("button", { name: "Cancelar" }).click();
    await expect(page.getByRole("heading", { name: "Criar Novo Polo" })).not.toBeVisible();
  });

  test("2.5 Logout Seguro", async ({ page }) => {
    await page.goto("/dashboard");
    await expect(
      page.getByRole("heading", { name: "Cockpit do Administrador" }),
    ).toBeVisible({ timeout: 15_000 });

    // Clica no botão Sair da navegação lateral
    const logoutButton = page.getByRole("button", { name: /sair/i });
    await expect(logoutButton).toBeVisible();
    await logoutButton.click();

    // Deve redirecionar para o login
    await expect(page).toHaveURL(/.*login/);
    await expect(page.getByRole("heading", { name: "Acesso do staff" })).toBeVisible();
  });
});

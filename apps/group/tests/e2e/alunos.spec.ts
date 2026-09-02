import { test, expect } from "@playwright/test";
import { injectStaffSession, setupApiMocks } from "./helpers/mock-api";

// spec: specs/full_audit.plan.md (Seção 3.2)
// seed: tests/e2e/seed.spec.ts

test.describe("3. Gestão de Alunos e Matrículas", () => {
  test.beforeEach(async ({ page }) => {
    await injectStaffSession(page);
    await setupApiMocks(page);
  });

  test("3.1 Filtragem Combinada de Alunos (Texto + Polo)", async ({ page }) => {
    await page.goto("/alunos");

    // Valida carregamento da página e cabeçalho
    await expect(page.getByRole("heading", { name: "Alunos & Matrículas" })).toBeVisible();

    // Valida exibição dos alunos mockados
    await expect(page.getByText("Carlos Eduardo Silva").first()).toBeVisible();
    await expect(page.getByText("Juliana Mendes").first()).toBeVisible();

    // 1. Filtro por texto
    const searchInput = page.getByPlaceholder(/Buscar por nome/i);
    await expect(searchInput).toBeVisible();
    await searchInput.fill("Carlos");

    // Valida que apenas o aluno buscado permaneceu visível
    await expect(page.getByText("Carlos Eduardo Silva").first()).toBeVisible();
    await expect(page.getByText("Juliana Mendes")).not.toBeVisible();

    // Limpa a busca
    await searchInput.clear();
    await expect(page.getByText("Juliana Mendes").first()).toBeVisible();

    // 2. Filtro por Polo no combobox
    const poloSelect = page.getByLabel("Filtrar alunos por polo");
    await expect(poloSelect).toBeVisible();
    await poloSelect.selectOption("hub-ext-2");

    // Deve exibir apenas o aluno do Polo 2 (Juliana Mendes)
    await expect(page.getByText("Juliana Mendes").first()).toBeVisible();
    await expect(page.getByText("Carlos Eduardo Silva")).not.toBeVisible();
  });

  test("3.2 Alternância de Sub-abas e Contadores", async ({ page }) => {
    await page.goto("/alunos");

    // Valida botões de sub-aba com contadores
    const studentsBtn = page.getByRole("button", { name: /Alunos \(\d+\)/i });
    const matriculasBtn = page.getByRole("button", { name: /Matrículas \(\d+\)/i });

    await expect(studentsBtn).toBeVisible();
    await expect(matriculasBtn).toBeVisible();

    // Alterna para a sub-aba de Matrículas
    await matriculasBtn.click();

    // Valida listagem das matrículas
    await expect(page.getByText("Carlos Eduardo Silva").first()).toBeVisible();
    await expect(page.getByText("Juliana Mendes").first()).toBeVisible();

    // Retorna para Alunos
    await studentsBtn.click();
    await expect(page.getByText("Carlos Eduardo Silva").first()).toBeVisible();
  });

  test("3.3 Edição de Credenciais EAD da Plataforma", async ({ page }) => {
    await page.goto("/alunos");
    await expect(page.getByRole("heading", { name: "Alunos & Matrículas" })).toBeVisible();

    // Clica no botão de Credenciais do aluno Carlos Eduardo Silva
    const credsBtn = page.getByRole("button", { name: "Credenciais Plataforma" }).first();
    await expect(credsBtn).toBeVisible();
    await credsBtn.click();

    // Valida abertura do modal
    await expect(page.getByRole("heading", { name: "Credenciais da Plataforma" })).toBeVisible();
    await expect(page.getByRole("dialog").getByText("Carlos Eduardo Silva")).toBeVisible();

    // Preenche login e senha
    await page.getByLabel("Login da Plataforma").fill("carlos.ead@v7m.com.br");
    await page.getByLabel("Senha da Plataforma").fill("SenhaForte@2026");

    // Submete o formulário
    const submitBtn = page.getByRole("button", { name: "Salvar Credenciais" });
    await submitBtn.click();

    // Valida feedback de sucesso
    await expect(page.getByText("Credenciais da plataforma salvas com sucesso!")).toBeVisible();
  });
});

import { test, expect } from "@playwright/test";
import { injectStaffSession, setupApiMocks } from "./helpers/mock-api";

// spec: specs/full_audit.plan.md (Seção 3.6)
// seed: tests/e2e/seed.spec.ts

test.describe("9. Gestão de Lideranças e Coordenadores", () => {
  test.beforeEach(async ({ page }) => {
    await injectStaffSession(page);
    await setupApiMocks(page);
  });

  test("9.1 Renderização de Coordenadores e Métricas Agregadas", async ({ page }) => {
    await page.goto("/coordenadores");

    // Valida Header
    await expect(page.getByRole("heading", { name: "Lideranças & Coordenadores" })).toBeVisible();

    // Valida os 5 StatCards principais
    await expect(page.locator("#conteudo").getByText("Coordenadores", { exact: true })).toBeVisible();
    await expect(page.getByText("Polos Geridos")).toBeVisible();
    await expect(page.getByText("Promotores na Rede")).toBeVisible();
    await expect(page.getByText("Alunos nos Polos")).toBeVisible();
    await expect(page.getByText("Comissões Acumuladas")).toBeVisible();

    // Valida card do coordenador
    await expect(page.getByRole("heading", { name: "Mariana Souza" })).toBeVisible();
    await expect(page.getByText("(11) 97777-6666")).toBeVisible();
  });

  test("9.2 Filtro e Busca em Tempo Real", async ({ page }) => {
    await page.goto("/coordenadores");

    const searchInput = page.getByPlaceholder("Buscar por nome, telefone, CPF ou polo...");
    await expect(searchInput).toBeVisible();

    // Busca existente
    await searchInput.fill("Mariana");
    await expect(page.getByRole("heading", { name: "Mariana Souza" })).toBeVisible();

    // Busca por polo
    await searchInput.fill("wyden");
    await expect(page.getByRole("heading", { name: "Mariana Souza" })).toBeVisible();

    // Busca inexistente
    await searchInput.fill("Nenhum Coordenador XYZ");
    await expect(page.getByText(/Nenhum coordenador/)).toBeVisible();
  });

  test("9.3 Resgate de Telefone do Coordenador", async ({ page }) => {
    await page.goto("/coordenadores");
    await expect(page.getByRole("heading", { name: "Lideranças & Coordenadores" })).toBeVisible();

    // Clica no botão Resgatar / Trocar Telefone
    const rescueBtn = page.getByRole("button", { name: "Resgatar / Trocar Telefone" }).first();
    await expect(rescueBtn).toBeVisible();
    await rescueBtn.click();

    // Valida modal de resgate aberto
    await expect(page.getByRole("heading", { name: "Resgate de Telefone de Login" })).toBeVisible();
    await expect(page.getByRole("dialog").getByText("Mariana Souza")).toBeVisible();

    // Preenche novo número
    const phoneInput = page.getByLabel("Novo Número de WhatsApp");
    await phoneInput.fill("11988889999");

    // Submete a troca
    const submitBtn = page.getByRole("button", { name: "Atualizar Telefone" });
    await submitBtn.click();

    // Valida feedback de sucesso
    await expect(page.getByText("Telefone de login alterado com sucesso!")).toBeVisible();
  });
});

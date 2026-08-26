import { test, expect } from "@playwright/test";
import { injectStaffSession, setupApiMocks } from "./helpers/mock-api";

// spec: specs/full_audit.plan.md (Seção 3.5)
// seed: tests/e2e/seed.spec.ts

test.describe("5. Gestão de Polos", () => {
  test.beforeEach(async ({ page }) => {
    await injectStaffSession(page);
    await setupApiMocks(page);
  });

  test("5.1 Listagem e Estrutura de Polos", async ({ page }) => {
    await page.goto("/polos");

    // Valida título e subtítulo da página
    await expect(page.getByRole("heading", { name: "Polos", exact: true })).toBeVisible();
    await expect(page.getByText("Cadastre polos, defina coordenadores")).toBeVisible();

    // Valida formulário de cadastro
    await expect(page.getByRole("heading", { name: /Novo Polo/i })).toBeVisible();
    await expect(page.getByRole("button", { name: "Criar Polo Completo" })).toBeVisible();

    // Valida polos listados
    await expect(page.getByText("Polo Central SP").or(page.getByText("WYDEN"))).toBeVisible();
  });

  test("5.2 Validação de Formulário ao Criar Polo sem Dados", async ({ page }) => {
    await page.goto("/polos");

    // Tenta submeter sem selecionar coordenador
    const submitBtn = page.getByRole("button", { name: "Criar Polo Completo" });
    await submitBtn.click();

    // Deve exibir erro de validação
    await expect(
      page.getByText("Selecione obrigatoriamente um promotor ativo como coordenador."),
    ).toBeVisible();
  });

  test("5.3 Preenchimento Automático de CEP e Criação de Novo Polo", async ({ page }) => {
    await page.goto("/polos");

    // Preenche marca
    await page.getByLabel("Marca do Polo (Catálogo)").fill("cruzeiro");

    // Seleciona Coordenador
    await page.getByLabel("Promotor Coordenador (Obrigatório)").selectOption("prom-1");

    // Preenche CEP e dispara blur para ViaCEP
    const cepInput = page.getByLabel("CEP");
    await cepInput.fill("01310-100");
    await cepInput.dispatchEvent("blur");

    // Valida que os campos de endereço foram preenchidos
    await expect(page.getByLabel("Logradouro")).toHaveValue(/Paulista/i);
    await expect(page.getByLabel("Bairro")).toHaveValue(/Bela Vista/i);
    await expect(page.getByLabel("Cidade")).toHaveValue(/São Paulo/i);
    await expect(page.getByLabel("UF")).toHaveValue("SP");

    // Submete a criação
    await page.getByRole("button", { name: "Criar Polo Completo" }).click();

    // Valida feedback de sucesso
    await expect(
      page.getByText("Polo criado com coordenador e endereço vinculados com sucesso."),
    ).toBeVisible();
  });

  test("5.4 Edição Inline de Coordenador e Endereço", async ({ page }) => {
    await page.goto("/polos");

    // Clica no botão Coordenador no primeiro card de polo
    const coordBtn = page.getByRole("button", { name: "Coordenador" }).first();
    await expect(coordBtn).toBeVisible();
    await coordBtn.click();

    // Valida abertura do painel inline
    await expect(page.getByText("Coordenador do polo")).toBeVisible();
    await expect(page.getByRole("button", { name: "Salvar coordenador" })).toBeVisible();

    // Clica no botão Endereço para abrir o painel de endereço
    const addrBtn = page.getByRole("button", { name: "Endereço" }).first();
    await addrBtn.click();

    // Valida abertura do painel de endereço
    await expect(page.getByText(/O endereço é preenchido pelo CEP/i)).toBeVisible();
    await expect(page.getByRole("button", { name: "Salvar endereço" })).toBeVisible();
  });

  test("5.5 Tornar Polo Padrão (Modal de Confirmação)", async ({ page }) => {
    await page.goto("/polos");

    // No segundo polo (não padrão), clica em Tornar padrão
    const makeDefaultBtn = page.getByRole("button", { name: "Tornar padrão" }).first();
    if (await makeDefaultBtn.isVisible()) {
      await makeDefaultBtn.click();

      // Valida abertura do ConfirmDialog
      await expect(page.getByRole("heading", { name: "Tornar este o polo padrão?" })).toBeVisible();

      // Confirma
      const confirmActionBtn = page.getByRole("button", { name: "Tornar padrão" }).last();
      await confirmActionBtn.click();

      // Modal fecha
      await expect(page.getByRole("heading", { name: "Tornar este o polo padrão?" })).not.toBeVisible();
    }
  });
});

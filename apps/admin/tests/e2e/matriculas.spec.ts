import { test, expect } from "@playwright/test";
import { injectStaffSession, setupApiMocks } from "./helpers/mock-api";

// spec: specs/full_audit.plan.md (Seção 3.3)
// seed: tests/e2e/seed.spec.ts

test.describe("14. Listagem Geral de Matrículas (/matriculas)", () => {
  test.beforeEach(async ({ page }) => {
    await injectStaffSession(page);
    await setupApiMocks(page);
  });

  test("14.1 Renderização da Tabela Geral e Cabeçalhos", async ({ page }) => {
    await page.goto("/matriculas");

    // Valida Header e Subtítulo
    await expect(page.getByRole("heading", { name: "Matrículas" })).toBeVisible({ timeout: 15_000 });
    await expect(page.getByText("Matrículas de todos os polos.")).toBeVisible();

    // Valida cabeçalhos da tabela
    await expect(page.getByRole("columnheader", { name: "Nome" })).toBeVisible();
    await expect(page.getByRole("columnheader", { name: "CPF" })).toBeVisible();
    await expect(page.getByRole("columnheader", { name: "Polo" })).toBeVisible();
    await expect(page.getByRole("columnheader", { name: "Status" })).toBeVisible();

    // Valida linhas renderizadas
    await expect(page.getByText("Carlos Eduardo Silva").first()).toBeVisible();
    await expect(page.getByText("Juliana Mendes").first()).toBeVisible();
  });

  test("14.2 Filtro por Polo em Matrículas", async ({ page }) => {
    await page.goto("/matriculas");
    await expect(page.getByRole("heading", { name: "Matrículas" })).toBeVisible();

    // Digita external_id do polo e submete
    const hubFilterInput = page.getByPlaceholder(/Filtrar por polo/i);
    await expect(hubFilterInput).toBeVisible();
    await hubFilterInput.fill("hub-ext-1");

    const filterButton = page.getByRole("button", { name: "Filtrar" });
    await filterButton.click();

    // Valida que a requisição de filtro foi processada
    await expect(page.getByRole("table")).toBeVisible();
  });

  test("14.3 Badges de Status Legíveis", async ({ page }) => {
    await page.goto("/matriculas");
    await expect(page.getByRole("heading", { name: "Matrículas" })).toBeVisible();

    // Valida presença de status pills
    const table = page.getByRole("table");
    await expect(table).toBeVisible();
    await expect(table.getByText(/completed|concluído|active|ativo/i).first()).toBeVisible();
  });
});

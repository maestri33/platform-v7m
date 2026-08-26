import { test, expect } from "@playwright/test";
import { injectStaffSession, setupApiMocks } from "./helpers/mock-api";

// spec: specs/full_audit.plan.md (Seção 3.8)
// seed: tests/e2e/seed.spec.ts

test.describe("11. Rede de Promotores e Hierarquia de Captação", () => {
  test.beforeEach(async ({ page }) => {
    await injectStaffSession(page);
    await setupApiMocks(page);
  });

  test("11.1 Renderização da Árvore de Rede e Métricas", async ({ page }) => {
    await page.goto("/rede");

    // Valida Header e KPIs consolidados
    await expect(page.getByRole("heading", { name: "Rede & Hierarquia de Captação" })).toBeVisible({ timeout: 15_000 });
    await expect(page.getByText("Polos Ativos")).toBeVisible();
    await expect(page.getByText("Promotores na Rede")).toBeVisible();
    await expect(page.getByText("Matrículas Pagas")).toBeVisible();
    await expect(page.getByText("Taxa de Conversão")).toBeVisible();

    // Valida nó de polo na árvore
    await expect(page.getByText("Mariana Souza")).toBeVisible();
    await expect(page.getByText("Lucas Rocha")).toBeVisible();
  });

  test("11.2 Expansão e Recolhimento de Nós de Polos", async ({ page }) => {
    await page.goto("/rede");
    await expect(page.getByText("Lucas Rocha")).toBeVisible({ timeout: 15_000 });

    // Clica no cabeçalho do polo para recolher
    const poloHeader = page.getByText(/Polo wyden/i);
    await poloHeader.click();

    // Promotor vinculado é recolhido
    await expect(page.getByText("Lucas Rocha")).not.toBeVisible();

    // Clica novamente para expandir
    await poloHeader.click();
    await expect(page.getByText("Lucas Rocha")).toBeVisible();
  });

  test("11.3 Busca e Filtragem na Árvore de Afiliados", async ({ page }) => {
    await page.goto("/rede");

    const searchInput = page.getByPlaceholder("Buscar polo, coordenador ou promotor...");
    await expect(searchInput).toBeVisible();

    // Busca por promotor existente
    await searchInput.fill("Lucas");
    await expect(page.getByText("Lucas Rocha")).toBeVisible();

    // Busca inexistente
    await searchInput.fill("Promotor Inexistente 999");
    await expect(page.getByText("Nenhum nó de rede encontrado")).toBeVisible();
  });
});

import { test, expect } from "@playwright/test";
import {
  injectStaffSession,
  injectCoordinatorSession,
  injectPromoterSession,
  setupApiMocks,
} from "./helpers/mock-api";

test.describe("Portal Unificado — RBAC Cumulativo & Context Switcher", () => {
  test("1. Admin Master possui acesso irrestrito e pode alternar contextos", async ({ page }) => {
    await injectStaffSession(page);
    await setupApiMocks(page);

    await page.goto("/dashboard");
    await expect(page.getByRole("heading", { name: /Cockpit do Administrador/i })).toBeVisible({
      timeout: 15_000,
    });

    // Switcher de Contexto presente
    const switcher = page.getByTestId("context-switcher-trigger");
    if (await switcher.isVisible()) {
      await switcher.click();
      await expect(page.getByText(/Liderança Regional|Minhas Vendas/i).first()).toBeVisible({ timeout: 10_000 });
    }

    // Acessa rota de Hub
    await page.goto("/hub");
    await expect(page.getByRole("heading", { name: /Visão Geral do Polo/i })).toBeVisible({ timeout: 15_000 });

    // Acessa rota de Promotor
    await page.goto("/vendas");
    await expect(page.getByRole("heading", { name: /Central de Vendas|Minhas Vendas/i })).toBeVisible({ timeout: 15_000 });
  });

  test("2. Coordenador de Polo acessa /hub e /vendas, mas é barrado em rotas de Master Staff", async ({
    page,
  }) => {
    await injectCoordinatorSession(page);
    await setupApiMocks(page);

    // Hub OK
    await page.goto("/hub");
    await expect(page.getByRole("heading", { name: /Visão Geral do Polo/i })).toBeVisible({ timeout: 15_000 });

    // Vendas OK
    await page.goto("/vendas");
    await expect(page.getByRole("heading", { name: /Central de Vendas|Minhas Vendas/i })).toBeVisible({ timeout: 15_000 });

    // Tentar acessar rota exclusiva de Master (financeiro global) deve redirecionar para /hub
    await page.goto("/financeiro");
    await expect(page).toHaveURL(/.*hub/, { timeout: 15_000 });
  });

  test("3. Promotor acessa /vendas e /onboarding, mas é barrado em /hub e /dashboard", async ({
    page,
  }) => {
    await injectPromoterSession(page);
    await setupApiMocks(page);

    // Vendas OK
    await page.goto("/vendas");
    await expect(page.getByRole("heading", { name: /Central de Vendas|Minhas Vendas/i })).toBeVisible({ timeout: 15_000 });

    // Onboarding OK
    await page.goto("/onboarding");
    await expect(page.getByRole("heading", { name: /Ativação de Promotor/i })).toBeVisible({ timeout: 15_000 });

    // Tentativa em /hub redireciona para /vendas
    await page.goto("/hub");
    await expect(page).toHaveURL(/.*vendas/, { timeout: 15_000 });

    // Tentativa em /dashboard redireciona para /vendas
    await page.goto("/dashboard");
    await expect(page).toHaveURL(/.*vendas/, { timeout: 15_000 });
  });
});

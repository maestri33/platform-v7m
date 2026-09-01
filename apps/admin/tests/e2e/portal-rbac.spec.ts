import { test, expect } from "@playwright/test";
import {
  injectStaffSession,
  injectCoordinatorSession,
  injectPromoterSession,
  setupApiMocks,
} from "./helpers/mock-api";

test.describe("Portal Unificado — RBAC Cumulativo & Segregação de Escopos (/promoter, /hub, /admin)", () => {
  test("1. Admin Master possui acesso irrestrito e pode alternar contextos", async ({ page }) => {
    await injectStaffSession(page);
    await setupApiMocks(page);

    await page.goto("/dashboard");
    await expect(page.getByRole("heading", { name: /Cockpit do Administrador|Painel/i })).toBeVisible({
      timeout: 15_000,
    });

    // Header: Admin Master vê atalhos para Hub Regional e Painel Master
    await expect(page.getByRole("link", { name: /Hub Regional/i })).toBeVisible({ timeout: 10_000 });
    await expect(page.getByRole("link", { name: /Painel Master/i })).toBeVisible({ timeout: 10_000 });

    // Switcher de Contexto presente
    const switcher = page.getByTestId("context-switcher-trigger");
    if (await switcher.isVisible()) {
      await switcher.click();
      await expect(page.getByText(/Liderança Regional|Minhas Vendas|Portal do Promotor/i).first()).toBeVisible({ timeout: 10_000 });
    }

    // Acessa rota de Hub
    await page.goto("/hub");
    await expect(page.getByRole("heading", { name: /Visão Geral do Polo|Hub/i })).toBeVisible({ timeout: 15_000 });

    // Acessa rota de Promotor
    await page.goto("/promoter");
    await expect(page.getByRole("heading", { name: /Portal do Promotor|Minhas Vendas/i })).toBeVisible({ timeout: 15_000 });
  });

  test("2. Coordenador de Polo acessa /hub e /promoter, vê atalho do Hub no topo e é barrado em rotas Master", async ({
    page,
  }) => {
    await injectCoordinatorSession(page);
    await setupApiMocks(page);

    // Promotor OK por padrão
    await page.goto("/promoter");
    await expect(page.getByRole("heading", { name: /Portal do Promotor|Minhas Vendas/i })).toBeVisible({ timeout: 15_000 });

    // Header: Coordenador vê atalho para Hub Regional, mas NÃO vê Painel Master
    await expect(page.getByRole("link", { name: /Hub Regional/i })).toBeVisible({ timeout: 10_000 });
    await expect(page.getByRole("link", { name: /Painel Master/i })).not.toBeVisible();

    // Hub OK
    await page.goto("/hub");
    await expect(page.getByRole("heading", { name: /Visão Geral do Polo|Hub/i })).toBeVisible({ timeout: 15_000 });

    // Tentar acessar rota exclusiva de Master (financeiro global) deve redirecionar para /hub
    await page.goto("/financeiro");
    await expect(page).toHaveURL(/.*hub/, { timeout: 15_000 });
  });

  test("3. Promotor acessa /promoter, sem botões de Hub ou Master", async ({
    page,
  }) => {
    await injectPromoterSession(page);
    await setupApiMocks(page);

    // Promotor OK
    await page.goto("/promoter");
    await expect(page.getByRole("heading", { name: /Portal do Promotor|Minhas Vendas/i })).toBeVisible({ timeout: 15_000 });

    // Header: Promotor NÃO vê botões de Hub Regional nem Painel Master
    await expect(page.getByRole("link", { name: /Hub Regional/i })).not.toBeVisible();
    await expect(page.getByRole("link", { name: /Painel Master/i })).not.toBeVisible();

    // Onboarding OK
    await page.goto("/onboarding");
    await expect(page.getByRole("heading", { name: /Ativação de Promotor/i })).toBeVisible({ timeout: 15_000 });

    // Tentativa em /hub redireciona para /promoter ou /vendas
    await page.goto("/hub");
    await expect(page).toHaveURL(/.*(promoter|vendas)/, { timeout: 15_000 });

    // Tentativa em /dashboard redireciona para /promoter ou /vendas
    await page.goto("/dashboard");
    await expect(page).toHaveURL(/.*(promoter|vendas)/, { timeout: 15_000 });
  });
});

import { test, expect } from "@playwright/test";
import { injectPromoterSession, setupApiMocks } from "./helpers/mock-api";

test.describe("Portal do Promotor — Experiência Mobile-First & BottomNav", () => {
  test.use({ viewport: { width: 390, height: 844 } }); // iPhone 12/13/14 viewport

  test("1. Renderiza BottomNav no mobile e permite navegação entre abas", async ({ page }) => {
    await injectPromoterSession(page);
    await setupApiMocks(page);

    await page.goto("/promoter");
    await page.addStyleTag({ content: "nextjs-portal { display: none !important; pointer-events: none !important; }" });

    // Valida carregamento da página inicial
    await expect(page.getByRole("heading", { name: /Portal do Promotor/i })).toBeVisible({
      timeout: 15_000,
    });

    // Valida presença da Bottom Navigation Bar no mobile
    const bottomNav = page.getByRole("navigation", { name: /Navegação inferior mobile/i });
    await expect(bottomNav).toBeVisible({ timeout: 10_000 });

    // Navega para Leads via BottomNav
    await bottomNav.getByRole("link", { name: "Leads" }).click();
    await expect(page).toHaveURL(/.*promoter\/leads/, { timeout: 10_000 });

    // Navega para Comissões via BottomNav
    await bottomNav.getByRole("link", { name: "Ganhos" }).click();
    await expect(page).toHaveURL(/.*promoter\/comissoes/, { timeout: 10_000 });

    // Navega para Treino via BottomNav
    await bottomNav.getByRole("link", { name: "Treino" }).click();
    await expect(page).toHaveURL(/.*promoter\/treino/, { timeout: 10_000 });

    // Retorna para Início via BottomNav
    await bottomNav.getByRole("link", { name: "Início" }).click();
    await expect(page).toHaveURL(/.*promoter(?:\/)?(?:\?.*)?$/, { timeout: 10_000 });
  });

  test("2. Exibe link de indicação, ações de compartilhamento e banner de ativação quando pendente", async ({ page }) => {
    await injectPromoterSession(page);
    await setupApiMocks(page);

    // Override /promoter/me com pix_key nulo para validar o banner de ativação
    await page.route("**/api/v1/collaborators/promoter/me", (route) => {
      route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({
          external_id: "prom-1",
          name: "Lucas Rocha",
          phone: "11966665555",
          code: "LUCAS10",
          referral_url: "https://supletivo.net.br/?ref=prom-1",
          active: true,
          total_sales: 0,
          total_commissions_cents: 0,
          available_commissions_cents: 0,
          pending_commissions_cents: 0,
          hub_brand: "wyden",
          pix_key: null,
          profile_status: "ativo_pendente",
        }),
      });
    });

    await page.goto("/promoter");

    // Verifica card do Link Exclusivo
    await expect(page.getByText(/Seu Link Exclusivo de Vendas/i)).toBeVisible({ timeout: 10_000 });
    await expect(page.getByText(/Compartilhe e Ganhe por Matrícula/i)).toBeVisible();

    // Botão de Copiar link presente
    await expect(page.getByRole("button", { name: /Copiar/i }).first()).toBeVisible();

    // Banner de KYC / Ativação de Saque presente quando sem chave Pix
    await expect(page.getByText(/Cadastro em fase de ativação/i)).toBeVisible({ timeout: 10_000 });
    await expect(page.getByRole("link", { name: /Completar Cadastro/i })).toBeVisible();
  });
});

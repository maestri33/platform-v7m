// spec: specs/plan.md#2-faq-e-duvidas
// seed: tests/e2e/seed.spec.ts
import { test, expect } from '@playwright/test';

test.describe('FAQ e Dúvidas Frequentes', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
  });

  test('2.1 deve filtrar perguntas por categoria ao clicar nos chips', async ({ page }) => {
    const chipAll = page.locator('[data-faq-filter="all"]');
    const chipTrabalho = page.locator('[data-faq-filter="trabalho"]');
    const chipPagamento = page.locator('[data-faq-filter="pagamento"]');

    // Aba inicial
    await expect(chipAll).toHaveClass(/is-active/);

    // Filtra por Trabalho
    await chipTrabalho.click();
    await expect(chipTrabalho).toHaveClass(/is-active/);
    await expect(chipAll).not.toHaveClass(/is-active/);

    // Verifica que itens de trabalho estão visíveis e de pagamento estão ocultos
    const itemsTrabalho = page.locator('.faq-item[data-cat="trabalho"]');
    const itemsPagamento = page.locator('.faq-item[data-cat="pagamento"]');

    await expect(itemsTrabalho.first()).toBeVisible();
    await expect(itemsPagamento.first()).toBeHidden();

    // Filtra por Pagamento
    await chipPagamento.click();
    await expect(chipPagamento).toHaveClass(/is-active/);
    await expect(itemsPagamento.first()).toBeVisible();
    await expect(itemsTrabalho.first()).toBeHidden();

    // Reseta para todas
    await chipAll.click();
    await expect(itemsTrabalho.first()).toBeVisible();
    await expect(itemsPagamento.first()).toBeVisible();
  });

  test('2.2 deve expandir accordion e registrar evento faq_open', async ({ page }) => {
    const firstDetails = page.locator('details[data-faq]').first();
    const summary = firstDetails.locator('summary');
    const answer = firstDetails.locator('p');

    await expect(firstDetails).not.toHaveAttribute('open', '');
    await summary.click();

    await expect(firstDetails).toHaveAttribute('open', '');
    await expect(answer).toBeVisible();

    const events = await page.evaluate(() =>
      (window as unknown as { dataLayer: { event: string; question?: string }[] }).dataLayer
    );
    const faqEvent = events.find((e) => e.event === 'faq_open');
    expect(faqEvent).toBeDefined();
    expect(faqEvent?.question).toContain('Preciso pagar alguma coisa');
  });
});

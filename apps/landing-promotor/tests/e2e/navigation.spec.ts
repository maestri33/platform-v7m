// spec: specs/plan.md#3-navegacao-e-cta-flutuante
// seed: tests/e2e/seed.spec.ts
import { test, expect } from '@playwright/test';

test.describe('Navegação e Sticky CTA', () => {
  test('3.1 skip link deve focar e navegar para o conteúdo principal', async ({ page }) => {
    await page.goto('/');

    const skipLink = page.locator('.skip-link');
    await page.keyboard.press('Tab');
    await expect(skipLink).toBeFocused();
    await expect(skipLink).toHaveAttribute('href', '#conteudo');
  });

  test('3.2 sticky CTA deve aparecer após rolar o Hero em viewport mobile', async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 });
    await page.goto('/');

    const sticky = page.locator('.sticky-cta');

    // No topo, sticky está oculto
    await expect(sticky).not.toHaveClass(/visible/);

    // Rola para além do Hero
    await page.locator('#como-funciona').scrollIntoViewIfNeeded();
    await page.waitForTimeout(300);

    // Sticky fica visível
    await expect(sticky).toHaveClass(/visible/);
    await expect(sticky.locator('.sticky-btn')).toHaveText('Quero ser promotor');
    await expect(sticky.locator('.sticky-price strong')).toContainText('R$');
  });
});

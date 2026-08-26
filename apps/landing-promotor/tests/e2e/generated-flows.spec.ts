// spec: specs/landing-promotor.plan.md
// seed: tests/e2e/seed.spec.ts
import { test, expect } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';

test.describe('1. Vínculo de Polo e Atribuição (hub → ref)', () => {
  test('1.1 Captura de polo via URL e propagação para CTAs', async ({ page }) => {
    // 1. Acessar a landing com parâmetros de polo e UTM
    await page.goto('/?hub=poloA&utm_source=google&gclid=123');

    // 2. Verificar que todos os CTAs levam ao app com ref=poloA
    const ctaLinks = page.locator('a[data-cta]');
    const count = await ctaLinks.count();
    expect(count).toBeGreaterThanOrEqual(4);

    for (let i = 0; i < count; i++) {
      const href = await ctaLinks.nth(i).getAttribute('href');
      expect(href).toContain('ref=poloA');
      expect(href).toContain('utm_source=google');
      expect(href).toContain('gclid=123');
      expect(href).not.toContain('hub=');
    }
  });

  test('1.2 Regra First-Touch de atribuição', async ({ page }) => {
    // 1. Primeira visita com polo
    await page.goto('/?hub=poloA');
    // 2. Segunda visita sem parâmetros
    await page.goto('/');

    const heroCta = await page.locator('a[data-cta="hero"]').getAttribute('href');
    expect(heroCta).toContain('ref=poloA');
  });

  test('1.3 Sobrescrita explícita de polo', async ({ page }) => {
    await page.goto('/?hub=poloA');
    await page.goto('/?hub=poloB');

    const heroCta = await page.locator('a[data-cta="hero"]').getAttribute('href');
    expect(heroCta).toContain('ref=poloB');
    expect(heroCta).not.toContain('poloA');
  });
});

test.describe('2. Calculadora de Ganhos e Presets', () => {
  test('2.1 Atualização dinâmica via Slider e Presets', async ({ page }) => {
    await page.goto('/');

    // Clica no preset de 5 matrículas
    const preset5 = page.locator('[data-calc-preset="5"]');
    await preset5.click();

    // Valida valores exibidos
    await expect(page.locator('[data-calc-paid]')).toHaveText('5');
    await expect(page.locator('[data-calc-direct]')).toContainText('500');
    await expect(page.locator('[data-calc-bonus]')).toContainText('500');
    await expect(page.locator('[data-calc-total]')).toContainText('1.000');

    // Verifica que o evento calc_use foi empurrado para o dataLayer
    const dataLayer = await page.evaluate(() => (window as unknown as { dataLayer: { event: string }[] }).dataLayer);
    expect(dataLayer.some((e) => e.event === 'calc_use')).toBe(true);
  });
});

test.describe('3. FAQ e Filtro por Categorias', () => {
  test('3.1 Filtro por categoria nos chips', async ({ page }) => {
    await page.goto('/');

    // Clica no filtro de pagamento
    const paymentChip = page.locator('[data-faq-filter="pagamento"]');
    await paymentChip.click();

    await expect(paymentChip).toHaveAttribute('aria-selected', 'true');
    await expect(page.locator('.faq-list')).toHaveAttribute('data-active-cat', 'pagamento');

    // Todos os itens visíveis devem ser da categoria pagamento
    const visibleItems = page.locator('.faq-item:visible');
    const count = await visibleItems.count();
    expect(count).toBeGreaterThan(0);

    for (let i = 0; i < count; i++) {
      await expect(visibleItems.nth(i)).toHaveAttribute('data-cat', 'pagamento');
    }
  });
});

test.describe('4. Acessibilidade e Conformidade Legal', () => {
  for (const path of ['/', '/termos/', '/privacidade/']) {
    test(`4.1 Axe A11y sem violações em ${path}`, async ({ page }) => {
      await page.goto(path);
      const results = await new AxeBuilder({ page }).withTags(['wcag2a', 'wcag2aa']).analyze();
      expect(results.violations).toEqual([]);
    });
  }
});

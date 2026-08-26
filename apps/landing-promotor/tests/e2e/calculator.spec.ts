// spec: specs/plan.md#1-calculadora-de-ganhos
// seed: tests/e2e/seed.spec.ts
import { test, expect } from '@playwright/test';

test.describe('Calculadora de Ganhos Interativa', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
  });

  test('1.1 deve carregar com estado inicial correto (5 matrículas, R$ 1.000)', async ({ page }) => {
    const range = page.locator('[data-calc-range]');
    const total = page.locator('[data-calc-total]');
    const direct = page.locator('[data-calc-direct]');
    const bonus = page.locator('[data-calc-bonus]');
    const bonusRow = page.locator('[data-calc-bonus-row]');
    const bonusBadge = page.locator('[data-calc-bonus-badge]');

    await expect(range).toHaveValue('5');
    await expect(total).toHaveText(/R\$\s*1\.000/);
    await expect(direct).toHaveText(/R\$\s*500/);
    await expect(bonus).toHaveText(/R\$\s*500/);
    await expect(bonusRow).toHaveClass(/on/);
    await expect(bonusBadge).toBeVisible();
  });

  test('1.2 deve atualizar valores ao clicar nos presets rápidos (1, 5, 10, 20)', async ({ page }) => {
    const total = page.locator('[data-calc-total]');
    const btn1 = page.locator('[data-calc-preset="1"]');
    const btn10 = page.locator('[data-calc-preset="10"]');
    const btn20 = page.locator('[data-calc-preset="20"]');
    const bonusRow = page.locator('[data-calc-bonus-row]');

    // Preset 1
    await btn1.click();
    await expect(btn1).toHaveAttribute('aria-pressed', 'true');
    await expect(total).toHaveText(/R\$\s*100/);
    await expect(bonusRow).not.toHaveClass(/(^|\s)on(\s|$)/);

    // Preset 10
    await btn10.click();
    await expect(btn10).toHaveAttribute('aria-pressed', 'true');
    await expect(total).toHaveText(/R\$\s*1\.500|R\$\s*2\.000/);
    await expect(bonusRow).toHaveClass(/(^|\s)on(\s|$)/);

    // Preset 20
    await btn20.click();
    await expect(btn20).toHaveAttribute('aria-pressed', 'true');

    // Valida se disparou evento calc_use no dataLayer
    const used = await page.evaluate(() =>
      (window as unknown as { dataLayer: { event: string }[] }).dataLayer.some(
        (d) => d.event === 'calc_use'
      )
    );
    expect(used).toBe(true);
  });

  test('1.3 deve reagir à alteração manual do slider', async ({ page }) => {
    const range = page.locator('[data-calc-range]');
    const paid = page.locator('[data-calc-paid]');
    const total = page.locator('[data-calc-total]');

    await range.evaluate((el) => {
      const input = el as HTMLInputElement;
      input.value = '3';
      input.dispatchEvent(new Event('input', { bubbles: true }));
    });

    await expect(paid).toHaveText('3');
    await expect(total).toHaveText(/R\$\s*300/);
  });
});

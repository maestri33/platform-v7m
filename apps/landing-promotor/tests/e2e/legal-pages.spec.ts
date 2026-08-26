// spec: specs/plan.md#5-paginas-legais-e-acessibilidade
// seed: tests/e2e/seed.spec.ts
import { test, expect } from '@playwright/test';

test.describe('Páginas Legais e Conformidade', () => {
  test('5.1 /termos/ deve exibir regulamento formal sem aviso de rascunho', async ({ page }) => {
    await page.goto('/termos/');

    await expect(page.locator('h1')).toHaveText('Termos do Programa de Promotores');
    await expect(page.locator('body')).not.toContainText('Rascunho — revisar com o jurídico');
    await expect(page.locator('body')).toContainText(/vínculo de emprego/i);
    await expect(page.locator('body')).toContainText('Comissão Direta');
  });

  test('5.2 /privacidade/ deve estar em conformidade com a LGPD e canal do DPO', async ({ page }) => {
    await page.goto('/privacidade/');

    await expect(page.locator('h1')).toHaveText('Política de Privacidade');
    await expect(page.locator('body')).not.toContainText('Rascunho — revisar com o jurídico');
    await expect(page.locator('body')).toContainText('13.709/2018');
    await expect(page.locator('a[href^="mailto:dpo@"]').first()).toBeVisible();
  });
});

/**
 * E2E dos critérios de aceite: vínculo de polo (hub→ref), eventos do dataLayer,
 * calculadora e acessibilidade (axe).
 */
import { test, expect } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';

test.describe('vínculo de polo (hub → ref)', () => {
  test('?hub=polo1 → todos os CTAs vão ao app com ref=polo1 + UTMs', async ({ page }) => {
    await page.goto('/?hub=polo1&utm_source=google&gclid=abc');
    const hrefs = await page.locator('a[data-cta]').evaluateAll((as) =>
      as.map((a) => (a as HTMLAnchorElement).href)
    );
    expect(hrefs.length).toBeGreaterThanOrEqual(4);
    for (const href of hrefs) {
      expect(href).toContain('ref=polo1');
      expect(href).toContain('utm_source=google');
      expect(href).toContain('gclid=abc');
    }
  });

  test('revisita sem hub mantém o primeiro polo (first-touch)', async ({ page }) => {
    await page.goto('/?hub=polo1');
    await page.goto('/');
    const href = await page.locator('a[data-cta="hero"]').getAttribute('href');
    expect(href).toContain('ref=polo1');
  });

  test('hub novo sobrescreve o anterior', async ({ page }) => {
    await page.goto('/?hub=polo1');
    await page.goto('/?hub=polo2');
    const href = await page.locator('a[data-cta="hero"]').getAttribute('href');
    expect(href).toContain('ref=polo2');
    expect(href).not.toContain('polo1');
  });
});

test.describe('eventos no dataLayer', () => {
  test('page_view com polo + cta_click + faq_open', async ({ page }) => {
    await page.goto('/?hub=ev1');

    await page.evaluate(() => {
      document.addEventListener('click', (e) => e.preventDefault());
      document.querySelector<HTMLAnchorElement>('a[data-cta="hero"]')!.click();
    });
    await page.evaluate(() => {
      document.querySelector<HTMLDetailsElement>('details[data-faq]')!.open = true;
    });

    const events = await page.evaluate(() =>
      (window as unknown as { dataLayer: { event: string }[] }).dataLayer.map((d) => d.event)
    );
    expect(events).toContain('page_view');
    expect(events).toContain('cta_click');
    expect(events).toContain('faq_open');

    const pv = await page.evaluate(
      () =>
        (window as unknown as { dataLayer: Record<string, string>[] }).dataLayer.find(
          (d) => d.event === 'page_view'
        )
    );
    expect(pv?.hub).toBe('ev1');
  });

  test('scroll até o fim dispara scroll_depth 25/50/75/100 e section_view', async ({ page }) => {
    await page.goto('/');
    await page.evaluate(async () => {
      const doc = document.documentElement;
      for (let y = 0; y <= doc.scrollHeight; y += 400) {
        window.scrollTo({ top: y, behavior: 'instant' });
        await new Promise((r) => setTimeout(r, 30));
      }
      window.scrollTo({ top: doc.scrollHeight, behavior: 'instant' });
    });
    await page.waitForTimeout(400);

    const dl = await page.evaluate(
      () => (window as unknown as { dataLayer: Record<string, unknown>[] }).dataLayer
    );
    const depths = dl.filter((d) => d.event === 'scroll_depth').map((d) => d.depth);
    expect(depths).toEqual(expect.arrayContaining([25, 50, 75, 100]));

    const sections = dl.filter((d) => d.event === 'section_view').map((d) => d.section);
    expect(sections).toEqual(expect.arrayContaining(['hero', 'ganhos', 'faq']));
  });
});

test('calculadora: mover o slider atualiza o total e dispara calc_use', async ({ page }) => {
  await page.goto('/');
  const total = page.locator('[data-calc-total]');
  const before = await total.textContent();

  await page.locator('[data-calc-range]').evaluate((el) => {
    const input = el as HTMLInputElement;
    input.value = input.max;
    input.dispatchEvent(new Event('input', { bubbles: true }));
  });

  await expect(total).not.toHaveText(before ?? '');
  const used = await page.evaluate(() =>
    (window as unknown as { dataLayer: { event: string }[] }).dataLayer.some(
      (d) => d.event === 'calc_use'
    )
  );
  expect(used).toBe(true);
});

test.describe('acessibilidade (axe)', () => {
  for (const path of ['/', '/termos/', '/privacidade/']) {
    test(`sem violações em ${path}`, async ({ page }) => {
      await page.goto(path);
      const results = await new AxeBuilder({ page }).withTags(['wcag2a', 'wcag2aa']).analyze();
      expect(results.violations).toEqual([]);
    });
  }
});

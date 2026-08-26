import { test, expect } from '@playwright/test';

test.describe('Landing Promotor', () => {
  test('seed', async ({ page }) => {
    await page.goto('/');
    await expect(page.locator('h1')).toBeVisible();
  });
});


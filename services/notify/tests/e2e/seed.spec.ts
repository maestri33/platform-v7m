import { test, expect } from '@playwright/test';

test.describe('Dashboard & System Operations', () => {
  test('seed - dashboard overview accessibility', async ({ page }) => {
    await page.goto('/dashboard/');
    await expect(page).toHaveTitle(/Notify/);
  });
});

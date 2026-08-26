import { test, expect } from "@playwright/test";

test.describe("app-v7m · Seed", () => {
  test("seed", async ({ page }) => {
    await page.goto("/");
    await expect(page.locator("body")).toBeVisible();
  });
});

import { test, expect } from "@playwright/test";

test.describe("Ambiente Inicial", () => {
  test("seed app-supletivo", async ({ page }) => {
    await page.goto("/");
    await expect(page.locator("body")).toBeVisible();
  });
});

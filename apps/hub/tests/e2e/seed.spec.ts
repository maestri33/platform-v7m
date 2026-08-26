import { test } from "@playwright/test";
import { setupMockEnvironment } from "./helpers/mock";

test.describe("Seed Environment", () => {
  test("seed", async ({ page }) => {
    await setupMockEnvironment(page);
    await page.goto("/");
  });
});

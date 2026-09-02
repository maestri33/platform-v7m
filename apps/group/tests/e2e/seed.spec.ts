import { test as setup, expect } from "@playwright/test";
import { injectStaffSession, setupApiMocks } from "./helpers/mock-api";

// Seed file for setting up the environment and authenticated staff state
// Used by Playwright Planner and Generator as the initial baseline

setup.describe("Platform and Auth Environment Setup", () => {
  setup("seed staff authentication and initial state", async ({ page }) => {
    // 1. Configura os interceptadores de API
    await setupApiMocks(page);

    // 2. Injeta a sessão autenticada de administrador
    await injectStaffSession(page);

    // 3. Navega até o dashboard para validar que o ambiente está operacional
    await page.goto("/dashboard");
    await expect(page.getByRole("heading", { name: "Cockpit do Administrador" })).toBeVisible({ timeout: 15_000 });
  });
});

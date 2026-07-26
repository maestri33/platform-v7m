import { defineConfig, devices } from "@playwright/test";

// Smoke + E2E para o app-supletivo (Next.js 16).
// Sobemos o dev server automaticamente; em CI deixamos o runner gerenciá-lo.
const PORT = 3000;
const baseURL = `http://localhost:${PORT}`;

export default defineConfig({
  testDir: "./tests/e2e",
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 1 : 0,
  workers: process.env.CI ? 1 : undefined,
  reporter: process.env.CI ? "github" : "list",
  use: {
    baseURL,
    trace: "on-first-retry",
    // Honesta: se a página chama /api e o backend (Django) não está no ar,
    // a UI pode falhar — capturamos screenshot só em falha pra não poluir.
    screenshot: "only-on-failure",
  },
  projects: [
    // Aquece o Turbopack (compile sob demanda) antes da suíte paralela — sem isso,
    // o primeiro toque numa rota fria dispara full-reload nas páginas abertas e
    // derruba testes que dependem de timer/estado (ver warmup.setup.ts).
    { name: "warmup", testMatch: /warmup\.setup\.ts/ },
    { name: "chromium", use: { ...devices["Desktop Chrome"] }, dependencies: ["warmup"] },
  ],
  webServer: {
    command: "npm run dev",
    url: baseURL,
    reuseExistingServer: !process.env.CI,
    timeout: 120_000,
  },
});
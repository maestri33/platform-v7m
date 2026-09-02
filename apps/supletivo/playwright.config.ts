import { defineConfig, devices } from "@playwright/test";

// Smoke + E2E para o app-supletivo (Next.js 16).
const PORT = Number(process.env.E2E_PORT ?? 3108);
const baseURL = process.env.PLAYWRIGHT_BASE_URL ?? process.env.E2E_BASE_URL ?? `http://127.0.0.1:${PORT}`;

export default defineConfig({
  testDir: "./tests/e2e",
  fullyParallel: false,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 1 : 0,
  timeout: 30_000,
  expect: {
    timeout: 15_000,
  },
  workers: 1,
  reporter: process.env.CI ? "github" : "list",
  use: {
    baseURL,
    trace: "on-first-retry",
    screenshot: "only-on-failure",
  },
  projects: [
    { name: "warmup", testMatch: /warmup\.setup\.ts/ },
    { name: "chromium", use: { ...devices["Desktop Chrome"] }, dependencies: ["warmup"] },
  ],
  webServer: (process.env.PLAYWRIGHT_BASE_URL || process.env.E2E_BASE_URL)
    ? undefined
    : {
        command: `npm run dev -- --hostname 127.0.0.1 --port ${PORT}`,
        env: {
          ...process.env,
          PORT: String(PORT),
          HOSTNAME: "127.0.0.1",
          URL_BACKEND: process.env.E2E_BACKEND_URL ?? "http://127.0.0.1:8001",
        },
        url: baseURL,
        reuseExistingServer: true,
        timeout: 120_000,
      },
});

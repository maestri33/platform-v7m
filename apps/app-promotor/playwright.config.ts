import { defineConfig, devices } from "@playwright/test";

const e2ePort = process.env.E2E_PORT ?? "3107";
const baseURL = process.env.E2E_BASE_URL ?? `http://127.0.0.1:${e2ePort}`;
const mockBackendPort = process.env.MOCK_BACKEND_PORT ?? "8765";
const mockBackendURL = process.env.MOCK_BACKEND_URL ?? `http://127.0.0.1:${mockBackendPort}`;

export default defineConfig({
  testDir: "./tests/e2e",
  fullyParallel: false,
  workers: 1,
  forbidOnly: Boolean(process.env.CI),
  retries: process.env.CI ? 2 : 0,
  reporter: process.env.CI ? [["github"], ["html", { open: "never" }]] : "list",
  expect: { timeout: 15_000 },
  use: {
    baseURL,
    trace: "on-first-retry",
  },
  projects: [
    {
      name: "chromium",
      use: {
        ...devices["Desktop Chrome"],
        // Ambientes que já trazem o Chromium (sandbox/imagem de CI) apontam o
        // binário por env em vez de baixar outro. Vazio = comportamento padrão.
        ...(process.env.PLAYWRIGHT_CHROMIUM_PATH
          ? { launchOptions: { executablePath: process.env.PLAYWRIGHT_CHROMIUM_PATH } }
          : {}),
      },
    },
  ],
  webServer: process.env.E2E_BASE_URL
    ? undefined
    : [
        {
          command: "node tests/e2e/mock-backend.mjs",
          url: `${mockBackendURL}/health`,
          reuseExistingServer: !process.env.CI,
          env: { ...process.env, MOCK_BACKEND_PORT: mockBackendPort },
        },
        {
          command: `npm run dev -- --hostname 127.0.0.1 --port ${e2ePort}`,
          url: baseURL,
          reuseExistingServer: !process.env.CI,
          env: {
            ...process.env,
            PORT: e2ePort,
            APP_ENV: "test",
            BACKEND_URL: mockBackendURL,
            OMNIROUTE_BASE_URL: mockBackendURL,
            OMNIROUTE_API_KEY: "e2e-key",
            OMNIROUTE_EDUCATION_MODEL: "e2e-education",
          },
        },
      ],
});

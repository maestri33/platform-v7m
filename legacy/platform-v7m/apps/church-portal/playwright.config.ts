import { defineConfig, devices } from "@playwright/test";

// e2e roda contra o build de produção (next start): é o artefato que vai
// pro CT, e o dev server tem HMR/overlay que mascaram problemas reais.
export default defineConfig({
  testDir: "./e2e",
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 1 : 0,
  // decodificação de vídeo é o recurso escasso: excesso de workers vira
  // contenção de hardware e falha por ambiente, não por regressão
  workers: 2,
  reporter: process.env.CI ? [["github"], ["list"]] : [["list"]],
  timeout: 60_000,

  use: {
    baseURL: process.env.E2E_BASE_URL ?? "http://127.0.0.1:3100",
    trace: "on-first-retry",
    video: "off",
  },

  projects: [
    {
      name: "desktop",
      use: {
        ...devices["Desktop Chrome"],
        // 1366x700 ≈ laptop maximizado no Windows (a config mais comum) e a
        // faixa onde a copy centralizada estourava. O default 1280x720 passava
        // por 0,28px — guard que não guardava nada.
        viewport: { width: 1366, height: 700 },
      },
    },
    // Pixel 5: touch + coarse pointer + DPR real — é onde o scrub sofre
    { name: "mobile", use: { ...devices["Pixel 5"] } },
    // paisagem de celular moderno (>860px de largura): a faixa que quebrou
    {
      name: "mobile-landscape",
      use: {
        ...devices["Pixel 5 landscape"],
        viewport: { width: 892, height: 412 },
      },
    },
  ],

  webServer: process.env.E2E_BASE_URL
    ? undefined
    : {
        command: "npm run start -- -p 3100",
        url: "http://127.0.0.1:3100",
        reuseExistingServer: !process.env.CI,
        timeout: 120_000,
      },
});

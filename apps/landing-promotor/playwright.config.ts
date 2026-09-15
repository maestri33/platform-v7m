import { defineConfig, devices } from '@playwright/test';

export default defineConfig({
  testDir: 'tests/e2e',
  timeout: 30_000,
  retries: process.env.CI ? 1 : 0,
  use: {
    baseURL: 'http://localhost:3010',
  },
  projects: [{ name: 'chromium', use: { ...devices['Pixel 7'] } }],
  webServer: {
    command: 'pnpm --filter @v7m/landing-promotor run preview',
    url: 'http://localhost:3010',
    reuseExistingServer: true,
    timeout: 120_000,
  },
});

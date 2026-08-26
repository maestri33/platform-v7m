import { defineConfig } from "@playwright/test";

export default defineConfig({
  testDir: "../scripts",
  testMatch: "visual-e2e.spec.mjs",
  timeout: 30000,
  retries: 0,
  workers: 1,
  use: {
    headless: true,
    screenshot: "on",
    trace: "off",
  },
  reporter: [["line"]],
});

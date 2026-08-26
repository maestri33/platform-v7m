import { chromium } from "playwright";
import { mkdirSync, existsSync } from "fs";
import { join } from "path";

const DIR = "c:/Users/maestri33/dev/v7m/screenshots/e2e/flows";
if (!existsSync(DIR)) mkdirSync(DIR, { recursive: true });

(async () => {
  console.log("=== CAPTURANDO TODAS AS TELAS INTERNAS DO APP V7M ===");
  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });
  await page.goto("http://localhost:3001/dev-preview", { waitUntil: "networkidle" });

  const tabs = [
    "Painel Principal",
    "1. Documento",
    "2. Comprovante",
    "3. Chave Pix",
    "4. Escolaridade",
    "5. Selfie",
    "Treinamento LMS",
    "Leads",
    "Comissões"
  ];

  for (const tab of tabs) {
    const btn = page.locator("button", { hasText: tab }).first();
    if (await btn.isVisible()) {
      await btn.click();
      await page.waitForTimeout(500);
      const filename = tab.toLowerCase().replace(/[^a-z0-9]/g, "_");
      await page.screenshot({ path: join(DIR, `v7m_internal_${filename}.png`) });
      console.log(`📸 Capturado: ${tab}`);
    }
  }

  await browser.close();
  console.log("✅ Todas as telas internas do App V7M capturadas!");
})();

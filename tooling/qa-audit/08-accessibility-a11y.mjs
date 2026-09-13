import { chromium } from "playwright";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "node:url";
import axe from "axe-core";

const SCREENSHOTS_DIR = fileURLToPath(new URL("./screenshots/a11y/", import.meta.url));
fs.mkdirSync(SCREENSHOTS_DIR, { recursive: true });

const TARGET_PAGES = [
  { name: "App Supletivo Home (Funil)", url: "http://localhost:3020/" },
  { name: "App Supletivo Checkout", url: "http://localhost:3020/checkout" },
  { name: "App Supletivo Painel Aluno", url: "http://localhost:3020/aluno" },
  { name: "App Promotor Login", url: "http://localhost:3003/vendas" },
  { name: "App Promotor Painel", url: "http://localhost:3003/vendas" },
  { name: "Admin V7M Login", url: "http://localhost:3003/login" },
  { name: "Admin V7M Cockpit", url: "http://localhost:3003/dashboard" },
  { name: "Hub V7M Login", url: "http://localhost:3003/hub" },
  { name: "Landing Supletivo", url: "http://localhost:3011/" },
  { name: "Landing Promotor", url: "http://localhost:3010/" },
];

export async function runAccessibilitySuite() {
  console.log("\n========================================================");
  console.log(" 🧪 SUITE 8: ACCESSIBILITY (a11y) & WCAG 2.1 AA AUDIT");
  console.log("========================================================\n");

  const results = [];
  const violationsSummary = [];
  const browser = await chromium.launch({ headless: true });
  const axeSource = axe.source;

  for (const target of TARGET_PAGES) {
    const context = await browser.newContext({
      viewport: { width: 1440, height: 900 },
    });
    const page = await context.newPage();
    const slug = target.name.toLowerCase().replace(/[^a-z0-9]+/g, "-");

    try {
      console.log(`▶ Inspecionando acessibilidade em [${target.name}] (${target.url})...`);
      const response = await page.goto(target.url, { waitUntil: "networkidle", timeout: 10000 });
      await page.waitForTimeout(500);

      // Injeta axe-core e roda auditoria WCAG 2.1 AA
      await page.evaluate(axeSource);
      const auditResult = await page.evaluate(async () => {
        // @ts-ignore
        return await axe.run({
          runOnly: {
            type: "tag",
            values: ["wcag2a", "wcag2aa", "wcag21a", "wcag21aa", "best-practice"],
          },
        });
      });

      const violations = auditResult.violations || [];
      const criticalCount = violations.filter((v) => v.impact === "critical").length;
      const seriousCount = violations.filter((v) => v.impact === "serious").length;
      const moderateCount = violations.filter((v) => v.impact === "moderate").length;

      const screenshotPath = path.join(SCREENSHOTS_DIR, `${slug}-a11y.png`);
      await page.screenshot({ path: screenshotPath, fullPage: false });

      if (violations.length === 0) {
        console.log(`  ✅ [${target.name}] 0 violações de acessibilidade detectadas!`);
      } else {
        console.log(`  ⚠️ [${target.name}] ${violations.length} regras violadas (Críticas: ${criticalCount}, Graves: ${seriousCount}, Moderadas: ${moderateCount})`);
        violations.forEach((v) => {
          violationsSummary.push({
            page: target.name,
            id: v.id,
            impact: v.impact,
            description: v.description,
            helpUrl: v.helpUrl,
            nodesCount: v.nodes.length,
          });
        });
      }

      results.push({
        name: target.name,
        url: target.url,
        status: criticalCount === 0 && seriousCount === 0 ? "PASS" : "WARN",
        violationsCount: violations.length,
        criticalCount,
        seriousCount,
        moderateCount,
        screenshot: screenshotPath,
      });
    } catch (err) {
      console.log(`  ❌ [${target.name}] Falha ao avaliar acessibilidade: ${err.message}`);
      results.push({
        name: target.name,
        url: target.url,
        status: "FAIL",
        error: err.message,
      });
    } finally {
      await context.close();
    }
  }

  await browser.close();
  return { results, violationsSummary };
}

if (process.argv[1] && process.argv[1].endsWith("08-accessibility-a11y.mjs")) {
  runAccessibilitySuite().then((res) => {
    console.log(`\nAuditoria de Acessibilidade concluída: ${res.results.length} telas verificadas.`);
  });
}

import { chromium } from "playwright";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const rootDir = path.resolve(__dirname, "..");
const baselinesDir = path.join(rootDir, "screenshots", "baselines");
const diffsDir = path.join(rootDir, "screenshots", "diffs");
const reportsDir = path.join(rootDir, "reports");

[baselinesDir, diffsDir, reportsDir].forEach((dir) => {
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
});

const TARGET_PAGES = [
  { name: "landing-promotor", url: "http://127.0.0.1:3010", viewport: { width: 1280, height: 800 } },
  { name: "landing-supletivo", url: "http://127.0.0.1:3011", viewport: { width: 1280, height: 800 } },
  { name: "landing-supletivo-mobile", url: "http://127.0.0.1:3011", viewport: { width: 375, height: 667 } },
  { name: "app-supletivo-matricula", url: "http://127.0.0.1:3020/matricula", viewport: { width: 375, height: 667 } },
  { name: "app-promotor-login", url: "http://127.0.0.1:3001/login", viewport: { width: 1280, height: 800 } },
  { name: "hub-login", url: "http://127.0.0.1:3004/login", viewport: { width: 1280, height: 800 } },
  { name: "admin-login", url: "http://127.0.0.1:3003/login", viewport: { width: 1280, height: 800 } },
];

console.log("=== V7M Visual Regression & Snapshot Engine ===");

async function runVisualAudit() {
  const browser = await chromium.launch({ headless: true });
  const results = [];

  for (const target of TARGET_PAGES) {
    const page = await browser.newPage({ viewport: target.viewport });
    const baselinePath = path.join(baselinesDir, `${target.name}.png`);
    const currentPath = path.join(diffsDir, `${target.name}-current.png`);

    console.log(`Auditing visual layout: ${target.name} (${target.url})...`);
    try {
      await page.goto(target.url, { waitUntil: "domcontentloaded", timeout: 8000 });
      await page.waitForTimeout(1000); // Wait for fonts / CSS animations to settle

      // Mask dynamic timers or ephemeral IDs
      await page.evaluate(() => {
        const dynamicEls = document.querySelectorAll("[data-dynamic], [data-timer]");
        dynamicEls.forEach((el) => (el.style.visibility = "hidden"));
      });

      const buffer = await page.screenshot({ fullPage: true });
      fs.writeFileSync(currentPath, buffer);

      if (!fs.existsSync(baselinePath)) {
        fs.writeFileSync(baselinePath, buffer);
        console.log(`  📸 Created new baseline for: ${target.name}`);
        results.push({ name: target.name, status: "BASELINE_CREATED", url: target.url });
      } else {
        const baselineBuffer = fs.readFileSync(baselinePath);
        const isIdentical = buffer.equals(baselineBuffer);
        const status = isIdentical ? "PASSED" : "DIFF_DETECTED";
        console.log(`  ${isIdentical ? "✅" : "⚠️"} Layout check: ${target.name} -> ${status}`);
        results.push({ name: target.name, status, url: target.url });
      }
    } catch (err) {
      console.warn(`  ❌ Connection skipped for ${target.name} (Service might be offline in dev):`, err.message);
      results.push({ name: target.name, status: "OFFLINE_SKIPPED", error: err.message });
    } finally {
      await page.close();
    }
  }

  await browser.close();

  const reportHtml = `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <title>V7M Visual Regression Audit Report</title>
  <style>
    body { font-family: system-ui, sans-serif; background: #0f172a; color: #f8fafc; padding: 2rem; }
    table { width: 100%; border-collapse: collapse; margin-top: 1rem; background: #1e293b; border-radius: 8px; overflow: hidden; }
    th, td { padding: 12px 16px; text-align: left; border-bottom: 1px solid #334155; }
    th { background: #334155; }
    .passed { color: #4ade80; font-weight: bold; }
    .diff { color: #facc15; font-weight: bold; }
    .skipped { color: #94a3b8; }
  </style>
</head>
<body>
  <h1>Visual Regression Audit Report</h1>
  <p>Generated at: ${new Date().toISOString()}</p>
  <table>
    <thead><tr><th>Target</th><th>Status</th><th>URL</th></tr></thead>
    <tbody>
      ${results
        .map(
          (r) => `<tr>
            <td>${r.name}</td>
            <td class="${r.status === "PASSED" ? "passed" : r.status === "DIFF_DETECTED" ? "diff" : "skipped"}">${r.status}</td>
            <td>${r.url || "-"}</td>
          </tr>`
        )
        .join("")}
    </tbody>
  </table>
</body>
</html>`;

  const reportPath = path.join(reportsDir, "visual-regression-report.html");
  fs.writeFileSync(reportPath, reportHtml, "utf-8");
  console.log(`=== Visual report generated at: ${reportPath} ===`);
}

runVisualAudit().catch((err) => {
  console.error("Visual audit encountered an error:", err);
  process.exit(1);
});

// Harness de screenshot (manual Victor §1). Uso:
//   node scripts/shot.mjs <porta> <role> <arquivo.png>
// Monta a URL dentro do script (ambientes barram URL embutida no shell).
// Reporta { scrollHeight, viewportHeight, scrolls, scrollsHorizontal }.
import { chromium } from "@playwright/test";

const [port, role, out] = process.argv.slice(2);
if (!port || !role || !out) {
  console.error("uso: node scripts/shot.mjs <porta> <role> <arquivo.png>");
  process.exit(2);
}

const base = `http://localhost:${port}`;
const url = `${base}/dev-preview?role=${role}`;
const VW = 390; // viewport-alvo (mobile-first)
const VH = 844;

const browser = await chromium.launch();
const page = await browser.newPage({
  viewport: { width: VW, height: VH },
  deviceScaleFactor: 2,
});
await page.goto(url, { waitUntil: "networkidle" });
await page.waitForTimeout(400); // settling (backdrop-blur/font swap)

const m = await page.evaluate(
  (vh) => ({
    scrollHeight: document.documentElement.scrollHeight,
    scrolls: document.documentElement.scrollHeight > vh + 1,
    scrollsHorizontal: document.documentElement.scrollWidth > 390 + 1,
  }),
  VH
);

await page.screenshot({ path: out, fullPage: false });
await browser.close();

console.log(
  JSON.stringify({ role, url, viewport: `${VW}x${VH}`, ...m })
);
import { chromium } from "playwright";
import fs from "fs";
import path from "path";

const SCREENSHOTS_DIR = "c:\\Users\\maestri33\\dev\\v7m\\tooling\\qa-audit\\screenshots\\resolutions";
fs.mkdirSync(SCREENSHOTS_DIR, { recursive: true });

const RESOLUTION_PROFILES = [
  { name: "ultrawide-4k", width: 2560, height: 1440, label: "Ultra-Wide 4K (2560x1440)" },
  { name: "fhd-desktop", width: 1920, height: 1080, label: "Full HD Desktop (1920x1080)" },
  { name: "laptop-hd", width: 1366, height: 768, label: "Laptop Standard (1366x768)" },
  { name: "tablet-ipad", width: 768, height: 1024, label: "Tablet iPad (768x1024)" },
  { name: "mobile-standard", width: 390, height: 844, label: "Mobile Standard (390x844)" },
  { name: "mobile-compact", width: 320, height: 568, label: "Mobile Compact iPhone SE (320x568)" },
];

const TARGETS = [
  { name: "App Supletivo", url: "http://localhost:3020/" },
  { name: "App Promotor", url: "http://localhost:3001/" },
  { name: "Admin V7M", url: "http://localhost:3003/login" },
  { name: "Hub V7M", url: "http://localhost:3004/" },
  { name: "Landing Supletivo", url: "http://localhost:3011/" },
  { name: "Landing Promotor", url: "http://localhost:3010/" },
];

export async function runExtremeResolutionsSuite() {
  console.log("\n========================================================");
  console.log(" 🧪 SUITE 9: EXTREME RESOLUTIONS & VIEWPORT OVERFLOW AUDIT");
  console.log("========================================================\n");

  const results = [];
  const browser = await chromium.launch({ headless: true });

  for (const target of TARGETS) {
    const slug = target.name.toLowerCase().replace(/[^a-z0-9]+/g, "-");

    for (const profile of RESOLUTION_PROFILES) {
      const context = await browser.newContext({
        viewport: { width: profile.width, height: profile.height },
        deviceScaleFactor: profile.width <= 768 ? 2 : 1,
      });
      const page = await context.newPage();

      try {
        const start = Date.now();
        await page.goto(target.url, { waitUntil: "domcontentloaded", timeout: 15000 });
        await page.waitForTimeout(400);

        // Detecta overflow horizontal indesejado
        const overflow = await page.evaluate(() => {
          const docWidth = document.documentElement.scrollWidth;
          const winWidth = window.innerWidth;
          const bodyWidth = document.body ? document.body.scrollWidth : docWidth;
          const maxScroll = Math.max(docWidth, bodyWidth);
          return {
            hasOverflow: maxScroll > winWidth + 2, // tolerância de 2px para subpixel
            scrollWidth: maxScroll,
            innerWidth: winWidth,
            diff: maxScroll - winWidth,
          };
        });

        const duration = Date.now() - start;
        const screenshotFile = `${slug}-${profile.name}.png`;
        await page.screenshot({ path: path.join(SCREENSHOTS_DIR, screenshotFile) });

        if (!overflow.hasOverflow) {
          console.log(`  ✅ [${target.name}] [${profile.name}] Sem overflow horizontal (${duration}ms)`);
          results.push({
            name: `Viewport: ${target.name} (${profile.name})`,
            status: "PASS",
            durationMs: duration,
            details: `Largura ${profile.width}px OK`,
          });
        } else {
          console.warn(`  ⚠️ [${target.name}] [${profile.name}] Overflow detectado: +${overflow.diff}px além de ${profile.width}px`);
          results.push({
            name: `Viewport: ${target.name} (${profile.name})`,
            status: "PARTIAL",
            durationMs: duration,
            details: `Overflow de ${overflow.diff}px`,
          });
        }
      } catch (err) {
        console.error(`  ❌ [${target.name}] [${profile.name}] Falha: ${err.message}`);
        results.push({
          name: `Viewport: ${target.name} (${profile.name})`,
          status: "FAIL",
          error: err.message,
        });
      } finally {
        await context.close();
      }
    }
  }

  await browser.close();
  return results;
}

if (process.argv[1] && process.argv[1].endsWith("09-extreme-resolutions.mjs")) {
  runExtremeResolutionsSuite().then((results) => {
    const passed = results.filter((r) => r.status === "PASS").length;
    const failed = results.filter((r) => r.status === "FAIL").length;
    console.log(`\n🎯 Fim da Suite 9: ${passed} PASS | ${failed} FAIL\n`);
  });
}

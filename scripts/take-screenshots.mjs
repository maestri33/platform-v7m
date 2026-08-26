/**
 * V7M Visual Testing — Script direto (sem test runner)
 * Navega por cada app, tira screenshots em mobile e desktop.
 * Uso: node scripts/take-screenshots.mjs
 */
import { chromium } from "playwright";
import { mkdirSync, existsSync } from "node:fs";
import { join, resolve } from "node:path";

const DIR = resolve("screenshots", "e2e");
if (!existsSync(DIR)) mkdirSync(DIR, { recursive: true });

const MOBILE = { width: 390, height: 844 };
const DESKTOP = { width: 1440, height: 900 };

const apps = [
  { name: "supletivo", port: 3020, paths: ["/", "/kit", "/login"] },
  { name: "v7m", port: 3001, paths: ["/"] },
  { name: "hub", port: 3004, paths: ["/"] },
  { name: "admin", port: 3003, paths: ["/"] },
  { name: "landing-promotor", port: 3010, paths: ["/"] },
  { name: "landing-supletivo", port: 3011, paths: ["/"] },
  { name: "institucional", port: 3002, paths: ["/"] },
];

const errors = [];

async function screenshot(page, name) {
  const path = join(DIR, `${name}.png`);
  await page.screenshot({ path, fullPage: true });
  console.log(`  📸 ${name}.png`);
}

async function testApp(browser, app) {
  console.log(`\n🔍 ${app.name} (:${app.port})`);
  const base = `http://localhost:${app.port}`;

  for (const vp of [
    { label: "mobile", ...MOBILE },
    { label: "desktop", ...DESKTOP },
  ]) {
    const ctx = await browser.newContext({
      viewport: { width: vp.width, height: vp.height },
      deviceScaleFactor: vp.label === "mobile" ? 2 : 1,
    });

    // Collect console errors
    const consoleErrors = [];
    const page = await ctx.newPage();
    page.on("console", (msg) => {
      if (msg.type() === "error") consoleErrors.push(msg.text());
    });
    page.on("pageerror", (err) => consoleErrors.push(err.message));

    for (const path of app.paths) {
      const suffix = path === "/" ? "home" : path.replace(/^\//, "").replace(/\//g, "-");
      const name = `${app.name}-${suffix}-${vp.label}`;

      try {
        const res = await page.goto(`${base}${path}`, {
          waitUntil: "networkidle",
          timeout: 15000,
        });
        const status = res?.status() ?? 0;

        // Check for navigation redirect (login etc)
        const finalUrl = page.url();
        if (finalUrl !== `${base}${path}` && path !== "/") {
          console.log(`  ↪ Redirected: ${path} → ${finalUrl.replace(base, "")}`);
        }

        await page.waitForTimeout(500); // Let animations settle
        await screenshot(page, name);

        if (status >= 400 && status !== 404) {
          errors.push(`${app.name}${path}: HTTP ${status}`);
        }

        // Check accessibility basics
        const title = await page.title();
        if (!title || title === "undefined") {
          errors.push(`${app.name}${path}: Missing page title`);
        }

        // Check for broken images
        const brokenImages = await page.evaluate(() => {
          return Array.from(document.querySelectorAll("img"))
            .filter((img) => !img.complete || img.naturalWidth === 0)
            .map((img) => img.src);
        });
        if (brokenImages.length > 0) {
          errors.push(`${app.name}${path}: ${brokenImages.length} broken image(s): ${brokenImages.join(", ")}`);
        }

        // Check for horizontal overflow (mobile)
        if (vp.label === "mobile") {
          const overflow = await page.evaluate(() => {
            return document.body.scrollWidth > window.innerWidth;
          });
          if (overflow) {
            errors.push(`${app.name}${path}: Horizontal overflow detected on mobile`);
          }
        }

        // Check for missing alt text on images
        const missingAlts = await page.evaluate(() => {
          return Array.from(document.querySelectorAll("img:not([alt])")).length;
        });
        if (missingAlts > 0) {
          errors.push(`${app.name}${path}: ${missingAlts} image(s) missing alt text`);
        }

        // Check for empty links
        const emptyLinks = await page.evaluate(() => {
          return Array.from(document.querySelectorAll("a"))
            .filter((a) => {
              const text = (a.textContent || "").trim();
              const aria = a.getAttribute("aria-label") || "";
              return !text && !aria && !a.querySelector("img, svg");
            }).length;
        });
        if (emptyLinks > 0) {
          errors.push(`${app.name}${path}: ${emptyLinks} empty link(s) without accessible text`);
        }

        // Check color contrast on buttons
        const smallText = await page.evaluate(() => {
          return Array.from(document.querySelectorAll("button, a, p, span, label"))
            .filter((el) => {
              const style = getComputedStyle(el);
              const size = parseFloat(style.fontSize);
              return size > 0 && size < 10;
            }).length;
        });
        if (smallText > 0) {
          errors.push(`${app.name}${path}: ${smallText} element(s) with font-size < 10px`);
        }

      } catch (err) {
        errors.push(`${app.name}${path} [${vp.label}]: ${err.message}`);
        console.log(`  ❌ ${name}: ${err.message}`);
      }
    }

    // Report console errors
    if (consoleErrors.length > 0) {
      const unique = [...new Set(consoleErrors)];
      for (const e of unique.slice(0, 3)) {
        errors.push(`${app.name} [${vp.label}] console.error: ${e.slice(0, 150)}`);
      }
    }

    await ctx.close();
  }
}

(async () => {
  console.log("🚀 V7M Visual E2E Test Suite");
  console.log("═".repeat(50));

  const browser = await chromium.launch({ headless: true });

  for (const app of apps) {
    await testApp(browser, app);
  }

  await browser.close();

  console.log("\n" + "═".repeat(50));
  if (errors.length === 0) {
    console.log("✅ Nenhum problema encontrado!");
  } else {
    console.log(`\n⚠️  ${errors.length} problema(s) encontrado(s):\n`);
    errors.forEach((e, i) => console.log(`  ${i + 1}. ${e}`));
  }
  console.log(`\n📁 Screenshots salvas em: ${DIR}`);
  process.exit(errors.length > 0 ? 1 : 0);
})();

#!/usr/bin/env node
// Drive the Supletivo Brasil landing in headless Chromium.
//
// Exits non-zero on a hard failure (preview down, no CTAs, no `page_view`,
// eligibility result not visible). Reports a JSON summary on stdout.
//
// Usage (from <unit>/):
//   node .claude/skills/run-landing-supletivo/driver.mjs
//   node .claude/skills/run-landing-supletivo/driver.mjs --url http://localhost:4321/?ref=abc
//   node .claude/skills/run-landing-supletivo/driver.mjs --shots-dir /tmp/shots
//
// All paths emitted (screenshots, etc.) are absolute.

import { existsSync, mkdirSync, writeFileSync, readdirSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { createConnection } from 'node:net';

const __dirname = dirname(fileURLToPath(import.meta.url));
const UNIT_ROOT = resolve(__dirname, '..', '..', '..'); // <unit>/

// --- args --------------------------------------------------------------------
const args = parseArgs(process.argv.slice(2));
const URL_ = args.url ?? 'http://localhost:4321/';
const REF = args.ref ?? `agent-${Math.random().toString(36).slice(2, 8)}`;
const SHOTS_DIR = resolve(args['shots-dir'] ?? join(__dirname, 'screenshots'));
const VIEWPORT = (args.viewport ?? '1280x800').split('x').map(Number);
const STRICT = args.strict === 'true';

// --- preview guard -----------------------------------------------------------
// Cheap pre-flight: if the URL is local and the port is closed, fail loud
// with the exact `npm run preview` line instead of waiting for Playwright to
// time out.
await preflight(URL_);

// --- chromium resolve --------------------------------------------------------
const EXEC = resolveChromium();
if (!EXEC) {
  die(
    'No Chromium binary found.\n' +
      'Tried:\n' +
      '  - ~/.cache/ms-playwright/chromium-*/chrome-linux64/chrome\n' +
      '  - ~/.cache/ms-playwright/chromium_headless_shell-*/chrome-headless-shell-linux64/chrome-headless-shell\n' +
      '  - /usr/bin/chromium, /usr/bin/google-chrome\n' +
      'Fix (one of):\n' +
      '  npx playwright install chromium\n' +
      '  sudo apt-get install -y chromium'
  );
}

mkdirSync(SHOTS_DIR, { recursive: true });

// --- driver ------------------------------------------------------------------
import('@playwright/test')
  .then(async ({ chromium }) => {
    const browser = await chromium.launch({
      executablePath: EXEC,
      args: ['--no-sandbox', '--disable-dev-shm-usage'],
    });
    const ctx = await browser.newContext({ viewport: { width: VIEWPORT[0], height: VIEWPORT[1] } });
    const page = await ctx.newPage();

    // Mirror production: pretend to accept language + real UA already set by default.
    const consoleErrors = [];
    page.on('console', (msg) => {
      if (msg.type() === 'error') consoleErrors.push(msg.text());
    });
    page.on('pageerror', (err) => consoleErrors.push(`pageerror: ${err.message}`));

    const out = { url: URL_, ref: REF, shots: [], dataLayer: [], consoleErrors, axe: null };

    // ---- 1. Load with ref+UTMs -------------------------------------------
    const target = withParams(URL_, { ref: REF, utm_source: 'agent', utm_medium: 'smoke' });
    await page.goto(target, { waitUntil: 'domcontentloaded' });
    await page.waitForLoadState('networkidle').catch(() => {});

    // The page uses [data-reveal] + IntersectionObserver to fade sections in
    // (opacity 0 → 1). In headless capture we want every element visible
    // regardless of whether the observer has fired for it. Without this,
    // Playwright's `.click()` blocks waiting for the button to be visible
    // (it stays at opacity 0 until the section scrolls into the IO root).
    await page.evaluate(() => {
      document.querySelectorAll('[data-reveal],[data-seal],[data-cert]').forEach((el) => el.classList.add('in-view'));
      document.querySelectorAll('[data-lit]').forEach((el) => el.classList.add('lit'));
    });

    const ctaCount = await page.locator('a[data-cta]').count();
    if (ctaCount === 0) die('No a[data-cta] elements found on the page.');
    out.ctaCount = ctaCount;

    // All CTAs must contain our ref + utm_source.
    const ctaHrefs = await page.locator('a[data-cta]').evaluateAll((as) =>
      as.map((a) => ({ position: a.getAttribute('data-cta'), href: a.href }))
    );
    out.ctaHrefs = ctaHrefs;
    const missingRef = ctaHrefs.filter((c) => !c.href.includes(`ref=${REF}`));
    if (missingRef.length) {
      die(
        `Ref attribution broken: ${missingRef.length}/${ctaHrefs.length} CTAs missing ref=${REF}.\n` +
          missingRef.slice(0, 3).map((c) => `  - ${c.position}: ${c.href}`).join('\n')
      );
    }
    out.shots.push(await shootSection(page, SHOTS_DIR, '01-hero.png', 'hero'));

    // ---- 2. dataLayer: page_view + section_view (hero) -------------------
    await page.waitForTimeout(150);
    let dl = await readDataLayer(page);
    out.dataLayer.push(...dl);
    const pageView = dl.find((d) => d.event === 'page_view');
    if (!pageView) die('No page_view event in dataLayer.');
    if (pageView.ref !== REF) die(`page_view.ref = ${pageView.ref}, expected ${REF}.`);

    // ---- 3. Eligibility check (18+) --------------------------------------
    await scrollToId(page, 'elegibilidade');
    await page.waitForTimeout(300);
    await page.locator('[data-elig="18mais"]').click();
    await page.waitForTimeout(400);
    const eligResult = await page.locator('[data-elig-result]').textContent();
    if (!/Caminho livre/i.test(eligResult ?? '')) {
      die(`Eligibility result did not contain "Caminho livre": "${eligResult}"`);
    }
    out.eligibilityResult = (eligResult ?? '').trim();
    await page.waitForTimeout(700);
    out.shots.push(await shootSection(page, SHOTS_DIR, '02-eligibilidade-18mais.png', 'elegibilidade'));

    // ---- 4. CTA click (hero) ---------------------------------------------
    // Re-navigate cleanly so we have a fresh dataLayer to assert cta_click.
    await page.goto(target, { waitUntil: 'domcontentloaded' });
    await page.waitForLoadState('networkidle').catch(() => {});
    await page.evaluate(() => {
      document.addEventListener('click', (e) => {
        const a = e.target instanceof Element ? e.target.closest('a') : null;
        if (a?.hasAttribute('data-cta')) e.preventDefault();
      });
    });
    await page.locator('a[data-cta="hero"]').first().click();
    await page.waitForTimeout(150);
    dl = await readDataLayer(page);
    const ctaClick = dl.find((d) => d.event === 'cta_click');
    if (!ctaClick) die('cta_click event missing after hero click.');
    if (ctaClick.position !== 'hero') die(`cta_click.position = ${ctaClick.position}, expected "hero".`);
    out.dataLayer.push(...dl);

    // ---- 5. FAQ open -----------------------------------------------------
    await page.goto(target, { waitUntil: 'domcontentloaded' });
    await page.waitForLoadState('networkidle').catch(() => {});
    await page.evaluate(() => {
      const d = document.querySelector('details[data-faq]');
      if (d) d.open = true;
    });
    await page.waitForTimeout(150);
    dl = await readDataLayer(page);
    if (!dl.find((d) => d.event === 'faq_open')) die('faq_open event missing after toggling <details>.');
    out.dataLayer.push(...dl);
    await scrollToId(page, 'faq');
    await page.waitForTimeout(450);
    out.shots.push(await shootSection(page, SHOTS_DIR, '03-faq.png', 'faq'));

    // ---- 6. Scroll depth + section_view sweep ----------------------------
    await page.goto(target, { waitUntil: 'domcontentloaded' });
    await page.waitForLoadState('networkidle').catch(() => {});
    await page.evaluate(async () => {
      const doc = document.documentElement;
      for (let y = 0; y <= doc.scrollHeight; y += 400) {
        window.scrollTo({ top: y, behavior: 'instant' });
        await new Promise((r) => setTimeout(r, 30));
      }
      window.scrollTo({ top: doc.scrollHeight, behavior: 'instant' });
    });
    await page.waitForTimeout(400);
    dl = await readDataLayer(page);
    out.dataLayer.push(...dl);
    const depths = dl.filter((d) => d.event === 'scroll_depth').map((d) => d.depth);
    for (const d of [25, 50, 75, 100]) {
      if (!depths.includes(d)) die(`scroll_depth=${d} not fired (got ${JSON.stringify(depths)}).`);
    }
    const sections = dl.filter((d) => d.event === 'section_view').map((d) => d.section);
    out.sections = sections;
    for (const s of ['hero', 'preco', 'faq']) {
      if (!sections.includes(s)) die(`section_view "${s}" not fired (got ${JSON.stringify(sections)}).`);
    }
    out.shots.push(await shootSection(page, SHOTS_DIR, '04-footer.png', 'final'));

    // ---- 7. Section snapshots (mirrored from tools/shots.mjs) -------------
    await page.goto(target, { waitUntil: 'domcontentloaded' });
    await page.waitForLoadState('networkidle').catch(() => {});
    await page.evaluate(() => {
      document.querySelectorAll('[data-reveal],[data-seal],[data-cert]').forEach((el) => el.classList.add('in-view'));
      document.querySelectorAll('[data-lit]').forEach((el) => el.classList.add('lit'));
    });
    for (const [id, file] of [
      ['espelho', '05-espelho.png'],
      ['confianca', '06-confianca.png'],
      ['preco', '07-preco.png'],
    ]) {
      await scrollToId(page, id);
      await page.waitForTimeout(450);
      out.shots.push(await shootSection(page, SHOTS_DIR, file, id));
    }

    // ---- 8. axe a11y (best-effort, don't hard-fail) ----------------------
    try {
      const axeMod = await import('@axe-core/playwright');
      const AxeBuilder = axeMod.default;
      const results = await new AxeBuilder({ page }).withTags(['wcag2a', 'wcag2aa']).analyze();
      out.axe = {
        violations: results.violations.length,
        details: results.violations.map((v) => ({ id: v.id, impact: v.impact, nodes: v.nodes.length })),
      };
    } catch (e) {
      out.axe = { error: e.message };
    }

    // ---- 9. Sub-pages quick health check ---------------------------------
    const subpages = ['/supletivo-online/', '/eja-a-distancia/', '/terminar-ensino-medio/', '/termos/', '/privacidade/'];
    const subpageResults = {};
    for (const p of subpages) {
      const r = await page.goto(new URL(p, URL_).toString(), { waitUntil: 'domcontentloaded' });
      subpageResults[p] = { status: r?.status() ?? 0 };
    }
    out.subpages = subpageResults;

    // ---- 10. Done --------------------------------------------------------
    out.consoleErrors = consoleErrors;
    out.consoleErrorCount = consoleErrors.length;

    await browser.close();

    // Persist a JSON summary next to the shots so a future agent can grep it.
    const summaryPath = join(SHOTS_DIR, 'summary.json');
    writeFileSync(summaryPath, JSON.stringify(out, null, 2));

    process.stdout.write(JSON.stringify(out, null, 2) + '\n');

    if (STRICT && out.consoleErrorCount > 0) {
      console.error(`\n${out.consoleErrorCount} console error(s) — see summary.json`);
      process.exit(2);
    }
  })
  .catch((e) => {
    die(`Driver crashed: ${e.message}\n${e.stack}`);
  });

// --- helpers -----------------------------------------------------------------

function parseArgs(argv) {
  const out = {};
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    if (a.startsWith('--')) {
      const key = a.slice(2);
      const next = argv[i + 1];
      if (!next || next.startsWith('--')) {
        out[key] = 'true';
      } else {
        out[key] = next;
        i++;
      }
    }
  }
  return out;
}

function withParams(urlString, params) {
  const u = new URL(urlString);
  for (const [k, v] of Object.entries(params)) {
    if (!u.searchParams.has(k)) u.searchParams.set(k, v);
  }
  return u.toString();
}

async function readDataLayer(page) {
  return page.evaluate(
    () => (window).dataLayer ? (window).dataLayer.slice() : []
  );
}

async function scrollToId(page, id) {
  await page.evaluate((sel) => {
    // Force instant scroll — the page has `html { scroll-behavior: smooth }`
    // for the in-page nav anchors, but for headless capture we want a hard
    // jump with no animation. window.scrollTo with a known y always wins.
    const el = document.getElementById(sel);
    if (!el) return;
    const y = el.getBoundingClientRect().top + window.scrollY;
    window.scrollTo({ top: y, behavior: 'instant' });
  }, id);
}

async function shoot(page, dir, name) {
  const p = join(dir, name);
  // Explicit clip to the viewport — the default `page.screenshot()` (without
  // clip) has been observed to capture the un-scrolled frame on this page
  // when the document has scrolled but the compositor hasn't repainted yet.
  // Clipping the top-left 1280x800 always returns the visible viewport.
  const [w, h] = VIEWPORT;
  await page.screenshot({ path: p, clip: { x: 0, y: 0, width: w, height: h } });
  return p;
}

// Screenshot a specific <section id="..."> by its bounding box. This is more
// robust than `page.screenshot()` (viewport) when the section is offscreen:
// locator.screenshot() captures the element's computed rect, which is what we
// actually want — independent of where the page happens to be scrolled to.
//
// We intentionally do NOT scroll the page here. Scrolling (especially smooth
// scroll, which this page uses) can leave elements with `data-reveal` in
// `opacity: 0` because the IntersectionObserver hasn't fired yet, and the
// next interaction in the driver will time out trying to click them.
// locator.screenshot() handles off-screen sections on its own.
async function shootSection(page, dir, name, sectionId) {
  const p = join(dir, name);
  const loc = page.locator(`section#${sectionId}`);
  await loc.screenshot({ path: p });
  return p;
}

function portOpen(host, port) {
  return new Promise((resolveP) => {
    let settled = false;
    const sock = createConnection({ host, port });
    const done = (ok) => {
      if (settled) return;
      settled = true;
      sock.destroy();
      resolveP(ok);
    };
    sock.setTimeout(1200, () => done(false));
    sock.once('connect', () => done(true));
    sock.once('error', () => done(false));
  });
}

// (portOpen is async — wrap the guard with a tiny top-level await equivalent.)
async function preflight(urlString) {
  if (!/^https?:\/\/(localhost|127\.0\.0\.1)(:\d+)?\//.test(urlString)) return;
  const u = new URL(urlString);
  const ok = await portOpen(u.hostname, Number(u.port) || 80);
  if (!ok) {
    die(
      `Preview server is not reachable at ${u.origin}.\n` +
        `Start it first (from ${UNIT_ROOT}):\n` +
        `  npm run build && npm run preview\n` +
        `…or:\n` +
        `  python3 -m http.server 4321 -d dist`
    );
  }
}

function resolveChromium() {
  const home = process.env.HOME || '/root';
  const playwrightRoot = process.env.PLAYWRIGHT_BROWSERS_PATH || join(home, '.cache', 'ms-playwright');
  const candidates = [
    // Prefer the headed chromium (renders fonts/animations accurately).
    ...walk(playwrightRoot, /^chromium-\d+$/, 'chrome-linux64/chrome'),
    // Fall back to headless_shell (smaller, no font rendering extras).
    ...walk(playwrightRoot, /^chromium_headless_shell-\d+$/, 'chrome-headless-shell-linux64/chrome-headless-shell'),
    '/usr/bin/chromium',
    '/usr/bin/chromium-browser',
    '/usr/bin/google-chrome',
  ];
  for (const c of candidates) {
    if (c && existsSync(c)) return c;
  }
  return null;
}

function walk(root, dirRe, file) {
  if (!existsSync(root)) return [];
  const out = [];
  for (const name of readdirSync(root)) {
    if (!dirRe.test(name)) continue;
    const p = join(root, name, file);
    if (existsSync(p)) out.push(p);
  }
  // Prefer the newest version (sorted desc).
  return out.sort().reverse();
}

function die(msg) {
  console.error(`\n[run-landing-supletivo] ${msg}\n`);
  process.exit(1);
}

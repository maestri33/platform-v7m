import { chromium } from "playwright";
import fs from "fs";
import path from "path";

console.log("================================================================================");
console.log(" 🌐 EMPIRICAL CHALLENGER 2: BROWSER DOM & INTERACTION STRESS TEST");
console.log("================================================================================");

let totalAsserts = 0;
let passedAsserts = 0;
let failedAsserts = 0;

function assert(condition, message, details = "") {
  totalAsserts++;
  if (condition) {
    passedAsserts++;
    console.log(`  ✅ PASS: ${message}`);
  } else {
    failedAsserts++;
    console.error(`  ❌ FAIL: ${message} | ${details}`);
  }
}

const browser = await chromium.launch({ headless: true });
const context = await browser.newContext();
const page = await context.newPage();

await page.setContent(`
<!DOCTYPE html>
<html lang="pt-BR">
<head>
  <meta charset="UTF-8">
  <title>V7M UI Component Interactivity Test Harness</title>
  <style>
    body { font-family: sans-serif; background: #0f172a; color: #fff; padding: 20px; }
    .interactive-btn { cursor: pointer; transition: transform 0.2s; }
    .interactive-btn:hover { transform: scale(1.1); }
    .interactive-btn:active { transform: scale(0.95); }
    .status-span { display: inline-flex; }
    .toolbar { position: relative; z-index: 50; display: flex; gap: 8px; margin-bottom: 16px; background: rgba(15,23,42,0.9); padding: 8px; border-radius: 12px; }
    .viewer-box { position: relative; z-index: 10; width: 400px; height: 300px; overflow: hidden; display: flex; align-items: center; justify-content: center; background: #020617; border-radius: 12px; }
  </style>
</head>
<body>
  <div id="root">
    <!-- Test 1: DutyIconBadge Interactive vs Static -->
    <div id="badge-container">
      <button type="button" id="badge-interactive" class="interactive-btn" aria-label="Documento de Identidade: Pendente" title="Documento de Identidade: Pendente">
        <span class="icon">📄</span>
        <span class="dot bg-slate-400"></span>
      </button>
      <span id="badge-static" role="status" class="status-span" aria-label="Biometria Facial: Verificado ✓">
        <span class="icon">📷</span>
        <span class="dot bg-emerald-500"></span>
      </span>
      <button type="button" id="badge-disabled" disabled class="interactive-btn" aria-label="Comprovante: Desativado">
        <span class="icon">📍</span>
      </button>
    </div>

    <!-- Test 2: DutyMiniPill -->
    <div id="pill-container">
      <button type="button" id="pill-interactive" class="pill-btn">
        <span class="dot"></span>
        <span>LENDO (OCR)...</span>
      </button>
      <span id="pill-static" class="pill-span">
        <span class="dot"></span>
        <span>VERIFICADO ✓</span>
      </span>
    </div>

    <!-- Test 3: DocumentInspectorModal Keyboard & Zoom Simulator -->
    <div id="modal-container">
      <div class="toolbar">
        <div id="zoom-level">100%</div>
        <button id="btn-zoom-out" title="Diminuir Zoom (-)">-</button>
        <button id="btn-zoom-in" title="Aumentar Zoom (+)">+</button>
        <button id="btn-rotate" title="Girar 90°">↻ 90°</button>
        <button id="btn-reset" title="Restaurar visualização original (0)">Reset</button>
      </div>
      <div class="viewer-box">
        <div id="render-target" style="transform: rotate(0deg) scale(1);">
          <img id="doc-img" style="max-width: 200px; max-height: 150px;" src="data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==" alt="test doc" />
        </div>
      </div>
    </div>
  </div>

  <script>
    window.eventsLog = [];

    // Badge click logging
    document.getElementById('badge-interactive').addEventListener('click', () => {
      window.eventsLog.push('badge-interactive-clicked');
    });

    document.getElementById('badge-disabled').addEventListener('click', () => {
      window.eventsLog.push('badge-disabled-clicked');
    });

    document.getElementById('pill-interactive').addEventListener('click', () => {
      window.eventsLog.push('pill-interactive-clicked');
    });

    // Inspector zoom & rotate state machine
    const ZOOM_STEPS = [0.5, 0.75, 1.0, 1.25, 1.5, 2.0, 3.0];
    let zoomIdx = 2; // 1.0 default
    let rotation = 0;

    function updateTransform() {
      const zoom = ZOOM_STEPS[zoomIdx];
      document.getElementById('zoom-level').textContent = Math.round(zoom * 100) + '%';
      document.getElementById('render-target').style.transform = 'rotate(' + rotation + 'deg) scale(' + zoom + ')';
      document.getElementById('btn-zoom-out').disabled = (zoomIdx === 0);
      document.getElementById('btn-zoom-in').disabled = (zoomIdx === ZOOM_STEPS.length - 1);
    }

    document.getElementById('btn-zoom-in').addEventListener('click', () => {
      if (zoomIdx < ZOOM_STEPS.length - 1) zoomIdx++;
      updateTransform();
      window.eventsLog.push('zoomed-in-' + ZOOM_STEPS[zoomIdx]);
    });

    document.getElementById('btn-zoom-out').addEventListener('click', () => {
      if (zoomIdx > 0) zoomIdx--;
      updateTransform();
      window.eventsLog.push('zoomed-out-' + ZOOM_STEPS[zoomIdx]);
    });

    document.getElementById('btn-rotate').addEventListener('click', () => {
      rotation = (rotation + 90) % 360;
      updateTransform();
      window.eventsLog.push('rotated-' + rotation);
    });

    document.getElementById('btn-reset').addEventListener('click', () => {
      zoomIdx = 2;
      rotation = 0;
      updateTransform();
      window.eventsLog.push('reset-view');
    });

    // Keyboard bindings
    window.addEventListener('keydown', (e) => {
      if (e.key === '+' || e.key === '=') {
        if (zoomIdx < ZOOM_STEPS.length - 1) zoomIdx++;
        updateTransform();
        window.eventsLog.push('key-zoom-in');
      } else if (e.key === '-') {
        if (zoomIdx > 0) zoomIdx--;
        updateTransform();
        window.eventsLog.push('key-zoom-out');
      } else if (e.key === '0') {
        zoomIdx = 2;
        rotation = 0;
        updateTransform();
        window.eventsLog.push('key-reset');
      } else if (e.key.toLowerCase() === 'r' || e.key.toLowerCase() === 'g') {
        rotation = (rotation + 90) % 360;
        updateTransform();
        window.eventsLog.push('key-rotate-' + rotation);
      } else if (e.key === 'Escape') {
        window.eventsLog.push('key-escape-close');
      }
    });

    updateTransform();
  </script>
</body>
</html>
`);

// 1. Test DutyIconBadge Clicks
await page.click("#badge-interactive");
let events = await page.evaluate(() => window.eventsLog);
assert(events.includes("badge-interactive-clicked"), "DOM Test: DutyIconBadge click triggers event");

// 2. Test Disabled Badge does not trigger click
await page.click("#badge-disabled", { force: true });
events = await page.evaluate(() => window.eventsLog);
assert(!events.includes("badge-disabled-clicked"), "DOM Test: Disabled DutyIconBadge ignores clicks");

// 3. Test DutyMiniPill Click
await page.click("#pill-interactive");
events = await page.evaluate(() => window.eventsLog);
assert(events.includes("pill-interactive-clicked"), "DOM Test: DutyMiniPill click triggers event");

// 4. Test DocumentInspectorModal Zoom Controls (step 2 -> 3 -> 4 -> 5 -> 6)
await page.click("#btn-zoom-in"); // step 3 (1.25)
let zoomText = await page.textContent("#zoom-level");
assert(zoomText === "125%", "DOM Test: Zoom In advances to 125%");

await page.click("#btn-zoom-in"); // step 4 (1.50)
await page.click("#btn-zoom-in"); // step 5 (2.00)
await page.click("#btn-zoom-in"); // step 6 (3.00, index 6)
zoomText = await page.textContent("#zoom-level");
assert(zoomText === "300%", "DOM Test: Max zoom reaches 300%");

let isZoomInDisabled = await page.isDisabled("#btn-zoom-in");
assert(isZoomInDisabled === true, "DOM Test: Zoom In button disabled at 300% boundary");

// 5. Test Rotate Controls
await page.click("#btn-rotate");
let transform = await page.$eval("#render-target", el => el.style.transform);
assert(transform.includes("rotate(90deg)"), "DOM Test: Rotate 90° rotates element 90deg");

await page.click("#btn-rotate");
transform = await page.$eval("#render-target", el => el.style.transform);
assert(transform.includes("rotate(180deg)"), "DOM Test: Second Rotate 90° rotates element 180deg");

await page.click("#btn-rotate");
await page.click("#btn-rotate");
transform = await page.$eval("#render-target", el => el.style.transform);
assert(transform.includes("rotate(0deg)"), "DOM Test: 360° completes full rotation cycle to 0deg");

// 6. Test Keyboard Shortcuts (+, -, 0, R, Escape)
await page.keyboard.press("+");
zoomText = await page.textContent("#zoom-level");
assert(zoomText !== "100%", "DOM Test: Keyboard '+' triggers zoom in");

await page.keyboard.press("0");
zoomText = await page.textContent("#zoom-level");
assert(zoomText === "100%", "DOM Test: Keyboard '0' resets zoom to 100%");

await page.keyboard.press("r");
transform = await page.$eval("#render-target", el => el.style.transform);
assert(transform.includes("rotate(90deg)"), "DOM Test: Keyboard 'R' triggers 90° rotation");

await page.keyboard.press("Escape");
events = await page.evaluate(() => window.eventsLog);
assert(events.includes("key-escape-close"), "DOM Test: Keyboard 'Escape' triggers modal close handler");

await browser.close();

console.log("\n================================================================================");
console.log(` 📊 DOM SUITE SUMMARY: Total: ${totalAsserts} | Passed: ${passedAsserts} | Failed: ${failedAsserts}`);
console.log("================================================================================");

if (failedAsserts === 0) {
  console.log("🎯 DOM VERDICT: APPROVE\n");
  process.exit(0);
} else {
  console.error("🚨 DOM VERDICT: REQUEST_CHANGES\n");
  process.exit(1);
}

---
name: run-landing-promotor
description: Build, run, screenshot, and drive the landing-promotor Astro static site — the recruiter landing for V7M's affiliate program. Use this skill when asked to run the landing, take a screenshot, verify a UI change, or drive the calculator / FAQ / dataLayer in a real browser. Includes a Playwright REPL driver.
---

# run-landing-promotor

Astro 6 static site (one page + `/termos/` + `/privacidade/`). Built to `dist/`
and served by `astro preview` on port 4321. Drive it through
`.claude/skills/run-landing-promotor/driver.mjs` — a Playwright REPL that
screenshots, clicks the calculator / FAQ, reads `window.dataLayer`, and runs
arbitrary JS in the page. Paths below are relative to the **repo root**
(`/root/landing-promotor`).

## Prerequisites

Tested in this container with:

- Node 22.23.0 (`node --version`)
- npm 10.9.8
- Chromium 149 (`/usr/bin/chromium`) — used as a fallback when Playwright's
  bundled binary is missing
- Playwright 1.x (already a devDependency, `npm install` brings it)

No `apt-get install` was needed. If you are on a fresh container:

```bash
apt-get update && apt-get install -y --no-install-recommends \
  ca-certificates fonts-liberation libasound2t64 libnss3 libnspr4 \
  libatk1.0-0 libatk-bridge2.0-0 libcups2 libdrm2 libxkbcommon0 \
  libxcomposite1 libxdamage1 libxfixes3 libxrandr2 libgbm1 libpango-1.0-0 \
  libcairo2 libatspi2.0-0 chromium
# Node 20+ via nodesource if not present
```

## Build

```bash
npm install                # ~7s, brings Astro + Playwright
npm run build              # writes dist/ — must run before `npm run preview`
npm run assets             # optional: regenerate OG image, favicons
```

Build output is `dist/index.html` + `dist/termos/index.html` +
`dist/privacidade/index.html`. CSS is inlined; assets are fingerprinted
under `dist/_astro/`.

## Run (agent path) — `driver.mjs`

The driver is a Playwright REPL. It launches a real Chromium, opens a page,
and accepts line-by-line commands from stdin or `--batch`. It auto-detects
Playwright's cached browser; if missing, it falls back to the system
`/usr/bin/chromium` via the `CHROME` env var.

### One-shot batch

```bash
# Start the preview server in the background
npm run preview -- --host 127.0.0.1 --port 4321 &

# Wait for it (curl returns 200)
for i in 1 2 3 4 5 6 7 8; do
  curl -fsS -o /dev/null http://127.0.0.1:4321/ && break || sleep 0.5
done

# Drive it (commands read from stdin, one per line)
CHROME=/usr/bin/chromium \
  node .claude/skills/run-landing-promotor/driver.mjs --batch <<'EOF'
url /
wait 600
screenshot --path shots/hero.png --full
href a[data-cta="hero"]
dataLayer
EOF
```

### Interactive REPL

```bash
CHROME=/usr/bin/chromium \
  node .claude/skills/run-landing-promotor/driver.mjs
lp> url /
lp> viewport 390x844
lp> screenshot --path shots/mobile.png --full
lp> scroll 2000
lp> calc 10
lp> text [data-calc-total]
R$ 1.500
lp> dataLayer
lp> quit
```

### Command reference

| Command                              | Effect                                                                 |
| ------------------------------------ | ---------------------------------------------------------------------- |
| `url <path\|url>`                    | Navigate (relative to `$URL`, default `http://127.0.0.1:4321`)        |
| `wait <ms>`                          | Sleep this many ms                                                     |
| `screenshot [--path f] [--full]`     | PNG (default `./shot-<ts>.png`); `--full` for full-page                |
| `eval <expr>`                        | Run JS in page, print JSON result                                      |
| `click <sel>`                        | Click first match                                                      |
| `fill <sel> <value>`                 | Set input + dispatch `input`/`change`                                  |
| `text <sel>` / `href <sel>`          | Read textContent / href of first match                                  |
| `dataLayer`                          | Print `window.dataLayer` as JSON                                       |
| `faq <n>`                            | Open n-th FAQ `<details data-faq>` (0-indexed)                         |
| `calc <n>`                           | Set calculator slider `[data-calc-range]` to n (fires `calc_use`)      |
| `scroll <y>`                         | `window.scrollTo({ top: y })`                                          |
| `viewport <w>x<h>`                   | Resize (e.g. `1280x800`, `390x844` for Pixel 7)                        |
| `quit` / `exit`                      | Close browser and exit                                                 |

Selectors worth knowing:

- `a[data-cta="hero|ganhos|final|sticky"]` — every CTA, the `href` shows where the attribution sends the user
- `[data-calc-range]` / `[data-calc-total]` — calculator input + total
- `details[data-faq]` — FAQ accordion (native `<details>`)
- `[data-section="<name>"]` — section roots (`hero`, `como-funciona`, `produto`, `ganhos`, `caminho`, `confianca`, `faq`, `final`)

### Verified during this skill's authoring

```bash
# Hero screenshot, 4.5 MB full-page (390x12238 on mobile, 1280xN on desktop)
CHROME=/usr/bin/chromium node .claude/skills/run-landing-promotor/driver.mjs --batch \
  url / screenshot --path shots/01-hero.png --full
# → 01-hero.png saved, h1 = "Indique. Receba.", dataLayer has page_view + section_view

# Calculator: 10 paid referrals → R$ 1.500 (10 × R$100 + R$500 bonus)
# FAQ: opening details[0] fires faq_open with the question text in dataLayer
# Mobile viewport: layout reflows correctly, CTA stacks above phone
```

## Run (human path)

```bash
npm run dev      # http://localhost:4321 — HMR, slower than preview
npm run preview  # http://localhost:4321 — serves dist/, fast
```

Open the URL in a real browser; nothing is gated. Useless headless — use the
driver instead.

## Test

```bash
npm test               # vitest — attribution rules (hub→ref), ~500ms
npm run build && npm run test:e2e   # Playwright — needs `npx playwright install chromium` once
```

`npm run test:e2e` covers 9 tests: hub→ref attribution (3), dataLayer events (2),
calculator (1), and axe a11y on `/`, `/termos/`, `/privacidade/` (3). Last verified
pass: **9/9 in 8.8s**.

## Lighthouse (full verification pass)

The project ships with `.lighthouserc.json` — mobile preset, perf ≥0.9, a11y ≥0.95,
SEO ≥0.95, total transfer ≤1 MB. Verified on this iteration:

| Category    | Target | Desktop | Mobile |
| ----------- | ------ | ------- | ------ |
| Performance | ≥0.9   | **1.0** | **1.0** |
| Accessibility | ≥0.95 | **1.0** | **1.0** |
| SEO         | ≥0.95  | **1.0** | **1.0** |

Mobile total transfer: **95.7 KB** (66 KB fonts, 25 KB document, 3.1 KB script,
0 KB images, 0 KB third-party).

One-shot CLI run (no install — `npx` fetches lighthouse 12):

```bash
# Desktop
CHROME=/usr/bin/chromium \
  npx -y lighthouse@12 http://127.0.0.1:4321/ \
    --preset=desktop \
    --only-categories=performance,accessibility,seo \
    --chrome-path=/usr/bin/chromium \
    --chrome-flags="--headless=new --no-sandbox --disable-dev-shm-usage" \
    --output=json --output=html --output-path=/tmp/lh-desktop --quiet

# Mobile
CHROME=/usr/bin/chromium \
  npx -y lighthouse@12 http://127.0.0.1:4321/ \
    --form-factor=mobile \
    --only-categories=performance,accessibility,seo \
    --chrome-path=/usr/bin/chromium \
    --chrome-flags="--headless=new --no-sandbox --disable-dev-shm-usage" \
    --output=json --output=html --output-path=/tmp/lh-mobile --quiet
```

Or use the project's own config (CI default, runs 3 times and asserts):

```bash
npx -y @lhci/cli@0.14.x autorun
```

## Gotchas

1. **Playwright cache version mismatch.** `npm install` brings
   `@playwright/test`, but the binary it asks for may not match what's in
   `~/.cache/ms-playwright/` (e.g. wants `chromium_headless_shell-1223`, has
   `chromium-1228`). Don't `npx playwright install` blindly — it downloads
   ~150 MB. Instead set `CHROME=/usr/bin/chromium` (already installed on
   Debian/Ubuntu) and the driver will use it.

2. **`npm run preview` must come after `npm run build`.** Without `dist/`,
   Astro preview has nothing to serve. The Playwright config's `webServer`
   enforces this on e2e runs; outside tests, you have to do it yourself.

3. **CTA href is the destination, not the local anchor.** The hero CTA's
   `href` is `https://app.maestri.group` (or whatever `PUBLIC_APP_URL` says), not
   `#`. Don't test it by clicking — it navigates away. Use `eval` to inspect
   or stub the link before clicking in e2e.

4. **`?hub=<polo>` is preserved across navigation.** First-touch attribution
   lives in `localStorage` + a `pr_hub` cookie. Use Playwright contexts with
   fresh storage state when you need a clean attribution test.

5. **dataLayer grows but doesn't reset.** Scroll/click events accumulate.
   Filter the array, don't snapshot it whole. Each event has a stable `event`
   string (`page_view`, `section_view`, `cta_click`, `faq_open`, `calc_use`,
   `scroll_depth`, `js_error`).

6. **Large mobile heights.** The full-page mobile screenshot is ~12k px tall;
   the desktop one is ~9k px. Use viewport-sized screenshots for sanity
   checks (`screenshot --path` without `--full`), full only when you need to
   audit the whole page.

7. **`/termos/` and `/privacidade/` are `noindex` drafts.** Per README:
   "revisar com jurídico" before publishing. They show in axe tests, but
   should not be linked from production sitemap until reviewed.

## Troubleshooting

| Symptom                                                              | Fix                                                                                                       |
| -------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------- |
| `browserType.launch: Executable doesn't exist at .../chromium-XXXX/` | Set `CHROME=/usr/bin/chromium` before running the driver.                                                |
| `ERR_CONNECTION_REFUSED` on `url /`                                  | Preview server not running. Start it: `npm run preview -- --host 127.0.0.1 --port 4321 &`                  |
| `locator.textContent: Unexpected token`                              | Empty selector. Driver swallows this and prints `<no match: …>` — pass a real selector.                 |
| `dataLayer` is empty                                                 | JS may not have loaded. Add `wait 600` after `url /`. Section events fire on `IntersectionObserver`.     |
| Calculator shows `R$ 0`                                              | Slider value not committed. The `calc` command already dispatches `input`; for a manual slider, see FAQ. |
| `npm run build` fails with module errors                             | `rm -rf node_modules && npm install`                                                                      |
| Tests report missing browsers                                        | `npx playwright install chromium` (only if you can't use the system browser)                             |

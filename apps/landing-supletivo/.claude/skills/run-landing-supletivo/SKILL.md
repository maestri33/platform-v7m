---
name: run-landing-supletivo
description: Build, run, and drive the Supletivo Brasil landing page (Astro static). Use when asked to start the landing, run its tests, build it, take a screenshot of any section, exercise the eligibility widget, check ref attribution, or verify the dataLayer events.
---

Astro 6 static landing at `<unit>/`. Drive it with the headless-Chromium
script at `.claude/skills/run-landing-supletivo/driver.mjs` against
`npm run preview` on a free port. The script walks the full user flow —
load with a `?ref=…` token, click the 18+ eligibility widget, open the
FAQ, scroll the page, and snap per-section screenshots — and exits
non-zero on any regression (broken ref attribution, missing
`page_view` / `scroll_depth` / `section_view` events, "Caminho livre"
text gone).

All paths below are relative to `<unit>/` (the repo root).

## Prerequisites

- Node.js 22+ (project tested on 22; no `.nvmrc`/`engines` pin)
- One Chromium binary. The driver resolves in this order:
  1. `~/.cache/ms-playwright/chromium-*/chrome-linux64/chrome` (the
     Playwright cache that `npx playwright install chromium` produces)
  2. `~/.cache/ms-playwright/chromium_headless_shell-*/chrome-headless-shell-linux64/chrome-headless-shell`
  3. `/usr/bin/chromium`, `/usr/bin/chromium-browser`, `/usr/bin/google-chrome`

No `apt-get` is required on a clean container — `npm install` plus
`npx playwright install chromium` is enough.

## Setup

```bash
npm install
```

The dev deps already include `@playwright/test` (used by the driver)
and `@axe-core/playwright` (for the a11y pass).

## Build

```bash
npm run build         # writes dist/ (Astro static)
```

The build also runs the `seo-files` integration, which writes
`dist/sitemap.xml` and `dist/robots.txt` from the `SITE` env var.

## Run (agent path)

```bash
# 1. serve dist/ on a free port (default 4321 is taken by other
#    Astro projects in this container — use any free port)
nohup npx astro preview --port 4325 --host 127.0.0.1 \
  > /tmp/preview-4325.log 2>&1 &
echo $! > /tmp/preview-4325.pid

# wait for it to actually serve
timeout 15 bash -c 'until curl -sf http://127.0.0.1:4325/ >/dev/null; do sleep 0.5; done'

# 2. drive the page
node .claude/skills/run-landing-supletivo/driver.mjs \
  --url http://127.0.0.1:4325/

# 3. when done
kill "$(cat /tmp/preview-4325.pid)"
```

Output:

- **Screenshots** → `.claude/skills/run-landing-supletivo/screenshots/01-hero.png`
  through `07-preco.png`. Each is a per-section `<section id="…">`
  capture (not a viewport crop), so they don't suffer from the page's
  `scroll-behavior: smooth` keeping the viewport mid-animation.
- **JSON summary** → `screenshots/summary.json` — `ctaHrefs` (proves
  every CTA carries the ref+UTMs), `dataLayer` (every event the
  page emitted during the run), `eligibilityResult`, `sections`
  seen, `subpages` HTTP statuses, `consoleErrors`, `axe` violations.
- **Driver stdout** — same as `summary.json` printed. Exit code is
  non-zero on any regression.

Driver flags:

| flag | default | what |
|---|---|---|
| `--url` | `http://localhost:4321/` | page to drive (override when 4321 is taken) |
| `--ref` | random `agent-XXXX` | ref token appended to every CTA href |
| `--shots-dir` | skill dir `screenshots/` | where PNGs + summary.json land |
| `--viewport` | `1280x800` | `WxH` for the headless viewport |
| `--strict` | `false` | also exit non-zero on console errors |

## Run (human path)

```bash
npm run dev           # http://localhost:4321, hot reload
```

Open in a real browser. CTAs deep-link to `PUBLIC_APP_URL` (default
`http://localhost:3000` in dev, `https://app.supletivo.net.br` in
build). Refs and UTMs are appended client-side; without JS the CTAs
still work (clean hrefs rendered server-side).

## Test

```bash
npm test              # vitest — attribution rules (first-touch, persistence)
npm run test:e2e      # playwright — ref/UTM, dataLayer, eligibility, axe
```

`npm run test:e2e` requires `npm run build` first and (one-time)
`npx playwright install chromium`.

## Gotchas

- **Port 4321 is contested in this container.** Other Astro previews
  (`landing-promotor`, `app-supletivo`) grab it on every fresh shell.
  Use any free port (4325+ in this env) and pass it via `--url`. The
  driver's preflight TCP probe prints the exact `npx astro preview`
  line if the port is closed, so the failure mode is loud.
- **`page.screenshot()` after a scroll can capture the un-scrolled
  frame.** This page has `html { scroll-behavior: smooth }`. When the
  compositor hasn't repainted yet, a viewport screenshot lands on the
  pre-scroll frame even though `window.scrollY` reports the new value
  (you'll see `scrollY=2109` in debug logs while the PNG shows the
  hero). The driver works around this by using
  `page.locator('section#…').screenshot()` for every shot — Playwright
  computes the element's bounding box and captures that, independent
  of viewport scroll.
- **`[data-reveal]` is `opacity: 0` until IntersectionObserver fires.**
  The driver pre-adds `.in-view` (and `.lit` for the mirror section)
  to every relevant element after each `page.goto` so the buttons
  are clickable without depending on scroll-into-view to fire the
  observer. Without that,
  `page.locator('[data-elig="…"]').click()` times out waiting for the
  button to become visible.
- **The first `astro preview` may run on a different port than you
  expect** if another `astro preview` is already up. Always check
  `ss -tlnp | grep <port>` and `curl -s http://…/ | grep -c data-elig`
  before assuming a 200 OK means your app.
- **Playwright's bundled chromium version can lag behind `npm install`'s
  `@playwright/test` version.** This image has `chromium-1228` cached
  while `@playwright/test@1.60.0` wants `chromium-1223` —
  `npx playwright install` would try to download 1223 and fail. The
  driver avoids the problem by passing `executablePath` directly with
  the newest `chromium-*` directory from the cache.

## Troubleshooting

- **`Preview server is not reachable at http://…:N`** — the driver
  opens a TCP probe before launching Chromium. Start the preview
  first (`nohup npx astro preview --port N …`) and wait for
  `curl -sf` to succeed before re-running.
- **`No chromium binary found`** — the resolver checked the Playwright
  cache and `/usr/bin/{chromium,chromium-browser,google-chrome}`. Run
  `npx playwright install chromium` (~150 MB) or
  `apt-get install -y chromium` on a clean container.
- **`locator.click: Timeout … waiting for [data-elig=…]`** — the page
  you loaded is not the Supletivo Brasil landing. Curl the URL and
  check `data-elig=` appears in the response; if it doesn't, another
  app is squatting the port.
- **`Ref attribution broken: N/M CTAs missing ref=…`** — the
  `?ref=…` token didn't propagate. Check `src/scripts/attribution.ts`
  and the import order in `src/scripts/main.ts`. The attribution runs
  in `initAttribution()` before any `track()` calls, so if
  `decorateCtas(attr)` didn't run, every `<a data-cta>` keeps its
  server-rendered href.
- **`scroll_depth=NN not fired`** — the page is too short, or the
  `setTimeout(scroll, 30)` chain in the driver raced past the
  observer. The driver scrolls in 400-px steps; if the page has been
  shortened below ~3200 px, depth=75/100 will never fire.
- **Screenshots look like the hero even after scrolling** — the CSS
  `scroll-behavior: smooth` on `html` is fighting Playwright. The
  driver already works around this via per-element screenshots; if you
  copy-paste a snippet that uses `page.screenshot()` directly, switch
  to `page.locator('section#ID').screenshot()`.

## Driver

The driver lives at `.claude/skills/run-landing-supletivo/driver.mjs`
in this same directory. It's the canonical way to drive the app from
a future agent — the human path (`npm run dev` + a real browser) is
left as a fallback.

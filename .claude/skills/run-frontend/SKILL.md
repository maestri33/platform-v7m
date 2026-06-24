---
name: run-frontend
description: Build, run, and drive the supletivo-web Next.js app. Use when asked to start the dev server, screenshot the app, verify a UI change in the browser, or interact with the funnel (home → /matricula → /aluno → /painel).
---

The supletivo-web app is a Next.js 16 PWA (mobile-first, 414×896 viewport). All paths here are relative to the repo root.

For agent/automated use, drive it via the Playwright REPL at
`.claude/skills/run-app-supletivo/driver.mjs` against a `next dev` server
on `http://localhost:3000`. The driver takes commands on stdin
(`nav`, `ss`, `click`, `fill`, …) and writes screenshots to `/tmp/shots/`.

## Prerequisites

- Node 20+ (Node 22 OK).
- Chromium installed via Playwright (one-time):

  ```bash
  npm i --prefix /tmp playwright
  npx --prefix /tmp playwright install chromium --with-deps
  ```

  xvfb is already present in the container.

## Build / Install (one-time)

```bash
cd /root/app-supletivo
npm install
npm run build    # smoke; should compile and emit static pages
```

## Run (agent path)

**1. Start the dev server in the background:**

```bash
cd /root/app-supletivo
npm run dev > /tmp/next-dev.log 2>&1 &
echo $! > /tmp/next-dev.pid

# Wait for /healthz to respond (NOT a sleep — poll the port):
for i in $(seq 1 60); do
  curl -sf http://localhost:3000/healthz >/dev/null 2>&1 && break
  sleep 1
done
curl -s http://localhost:3000/healthz
```

Stop with `kill $(cat /tmp/next-dev.pid)` or `pkill -f 'next dev'`.
Don't forget this — relaunching without stopping hits `EADDRINUSE`.

**2. Pipe commands to the driver:**

```bash
(cat <<'EOF'
nav /
wait-text Supletivo
ss 01-home
text h1
quit
EOF
) | node .claude/skills/run-app-supletivo/driver.mjs
ls -la /tmp/shots/
```

Screenshots land in `/tmp/shots/<name>.png`. Override with
`SCREENSHOT_DIR=…`. Override the base URL with `BASE_URL=…`.

**3. Iterate in tmux** (if available — not present in every container):

```bash
tmux new-session -d -s driver -x 200 -y 50
tmux send-keys -t driver 'cd /root/app-supletivo && node .claude/skills/run-app-supletivo/driver.mjs' Enter
sleep 1
tmux send-keys -t driver 'nav /aluno/preview?status=awaiting_documents' Enter
tmux send-keys -t driver 'ss aluno' Enter
tmux capture-pane -t driver -p
```

If tmux is not present, the heredoc pipe pattern in step 2 is the
fallback — same commands, same output, just non-interactive.

### Commands

| command | what it does |
|---|---|
| `nav <path>` | navigate (e.g. `nav /matricula/preview?step=rg`) |
| `ss [name]` | screenshot → `/tmp/shots/<name>.png` |
| `click <css-sel>` | click via DOM (skips coordinate math) |
| `click-text <text>` | click a button/link by text |
| `fill <sel> <text>` | fill input via Playwright (fires React onChange) |
| `type <text>` / `press <key>` | keyboard input |
| `wait <css-sel>` | wait for selector, 15s timeout |
| `wait-text <text>` | wait for text in body, 15s timeout |
| `text [sel]` | print innerText (default: `body`) |
| `eval <js-expr>` | `page.evaluate(expr)`, print JSON |
| `console [--errors]` | print console messages |
| `reload` / `url` | page reload / current URL |
| `quit` | close browser, exit |

## Run (human path)

```bash
cd /root/app-supletivo
npm run dev
# open http://localhost:3000 — Useless headless (no window in container).
# Ctrl-C to stop.
```

## Dev-only routes (no auth, no backend)

For visual inspection of any wizard step without driving the real funnel:

| URL | What it shows |
|---|---|
| `/matricula/preview?step=rg` | RG upload (matrícula) |
| `/matricula/preview?step=address` | address form |
| `/matricula/preview?step=education` | education form |
| `/matricula/preview?step=selfie` | selfie + contract-reveal |
| `/aluno/preview?status=awaiting_documents` | document list, all "Pendente" |
| `/aluno/preview?status=documents_under_review` | all docs "Em análise" |
| `/aluno/preview?status=blood_type_pending` | blood type card enabled |
| `/aluno/preview?status=exam_released` | all docs "Validado" + stepper full; **client `router.replace("/provas")` fires immediately** (the page renders the doc list for ~1 frame before the redirect — at this writing `/provas` does not exist yet, so the redirect will 404; this is expected until Fase 4 lands) |

`/healthz` reports the running SHA + build time.

## API smoke (without browser)

`scripts/drive-matricula.sh` exercises the matrícula v2 contract via
`curl` + JWT (no UI). Use it for backend contract regression. The driver
is for UI verification.

## Gotchas

- **First nav to a new route can take 10s+.** Turbopack compiles on
  demand; the first `nav /<new-route>` blocks until the route is built.
  The `wait-text` default is 15s, which is borderline. For first-load
  use `wait <selector> 30` (Playwright) or pipe a `sleep 15` before the
  assertion.
- **`wait-text` times out but `text` (right after) succeeds.** The page
  rendered after the wait expired. Bump the timeout or add `wait main`
  before `text h1` to let the route compile.
- **Pre-existing console errors in dev:**
  1. `eval() is not supported in this environment` — the CSP in
     `next.config.ts` omits `'unsafe-eval'` even in dev, and React's dev
     runtime wants it. Doesn't break rendering.
  2. `A tree hydrated but some attributes of the server rendered HTML
     didn't match` — `style={{caret-color:"transparent"}}` is client-only
     and trips hydration. Cosmetic, not blocking.
  Both are pre-existing (not introduced by recent Fase 3 work) and
  silenced in production builds.
- **`chromium-cli` is NOT in this container.** Don't waste time looking
  for it; the driver here is the equivalent.
- **Driver scripts need a held-open stdin.** The line handler serializes
  through a queue, but the process only exits on `quit`. Pipe pattern:
  `(commands…; quit) | node driver.mjs` — without the final `quit` the
  process idles waiting for input.
- **No tmux in this container.** Fall back to heredoc pipes (the
  examples above all work without tmux).
- **Re-launching `next dev` without killing the old one** hits
  `EADDRINUSE` on port 3000. Always `kill $(cat /tmp/next-dev.pid)`
  first.
- **Login is real-OTP.** The app does not have a dev-login bypass — the
  funnel starts with `/auth/check` (POST phone), then `auth/login` with
  a real OTP you have to receive by WhatsApp. For UI inspection of
  authenticated screens, hit the dev previews above. The driver
  doesn't bypass this.

## Troubleshooting

- **"browser launched" prints, but no further output** → first `nav`
  timed out. Check `/tmp/next-dev.log` for compile errors.
- **`text` returns `(null)`** → page didn't reach `domcontentloaded` in
  30s. The dev server probably isn't running. `curl /healthz`.
- **Screenshot is 2–3KB (tiny)** → blank page, the nav went to
  `about:blank`. Confirm `BASE_URL` matches the running dev server.
- **`EADDRINUSE` on restart** → old `next dev` still running. `pkill -f
  'next dev'`.
- **`driver.mjs` exits with `Cannot find module 'playwright'`** → you
  ran from a different cwd. Either pass the absolute path
  (`/tmp/node_modules/playwright/index.mjs`) or set `NODE_PATH=/tmp/node_modules`.
  The driver hard-codes the absolute path; this only bites if you
  `node` the file from a machine where `/tmp` doesn't have playwright.

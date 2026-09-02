---
name: run-frontend
description: Build, run, and drive any web app's dev server with Playwright in a headless container. Use when asked to start a dev server, screenshot a frontend, verify a UI change, or click/fill/interact with a page via a remote IP (e.g. proxmox VMs).
---

Drive any web app served over HTTP via a Playwright REPL. The driver is
generic — point it at any URL with `BASE_URL`. The dev server itself is
launched by the agent; the driver just connects.

All paths in this skill are relative to the project root. When the
project has its own `.claude/skills/run-frontend/` the project copy wins;
otherwise the copy at `/root/.claude/skills/run-frontend/` is used.

## Prerequisites

- Node 20+ (Node 22 OK).
- Chromium installed via Playwright (one-time, container-wide):

  ```bash
  npm i --prefix /tmp playwright
  npx --prefix /tmp playwright install chromium --with-deps
  ```

  `xvfb` is already present in the container.
- Whatever runtime the target app needs (Node for Next/Vite/Express,
  Python for Django/Flask/FastAPI, etc.). Install per-project.

## Run (agent path)

**1. Start the dev server in the background.** Generic — adapt to the
project (`npm run dev`, `pnpm dev`, `uvicorn main:app --reload`, etc.):

```bash
# Generic pattern — adapt the command and the port
<dev-command> > /tmp/dev-server.log 2>&1 &
echo $! > /tmp/dev-server.pid

# Poll the port until it responds (NOT sleep — wait for the actual signal).
# The path you poll should be cheap and known to exist (root or /healthz).
for i in $(seq 1 60); do
  curl -sf "${BASE_URL:-http://localhost:3000}/" >/dev/null 2>&1 && break
  sleep 1
done
curl -s "${BASE_URL:-http://localhost:3000}/" | head -c 200
```

Stop with `kill $(cat /tmp/dev-server.pid)`. Forgetting this hits
`EADDRINUSE` on the next launch.

**2. Point the driver at the dev server.** Default is
`http://localhost:3000`; override `BASE_URL` for any reachable IP:

```bash
# Local dev server
BASE_URL=http://localhost:3000 node .claude/skills/run-frontend/driver.mjs

# Proxmox VM in the same network — fire directly at its IP
BASE_URL=http://10.1.30.102:3000 node .claude/skills/run-frontend/driver.mjs

# Public staging
BASE_URL=https://staging.example.com node .claude/skills/run-frontend/driver.mjs
```

**3. Pipe commands to the driver.** Commands are line-delimited:

```bash
(cat <<'EOF'
nav /
wait-text <expected-string>
ss 01-landing
text h1
console --errors
quit
EOF
) | node .claude/skills/run-frontend/driver.mjs

ls -la /tmp/shots/
```

Screenshots land in `/tmp/shots/<name>.png`. Override with
`SCREENSHOT_DIR=…`. Override the base URL with `BASE_URL=…`.

**4. Iterate in tmux** (if present — not every container has it):

```bash
tmux new-session -d -s web -x 200 -y 50
tmux send-keys -t web 'BASE_URL=http://10.1.30.102:3000 node .claude/skills/run-frontend/driver.mjs' Enter
sleep 1
tmux send-keys -t web 'nav /' Enter
tmux send-keys -t web 'ss landing' Enter
tmux capture-pane -t web -p
```

Without tmux, the heredoc pipe in step 3 is the fallback.

### Commands

| command | what it does |
|---|---|
| `nav <path>` | navigate (e.g. `nav /login`, or `nav https://other.example.com/x`) |
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

`nav` accepts an absolute URL too, so you can drive multiple servers in
one session (e.g. `nav http://10.1.30.34:3000` then `nav
http://10.1.30.102:8080`).

## Run (human path)

```bash
<dev-command>    # opens browser normally on a desktop; useless headless
```

## Network gotchas (proxmox / multi-VM)

- **You can fire at any reachable IP.** Containers in the same proxmox
  network can usually reach other VMs on their bridge IPs (e.g.
  `10.1.30.x`). Set `BASE_URL=http://<vm-ip>:<port>` and the driver
  works the same as local.
- **Cross-origin.** If the page is served from a different origin than
  the API it talks to (and the API doesn't allow that origin in CORS),
  every fetch will 4xx. Run the dev server *and* the driver against
  the same IP/port, or proxy API calls through the dev server.
- **Self-signed certs / HTTPS staging.** Default Chromium rejects bad
  certs. If you control the staging server, prefer HTTP for dev or set
  `NODE_TLS_REJECT_UNAUTHORIZED=0` for Node-driven apps. Otherwise add
  the cert to the system trust store.
- **`EADDRINUSE` on restart** = a previous dev server is still bound.
  `pkill -f '<dev-command-pattern>'` then retry.

## Gotchas

- **First nav to a route can take 10s+.** On-demand compilers (Turbopack,
  Vite, Webpack) compile the first request to a new route. The
  `wait-text` default is 15s, which is borderline. For first-load use
  `wait <selector>` then `text h1`, or pipe a `sleep 15` before the
  assertion.
- **`wait-text` times out but `text` (right after) succeeds.** The page
  rendered after the wait expired. Bump the timeout or add `wait main`
  before the assertion.
- **`chromium-cli` is NOT in this container.** Don't waste time
  looking for it; this driver is the equivalent.
- **Driver needs a held-open stdin to finish async work.** The line
  handler serializes through a queue, but the process only exits on
  `quit`. Pipe pattern: `(commands…; quit) | node driver.mjs`.
- **No tmux in this container by default.** Fall back to heredoc pipes
  (the examples above all work without tmux).
- **Login is usually real.** Most apps have no dev-login bypass. For
  authenticated screens, look for a project-specific `/preview` or
  `/dev/login` route, or seed credentials via an API call first, then
  set the session cookie via `eval document.cookie = '...'`.
- **`fill` doesn't fire React onChange for controlled inputs** when used
  via raw JS. `fill` (this command) goes through Playwright's input
  pipeline and DOES fire onChange. Use `type` for free-text input.

## Troubleshooting

- **"browser launched" prints, but no further output** → first `nav`
  timed out. Check `/tmp/dev-server.log` for compile errors.
- **`text` returns `(null)`** → page didn't reach `domcontentloaded` in
  30s. The dev server probably isn't running, or `BASE_URL` is wrong.
  `curl $BASE_URL/` to confirm.
- **Screenshot is 2–3KB (tiny)** → blank page, the nav went to
  `about:blank`. Confirm `BASE_URL` matches the running dev server.
- **`EADDRINUSE` on restart** → old dev server still bound. `pkill -f
  '<pattern>'` then retry.
- **`driver.mjs` exits with `Cannot find module 'playwright'`** → you
  ran from a different cwd. Either `cd` to where playwright is
  installed or set `NODE_PATH=/tmp/node_modules`. The driver
  hard-codes the absolute path; this only bites if you `node` the
  file from a machine where `/tmp` doesn't have playwright.
- **Page is blank on remote IP** → firewall / bridge / port. `curl -v
  $BASE_URL/` from the same container. If that fails too, network
  reachability, not the driver.

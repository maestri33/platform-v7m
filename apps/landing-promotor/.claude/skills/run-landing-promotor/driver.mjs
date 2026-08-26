#!/usr/bin/env node
/**
 * driver.mjs — Playwright REPL for landing-promotor.
 *
 * The Astro landing is static + has no admin surface; the only meaningful
 * interactivity is the calculator slider, FAQ <details>, and the dataLayer
 * of analytics events. This driver exposes a small command set so a future
 * agent can poke the running app without re-writing Playwright boilerplate.
 *
 * Usage:
 *   node .claude/skills/run-landing-promotor/driver.mjs              # interactive REPL
 *   echo 'url /' | node .../driver.mjs                              # pipe commands
 *   node .../driver.mjs --batch screenshot --path shots/hero.png    # one-shot
 *
 * Environment:
 *   URL  (default http://127.0.0.1:4321) — base URL of the running app
 *   HEAD (default 1) — 1 = headless, 0 = show window
 *
 * Commands (REPL or --batch):
 *   url <path>                       Navigate (relative to $URL or absolute)
 *   wait <ms>                        Sleep this many ms
 *   screenshot [--path <file>]       Take a screenshot (default: ./shot-<ts>.png)
 *   eval <expr>                      Run JS in page, print result as JSON
 *   click <selector>                 Click first match
 *   fill <selector> <value>          Set input value + dispatch 'input' event
 *   text <selector>                  Print textContent of first match
 *   href <selector>                  Print href of first match
 *   dataLayer                        Print window.dataLayer as JSON
 *   faq <n>                          Open the n-th FAQ details (0-indexed)
 *   calc <n>                         Set the calculator slider to n
 *   scroll <y>                       window.scrollTo({top: y})
 *   viewport <w>x<h>                 Resize (e.g. 1280x800, 390x844)
 *   quit | exit                      Close browser and exit
 */
import { chromium } from 'playwright';
import { createInterface } from 'node:readline';
import { mkdir, writeFile } from 'node:fs/promises';
import { dirname, resolve } from 'node:path';
import { existsSync } from 'node:fs';

const BASE = process.env.URL ?? 'http://127.0.0.1:4321';
const HEAD = process.env.HEAD !== '0';
// `executablePath` overrides Playwright's bundled binary. Leave unset to use
// what `npx playwright install chromium` downloaded. If you see "Executable
// doesn't exist at /root/.cache/ms-playwright/chromium-XXXX/", either install
// the matching version (`npx playwright install chromium`) or set
// CHROME=/usr/bin/chromium to fall back to the system browser.
const EXEC = process.env.CHROME || pickChromium();

function pickChromium() {
  // Scan the playwright cache for the highest-version chrome-linux64 dir.
  // The cache uses rev numbers; we don't care which — we just want one.
  const root = `${process.env.HOME}/.cache/ms-playwright`;
  try {
    const dirs = require('node:fs').readdirSync(root).filter((d) => d.startsWith('chromium-'));
    dirs.sort();
    for (const d of dirs.reverse()) {
      const p = `${root}/${d}/chrome-linux64/chrome`;
      if (existsSync(p)) return p;
    }
    const hdirs = require('node:fs').readdirSync(root).filter((d) => d.startsWith('chromium_headless_shell-'));
    hdirs.sort();
    for (const d of hdirs.reverse()) {
      const p = `${root}/${d}/chrome-headless-shell-linux64/chrome-headless-shell`;
      if (existsSync(p)) return p;
    }
  } catch {}
  return undefined;
}

// ---- one-shot CLI mode ----
const argv = process.argv.slice(2);
if (argv[0] === '--batch' || argv[0] === '-b') {
  // Two ways to feed commands:
  //   node driver.mjs --batch file script.cmds   # read lines from a file
  //   node driver.mjs --batch                   # read lines from stdin
  //   node driver.mjs --batch 'cmd1' 'cmd2'     # each argv after the flag
  let cmds;
  if (argv[1] === 'file' && argv[2]) {
    const { readFileSync } = await import('node:fs');
    cmds = readFileSync(argv[2], 'utf8')
      .split('\n')
      .map((s) => s.trim())
      .filter(Boolean);
  } else if (argv.length > 1) {
    cmds = argv.slice(1);
  } else {
    // stdin
    const chunks = [];
    for await (const c of process.stdin) chunks.push(c);
    cmds = Buffer.concat(chunks)
      .toString('utf8')
      .split('\n')
      .map((s) => s.trim())
      .filter(Boolean);
  }
  await runBatch(cmds);
  process.exit(0);
}

// ---- interactive REPL ----
const browser = await chromium.launch({
  headless: HEAD,
  ...(EXEC ? { executablePath: EXEC } : {}),
  args: ['--no-sandbox', '--disable-dev-shm-usage'],
});
const ctx = await browser.newContext({
  viewport: { width: 1280, height: 900 },
  userAgent:
    'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/149.0.0.0 Safari/537.36 driver-landing-promotor/1.0',
});
const page = await ctx.newPage();
globalThis.__page = page; // shared with runOne()
page.on('pageerror', (e) => console.error('PAGE-ERR:', e.message));
page.on('console', (msg) => {
  if (msg.type() === 'error') console.error('CONSOLE-ERR:', msg.text());
});

console.log(`driver: base=${BASE} headless=${HEAD}`);
console.log('Type `help` for commands. `quit` to exit.');

const rl = createInterface({ input: process.stdin, output: process.stdout, prompt: 'lp> ' });
const IS_TTY = process.stdin.isTTY === true;
let busy = false;
const queue = [];
async function processLine(trimmed) {
  if (!trimmed) return;
  if (trimmed === 'quit' || trimmed === 'exit') {
    rl.close();
    return;
  }
  if (trimmed === 'help') {
    printHelp();
    return;
  }
  busy = true;
  try {
    await runOne(trimmed);
  } catch (e) {
    console.error('ERR:', e.message);
  } finally {
    busy = false;
  }
}
let closed = false;
rl.on('line', (line) => {
  // Just push the line — drain() awaits each one in order
  queue.push(line.trim());
});
if (IS_TTY) rl.prompt();
async function drain() {
  while (queue.length || !closed) {
    if (queue.length) {
      const trimmed = queue.shift();
      await processLine(trimmed);
      if (IS_TTY) rl.prompt();
    } else {
      await new Promise((r) => setImmediate(r));
    }
  }
}
drain();
rl.on('close', async () => {
  closed = true;
  // wait for in-flight command (e.g. mid-navigation) before tearing down
  while (busy || queue.length) await new Promise((r) => setTimeout(r, 25));
  await browser.close();
  process.exit(0);
});

// ===================================================================
async function runBatch(cmds) {
  const browser = await chromium.launch({
    headless: HEAD,
    ...(EXEC ? { executablePath: EXEC } : {}),
    args: ['--no-sandbox', '--disable-dev-shm-usage'],
  });
  const ctx = await browser.newContext({ viewport: { width: 1280, height: 900 } });
  const page = await ctx.newPage();
  page.on('pageerror', (e) => console.error('PAGE-ERR:', e.message));
  // join the cmds into pseudo-REPL: same handler
  globalThis.__page = page;
  let hadError = false;
  for (const cmd of cmds) {
    try {
      await runOne(cmd);
    } catch (e) {
      console.error(`ERR: ${cmd} → ${e.message.split('\n')[0]}`);
      hadError = true;
    }
  }
  await browser.close();
  process.exit(hadError ? 1 : 0);
}

async function runOne(line) {
  const page = globalThis.__page ?? (await ensurePage());
  globalThis.__page = page;
  const [cmd, ...rest] = tokenize(line);
  const args = rest;

  switch (cmd) {
    case 'url': {
      const target = args[0] ?? '/';
      const url = /^https?:/.test(target) ? target : new URL(target, BASE).href;
      await page.goto(url, { waitUntil: 'networkidle' });
      console.log('OK url →', page.url());
      return;
    }
    case 'wait': {
      await page.waitForTimeout(Number(args[0]) || 250);
      return;
    }
    case 'screenshot': {
      const out = pathFromFlag(args, '--path') ?? `./shot-${Date.now()}.png`;
      await mkdir(dirname(out), { recursive: true });
      await page.screenshot({ path: out, fullPage: args.includes('--full') });
      console.log('OK shot →', out);
      return;
    }
    case 'eval': {
      const expr = args.join(' ');
      const r = await page.evaluate(`(async () => { return ${expr}; })()`);
      console.log(JSON.stringify(r));
      return;
    }
    case 'click': {
      const sel = args.join(' ');
      await page.locator(sel).first().click();
      console.log('OK click');
      return;
    }
    case 'fill': {
      const sel = args[0];
      const val = args.slice(1).join(' ');
      await page.locator(sel).first().evaluate((el, v) => {
        el.value = v;
        el.dispatchEvent(new Event('input', { bubbles: true }));
        el.dispatchEvent(new Event('change', { bubbles: true }));
      }, val);
      console.log('OK fill');
      return;
    }
    case 'text': {
      const sel = args.join(' ');
      if (!sel) return console.log('');
      try {
        const t = await page.locator(sel).first().textContent({ timeout: 1500 });
        console.log(t ?? '');
      } catch (e) {
        console.log(`<no match: ${sel}>`);
      }
      return;
    }
    case 'href': {
      const sel = args.join(' ');
      if (!sel) return console.log('');
      try {
        const h = await page.locator(sel).first().getAttribute('href', { timeout: 1500 });
        console.log(h ?? '');
      } catch (e) {
        console.log(`<no match: ${sel}>`);
      }
      return;
    }
    case 'dataLayer': {
      const dl = await page.evaluate(
        () => (window).dataLayer ?? []
      );
      console.log(JSON.stringify(dl, null, 2));
      return;
    }
    case 'faq': {
      const idx = Number(args[0] ?? 0);
      await page.locator('details[data-faq]').nth(idx).evaluate((el) => {
        el.open = true;
      });
      console.log('OK faq');
      return;
    }
    case 'calc': {
      const n = Number(args[0] ?? 0);
      await page.locator('[data-calc-range]').evaluate((el, v) => {
        const i = el;
        i.value = String(v);
        i.dispatchEvent(new Event('input', { bubbles: true }));
      }, n);
      console.log('OK calc');
      return;
    }
    case 'scroll': {
      const y = Number(args[0] ?? 0);
      await page.evaluate((yy) => window.scrollTo({ top: yy }), y);
      return;
    }
    case 'viewport': {
      const [w, h] = String(args[0] ?? '1280x900').split('x').map(Number);
      await page.setViewportSize({ width: w, height: h });
      console.log(`OK viewport ${w}x${h}`);
      return;
    }
    default:
      console.error(`unknown command: ${cmd} (try 'help')`);
  }
}

async function ensurePage() {
  // REPL path: this should not be hit because runOne has `globalThis.__page`.
  throw new Error('no page; are you in REPL?');
}

function tokenize(line) {
  // simple shell-ish tokenizer that respects single/double quotes
  const out = [];
  let cur = '';
  let q = null;
  for (const c of line) {
    if (q) {
      if (c === q) {
        q = null;
      } else cur += c;
    } else if (c === '"' || c === "'") {
      q = c;
    } else if (c === ' ' || c === '\t') {
      if (cur) {
        out.push(cur);
        cur = '';
      }
    } else cur += c;
  }
  if (cur) out.push(cur);
  return out;
}

function pathFromFlag(args, flag) {
  const i = args.indexOf(flag);
  return i >= 0 ? resolve(args[i + 1]) : null;
}

function printHelp() {
  console.log(`Commands:
  url <path>                       navigate (relative or absolute)
  wait <ms>                        sleep
  screenshot [--path <file>] [--full]  png screenshot
  eval <expr>                      run JS, print JSON result
  click <selector>                 click first match
  fill <selector> <value>          set input value + dispatch input/change
  text <selector>                  print textContent
  href <selector>                  print href
  dataLayer                        print window.dataLayer
  faq <n>                          open n-th FAQ <details>
  calc <n>                         set calculator slider to n
  scroll <y>                       window.scrollTo
  viewport <w>x<h>                 resize (e.g. 1280x800)
  quit | exit                      close browser`);
}

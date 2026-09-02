// REPL driver for any web app served over HTTP. Connects to a running
// dev/staging server at BASE_URL. Designed for agents: wrap in tmux or
// pipe via heredoc, send commands, capture output.
//
// Commands (REPL):
//   nav <path|url>        navigate to URL or path (relative to BASE_URL)
//   ss [name]             screenshot → /tmp/shots/<name>.png
//   click <css-sel>       click via DOM .click() (skips coordinate math)
//   click-text <text>     click a button/link by text
//   fill <sel> <text>     fill input via Playwright (fires React onChange)
//   type <text>           keyboard type
//   press <key>           press a key (Enter, Tab, Escape, ArrowDown…)
//   wait <css-sel>        wait for selector, 15s timeout
//   wait-text <text>      wait for text in body
//   text [sel]            print innerText of selector (default: body)
//   eval <js-expr>        page.evaluate(expr), print JSON
//   console [--errors]    print console messages; --errors shows only errors
//   reload                page.reload()
//   url                   print current URL
//   quit                  close browser, exit
//   help                  list commands
import { chromium } from "/tmp/node_modules/playwright/index.mjs";
import * as readline from "node:readline";
import * as fs from "node:fs";
import * as path from "node:path";

const BASE = process.env.BASE_URL || "http://localhost:3000";
const SHOT_DIR = process.env.SCREENSHOT_DIR || "/tmp/shots";
fs.mkdirSync(SHOT_DIR, { recursive: true });

let browser = null;
let context = null;
let page = null;
const consoleLog = [];
const consoleErrs = [];

async function ensure() {
  if (page) return page;
  browser = await chromium.launch({
    args: ["--no-sandbox", "--disable-dev-shm-usage"],
  });
  context = await browser.newContext({
    viewport: { width: 1280, height: 800 },
    locale: "en-US",
    timezoneId: "UTC",
  });
  page = await context.newPage();
  page.on("console", (msg) => {
    const entry = `[${msg.type()}] ${msg.text()}`;
    consoleLog.push(entry);
    if (msg.type() === "error") consoleErrs.push(entry);
  });
  page.on("pageerror", (err) => {
    const entry = `[pageerror] ${err.message}`;
    consoleLog.push(entry);
    consoleErrs.push(entry);
  });
  console.log("browser launched (viewport 1280x800, en-US)");
  return page;
}

const COMMANDS = {
  async nav(p) {
    const url = p.startsWith("http") ? p : `${BASE}${p.startsWith("/") ? p : "/" + p}`;
    await ensure();
    await page.goto(url, { waitUntil: "domcontentloaded", timeout: 30_000 });
    console.log("nav:", page.url());
  },

  async reload() {
    await ensure();
    await page.reload({ waitUntil: "domcontentloaded" });
    console.log("reloaded:", page.url());
  },

  async url() {
    if (!page) return console.log("(no page yet)");
    console.log(page.url());
  },

  async ss(name) {
    await ensure();
    const n = name || `ss-${Date.now()}`;
    const f = path.join(SHOT_DIR, `${n}.png`);
    await page.screenshot({ path: f, fullPage: false });
    console.log("screenshot:", f);
  },

  async click(sel) {
    await ensure();
    const r = await page.evaluate((s) => {
      const el = document.querySelector(s);
      if (!el) return "NOT_FOUND";
      el.click();
      return "OK";
    }, sel);
    console.log("click", sel, "→", r);
  },

  async "click-text"(text) {
    await ensure();
    const r = await page.evaluate((t) => {
      const els = [...document.querySelectorAll("button, a, [role='button'], [role='link']")];
      const exact = els.find((e) => e.textContent?.trim() === t);
      const partial = exact ?? els.find((e) => e.textContent?.includes(t));
      if (!partial) return "NOT_FOUND";
      partial.click();
      return `OK: <${partial.tagName.toLowerCase()}> "${partial.textContent.trim().slice(0, 40)}"`;
    }, text);
    console.log("click-text", JSON.stringify(text), "→", r);
  },

  async fill(sel, ...rest) {
    await ensure();
    const value = rest.join(" ");
    const r = await page.fill(sel, value);
    console.log("fill", sel, "→", r);
  },

  async type(text) {
    await ensure();
    await page.keyboard.type(text, { delay: 25 });
  },

  async press(key) {
    await ensure();
    await page.keyboard.press(key);
    console.log("press:", key);
  },

  async wait(sel) {
    await ensure();
    try {
      await page.waitForSelector(sel, { timeout: 15_000 });
      console.log("found:", sel);
    } catch {
      console.log("TIMEOUT:", sel);
    }
  },

  async "wait-text"(text) {
    await ensure();
    try {
      await page.waitForFunction(
        (t) => document.body.innerText.includes(t),
        text,
        { timeout: 15_000 },
      );
      console.log("found text:", JSON.stringify(text));
    } catch {
      console.log("TIMEOUT text:", JSON.stringify(text));
    }
  },

  async text(sel) {
    await ensure();
    const t = await page.evaluate(
      (s) => (s ? document.querySelector(s) : document.body)?.innerText ?? "(null)",
      sel || null,
    );
    console.log(t);
  },

  async eval(expr) {
    await ensure();
    try {
      const v = await page.evaluate(expr);
      console.log(JSON.stringify(v, null, 2));
    } catch (e) {
      console.log("ERROR:", e.message);
    }
  },

  async console(args) {
    const errorsOnly = args?.includes("--errors");
    const list = errorsOnly ? consoleErrs : consoleLog;
    if (!list.length) return console.log(errorsOnly ? "(no errors)" : "(no console msgs)");
    for (const m of list) console.log(" ", m);
  },

  async quit() {
    if (context) await context.close().catch(() => {});
    if (browser) await browser.close().catch(() => {});
    process.exit(0);
  },

  help() {
    console.log("commands:", Object.keys(COMMANDS).filter((k) => k !== "help").join(", "));
  },
};

// Serialize: async line events would otherwise fire in parallel. A queue + a
// single drainer guarantees `nav` finishes before `wait-text` runs, etc.
const queue = [];
let busy = false;

async function drain() {
  if (busy) return;
  busy = true;
  while (queue.length) {
    const line = queue.shift();
    const [cmd, ...rest] = line.trim().split(/\s+/);
    if (!cmd) continue;
    const fn = COMMANDS[cmd];
    if (!fn) {
      console.log("unknown:", cmd, "— try: help");
      continue;
    }
    try {
      await fn(rest.join(" "));
    } catch (e) {
      console.log("ERROR:", e.message);
    }
    if (cmd === "quit") return;
  }
  busy = false;
}

const stdin = fs.createReadStream("/dev/stdin");
const rl = readline.createInterface({
  input: stdin,
  output: process.stdout,
  terminal: false,
  prompt: "driver> ",
});
rl.on("line", (line) => {
  queue.push(line);
  drain();
});
// Closing stdin doesn't kill the process; only `quit` does. This keeps the
// driver alive long enough for in-flight async commands to finish when used
// in a pipe (`(commands...; quit) | driver.mjs`).
rl.on("close", () => {
  const wait = setInterval(() => {
    if (!busy && queue.length === 0) {
      clearInterval(wait);
      console.log("(stdin closed; type `quit` to exit)");
    }
  }, 200);
});

console.log("web driver — base", BASE, "— 'help' for commands");
rl.prompt();

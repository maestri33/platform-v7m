#!/usr/bin/env node
/**
 * Driver estilo run-frontend para o app-v7m (Next.js 16 PWA em localhost:4173).
 * Mesma interface do run-frontend do app-supletivo: nav / ss / click / fill /
 * type / press / wait / wait-text / text / eval / console / url / reload / quit.
 * Screenshots vão pra /tmp/shots-v7m/ (sobrescreve via SCREENSHOT_DIR).
 */
import { chromium } from "/tmp/node_modules/playwright/index.mjs";
import { mkdir, writeFile } from "node:fs/promises";

const BASE_URL = process.env.BASE_URL ?? "http://localhost:4173";
const SHOT_DIR = process.env.SCREENSHOT_DIR ?? "/tmp/shots-v7m";
await mkdir(SHOT_DIR, { recursive: true });

const VW = 390;
const VH = 844;

const browser = await chromium.launch({ args: ["--no-sandbox"] });
const ctx = await browser.newContext({
  viewport: { width: VW, height: VH },
  deviceScaleFactor: 2,
});
const page = await ctx.newPage();

const console_log = [];
page.on("console", (msg) => console_log.push({ type: msg.type(), text: msg.text() }));
page.on("pageerror", (err) => console_log.push({ type: "pageerror", text: err.message }));

async function shot(name) {
  const safe = name.replace(/[^a-zA-Z0-9_.-]/g, "_");
  const file = `${SHOT_DIR}/${safe}.png`;
  await page.screenshot({ path: file, fullPage: false });
  console.log(JSON.stringify({ ss: file, url: page.url() }));
}

function out(obj) {
  process.stdout.write(JSON.stringify(obj) + "\n");
}

const readline = (await import("node:readline")).createInterface({
  input: process.stdin,
  output: process.stdout,
  terminal: false,
});

async function handle(line) {
  const parts = line.split(/\s+/);
  const cmd = parts[0];
  const args = parts.slice(1);
  try {
    switch (cmd) {
      case "nav":
        await page.goto(`${BASE_URL}${args[0] ?? "/"}`, { waitUntil: "domcontentloaded", timeout: 30000 });
        out({ nav: page.url() });
        break;
      case "ss":
        await shot(args[0] ?? `shot-${Date.now()}`);
        break;
      case "wait": {
        const sel = args[0];
        const t = Number(args[1] ?? 15000);
        await page.waitForSelector(sel, { timeout: t });
        out({ wait: sel });
        break;
      }
      case "wait-text": {
        const text = args[0];
        const t = Number(args[1] ?? 15000);
        await page.getByText(text, { exact: false }).first().waitFor({ timeout: t });
        out({ waitText: text });
        break;
      }
      case "text": {
        const sel = args[0] ?? "body";
        const t = await page.locator(sel).innerText({ timeout: 5000 }).catch(() => null);
        out({ text: t });
        break;
      }
      case "click":
        await page.locator(args[0]).first().click({ timeout: 10000 });
        out({ clicked: args[0] });
        break;
      case "click-text":
        await page.getByText(args.join(" "), { exact: false }).first().click({ timeout: 10000 });
        out({ clickedText: args.join(" ") });
        break;
      case "fill":
        await page.locator(args[0]).first().fill(args.slice(1).join(" "), { timeout: 10000 });
        out({ filled: args[0] });
        break;
      case "type":
        await page.keyboard.type(args.join(" "));
        out({ typed: args.join(" ") });
        break;
      case "press":
        await page.keyboard.press(args[0] ?? "Enter");
        out({ pressed: args[0] });
        break;
      case "eval": {
        const expr = args.join(" ");
        const result = await page.evaluate(expr);
        out({ eval: result });
        break;
      }
      case "console":
        out({ console: console_log.slice(-50) });
        break;
      case "url":
        out({ url: page.url() });
        break;
      case "reload":
        await page.reload({ waitUntil: "domcontentloaded" });
        out({ reloaded: page.url() });
        break;
      case "quit":
        await browser.close();
        process.exit(0);
        break;
      default:
        out({ error: `unknown cmd ${cmd}` });
    }
  } catch (e) {
    out({ error: String(e?.message ?? e), cmd, args });
  }
}

for await (const line of readline) {
  if (!line.trim()) continue;
  await handle(line);
}
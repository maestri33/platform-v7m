import { chromium } from "playwright";
import { execSync } from "child_process";

async function main() {
  const browser = await chromium.connectOverCDP("http://127.0.0.1:9222");
  const contexts = browser.contexts();
  const page = contexts[0]?.pages()[0] || await browser.newPage();
  
  console.log("Navigating to https://app.supletivo.net.br/ ...");
  await page.goto("https://app.supletivo.net.br/", { waitUntil: "networkidle" });
  await page.waitForTimeout(1000);
  
  execSync("DISPLAY=:99 scrot /tmp/vnc-home-screen.png");
  console.log("Screenshot captured to /tmp/vnc-home-screen.png");
  
  await browser.close();
}

main().catch(console.error);

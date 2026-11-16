// Usage: node tools/screenshot.mjs <url> <outfile> [waitMs] [actionsJson]
// Drives the installed Microsoft Edge (or Chrome) headlessly and saves one PNG.
// actionsJson: optional JSON array of {"click": "<selector>"} or {"wait": ms} steps run before the shot.
import { chromium } from "playwright-core";
import { existsSync } from "node:fs";

const [url, out, waitMs = "1500", actionsJson = "[]"] = process.argv.slice(2);
const candidates = [
  "C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe",
  "C:/Program Files/Google/Chrome/Application/chrome.exe",
];
const executablePath = candidates.find((p) => existsSync(p));
if (!executablePath) throw new Error("No Edge or Chrome found");

const browser = await chromium.launch({ executablePath, headless: true });
const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });
const errors = [];
page.on("pageerror", (e) => errors.push(`pageerror: ${e.message}`));
page.on("console", (m) => m.type() === "error" && errors.push(`console: ${m.text()}`));
await page.goto(url, { waitUntil: "networkidle", timeout: 60000 }).catch(() => {});
await page.waitForTimeout(Number(waitMs));
for (const step of JSON.parse(actionsJson)) {
  if (step.click) await page.locator(step.click).first().click({ timeout: 10000 }).catch((e) => errors.push(`click ${step.click}: ${e.message}`));
  if (step.wait) await page.waitForTimeout(step.wait);
}
await page.screenshot({ path: out, fullPage: false });
console.log(JSON.stringify({ out, errors: errors.slice(0, 15) }, null, 2));
await browser.close();

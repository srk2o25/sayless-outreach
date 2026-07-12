import { chromium } from "playwright-extra";
import stealth from "puppeteer-extra-plugin-stealth";
import type { Browser, BrowserContext } from "playwright";
import path from "node:path";
import fs from "node:fs";

chromium.use(stealth());

const SESSION_DIR = process.env.SESSION_DIR ?? path.resolve("session-state");
export const SESSION_FILE = path.join(SESSION_DIR, "linkedin.json");

export function hasSession(): boolean {
  return fs.existsSync(SESSION_FILE);
}

// Every action module calls this — it is the only place a browser context is created,
// so the LinkedIn session never leaks into any other part of the codebase.
export async function withSession<T>(
  fn: (context: BrowserContext) => Promise<T>
): Promise<T> {
  if (!hasSession()) {
    throw new Error(
      "No LinkedIn session found. Run `npm run login` once, interactively, before starting the worker."
    );
  }

  const browser: Browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({ storageState: SESSION_FILE });

  try {
    return await fn(context);
  } finally {
    // Persist any refreshed cookies from this run before closing.
    await context.storageState({ path: SESSION_FILE });
    await context.close();
    await browser.close();
  }
}

// Jittered, human-scale pause between micro-actions inside a single automation run.
// Spike protection lives here, not just in n8n's daily cap — a burst of instant actions
// is what actually triggers LinkedIn's bot detection, independent of the daily total.
export function humanDelay(minMs = 1200, maxMs = 4500): Promise<void> {
  const ms = minMs + Math.random() * (maxMs - minMs);
  return new Promise((resolve) => setTimeout(resolve, ms));
}

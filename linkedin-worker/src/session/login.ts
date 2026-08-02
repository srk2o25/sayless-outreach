// One-time interactive login. Run locally with a visible browser (`npm run login`),
// log in by hand (including any 2FA challenge), then press Enter in the terminal.
// The resulting session is what the headless worker reuses for every future action —
// this script is never invoked from n8n or the running service.
//
// This is the local/emergency fallback now — the primary way to (re-)establish
// the session is the self-service "Connect LinkedIn" screen in admin-ui, backed
// by connect-session.ts's streamed-browser flow. Keep this script working
// regardless; it's the zero-dependency escape hatch if that flow ever breaks.

import readline from "node:readline/promises";
import fs from "node:fs";
import path from "node:path";
import { chromium } from "./browser.js";
import { SESSION_FILE } from "./session.js";

async function main(): Promise<void> {
  fs.mkdirSync(path.dirname(SESSION_FILE), { recursive: true });

  const browser = await chromium.launch({ headless: false });
  const context = await browser.newContext();
  const page = await context.newPage();
  await page.goto("https://www.linkedin.com/login");

  const rl = readline.createInterface({ input: process.stdin, output: process.stdout });
  await rl.question(
    "Log in to the Cadence LinkedIn seat in the opened browser, then press Enter here...\n"
  );
  rl.close();

  await context.storageState({ path: SESSION_FILE });
  console.log(`Session saved to ${SESSION_FILE}`);

  await browser.close();
}

main();

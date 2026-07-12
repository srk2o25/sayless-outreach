import { withSession, humanDelay } from "../session/session.js";
import type { ActionResult } from "./connect.js";

export interface MessageRequest {
  profileUrl: string;
  message: string;
}

export async function sendMessage({ profileUrl, message }: MessageRequest): Promise<ActionResult> {
  return withSession(async (context) => {
    const page = await context.newPage();
    await page.goto(profileUrl, { waitUntil: "domcontentloaded" });
    await humanDelay();

    // TODO: verify selector — only visible once the prospect has accepted the connection.
    const messageButton = page.getByRole("button", { name: /^message$/i });
    if (!(await messageButton.isVisible().catch(() => false))) {
      return { ok: false, skippedReason: "not_connected_yet" };
    }

    await messageButton.click();
    await humanDelay(600, 1500);

    const composer = page.getByRole("textbox", { name: /write a message/i });
    await composer.fill(message);
    await humanDelay(400, 1200);

    await page.getByRole("button", { name: /^send$/i }).click();
    await page.close();

    return { ok: true };
  });
}

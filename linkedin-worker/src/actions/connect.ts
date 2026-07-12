import { withSession, humanDelay } from "../session/session.js";
import { canPerform, recordAction } from "../rate-limiter/rateLimiter.js";

export interface ConnectRequest {
  profileUrl: string;
  note?: string;
}

export interface ActionResult {
  ok: boolean;
  skippedReason?: string;
}

export async function sendConnectionRequest({ profileUrl, note }: ConnectRequest): Promise<ActionResult> {
  if (!canPerform("li_connect")) {
    return { ok: false, skippedReason: "daily_or_weekly_cap_reached" };
  }

  const result = await withSession(async (context) => {
    const page = await context.newPage();
    await page.goto(profileUrl, { waitUntil: "domcontentloaded" });
    await humanDelay();

    // TODO: verify selector against the live LinkedIn profile page before first real run —
    // LinkedIn's DOM structure and button labels shift periodically.
    const connectButton = page.getByRole("button", { name: /connect/i });
    if (!(await connectButton.isVisible().catch(() => false))) {
      return { ok: false, skippedReason: "connect_button_not_found" };
    }

    await connectButton.click();
    await humanDelay(600, 1500);

    if (note) {
      // TODO: verify "Add a note" flow selectors — LinkedIn sometimes skips straight
      // to a confirmation modal without an "Add a note" step, depending on account state.
      const addNoteButton = page.getByRole("button", { name: /add a note/i });
      if (await addNoteButton.isVisible().catch(() => false)) {
        await addNoteButton.click();
        await page.getByRole("textbox").fill(note);
        await humanDelay(400, 1000);
      }
    }

    const sendButton = page.getByRole("button", { name: /^send$/i });
    await sendButton.click();
    await page.close();

    return { ok: true };
  });

  if (result.ok) recordAction("li_connect");
  return result;
}

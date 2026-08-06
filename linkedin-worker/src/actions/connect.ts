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

    // Verified against the real live site: LinkedIn renders the profile's own
    // Connect action as an <a> with no stable role/class (hashed CSS-in-JS
    // classnames), aria-label "Invite <Name> to connect" — not a <button>
    // with plain "Connect" text. A bare getByRole("button", { name: /connect/i })
    // never matches it and instead silently resolves to unrelated "People you
    // may know" sidebar buttons in strict mode, which is why this always
    // reported connect_button_not_found even for genuinely unconnected
    // profiles. Scoping to the profile's main content region
    // (data-testid="lazy-column") picks the right one — same fix pattern as
    // message.ts hit earlier.
    const connectButton = page.getByTestId("lazy-column").getByRole("link", { name: /invite .+ to connect/i }).first();
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

    // Verified against the real live site: without a note, LinkedIn's modal
    // button is labeled "Send without a note", not plain "Send" — an
    // anchored /^send$/i exact match never fires. Matching on a "send" prefix
    // covers both this and the "Send" label that appears after "Add a note".
    const sendButton = page.getByRole("button", { name: /^send/i }).first();
    await sendButton.click();
    await humanDelay(800, 1500);

    // Clicking "Send" does not mean LinkedIn actually accepted the invite —
    // this previously always returned ok:true even when LinkedIn silently
    // rejected the request (observed for real: a "Sorry, invitation not
    // sent... Please try again" rate-limit toast), so every failure was
    // logged as a false success. A confirmed send swaps the profile's own
    // action button from "Connect" to "Pending"; if it's still showing
    // "Connect" the request did not go through. Best-effort capture whatever
    // error text LinkedIn shows so the reason is visible, not just a bare
    // false — TODO: verify the toast selector against the live site, this is
    // a broad guess at LinkedIn's alert/toast markup.
    const stillShowsConnect = await page
      .getByTestId("lazy-column")
      .getByRole("link", { name: /invite .+ to connect/i })
      .first()
      .isVisible()
      .catch(() => false);

    if (stillShowsConnect) {
      const toastText = await page
        .locator('[role="alert"], .artdeco-toast-item__message')
        .first()
        .textContent({ timeout: 3000 })
        .catch(() => null);
      await page.close();
      return { ok: false, skippedReason: (toastText ?? "").trim() || "connection_request_not_confirmed" };
    }

    await page.close();
    return { ok: true };
  });

  if (result.ok) recordAction("li_connect");
  return result;
}

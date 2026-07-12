import { withSession, humanDelay } from "../session/session.js";
import type { ActionResult } from "./connect.js";

const SAYLESS_PAGE_URL = "https://www.linkedin.com/company/sayless/"; // TODO: confirm exact company page slug

export interface InviteRequest {
  profileUrl: string;
}

export async function inviteToPage({ profileUrl }: InviteRequest): Promise<ActionResult> {
  return withSession(async (context) => {
    const page = await context.newPage();
    await page.goto(profileUrl, { waitUntil: "domcontentloaded" });
    await humanDelay();

    // TODO: LinkedIn's "invite to follow page" surface lives on the company page's
    // follower/connections list, not the individual profile — verify the actual flow
    // (it may require navigating to SAYLESS_PAGE_URL's "Manage" view instead) before wiring this up.
    const inviteButton = page.getByRole("button", { name: /invite/i });
    if (!(await inviteButton.isVisible().catch(() => false))) {
      return { ok: false, skippedReason: "invite_action_not_available" };
    }

    await inviteButton.click();
    await page.close();
    return { ok: true };
  });
}

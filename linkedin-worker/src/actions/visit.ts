import { withSession, humanDelay } from "../session/session.js";
import { canPerform, recordAction } from "../rate-limiter/rateLimiter.js";
import type { ActionResult } from "./connect.js";

export interface VisitRequest {
  profileUrl: string;
}

export async function visitProfile({ profileUrl }: VisitRequest): Promise<ActionResult> {
  if (!canPerform("li_visit")) {
    return { ok: false, skippedReason: "daily_cap_reached" };
  }

  const result = await withSession(async (context) => {
    const page = await context.newPage();
    await page.goto(profileUrl, { waitUntil: "domcontentloaded" });
    // Scroll like a person actually reading the profile, not just loading and leaving —
    // a page that loads and immediately closes reads as a bot to LinkedIn's telemetry.
    await page.mouse.wheel(0, 400);
    await humanDelay(1500, 4000);
    await page.mouse.wheel(0, 300);
    await humanDelay(800, 2000);
    await page.close();
    return { ok: true };
  });

  if (result.ok) recordAction("li_visit");
  return result;
}

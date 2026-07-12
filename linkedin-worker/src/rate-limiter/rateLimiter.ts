// Local safety net. n8n is the primary rate governor (it decides what to dispatch and
// when), but this worker enforces the same caps independently — if n8n is ever
// misconfigured or replayed, LinkedIn actions still cannot exceed the hard limits here.

import fs from "node:fs";
import path from "node:path";

const STATE_DIR = process.env.SESSION_DIR ?? path.resolve("session-state");
const STATE_FILE = path.join(STATE_DIR, "rate-state.json");

const DAILY_CONNECT_CAP = Number(process.env.LI_DAILY_CONNECT_CAP ?? 18);
const WEEKLY_CONNECT_CAP = Number(process.env.LI_WEEKLY_CONNECT_CAP ?? 80);
const DAILY_VISIT_CAP = Number(process.env.LI_DAILY_VISIT_CAP ?? 40);

export type LiActionType = "li_connect" | "li_message" | "li_visit" | "li_invite";

interface RateState {
  connectDates: string[]; // ISO timestamps, one per connection request sent
  visitDates: string[];
}

function loadState(): RateState {
  if (!fs.existsSync(STATE_FILE)) return { connectDates: [], visitDates: [] };
  return JSON.parse(fs.readFileSync(STATE_FILE, "utf-8"));
}

function saveState(state: RateState): void {
  fs.mkdirSync(STATE_DIR, { recursive: true });
  fs.writeFileSync(STATE_FILE, JSON.stringify(state, null, 2));
}

function isSameUtcDay(a: Date, b: Date): boolean {
  return a.toISOString().slice(0, 10) === b.toISOString().slice(0, 10);
}

function withinLastDays(dates: string[], days: number, now: Date): number {
  const cutoff = now.getTime() - days * 24 * 60 * 60 * 1000;
  return dates.filter((d) => new Date(d).getTime() >= cutoff).length;
}

export function canPerform(action: LiActionType, now: Date = new Date()): boolean {
  const state = loadState();

  if (action === "li_connect") {
    const today = state.connectDates.filter((d) => isSameUtcDay(new Date(d), now)).length;
    const thisWeek = withinLastDays(state.connectDates, 7, now);
    return today < DAILY_CONNECT_CAP && thisWeek < WEEKLY_CONNECT_CAP;
  }

  if (action === "li_visit") {
    const today = state.visitDates.filter((d) => isSameUtcDay(new Date(d), now)).length;
    return today < DAILY_VISIT_CAP;
  }

  // li_message / li_invite are bounded naturally by connection acceptance — no separate cap.
  return true;
}

export function recordAction(action: LiActionType, now: Date = new Date()): void {
  const state = loadState();
  if (action === "li_connect") state.connectDates.push(now.toISOString());
  if (action === "li_visit") state.visitDates.push(now.toISOString());
  saveState(state);
}

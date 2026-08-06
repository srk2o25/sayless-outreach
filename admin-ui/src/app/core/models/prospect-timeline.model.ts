export type TimelineStepStatus = "completed" | "skipped" | "pending" | "upcoming";

export interface TimelineStep {
  stepId: number;
  name: string;
  actionType: string;
  status: TimelineStepStatus;
  eventType: string | null;
  // Set when status is 'completed'/'skipped' — when it actually ran.
  occurredAt: string | null;
  // Set when status is 'pending'/'upcoming' — when it's due to run.
  dueAt: string | null;
  // Set when status is 'skipped' — the actual error reported by the action
  // (LinkedIn's own message, Brevo's error, etc.), not just "it failed".
  reason: string | null;
}

export interface ProspectTimeline {
  prospectId: number | null;
  halted: boolean;
  timeline: TimelineStep[];
}

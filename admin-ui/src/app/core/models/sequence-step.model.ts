export type ActionType = "li_connect" | "li_message" | "li_visit" | "li_invite" | "email" | "email_followup";
export type TriggerType = "time" | "event";
export type EventCondition = "on_accept" | "on_reply" | "on_open";

export interface SequenceStep {
  id: number;
  campaignId: number | null;
  stepOrder: number;
  name: string;
  actionType: ActionType;
  triggerType: TriggerType;
  delayIntervalDays: number | null;
  eventCondition: EventCondition | null;
  enabled: boolean;
  // Only set for actionType 'email' / 'email_followup'. {{full_name}} / {{company}}
  // placeholders are plain string substitution done by daily-scheduler, not n8n expressions.
  subject: string | null;
  bodyTemplate: string | null;
}

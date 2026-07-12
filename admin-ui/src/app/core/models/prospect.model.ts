export type ProspectStatus = "queued" | "sent" | "accepted" | "replied" | "paused" | "bounced" | "completed";

export interface Prospect {
  id: number;
  campaignId: number;
  fullName: string;
  company: string | null;
  email: string | null;
  linkedinUrl: string | null;
  currentStepName: string | null;
  currentStepOrder: number | null;
  status: ProspectStatus;
  halted: boolean;
  lastEventAt: string | null;
}

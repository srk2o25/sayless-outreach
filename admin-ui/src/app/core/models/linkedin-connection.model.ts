export type LinkedInConnectionStatusValue = "connected" | "disconnected";

export interface LinkedInConnectionStatus {
  status: LinkedInConnectionStatusValue;
  lastConnectedAt: string | null;
  updatedAt: string;
}

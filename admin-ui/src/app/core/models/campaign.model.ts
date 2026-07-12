export type CampaignStatus = "active" | "paused" | "completed";

export interface Campaign {
  id: number;
  name: string;
  batchFilename: string;
  uploadedBy: string;
  rowCount: number;
  status: CampaignStatus;
  createdAt: string;
}

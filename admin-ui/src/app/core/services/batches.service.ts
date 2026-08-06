import { Injectable, inject } from "@angular/core";
import { HttpClient } from "@angular/common/http";
import { Observable, map } from "rxjs";
import { environment } from "../../../environments/environment";
import { Campaign } from "../models/campaign.model";
import { Prospect } from "../models/prospect.model";
import { ProspectTimeline } from "../models/prospect-timeline.model";

// No direct Postgres access from the browser — every call here hits an n8n
// webhook, which is the only thing allowed to touch the database.
@Injectable({ providedIn: "root" })
export class BatchesService {
  private readonly http = inject(HttpClient);
  private readonly baseUrl = environment.n8nWebhookBaseUrl;

  public listCampaigns(): Observable<Campaign[]> {
    return this.http.get<Campaign[]>(`${this.baseUrl}/campaigns`);
  }

  public uploadBatch(file: File, campaignName: string, templateCategoryId: number): Observable<Campaign> {
    const formData = new FormData();
    formData.append("file", file);
    formData.append("name", campaignName);
    formData.append("templateCategoryId", String(templateCategoryId));
    return this.http.post<Campaign>(`${this.baseUrl}/campaigns/upload`, formData);
  }

  public listProspects(campaignId: number): Observable<Prospect[]> {
    return this.http.get<Prospect[]>(`${this.baseUrl}/prospects?campaignId=${campaignId}`);
  }

  public updateProspect(prospect: Prospect): Observable<Prospect> {
    return this.http.put<Prospect>(`${this.baseUrl}/prospects`, prospect);
  }

  public getProspectTimeline(prospectId: number): Observable<ProspectTimeline> {
    return this.http.get<ProspectTimeline>(`${this.baseUrl}/prospect-timeline?prospectId=${prospectId}`);
  }

  public deleteCampaign(id: number): Observable<{ ok: boolean; id: number | null }> {
    return this.http.post<{ ok: boolean; id: number | null }>(`${this.baseUrl}/campaigns/delete`, { id });
  }

  // Manually fires the same dispatch logic daily-scheduler's hourly cron runs —
  // for testing/ops convenience, not a substitute for the cron in production.
  // Fire-and-forget: this specific n8n webhook's response is unreliable on
  // repeat calls (an n8n quirk — the underlying dispatch itself always runs
  // correctly, confirmed directly against the DB; only the confirmation
  // message back to the browser is flaky), so the response body is never
  // read — success here just means the trigger request itself went through.
  public runPipelineNow(): Observable<void> {
    return this.http.post(`${this.baseUrl}/daily-scheduler/run`, {}, { responseType: "text" }).pipe(map(() => undefined));
  }
}

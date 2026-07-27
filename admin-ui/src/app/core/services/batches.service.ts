import { Injectable, inject } from "@angular/core";
import { HttpClient } from "@angular/common/http";
import { Observable } from "rxjs";
import { environment } from "../../../environments/environment";
import { Campaign } from "../models/campaign.model";
import { Prospect } from "../models/prospect.model";

// No direct Postgres access from the browser — every call here hits an n8n
// webhook, which is the only thing allowed to touch the database.
@Injectable({ providedIn: "root" })
export class BatchesService {
  private readonly http = inject(HttpClient);
  private readonly baseUrl = environment.n8nWebhookBaseUrl;

  public listCampaigns(): Observable<Campaign[]> {
    return this.http.get<Campaign[]>(`${this.baseUrl}/campaigns`);
  }

  public uploadBatch(file: File, campaignName: string): Observable<Campaign> {
    const formData = new FormData();
    formData.append("file", file);
    formData.append("name", campaignName);
    return this.http.post<Campaign>(`${this.baseUrl}/campaigns/upload`, formData);
  }

  public listProspects(campaignId: number): Observable<Prospect[]> {
    return this.http.get<Prospect[]>(`${this.baseUrl}/prospects?campaignId=${campaignId}`);
  }
}

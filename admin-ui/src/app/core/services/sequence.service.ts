import { Injectable, inject } from "@angular/core";
import { HttpClient } from "@angular/common/http";
import { Observable } from "rxjs";
import { environment } from "../../../environments/environment";
import { SequenceStep } from "../models/sequence-step.model";

@Injectable({ providedIn: "root" })
export class SequenceService {
  private readonly http = inject(HttpClient);
  private readonly baseUrl = environment.n8nWebhookBaseUrl;

  // campaignId omitted = the editable default template (campaign_id IS NULL).
  public getSteps(campaignId?: number): Observable<SequenceStep[]> {
    const query = campaignId ? `?campaignId=${campaignId}` : "";
    return this.http.get<SequenceStep[]>(`${this.baseUrl}/sequence-steps${query}`);
  }

  public updateStep(step: SequenceStep): Observable<SequenceStep> {
    return this.http.put<SequenceStep>(`${this.baseUrl}/sequence-steps/${step.id}`, step);
  }

  public reorderSteps(stepIds: number[]): Observable<void> {
    return this.http.post<void>(`${this.baseUrl}/sequence-steps/reorder`, { stepIds });
  }
}

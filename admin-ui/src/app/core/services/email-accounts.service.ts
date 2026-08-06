import { Injectable, inject } from "@angular/core";
import { HttpClient } from "@angular/common/http";
import { Observable } from "rxjs";
import { environment } from "../../../environments/environment";
import { EmailAccount } from "../models/email-account.model";

@Injectable({ providedIn: "root" })
export class EmailAccountsService {
  private readonly http = inject(HttpClient);
  private readonly baseUrl = environment.n8nWebhookBaseUrl;

  public listEmailAccounts(): Observable<EmailAccount[]> {
    return this.http.get<EmailAccount[]>(`${this.baseUrl}/email-accounts`);
  }
}

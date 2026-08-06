import { Injectable, inject } from "@angular/core";
import { HttpClient } from "@angular/common/http";
import { Observable } from "rxjs";
import { environment } from "../../../environments/environment";
import { LinkedInConnectionStatus } from "../models/linkedin-connection.model";

@Injectable({ providedIn: "root" })
export class LinkedinConnectionService {
  private readonly http = inject(HttpClient);
  private readonly baseUrl = environment.n8nWebhookBaseUrl;

  public getStatus(): Observable<LinkedInConnectionStatus> {
    return this.http.get<LinkedInConnectionStatus>(`${this.baseUrl}/linkedin-connection-status`);
  }

  public disconnect(): Observable<LinkedInConnectionStatus> {
    return this.http.post<LinkedInConnectionStatus>(`${this.baseUrl}/linkedin-connection/disconnect`, {});
  }

  // EXCEPTION to admin-ui/CLAUDE.md's "no backend API layer, every call goes
  // through an n8n webhook" rule — this is the one deliberate, documented
  // case where admin-ui talks directly to linkedin-worker, because a live
  // bidirectional video/input stream cannot be proxied through n8n's
  // stateless webhook model. Nothing else in this app should follow this
  // pattern; getStatus() above stays on the normal path.
  public openConnectSocket(): WebSocket {
    const configured = environment.linkedinConnectWsUrl;
    const url = configured.startsWith("ws://") || configured.startsWith("wss://")
      ? configured
      : `${window.location.protocol === "https:" ? "wss:" : "ws:"}//${window.location.host}${configured}`;
    return new WebSocket(url);
  }
}

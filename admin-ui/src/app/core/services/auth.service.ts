import { Injectable, inject } from "@angular/core";
import { HttpClient } from "@angular/common/http";
import { Observable, map, tap } from "rxjs";
import { environment } from "../../../environments/environment";

const TOKEN_KEY = "sayless_outreach_auth_token";

interface LoginResponse {
  ok: boolean;
  token?: string;
  email?: string;
}

// App-level login gate only — see admin-ui/CLAUDE.md's documented scope cut.
// The n8n webhooks themselves don't check this token yet.
@Injectable({ providedIn: "root" })
export class AuthService {
  private readonly http = inject(HttpClient);
  private readonly baseUrl = environment.n8nWebhookBaseUrl;

  public login(email: string, password: string): Observable<boolean> {
    return this.http.post<LoginResponse>(`${this.baseUrl}/auth/login`, { email, password }).pipe(
      tap((res) => {
        if (res.ok && res.token) {
          localStorage.setItem(TOKEN_KEY, res.token);
        }
      }),
      map((res) => res.ok === true)
    );
  }

  public logout(): void {
    localStorage.removeItem(TOKEN_KEY);
  }

  public isAuthenticated(): boolean {
    return this.getToken() !== null;
  }

  public getToken(): string | null {
    return localStorage.getItem(TOKEN_KEY);
  }
}

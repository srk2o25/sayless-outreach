import { HttpInterceptorFn } from "@angular/common/http";
import { inject } from "@angular/core";
import { AuthService } from "../services/auth.service";

// Attaches the token to every n8n webhook call. No workflow checks it yet
// (see admin-ui/CLAUDE.md) — this wires the plumbing now so server-side
// enforcement, when added, is additive rather than a re-plumb.
export const authInterceptor: HttpInterceptorFn = (req, next) => {
  const token = inject(AuthService).getToken();
  if (!token) {
    return next(req);
  }
  return next(req.clone({ setHeaders: { Authorization: `Bearer ${token}` } }));
};

# admin-ui — Standards

Angular standalone components (no NgModules), same visual language as `crewzo-webapp/Frontend` — same color tokens, same `nz-*` card/table/pill naming, same 55px icon sidebar + 60px topbar shell. Not the same codebase; tokens are kept in sync by hand (see `core/scss/variables.scss`).

Deliberate departures from `crewzo-webapp/Frontend/CLAUDE.md`, and why:

- **Plain `<table>` markup, not PrimeNG `<p-table>`.** This tool's tables show tens of rows per batch, never paginated production data — the PrimeNG dependency crewzo-webapp standardizes on isn't earning its weight here.
- **No backend API layer.** Services in `core/services/` call n8n webhook endpoints directly (`environment.n8nWebhookBaseUrl`). There is no `.NET` API to write — n8n's Postgres node and webhook triggers are the API surface. Never add direct Postgres access from this app.
  - **One documented exception**: `LinkedinConnectionService.openConnectSocket()` opens a WebSocket straight to `linkedin-worker` (`environment.linkedinConnectWsUrl`), proxied through this app's own nginx in production (see `nginx.conf`'s `/li-connect/ws` location). A live bidirectional screencast can't be proxied through n8n's stateless webhook model, so this is the one place that rule doesn't apply — `getStatus()` on the same service stays on the normal n8n-webhook path. Don't extend this pattern to anything else; if a future feature seems to need the same treatment, that's a sign to re-examine the design, not to add a second exception.

**Auth (app-level gate only)**: `core/services/auth.service.ts` holds the token
(`localStorage`), `core/guards/auth.guard.ts` protects the `LayoutComponent`
shell route, `core/interceptors/auth.interceptor.ts` attaches `Authorization:
Bearer <token>` to every n8n call. `/login` lives outside the shell (no
sidebar/topbar). **This is a known, documented scope cut, not the full
picture**: no existing n8n workflow verifies this token server-side — see
`docs/product-notes.md` for why and what closing that gap would take before
distributing this beyond one internal org. Don't assume the token means
anything beyond gating admin-ui's own UI.

**LinkedIn Connect's WS protocol is mode-aware, not just a live screencast.**
`linkedin-connection.component.ts`'s `view` state machine
(`picker`/`credentials-form`/`code-prompt`/`canvas`) reflects
`connect-session.ts`'s server-side modes — the client sends
`{type:"start", mode:"live"|"credentials"}` as the *first* message after the
socket opens (see `openSocket()`), not before. A `fallback_required` message
means the credentials path hit something it can't handle and the *same*
socket keeps streaming — just flip `view` to `"canvas"`, don't reconnect.

Everything else follows the same checklist as crewzo-webapp:

- No hardcoded hex values — reference `core/scss/variables.scss`.
- Every `*ngFor` has `trackBy`.
- No `any`; explicit return types on every method.
- Member order: state → constructor/inject → lifecycle → event handlers → private helpers.
- Shared visual patterns (card, table, pill, avatar, empty state) live in `core/scss/layout.scss` as `nz-*` classes — never redefine them per component.

## Local dev

```bash
npm install
npm start   # localhost:4300, expects n8n reachable at environment.n8nWebhookBaseUrl
```

# admin-ui — Standards

Angular standalone components (no NgModules), same visual language as `crewzo-webapp/Frontend` — same color tokens, same `nz-*` card/table/pill naming, same 55px icon sidebar + 60px topbar shell. Not the same codebase; tokens are kept in sync by hand (see `core/scss/variables.scss`).

Deliberate departures from `crewzo-webapp/Frontend/CLAUDE.md`, and why:

- **Plain `<table>` markup, not PrimeNG `<p-table>`.** This tool's tables show tens of rows per batch, never paginated production data — the PrimeNG dependency crewzo-webapp standardizes on isn't earning its weight here.
- **No backend API layer.** Services in `core/services/` call n8n webhook endpoints directly (`environment.n8nWebhookBaseUrl`). There is no `.NET` API to write — n8n's Postgres node and webhook triggers are the API surface. Never add direct Postgres access from this app.

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

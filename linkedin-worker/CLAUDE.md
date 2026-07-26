# linkedin-worker — Standards

The only service in this repo permitted to hold a LinkedIn session. No other module reads `session-state/`.

## Before running anything

Run `npm run login` locally (headed browser) once, log in by hand on the dedicated Cadence LinkedIn seat, and let it write `session-state/linkedin.json`. Never generate or edit that file by hand; never commit it (`.gitignore` at repo root already excludes it).

## Conventions

- One action per exported function in `src/actions/` — `connect`, `message`, `visit`, `invite`. Each opens its own page inside a shared session context via `withSession()` and closes it when done. No action function creates its own browser or context directly.
- Every LinkedIn-facing selector gets a `// TODO: verify selector` comment until it has actually been run against the live site — LinkedIn's DOM changes without notice, and a wrong selector should fail loudly (element not found), not silently click the wrong thing.
- Every action that consumes a rate-limited resource (`connect`, `visit`) checks `canPerform()` before touching the browser and calls `recordAction()` only after a confirmed success. `message` and `invite` are unbounded here because they're naturally capped by connection acceptance.
- `humanDelay()` between every meaningful step inside an action — no action should complete in under ~1 second of simulated reading/thinking time.
- This service is a dumb executor. It does not decide *when* to run a step or *whether* today's cap allows a new batch — n8n decides that and calls one action per HTTP request. The rate-limiter here is a second, independent safety net, not the primary governor.

## Local dev

```bash
npm install
npx playwright install chromium   # one-time per machine — downloads the browser binary
npm run login                     # one-time, headed
npm run dev
```

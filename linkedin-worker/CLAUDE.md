# linkedin-worker — Standards

The only service in this repo permitted to hold a LinkedIn session. No other module reads `session-state/`.

## Before running anything

Run `npm run login` locally (headed browser) once, log in by hand on the dedicated Cadence LinkedIn seat, and let it write `session-state/linkedin.json`. Never generate or edit that file by hand; never commit it (`.gitignore` at repo root already excludes it).

## Conventions

- One action per exported function in `src/actions/` — `connect`, `message`, `visit`, `invite`. Each opens its own page inside a shared session context via `withSession()` and closes it when done. No action function creates its own browser or context directly.
- Every LinkedIn-facing selector gets a `// TODO: verify selector` comment until it has actually been run against the live site — LinkedIn's DOM changes without notice, and a wrong selector should fail loudly (element not found), not silently click the wrong thing.
- **LinkedIn's login form field ids are React-generated and change every page load** — never select by `id`. Each field also has a hidden duplicate variant (the `username`/`username webauthn` autocomplete pair). The pattern that actually works, verified against the real site: scope by the stable `autocomplete` attribute plus Playwright's `:visible` pseudo-class, e.g. `input[autocomplete^="username"]:visible`. The "Sign in" button is `type="button"`, not `type="submit"`, and "Sign in with Apple" also matches a plain substring search — use `getByRole("button", { name: "Sign in", exact: true })`. See `session/connect-session.ts`'s `runCredentialsMode`/`detectPageState`.
- Every action that consumes a rate-limited resource (`connect`, `visit`) checks `canPerform()` before touching the browser and calls `recordAction()` only after a confirmed success. `message` and `invite` are unbounded here because they're naturally capped by connection acceptance.
- **LinkedIn renders its own primary action buttons (Connect, Message) as `<a>` links with an `aria-label`, not `<button>`s with plain text** — confirmed against the live site for both `connect.ts` and `message.ts`. A bare `getByRole("button", { name: /connect|message/i })` silently matches unrelated "People you may know" sidebar buttons instead (which pass Playwright's strict-mode check as ambiguous, caught by the `.catch(() => false)` around `isVisible()`, so it looks like "button not found" rather than an obvious error). The fix: scope to `data-testid="lazy-column"` (the profile's main content region) and match on `getByRole("link", { name: /invite .+ to connect/i })` / `{ name: "Message", exact: true }`. `connect.ts`'s final confirmation button is labeled "Send without a note", not plain "Send" — match with `/^send/i`, not `/^send$/i`.
- **`li_connect` has no note/template content wired up.** `connect.ts`'s `ConnectRequest.note` field exists and its "Add a note" flow is implemented, but `daily-scheduler`'s dispatch payload never populates a `note` for `li_connect` — and the note-flow selectors (`getByRole("button", { name: /add a note/i })`, the textbox fill) are still unverified against the live site. The `templates` table (`db/CLAUDE.md`) deliberately excludes `li_connect` for this reason — don't wire one up without verifying this flow first.
- `humanDelay()` between every meaningful step inside an action — no action should complete in under ~1 second of simulated reading/thinking time.
- This service is a dumb executor. It does not decide *when* to run a step or *whether* today's cap allows a new batch — n8n decides that and calls one action per HTTP request. The rate-limiter here is a second, independent safety net, not the primary governor.
- **`connect-session.ts`'s WebSocket protocol is mode-aware and fails open.** The client's first message picks `{type:"start", mode:"live"|"credentials", ...}`. `"credentials"` submits email/password headlessly and handles a plain one-time-code challenge inline (`need_code`/`code` messages), but if LinkedIn shows anything this code doesn't recognize — CAPTCHA, phone-approve, an unrecognized challenge — it sends `fallback_required` and hands off into the exact same live-relay function `"live"` uses, **on the same already-in-flight page**, so the human sees whatever LinkedIn is actually asking for instead of the session dying silently. Never make an unrecognized-state branch here throw or hang — always fail open into the live relay.

## Local dev

```bash
npm install
npx playwright install chromium   # one-time per machine — downloads the browser binary
npm run login                     # one-time, headed
npm run dev
```

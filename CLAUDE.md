# Cadence — Project Standards

Standalone repo. Not part of `crewzo-webapp` — no shared deploy pipeline, no shared database, no shared Airtable credentials.

Per-module standards:
- [`admin-ui/CLAUDE.md`](admin-ui/CLAUDE.md) — Angular conventions (mirrors `crewzo-webapp/Frontend/CLAUDE.md`)
- [`linkedin-worker/CLAUDE.md`](linkedin-worker/CLAUDE.md) — Playwright/TypeScript conventions
- [`db/CLAUDE.md`](db/CLAUDE.md) — migration conventions, isolation policy
- [`n8n/CLAUDE.md`](n8n/CLAUDE.md) — workflow-authoring conventions

## Non-negotiables

- **No Airtable connection.** This system never reads or writes the customer/production Airtable base. If a future phase needs CRM-sourced signals, that is a separately-scoped, explicitly-approved change — not an incidental one.
- **Rate caps live in config, not code.** LinkedIn and email send caps are read by `n8n` from `sequence_steps` / env config, never hardcoded into a workflow node.
- **Sequence is data, not workflow logic.** Step order, trigger type (time/event), and delay live in the `sequence_steps` table, editable from `admin-ui`. `n8n` reads this table; it does not encode the sequence itself.
- **`linkedin-worker` is the only service that touches a real LinkedIn session.** No other service holds LinkedIn credentials or cookies.

## Status (update as build progresses)

- [x] `db` schema + migrations
- [x] `linkedin-worker` — self-service Connect flow (live CDP-streamed login via admin-ui, plus a credentials-login fast path with fail-open fallback to the live view) built and verified end-to-end, including session persistence across a restart. `visit`, `message`, and `connect` actions all verified against the real live site — each had the same class of selector bug (LinkedIn renders its own action buttons as unstyled `<a>` links with an `aria-label`, not `<button>`s with plain text; fixed by scoping to `data-testid="lazy-column"`). `connect`'s "Send without a note" button was also wrong (anchored on exact "Send", but the real label is "Send without a note") — both fixed and mechanically confirmed (button found, clicked, correct modal navigated). **Correction to an earlier entry here**: the actual send was originally assumed to have failed only from LinkedIn's own bot/rate-limiting — but `connect.ts` never actually checked whether LinkedIn accepted the invite, it returned `ok: true` the instant it clicked "Send" regardless of outcome, so *every* connect failure (rate-limited or not) was silently logged as a success. Confirmed for real: a full pipeline run reported `sent`/`ok:true` for a connect request, but the target profile still showed "Connect" (not "Pending") — the request never actually went through. Fixed to check the button's post-send state and capture LinkedIn's own error toast text into `skippedReason` when it's still showing "Connect" — not yet re-verified live against a real send (holding off on more automated traffic to the same test profile in one session; needs a cooldown re-test). `message`'s composer-textbox selector (`getByRole("textbox", { name: /write a message/i })`) is now confirmed broken (times out against the live site) — needs live re-verification, not yet fixed. `invite` is still marked `// TODO: verify` — the code targets the wrong flow entirely (a company-page-follower-invite feature, not something available from a prospect's own profile) and needs real design work, not just a selector fix.
- [x] `n8n` workflows — all 12 built and verified: admin CRUD (list/upload campaigns, list prospects, list/update/reorder sequence steps, LinkedIn connection status) plus the pipeline (daily-scheduler, linkedin-dispatch, email-send, email-events). Email reply detection is a known gap — see `n8n/CLAUDE.md`.
- [x] `admin-ui` — batch upload (with sample CSV), sequence editor (configurable delay units + reorder), prospect dashboard (campaign selector), LinkedIn self-service connect screen, simple email/password login (app-level gate only — see `docs/product-notes.md` for the documented scope cut), all wired to real n8n webhooks / linkedin-worker and verified end-to-end
- [ ] Deployed to target host (see `infra/deploy-notes.md`)

# Internal tool today, product tomorrow

This repo is built to run Sayless Outreach for one org (Sayless) with one shared login.
Several pieces are deliberately simple for that scope, but shaped so that
becoming a distributable multi-tenant product later is additive work, not a
rewrite. This doc is the durable record of that split — what's built simply
on purpose, and what a real product distribution would still need.

## Auth: app-level gate only

`admin-ui` has a real login screen backed by real `users`/`sessions` tables
(`db/migrations/0005_users_and_sessions.sql`) and a login workflow
(`n8n/workflows/auth-login.json`) that hashes/verifies passwords with Node's
`crypto.scrypt` — not a hardcoded env-var credential. That part is already
product-shaped.

**What's deliberately not built yet**: none of the other n8n workflows check
the token admin-ui sends (`Authorization: Bearer <token>`, wired by
`core/interceptors/auth.interceptor.ts`). Anyone with a workflow's raw webhook
URL (e.g. via curl) bypasses the login entirely. This was an explicit scope
decision — enforcing it server-side means adding a token-verification step to
every one of the 15+ existing workflows, a large change, not worth it while
this is a single internal org with one login. Before distributing this to
other orgs, this gap needs closing: either a shared "verify session" sub-flow
each workflow calls first, or moving the webhook surface behind a real
authenticated API gateway.

## Multi-tenancy: not scoped at all today

`campaigns`, `prospects`, and `sequence_steps` have no org/tenant column —
they're global tables for the one org this runs for. A real product needs:
- An `orgs` table, and an `org_id` FK threaded through `campaigns` (and
  transitively prospects/sequence_steps via `campaign_id`).
- Every n8n query scoped by the caller's org, not just by `campaignId`.
- `users` gaining an `org_id` and the login flow returning org-scoped data.

None of this is started — noted here so it's a deliberate future migration,
not a surprise.

## RBAC: one shared login, no roles

Today there's one `users` row, one shared session. No admin-vs-viewer
distinction, no per-user audit trail on who edited a sequence step or
uploaded a batch. Fine for a single internal user; a real product needs role
scoping before a second real user shares this login.

## Everything else in this pass is already product-ready as built

The sequence editor's `delay_value`/`delay_unit` columns, the reorder UI, the
prospects campaign selector, and the sample-CSV download aren't internal-only
shortcuts — they're built the way they'd stay if this became a real product.

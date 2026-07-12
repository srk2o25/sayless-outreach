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

- [ ] `db` schema + migrations
- [ ] `linkedin-worker` — connect / message / visit / invite actions
- [ ] `n8n` workflows — daily scheduler, email send (Brevo), email events, LinkedIn dispatch
- [ ] `admin-ui` — batch upload, sequence editor, prospect dashboard
- [ ] Deployed to target host (see `infra/deploy-notes.md`)

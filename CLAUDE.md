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
- [x] `linkedin-worker` — self-service Connect flow (live CDP-streamed login via admin-ui) built and verified end-to-end, including session persistence across a restart. `visit` and `message` actions verified against the real live site — `message`'s selector was wrong (matched a nonexistent `<button>`; LinkedIn actually renders it as an unstyled `<a>`, fixed to scope by `data-testid="lazy-column"`) and is now fixed and confirmed working with a real sent message. `connect` and `invite` are still marked `// TODO: verify` — not yet exercised against a real not-yet-connected profile / company page.
- [x] `n8n` workflows — all 12 built and verified: admin CRUD (list/upload campaigns, list prospects, list/update/reorder sequence steps, LinkedIn connection status) plus the pipeline (daily-scheduler, linkedin-dispatch, email-send, email-events). Email reply detection is a known gap — see `n8n/CLAUDE.md`.
- [x] `admin-ui` — batch upload, sequence editor, prospect dashboard, LinkedIn self-service connect screen, all wired to real n8n webhooks / linkedin-worker and verified end-to-end
- [ ] Deployed to target host (see `infra/deploy-notes.md`)

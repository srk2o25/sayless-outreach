# Sayless Outreach

Self-hosted engine that runs a pre-qualified prospect list through a configurable outbound sequence (LinkedIn + email). Internal tool for Sayless growth — standalone from `crewzo-webapp` by design.

## Why this exists

Replaces Gojiberry. Prospect lists are curated manually (not pulled from any CRM); this system only executes the sequence — connect, message, email, follow-up — against a small daily-capped batch, and reports status back.

## Services

| Service | Role |
|---|---|
| `admin-ui` | Angular — upload a batch, edit the sequence, watch status |
| `linkedin-worker` | Playwright automation — the only custom service; connect/message/visit/invite |
| `db` | Postgres — system of record (`prospects`, `campaigns`, `sequence_steps`, `events`) |
| `n8n` | Orchestration — daily cron, rate governor, Brevo send/webhook, calls `linkedin-worker` |

See each service's `CLAUDE.md` for its own standards. See [`docs/architecture.md`](docs/architecture.md) for the full system diagram and rate-limit reference.

## Data isolation

No connection to the production Airtable CRM. File upload is the only ingestion path. See `db/CLAUDE.md`.

## Local development

```bash
cp .env.example .env   # fill in BREVO_API_KEY; Postgres/n8n secrets already generated
./scripts/dev-up.sh    # starts all four: db + n8n (Docker), admin-ui + linkedin-worker (background, hot reload)
```

- admin-ui: `http://localhost:4300` (log: `.dev-logs/admin-ui.log`)
- n8n: `http://localhost:5678`
- linkedin-worker: `http://localhost:4100/health` (log: `.dev-logs/linkedin-worker.log`)

`./scripts/dev-up.sh` doesn't do the LinkedIn login — that needs a real browser window and you pressing Enter, so it can't run unattended. Do it once, separately:

```bash
cd linkedin-worker && npm run login
```

`./scripts/dev-down.sh` stops all four.

## Status

Scaffold stage — see root `CLAUDE.md` for what's built vs pending.

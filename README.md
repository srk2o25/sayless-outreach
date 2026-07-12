# Cadence

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
cp .env.example .env   # fill in Brevo API key, Postgres creds, n8n encryption key
docker compose up -d
```

Admin UI: `http://localhost:4300` · n8n: `http://localhost:5678`

## Status

Scaffold stage — see root `CLAUDE.md` for what's built vs pending.

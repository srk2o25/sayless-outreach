# n8n — Standards

Workflows are authored visually in the n8n UI, then exported to `workflows/*.json` and committed — the UI is the editor, the JSON in this repo is the source of truth for what's deployed.

## Conventions

- **Export after every change.** From the n8n UI: workflow menu → Download. Overwrite the matching file in `workflows/`. A workflow that only exists in the running n8n instance and not in this folder is not considered shipped.
- **Caps and credentials are env vars, referenced by expression, never hardcoded into a node.** `LI_DAILY_CONNECT_CAP`, `BREVO_API_KEY`, etc. come from `docker-compose.yml` environment — a workflow node reads `{{$env.LI_DAILY_CONNECT_CAP}}`, it does not contain the number `18` typed into a filter condition.
- **The sequence lives in Postgres, not in the workflow graph.** `daily-scheduler` queries `sequence_steps` to decide what runs next for a prospect — it does not have one branch per step hardcoded. Adding a 7th step should never require editing this workflow.
- **A reply halts everything.** Any workflow that records an `event_type = 'replied'` row must, in the same execution, set `prospects.halted = true`. No other workflow may dispatch an action for a halted prospect — `daily-scheduler`'s query excludes them at the source.

## The four workflows

| File | Trigger | Responsibility |
|---|---|---|
| `daily-scheduler.json` | Cron, once daily | Reads prospects due for their next step, checks `LI_DAILY_CONNECT_CAP` / `EMAIL_DAILY_CAP_PER_INBOX` before dispatching, calls `linkedin-dispatch` or `email-send` per prospect |
| `linkedin-dispatch.json` | Called by `daily-scheduler` | One HTTP call to `linkedin-worker`'s matching `/actions/*` endpoint per prospect, writes the result to `events` |
| `email-send.json` | Called by `daily-scheduler` | HTTP call to Brevo's transactional send API, writes `sent` event |
| `email-events.json` | Webhook, from Brevo | Receives open/click/bounce/reply callbacks, writes to `events`, sets `halted = true` on reply |

## Local dev

n8n UI: `http://localhost:5678` (basic auth from `.env`). Postgres credentials for the n8n Postgres node are the same `db` service credentials — same instance as everything else in this repo, not a second database.

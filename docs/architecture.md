# Sayless Outreach — architecture

Self-hosted engine that runs a pre-qualified prospect list through a configurable outbound sequence. See root `README.md` for the one-line pitch and each module's `CLAUDE.md` for its own conventions.

## Signal path

```
[ Batch upload ]                admin-ui — CSV/XLSX, curated manually, ~tens of rows per batch
        |
        v
[ Sayless Outreach DB · Postgres ]  own instance, own credentials
        |                       tables: campaigns, prospects, sequence_steps, events
        |                       ── no connection to the customer Airtable base ──
        v
[ n8n orchestrator ]            daily cron, reads prospects due for their next step,
        |                       enforces rate caps, advances state, pauses on reply
        |                       or low accept-rate
        v
   +---------+---------+
   |                   |
[ linkedin-worker ] [ Brevo, via n8n's HTTP node ]
   |                   |
[ linkedin.com ]   [ sayless.co.in sending domain ]
        |                   |
        +--- events/status back to Postgres --- Admin dashboard
```

## Sequence config

Steps live as rows in `sequence_steps`, editable from `admin-ui` — reorder, retime, or disable a step without touching a workflow. Default:

| # | Step | Trigger | Default |
|---|---|---|---|
| 1 | LI connection request | time | day 0 |
| 2 | LI message | event | on accept, ≤48h |
| 3 | Email | time | +1–2 business days |
| 4 | Profile visit | time | randomized offset |
| 5 | Invite to page | event | on reply / open |
| 6 | Follow-up email | time | +3–5 business days |

Two trigger types: `time` fires on a fixed offset from the previous step; `event` waits on a signal (acceptance, reply, open) and never fires without one. A reply at any step halts the rest of the sequence for that prospect (`prospects.halted = true`).

## Rate governor

Enforced in two places: `n8n`'s `daily-scheduler` workflow (primary) and `linkedin-worker`'s local rate-limiter (independent safety net).

| Action | Cap | Guard |
|---|---|---|
| LI connection requests | 15–20 / day | auto-throttle under 80/week |
| LI acceptance rate | below 15% | campaign auto-pauses |
| LI profile visits | 30–50 / day | spread, never spiked |
| Email sends | 30–40 / inbox / day | below Gmail/Outlook scrutiny line |
| New sending domain | 15–20 / day, ramping | 4–6 week warmup before steady-state |

At "tens of prospects per batch," one LinkedIn seat and one Brevo-authenticated sending domain clear every cap above with room to spare — no multi-seat rotation needed.

## Data isolation

Sayless Outreach's Postgres instance is the sole system of record. No API key, sync job, or shared table connects it to the production Airtable CRM. File upload is the only ingestion path today; a future CRM-sourced signal feed would be a new, explicitly-scoped migration, not an incidental connection.

## Deployment

Standalone repo (`sayless-outreach`, sibling to `crewzo-webapp`), own Docker Compose stack, own network. See `infra/deploy-notes.md` for the specific host.

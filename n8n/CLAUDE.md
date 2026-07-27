# n8n — Standards

Workflows are authored visually in the n8n UI, then exported to `workflows/*.json` and committed — the UI is the editor, the JSON in this repo is the source of truth for what's deployed.

## Conventions

- **Export after every change.** From the n8n UI: workflow menu → Download. Overwrite the matching file in `workflows/`. A workflow that only exists in the running n8n instance and not in this folder is not considered shipped.
- **Caps and credentials are env vars, referenced by expression, never hardcoded into a node.** `LI_DAILY_CONNECT_CAP`, `BREVO_API_KEY`, etc. come from `docker-compose.yml` environment — a workflow node reads `{{$env.LI_DAILY_CONNECT_CAP}}`, it does not contain the number `18` typed into a filter condition.
- **The sequence lives in Postgres, not in the workflow graph.** `daily-scheduler` queries `sequence_steps` to decide what runs next for a prospect — it does not have one branch per step hardcoded. Adding a 7th step should never require editing this workflow.
- **A reply halts everything.** Any workflow that records an `event_type = 'replied'` row must, in the same execution, set `prospects.halted = true`. No other workflow may dispatch an action for a halted prospect — `daily-scheduler`'s query excludes them at the source.

## The four pipeline workflows

| File | Trigger | Responsibility |
|---|---|---|
| `daily-scheduler.json` | Cron, once daily | Reads prospects due for their next step, checks `LI_DAILY_CONNECT_CAP` / `EMAIL_DAILY_CAP_PER_INBOX` before dispatching, calls `linkedin-dispatch` or `email-send` per prospect |
| `linkedin-dispatch.json` | Called by `daily-scheduler` | One HTTP call to `linkedin-worker`'s matching `/actions/*` endpoint per prospect, writes the result to `events` |
| `email-send.json` | Called by `daily-scheduler` | HTTP call to Brevo's transactional send API, writes `sent` event |
| `email-events.json` | Webhook, from Brevo | Receives open/click/bounce/reply callbacks, writes to `events`, sets `halted = true` on reply |

## The admin CRUD workflows

Not in the original spec — added because `admin-ui`'s services already call these endpoints and, per `admin-ui/CLAUDE.md`, n8n is the only allowed API surface (no direct Postgres access from the browser, no separate backend). One webhook trigger per workflow — see implementation note below on why.

| File | Endpoint | Responsibility |
|---|---|---|
| `admin-list-campaigns.json` | `GET /campaigns` | Lists all campaigns |
| `admin-upload-campaign.json` | `POST /campaigns/upload` | Parses the uploaded CSV/XLSX, inserts the campaign, clones the default `sequence_steps` template onto it, bulk-inserts prospects |
| `admin-list-prospects.json` | `GET /prospects?campaignId=` | Lists prospects for a campaign |
| `admin-list-steps.json` | `GET /sequence-steps[?campaignId=]` | Lists steps (default template when `campaignId` omitted) |
| `admin-update-step.json` | `PUT /sequence-steps` | Updates one step (`id` in the body, not the URL — see note below) |
| `admin-reorder-steps.json` | `POST /sequence-steps/reorder` | Rewrites `step_order` for a list of step ids |

### Implementation notes for this n8n build (2.29.x)

Discovered the hard way while building the workflows above — worth knowing before adding more:

- **One webhook trigger per workflow, not several.** Multiple `Webhook` nodes sharing one workflow registered malformed paths in testing. Give each endpoint its own workflow.
- **Every `Webhook` node needs an explicit `webhookId` (a UUID) set on the node itself**, not just in `parameters`. Without it, this build registers the webhook at `<workflowId>/<node name>/<path>` instead of the plain configured path, and it never matches an incoming request.
- **Avoid `:param` route segments** if the frontend needs a stable URL — dynamic paths route through a different lookup that expects the node's `webhookId` UUID embedded in the URL (`/webhook/<uuid>/resource/:id`). Prefer a static path with the id as a query param or body field instead (see `admin-list-prospects` and `admin-update-step`).
- **Postgres node `queryReplacement`: always use the array form**, `={{ [expr1, expr2, ...] }}`, never the comma-joined string form (`={{expr1}},{{expr2}}`). The string form breaks whenever a value is `null` or resolves to an empty string — n8n treats an empty resolved string as "zero parameters supplied" and Postgres then errors with `there is no parameter $1`.
- Workflows are activated via a **Publish** button (versioned publish pipeline), not a simple Active toggle. After importing or re-importing a workflow via `n8n import:workflow`, it still needs a manual Publish in the UI, and n8n needs a restart (`docker restart cadence-n8n-1`) to pick up newly published webhooks.

## Local dev

n8n UI: `http://localhost:5678` (basic auth from `.env`). Postgres credentials for the n8n Postgres node are the same `db` service credentials — same instance as everything else in this repo, not a second database.

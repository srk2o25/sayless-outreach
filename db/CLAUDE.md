# db — Standards

Postgres is the sole system of record for Cadence. It has its own instance and credentials — never point it at, sync with, or read from the production Airtable base.

## Migration conventions

- Numbered, sequential SQL files in `migrations/`: `000N_description.sql`. Never edit a migration that has run anywhere outside a fresh local instance — write a new one.
- Every table gets an explicit `CHECK` constraint on any enum-like text column (see `status`, `action_type`, `trigger_type` in `0001_init.sql`). No unconstrained free-text status fields.
- Seed data (the default sequence template) lives in `seed/`, separate from schema migrations, and is idempotent-safe to re-run only on a fresh DB — it is not a migration.

## Schema invariants

- `sequence_steps.campaign_id IS NULL` rows are the editable default template shown in `admin-ui`. On upload, a campaign clones the current default into its own `campaign_id`-scoped rows — so editing the default never changes a batch that's already running.
- `prospects.halted` flips to `true` the moment a `replied` event is recorded. No step dispatch reads a prospect where `halted = true`.
- `events` is append-only. Status shown in `admin-ui` is derived from the latest event per prospect, never overwritten in place.
- `sequence_steps.delay_value` (integer) + `delay_unit` (`hours`/`days`) replaced a single `INTERVAL` column (`0004_sequence_step_delay_unit.sql`) — admin-ui edits these directly, and `daily-scheduler` builds the interval inline (`(delay_value || ' ' || delay_unit)::interval`) rather than reading a stored `INTERVAL`. `event`-trigger steps carry a delay too (`0009_event_step_delay_defaults.sql`), and — despite the column name — `trigger_type`/`event_condition` no longer gate scheduling at all; every step becomes due purely by elapsed `delay_value`/`delay_unit` since the prospect's last event (or `created_at`), chained off the previous step's real dispatch time. See `n8n/CLAUDE.md`'s note on why (nothing detects a LinkedIn accept/reply, so gating on the event meant a prospect got stuck on the first event-trigger step forever). `delay_unit` originally also allowed `minutes`; dropped (`0010_drop_minutes_delay_unit.sql`, existing minute rows rounded up to the nearest hour) once `daily-scheduler` moved to an hourly poll and sub-hour precision stopped meaning anything.
- `users`/`sessions` (`0005_users_and_sessions.sql`) back admin-ui's login. Real tables, not env-var credentials, specifically so multi-user auth doesn't need a schema redesign later — see `docs/product-notes.md`. No other table has an `org_id` yet; this repo is still single-org.
- `prospects.archived` (`0006_prospect_actions.sql`) backs admin-ui's "Archive" action — a soft delete, not a hard `DELETE`. `admin-list-prospects` excludes archived rows by default; the row and its `events` history stay intact either way, consistent with the append-only `events` invariant above.
- `template_categories`/`templates` (`0008_templates.sql`) is the reusable message/email content library, organized by industry sector — `campaigns.template_category_id` records which one a batch used. Content is copied *into* the campaign's cloned `sequence_steps` at upload time (`admin-upload-campaign.json`'s "Apply Template Content" node), not read live — editing a template afterward doesn't retroactively change already-uploaded campaigns, same one-way-clone philosophy as the default `sequence_steps` template. `li_connect` deliberately has no template row — see `linkedin-worker/CLAUDE.md`.
- **Campaigns have no soft-delete column — deleting one is a real, cascading `DELETE FROM campaigns`.** All three downstream FKs (`sequence_steps.campaign_id`, `prospects.campaign_id`, `events.prospect_id`) are `ON DELETE CASCADE`, **and so is `events.step_id`** (`0007_events_step_cascade.sql` — it wasn't, originally, and a campaign delete failed with a FK violation because `sequence_steps` couldn't be removed while any `events` row still referenced it, even though that same row was also being removed via `events.prospect_id`'s cascade in the same statement). If a future table references `sequence_steps.id` or `prospects.id`, give it `ON DELETE CASCADE` too, or campaign deletion will break again the same way.

## Isolation

No foreign key, view, or migration in this database may reference an external system. If a future phase needs CRM-sourced signals, that arrives as a new, explicitly-reviewed migration — not a query against Airtable.

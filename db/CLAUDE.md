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

## Isolation

No foreign key, view, or migration in this database may reference an external system. If a future phase needs CRM-sourced signals, that arrives as a new, explicitly-reviewed migration — not a query against Airtable.

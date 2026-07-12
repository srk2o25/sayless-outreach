-- Cadence — initial schema
-- No foreign keys or references to any Airtable/CRM data. This DB is the sole system of record.

CREATE TABLE campaigns (
    id              SERIAL PRIMARY KEY,
    name            TEXT NOT NULL,
    batch_filename  TEXT NOT NULL,
    uploaded_by     TEXT NOT NULL,
    row_count       INTEGER NOT NULL DEFAULT 0,
    status          TEXT NOT NULL DEFAULT 'active'
                    CHECK (status IN ('active', 'paused', 'completed')),
    created_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Steps are data, not workflow logic — n8n reads this table to decide what runs next.
-- campaign_id NULL = the default sequence template, cloned onto a campaign at upload time.
CREATE TABLE sequence_steps (
    id              SERIAL PRIMARY KEY,
    campaign_id     INTEGER REFERENCES campaigns(id) ON DELETE CASCADE,
    step_order      INTEGER NOT NULL,
    name            TEXT NOT NULL,
    action_type     TEXT NOT NULL
                    CHECK (action_type IN ('li_connect', 'li_message', 'li_visit', 'li_invite', 'email', 'email_followup')),
    trigger_type    TEXT NOT NULL CHECK (trigger_type IN ('time', 'event')),
    -- time trigger: ISO 8601 duration (e.g. 'P1D', 'P3D'); event trigger: NULL
    delay_interval  INTERVAL,
    -- event trigger: 'on_accept' | 'on_reply' | 'on_open'; time trigger: NULL
    event_condition TEXT CHECK (event_condition IN ('on_accept', 'on_reply', 'on_open')),
    enabled         BOOLEAN NOT NULL DEFAULT true,
    UNIQUE (campaign_id, step_order)
);

CREATE TABLE prospects (
    id              SERIAL PRIMARY KEY,
    campaign_id     INTEGER NOT NULL REFERENCES campaigns(id) ON DELETE CASCADE,
    full_name       TEXT NOT NULL,
    company         TEXT,
    email           TEXT,
    linkedin_url    TEXT,
    current_step_id INTEGER REFERENCES sequence_steps(id),
    status          TEXT NOT NULL DEFAULT 'queued'
                    CHECK (status IN ('queued', 'sent', 'accepted', 'replied', 'paused', 'bounced', 'completed')),
    -- reply at any step halts the sequence for this prospect
    halted          BOOLEAN NOT NULL DEFAULT false,
    created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE events (
    id              SERIAL PRIMARY KEY,
    prospect_id     INTEGER NOT NULL REFERENCES prospects(id) ON DELETE CASCADE,
    step_id         INTEGER REFERENCES sequence_steps(id),
    event_type      TEXT NOT NULL
                    CHECK (event_type IN ('sent', 'accepted', 'replied', 'opened', 'clicked', 'bounced', 'paused', 'skipped')),
    payload         JSONB,
    occurred_at     TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_prospects_campaign ON prospects(campaign_id);
CREATE INDEX idx_prospects_status ON prospects(status);
CREATE INDEX idx_events_prospect ON events(prospect_id);
CREATE INDEX idx_sequence_steps_campaign ON sequence_steps(campaign_id);

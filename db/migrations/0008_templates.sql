-- Reusable message/email content library, organized by industry sector, so
-- a batch's LI message / email / email follow-up content is picked from a
-- library at upload time instead of always being blank (the default
-- template's li_message step had a NULL body_template until now — the first
-- real accepted connection crashed on `null` reaching Playwright's `.fill()`).
--
-- li_connect deliberately has no template row here — daily-scheduler never
-- sends a note for connection requests today, and connect.ts's note-flow
-- selectors are unverified. See linkedin-worker/CLAUDE.md.

CREATE TABLE template_categories (
    id         SERIAL PRIMARY KEY,
    name       TEXT NOT NULL UNIQUE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE templates (
    id            SERIAL PRIMARY KEY,
    category_id   INTEGER NOT NULL REFERENCES template_categories(id) ON DELETE CASCADE,
    action_type   TEXT NOT NULL CHECK (action_type IN ('li_message', 'email', 'email_followup')),
    subject       TEXT,
    body_template TEXT NOT NULL DEFAULT '',
    UNIQUE (category_id, action_type)
);

ALTER TABLE campaigns ADD COLUMN template_category_id INTEGER REFERENCES template_categories(id) ON DELETE SET NULL;

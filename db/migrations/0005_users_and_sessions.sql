-- Simple app-level login for admin-ui. Real tables (not a hardcoded env-var
-- credential) so this doesn't need a redesign if this becomes multi-user later.
-- Deliberately not wired into any existing n8n workflow's auth check yet — see
-- admin-ui/CLAUDE.md and docs/product-notes.md for the documented scope cut.

CREATE TABLE users (
    id            SERIAL PRIMARY KEY,
    email         TEXT NOT NULL UNIQUE,
    password_hash TEXT NOT NULL,
    created_at    TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE sessions (
    id         SERIAL PRIMARY KEY,
    user_id    INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    token      TEXT NOT NULL UNIQUE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    expires_at TIMESTAMPTZ NOT NULL
);

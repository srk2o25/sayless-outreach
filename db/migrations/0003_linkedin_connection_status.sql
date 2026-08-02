-- Single seat, single row. Written only by linkedin-worker (via the
-- linkedin-connection-mark-connected n8n webhook) at the moment a connect
-- session captures storageState — not by admin-ui directly.
CREATE TABLE linkedin_connection_status (
    id                SERIAL PRIMARY KEY,
    status            TEXT NOT NULL DEFAULT 'disconnected'
                      CHECK (status IN ('connected', 'disconnected')),
    last_connected_at TIMESTAMPTZ,
    updated_at        TIMESTAMPTZ NOT NULL DEFAULT now()
);

INSERT INTO linkedin_connection_status (status) VALUES ('disconnected');

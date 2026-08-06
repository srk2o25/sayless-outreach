#!/bin/bash
# Runs on first container init only (empty data dir), same as any file the
# postgres image finds directly in /docker-entrypoint-initdb.d/. Exists
# because that mechanism does NOT recurse into subdirectories, so
# migrations/ and seed/ have to be walked explicitly here instead.
set -euo pipefail

for f in /sayless-outreach-migrations/*.sql; do
  echo "sayless-outreach: running migration $f"
  psql -v ON_ERROR_STOP=1 -U "$POSTGRES_USER" -d "$POSTGRES_DB" -f "$f"
done

for f in /sayless-outreach-seed/*.sql; do
  echo "sayless-outreach: running seed $f"
  psql -v ON_ERROR_STOP=1 -U "$POSTGRES_USER" -d "$POSTGRES_DB" -f "$f"
done

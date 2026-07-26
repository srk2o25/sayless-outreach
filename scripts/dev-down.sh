#!/usr/bin/env bash
# Stops everything dev-up.sh started: admin-ui and linkedin-worker (host
# processes, found by port, not stored PID — npm wraps a child process and a
# stored npm PID doesn't reliably kill the real listener) and db + n8n (Docker).

set -euo pipefail
cd "$(dirname "$0")/.."

if [ -f .env ]; then
  # shellcheck disable=SC1091
  set -a; source .env; set +a
fi

for name_port in "admin-ui:${ADMIN_UI_PORT:-4300}" "linkedin-worker:${LINKEDIN_WORKER_PORT:-4100}"; do
  name="${name_port%%:*}"
  port="${name_port##*:}"
  pid="$(lsof -tiTCP:"$port" -sTCP:LISTEN 2>/dev/null || true)"
  if [ -n "$pid" ]; then
    kill "$pid" 2>/dev/null || true
    echo "Stopped $name (port $port)."
  else
    echo "$name was not running."
  fi
done

docker compose down
echo "Stopped db + n8n."

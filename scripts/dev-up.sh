#!/usr/bin/env bash
# Brings up the entire local dev stack: db + n8n (Docker), admin-ui and
# linkedin-worker (as background host processes, so hot reload still works).
# The one thing this script does NOT do is the LinkedIn login — that's
# inherently interactive (needs a real browser window + you pressing Enter)
# and can't run unattended. It's checked for and called out below.

set -euo pipefail
cd "$(dirname "$0")/.."

LOG_DIR=".dev-logs"
mkdir -p "$LOG_DIR"

echo "== Sayless Outreach dev environment =="
echo ""

if ! docker info >/dev/null 2>&1; then
  echo "Docker is not running. Start Docker Desktop and re-run this script." >&2
  exit 1
fi

if [ ! -f .env ]; then
  echo ".env not found. Copy .env.example to .env and fill in BREVO_API_KEY, then re-run." >&2
  exit 1
fi

# shellcheck disable=SC1091
set -a; source .env; set +a

echo "-- Starting db + n8n --"
docker compose up -d db n8n

echo "-- Waiting for Postgres to report healthy --"
for _ in $(seq 1 30); do
  status="$(docker compose ps db --format '{{.Health}}' 2>/dev/null || true)"
  if [ "$status" = "healthy" ]; then
    echo "Postgres is healthy."
    break
  fi
  sleep 2
done

echo ""
echo "-- admin-ui dependencies --"
if [ -d admin-ui/node_modules ]; then
  echo "Already installed, skipping."
else
  (cd admin-ui && npm install)
fi

echo ""
echo "-- linkedin-worker dependencies --"
if [ -d linkedin-worker/node_modules ]; then
  echo "Already installed, skipping."
else
  (cd linkedin-worker && npm install)
fi

echo ""
echo "-- linkedin-worker browser binary --"
if [ -d "$HOME/Library/Caches/ms-playwright" ] && find "$HOME/Library/Caches/ms-playwright" -maxdepth 1 -name 'chromium-*' -print -quit | grep -q .; then
  echo "Already downloaded, skipping."
else
  (cd linkedin-worker && npx playwright install chromium)
fi

# ── Start the two host processes in the background ─────────────────────────
# Killed later by port lookup (dev-down.sh), not by stored PID — npm wraps a
# child process, and a stored npm PID doesn't reliably kill the real listener.

echo ""
echo "-- Starting admin-ui --"
if lsof -tiTCP:"${ADMIN_UI_PORT:-4300}" -sTCP:LISTEN >/dev/null 2>&1; then
  echo "Already running on port ${ADMIN_UI_PORT:-4300}."
else
  (cd admin-ui && nohup npm start > "../$LOG_DIR/admin-ui.log" 2>&1 &)
fi

echo "-- Starting linkedin-worker --"
if lsof -tiTCP:"${LINKEDIN_WORKER_PORT:-4100}" -sTCP:LISTEN >/dev/null 2>&1; then
  echo "Already running on port ${LINKEDIN_WORKER_PORT:-4100}."
else
  (cd linkedin-worker && nohup npm run dev > "../$LOG_DIR/linkedin-worker.log" 2>&1 &)
fi

echo ""
echo "-- Waiting for admin-ui and linkedin-worker to come up --"
for _ in $(seq 1 30); do
  admin_up=false; worker_up=false
  lsof -tiTCP:"${ADMIN_UI_PORT:-4300}" -sTCP:LISTEN >/dev/null 2>&1 && admin_up=true
  lsof -tiTCP:"${LINKEDIN_WORKER_PORT:-4100}" -sTCP:LISTEN >/dev/null 2>&1 && worker_up=true
  if [ "$admin_up" = true ] && [ "$worker_up" = true ]; then
    break
  fi
  sleep 2
done

echo ""
echo "================================================================"
if [ -f linkedin-worker/session-state/linkedin.json ]; then
  echo "LinkedIn session found."
else
  echo "!! No LinkedIn session yet. linkedin-worker is running but any"
  echo "!! LinkedIn action will fail until you run this once, interactively:"
  echo "     cd linkedin-worker && npm run login"
fi
echo "================================================================"
echo ""
echo "All up:"
echo "  admin-ui         -> http://localhost:${ADMIN_UI_PORT:-4300}   (log: $LOG_DIR/admin-ui.log)"
echo "  n8n              -> http://localhost:${N8N_PORT:-5678}"
echo "  linkedin-worker  -> http://localhost:${LINKEDIN_WORKER_PORT:-4100}/health   (log: $LOG_DIR/linkedin-worker.log)"
echo ""
echo "Tail logs:  tail -f $LOG_DIR/admin-ui.log"
echo "Stop everything:  ./scripts/dev-down.sh"

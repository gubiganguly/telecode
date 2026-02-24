#!/bin/bash
# Start the backend uvicorn process (idempotent).
# Expects: .env.production already sourced by caller
# Writes PID to logs/.pid.backend

REPO_DIR="$(cd "$(dirname "$0")/.." && pwd)"
LOG_DIR="$REPO_DIR/logs"
PID_FILE="$LOG_DIR/.pid.backend"

mkdir -p "$LOG_DIR"

# Check if already running and healthy
if [ -f "$PID_FILE" ] && kill -0 "$(cat "$PID_FILE")" 2>/dev/null; then
  if curl -sf --max-time 3 http://localhost:8000/api/health > /dev/null 2>&1; then
    exit 0
  fi
  kill "$(cat "$PID_FILE")" 2>/dev/null
  sleep 1
fi

# Kill anything stale on port 8000
STALE=$(lsof -ti:8000 2>/dev/null || true)
[ -n "$STALE" ] && echo "$STALE" | xargs kill -9 2>/dev/null || true

cd "$REPO_DIR/backend"
source venv/bin/activate
uvicorn src.main:app --host 0.0.0.0 --port 8000 >> "$LOG_DIR/backend.log" 2>&1 &
echo $! > "$PID_FILE"

# Wait for healthy (up to 20s)
for i in $(seq 1 20); do
  if curl -sf --max-time 3 http://localhost:8000/api/health > /dev/null 2>&1; then
    exit 0
  fi
  sleep 1
done

echo "$(date '+%Y-%m-%d %H:%M:%S') Backend failed to start" >> "$LOG_DIR/monitor.log"
exit 1

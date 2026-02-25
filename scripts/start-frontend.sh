#!/bin/bash
# Start the frontend Next.js process (idempotent).
# Expects: .env.production already sourced by caller
# Accepts --rebuild flag to force a fresh build
# Writes PID to logs/.pid.frontend

REPO_DIR="$(cd "$(dirname "$0")/.." && pwd)"
LOG_DIR="$REPO_DIR/logs"
PID_FILE="$LOG_DIR/.pid.frontend"

mkdir -p "$LOG_DIR"

# Check if already running and healthy
if [ -f "$PID_FILE" ] && kill -0 "$(cat "$PID_FILE")" 2>/dev/null; then
  if curl -sf --max-time 3 http://localhost:3000 > /dev/null 2>&1; then
    exit 0
  fi
  kill "$(cat "$PID_FILE")" 2>/dev/null
  sleep 1
fi

# Kill anything stale on port 3000
STALE=$(lsof -ti:3000 2>/dev/null || true)
[ -n "$STALE" ] && echo "$STALE" | xargs kill -9 2>/dev/null || true

cd "$REPO_DIR/frontend"

# Always clean and rebuild to avoid stale .next artifacts
rm -rf .next
npm run build >> "$LOG_DIR/frontend-build.log" 2>&1
if [ $? -ne 0 ]; then
  echo "$(date '+%Y-%m-%d %H:%M:%S') Frontend build failed" >> "$LOG_DIR/monitor.log"
  exit 1
fi

npm start >> "$LOG_DIR/frontend.log" 2>&1 &
echo $! > "$PID_FILE"

# Wait for healthy (up to 20s)
for i in $(seq 1 20); do
  if curl -sf --max-time 3 http://localhost:3000 > /dev/null 2>&1; then
    exit 0
  fi
  sleep 1
done

echo "$(date '+%Y-%m-%d %H:%M:%S') Frontend failed to start" >> "$LOG_DIR/monitor.log"
exit 1

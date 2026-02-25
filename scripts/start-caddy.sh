#!/bin/bash
# Start Caddy reverse proxy for live previews.
# Caddy is configured dynamically via its admin API by the backend.

REPO_DIR="$(cd "$(dirname "$0")/.." && pwd)"
LOG_DIR="$REPO_DIR/logs"
PID_FILE="$LOG_DIR/.pid.caddy"
LOG_FILE="$LOG_DIR/caddy.log"

mkdir -p "$LOG_DIR"

# Kill existing Caddy
if [ -f "$PID_FILE" ]; then
  OLD_PID=$(cat "$PID_FILE")
  if kill -0 "$OLD_PID" 2>/dev/null; then
    kill "$OLD_PID" 2>/dev/null
    sleep 1
  fi
  rm -f "$PID_FILE"
fi

# Check if Caddy is installed
if ! command -v caddy &>/dev/null; then
  echo "$(date '+%Y-%m-%d %H:%M:%S') [caddy] ERROR: caddy not found. Install with: brew install caddy" >> "$LOG_FILE"
  exit 1
fi

# Start Caddy with empty config — backend pushes routes via admin API
caddy run >> "$LOG_FILE" 2>&1 &
CADDY_PID=$!
echo "$CADDY_PID" > "$PID_FILE"
echo "$(date '+%Y-%m-%d %H:%M:%S') [caddy] Started Caddy (PID $CADDY_PID)" >> "$LOG_FILE"

#!/bin/bash

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
PID_FILE="$SCRIPT_DIR/logs/.pids"

RED='\033[0;31m'
GREEN='\033[0;32m'
NC='\033[0m'

echo "=== Stopping CasperBot ==="
echo ""

# Kill by saved PIDs first
if [ -f "$PID_FILE" ]; then
  PIDS=$(cat "$PID_FILE")
  for PID in $PIDS; do
    if kill -0 "$PID" 2>/dev/null; then
      kill "$PID" 2>/dev/null
      echo -e "  ${GREEN}✓${NC} Killed PID $PID"
    fi
  done
  rm -f "$PID_FILE"
fi

# Also clean up by port in case PIDs are stale
for PORT in 8000 3000; do
  STALE_PIDS=$(lsof -ti:$PORT 2>/dev/null || true)
  if [ -n "$STALE_PIDS" ]; then
    echo "$STALE_PIDS" | xargs kill 2>/dev/null || true
    echo -e "  ${GREEN}✓${NC} Killed process on port $PORT"
  fi
done

# Kill any cloudflared tunnel for casperbot
pkill -f "cloudflared tunnel run casperbot" 2>/dev/null && \
  echo -e "  ${GREEN}✓${NC} Killed cloudflared tunnel" || true

echo ""
echo "All services stopped."

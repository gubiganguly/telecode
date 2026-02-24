#!/bin/bash

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
LOG_DIR="$SCRIPT_DIR/logs"

RED='\033[0;31m'
GREEN='\033[0;32m'
NC='\033[0m'

ok() { echo -e "  ${GREEN}✓${NC} $1"; }

echo "=== Stopping CasperBot ==="
echo ""

# Stop the monitor first (otherwise it restarts everything you just killed)
MONITOR_PID=$(pgrep -f "scripts/monitor.sh" 2>/dev/null | head -1)
if [ -n "$MONITOR_PID" ]; then
  kill "$MONITOR_PID" 2>/dev/null
  ok "Stopped monitor (PID $MONITOR_PID)"
fi

# Unload launchd service to prevent auto-restart
launchctl bootout "gui/$(id -u)/com.casperbot" 2>/dev/null && \
  ok "Unloaded launchd service" || true

# Kill each process by PID file
for NAME in backend frontend tunnel; do
  PID_FILE="$LOG_DIR/.pid.$NAME"
  if [ -f "$PID_FILE" ]; then
    PID=$(cat "$PID_FILE")
    if kill -0 "$PID" 2>/dev/null; then
      kill "$PID" 2>/dev/null
      ok "Stopped $NAME (PID $PID)"
    fi
    rm -f "$PID_FILE"
  fi
done

# Fallback: clean up by port
for PORT in 8000 3000; do
  STALE_PIDS=$(lsof -ti:$PORT 2>/dev/null || true)
  if [ -n "$STALE_PIDS" ]; then
    echo "$STALE_PIDS" | xargs kill 2>/dev/null || true
    ok "Killed stale process on port $PORT"
  fi
done

# Fallback: kill cloudflared by process name
pkill -f "cloudflared tunnel run casperbot" 2>/dev/null && \
  ok "Killed cloudflared tunnel" || true

# Clean up old-style PID file
rm -f "$LOG_DIR/.pids"

echo ""
echo "All services stopped."
echo ""
echo "  To re-enable auto-restart: ./service/install.sh"

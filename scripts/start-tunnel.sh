#!/bin/bash
# Start the cloudflared tunnel (idempotent).
# Writes PID to logs/.pid.tunnel

REPO_DIR="$(cd "$(dirname "$0")/.." && pwd)"
LOG_DIR="$REPO_DIR/logs"
PID_FILE="$LOG_DIR/.pid.tunnel"

mkdir -p "$LOG_DIR"

# Check if already running
if [ -f "$PID_FILE" ] && kill -0 "$(cat "$PID_FILE")" 2>/dev/null; then
  exit 0
fi

# Kill any stale cloudflared
pkill -f "cloudflared tunnel" 2>/dev/null || true
sleep 1

# Unset TUNNEL_TOKEN so cloudflared uses local config
unset TUNNEL_TOKEN

cloudflared --config /Users/clawdbot/.cloudflared/config.yml tunnel run topanga-gateway >> "$LOG_DIR/tunnel.log" 2>&1 &
echo $! > "$PID_FILE"

sleep 3
if kill -0 "$(cat "$PID_FILE")" 2>/dev/null; then
  exit 0
fi

echo "$(date '+%Y-%m-%d %H:%M:%S') Tunnel failed to start" >> "$LOG_DIR/monitor.log"
exit 1

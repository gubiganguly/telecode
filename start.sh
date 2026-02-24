#!/bin/bash
set -e

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
LOG_DIR="$SCRIPT_DIR/logs"
mkdir -p "$LOG_DIR"

# Load production env vars if available
if [ -f "$SCRIPT_DIR/.env.production" ]; then
  set -a
  source "$SCRIPT_DIR/.env.production"
  set +a
  echo "Loaded .env.production"
fi

# --- Backend ---
echo "Starting backend..."
cd "$SCRIPT_DIR/backend"
source venv/bin/activate
uvicorn src.main:app --host 0.0.0.0 --port 8000 > "$LOG_DIR/backend.log" 2>&1 &
BACKEND_PID=$!
echo "  PID: $BACKEND_PID"

# --- Frontend ---
echo "Building frontend..."
cd "$SCRIPT_DIR/frontend"
npm run build > "$LOG_DIR/frontend-build.log" 2>&1
echo "Starting frontend..."
npm start > "$LOG_DIR/frontend.log" 2>&1 &
FRONTEND_PID=$!
echo "  PID: $FRONTEND_PID"

# --- Cloudflare Tunnel ---
echo "Starting Cloudflare tunnel..."
cloudflared tunnel run casperbot > "$LOG_DIR/tunnel.log" 2>&1 &
TUNNEL_PID=$!
echo "  PID: $TUNNEL_PID"

# Save PIDs for stop.sh
echo "$BACKEND_PID $FRONTEND_PID $TUNNEL_PID" > "$LOG_DIR/.pids"

echo ""
echo "All services started. Logs in $LOG_DIR/"
echo "  Backend:  tail -f $LOG_DIR/backend.log"
echo "  Frontend: tail -f $LOG_DIR/frontend.log"
echo "  Tunnel:   tail -f $LOG_DIR/tunnel.log"
echo ""
echo "Visit: https://casperbot.net"
echo "Stop:  ./stop.sh"

wait

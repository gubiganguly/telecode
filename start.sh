#!/bin/bash
set -e

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
LOG_DIR="$SCRIPT_DIR/logs"
PID_FILE="$LOG_DIR/.pids"
mkdir -p "$LOG_DIR"

RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[0;33m'
NC='\033[0m'

ok()   { echo -e "  ${GREEN}✓${NC} $1"; }
fail() { echo -e "  ${RED}✗${NC} $1"; }
warn() { echo -e "  ${YELLOW}!${NC} $1"; }

# ---------------------------------------------------------------------------
# Pre-flight checks
# ---------------------------------------------------------------------------
echo "=== Telecode Start ==="
echo ""

if [ ! -f "$SCRIPT_DIR/.env.production" ]; then
  fail ".env.production not found. Run ./setup.sh first."
  exit 1
fi

# Load env vars (set -a exports them to child processes)
set -a
source "$SCRIPT_DIR/.env.production"
set +a
ok "Loaded .env.production"

# ---------------------------------------------------------------------------
# Kill anything already on our ports
# ---------------------------------------------------------------------------
echo ""
echo "Cleaning up stale processes..."

for PORT in 8000 3000; do
  STALE_PIDS=$(lsof -ti:$PORT 2>/dev/null || true)
  if [ -n "$STALE_PIDS" ]; then
    echo "$STALE_PIDS" | xargs kill -9 2>/dev/null || true
    warn "Killed stale process on port $PORT"
  fi
done

# Kill any existing cloudflared tunnel for casperbot
pkill -f "cloudflared tunnel run casperbot" 2>/dev/null || true
sleep 1

# ---------------------------------------------------------------------------
# Backend
# ---------------------------------------------------------------------------
echo ""
echo "Starting backend..."
cd "$SCRIPT_DIR/backend"
source venv/bin/activate
uvicorn src.main:app --host 0.0.0.0 --port 8000 > "$LOG_DIR/backend.log" 2>&1 &
BACKEND_PID=$!

# Wait for backend to be ready
for i in $(seq 1 15); do
  if curl -s http://localhost:8000/api/health > /dev/null 2>&1; then
    ok "Backend running (PID $BACKEND_PID)"
    break
  fi
  if [ $i -eq 15 ]; then
    fail "Backend failed to start. Check $LOG_DIR/backend.log"
    kill $BACKEND_PID 2>/dev/null || true
    exit 1
  fi
  sleep 1
done

# ---------------------------------------------------------------------------
# Frontend
# ---------------------------------------------------------------------------
echo ""
echo "Building frontend (this may take a moment)..."
cd "$SCRIPT_DIR/frontend"

if npm run build > "$LOG_DIR/frontend-build.log" 2>&1; then
  ok "Frontend built"
else
  fail "Frontend build failed. Check $LOG_DIR/frontend-build.log"
  kill $BACKEND_PID 2>/dev/null || true
  exit 1
fi

echo "Starting frontend..."
npm start > "$LOG_DIR/frontend.log" 2>&1 &
FRONTEND_PID=$!

# Wait for frontend to be ready
for i in $(seq 1 15); do
  if curl -s http://localhost:3000 > /dev/null 2>&1; then
    ok "Frontend running (PID $FRONTEND_PID)"
    break
  fi
  if [ $i -eq 15 ]; then
    fail "Frontend failed to start. Check $LOG_DIR/frontend.log"
    kill $BACKEND_PID $FRONTEND_PID 2>/dev/null || true
    exit 1
  fi
  sleep 1
done

# ---------------------------------------------------------------------------
# Cloudflare Tunnel
# ---------------------------------------------------------------------------
echo ""
echo "Starting Cloudflare tunnel..."
cloudflared tunnel run casperbot > "$LOG_DIR/tunnel.log" 2>&1 &
TUNNEL_PID=$!
sleep 3

if kill -0 $TUNNEL_PID 2>/dev/null; then
  ok "Tunnel running (PID $TUNNEL_PID)"
else
  fail "Tunnel failed to start. Check $LOG_DIR/tunnel.log"
  warn "Backend and frontend are still running — just no public access."
fi

# ---------------------------------------------------------------------------
# Save PIDs & print summary
# ---------------------------------------------------------------------------
echo "$BACKEND_PID $FRONTEND_PID $TUNNEL_PID" > "$PID_FILE"

echo ""
echo -e "${GREEN}=== All services running ===${NC}"
echo ""
echo "  Local:   http://localhost:3000"
echo "  Public:  https://casperbot.net"
echo ""
echo "  Logs:"
echo "    tail -f $LOG_DIR/backend.log"
echo "    tail -f $LOG_DIR/frontend.log"
echo "    tail -f $LOG_DIR/tunnel.log"
echo ""
echo "  Stop:    ./stop.sh"
echo "  Status:  ./status.sh"

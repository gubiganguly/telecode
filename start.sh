#!/bin/bash
set -e

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
LOG_DIR="$SCRIPT_DIR/logs"
SCRIPTS_DIR="$SCRIPT_DIR/scripts"
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
echo "=== CasperBot Start ==="
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
# Start each service
# ---------------------------------------------------------------------------
echo ""
echo "Starting backend..."
if "$SCRIPTS_DIR/start-backend.sh"; then
  ok "Backend running"
else
  fail "Backend failed to start. Check $LOG_DIR/backend.log"
  exit 1
fi

echo ""
echo "Starting frontend (building if needed)..."
if "$SCRIPTS_DIR/start-frontend.sh"; then
  ok "Frontend running"
else
  fail "Frontend failed to start. Check $LOG_DIR/frontend-build.log"
  exit 1
fi

echo ""
echo "Starting Cloudflare tunnel..."
if "$SCRIPTS_DIR/start-tunnel.sh"; then
  ok "Tunnel running"
else
  warn "Tunnel failed to start. Check $LOG_DIR/tunnel.log"
  warn "Backend and frontend are still running — just no public access."
fi

# ---------------------------------------------------------------------------
# Summary
# ---------------------------------------------------------------------------
echo ""
echo -e "${GREEN}=== All services running ===${NC}"
echo ""
echo "  Local:   http://localhost:3000"
echo "  Public:  https://casperbot.net"
echo ""
echo "  Enable auto-restart: ./service/install.sh"
echo ""
echo "  Logs:"
echo "    tail -f $LOG_DIR/backend.log"
echo "    tail -f $LOG_DIR/frontend.log"
echo "    tail -f $LOG_DIR/tunnel.log"
echo ""
echo "  Stop:    ./stop.sh"
echo "  Status:  ./status.sh"

#!/bin/bash

RED='\033[0;31m'
GREEN='\033[0;32m'
NC='\033[0m'

check() {
  local name="$1" port="$2" url="$3"
  local pid=$(lsof -ti:$port 2>/dev/null | head -1)

  if [ -n "$pid" ] && curl -s "$url" > /dev/null 2>&1; then
    echo -e "  ${GREEN}●${NC} $name  (PID $pid, port $port)"
  elif [ -n "$pid" ]; then
    echo -e "  ${RED}●${NC} $name  (PID $pid, port $port — not responding)"
  else
    echo -e "  ${RED}○${NC} $name  (not running)"
  fi
}

echo "=== CasperBot Status ==="
echo ""

check "Backend " 8000 "http://localhost:8000/api/health"
check "Frontend" 3000 "http://localhost:3000"

# Tunnel check (no port to check, just process)
TUNNEL_PID=$(pgrep -f "cloudflared tunnel run casperbot" 2>/dev/null | head -1)
if [ -n "$TUNNEL_PID" ]; then
  echo -e "  ${GREEN}●${NC} Tunnel   (PID $TUNNEL_PID)"
else
  echo -e "  ${RED}○${NC} Tunnel   (not running)"
fi

echo ""

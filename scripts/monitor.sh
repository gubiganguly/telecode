#!/bin/bash
# CasperBot Process Monitor
# Checks all 4 processes every 5 seconds, restarts any that are down.
# Designed to be run by launchd with KeepAlive: true.

REPO_DIR="$(cd "$(dirname "$0")/.." && pwd)"
LOG_DIR="$REPO_DIR/logs"
MONITOR_LOG="$LOG_DIR/monitor.log"
SCRIPTS_DIR="$REPO_DIR/scripts"
CHECK_INTERVAL=5

mkdir -p "$LOG_DIR"

log() {
  echo "$(date '+%Y-%m-%d %H:%M:%S') [monitor] $1" >> "$MONITOR_LOG"
}

# Load environment
if [ ! -f "$REPO_DIR/.env.production" ]; then
  log "FATAL: .env.production not found"
  exit 1
fi
set -a
source "$REPO_DIR/.env.production"
set +a

# Track consecutive failures for backoff
BACKEND_FAILURES=0
FRONTEND_FAILURES=0
TUNNEL_FAILURES=0
CADDY_FAILURES=0
MAX_FAILURES=10
LOOP_COUNT=0

log "Monitor started (PID $$, interval ${CHECK_INTERVAL}s)"

# Initial startup — bring everything up
log "Initial startup: launching all processes"
"$SCRIPTS_DIR/start-backend.sh"
"$SCRIPTS_DIR/start-frontend.sh"
"$SCRIPTS_DIR/start-tunnel.sh"
"$SCRIPTS_DIR/start-caddy.sh"
log "Initial startup complete"

# Trap SIGTERM for clean shutdown
trap 'log "Monitor stopping (SIGTERM)"; exit 0' TERM INT

while true; do
  sleep "$CHECK_INTERVAL"
  LOOP_COUNT=$((LOOP_COUNT + 1))

  # --- Log rotation (once per day: ~17280 cycles at 5s) ---
  if [ "$((LOOP_COUNT % 17280))" -eq 0 ]; then
    for logfile in "$LOG_DIR"/*.log; do
      SIZE=$(stat -f%z "$logfile" 2>/dev/null || echo 0)
      if [ "$SIZE" -gt 10485760 ]; then
        tail -n 1000 "$logfile" > "$logfile.tmp" && mv "$logfile.tmp" "$logfile"
        log "Rotated $logfile (was $SIZE bytes)"
      fi
    done
  fi

  # --- Backend check ---
  BACKEND_ALIVE=false
  BACKEND_PID_FILE="$LOG_DIR/.pid.backend"
  if [ -f "$BACKEND_PID_FILE" ] && kill -0 "$(cat "$BACKEND_PID_FILE")" 2>/dev/null; then
    if curl -sf --max-time 3 http://localhost:8000/api/health > /dev/null 2>&1; then
      BACKEND_ALIVE=true
      BACKEND_FAILURES=0
    fi
  fi

  if [ "$BACKEND_ALIVE" = false ]; then
    BACKEND_FAILURES=$((BACKEND_FAILURES + 1))
    if [ "$BACKEND_FAILURES" -le "$MAX_FAILURES" ]; then
      log "Backend DOWN (attempt $BACKEND_FAILURES/$MAX_FAILURES) — restarting"
      "$SCRIPTS_DIR/start-backend.sh"
    elif [ "$((BACKEND_FAILURES % 60))" -eq 0 ]; then
      log "Backend DOWN (extended backoff, attempt $BACKEND_FAILURES) — retrying"
      "$SCRIPTS_DIR/start-backend.sh"
    fi
  fi

  # --- Frontend check ---
  FRONTEND_ALIVE=false
  FRONTEND_PID_FILE="$LOG_DIR/.pid.frontend"
  if [ -f "$FRONTEND_PID_FILE" ] && kill -0 "$(cat "$FRONTEND_PID_FILE")" 2>/dev/null; then
    if curl -sf --max-time 3 http://localhost:3000 > /dev/null 2>&1; then
      FRONTEND_ALIVE=true
      FRONTEND_FAILURES=0
    fi
  fi

  if [ "$FRONTEND_ALIVE" = false ]; then
    FRONTEND_FAILURES=$((FRONTEND_FAILURES + 1))
    if [ "$FRONTEND_FAILURES" -le "$MAX_FAILURES" ]; then
      log "Frontend DOWN (attempt $FRONTEND_FAILURES/$MAX_FAILURES) — restarting"
      "$SCRIPTS_DIR/start-frontend.sh"
    elif [ "$((FRONTEND_FAILURES % 60))" -eq 0 ]; then
      log "Frontend DOWN (extended backoff, attempt $FRONTEND_FAILURES) — retrying"
      "$SCRIPTS_DIR/start-frontend.sh"
    fi
  fi

  # --- Tunnel check ---
  TUNNEL_ALIVE=false
  TUNNEL_PID_FILE="$LOG_DIR/.pid.tunnel"
  if [ -f "$TUNNEL_PID_FILE" ] && kill -0 "$(cat "$TUNNEL_PID_FILE")" 2>/dev/null; then
    TUNNEL_ALIVE=true
    TUNNEL_FAILURES=0
  fi

  if [ "$TUNNEL_ALIVE" = false ]; then
    TUNNEL_FAILURES=$((TUNNEL_FAILURES + 1))
    if [ "$TUNNEL_FAILURES" -le "$MAX_FAILURES" ]; then
      log "Tunnel DOWN (attempt $TUNNEL_FAILURES/$MAX_FAILURES) — restarting"
      "$SCRIPTS_DIR/start-tunnel.sh"
    elif [ "$((TUNNEL_FAILURES % 60))" -eq 0 ]; then
      log "Tunnel DOWN (extended backoff, attempt $TUNNEL_FAILURES) — retrying"
      "$SCRIPTS_DIR/start-tunnel.sh"
    fi
  fi

  # --- Caddy check (live preview reverse proxy) ---
  CADDY_ALIVE=false
  CADDY_PID_FILE="$LOG_DIR/.pid.caddy"
  if [ -f "$CADDY_PID_FILE" ] && kill -0 "$(cat "$CADDY_PID_FILE")" 2>/dev/null; then
    CADDY_ALIVE=true
    CADDY_FAILURES=0
  fi

  if [ "$CADDY_ALIVE" = false ]; then
    CADDY_FAILURES=$((CADDY_FAILURES + 1))
    if [ "$CADDY_FAILURES" -le "$MAX_FAILURES" ]; then
      log "Caddy DOWN (attempt $CADDY_FAILURES/$MAX_FAILURES) — restarting"
      "$SCRIPTS_DIR/start-caddy.sh"
    elif [ "$((CADDY_FAILURES % 60))" -eq 0 ]; then
      log "Caddy DOWN (extended backoff, attempt $CADDY_FAILURES) — retrying"
      "$SCRIPTS_DIR/start-caddy.sh"
    fi
  fi
done

#!/bin/bash
set -e

# ============================================================================
# CasperBot Migration Script
# Moves the project from ~/Claude Code Projects/ to ~/CasperBot/Claude Code Projects/
# ============================================================================

GREEN='\033[0;32m'
YELLOW='\033[0;33m'
RED='\033[0;31m'
BOLD='\033[1m'
NC='\033[0m'

ok()   { echo -e "  ${GREEN}✓${NC} $1"; }
warn() { echo -e "  ${YELLOW}!${NC} $1"; }
fail() { echo -e "  ${RED}✗${NC} $1"; exit 1; }

OLD_PROJECTS="$HOME/Claude Code Projects"
NEW_HOME="$HOME/CasperBot"
NEW_PROJECTS="$NEW_HOME/Claude Code Projects"
REPO_NAME="CasperBot"
NEW_REPO="$NEW_PROJECTS/$REPO_NAME"

echo ""
echo -e "${BOLD}=== CasperBot Migration ===${NC}"
echo ""
echo "  From: $OLD_PROJECTS/"
echo "  To:   $NEW_PROJECTS/"
echo ""

# ---------------------------------------------------------------------------
# Pre-flight checks
# ---------------------------------------------------------------------------
if [ ! -d "$OLD_PROJECTS/$REPO_NAME" ]; then
  fail "Source not found: $OLD_PROJECTS/$REPO_NAME"
fi

if [ -d "$NEW_REPO" ]; then
  fail "Destination already exists: $NEW_REPO"
fi

# ---------------------------------------------------------------------------
# 1. Stop all services
# ---------------------------------------------------------------------------
echo -e "${BOLD}[1/6] Stopping services...${NC}"

# Stop monitor/launchd first
launchctl bootout "gui/$(id -u)/com.casperbot" 2>/dev/null && \
  ok "Unloaded launchd service" || true

MONITOR_PID=$(pgrep -f "scripts/monitor.sh" 2>/dev/null | head -1)
if [ -n "$MONITOR_PID" ]; then
  kill "$MONITOR_PID" 2>/dev/null
  ok "Stopped monitor"
fi

# Kill by port
for PORT in 8000 3000; do
  PIDS=$(lsof -ti:$PORT 2>/dev/null || true)
  if [ -n "$PIDS" ]; then
    echo "$PIDS" | xargs kill 2>/dev/null || true
    ok "Stopped process on port $PORT"
  fi
done

# Kill cloudflared tunnel
pkill -f "cloudflared tunnel run casperbot" 2>/dev/null && \
  ok "Stopped cloudflared tunnel" || true

# Kill any running claude processes in the old directory
pkill -f "claude.*Claude Code Projects/CasperBot" 2>/dev/null && \
  ok "Stopped claude processes" || true

# Give processes a moment to exit cleanly (important for SQLite WAL checkpoint)
sleep 2
ok "Services stopped"

# ---------------------------------------------------------------------------
# 2. Move the directory
# ---------------------------------------------------------------------------
echo ""
echo -e "${BOLD}[2/6] Moving files...${NC}"

mkdir -p "$NEW_HOME"
mv "$OLD_PROJECTS" "$NEW_PROJECTS"
ok "Moved $OLD_PROJECTS → $NEW_PROJECTS"

# ---------------------------------------------------------------------------
# 3. Clean up caches
# ---------------------------------------------------------------------------
echo ""
echo -e "${BOLD}[3/6] Cleaning caches...${NC}"

# Python bytecode has baked-in paths
find "$NEW_REPO/backend" -type d -name __pycache__ -exec rm -rf {} + 2>/dev/null || true
ok "Cleared Python __pycache__"

# Next.js build cache has baked-in paths (self-heals on rebuild, but clean it anyway)
rm -rf "$NEW_REPO/frontend/.next" 2>/dev/null || true
ok "Cleared Next.js build cache"

# ---------------------------------------------------------------------------
# 4. Update database paths
# ---------------------------------------------------------------------------
echo ""
echo -e "${BOLD}[4/6] Updating database...${NC}"

DB_PATH="$NEW_REPO/backend/data/casperbot.db"
if [ -f "$DB_PATH" ]; then
  # Update all project paths that reference the old location
  sqlite3 "$DB_PATH" "UPDATE projects SET path = REPLACE(path, '$OLD_PROJECTS', '$NEW_PROJECTS') WHERE path LIKE '%$OLD_PROJECTS%';"
  ok "Updated project paths in database"

  # Verify
  UPDATED=$(sqlite3 "$DB_PATH" "SELECT name, path FROM projects;" 2>/dev/null)
  echo "  Current project paths:"
  echo "$UPDATED" | while IFS='|' read -r name path; do
    echo "    $name → $path"
  done
else
  warn "Database not found at $DB_PATH — skipping"
fi

# ---------------------------------------------------------------------------
# 5. Update .env.production
# ---------------------------------------------------------------------------
echo ""
echo -e "${BOLD}[5/6] Updating config...${NC}"

ENV_FILE="$NEW_REPO/.env.production"
if [ -f "$ENV_FILE" ]; then
  # Check if CASPERBOT_PROJECTS_DIR already exists
  if grep -q "^CASPERBOT_PROJECTS_DIR=" "$ENV_FILE"; then
    # Update existing value
    sed -i '' "s|^CASPERBOT_PROJECTS_DIR=.*|CASPERBOT_PROJECTS_DIR=$NEW_PROJECTS|" "$ENV_FILE"
    ok "Updated CASPERBOT_PROJECTS_DIR in .env.production"
  else
    # Add it after the Auth section
    echo "" >> "$ENV_FILE"
    echo "# === Paths ===" >> "$ENV_FILE"
    echo "CASPERBOT_PROJECTS_DIR=$NEW_PROJECTS" >> "$ENV_FILE"
    ok "Added CASPERBOT_PROJECTS_DIR to .env.production"
  fi
else
  warn ".env.production not found — run setup.sh after migration"
fi

# ---------------------------------------------------------------------------
# 6. Reinstall launchd service
# ---------------------------------------------------------------------------
echo ""
echo -e "${BOLD}[6/6] Reinstalling launchd service...${NC}"

SERVICE_INSTALL="$NEW_REPO/service/install.sh"
if [ -f "$SERVICE_INSTALL" ]; then
  chmod +x "$SERVICE_INSTALL"
  chmod +x "$NEW_REPO/scripts/"*.sh 2>/dev/null || true
  chmod +x "$NEW_REPO/"*.sh 2>/dev/null || true
  "$SERVICE_INSTALL"
else
  warn "service/install.sh not found — skipping"
fi

# ---------------------------------------------------------------------------
# Done
# ---------------------------------------------------------------------------
echo ""
echo -e "${GREEN}${BOLD}=== Migration complete ===${NC}"
echo ""
echo "  CasperBot is now at: $NEW_REPO"
echo ""
echo "  To start:   cd \"$NEW_REPO\" && ./start.sh"
echo "  To status:  cd \"$NEW_REPO\" && ./status.sh"
echo ""
echo "  The old directory ($OLD_PROJECTS) has been moved."
echo "  If everything works, you can remove any leftover empty directories."
echo ""

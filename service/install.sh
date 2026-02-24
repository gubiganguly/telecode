#!/bin/bash
set -e

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
CASPERBOT_DIR="$(dirname "$SCRIPT_DIR")"
PLIST_SRC="$SCRIPT_DIR/com.casperbot.plist"
PLIST_DEST="$HOME/Library/LaunchAgents/com.casperbot.plist"

GREEN='\033[0;32m'
NC='\033[0m'

echo "=== Installing CasperBot as a macOS service ==="
echo ""

# Unload if already loaded
launchctl bootout "gui/$(id -u)/com.casperbot" 2>/dev/null || true

# Create the plist with correct paths
mkdir -p "$HOME/Library/LaunchAgents"
sed "s|__CASPERBOT_DIR__|$CASPERBOT_DIR|g" "$PLIST_SRC" > "$PLIST_DEST"

# Ensure logs directory exists
mkdir -p "$CASPERBOT_DIR/logs"

# Load the service
launchctl bootstrap "gui/$(id -u)" "$PLIST_DEST"

echo -e "  ${GREEN}✓${NC} Service installed and started"
echo ""
echo "  CasperBot will now start automatically on boot."
echo ""
echo "  Commands:"
echo "    Status:    launchctl print gui/$(id -u)/com.casperbot"
echo "    Stop:      launchctl bootout gui/$(id -u)/com.casperbot"
echo "    Restart:   launchctl kickstart -k gui/$(id -u)/com.casperbot"
echo "    Uninstall: ./service/uninstall.sh"
echo ""

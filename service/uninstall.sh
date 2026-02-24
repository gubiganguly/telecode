#!/bin/bash

PLIST_DEST="$HOME/Library/LaunchAgents/com.casperbot.plist"

GREEN='\033[0;32m'
NC='\033[0m'

echo "=== Uninstalling CasperBot service ==="
echo ""

# Stop and unload
launchctl bootout "gui/$(id -u)/com.casperbot" 2>/dev/null || true

# Remove plist
rm -f "$PLIST_DEST"

echo -e "  ${GREEN}✓${NC} Service uninstalled"
echo "  CasperBot will no longer start on boot."
echo ""

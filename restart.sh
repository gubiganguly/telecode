#!/bin/bash

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"

echo "=== Restarting CasperBot ==="
echo ""

"$SCRIPT_DIR/stop.sh"

echo ""
echo "Starting services..."
echo ""

"$SCRIPT_DIR/start.sh"

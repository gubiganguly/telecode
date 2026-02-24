#!/bin/bash

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
PID_FILE="$SCRIPT_DIR/logs/.pids"

if [ -f "$PID_FILE" ]; then
  PIDS=$(cat "$PID_FILE")
  echo "Stopping PIDs: $PIDS"
  kill $PIDS 2>/dev/null
  rm "$PID_FILE"
  echo "Done."
else
  echo "No PID file found. Killing by port..."
  lsof -ti:3000 | xargs kill 2>/dev/null && echo "Killed port 3000"
  lsof -ti:8000 | xargs kill 2>/dev/null && echo "Killed port 8000"
fi

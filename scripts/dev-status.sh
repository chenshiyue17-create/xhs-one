#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
SESSION_NAME="${SCREEN_SESSION_NAME:-xhs-one-dev}"
PORT="${PORT:-4173}"
LOG_FILE="$ROOT_DIR/logs/dev-server.log"

screen_has_session() {
  (screen -list 2>/dev/null || true) | grep -q "[.]${SESSION_NAME}[[:space:]]"
}

if screen_has_session; then
  echo "Screen session is running: $SESSION_NAME"
else
  echo "Screen session is not running: $SESSION_NAME"
fi

if command -v lsof >/dev/null 2>&1 && lsof -nP -iTCP:"$PORT" -sTCP:LISTEN >/dev/null 2>&1; then
  echo "Port $PORT is in use"
else
  echo "Port $PORT is not in use"
fi

if [ -f "$LOG_FILE" ]; then
  echo "Recent logs:"
  tail -20 "$LOG_FILE"
else
  echo "No log file yet: $LOG_FILE"
fi

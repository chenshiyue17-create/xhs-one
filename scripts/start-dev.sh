#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
SESSION_NAME="${SCREEN_SESSION_NAME:-xhs-one-dev}"
PORT="${PORT:-4173}"
LOG_FILE="$ROOT_DIR/logs/dev-server.log"

mkdir -p "$ROOT_DIR/logs" "$ROOT_DIR/output"

screen_has_session() {
  (screen -list 2>/dev/null || true) | grep -q "[.]${SESSION_NAME}[[:space:]]"
}

if screen_has_session; then
  screen -S "$SESSION_NAME" -X quit
  sleep 1
fi

if command -v lsof >/dev/null 2>&1; then
  EXISTING_PIDS="$(lsof -nP -tiTCP:"$PORT" -sTCP:LISTEN || true)"
  if [ -n "$EXISTING_PIDS" ]; then
    kill $EXISTING_PIDS || true
    sleep 1
  fi
fi

cd "$ROOT_DIR"
screen -dmS "$SESSION_NAME" bash -lc "npm run dev -- --host 0.0.0.0 --port $PORT > '$LOG_FILE' 2>&1"

echo "Dev server started in screen session: $SESSION_NAME"
echo "Local URL: http://localhost:$PORT"
echo "Log file: $LOG_FILE"

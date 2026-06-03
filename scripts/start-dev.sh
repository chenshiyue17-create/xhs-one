#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
SESSION_NAME="${SCREEN_SESSION_NAME:-xhs-all-in-one-dev}"
LOG_FILE="$ROOT_DIR/logs/dev-server.log"

mkdir -p "$ROOT_DIR/logs" "$ROOT_DIR/output"

screen_has_session() {
  (screen -list 2>/dev/null || true) | grep -q "[.]${SESSION_NAME}[[:space:]]"
}

if screen_has_session; then
  screen -S "$SESSION_NAME" -X quit
  sleep 1
fi

for port in 8000 5173 8765; do
  if command -v lsof >/dev/null 2>&1; then
    pids="$(lsof -nP -tiTCP:"$port" -sTCP:LISTEN || true)"
    if [ -n "$pids" ]; then
      kill $pids || true
      sleep 1
    fi
  fi
done

cd "$ROOT_DIR"
screen -dmS "$SESSION_NAME" bash -lc "./start.sh > '$LOG_FILE' 2>&1"

echo "Dev server started in screen session: $SESSION_NAME"
echo "Frontend URL: http://127.0.0.1:5173"
echo "Backend URL: http://127.0.0.1:8000/docs"
echo "Log file: $LOG_FILE"

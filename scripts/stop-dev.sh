#!/usr/bin/env bash
set -euo pipefail

SESSION_NAME="${SCREEN_SESSION_NAME:-xhs-all-in-one-dev}"

screen_has_session() {
  (screen -list 2>/dev/null || true) | grep -q "[.]${SESSION_NAME}[[:space:]]"
}

if screen_has_session; then
  screen -S "$SESSION_NAME" -X quit
  echo "Stopped screen session: $SESSION_NAME"
else
  echo "No running screen session found: $SESSION_NAME"
fi

for port in 8000 5173 8765; do
  if command -v lsof >/dev/null 2>&1; then
    pids="$(lsof -nP -tiTCP:"$port" -sTCP:LISTEN || true)"
    if [ -n "$pids" ]; then
      kill $pids || true
      echo "Stopped processes on port $port: $pids"
    fi
  fi
done

#!/usr/bin/env bash
set -euo pipefail

SESSION_NAME="${SCREEN_SESSION_NAME:-xhs-one-dev}"

screen_has_session() {
  (screen -list 2>/dev/null || true) | grep -q "[.]${SESSION_NAME}[[:space:]]"
}

if screen_has_session; then
  screen -S "$SESSION_NAME" -X quit
  echo "Stopped screen session: $SESSION_NAME"
else
  echo "No running screen session found: $SESSION_NAME"
fi

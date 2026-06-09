#!/usr/bin/env bash
set -euo pipefail

SESSION_NAME="${XHS_SCREEN_SESSION:-xhs-all-in-one-dev}"
PORT="${XHS_PORT:-8000}"

if command -v screen >/dev/null 2>&1; then
  screen -S "$SESSION_NAME" -X quit >/dev/null 2>&1 || true
fi

pids="$(lsof -ti:"$PORT" 2>/dev/null || true)"
if [[ -n "$pids" ]]; then
  echo "[stop] port $PORT: $pids"
  kill $pids >/dev/null 2>&1 || true
fi

echo "[ok] stopped $SESSION_NAME"

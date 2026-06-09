#!/usr/bin/env bash
set -euo pipefail

SESSION_NAME="${XHS_SCREEN_SESSION:-xhs-all-in-one-dev}"
HOST="${XHS_HOST:-127.0.0.1}"
PORT="${XHS_PORT:-8000}"

echo "[screen]"
if command -v screen >/dev/null 2>&1; then
  screen_output="$(screen -ls 2>/dev/null || true)"
else
  screen_output=""
fi

if grep -q "$SESSION_NAME" <<<"$screen_output"; then
  grep "$SESSION_NAME" <<<"$screen_output"
else
  echo "$SESSION_NAME is not running"
fi

echo
echo "[health]"
if curl -fsS "http://$HOST:$PORT/api/health"; then
  echo
  echo "[ok] http://$HOST:$PORT"
else
  echo "[error] health check failed: http://$HOST:$PORT/api/health"
  exit 1
fi

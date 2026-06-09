#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
SESSION_NAME="${XHS_SCREEN_SESSION:-xhs-all-in-one-dev}"
HOST="${XHS_HOST:-127.0.0.1}"
PORT="${XHS_PORT:-8000}"
PYTHON_BIN="${PYTHON_BIN:-$ROOT_DIR/.venv/bin/python}"
LOG_DIR="$ROOT_DIR/logs"
LOG_FILE="$LOG_DIR/screen-dev.log"

mkdir -p "$LOG_DIR"

if ! command -v screen >/dev/null 2>&1; then
  echo "[error] screen is required to run the dev server in background."
  exit 1
fi

if [[ ! -x "$PYTHON_BIN" ]]; then
  echo "[error] Python runtime not found: $PYTHON_BIN"
  echo "        Run ./start.sh once to bootstrap dependencies."
  exit 1
fi

if [[ "${SKIP_FRONTEND_BUILD:-0}" != "1" ]]; then
  echo "[build] frontend"
  (cd "$ROOT_DIR/frontend" && npm run build)
fi

"$ROOT_DIR/scripts/stop-dev.sh" >/dev/null 2>&1 || true

echo "[start] $SESSION_NAME -> http://$HOST:$PORT"
screen -dmS "$SESSION_NAME" zsh -lc \
  "cd '$ROOT_DIR' && '$PYTHON_BIN' main.py --host '$HOST' --port '$PORT' >> '$LOG_FILE' 2>&1"

for _ in {1..40}; do
  if curl -fsS "http://$HOST:$PORT/api/health" >/dev/null 2>&1; then
    echo "[ok] server is healthy: http://$HOST:$PORT"
    echo "[ok] workbench: http://$HOST:$PORT/platforms/xhs/fast-download"
    exit 0
  fi
  sleep 1
done

echo "[error] server did not become healthy in time. Recent log:"
tail -n 80 "$LOG_FILE" || true
exit 1

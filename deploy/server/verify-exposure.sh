#!/usr/bin/env bash
set -euo pipefail

HOST="${1:-47.87.68.74}"
PUBLIC_PORTS=(80 443)
PRIVATE_PORTS=(8000 8765 8787 5173)
failed=0

can_connect() {
  local host="$1"
  local port="$2"
  nc -G 3 -z "$host" "$port" >/dev/null 2>&1
}

for port in "${PUBLIC_PORTS[@]}"; do
  if can_connect "$HOST" "$port"; then
    printf 'ok: %s/tcp is reachable on %s\n' "$port" "$HOST"
  else
    printf 'warn: %s/tcp is not reachable on %s\n' "$port" "$HOST" >&2
  fi
done

for port in "${PRIVATE_PORTS[@]}"; do
  if can_connect "$HOST" "$port"; then
    printf 'fail: private port %s/tcp is publicly reachable on %s\n' "$port" "$HOST" >&2
    failed=1
  else
    printf 'ok: private port %s/tcp is not publicly reachable on %s\n' "$port" "$HOST"
  fi
done

exit "$failed"

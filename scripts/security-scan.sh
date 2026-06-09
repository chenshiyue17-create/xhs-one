#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$ROOT_DIR"

fail() {
  printf 'security-scan: %s\n' "$1" >&2
  exit 1
}

if git ls-files --error-unmatch .env >/dev/null 2>&1; then
  fail ".env is tracked. Move real secrets to the server environment and remove .env from git."
fi

tracked_sensitive_files="$(
  git ls-files \
    '*.pem' '*.key' '*.p12' '*.pfx' 'id_rsa*' 'id_ed25519*' \
    '*_token.txt' '*secret*.txt' '*password*.txt' \
    '.env.*' \
  | grep -v '^\.env\.example$' || true
)"
if [ -n "$tracked_sensitive_files" ]; then
  printf '%s\n' "$tracked_sensitive_files" >&2
  fail "sensitive-looking files are tracked."
fi

secret_matches="$(
  git grep -I -n -E \
    '(sk-[A-Za-z0-9_-]{16,}|AKIA[0-9A-Z]{16}|AIza[0-9A-Za-z_-]{35}|xox[baprs]-[0-9A-Za-z-]{10,}|gh[pousr]_[0-9A-Za-z_]{36,}|-----BEGIN (RSA |OPENSSH |EC |DSA |)PRIVATE KEY-----)' \
    -- \
    ':(exclude)static/**' \
    ':(exclude)frontend/dist/**' \
    ':(exclude)package-lock.json' \
    ':(exclude)**/*.min.js' || true
)"
if [ -n "$secret_matches" ]; then
  printf '%s\n' "$secret_matches" >&2
  fail "possible real secret found in tracked files."
fi

placeholder_matches="$(
  git grep -I -n -E \
    '(CHANGE_ME_VIA_ENV_VAR|PASTE_[A-Z0-9_]+_HERE|your-production-secret-key|your-fernet-key|your-mysql-password)' \
    -- \
    ':(exclude)scripts/security-scan.sh' \
    ':(exclude)README.md' \
    ':(exclude)docs/**' \
    ':(exclude)config/production.yaml' \
    ':(exclude)docker-compose.yml' || true
)"
if [ -n "$placeholder_matches" ]; then
  printf '%s\n' "$placeholder_matches" >&2
  fail "placeholder secret text found outside approved examples/docs."
fi

printf 'security-scan: ok\n'

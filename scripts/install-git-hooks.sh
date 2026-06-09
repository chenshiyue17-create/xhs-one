#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$ROOT_DIR"

git config core.hooksPath .githooks
chmod +x .githooks/pre-commit scripts/security-scan.sh
printf 'Git hooks installed: pre-commit now runs scripts/security-scan.sh\n'

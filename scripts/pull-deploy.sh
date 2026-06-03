#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
BRANCH="${DEPLOY_BRANCH:-main}"

cd "$ROOT_DIR"
mkdir -p logs output

if ! git rev-parse --is-inside-work-tree >/dev/null 2>&1; then
  echo "Current directory is not a Git repository: $ROOT_DIR"
  exit 1
fi

git fetch origin "$BRANCH"
git checkout "$BRANCH"
git pull --ff-only origin "$BRANCH"

npm install
npm run build
npm run dev:start
npm run dev:status

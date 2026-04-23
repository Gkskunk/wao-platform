#!/usr/bin/env bash
set -euo pipefail
cd "$CLAUDE_PROJECT_DIR"

BRANCH="$(git rev-parse --abbrev-ref HEAD 2>/dev/null || echo unknown)"
SHA="$(git rev-parse --short HEAD 2>/dev/null || echo unknown)"
DIRTY=""
git diff --quiet 2>/dev/null || DIRTY=" (dirty)"

cat <<MSG
[WAO repo state] branch=${BRANCH} sha=${SHA}${DIRTY} ts=$(date -u +%FT%TZ)
MSG

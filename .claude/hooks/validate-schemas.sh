#!/usr/bin/env bash
set -euo pipefail
cd "$CLAUDE_PROJECT_DIR"

# Only run when schemas changed in the last minute.
if git diff --name-only HEAD~1 HEAD 2>/dev/null | grep -qE '^schemas/' \
   || git diff --name-only 2>/dev/null | grep -qE '^schemas/'; then
  if ! pnpm -s schemas:validate; then
    echo "[WAO] Schema validation failed. Fix before continuing." >&2
    exit 2   # block further tool use until schemas are valid
  fi
fi
exit 0

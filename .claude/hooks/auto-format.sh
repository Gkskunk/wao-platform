#!/usr/bin/env bash
set -euo pipefail
cd "$CLAUDE_PROJECT_DIR"

# Format + lint anything staged or recently edited. Fail silently; don't block.
pnpm -s prettier --write --log-level warn . >/dev/null 2>&1 || true
pnpm -s eslint --fix --quiet . >/dev/null 2>&1 || true

# Light typecheck signal; not a blocker, just surfaces drift.
pnpm -s typecheck --incremental >/tmp/wao-typecheck.log 2>&1 || {
  echo "[WAO] typecheck reported issues — see /tmp/wao-typecheck.log" >&2
}
exit 0

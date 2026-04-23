#!/usr/bin/env bash
set -euo pipefail

COMMAND="${CLAUDE_TOOL_INPUT_command:-}"

if [[ -z "$COMMAND" ]]; then
  exit 0
fi

# 1. Destructive rm
if echo "$COMMAND" | grep -qE 'rm\s+(-[a-zA-Z]*f[a-zA-Z]*\s+|.*\s-rf\s+)(/|~|\.\.)'; then
  echo "Blocked: destructive rm against root/home/parent path." >&2
  exit 2
fi

# 2. Force push
if echo "$COMMAND" | grep -qE 'git\s+push\s+.*--force(\s|$)'; then
  echo "Blocked: force push — use --force-with-lease if absolutely needed." >&2
  exit 2
fi

# 3. Writes to .env files
if echo "$COMMAND" | grep -qE '(>|>>|tee)\s+\.?env(\.|[[:space:]]|$)'; then
  echo "Blocked: writing to .env* files is not allowed from tool calls." >&2
  exit 2
fi

# 4. Merging PRs without review
if echo "$COMMAND" | grep -qE 'gh\s+pr\s+merge'; then
  echo "Blocked: PR merges must be performed by a human operator." >&2
  exit 2
fi

exit 0

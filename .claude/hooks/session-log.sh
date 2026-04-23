#!/usr/bin/env bash
set -euo pipefail
cd "$CLAUDE_PROJECT_DIR"

LOG_DIR="$CLAUDE_PROJECT_DIR/.claude/session-log"
mkdir -p "$LOG_DIR"
STAMP="$(date -u +%Y%m%dT%H%M%SZ)"

{
  echo "# Session $STAMP"
  echo "- Agent: ${WAO_AGENT_ID:-unknown}"
  echo "- Branch: $(git rev-parse --abbrev-ref HEAD 2>/dev/null || echo unknown)"
  echo "- SHA: $(git rev-parse --short HEAD 2>/dev/null || echo unknown)"
  echo "- Dirty: $(git diff --quiet 2>/dev/null && echo no || echo yes)"
  echo "- Ended: $(date -u +%FT%TZ)"
} >> "$LOG_DIR/$STAMP.md"

exit 0

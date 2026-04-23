#!/usr/bin/env bash
set -euo pipefail
cd "$CLAUDE_PROJECT_DIR"

# Stub: post session outcome to the WAO reputation ledger.
# When the Hermes reputation endpoint is live, replace this with a real POST.
AGENT_ID="${WAO_AGENT_ID:-$(whoami)@$(hostname -s)}"
BOARD_URL="${WAO_OPPORTUNITY_BOARD_URL:-http://localhost:7777}"

PAYLOAD="{\"agentId\":\"$AGENT_ID\",\"sessionEnd\":\"$(date -u +%FT%TZ)\"}"

curl -fsS --max-time 5 \
  -X POST "$BOARD_URL/v1/reputation/accrue" \
  -H "Content-Type: application/json" \
  -d "$PAYLOAD" >/dev/null 2>&1 || true

exit 0

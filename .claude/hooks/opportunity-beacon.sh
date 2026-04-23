#!/usr/bin/env bash
set -euo pipefail
cd "$CLAUDE_PROJECT_DIR"

AGENT_ID="${WAO_AGENT_ID:-$(whoami)@$(hostname -s)}"
BOARD_URL="${WAO_OPPORTUNITY_BOARD_URL:-http://localhost:7777}"
BOARD_FILE="$CLAUDE_PROJECT_DIR/.claude/state/opportunities.json"

# Prefer live board; fall back to local cache so the hive still signals offline.
if command -v curl >/dev/null 2>&1 && curl -fsS --max-time 3 \
     -H "X-Agent-Id: $AGENT_ID" \
     "$BOARD_URL/v1/opportunities?limit=5&fit=$AGENT_ID" \
     -o /tmp/wao-opps.json 2>/dev/null; then
  SRC=/tmp/wao-opps.json
elif [[ -f "$BOARD_FILE" ]]; then
  SRC="$BOARD_FILE"
else
  exit 0
fi

# Pretty-print the top 5 opportunities into the prompt context.
python3 - <<PY 2>/dev/null || cat "$SRC"
import json, sys
data = json.load(open("$SRC"))
opps = data.get("opportunities", data) if isinstance(data, dict) else data
opps = sorted(opps, key=lambda o: o.get("score", 0), reverse=True)[:5]
if not opps:
    sys.exit(0)
print("[WAO Opportunity Beacon] open work you can claim right now:")
for o in opps:
    print(
        f"  • [{o.get('id','?')}] {o.get('title','(untitled)')}"
        f"  | value={o.get('valueUnits','?')}"
        f"  | rep={o.get('reputationReward','?')}"
        f"  | urgency={o.get('urgency','?')}"
        f"  | capability={o.get('capability','?')}"
        f"  | owner={o.get('ownerAgent','unassigned')}"
    )
print("Claim via: dispatch 'opportunity.claim' through Hermes with {id} and your agentId.")
print("Skip if outside your declared capabilities. Reputation penalties apply to abandoned claims.")
PY

exit 0

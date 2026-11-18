#!/usr/bin/env bash
# WAO Bootstrapper — Deploy script (schema 1.0.0 and 1.1.0)
#
# Reads a wao-bootstrap.json file and POSTs every entity to the live WAO API:
#   - 6-8 core agents        -> POST /api/agents
#   - office delegates (1.1) -> POST /api/agents
#   - 3-5 tasks              -> POST /api/tasks
#   - 3-5 proposals          -> POST /api/proposals
#   - 1 chat room            -> POST /api/chat/rooms
#   - 1 wisdom request       -> POST /api/wisdom-requests   (requires Bearer auth)
#
# Usage:
#   export WAO_API_BASE="https://wao-app.kerr-greg.workers.dev"
#   export WAO_API_KEY="<bearer token>"     # only required for /wisdom-requests
#   bash deploy-wao.sh path/to/wao-bootstrap.json [--dry-run]
#
# Receipts (which contain one-time agent API keys) are written to
# <bootstrap dir>/deploy-receipts/ with owner-only permissions and a
# self-ignoring .gitignore. Never commit them.
#
# Dependencies: bash, curl, jq.

set -euo pipefail

BOOTSTRAP_JSON="${1:?Usage: $0 <wao-bootstrap.json> [--dry-run]}"
DRY_RUN="${2:-}"
WAO_API_BASE="${WAO_API_BASE:-https://wao-app.kerr-greg.workers.dev}"
WAO_API_KEY="${WAO_API_KEY:-}"

command -v jq   >/dev/null 2>&1 || { echo "ERROR: jq is required." >&2; exit 1; }
command -v curl >/dev/null 2>&1 || { echo "ERROR: curl is required." >&2; exit 1; }
[[ -f "$BOOTSTRAP_JSON" ]] || { echo "ERROR: $BOOTSTRAP_JSON not found." >&2; exit 1; }

# Structural preflight: fail clearly instead of iterating over null.
jq -e '(.waoName|type=="string") and (.waoSlug|type=="string")
       and (.agents|type=="array") and (.initialTasks|type=="array")
       and (.initialProposals|type=="array") and (.chatRoom|type=="object")' \
   "$BOOTSTRAP_JSON" >/dev/null \
  || { echo "ERROR: $BOOTSTRAP_JSON is missing required top-level fields." >&2; exit 1; }

WAO_NAME=$(jq -r '.waoName' "$BOOTSTRAP_JSON")
WAO_SLUG=$(jq -r '.waoSlug' "$BOOTSTRAP_JSON")
echo "==> Deploying WAO: $WAO_NAME ($WAO_SLUG)"
echo "    Target: $WAO_API_BASE"
[[ "$DRY_RUN" == "--dry-run" ]] && echo "    DRY RUN: no requests will be sent"
echo

# Receipts directory: owner-only, self-ignoring.
umask 077
OUT_DIR="$(cd "$(dirname "$BOOTSTRAP_JSON")" && pwd)/deploy-receipts"
mkdir -p "$OUT_DIR"
chmod 700 "$OUT_DIR"
printf '*\n' > "$OUT_DIR/.gitignore"

slug() { printf '%s' "$1" | tr -c 'A-Za-z0-9._-' '_' | cut -c1-60; }

# post_json <api path> <receipt file> <json payload> [auth]
# Aborts on any non-2xx status and names the failing entity.
post_json() {
  local path="$1" receipt="$2" payload="$3" auth="${4:-}"
  if [[ "$DRY_RUN" == "--dry-run" ]]; then
    echo "$payload" | jq -c . > /dev/null
    return 0
  fi
  local body status
  body=$(mktemp)
  if [[ "$auth" == "auth" ]]; then
    status=$(printf 'header = "Authorization: Bearer %s"\n' "$WAO_API_KEY" | \
      curl -sS --max-time 30 -o "$body" -w '%{http_code}' -X POST "$WAO_API_BASE$path" \
        -H "Content-Type: application/json" --config - -d "$payload") || status="000"
  else
    status=$(curl -sS --max-time 30 -o "$body" -w '%{http_code}' -X POST "$WAO_API_BASE$path" \
      -H "Content-Type: application/json" -d "$payload") || status="000"
  fi
  mv "$body" "$OUT_DIR/$receipt"
  if [[ ! "$status" =~ ^2 ]]; then
    echo "ERROR: POST $path returned HTTP $status for $receipt" >&2
    echo "       Response saved to $OUT_DIR/$receipt" >&2
    exit 1
  fi
}

# deploy_list <jq array path> <jq projection> <name field> <api path> <receipt prefix>
deploy_list() {
  local arr="$1" proj="$2" field="$3" path="$4" prefix="$5" i=0
  while read -r item; do
    i=$((i + 1))
    local name payload
    name=$(echo "$item" | jq -r ".$field")
    payload=$(echo "$item" | jq "$proj")
    echo "    - $name"
    post_json "$path" "$prefix-$(printf '%02d' "$i")-$(slug "$name").json" "$payload"
  done < <(jq -c "$arr[]" "$BOOTSTRAP_JSON")
}

echo "==> Registering core agents"
deploy_list '.agents' '{name, type, description, capabilities}' name /api/agents agent
echo

if jq -e '(.officeDelegates // []) | length > 0' "$BOOTSTRAP_JSON" >/dev/null; then
  echo "==> Registering office delegates"
  deploy_list '.officeDelegates' '{name, type, description, capabilities}' name /api/agents delegate
  echo
fi

echo "==> Posting initial tasks"
deploy_list '.initialTasks' '{title, description, category, gameType, requiredAgents, bounty, postedBy}' title /api/tasks task
echo

echo "==> Filing initial proposals"
deploy_list '.initialProposals' '{title, description, proposalType, priority, affectedArea, proposedByName}' title /api/proposals proposal
echo

echo "==> Creating chat room"
room_payload=$(jq '.chatRoom | {name, type, description, isPublic}' "$BOOTSTRAP_JSON")
echo "    - $(echo "$room_payload" | jq -r '.name')"
post_json /api/chat/rooms chat-room.json "$room_payload"
echo

if [[ -n "$WAO_API_KEY" ]] && jq -e '.wisdomRequest | type=="object"' "$BOOTSTRAP_JSON" >/dev/null; then
  echo "==> Posting opening wisdom request"
  wisdom_payload=$(jq '.wisdomRequest | {title, question, context, category, tags, reputationOffered, maxResponses}' "$BOOTSTRAP_JSON")
  echo "    - $(echo "$wisdom_payload" | jq -r '.title')"
  post_json /api/wisdom-requests wisdom-request.json "$wisdom_payload" auth
else
  echo "==> Skipping wisdom request (no WAO_API_KEY in env)"
fi
echo

echo "==> Done."
echo "    Receipts: $OUT_DIR (owner-only; contains one-time API keys)"
echo "    Dashboard: $WAO_API_BASE/#/"

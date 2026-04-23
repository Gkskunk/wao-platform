#!/usr/bin/env bash
set -euo pipefail

NAME="${1:?kebab-case name required}"
KIND="${2:?kind required (task|result|event|error)}"
OWNER="${3:?owner agent required}"
VERSION="${4:-v1}"

ROOT="$(git rev-parse --show-toplevel)"
SCHEMA_DIR="$ROOT/schemas/$NAME"
FIX_VALID="$SCHEMA_DIR/fixtures/valid"
FIX_INVALID="$SCHEMA_DIR/fixtures/invalid"
TYPES_DIR="$ROOT/packages/schemas/src"
PROTO_DIR="$ROOT/protocols/messages"

mkdir -p "$SCHEMA_DIR" "$FIX_VALID" "$FIX_INVALID" "$TYPES_DIR" "$PROTO_DIR"

SCHEMA_FILE="$SCHEMA_DIR/$VERSION.schema.json"
if [[ -e "$SCHEMA_FILE" ]]; then
  echo "refusing to overwrite $SCHEMA_FILE" >&2
  exit 1
fi

cat > "$SCHEMA_FILE" <<JSON
{
  "\$schema": "https://json-schema.org/draft/2020-12/schema",
  "\$id": "https://wao.dev/schemas/$NAME/$VERSION.json",
  "title": "TODO: Title Case of $NAME",
  "description": "TODO: one-line purpose.",
  "type": "object",
  "additionalProperties": false,
  "required": [],
  "properties": {}
}
JSON

cat > "$FIX_VALID/basic.json" <<JSON
{
  "_note": "TODO: replace with a realistic valid payload for $NAME $VERSION"
}
JSON

cat > "$FIX_INVALID/missing-required.json" <<JSON
{
  "_note": "TODO: construct a payload that fails for a single documented reason"
}
JSON

cat > "$TYPES_DIR/$NAME.ts" <<TS
// Auto-generated placeholder for $NAME $VERSION.
// Run \`pnpm schemas:types\` to regenerate from JSON Schema.
export type ${NAME//-/_}_${VERSION} = unknown;
TS

cat > "$PROTO_DIR/$NAME.md" <<MD
# $NAME ($KIND, owner: $OWNER)

## Purpose
TODO.

## Current version
$VERSION → \`schemas/$NAME/$VERSION.schema.json\`

## Payload
TODO: describe fields and invariants.

## Lifecycle
TODO: who emits, who consumes, correlation rules.

## Change log
- $VERSION: initial.
MD

echo "Scaffolded $NAME $VERSION at:"
echo " - $SCHEMA_FILE"
echo " - $FIX_VALID/basic.json"
echo " - $FIX_INVALID/missing-required.json"
echo " - $TYPES_DIR/$NAME.ts"
echo " - $PROTO_DIR/$NAME.md"

---
name: schema-new
description: Scaffolds a new WAO agent message schema with envelope binding, valid/invalid fixtures, generated TypeScript types, and protocol doc stub. Use when the user asks to add a new agent message type, new capability payload, or new inter-agent artifact schema. Triggers include "new schema", "add message type", "new capability", "schema for <X>", "scaffold envelope payload".
allowed-tools: Read, Write, Edit, Bash, Grep, Glob
model: sonnet
---

# schema-new

Creates a complete, WAO-compliant schema scaffold in one step.

## When to use
- User wants a new inter-agent message type (task, result, event, error).
- User wants a new capability payload referenced by the envelope.
- User wants a new artifact schema produced by OpenClaw.

## Inputs to collect (ask once, concisely)
1. **Name** (kebab-case, singular) — e.g., `web-fetch`, `stripe-refund`, `plan-approval`.
2. **Kind** — `task | result | event | error`.
3. **Owning agent** — which agent emits this (`nemoclaw`, `openclaw`, `hermes`, or app name).
4. **Version** — default `v1` unless the user says otherwise.
5. **One-line purpose** for the `description` field.
6. **Payload fields** — list of `name: type (required|optional)` pairs; keep it tight.

If any input is missing, ask for just that one thing — don't re-ask the whole list.

## Procedure
1. Read `@references/conventions.md` for the house rules and naming invariants.
2. Read `@schemas/envelope.schema.json` to confirm envelope shape.
3. Run `scripts/scaffold.sh <name> <kind> <owner> <version>` to create the files.
   The script will create:
   - `schemas/<name>/<version>.schema.json`
   - `schemas/<name>/fixtures/valid/basic.json`
   - `schemas/<name>/fixtures/invalid/missing-required.json`
   - `packages/schemas/src/<name>.ts` (generated types placeholder)
   - `protocols/messages/<name>.md` (spec stub)
4. Fill the placeholder fields in the schema using the user's payload list and the
   rules in `@references/conventions.md` (strict object, `additionalProperties: false`,
   explicit `required`, `format` on uuid/date).
5. Generate types: `pnpm schemas:types` (or whatever the repo uses).
6. Validate: `pnpm schemas:validate`.
7. Add the new entry to `/protocols/index.md` (append row).
8. Print a concise diff summary and a suggested commit message:
   `feat(schemas): add <name> <version> (<kind>)`.

## Success criteria
- `pnpm schemas:validate` passes.
- Both valid and invalid fixtures exist, and the invalid fixture fails for the *documented* reason.
- `packages/schemas/src/<name>.ts` compiles under `pnpm typecheck`.
- `protocols/messages/<name>.md` exists with filled sections, not placeholders.
- `schema-auditor` subagent returns APPROVE if run against the diff.

## Do / Don't
- Do: use `additionalProperties: false` on every object type.
- Do: prefer enums over free-form strings for finite sets.
- Don't: edit an existing `vN` schema to add/remove `required` — bump to `vN+1` instead.
- Don't: skip the invalid fixture. The auditor will block.

## References (load only if needed)
- `@references/conventions.md` — naming, versioning, required fields, format rules.
- `@references/envelope-binding.md` — how payload schemas bind to the envelope.
- `@references/examples.md` — 3 worked examples (task, result, event).

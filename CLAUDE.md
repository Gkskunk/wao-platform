# WAO — CLAUDE.md

> This file is the authoritative guide for Claude Code working in this repository.
> Read it fully before taking any action. Architectural changes require an ADR in `/docs/adrs`.

## Repository overview

WAO (Wise Autonomous Organization) is a multi-agent system. All inter-agent traffic
flows through **Hermes**. **NemoClaw** plans. **OpenClaw** executes. **Evervolve** is
the operating layer — it runs, observes, and evolves the agents. See
[`docs/ARCHITECTURE.md`](docs/ARCHITECTURE.md) for the full system map.

## Core invariants (never violate these)

- **No direct agent-to-agent calls.** All inter-agent messages go through Hermes.
- **Schema-backed I/O.** Every payload crossing an agent boundary validates against a
  schema in `/schemas`. No free-form JSON.
- **Evervolve must plug into WAO.** Every Evervolve surface must expose or consume a
  WAO agent interface. See [`docs/evervolve-alignment.md`](docs/evervolve-alignment.md).
- **No secrets in code.** No tokens, private keys, or secrets in source, URLs, or logs.
- **No new runtimes or heavy deps** without an ADR in `/docs/adrs`.
- **TypeScript strict.** No `any` without a `// why:` comment. Named exports only
  (except Next.js page/layout files).
- **Tests ship with code.** New packages/services require Vitest tests. New schemas
  require positive + negative fixtures.

## Claude Code workflow rules

### Before every push / PR

1. Run the **`code-reviewer`** subagent on all staged changes.
   Invoke it before `/commit-push-pr` on every feature and whenever non-trivial code
   was written in the main session.
   - A `REQUEST CHANGES` verdict is a hard block; fix before pushing.

### On any change to `/schemas` or `/protocols`

2. Run the **`schema-auditor`** subagent.
   It checks envelope compliance, fixture coverage, and versioning discipline.
   - Breaking schema changes require a new `vN+1` file; never silently edit an existing version.

### On any PR touching `/apps/*`

3. Run the **`evervolve-alignment-checker`** subagent.
   It enforces the Evervolve ↔ WAO alignment charter.
   - A "side app" (feature that neither exposes nor consumes a WAO agent interface) is a
     blocking issue, not a style nit.
   - Exceptions require an ADR in `/docs/adrs`.

### When starting a new feature or onboarding

4. Run the **`repo-explorer`** subagent first.
   It produces a structured map of the codebase without polluting the main context.
   Use it to orient before writing any code.

## Subagents

| Name | File | When to use |
|---|---|---|
| `code-reviewer` | `.claude/agents/code-reviewer.md` | Before every push; after non-trivial code |
| `schema-auditor` | `.claude/agents/schema-auditor.md` | Any change to `/schemas` or `/protocols` |
| `evervolve-alignment-checker` | `.claude/agents/evervolve-alignment-checker.md` | Any PR touching `/apps/*` |
| `repo-explorer` | `.claude/agents/repo-explorer.md` | New feature start; onboarding |

## Key docs

| Document | Purpose |
|---|---|
| [`docs/ARCHITECTURE.md`](docs/ARCHITECTURE.md) | System map and component responsibilities |
| [`docs/wao-charter.md`](docs/wao-charter.md) | Constitution: principles, roles, amendment rules |
| [`docs/agent-protocol.md`](docs/agent-protocol.md) | Envelope spec, delivery semantics, versioning |
| [`docs/evervolve-alignment.md`](docs/evervolve-alignment.md) | Evervolve ↔ WAO alignment rules |
| `docs/adrs/` | Architecture Decision Records — required for exceptions and breaking changes |

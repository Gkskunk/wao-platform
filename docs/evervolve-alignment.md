# Evervolve ↔ WAO Alignment

> Status: Stub. This doc exists to prevent Evervolve from drifting into "side apps."

## Rule of alignment
Every Evervolve feature MUST either:
- **Expose** a WAO agent interface (register capability with Hermes), OR
- **Consume** a WAO agent interface (dispatch tasks via Hermes),
- Ideally both.

If a proposed feature does neither, it does not belong in Evervolve. Either
reshape it to plug into WAO, or don't build it here.

## Concrete requirements
1. New Evervolve surface → register with Hermes on startup, declare capabilities
   in `/agents/<surface>/agent.json`.
2. User-facing automation → reachable as a WAO task (not only a UI click).
3. Telemetry from Evervolve → flows into `packages/agent-core/memory` so agents
   learn from real usage.
4. Auth → Evervolve uses WAO identity; no parallel user systems.
5. Artifacts produced in Evervolve → stored via the standard object-store path
   and referenced by signed envelopes, same as OpenClaw outputs.

## Anti-patterns (flag in review)
- Evervolve calling a third-party API directly when an OpenClaw capability exists.
- Evervolve maintaining its own task queue instead of using Hermes.
- "Demo-only" Evervolve pages that never register with Hermes.
- Evervolve writing free-form JSON to shared storage without a schema.

## Review hook
The `code-reviewer` subagent checks these rules on every PR touching `/apps/*`.
Violations are blocking unless an ADR justifies the exception.

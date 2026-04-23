# WAO Charter

> Status: Stub. This is the constitution of the organization. Change it deliberately.

## Purpose
WAO — Wise Autonomous Organization — is an autonomous, multi-agent organization
designed to be coordinated, auditable, and self-improving.

## Principles
1. **Coordination over cleverness.** Agents cooperate through explicit protocols,
   not implicit tricks.
2. **Auditability by default.** Every significant action produces a structured,
   signed artifact. If it isn't logged, it didn't happen.
3. **Schema-backed communication.** Agents speak in validated JSON, not prose.
4. **Least privilege.** Agents declare capabilities; Hermes enforces them.
5. **Human-in-the-loop where it matters.** Irreversible, external, or high-risk
   actions require human confirmation.
6. **Self-improvement with memory.** Agents learn from outcomes via
   `agent-core/memory`. Lessons become rules, rules become code.
7. **Evervolve is the operating layer.** Evervolve does not compete with WAO;
   it runs, observes, and evolves it.

## Roles
- **NemoClaw** — planner / strategist.
- **OpenClaw** — executor.
- **Hermes** — messenger / router / capability registry.
- **Human operator** — sets goals, approves high-risk actions, owns the charter.

## Amendments
- Charter changes require an ADR in `/docs/adrs` and a PR review.
- Breaking protocol changes require a version bump in `/protocols`.

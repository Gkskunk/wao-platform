# WAO Architecture

> Status: Stub. Expand as the system evolves. Claude Code may propose additions;
> architectural changes require an ADR in `/docs/adrs`.

## High-level shape
WAO is a multi-agent organization. A small number of long-lived agents coordinate
through a message bus owned by Hermes. Evervolve is the operating layer that
observes, runs, and evolves those agents.

```
[Evervolve surfaces] ──▶ [Hermes bus] ──▶ [NemoClaw planner]
        ▲                      │
        │                      ▼
        └──────── [OpenClaw executors] ──▶ tools, APIs, storage
```

## Core components
- **Hermes** (`/services/hermes`): message router, signing, delivery guarantees,
  capability registry. All inter-agent traffic flows through here.
- **NemoClaw** (`/services/nemoclaw`): planner. Decomposes goals into tasks and
  dispatches them via Hermes.
- **OpenClaw** (`/services/openclaw`): executors. Run tools, write artifacts,
  emit structured results.
- **agent-core** (`/packages/agent-core`): shared primitives — envelope, memory,
  telemetry, testing harness, in-memory bus.
- **schemas** (`/schemas`): JSON Schemas for every message type and artifact.
- **protocols** (`/protocols`): WAO governance, tasking, voting, memory specs.
- **Evervolve apps** (`/apps/*`): user-facing surfaces. Must register with Hermes.

## Data stores
- Postgres (Drizzle) — durable state, audit log.
- Redis — message bus transport + ephemeral coordination.
- Object store (S3-compatible) — artifacts produced by OpenClaw.

## Non-goals
- Direct agent-to-agent calls bypassing Hermes.
- Free-form JSON between agents.
- Evervolve features that don't plug into WAO.

## Open questions
- Governance of schema evolution (see `/protocols/schema-evolution.md` — TODO).
- Cross-organization federation of Hermes buses (future).

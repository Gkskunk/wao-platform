# WAO Agent Protocol

> Status: Stub. Authoritative spec for how agents talk. Keep short and precise.

## Envelope
All inter-agent messages are JSON envelopes validated against
`@schemas/envelope.schema.json`.

```json
{
  "id": "uuid",
  "ts": "ISO-8601",
  "from": { "agent": "nemoclaw", "instance": "..." },
  "to":   { "agent": "openclaw", "capability": "web.fetch" },
  "kind": "task | result | event | error",
  "corrId": "uuid (ties task to result)",
  "payload": { "...schema-specific..." },
  "sig": "ed25519 signature over canonical JSON"
}
```

## Rules
- Every message MUST validate against a schema in `/schemas`.
- Every task MUST have a `corrId`; every result MUST echo it.
- Direct agent-to-agent calls bypassing Hermes are forbidden.
- Unknown `kind` or schema → reject with an `error` envelope; never silently drop.

## Capabilities
- Agents declare capabilities in `/agents/<name>/agent.json`.
- Hermes enforces capability checks before delivery.
- Adding a new capability requires: schema in `/schemas`, fixtures, and a note here.

## Delivery semantics
- At-least-once delivery. Consumers MUST be idempotent on `corrId`.
- Ordering is not guaranteed across agents; within a `corrId`, order is preserved.

## Versioning
- Envelope version pinned in schema. Breaking changes bump major.
- Payload schemas are versioned per message type in `/schemas/<type>/vN.schema.json`.

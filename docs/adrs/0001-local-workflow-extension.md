pyenv: cannot rehash: /Users/gregkerr/.pyenv/shims isn't writable
# ADR 0001 — Local workflow extension

Status: implemented locally; production rollout not authorized.

The current Express/SQLite application and all existing feature routes remain. A shared local module under `packages/wao-core` supplies the new Workflow Studio and the Telcoin companion workflow. This is an extension of the existing architecture, with NemoClaw planning, Hermes coordination, and OpenClaw contribution roles.

The MVP uses labeled deterministic mock planner, executor, and MCP adapters. No external agent activation, deployment, message, signing, or financial operation is performed. Local audit signatures do not represent external MCP attestations.

The workflow requires owner authorization of a task revision, contributor evidence, an independent human reviewer, and owner acceptance of the exact evidence hash. Revisions invalidate authorization and reviews. Mock artifacts do not earn reputation or become verified lessons.

User identity is derived from local cookie sessions or existing agent API-key authentication. Browser-supplied actor IDs no longer select proposal authors, voters, or chat senders. Private chat-room reads and WebSocket room joins enforce room visibility.

Risk: medium. Shared-module packaging, native SQLite toolchain compatibility, and identity bridging require testing before any later deployment. Existing seeded scenarios remain labeled local examples. The previous frontend preview baseline is preserved in Git for rollback.

Production hosting, live model providers, MCP service credentials, cross-device identity, and any change to external authority require a separate, reviewable deployment decision.

---
status: canonical
last_reviewed: 2026-05-23
source_of_truth: root-docs
confidence: medium
---

# WhatTax Claude Instructions

Use [AGENTS.md](./AGENTS.md) as the canonical root map and behavior contract.
This file exists for Claude-compatible tooling and MUST stay aligned with
`AGENTS.md`.

## Non-Negotiable Engineering Rules

- Read the relevant docs and current files before editing.
- MUST use Effect-native primitives and platform APIs when they fit:
  `Data`, `Schema`, `Array`, `Chunk`, `HashSet`, `HashMap`, `Match`,
  `Context`, `Layer`, `Config`, `Service`, `Record`, `Result`, `Exit`, `Bun`,
  `Platform`, `Command` and `ManagedRuntime`.
- MUST use `Option`, `Match` and schema-owned optional fields for optional
  request and response policy. Do not use raw `undefined` branching,
  conditional object-spread response shaping or jurisdiction-specific defaults
  such as `payload.jurisdiction ?? "AU"` unless an owning schema explicitly
  defines that default.
- MUST use pipe-first composition for calculator transformations and Effect
  pipelines when data flow is clearer left-to-right. Do not hide flow inside
  nested wrapper calls when a pipeline makes ownership and sequencing clearer.
- MUST reuse canonical schemas, schema-derived types, branded ids, service
  tags, tagged errors and constructors from the owning package. Do not create
  local DTO mirrors or redeclare canonical fields such as `id: string` outside
  the owning schema/type source.
- MUST keep one-off Effect error handling and transformations inline at the
  callsite; do not extract tiny mapper or wrapper helpers for single-use
  `Effect.mapError`, `Effect.catchTag`, `Effect.catchAll` or
  `Effect.catchAllDefect`.
- Verify with `bun run verification` when docs, package wiring or code changes
  can affect the repo.
- For package-facing work, add or update a Changeset before committing. Use
  `bun run changeset` to record the change and `bun run version-repo` only when
  intentionally applying pending release-train versions and changelogs.

Start deeper work at:

- [Effect services](./docs/architecture/effect-services.md)
- [Configuration](./docs/architecture/configuration.md)
- [Package ownership](./docs/architecture/package-ownership.md)
- [Code patterns](./docs/standards/code-patterns.md)

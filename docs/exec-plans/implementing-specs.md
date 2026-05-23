---
status: canonical
last_reviewed: 2026-05-23
source_of_truth: docs
confidence: medium
---

# Implementing Specs

Implement specs in small, verifiable slices.

## Flow

1. Read the target spec and task list.
2. Audit current code and docs before editing.
3. Implement the smallest useful slice.
4. Run the task's mandatory verification, including `bun run verification`
   unless the task explicitly documents a narrower gate.
5. Record validation evidence in the active exec plan when one exists.
6. Commit only after the coherent slice passes verification.

## Guardrails

- Keep implementation aligned with package ownership docs.
- MUST use Effect-native primitives and platform APIs when they fit:
  `Data`, `Schema`, `Array`, `Chunk`, `HashSet`, `HashMap`, `Match`,
  `Context`, `Layer`, `Config`, `Service`, `Record`, `Result`, `Exit`, `Bun`,
  `Platform`, `Command` and `ManagedRuntime`.
- MUST reuse canonical schemas, schema-derived types, branded ids, service
  tags, tagged errors and constructors from the owning package. Do not create
  mirrored DTOs or redeclare canonical fields such as `id: string` outside the
  owning schema/type source.
- MUST keep one-off Effect error handling and transformations inline at the
  callsite.
- Do not defer `bun run verification` or task-specific checks to the final
  slice.
- Keep public docs neutral to downstream private products.

## Mandatory Subagent Contract

Use this prompt block when delegating a task-list slice to a subagent:

```md
You are implementing exactly one task from the WhatTax spec/task list.

Before editing:
- Read the target spec, this task object, relevant current files, and the relevant docs in `docs/architecture/*`.
- Identify the owning package for every schema, type, ID, service, layer and tagged error you touch.

Implementation rules:
- MUST use Effect-native primitives when they fit: `Data`, `Schema`, `Array`, `Chunk`, `HashSet`, `HashMap`, `Match`, `Context`, `Layer`, `Config`, `Service`, `Record`, `Result`, `Exit`, `Bun`, `Platform`, `Command` and `ManagedRuntime`.
- Do not fall back to plain TypeScript control flow, nullable values, mutable records, mutable arrays, `switch`, `Object.values`, `Object.entries`, ad hoc `_tag` objects, unsafe casts, stringly branching, custom env parsing or hand-rolled runtime wrappers when an Effect/schema/platform primitive fits.
- Reuse canonical schema-derived types, branded IDs, tagged errors, service contracts and constructors from the owning package.
- Do not create mirrored DTOs, local duplicate types, local duplicate schemas or transport-only shape copies when an owning schema or API/SDK contract already exists.
- Keep one-off Effect error handling and transformations inline at the callsite. Do not extract tiny mapper/wrapper helpers for single-use `Effect.mapError`, `Effect.catchTag`, `Effect.catchAll` or `Effect.catchAllDefect`.
- Browser/runtime code must consume browser-safe API/SDK exports instead of importing server-only internals.

Verification and handoff:
- Run this task's mandatory verification gates, including `bun run verification` unless the task explicitly documents a narrower gate.
- Report changed files, verification commands, outcomes and residual risks.
- Do not start or delegate another task. The parent agent must review, audit, verify and explicitly accept this task before the next task begins.
```

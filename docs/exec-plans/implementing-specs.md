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
4. Verify that any spec call-graph diagrams still match the implementation, or
   update the spec/docs with the final graph.
5. Run the task's mandatory verification, including `bun run verification`
   unless the task explicitly documents a narrower gate.
6. Add or update a Changeset for package-facing changes, or record why the
   slice is not package-facing.
7. Record validation and versioning evidence in the active exec plan when one
   exists.
8. Commit only after the coherent slice passes verification and the Changeset
   decision is reviewed.

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
- Do not defer Changesets to the final slice for package-facing work. Each
  coherent package-facing slice must include a changeset before commit, unless
  the user explicitly asks to batch changesets.
- Do not run `bun run version-repo` during normal implementation unless the user
  explicitly asks to version the repo. Versioning consumes pending Changesets
  into package versions and changelogs and should be a deliberate release-prep
  slice.
- Keep public docs neutral to downstream private products.
- Runtime, API, SDK, frontend and package-boundary changes must leave the
  relevant spec/architecture call graphs accurate.

## Mandatory Subagent Contract

Use this prompt block when delegating a task-list slice to a subagent:

```md
You are implementing exactly one task from the WhatTax spec/task list.

Before editing:
- Read the target spec, this task object, relevant current files, and the relevant docs in `docs/architecture/*`.
- Identify the owning package for every schema, type, ID, service, layer and tagged error you touch.
- Review the spec's call-graph diagrams before editing, and update/report them if implementation discovers a different final graph.

Implementation rules:
- MUST use Effect-native primitives when they fit: `Data`, `Schema`, `Array`, `Chunk`, `HashSet`, `HashMap`, `Match`, `Context`, `Layer`, `Config`, `Service`, `Record`, `Result`, `Exit`, `Bun`, `Platform`, `Command` and `ManagedRuntime`.
- Do not fall back to plain TypeScript control flow, nullable values, mutable records, mutable arrays, `switch`, `Object.values`, `Object.entries`, ad hoc `_tag` objects, unsafe casts, stringly branching, custom env parsing or hand-rolled runtime wrappers when an Effect/schema/platform primitive fits.
- Reuse canonical schema-derived types, branded IDs, tagged errors, service contracts and constructors from the owning package.
- Do not create mirrored DTOs, local duplicate types, local duplicate schemas or transport-only shape copies when an owning schema or API/SDK contract already exists.
- Keep one-off Effect error handling and transformations inline at the callsite. Do not extract tiny mapper/wrapper helpers for single-use `Effect.mapError`, `Effect.catchTag`, `Effect.catchAll` or `Effect.catchAllDefect`.
- Browser/runtime code must consume browser-safe API/SDK exports instead of importing server-only internals.
- Package-facing changes MUST add or update a Changeset with `bun run changeset`, using a user-facing changelog summary. If the task is not package-facing, state that explicitly in the handoff.

Verification and handoff:
- Run this task's mandatory verification gates, including `bun run verification` unless the task explicitly documents a narrower gate.
- Report the Changeset path and release-train impact, or report why no Changeset was required.
- Report changed files, verification commands, outcomes and residual risks.
- Report whether the final implementation still matches the spec's call graph.
- Do not start or delegate another task. The parent agent must review, audit, verify and explicitly accept this task before the next task begins.
```

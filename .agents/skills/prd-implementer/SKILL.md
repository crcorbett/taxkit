---
name: prd-implementer
description: "Thin router for implementing specs and plans in WhatTax. Use when executing a SPEC or plan so work follows the canonical iterative rollout and verification flow."
---

# PRD Implementer

This skill is intentionally thin. It routes implementation work into the canonical execution docs instead of embedding another rollout framework inside the skill.

## Start Here

Read in this order:

1. the target spec
2. the sibling task list when the spec has one
3. `docs/exec-plans/implementing-specs.md`
4. the relevant architecture docs for the touched packages

## Default Rules

- Implement in small, end-to-end slices.
- When a task list exists, implement it one task at a time with one sequential
  subagent per task.
- Create or set one comprehensive active goal before task-list execution. The
  goal must state that subagents implement tasks sequentially and that the
  parent agent reviews, audits, verifies, and accepts each task before
  delegating the next one.
- Start with a tracer bullet before broadening.
- Verify after each meaningful slice with `bun run verification`, plus targeted
  tests, browser checks, or runtime smoke tests where relevant.
- Keep the active execution plan current while code moves.
- Prefer compile-time safety, canonical schemas, and canonical typed errors from owning packages.
- MUST use Effect-native primitives and platform APIs when they fit:
  `Data`, `Schema`, `Array`, `Chunk`, `HashSet`, `HashMap`, `Match`,
  `Context`, `Layer`, `Config`, `Service`, `Record`, `Result`, `Exit`, `Bun`,
  `Platform`, `Command` and `ManagedRuntime`.
- MUST reuse canonical schemas, schema-derived types, branded IDs, service
  tags, tagged errors and constructors from owning packages. Do not create
  mirrored DTOs or redeclare canonical fields such as `id: string` outside the
  owning schema/type source.
- Use mock layers for external providers in automated tests unless the task
  explicitly calls for a live integration test.

## Task-List Delegation Loop

For each task:

1. Delegate exactly that task to a subagent with the task object, spec,
   task-list path, relevant files, and architecture docs.
2. Tell the subagent to edit files directly, run the task's verification gates,
   and report changed files plus evidence.
3. Review the subagent diff, run any needed local verification, and audit the
   work against the spec, task, and architecture docs.
4. Send the task back to the same subagent if the slice is incomplete or below
   the quality bar.
5. Mark the task complete only after the parent agent is satisfied.
6. Commit the coherent slice when `commitAfterPassing` requires it.
7. Delegate the next task only after the current task is accepted.

Default to serial delegation. Do not parallelize task-list implementation unless
the task list explicitly says the tasks are independent and write scopes are
disjoint.

## Review Bar

Before accepting a task, audit for:

- no helper sprawl
- canonical type/schema/id/error reuse
- strict Effect service/layer patterns
- Effect primitives where they fit: `Array`, `Option`, `Chunk`, `HashMap`,
  `HashSet`, `Match`, `Schema`, tagged errors, and services
- no `Object.values`, `Object.entries`, `switch`, unsafe casts, local DTO
  mirrors, or stringly branching when an Effect/schema-owned approach fits
- browser code consumes browser-safe API/SDK exports
- package-local README and architecture docs stay aligned when ownership moves

## Subagent Prompt Block

Use this block when delegating each task-list slice:

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

## Verification Baseline

After each task-list slice, run the task's mandatory verification. By default,
that includes:

1. `bun run verification`
2. targeted tests or smoke checks named by the task
3. browser/runtime verification for user-facing flows
4. architecture or import audits when boundaries move

Do not defer verification until the end of the rollout.

## Common References

- `docs/exec-plans/implementing-specs.md`
- `docs/product-specs/writing-task-lists.md`
- `docs/product-specs/writing-specs.md`
- `docs/architecture/effect-services.md`
- `docs/architecture/package-ownership.md`
- `docs/architecture/api-and-sdk.md`
- `docs/architecture/frontend.md`

## Notes

- Use old or imported planning material only as background.
- Do not turn a spec into a giant one-pass implementation.
- Record uncertainty and deferred debt explicitly in the active plan.

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

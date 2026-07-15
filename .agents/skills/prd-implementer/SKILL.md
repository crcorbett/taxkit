---
name: prd-implementer
description: "Thin router for implementing specs and plans in TaxKit. Use when executing a SPEC or plan so work follows the canonical iterative rollout and verification flow."
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
  delegating the next one. It must also state that the parent stops for replan
  or user decision after the third failed correction turn for the same task.
- Start with a tracer bullet before broadening.
- Verify after each meaningful slice with `bun run verification`, plus targeted
  tests, browser checks, or runtime smoke tests where relevant.
- Add or update a Changeset for every package-facing slice before committing.
  If a slice is docs-only, app-internal, or otherwise not package-facing, record
  that reason in the handoff.
- Keep the active execution plan current while code moves.
- Review the target spec's call-graph diagrams before editing and report
  whether the final implementation still matches them.
- Prefer compile-time safety, canonical schemas, and canonical typed errors from owning packages.
- Prefer meaningful linear Effect control flow for primary operations. Use
  pipe-first composition when it makes data flow clearer, and use
  `Effect.gen` when step-by-step sequencing is the clearer expression. Keep
  typed error handling in the following `.pipe(...)` with `Effect.catchTag`,
  `Effect.catchTags` or `Effect.mapError`.
- Avoid wrapper/helper sprawl. A helper must be reused, name a real boundary or
  domain concept, or be materially clearer than inline code; one-line wrappers
  and tiny property readers are a smell.
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
5. Count each parent review that sends corrections back as an audit turn.
6. Stop after the third failed correction turn for the same task, record the
   blocker and replan or ask for a decision.
7. Mark the task complete only after the parent agent is satisfied.
8. Commit the coherent slice when `commitAfterPassing` requires it.
9. Delegate the next task only after the current task is accepted.

Default to serial delegation. Do not parallelize task-list implementation unless
the task list explicitly says the tasks are independent and write scopes are
disjoint.

## Review Bar

Before accepting a task, audit for:

- no helper sprawl
- canonical type/schema/id/error reuse
- strict Effect service/layer patterns
- meaningful linear Effect control flow with typed errors handled in the
  following `.pipe(...)`
- Effect primitives where they fit: `Array`, `Option`, `Chunk`, `HashMap`,
  `HashSet`, `Match`, `Schema`, tagged errors, and services
- no `Object.values`, `Object.entries`, `switch`, unsafe casts, local DTO
  mirrors, or stringly branching when an Effect/schema-owned approach fits
- no trivial wrappers/helpers; every new helper is either reused, names a real
  boundary/domain concept, or is longer than a few meaningful lines because it
  genuinely clarifies the operation
- browser code consumes browser-safe API/SDK exports
- package-local README and architecture docs stay aligned when ownership moves
- runtime/package call graphs in the spec still match the implementation, or
  the spec/docs were updated with the final graph
- at least three documented improvement audit passes for substantial code,
  API, SDK, app, package-boundary or docs-runtime work

## Subagent Prompt Block

Use this block when delegating each task-list slice:

```md
You are implementing exactly one task from the TaxKit spec/task list.

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
- Run task-specific tests, smoke checks, browser checks or architecture audits required by the task's blast radius.
- For substantial code, API, SDK, app, package-boundary or docs-runtime work, run and document at least three implementation improvement audit passes before handoff.
- Audit the diff for helper sprawl, canonical type/schema/id/error reuse, unsafe casts, local DTO mirrors, stringly branching and browser-safe imports where relevant.
- Report the Changeset path and release-train impact, or report why no Changeset was required.
- Report changed files, verification commands, outcomes and residual risks.
- Report whether the final implementation still matches the spec's call graph.
- Do not start or delegate another task. The parent agent must review, audit, verify and explicitly accept this task before the next task begins.
```

## Verification Baseline

After each task-list slice, run the task's mandatory verification. Choose the
smallest verification set that proves the change, then broaden when the blast
radius justifies it. By default, that includes:

1. `bun run verification`
2. targeted tests or smoke checks named by the task
3. `bun run changeset` for package-facing changes, or an explicit no-changeset
   rationale for docs-only/app-internal work
4. browser/runtime verification for user-facing flows
5. architecture or import audits when boundaries move

Do not defer verification until the end of the rollout.

Use this verification ladder when a task list does not already define a more
specific gate:

| Change                           | Minimum verification                                                                        |
| -------------------------------- | ------------------------------------------------------------------------------------------- |
| docs-only                        | content/link/path review plus `bun run verification` when docs wiring or task plans changed |
| narrow type-level/backend change | owning package typecheck plus targeted tests                                                |
| runtime package change           | owning package typecheck, targeted tests and build                                          |
| cross-package flow               | package checks for each touched owner plus one end-to-end proof                             |
| user-facing UI or API behaviour  | package checks plus browser/runtime/API verification on the actual route                    |

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
- Do not continue after three failed parent audit turns on the same delegated
  task. Escalate with evidence and either re-scope the task or ask for a
  decision.

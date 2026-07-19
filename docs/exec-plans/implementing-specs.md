---
status: canonical
last_reviewed: 2026-07-18
source_of_truth: docs
confidence: high
---

# Implementing specs

Implement specs in small, verifiable slices.

## Flow

1. Read the target spec and task list.
2. Audit current code and docs before editing.
3. Update the SPEC, sibling task list and active plan immediately when that audit
   or implementation proves a missing requirement, changed graph or downstream
   artifact.
4. Implement the smallest useful slice.
5. Verify that any spec call-graph diagrams still match the implementation, or
   update the spec/docs with the final graph.
6. Run the task's mandatory verification, including `bun run verification`
   unless the task explicitly documents a narrower gate.
7. Add or update a Changeset for package-facing changes, or record why the
   slice is not package-facing.
8. Record validation and versioning evidence in the active exec plan when one
   exists.
9. Commit only after the coherent slice passes verification and the Changeset
   decision is reviewed.

Before acceptance, complete the SPEC/task path-evidenced `Change required`/`N/A`
ledger for canonical docs, relevant READMEs, lint/rules/fixtures/CI,
skills/AGENTS/metadata, config/manifests/schemas/generators/tests/ops, and
frontend/runtime surfaces. Implement each required row in the current task or
add a concrete dependent task.

## Task list execution protocol

When a spec has a sibling task list, execute it as a sequence of delegated
tasks. Do not start broad implementation locally.

Before implementation begins:

1. Create or set one comprehensive active goal with the goal tool available in
   the runtime.
2. The goal must explicitly say the task list will be implemented one task at a
   time.
3. The goal must explicitly say one subagent is used per task, sequentially.
4. The goal must explicitly say the parent agent owns review, audit,
   verification and final acceptance for each task before the next task is
   delegated.
5. The goal must explicitly say repeated parent audit failures stop the rollout
   for replan or user decision after the third failed correction turn.

Execution loop:

1. Delegate exactly one task-list task to a subagent.
2. Give the subagent the task object, the product spec, the task-list path and
   the relevant architecture docs or files to inspect.
3. Tell the subagent to edit files directly, run that task's
   `mandatoryVerification` and report changed files plus verification
   evidence.
4. Review the subagent's diff and verification evidence locally.
5. Run any additional targeted checks needed to trust the slice.
6. Audit the slice against the task, spec, architecture docs and repo
   conventions.
7. If anything is missing or below the bar, send the task back to the same
   subagent with concrete corrections.
8. Count that parent review as an audit turn whenever it produces corrections.
   Return to the same subagent for no more than three failed correction turns
   before stopping to record the blocker, update the active plan and ask for a
   decision or re-scope the task.
9. Mark the task complete only when the parent agent is satisfied that the task
   scope and verification gates are genuinely complete.
10. Commit the coherent slice when the task list requires
    `commitAfterPassing`.
11. Delegate the next task only after the current task is accepted.

Do not run multiple task-list implementation subagents in parallel unless the
task list explicitly says a task is independent and the write scopes are
disjoint. The default is strict serial execution.

## Parent review bar

The parent agent is accountable for implementation quality. Subagent
completion is only a proposal until reviewed.

Every accepted task must pass these audits where relevant:

- no helper sprawl or broad abstractions before a working slice justifies them
- canonical type, schema, id, error, service and layer reuse
- Effect-native service/layer wiring instead of passing services through
  ordinary function props
- meaningful linear Effect control flow, using pipe-first composition or
  `Effect.gen` where it best expresses the operation
- locally supported Effect v4 `Effect.fn` for meaningful named operation or
  tracing boundaries, not one-line wrappers
- typed errors handled at an owning boundary, usually in `.pipe(...)` with
  `Effect.catchTag`, `Effect.catchTags` or `Effect.mapError`
- Effect-native primitives where they fit: `Array`, `Option`, `Chunk`,
  `HashMap`, `HashSet`, `Match`, `Schema`, tagged errors and services
- no `Object.values`, `Object.entries`, `switch`, unsafe casts, local DTO
  mirrors or stringly branching when Effect primitives or schema-owned
  contracts can express the same logic
- browser/runtime code consumes browser-safe API/SDK exports instead of
  importing server-only internals
- package-local README, architecture docs, specs and task lists stay aligned
  when ownership moves
- runtime, API, SDK, frontend and package-boundary call graphs still match the
  implementation, or the spec/docs were updated with the final graph
- provider clients expose named operations, decode SDK output immediately, use
  owner-named `Config.schema`/`ConfigProvider`, translate to schema-tagged errors
  without `instanceof`, and provide live/mock Layers without raw-client escape
- React routes own transport restoration/outcome matching, containers own remote
  commands/coordination, and leaves receive focused readonly values and own only
  local interaction state
- every required docs/README/lint/skill/config/manifest/schema/generator/test/ops
  ledger row is implemented and verified

Substantial tasks must also include at least three documented improvement audit
passes before acceptance. The passes should ask what can be improved while the
implementation still works, then inspect for cleaner call graphs, clearer
package boundaries, more direct Effect-native control flow, canonical
schema/type/id/error reuse, fewer unsafe casts, fewer local mirrors and less
wrapper/helper sprawl. If an audit identifies a real improvement, make the
change or record the explicit follow-up before accepting the task.

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
- Do not continue past three failed parent correction turns for the same
  delegated task. Stop, record the evidence and replan or ask for a decision.

## Slice design rules

Each slice should:

- cross the real boundaries of the system
- leave the repo in a working state
- prove one risky assumption
- be small enough to validate quickly

Good early slices:

- one calculator or rule path wired through the public calculator service
- one SDK helper over one canonical calculator request
- one HTTP route over the SDK/effect boundary
- one docs/content path with navigation and validation evidence

Bad early slices:

- broad helper extraction before behaviour exists
- many partial files with no executable path
- speculative abstractions for future steps

## Mandatory Subagent Contract

Use this prompt block when delegating a task-list slice to a subagent:

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

## Verification ladder

After each meaningful slice, run the smallest verification set that proves the
change, then broaden when the blast radius justifies it.

| Change | Minimum verification |
| --- | --- |
| docs-only | content/link/path review plus `bun run verification` when docs wiring or task plans changed |
| narrow type-level/backend change | owning package typecheck plus targeted tests |
| runtime package change | owning package typecheck, targeted tests and build |
| cross-package flow | package checks for each touched owner plus one end-to-end proof |
| user-facing UI or API behaviour | package checks plus browser/runtime/API verification on the actual route |

Do not defer verification until the end of a long rollout.

---
name: prd-writer
description: "Thin router for WhatTax spec authoring. Use when writing a SPEC, PRD, or feature proposal so the work follows canonical docs instead of inventing a new PRD bundle."
---

# PRD Writer

This skill is intentionally thin. It routes spec authoring into canonical repo docs instead of carrying a parallel planning framework inside the skill.

## Start Here

Read in this order:

1. `docs/product-specs/writing-specs.md`
2. `docs/product-specs/writing-task-lists.md` when the spec needs
   implementation sequencing
3. `docs/exec-plans/implementing-specs.md` when implementation is beginning
4. the relevant architecture docs from `docs/architecture/*`

## Default Rules

- New current specs belong in `docs/product-specs/`.
- Substantial specs that need implementation sequencing should get a sibling
  `.tasks.json` file in `docs/product-specs/`.
- New active implementation plans belong in `docs/exec-plans/active/`.
- Prefer one compact canonical spec over a sprawling PRD bundle.
- Prefer progressive, end-to-end implementation spikes with explicit
  verification gates over package-by-package TODO lists.
- Include compact call-graph diagrams in specs that describe runtime behaviour,
  package boundaries, API/SDK flows, frontend data flow or test/runtime wiring.
- Link to architecture docs instead of restating service, API, frontend or
  package-ownership guidance.
- For Effect TypeScript work, specs and task lists must require meaningful
  linear Effect control flow where it clarifies sequencing, typed errors caught
  in `.pipe(...)`, canonical Schema-derived types, and an audit against
  `docs/architecture/effect-services.md`.
- Do not allow one top-level quality reminder to cover implementation style.
  Each delegated code task must include explicit verification for Effect
  control flow, schema/type reuse, unsafe casts, wrapper/helper sprawl and
  browser-safe import boundaries where relevant.
- Substantial delegated tasks must include at least three documented
  improvement audit passes before acceptance. These audits should ask what can
  be improved while keeping the implementation working, then inspect call
  graphs, package boundaries, Effect-native control flow, canonical schema/type
  reuse, unsafe casts, local DTO mirrors and helper sprawl.
- Delegated task lists must include a parent audit loop with up to three failed
  correction turns. Incomplete work goes back to the same subagent; after the
  third failed correction turn the parent stops, records the blocker, and
  replans or asks for a decision instead of accepting the task.

## Expected Output

For most substantial work, produce:

1. one spec in `docs/product-specs/`
2. one sibling task list in `docs/product-specs/<topic>.tasks.json` when the
   spec needs implementation sequencing, verification gates, or staged
   delegation
3. one active execution plan in `docs/exec-plans/active/` when implementation
   begins and live progress/validation evidence must be recorded

For small work, a single spec may be enough.

Task lists should follow `docs/product-specs/writing-task-lists.md`: include
principles, global verification, ordered tasks, mandatory verification,
browser verification where relevant, completion criteria, and
changeset/changelog requirements plus `commitAfterPassing` for each
implementation spike.
Specs and task lists that move runtime or package boundaries must include
current/target call graphs and require implementers to verify the final call
graph against code.
For Effect TypeScript tasks, every task's `mandatoryVerification` or
`completionCriteria` must explicitly check:

- meaningful linear Effect pipelines or `Effect.gen` programs for primary
  operations;
- typed error handling in `.pipe(...)` with `Effect.catchTag`,
  `Effect.catchTags`, `Effect.mapError` or another owning-package error
  boundary;
- canonical `Schema` contracts and schema-derived types from owning packages;
- no unsafe casts, local DTO mirrors, manual object readers or trivial
  wrappers/helpers;
- browser/runtime code only imports browser-safe API/SDK exports.

Every substantial delegated task must also include a `qualityAudits` field, or
equivalent completion criteria, requiring at least three documented improvement
audit passes before parent acceptance. Every delegated task should include
`parentAudit` with `maxCorrectionTurns: 3`, `returnToSameSubagent: true` and
`escalateAfterFailedTurn: 3`.

Use `bun run verification` as the default repo-health gate in
`globalVerification.requiredBeforeFinalPR` and in each task's
`mandatoryVerification`, then add task-specific smoke tests, browser checks, or
architecture audits as additional gates.
Use `bun run changeset` as the default gate for package-facing changes. The
task list must require either a changeset or an explicit note that the task is
docs-only, app-internal, or otherwise not package-facing.

Delegated implementation task lists MUST include an implementation prompt, or
equivalent task field, that embeds the mandatory subagent contract from
`docs/exec-plans/implementing-specs.md`. The prompt must make the subagent
enforce Effect-native primitives, canonical schema/type/id reuse, no mirrored
DTOs, inline callsite-local Effect error handling, task-specific verification
and parent review before the next task begins.

## Prompt Block

Use this block in generated task-list delegation prompts:

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
- Run task-specific tests, smoke checks, browser checks or architecture audits required by the task's blast radius.
- For substantial code, API, SDK, app, package-boundary or docs-runtime work, run and document at least three implementation improvement audit passes before handoff.
- Audit the diff for helper sprawl, canonical type/schema/id/error reuse, unsafe casts, local DTO mirrors, stringly branching and browser-safe imports where relevant.
- Report the Changeset path and release-train impact, or report why no Changeset was required.
- Report changed files, verification commands, outcomes and residual risks.
- Report whether the final implementation still matches the spec's call graph.
- Do not start or delegate another task. The parent agent must review, audit, verify and explicitly accept this task before the next task begins.
```

## Common References

- `docs/architecture/README.md`
- `docs/architecture/effect-services.md`
- `docs/architecture/package-ownership.md`
- `docs/architecture/api-and-sdk.md`
- `docs/architecture/frontend.md`
- `docs/architecture/testing-and-quality.md`
- `docs/product-specs/writing-task-lists.md`

## Notes

- Reuse old or imported planning material only as source material to revalidate.
- Keep specs compact, current, and ownership-aware.
- For runtime, API, SDK, frontend and package-boundary specs, include concise
  `Production:` and `Tests:` call-graph diagrams using fenced `ts` blocks.
- Keep task lists concrete: each task should produce a working repo state and
  name `bun run verification` plus any task-specific tests, browser checks, and
  architecture audits required before it can be considered complete. Package-facing
  tasks must also name `bun run changeset` or explicitly state why no Changeset
  is required.
- Repeat code-quality and architecture audits inside each delegated task. Do
  not rely on a single global reminder for Effect control flow, canonical
  schemas, unsafe casts, wrapper/helper sprawl or browser-safe imports.
- Require three documented improvement audit passes inside substantial
  delegated tasks, and define the three-turn parent correction loop in task
  lists.
- Do not generate package-by-package code tutorials unless the user explicitly asks for that depth.

---
status: canonical
last_reviewed: 2026-06-14
source_of_truth: docs
confidence: high
---

# Writing spec task lists

Use a sibling task list when a product spec needs ordered implementation spikes
and explicit verification gates.

The task list is not a work log and it is not a replacement for an active
execution plan. It answers what implementation slices should happen, in what
order, and what must pass before each slice is complete.

## When to create one

Create a task list when a spec is large enough that implementation should be
split into iterative slices with verification gates.

Good candidates:

- new public SDK, API, docs or app surfaces
- cross-package service, calculator, rule or schema work
- data model, lifecycle or release-train changes
- work where browser behaviour, downstream compatibility or packed package
  behaviour must be proven

Skip the task list for small, single-package changes where the spec or active
plan already gives enough sequencing.

## Shape

```json
{
  "$schema": "https://whattax.local/schemas/product-spec-task-plan.v1.json",
  "spec": "docs/product-specs/example.md",
  "title": "Example Implementation Tasks",
  "status": "draft",
  "last_reviewed": "2026-05-23",
  "principles": [],
  "globalVerification": {
    "commitPolicy": "",
    "requiredBeforeFinalPR": [
      "bun run verification",
      "bun run changeset or explicit no-changeset rationale"
    ],
    "evidenceRequired": [
      "Current and final call graph summary when runtime or package boundaries move",
      "Changeset path and release-train impact, or no-changeset rationale"
    ]
  },
  "tasks": []
}
```

Task objects should use this shape:

```json
{
  "id": "TASK-001",
  "title": "First vertical slice",
  "type": "foundation",
  "dependsOn": [],
  "goal": "Prove the riskiest contract with the smallest working path.",
  "scope": [],
  "outputs": [],
  "implementationPrompt": "Paste the Mandatory Subagent Contract here, followed by task-specific files, outputs and gates.",
  "mandatoryVerification": [],
  "browserVerification": [],
  "qualityAudits": [],
  "parentAudit": {
    "required": true,
    "maxCorrectionTurns": 3,
    "returnToSameSubagent": true,
    "escalateAfterFailedTurn": 3
  },
  "completionCriteria": [],
  "commitAfterPassing": true
}
```

Keep field names consistent with existing task lists:

- `globalVerification`
- `requiredBeforeFinalPR`
- `evidenceRequired`
- `dependsOn`
- `mandatoryVerification`
- `browserVerification`
- `qualityAudits`
- `parentAudit`
- `completionCriteria`
- `commitAfterPassing`

Tasks that will be delegated should include an implementation prompt, or an
equivalent field in the task object, that embeds the mandatory subagent
contract from `docs/exec-plans/implementing-specs.md` followed by task-specific
files, outputs and verification gates.

When the sibling spec includes call graphs, delegated tasks must instruct the
implementer to review those graphs before editing and report whether the final
implementation still matches them. Boundary-moving tasks should include an
`rg` audit or equivalent code inspection proving the final call graph's
important negative claims, such as "HTTP calculate does not construct the
calculator response" or "browser entrypoints do not import server-only
modules."

Delegated tasks should include `qualityAudits` for repeatable implementation
review prompts that must run at least three times before the task is accepted.
Use these audits for Effect shape, canonical schema/type reuse, call-graph
cleanliness, unsafe casts, helper sprawl, browser-safe imports and docs
alignment.

Delegated tasks should also include `parentAudit`. The parent audit is the
review loop owned by the main agent after a subagent reports completion:

- `required` should be `true` for delegated implementation work.
- `maxCorrectionTurns` should be `3` unless the spec explains a different
  limit.
- `returnToSameSubagent` should be `true` so corrections stay with the context
  that created the slice.
- `escalateAfterFailedTurn` should be `3`, meaning the parent records the
  blocker, updates the active plan, and asks for a decision or replans the task
  after the third failed correction turn instead of silently accepting weak
  work.

## Sequencing model

Prefer progressive spikes over package-by-package completion.

Start with the smallest slice that proves the riskiest assumption, then expand.
A common sequence:

1. current-code and architecture audit
2. canonical schemas, ids, tagged errors and boundary rules
3. deterministic unit or type-level tests for the owning package
4. service or calculator vertical slice
5. SDK, HTTP or app transport wiring
6. docs, examples and compatibility evidence
7. browser, API or packed-package proof when relevant
8. final regression, release impact and architecture audit

Do not save browser proof, API proof, downstream proof or compatibility proof
for an unbounded final task when a narrower earlier slice can validate it.

## Verification gates

Every task must define gates that match its blast radius. A task is incomplete
until its `mandatoryVerification` passes and the parent agent has accepted the
slice.

Use concrete commands where possible:

- `bun run verification`
- `bun run --filter=<package> test`
- `bun run --filter=<package> check-types`
- `bun run --filter=<package> build`
- `bunx tsc -p <tsconfig> --noEmit`

Also include non-command gates when they are material:

- architecture audit against specific `docs/architecture/*` files
- schema/type audit for canonical ids and no DTO mirrors
- Effect audit against `docs/architecture/effect-services.md`, including
  meaningful linear Effect control flow, typed errors handled in `.pipe(...)`,
  schema decoding at boundaries, no unsafe casts and no trivial helper sprawl
- at least three documented improvement audit passes for substantial Effect,
  API, SDK, app or package-boundary slices
- diff audit for forbidden wrappers, unsafe casts or browser/server import
  leaks
- OpenAPI, SDK packed-artifact or downstream-consumer evidence
- browser/runtime verification on the exact local route for user-facing UI

Avoid vague gates such as "tests pass" without naming the package, behaviour or
evidence.

Example task:

```json
{
  "id": "task-001",
  "title": "Implement the first end-to-end slice",
  "implementationPrompt": "Paste the Mandatory Subagent Contract here, followed by task-specific files, outputs and gates.",
  "mandatoryVerification": [
    "bun run verification",
    "bun run changeset or explicit no-changeset rationale"
  ],
  "qualityAudits": [
    "Run the implementation improvement audit at least three times: cleaner call graph, clearer package boundaries, more direct Effect-native control flow, canonical schema/type/id/error reuse, no unsafe casts, no DTO mirrors, no wrapper/helper sprawl, and updated specs/docs when implementation differs."
  ],
  "parentAudit": {
    "required": true,
    "maxCorrectionTurns": 3,
    "returnToSameSubagent": true,
    "escalateAfterFailedTurn": 3
  },
  "completionCriteria": [
    "Parent agent reviewed the diff against the spec, task and architecture docs.",
    "Parent agent completed and recorded at least three relevant quality audit passes.",
    "Parent agent verified the final call graph against the implementation.",
    "Parent agent verified canonical Effect/schema/type/id reuse.",
    "Parent agent audited Effect control flow, unsafe casts and helper sprawl.",
    "Parent agent verified the Changeset or accepted the no-changeset rationale.",
    "Parent agent accepted the task before the next delegation."
  ],
  "commitAfterPassing": true
}
```

## Task Quality Bar

Each task should:

- produce a reviewable repo state
- prove one or two important assumptions
- name concrete outputs
- include `bun run verification` in mandatory verification gates
- include `bun run changeset` for package-facing changes, or an explicit
  no-changeset rationale for docs-only/app-internal work
- include browser verification when a user-facing route changes
- include architecture audits when boundaries, schemas or runtime ownership move
- include call-graph review and negative audits when runtime/package flows move
- include Effect-native and canonical-type prompt guidance when delegated
- include at least three documented quality audit passes for substantial code,
  package-boundary, API, SDK, app or docs-runtime changes
- repeat Effect/code-quality audits inside each delegated task rather than
  relying on a single global reminder
- require a parent audit loop that returns incomplete work to the same subagent
  for up to three correction turns, then escalates instead of accepting an
  unresolved slice
- require parent review and acceptance before the next delegated task starts

Prefer progressive end-to-end slices over package-by-package TODO lists.

Each task should not:

- be a package-by-package TODO list with no vertical proof
- defer all tests to the final task
- rely on live network calls for deterministic correctness tests unless the
  task explicitly owns live integration evidence
- permit local DTO mirrors, raw id fields, unsafe casts or wrapper-heavy
  composition when architecture docs forbid them
- permit nested or fragmented Effect control flow, one-line wrappers, helper
  sprawl or manual object readers when a direct Effect/schema-owned approach
  would express the behaviour clearly
- claim completion without type, test, build, browser, API, docs or audit
  evidence appropriate to its blast radius

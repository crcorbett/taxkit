---
status: canonical
last_reviewed: 2026-07-18
source_of_truth: docs
confidence: high
---

# Writing specs

Use this guide when creating a new SPEC, PRD or design brief for TaxKit.

Do not start by creating a large PRD bundle. Pick the canonical document type
first.

## Choose the right home

| Need | Canonical Home |
| --- | --- |
| current product intent, behaviour, scope | `docs/product-specs/` |
| ordered implementation spikes and verification gates | `docs/product-specs/<topic>.tasks.json` |
| durable architecture, boundaries, invariants | `docs/architecture/` |
| design principles and engineering beliefs | `docs/design-docs/` |
| active implementation sequencing and validation log | `docs/exec-plans/active/` |
| external or vendor references | `docs/references/` |

Default rule:

- new current specs go in `docs/product-specs/`
- substantial specs that need implementation sequencing get a sibling
  `.tasks.json` file in `docs/product-specs/`
- new implementation plans go in `docs/exec-plans/active/`
- reference or vendor material goes in `docs/references/`

## Canonical document set

For most substantial work, create two or three documents:

1. A spec in `docs/product-specs/` that explains the goal, scope,
   user/system behaviour, constraints and acceptance criteria.
2. A task list beside the spec when implementation should be sequenced into
   progressive, verifiable spikes.
3. An execution plan in `docs/exec-plans/active/` when implementation begins,
   recording live progress, validation evidence, decisions and follow-on debt.

Do not force all three if the work is tiny. For small changes, a single focused
spec or plan may be enough.

For task-list structure, verification gates and JSON field conventions, see
`docs/product-specs/writing-task-lists.md`.

## Recommended spec shape

1. Overview
2. Problem
3. Call graphs
4. Goals
5. Non-goals
6. Ownership and boundaries
7. Proposed approach
8. Tests and verification
9. Risks and tradeoffs
10. Versioning and changelog impact
11. Acceptance criteria
12. References

## What a spec owns

A good spec should answer:

- what problem is being solved
- who or what benefits
- what is in scope and out of scope
- which packages/apps own the work
- what constraints or invariants must hold
- what success looks like

A spec is not:

- a work log
- a code dump
- a test transcript
- a duplicate of package README or architecture docs

Link to canonical architecture docs instead of re-explaining them.

## Edit-first review and downstream impact

Review the canonical SPEC and sibling task list in place. When repository
inspection proves a missing requirement, incorrect path, changed call graph or
downstream artifact, edit the artifacts immediately instead of leaving the
finding only in a review memo.

Every substantial SPEC must include a path-evidenced downstream-impact ledger.
Mark every row `Change required` or `N/A`, cite the inspected paths, and mirror
required work into concrete task objects with acceptance and verification:

- canonical docs, standards, references and documentation audit;
- root and every relevant app/package/skill README;
- lint config, custom rules, accepted/rejected fixtures, focused tests, root
  scripts and CI inheritance;
- repo-owned skills, `AGENTS.md`, instruction symlinks, bundled resources and
  `agents/openai.yaml` metadata;
- config, manifests, exports, schemas, branded IDs, generators, generated
  output, fixtures, tests, examples, migrations and Changesets;
- provider/API/SDK/HTTP/storage/file/command boundaries, observability,
  deployment, rollback and operator runbooks; and
- React route/container/leaf composition, accessibility and browser proof.

An `N/A` row needs evidence. A `Change required` row without an implementation
task is not ready for implementation.

## Call graphs

Specs that describe runtime behaviour, service boundaries, package boundaries,
public APIs, SDK flows, frontend data loading or test/runtime wiring MUST
include compact call-graph diagrams. Use fenced `ts` blocks with indentation
and `->` arrows so the graph can be copied into code review, task prompts and
implementation plans.

Include the current graph and target graph when a spec changes an existing
flow:

```ts
Production: current

caller
  -> current boundary
    -> current service
```

```ts
Production: target

caller
  -> target boundary
    -> target service
```

Add a `Tests:` graph when implementation requires mocks, alternate layers,
browser-safe entrypoints, packed artifact checks or downstream validation:

```ts
Tests: target

test harness
  -> public entrypoint
    -> test layer or production layer
    -> assertion surface
```

Keep diagrams factual and package-owned. Do not invent planned package names,
routes, layers or services unless the spec explicitly creates them. Link to
the owning architecture doc for durable boundary rules instead of expanding
the diagram into a tutorial.

## Freshness Metadata

Canonical specs should include:

```yaml
status: canonical | draft | historical
last_reviewed: YYYY-MM-DD
source_of_truth: docs
confidence: high | medium | low
```

## Quality Bar

- Verify package names and paths against current code.
- Link to architecture docs instead of restating them.
- Keep specs compact enough to scan quickly.
- Include call-graph diagrams for runtime, API, SDK, frontend, package-boundary
  or test-harness changes.
- Make acceptance criteria concrete enough to verify.
- For multi-slice delegated work, acceptance criteria must require parent
  review of each subagent diff against the spec, task list and architecture
  docs before the next task begins.
- For Effect TypeScript work, require meaningful linear Effect control flow,
  typed errors handled at owning boundaries, canonical schema-derived types,
  and an explicit audit against `docs/architecture/effect-services.md`.
- For provider work, require named operations, locally supported `Effect.fn`
  where the operation benefits from naming/tracing, owner-named
  `Config.schema`/`ConfigProvider` composition, immediate SDK-output decoding,
  schema-tagged errors without `instanceof`, and live/mock Layers. Forbid raw
  clients, generic SDK callbacks, raw identifier fields and unchecked outputs.
- For frontend work, require the route -> policy-owning container -> leaf graph
  from `docs/architecture/frontend.md`; routes own transport restoration,
  containers own remote/domain commands, and leaves render focused readonly
  values plus local interaction state.
- For implementation task lists, repeat Effect/code-quality audits in each
  task's verification gates rather than relying on one top-level reminder.
- Substantial delegated tasks must require at least three documented
  improvement audit passes before acceptance. The audits should inspect for a
  cleaner call graph, clearer package boundaries, more direct Effect-native
  control flow, canonical schema/type/id/error reuse, unsafe casts, local DTO
  mirrors and wrapper/helper sprawl.
- Delegated task lists must define the parent audit loop: the parent reviews
  the diff and evidence locally, returns incomplete work to the same subagent,
  and stops for replan or user decision after the third failed correction turn.
- Use `bun run verification` as the default repo-level acceptance gate when a
  spec changes code, docs wiring, package metadata or task plans.
- Package-facing specs must define the expected Changeset impact: affected
  release-train packages, semver bump level, and user-facing changelog theme.
  Specs that do not affect package installation, package exports or package
  behaviour must say that no Changeset is required and why.

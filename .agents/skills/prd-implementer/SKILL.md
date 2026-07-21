---
name: prd-implementer
description: "Implement TaxKit SPECs and task lists in verified sequential slices. Use when executing a SPEC or plan so code, canonical planning artifacts, documentation, lint, skills, Effect boundaries, React composition, and release evidence stay synchronized as findings arise."
---

# PRD Implementer

Implement one end-to-end task at a time and keep the SPEC, task list, active
plan, code, docs, and enforcement surfaces truthful throughout the rollout.

## Start Here

Read in this order:

1. `AGENTS.md`
2. the target SPEC and sibling task list
3. the matching active execution plan, when present
4. `docs/exec-plans/implementing-specs.md`
5. the relevant architecture, design, standards, README, source, manifest,
   config, lint, fixture, test, skill, CI, and operator files

Use local source and installed package versions for TaxKit. Use DeepWiki through
Executor MCP only to research upstream libraries such as Effect, TanStack,
Fumadocs, Knip, or Oxlint; never use it to inspect the local codebase.

## Edit Canonical Artifacts During Implementation

- Edit the SPEC, sibling task list, and active plan whenever implementation
  proves a missing requirement, changed call graph, incorrect path, new
  dependency, stronger acceptance criterion, or required downstream artifact.
- Do not defer those edits to a review memo or final cleanup task.
- Keep task status, dependencies, outputs, verification, ledger decisions, and
  evidence synchronized with the implementation.
- Preserve unrelated user changes and stop before overwriting overlapping work.

Invoke `$docs-maintainer` in every material implementation slice and at
closeout. It selects the canonical owner and records the complete `Change
required`/`Preserve`/`N/A` ledger before the slice is accepted; `$docs-writer`
is only a later public-copy aid and never a maintenance substitute.

## Required Impact Ledger

Before accepting each task, update the SPEC/task path-evidenced ledger. Mark each
surface `Change required` or `N/A` with evidence:

1. SPEC, tasks, index, and active plan
2. canonical docs, standards, references, and documentation audit
3. root and relevant app/package/skill READMEs
4. lint config, custom rules, accepted/rejected fixtures, focused tests, root
   scripts, and CI inheritance
5. repo skills, `AGENTS.md`, instruction symlinks, bundled resources, and
   `agents/openai.yaml`
6. config, manifests, exports, schemas, branded IDs, generators, generated
   output, fixtures, tests, examples, migrations, and Changesets
7. provider/API/SDK/HTTP/storage/file/command boundaries, observability,
   deployment, rollback, and operator runbooks
8. React route/container/leaf composition, accessibility, and browser proof

Implement every required row in the same task or add a concrete dependent task
before acceptance. An unimplemented `Change required` row blocks completion.

## Effect Implementation Rules

- Keep the primary success path flat, sequential, and composable. Prefer a
  readable pipe; use `Effect.gen` for real sequencing and the installed Effect
  v4 `Effect.fn` for meaningful named operation or tracing boundaries, not to
  wrap one line.
- Handle expected errors at the owning boundary, usually in the outer
  `.pipe(...)` with `catchTag`, `catchTags`, or `mapError`.
- Reuse canonical Schema-derived `Type` and `Encoded` forms, branded IDs,
  services, errors, and constructors. Do not mirror DTOs or redeclare
  `id: string`, status, metadata, or provider fields.
- Decode `unknown` and provider SDK results immediately inside the exact ingress
  adapter. Pass decoded values inward and encode only at an explicit egress.
- Use owner-named `Config.schema` fragments and app-owned `ConfigProvider`
  composition. Do not introduce primitive semantic config or manual env parsing.
- Use `Schema.TaggedErrorClass` for public expected failures. Translate provider
  failures once without `instanceof`, raw `_tag` checks, or unknown public error
  channels.
- Expose named provider operations behind a `Context.Service`; never expose the
  raw client or a generic SDK `use` callback. Provide explicit live and
  deterministic mock Layers.
- Use Effect-native collections, `Option`, `Match`, `Result`, `Exit`, Platform,
  Command, and managed runtimes when they own the problem.
- Keep one-use decoding, encoding, mapping, property access, layer creation, and
  Effect fragments inline. Admit an abstraction only when it satisfies
  `docs/design-docs/abstraction-admission.md`.

## React Implementation Rules

Follow `docs/architecture/frontend.md`:

```text
route loader/action or server function
  -> direct route-root restore and Result match
    -> page shell and semantic landmarks
      -> policy-owning section container and smallest owning fallback
        -> leaf with readonly values and focused commands
```

- Routes restore encoded transport once and own top-level outcome matching.
- Containers own remote/domain commands and focused coordination.
- Leaves render focused readonly values and own local interaction state only.
- Leaves must not decode transport data, acquire Effect services, run runtimes,
  read environment/storage, fetch boundary data, or construct provider clients.
- Keep loading, empty, unavailable, and recoverable errors at the smallest
  owning boundary with stable dimensions.
- Reject hooks, providers, wrappers, and feature components whose only purpose
  is to move a boundary, hide route JSX, pass through state, or silence lint.

## Sequential Task Loop

Use a goal only when the user explicitly requests one. Goal state and worker
counts are coordination state, never acceptance proof.

For each task:

1. Keep the primary trajectory accountable. Delegate a bounded slice only when
   it has independent proof value, adversarial-review value, or explicitly
   disjoint writes; include its SPEC, task object, paths, ledger, and gates.
2. Require direct edits, including SPEC/tasks/plan improvements discovered while
   implementing.
3. Review the complete diff and local evidence against the task, architecture,
   impact ledger, call graphs, and release contract.
4. Run focused verification and the required quality audits.
5. Correct incomplete work directly or return a delegated slice to the same
   owner with exact failed evidence.
6. If the same blocker persists and safe alternatives are exhausted, record it
   precisely and replan or ask for a decision.
7. Accept and commit the slice only when all required ledger rows and gates are
   complete.
8. Begin the next task only after acceptance.

Default to strict serial execution. Parallelize only tasks whose task list proves
independent dependencies and disjoint write scopes.

## Delegated Slice Prompt

When delegation meets the rule above, include this block tightened with
task-specific paths and gates:

```text
Implement exactly one TaxKit task. Edit the canonical SPEC, sibling task list,
and active plan as findings arise; do not leave proven requirements only in the
handoff.

Complete the path-evidenced Change required/N/A impact ledger for docs, every
relevant README, lint/custom rules/fixtures/CI, repo skills/AGENTS/metadata,
config/manifests/schemas/generators/tests/ops, and React/runtime surfaces.
Implement every required row or add a concrete dependent task.

Keep primary Effect operations flat, sequential, and composable. Use pipe-first
flow, Effect.gen for genuine sequencing, and installed Effect.fn only for
meaningful named operations. Reuse canonical Schema Type/Encoded contracts,
branded IDs, services, Schema tagged errors, Config.schema fragments, and
ConfigProvider composition. Decode provider output immediately at ingress and
encode only at egress. Never expose a raw provider client or generic SDK use
callback, accept raw id: string, use primitive semantic config, branch with
instanceof, or allow unchecked SDK output to escape.

For React, keep transport restore/outcome matching at the route, remote/domain
commands and coordination in the owning container, and readonly rendering/local
interaction state in leaves. Do not move boundaries into hooks, providers,
wrappers, or leaves.

Keep one-use logic inline. Reject helper, mapper, wrapper, hook, provider,
service, layer, schema, config, and module sprawl unless the abstraction has an
owner, semantic weight, a real second use/substitution point, a simpler call
graph, and focused tests.

Run all task gates, focused lint fixtures and stale-pattern scans, skill
validation, bun run verification unless explicitly narrowed, and package/API/
SDK/browser/downstream proof required by the blast radius. Report changed files,
evidence, call-graph alignment, ledger completion, Changeset impact, and risks.
Do not start another task.
```

## Parent Review Bar

Reject a task when any relevant condition fails:

- required ledger row is missing, still pending, or lacks path evidence
- SPEC/task/plan no longer matches the implementation
- primary Effect flow is fragmented, nested, wrapper-heavy, or hides sequencing
- meaningful operations lack useful naming where local `Effect.fn` fits
- raw public primitives, DTO mirrors, unchecked provider output, repeated
  decoding, primitive config, unsafe casts, `instanceof`, or raw clients remain
- public expected failures are not schema-tagged and closed
- live/mock provider substitution or provider-result decoding is untested
- helper, mapper, wrapper, hook, provider, service, layer, or module sprawl lacks
  admission evidence
- route/container/leaf responsibilities or browser/server imports are inverted
- docs, relevant READMEs, lint rules/fixtures, skills/metadata, manifests,
  generators, tests, or operator artifacts are stale
- focused verification, stale scans, skill validation, browser/API/SDK proof,
  Changeset evidence, or root verification is missing

## Verification Baseline

Choose the smallest proving checks during iteration, then broaden before task
acceptance:

1. skill validation and skill-policy stale scans when skills change
2. focused custom-lint visitor and installed-binary fixture tests when rules move
3. owning package typecheck, tests, and build
4. API, SDK packed/downstream, browser, runtime, or operator proof for the real
   changed boundary
5. `bun run verification`
6. `bun run changeset` for package-facing changes or explicit no-Changeset
   rationale

Do not defer all proof or documentation reconciliation to the final rollout
task.

## Common References

- `docs/exec-plans/implementing-specs.md`
- `docs/product-specs/writing-specs.md`
- `docs/product-specs/writing-task-lists.md`
- `docs/architecture/effect-services.md`
- `docs/architecture/configuration.md`
- `docs/architecture/frontend.md`
- `docs/architecture/testing-and-quality.md`
- `docs/design-docs/abstraction-admission.md`

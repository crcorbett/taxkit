---
name: prd-writer
description: "Write and continuously improve TaxKit SPECs and task lists. Use when creating or reviewing a SPEC, PRD, feature proposal, or implementation task plan so canonical artifacts are edited as findings arise and cover architecture, Effect, React, documentation, lint, skills, verification, and release impact."
---

# PRD Writer

Create or review the canonical SPEC and task list in place. Do not stop at a
review memo when the repository artifacts can be improved directly.

## Structured harness and audit handoff

For substantial repository, operational, automation, migration, or harness
work, read the embedded repository harness contract, contract map, and invariant
register under `../docs-maintainer/references/`.

When work begins with an audit, require the accepted-finding register and its
structured crosswalk. Validate it with the repository audit validator when one
exists. Preserve stable finding and invariant IDs; map every accepted finding
to an owning requirement and task, including its complete impact-surface
decisions, verification, journeys, and proof. Keep rejected, deferred, and
optional findings out of implementation scope unless explicitly accepted.

For ordinary repository improvements, require normal repository checks,
applicable real journeys, and one fresh independent review. Do not create a
comparative harness campaign unless the SPEC explicitly claims a general
harness effect.

## Start Here

Read in this order:

1. `AGENTS.md`
2. `docs/product-specs/writing-specs.md`
3. the target SPEC and sibling `.tasks.json`, when they exist
4. `docs/product-specs/writing-task-lists.md` when sequencing is required
5. `docs/exec-plans/implementing-specs.md` and the matching active plan, when
   implementation has started
6. every relevant file in `docs/architecture/**`, `docs/design-docs/**`, and
   `docs/standards/**`
7. the root README and every app/package/skill README affected by the proposal
8. the current source, tests, manifests, config, lint rules, fixtures, CI, skills,
   and operator artifacts needed to verify the proposal

Use local source, manifests, installed versions, and repository docs to
understand TaxKit. Use DeepWiki through Executor MCP only for upstream packages
or libraries such as Effect, TanStack, Fumadocs, Knip, or Oxlint. Never use
DeepWiki as a substitute for inspecting this checkout.

Invoke `$docs-maintainer` during impact design and again when the SPEC/tasks
land. Its complete `Change required`/`Preserve`/`N/A` ledger routes public,
generated, package, lifecycle, runbook, proof and ordinary documentation
surfaces; `$docs-writer` may only refine public copy after that route.

## Edit-First Review

- Edit the SPEC and sibling task list as soon as a material finding is proven.
- Keep the SPEC, task list, and active plan synchronized while reviewing.
- Add missing implementation tasks, acceptance criteria, dependencies, paths,
  and verification commands directly to the canonical artifacts.
- Remove or correct stale claims instead of listing them only in a handoff.
- Preserve existing user changes and unrelated worktree state.
- Use report-only mode only when the user explicitly asks for it or the target
  artifact is external/read-only.

## Required Impact Ledger

Every substantial SPEC must contain a path-evidenced ledger. Mark every row
`Change required` or `N/A`; never omit a surface because it looks secondary.
Each `Change required` row must name exact paths, acceptance criteria, and
verification. Each `N/A` row must give evidence.

Cover at least:

1. SPEC, sibling task list, index, and active execution plan
2. canonical architecture, design, standards, references, and documentation
   audit files
3. root README and every relevant app/package/skill README
4. lint configuration, custom rules, accepted/rejected fixtures, focused rule
   tests, root scripts, and CI inheritance
5. repo-owned skills, `AGENTS.md`, symlinked instruction surfaces, bundled
   references/scripts/assets, and `agents/openai.yaml` metadata
6. config, manifests, package exports, schemas, branded identifiers, generated
   artifacts, generators, migrations, fixtures, tests, examples, and Changesets
7. runtime, HTTP/API/SDK/provider/storage/file/command boundaries, observability,
   deployment, rollback, and operator runbooks
8. React routes, containers, leaves, loading/empty/error states, accessibility,
   browser proof, and server/browser import boundaries

Classify these as separate impact rows; do not collapse them into broader rows:
tests; fixtures; configuration; exports; manifests; lifecycle; release;
rollback; critical journeys; semantic owners.

Use a compact table with columns equivalent to:

```text
Surface | Decision | Evidence | Required paths | Acceptance and verification
```

Mirror required rows into concrete task objects. A prose ledger without tasks is
not implementation-ready.

## Effect Requirements

For Effect TypeScript work, require all of the following in the SPEC and in each
affected code task:

- Keep the primary success path flat, sequential, and composable. Prefer a
  readable pipe; use `Effect.gen` for genuine step-by-step sequencing and the
  installed Effect v4 `Effect.fn` for meaningful named operation boundaries or
  tracing, not as a one-line wrapper.
- Handle expected typed errors at the owning boundary, normally in the outer
  `.pipe(...)` with `catchTag`, `catchTags`, or `mapError`.
- Reuse canonical Schema-derived `Type` and `Encoded` forms, branded IDs,
  service tags, tagged errors, and constructors from the owning package. Never
  mirror a canonical field as raw `id: string`.
- Decode `unknown` or representation-level provider output immediately at its
  exact ingress adapter. Pass decoded values inward without repeated defensive
  decoding and encode only at an explicit egress.
- Use owner-named `Config.schema(...)` fragments and app-owned
  `ConfigProvider` composition. Do not teach primitive semantic config or
  manual environment parsing.
- Use `Schema.TaggedErrorClass` for public expected failures. Do not branch on
  provider errors with `instanceof`; decode or translate once at the adapter and
  use tagged errors plus `Match`/tag handlers.
- Provider clients expose named domain operations. Forbid generic SDK `use`
  callbacks, raw client escape, unchecked SDK outputs, and generic pass-through
  wrappers. Require explicit live and deterministic mock Layers.
- Forbid helper sprawl. Keep one-use decoders, encoders, error mappers, property
  readers, layer factories, and Effect fragments inline unless the abstraction
  satisfies `docs/design-docs/abstraction-admission.md`.
- Require the exact custom-lint rules, fixtures, focused tests, and stale-pattern
  scans that can reliably enforce the contract; keep semantic ownership and
  helper admission in review rather than inventing brittle lint.

## React Requirements

Frontend tasks must reference `docs/architecture/frontend.md` and preserve this
composition:

```text
route loader/action or server function
  -> direct route-root restore and Result match
    -> page shell and semantic landmarks
      -> policy-owning section container and smallest owning fallback
        -> leaf with readonly values and focused commands
```

- Keep restoration and top-level outcome matching in the direct route owner.
- Let containers own remote/domain commands and focused coordination.
- Route/feature boundaries or policy-owning containers own data loading,
  fetch/query execution, Effect/service/RPC execution, remote/domain mutations
  and commands, shared workflow/orchestration, and loading/error policy.
- Presentation leaves receive narrow readonly values and callbacks. They own
  rendering, accessibility, focus, and local UI interaction state only; do not
  let them decode transport data, acquire Effect services, run runtimes, read
  environment/storage, fetch or query boundary data, execute remote/domain
  mutations or commands, own shared workflows, or construct provider clients.
- Place loading, empty, unavailable, and recoverable error UI at the smallest
  owning composition boundary with stable dimensions.
- Do not add hooks, providers, wrappers, or feature components merely to move a
  decoder, shorten route JSX, or silence lint.
- Require accessibility and browser evidence for affected SSR, hydration,
  navigation, loading, empty, error, success, long-content, desktop, and mobile
  states as relevant.

## Task-List Contract

For substantial work, produce and continuously edit:

1. one SPEC in `docs/product-specs/`
2. one sibling `docs/product-specs/<topic>.tasks.json`
3. one active plan in `docs/exec-plans/active/` once implementation begins

Task lists must follow `docs/product-specs/writing-task-lists.md` and include:

- progressive end-to-end slices rather than package-by-package TODOs
- current/target production, test, browser, CLI, or provider call graphs
- the path-evidenced impact ledger represented in task outputs
- task-specific mandatory verification and browser verification
- one primary trajectory accountable for the accepted outcome, with delegation
  limited to independently provable, adversarial-review, or disjoint slices
- documented ownership/call-graph, implementation-quality, and
  verification-coverage risk audits for substantial tasks; do not use a fixed
  audit-pass or subagent count as acceptance proof
- the parent correction loop and sequential acceptance protocol
- `commitAfterPassing`
- `bun run verification` plus focused gates
- a Changeset or explicit no-Changeset rationale

## Mandatory Delegation Prompt

Embed this contract, tightened for the task, in every delegated implementation
task:

```text
Edit the canonical SPEC, sibling task list, and active plan as implementation
findings arise. Do not leave proven improvements only in the handoff.

Complete the path-evidenced Change required/N/A impact ledger for docs, relevant
READMEs, lint/custom rules/fixtures/CI, repo skills/AGENTS/metadata,
config/manifests/schemas/generators/tests/ops, and frontend/runtime surfaces.

Keep primary Effect operations flat, sequential, and composable. Use pipe-first
flow, Effect.gen for real sequencing, and the locally installed Effect.fn only
for meaningful named operations. Reuse canonical Schema Type/Encoded contracts,
branded IDs, service tags, Schema tagged errors, Config.schema fragments, and
ConfigProvider composition. Decode provider output immediately at ingress and
encode only at egress. Do not use generic SDK use callbacks, expose raw clients,
accept raw id: string, use primitive semantic config, branch with instanceof,
or let unchecked SDK output escape.

For React, keep transport restoration and outcome matching at the route, remote
commands and coordination in the owning container, and focused readonly
rendering/local interaction state in leaves. Do not move boundaries into hooks,
providers, wrappers, or leaves.

Keep one-off logic inline. Reject helper, mapper, wrapper, hook, provider,
service, layer, schema, config, and module sprawl unless the abstraction has an
owner, semantic weight, a real second use/substitution point, a simpler call
graph, and focused tests.
```

## Verification

Before handoff:

- Validate the SPEC/task JSON and all edited skills.
- Run focused lint/custom-rule fixture tests and skill stale-pattern tests.
- Run `bun run verification` unless the task records a narrower justified gate.
- Run targeted tests/builds/browser/API/SDK/downstream proof for the blast
  radius.
- Run `bun run changeset` for package-facing work or record why none is needed.
- Report changed canonical artifacts, verification evidence, call-graph
  alignment, and residual risks.

## Common References

- `docs/architecture/effect-services.md`
- `docs/architecture/configuration.md`
- `docs/architecture/frontend.md`
- `docs/architecture/testing-and-quality.md`
- `docs/design-docs/abstraction-admission.md`
- `docs/product-specs/writing-specs.md`
- `docs/product-specs/writing-task-lists.md`
- `docs/exec-plans/implementing-specs.md`

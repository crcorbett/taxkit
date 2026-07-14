---
status: canonical
last_reviewed: 2026-07-14
source_of_truth: root-docs
confidence: high
---

# WhatTax

Root map and behaviour contract. Keep this file short. Route into deeper docs
fast.

## Working rules

- Read the relevant docs and current files before editing.
- Prefer the smallest correct change that matches repo boundaries.
- Keep public WhatTax docs focused on the open-source engine, API, SDK and docs
  site.
- MUST use Effect-native primitives and platform APIs when they fit:
  `Data`, `Schema`, `Array`, `Chunk`, `HashSet`, `HashMap`, `Match`,
  `Context`, `Layer`, `Config`, `Service`, `Record`, `Result`, `Exit`, `Bun`,
  `Platform`, `Command` and `ManagedRuntime`. Do not fall back to ad hoc
  standard TypeScript shapes, mutable collections, manual env parsing, manual
  process lifecycle code or hand-rolled runtime wrappers when Effect owns the
  pattern.
- MUST use `Option`, `Match` and schema-owned optional fields for optional
  request and response policy. Do not use raw `undefined` branching,
  conditional object-spread response shaping or jurisdiction-specific defaults
  such as `payload.jurisdiction ?? "AU"` unless an owning schema explicitly
  defines that default.
- MUST use pipe-first composition for calculator transformations and Effect
  pipelines when data flow is clearer left-to-right. Do not hide flow inside
  nested wrapper calls when a pipeline makes ownership and sequencing clearer.
- MUST reuse canonical schemas, types, branded ids, service tags, tagged errors
  and constructors from the owning package. Never mirror canonical fields such
  as `id: string` outside the owning schema/type source.
- MUST keep one-off Effect error handling and transformations inline at the
  callsite; do not extract tiny wrapper or mapper helpers. See
  `docs/architecture/effect-services.md`.
- MUST admit shared helpers, hooks, providers, services and packages only when
  they have a clear owner, semantic weight, a second consumer or real
  substitution point, a simpler call graph and focused tests. See
  `docs/design-docs/abstraction-admission.md`.
- MUST decode representation-level or unknown values only at explicit trust or
  type-erasure boundaries. Pass schema-derived values inward without repeated
  defensive decoding. See `docs/architecture/effect-services.md`.
- Verify with `bun run verification` when docs, package wiring or code changes
  can affect the repo.
- For package-facing work, add or update a Changeset before committing. Use
  `bun run changeset` to record the change and `bun run version-repo` only when
  intentionally applying pending release-train versions and changelogs.

## Atlas

| Need | Start |
| --- | --- |
| repo overview | `README.md` |
| architecture | `docs/architecture/README.md` |
| package placement | `docs/architecture/package-ownership.md` |
| Effect services and layers | `docs/architecture/effect-services.md` |
| configuration | `docs/architecture/configuration.md` |
| facts and boundary values | `docs/architecture/facts.md` |
| rules and parameters | `docs/architecture/rules-and-parameters.md` |
| calculators | `docs/architecture/calculators.md` |
| graph, trace and ledgers | `docs/architecture/graph-trace-ledgers.md` |
| API and SDK | `docs/architecture/api-and-sdk.md` |
| frontend/runtime split | `docs/architecture/frontend.md` |
| content and docs site | `docs/architecture/content-and-posts.md` |
| deployment | `docs/architecture/deployment.md` |
| testing and quality | `docs/architecture/testing-and-quality.md` |
| specs | `docs/product-specs/index.md` |
| spec authoring | `docs/product-specs/writing-specs.md` |
| implementation plans | `docs/exec-plans/README.md` |
| design docs | `docs/design-docs/index.md` |
| abstraction admission | `docs/design-docs/abstraction-admission.md` |
| docs maintenance | `docs/design-docs/agent-first-documentation.md` |
| external references | `docs/references/README.md` |
| documentation audit | `docs/documentation-audit/README.md` |

## Repo map

| Path | Owns |
| --- | --- |
| `apps/api` | standalone Bun API runtime and health/docs/calculation endpoints |
| `apps/docs` | public TanStack Start docs app and app-local MDX rendering |
| `apps/web` | current TanStack Start scaffold and health-check UI |
| `packages/api/http` | current Effect HTTP API package and transport contracts |
| `packages/calculators` | reusable calculator catalogue, graph, calculation and error orchestration |
| `packages/sdk/typescript` | implemented private TypeScript SDK package |
| `packages/docs-content` | private docs contracts, navigation, validation and content service |
| `packages/docs-fumadocs` | reusable Fumadocs configuration, source adapters and render primitives |
| `packages/tsconfig` | shared TypeScript config |
| `packages/core` | implemented deterministic engine primitives, descriptors, graph, trace, ledgers and calculation engine |
| `packages/rules/au/pay` | implemented Australian take-home pay and PAYG withholding rule pack |
| `packages/rules/au/income-tax` | implemented Australian annual income tax rule pack |
| `packages/rules/au/stsl` | implemented Australian STSL withholding rule pack |
| `packages/testing` | shared test helpers for workspace packages |
| `packages/scripts` | implemented Effect-native release-readiness orchestration |
| `packages/ui` | planned shared UI primitives |
| `docs/architecture` | durable architecture and boundaries |
| `docs/product-specs` | current specs and task lists |
| `docs/exec-plans` | active and completed implementation plans and validation logs |
| `docs/design-docs` | durable engineering and documentation beliefs |
| `docs/references` | external/vendor references |

## Routing by task type

| Task | Route |
| --- | --- |
| new architecture or boundary decision | update or link `docs/architecture/*` |
| new implementation intent | write a spec in `docs/product-specs/` |
| multi-slice implementation | add a task list beside the spec and an active exec plan |
| package-local guidance | update the package root `README.md` |
| docs routing or repo shape change | update `README.md`, `AGENTS.md`, the documentation audit and the status snapshot when needed |
| public docs/content direction | start at `docs/architecture/content-and-posts.md` |
| browser/app behaviour | start at `apps/web/README.md` and `docs/architecture/frontend.md` |
| API behaviour | start at `docs/architecture/api-and-sdk.md` |
| validation or CI quality | start at `docs/architecture/testing-and-quality.md` |

## Guardrails

- Root `AGENTS.md` is a map, not a manual.
- Do not add root atlas links to files that do not exist.
- App and package root `README.md` files are canonical local docs.
- `docs/architecture/*` should define durable boundaries, not work logs.
- Planned package areas must stay labelled as planned until package manifests,
  source exports and verification exist.
- `docs/repo-status-outline.html` is a manually refreshed snapshot, not a
  source of truth.
- Treat old or imported planning material as source material until revalidated.

---
status: canonical
last_reviewed: 2026-07-14
source_of_truth: docs
confidence: high
---

# Package ownership

Package ownership defines where new TaxKit code should belong as the repo
grows and which package will be allowed to define canonical contracts. It does
not imply that every named package exists today.

## Scope

This doc routes ownership decisions. [Package boundaries](./package-boundaries.md)
contains the proposed package map and dependency direction.

Current implemented code lives in:

- `apps/api`
- `apps/docs`
- `apps/web`
- `packages/core`
- `packages/calculators`
- `packages/docs-content`
- `packages/docs-fumadocs`
- `packages/api/http`
- `packages/sdk/typescript`
- `packages/rules/au/income-tax`
- `packages/rules/au/pay`
- `packages/rules/au/stsl`
- `packages/scripts`
- `packages/testing`
- `packages/tsconfig`

Current planned ownership placeholder:

- `packages/ui`

The placeholder directories contain README guidance only. Do not route runtime
imports, source ownership or build expectations to them until package manifests
and source exports exist.

## Main areas

`packages/core`
: Implemented shared primitives, fact descriptors, rule descriptors, graph
metadata, trace and ledger contracts, common tagged errors and calculation
engine service.

`packages/domain/au/*`
: Planned Australian date dimensions and domain facts that are not owned by a
single rule pack.

`packages/rules/au/*`
: Official Australian rule packs, parameter tables, algorithms, source
references, graph metadata, rule-owned calculator ids/context literals and
golden tests. Current implemented packages are `pay`, `income-tax` and `stsl`.

`packages/testing`
: Shared test helpers for workspace packages. It must not become a back door
for production-only runtime helpers.

`packages/scripts`
: Implemented private repository-automation package. It owns schema-backed,
  Effect-native orchestration that crosses package owners, including the
  release-readiness command, its command-runner service, live process layer,
  deterministic test layer and runtime entrypoint. It invokes canonical root
  and package commands without moving or duplicating their validator logic.

`packages/api/http`
: Implemented HTTP API package. It owns Effect HTTP API definitions, boundary
schemas, thin server handlers, OpenAPI, typed HTTP clients and HTTP
status/transport annotations.

`packages/calculators`
: Implemented reusable calculator orchestration package. It owns calculator
catalog composition schemas, calculator service methods, metadata projections,
graph response construction, schema-guided error shaping and
rule-pack/scenario composition used by HTTP, SDK, CLI and in-process callers.
It also owns the canonical reusable calculator run schemas named
`CalculatorRun*` and the `CalculatorServiceError` union. HTTP-only public
envelopes and status annotations stay in `packages/api/http`; SDK schema
exports may re-export calculator-owned run contracts but must not duplicate
them. It depends on `packages/core` and rule packages, but it must not depend
on HTTP handlers, SDK clients, CLI commands or app runtime modules.

`packages/sdk/typescript`
: Implemented private TypeScript SDK package for a future public SDK
publication. It owns browser-safe schemas, typed calculation facades,
Effect-native subpaths, jurisdiction modules, examples, compatibility tests and
packed-artifact checks. Its strict downstream validator may orchestrate the
nine-package release closure and materialize package-declared publication
exports in temporary tarballs, but package manifests and exports remain owned
by their packages. It must not depend on `@taxkit/api-http`; HTTP
transports consume the SDK rather than the reverse. Its Effect entrypoint owns
request-preserving calculator helpers such as `calculateRunRequest`,
`calculateReportRequest` and `calculateReport`, while reusing
calculator-owned `CalculatorRun*` schemas and `CalculatorServiceError`.

`apps/web`
: Current scaffold app. It proves the runtime boundary and health endpoint
while a future product workflow is still unscoped.

`apps/docs`
: Implemented public documentation app. It owns TanStack Start routes, the
  docs app shell, route loaders, search/navigation presentation and app-local
  MDX component composition. It consumes package-owned content and Fumadocs
  helpers, but does not own canonical frontmatter, navigation, generated source
  or reusable Fumadocs integration contracts.

`apps/api`
: Current standalone Bun API runtime. It owns process config, startup,
shutdown and platform serving for the implemented API app.

`packages/docs-content`
: Implemented private source-only content package. It owns TaxKit docs
  frontmatter, meta, navigation, validation issues, tagged docs errors,
  `DocsContentService`, the Fumadocs `source.config.ts` for
  `apps/docs/content` and the generated `.source/*` boundary. It can read raw
  MDX source text for validation policy, but app routes should use its service
  and client exports instead of importing source files directly.

`packages/docs-fumadocs`
: Implemented private reusable package for generic Fumadocs integration. It
  owns Effect Schema to Standard Schema bridging, shared MDX compile config,
  source-loader adapters, page-tree helpers and generic browser-safe MDX render
  primitives. It must not own TaxKit-specific frontmatter, navigation,
  validation policy, routes or generated content.

## Runtime shape

Engine packages should be deterministic and reusable. Runtime-specific code
belongs in apps or explicitly server-only package exports.

## Guardrails

- Define canonical schemas in the owning package.
- Owning packages define canonical schemas, schema-derived types, branded ids,
  constructors, service tags and tagged errors. Non-owners may adapt unknown
  inputs at boundaries, but MUST import the canonical contracts instead of
  redeclaring object shapes or fields such as `id: string`.
- Define reusable config schemas in the package that owns the runtime contract,
  then compose and provide them from app-specific config modules.
- Import from the owner instead of redefining boundary values locally.
- Add server-only exports for filesystem, HTTP server and Node adapters.
- Keep React in apps or docs packages only.
- Keep cross-package command orchestration in `packages/scripts`, but keep each
  validator and its domain policy with the package or app it validates.
- Keep app-specific MDX components in `apps/docs`; promote only generic,
  repeated Fumadocs primitives to `packages/docs-fumadocs/render` or repeated
  TaxKit UI primitives to `packages/ui`.
- Do not add flat engine packages once nested domain or rule ownership exists.
  `packages/calculators` is allowed because it is a cross-surface
  orchestration package rather than a jurisdiction/domain/rule package.
- Keep HTTP handlers thin. Transport handlers may extract route parameters and
  call package-owned services, but reusable calculator lookup, metadata
  transformation, graph assembly, calculation dispatch and expected error
  shaping belong in service packages such as `packages/calculators`. The
  current calculate handler is thinner still: it selects the SDK descriptor for
  the route calculator id, calls `@taxkit/sdk/effect` `calculateRunRequest`
  once, and maps only transport envelopes.

## Related docs

- [Package boundaries](./package-boundaries.md)
- [Effect services](./effect-services.md)
- [API and SDK](./api-and-sdk.md)

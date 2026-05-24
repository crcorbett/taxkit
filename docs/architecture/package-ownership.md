---
status: canonical
last_reviewed: 2026-05-23
source_of_truth: docs
confidence: medium
---

# Package Ownership

Package ownership defines where new WhatTax code should belong as the repo
grows and which package will be allowed to define canonical contracts. It does
not imply that every named package exists today.

## Scope

This doc routes ownership decisions. [Package boundaries](./package-boundaries.md)
contains the proposed package map and dependency direction.

Current implemented code lives in:

- `apps/api`
- `apps/web`
- `packages/core`
- `packages/http-api`
- `packages/rules/au/income-tax`
- `packages/rules/au/pay`
- `packages/rules/au/stsl`
- `packages/testing`
- `packages/tsconfig`

Current planned ownership placeholders:

- `packages/api/http`
- `packages/calculators`
- `packages/scripts`
- `packages/ui`

The placeholder directories contain README guidance only. Do not route runtime
imports, source ownership or build expectations to them until package manifests
and source exports exist.

## Main Areas

`packages/core`
: Implemented shared primitives, fact descriptors, rule descriptors, graph
metadata, trace and ledger contracts, common tagged errors and calculation
engine service.

`packages/domain/au/*`
: Planned Australian date dimensions and domain facts that are not owned by a
single rule pack.

`packages/rules/au/*`
: Official Australian rule packs, parameter tables, algorithms, source
references, graph metadata and golden tests. Current implemented packages are
`pay`, `income-tax` and `stsl`.

`packages/testing`
: Shared test helpers for workspace packages. It must not become a back door
for production-only runtime helpers.

`packages/api/http`
: Planned long-term home for Effect HTTP API definitions, boundary schemas,
thin server handlers, OpenAPI and HTTP status/transport annotations. The
implemented API package is currently `packages/http-api`.

`packages/calculators`
: Planned reusable calculator orchestration package. It should own calculator
catalog schemas, calculator service methods, metadata projections, graph
response construction, schema-guided error shaping and rule-pack/scenario
composition used by HTTP, SDK, CLI and in-process callers. It should depend on
`packages/core` and rule packages, but it must not depend on HTTP handlers,
SDK clients, CLI commands or app runtime modules.

`packages/sdk/typescript`
: Planned browser-safe client, schemas, request builders, server helpers,
examples and compatibility tests.

`apps/web`
: Current scaffold app. It proves the runtime boundary and health endpoint
while the public docs/API app structure is being built.

`apps/api`
: Current standalone Bun API runtime. It owns process config, startup,
shutdown and platform serving for the implemented API app.

## Runtime Shape

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
- Do not add flat engine packages once nested domain or rule ownership exists.
  `packages/calculators` is allowed because it is a cross-surface
  orchestration package rather than a jurisdiction/domain/rule package.
- Keep HTTP handlers thin. Transport handlers may extract route parameters and
  call package-owned services, but reusable calculator lookup, metadata
  transformation, graph assembly, calculation dispatch and expected error
  shaping belong in service packages such as `packages/calculators`.

## Related Docs

- [Package boundaries](./package-boundaries.md)
- [Effect services](./effect-services.md)
- [API and SDK](./api-and-sdk.md)

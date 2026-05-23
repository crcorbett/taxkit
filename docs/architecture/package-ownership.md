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
- `packages/http-api`
- `packages/tsconfig`

Current planned ownership placeholders:

- `packages/core`
- `packages/scripts`
- `packages/ui`

The placeholder directories contain README guidance only. Do not route runtime
imports, source ownership or build expectations to them until package manifests
and source exports exist.

## Main Areas

`packages/core/*`
: Planned shared primitives, fact descriptors, rule descriptors, graph
metadata, trace and ledger contracts, common tagged errors and Effect helpers.

`packages/domain/au/*`
: Planned Australian date dimensions and domain facts that are not owned by a
single rule pack.

`packages/rules/au/*`
: Planned official Australian rule packs, parameter tables, algorithms, source
references, graph metadata and golden tests.

`packages/api/http`
: Planned long-term home for Effect HTTP API definitions, boundary schemas,
server handlers, OpenAPI and handler layers that compose engine calculators.
The implemented API package is currently `packages/http-api`.

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
- Define reusable config schemas in the package that owns the runtime contract,
  then compose and provide them from app-specific config modules.
- Import from the owner instead of redefining boundary values locally.
- Add server-only exports for filesystem, HTTP server and Node adapters.
- Keep React in apps or docs packages only.
- Do not add flat engine packages once nested ownership exists.

## Related Docs

- [Package boundaries](./package-boundaries.md)
- [Effect services](./effect-services.md)
- [API and SDK](./api-and-sdk.md)

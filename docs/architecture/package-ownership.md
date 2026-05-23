---
status: canonical
last_reviewed: 2026-05-23
source_of_truth: docs
confidence: medium
---

# Package Ownership

Package ownership defines where new WhatTax code belongs and which package is
allowed to define canonical contracts.

## Scope

This doc routes ownership decisions. [Package boundaries](./package-boundaries.md)
contains the proposed package map and dependency direction.

## Main Areas

`packages/core/*`
: Shared primitives, fact descriptors, rule descriptors, graph metadata, trace
and ledger contracts, common tagged errors and Effect helpers.

`packages/domain/au/*`
: Australian date dimensions and domain facts that are not owned by a single
rule pack.

`packages/rules/au/*`
: Official Australian rule packs, parameter tables, algorithms, source
references, graph metadata and golden tests.

`packages/api/http`
: Effect HTTP API definitions, boundary schemas, server handlers, OpenAPI and
handler layers that compose engine calculators.

`packages/sdk/typescript`
: Browser-safe client, schemas, request builders, server helpers, examples and
compatibility tests.

`apps/web`
: Current scaffold app. It proves the runtime boundary and health endpoint
while the public docs/API app structure is being built.

## Runtime Shape

Engine packages should be deterministic and reusable. Runtime-specific code
belongs in apps or explicitly server-only package exports.

## Guardrails

- Define canonical schemas in the owning package.
- Import from the owner instead of redefining boundary values locally.
- Add server-only exports for filesystem, HTTP server and Node adapters.
- Keep React in apps or docs packages only.
- Do not add flat engine packages once nested ownership exists.

## Related Docs

- [Package boundaries](./package-boundaries.md)
- [Effect services](./effect-services.md)
- [API and SDK](./api-and-sdk.md)

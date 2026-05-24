---
status: scaffold
last_reviewed: 2026-05-24
source_of_truth: package-readme
confidence: medium
---

# TypeScript SDK

Scaffold for the public WhatTax TypeScript SDK package.

## Scope

`packages/sdk/typescript` owns the planned TypeScript SDK facade for
in-process WhatTax calculations, schema exports and typed module composition.
The package is private while the SDK surface is implemented and downstream
consumer validation is recorded.

This scaffold establishes package metadata, TypeScript build wiring and
explicit export paths only. Calculator execution, typed descriptors, the plain
facade, AU convenience clients, HTTP API integration and downstream validation
belong to later SDK tasks.

## Export Paths

- `@whattax/sdk`
- `@whattax/sdk/effect`
- `@whattax/sdk/au`
- `@whattax/sdk/au/effect`
- `@whattax/sdk/schemas`
- `@whattax/sdk/testing`

The root, AU and schema entrypoints are intended to remain browser-safe. Effect
entrypoints may expose Effect-native types once the facade is implemented.

## Guardrails

- Keep this package independent from `@whattax/http-api`.
- Do not import AU rule packages from the root entrypoint.
- Reuse canonical schemas, branded ids, service contracts, tagged errors and
  constructors from owning packages when implementation starts.
- Use `@whattax/calculators` as the calculator execution boundary instead of
  duplicating catalog lookup or calculation dispatch.
- Keep transport-owned HTTP clients and OpenAPI helpers in
  `@whattax/http-api` or future transport packages.

## Commands

```sh
bun run --filter=@whattax/sdk check-types
bun run --filter=@whattax/sdk build
bun run --filter=@whattax/sdk check-boundaries
```

## Related Docs

- `docs/product-specs/typescript-sdk-and-publishing.md`
- `docs/architecture/api-and-sdk.md`
- `docs/architecture/package-ownership.md`
- `docs/architecture/package-boundaries.md`
- `docs/architecture/testing-and-quality.md`

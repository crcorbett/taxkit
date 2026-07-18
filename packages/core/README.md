---
status: canonical
last_reviewed: 2026-05-23
source_of_truth: package-readme
confidence: medium
---

# Core

Shared deterministic TaxKit engine primitives and orchestration package.

## Scope

`packages/core` owns foundational primitives, facts, rule descriptors, graph
metadata, traces, ledgers, common tagged errors and the calculation engine
service.

## Main Areas

- `src/primitives`: money, rounding, dates and tax scalar helpers
- `src/facts`: fact descriptors and service metadata
- `src/rules`: rule descriptors
- `src/parameters`: parameter descriptors
- `src/graph`: rule graph validation
- `src/trace`: schema-backed trace nodes
- `src/ledger`: schema-backed ledger components
- `src/engine`: calculation engine service

## Runtime Shape

Core is deterministic and reusable. It must not import app runtime code, React,
HTTP handlers or filesystem adapters.

## Guardrails

- Use Effect Schema for boundary values and derive exported types from
  canonical schemas.
- Reuse canonical schemas, branded ids and constructors. Do not redeclare
  canonical fields such as `id: string` in consumers.
- Use Effect-native primitives such as `Array`, `HashMap`, `HashSet`, `Match`,
  `Context`, `Layer`, `Record`, `Result` and `Exit` where they fit.
- Keep money and rounding explicit.
- Use `IsoDate` and `isoDate` for effective-period and source-retrieval dates.
  Both paths enforce one real Gregorian-calendar `YYYY-MM-DD` invariant;
  malformed dates and impossible dates such as `2026-02-29` are rejected.
- Use package-owned descriptors and tagged errors.
- Keep engine inputs separate from application state.
- Add tests and explicit package exports with each new public subpath.

## Commands

```sh
bun run --filter=@taxkit/core check-types
bun run --filter=@taxkit/core test
bun run --filter=@taxkit/core build
```

## Packaging

The build removes `dist` before compiling. Workspace exports retain `source`
conditions, while `publishConfig.exports` and `files` define a dist-only
tarball. The SDK-owned strict downstream gate validates the actual Bun-packed
artifact and its concrete dependency ranges.

## Related Docs

- `docs/architecture/package-ownership.md`
- `docs/architecture/facts.md`
- `docs/architecture/rules-and-parameters.md`
- `docs/architecture/graph-trace-ledgers.md`

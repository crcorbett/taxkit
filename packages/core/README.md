---
document_type: package-readme
lifecycle: current
authority: canonical
owner: taxkit-core-owner
last_reviewed: 2026-10-06
review_trigger: schemas, exports, calculator contract or runtime ownership change
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
  canonical schemas. `LedgerComponent` and its encoded alias are inferred from
  their owning Schema. `TraceNode` keeps a local recursive children relation;
  its remaining type and encoded fields come from one shared field Schema.
  The exported type aliases cannot be extended by interface declaration merging.
  Their existing encoded field order, omitted/undefined keys and nested values
  remain unchanged and are checked by the genuine packed consumer.
- Reuse canonical schemas, branded ids and constructors. Do not redeclare
  canonical fields such as `id: string` in consumers.
- Use Effect-native primitives such as `Array`, `HashMap`, `HashSet`, `Match`,
  `Context`, `Layer`, `Record`, `Result` and `Exit` where they fit.
- Keep money and rounding explicit. `aud` takes already checked `Cents` and
  returns Money directly. Use `audFromCents` or `audDollars` when a number needs
  checking; they return Effects with `InvalidMoneyValue`. Addition, subtraction,
  money rounding, exact decimal conversion and ledger totals check each new
  constrained amount and return that error when it cannot fit safe whole cents.
  `taxRate` and `decimalCoefficient` return `InvalidDecimalValue` for strings
  the installed decimal parser rejects. Their existing valid values and rounding
  stay unchanged; the parser's existing empty-string-as-zero case is retained.
  Decimal-to-cent rounding checks extreme exponents before constructing powers:
  oversized non-zero results fail, and tiny amounts round to zero.
- Use `IsoDate` and `isoDate` for effective-period and source-retrieval dates.
  Both paths enforce one real Gregorian-calendar `YYYY-MM-DD` invariant;
  malformed dates and impossible dates such as `2026-02-29` are rejected.
  `DateInterval` owns the whole-record start-before-end check, so direct Schema
  decoding and the convenience constructor both reject empty/reversed intervals.
  `isoDate`, `dateInterval` and `australianTaxYearInterval` return Effects with
  `InvalidCalendarValue`. The Australian helper checks the full year label,
  including its matching next-year suffix and representable July boundaries.
  Generic `TaxYear` remains an open identifier.
  The interval's end is `Option<Option<IsoDate>>`: outer None keeps a missing
  key, Some(None) keeps a present undefined key, and Some(Some(date)) keeps an
  end date. Flatten it when both absence forms mean no end. The owning codec
  preserves the original bytes and key presence; both its decoded and encoded
  forms enforce start-before-end. An absent end is unbounded.
- `Money` admits AUD only. Arithmetic consumes checked Money values; currency
  admission belongs to that Schema rather than a duplicate arithmetic guard.
- Use package-owned descriptors and tagged errors.
- Keep engine inputs separate from application state.
- Add tests and explicit package exports with each new public subpath.

## Commands

```sh
bun run --filter=@taxkit/core check-types
bun run --filter=@taxkit/core test
bun run --filter=@taxkit/core build
```

`check-types` includes source and deterministic tests. The build uses its
separate source-only configuration, preserving the existing `dist` paths.
Core requests no automatically loaded type packages (`types: []`). Its source
and tests use explicit imports, so a clean build does not depend on Node types
being available through another workspace package.

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

## Browser Schema entrypoints

The browser-safe `@taxkit/core/engine/schemas` entrypoint owns `CalculationDiagnostics` without importing the live engine. Existing core/engine/root exports re-export the same class.

The [transport architecture](../../docs/architecture/api-and-sdk.md) and active clean-slate plan own application use and proof limits.

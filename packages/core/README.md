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
- Trace formula/rounding and question help text use one `Option` per field.
  Absence has one semantic meaning; encoded values omit absent fields. Legal
  source artifact evidence keeps its independently checked representation.
- `CalculationError` contains a safe message and a closed reason: rule, graph or
  output invariant. Opaque diagnostic storage is removed.
- Fact, parameter and rule descriptors derive ordinary fields from private
  Schemas. Their generic value Schema, service key and Layer relations remain
  explicit. Fact questions and source artifacts are Options; their constructor
  inputs still accept checked values or an omitted question/artifact.
  Rule parameters are always an array, defaulting to empty. Duplicate-provider
  permission is an Option that preserves explicit false. Service tuple types
  read each descriptor key's native `Identifier`, including empty tuples.
- There is no calculation engine service. `defineCalculator` validates the
  rule graph once and returns a closed `calculate` program; owners compose their
  static rule-pack Layers and supply only the checked scenario per call (see
  [ADR 0012](../../docs/adr/0012-closed-calculator-programs.md)). Every result
  carries that definition's `CalculationDiagnostics`.
- Reuse canonical schemas, branded ids and constructors. Do not redeclare
  canonical fields such as `id: string` in consumers.
- Use Effect-native primitives such as `Array`, `HashMap`, `HashSet`, `Match`,
  `Context`, `Layer`, `Record`, `Result` and `Exit` where they fit.
- Money is signed AUD in safe integer cents. `Money.fromCents(Cents.make(...))`
  constructs trusted constants. Result operations and symmetric decimal codecs
  live at `@taxkit/core/money`; primitive Effect operations lift the same checks
  lazily. Dynamic cents and exact decimal text are checked without numeric-dollar
  rounding. `NonNegativeMoney` is required for scenario inputs. Arithmetic checks
  overflow, and statutory rounding policies remain explicit. Reports and ledgers
  keep aggregate checks on their owning Type and explicit encoded Schemas.
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
```

`check-types` includes source and deterministic tests. Core requests no automatically loaded type packages (`types: []`). Its source
and tests use explicit imports, so a clean check does not depend on Node types
being available through another workspace package.

## Packaging

This private package exports its TypeScript source and has no build. The SDK
compiles it into its single archive; the SDK-owned downstream check validates
that packed archive and its dependency ranges.

## Export paths

Every public subpath in the package export map:

- `@taxkit/core`
- `@taxkit/core/primitives`
- `@taxkit/core/facts`
- `@taxkit/core/parameters`
- `@taxkit/core/errors`
- `@taxkit/core/engine`
- `@taxkit/core/rules`
- `@taxkit/core/graph`
- `@taxkit/core/trace`
- `@taxkit/core/ledger`
- `@taxkit/core/engine/schemas`
- `@taxkit/core/money`

## Related Docs

- `docs/architecture/package-ownership.md`
- `docs/architecture/facts.md`
- `docs/architecture/rules-and-parameters.md`
- `docs/architecture/graph-trace-ledgers.md`

## Browser Schema entrypoints

The browser-safe `@taxkit/core/engine/schemas` entrypoint owns `CalculationDiagnostics` without importing the live engine. Existing core/engine/root exports re-export the same class.

The [transport architecture](../../docs/architecture/api-and-sdk.md) owns application use and proof limits.

# Core Hardening Productionization

This file records the follow-up hardening goal for the calculation engine. It is
the working checklist for the slice after the initial spike-to-production pass.

## Goal

Productionize the TaxKit core calculation engine further by tightening
compile-time rule metadata, effective-period modelling, source artifact
auditability, numeric precision, engine orchestration, and repository hygiene.

The work is scoped to calculation-engine packages and their supporting
standards. It does not include UI, API route design, SDK ergonomics, or private downstream
consumer workflows.

## Constraints

- Keep values Schema-backed and branded at public boundaries.
- Keep rules, parameters, scenarios, and the engine expressed as Effect
  services and Layers.
- MUST use Effect primitives and algorithms over ad hoc JavaScript collections.
- Use Effect `BigDecimal` for official decimal rates and coefficients.
- Use date-level effective intervals where official rules can change mid-year.
- Keep source artifact metadata close to the official parameter descriptor.
- Keep tests outside `src` unless build config explicitly excludes them.
- Use public package entrypoints in tests; use deep `src` imports only for
  intentional white-box tests.
- Keep Knip configuration lean by fixing package metadata before adding
  ignores.

## Checklist

- [x] Add typed rule-descriptor builders that infer provided and required
      services from fact and parameter descriptor tuples.
- [x] Replace tax-year-only parameter effective periods with half-open ISO date
      intervals.
- [x] Add source artifact metadata for official parameter extractions.
- [x] Move official tax rates and coefficients to Effect `BigDecimal`.
- [x] Add numeric helpers for decimal-rate cent arithmetic and official decimal
      dollar constants.
- [x] Add a core `CalculationEngine` service/layer for reusable Effect-native
      calculation execution.
- [x] Route representative calculator tests through `CalculationEngineLive`.
- [x] Prefer package public exports in tests that are not white-box tests.
- [x] Keep build output ignored and untracked.
- [x] Reduce Knip overrides by removing unused `@taxkit/tsconfig`
      dependencies instead of suppressing them.
- [x] Add a changeset for the core hardening work.
- [x] Run full verification: `bun run check`, `bun run knip`,
      `bun run check-types`, and `bun run test`.

## Change Record

### 2026-05-12

- Added branded `IsoDate` and `DateInterval` primitives for half-open
  effective periods.
- Changed parameter descriptors to use date intervals, including the STSL
  Schedule 8 mid-year start date of `2025-09-24`.
- Added `SourceArtifact`, `SourceExtract`, and source checksum metadata to
  official parameter descriptors and rule-pack snapshots.
- Changed `TaxRate` and `DecimalCoefficient` to Schema-backed Effect
  `BigDecimal` values.
- Added cent arithmetic helpers so tax formulas multiply integer cents by exact
  decimal rates and coefficients before rounding once.
- Added `CalculationEngineLive` as the core service for running typed
  calculation programs with selected Layers and diagnostics.
- Updated representative calculator tests to run through the engine service and
  moved black-box tests toward package public import paths.
- Removed unused package-level `@taxkit/tsconfig` dev dependencies so Knip can
  pass without dependency ignore overrides.
- Verification passed with `bun run check`, `bun run knip`,
  `bun run check-types`, and `bun run test`.

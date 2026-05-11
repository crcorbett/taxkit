# Core Calculation Productionization

This file is the working checklist and change record for productionizing the current WhatTax calculation-engine spikes. It is intentionally detailed so work can resume from this document without relying on chat history.

## Goal

Productionize WhatTax's core calculation engine from the recent spike branch into reviewable, production-named, type-safe Effect-native packages.

The work is scoped to core calculation functionality only: facts, parameters, rules, rule packs, calculators, traces, ledgers, graph metadata, validation, and deterministic tests. It does not include adad, UI workflows, hosted APIs, SDK ergonomics, docs-site polish, or consumer application behavior except where package boundaries need to protect the calculation engine.

## Architectural Constraints

- Keep the implementation extremely type-safe and Effect TS-native.
- Use the most modern TypeScript library baseline supported by the repo compiler. TypeScript 5.9 does not accept `ES2025` as a `lib` value, so the base config uses `ESNext`.
- Use Effect `Layer` composition as the primary rule and parameter composition mechanism.
- Use Effect Schema for every boundary value, persisted value, report shape, trace shape, and parameter table.
- Prefer branded schema values and derived types over plain strings, unbranded numbers, and structural-only contracts.
- Keep input facts, derived facts, and parameter services separate.
- Keep algorithms separate from tax-year data.
- Expose facts and rules through typed `Context` services and `Layer`s so missing dependencies are visible at compile time.
- Preserve deterministic calculation behavior: explicit inputs plus selected rule packs and parameter layers must produce reproducible reports/traces.
- Treat trace, ledger, source references, graph metadata, and validation as part of the engine contract, not debugging add-ons.
- Prefer Effect collections and algorithms (`HashMap`, `HashSet`, `Array`, `Graph`, `Option`) for engine validation logic instead of ad hoc JavaScript `Map`/`Set`/mutable arrays.
- Do not introduce consumer/UI/API concerns into engine packages.

## Source Audit Summary

Recent commits reviewed:

- `653595d` - take-home pay architecture spike.
- `0c230f1` - ledger component model and STSL package spike.
- `2484542` - annual income tax package spike.

Architecture docs reviewed:

- `docs/architecture/README.md`
- `docs/architecture/package-boundaries.md`
- `docs/architecture/facts.md`
- `docs/architecture/rules-and-parameters.md`
- `docs/architecture/calculators.md`
- `docs/architecture/graph-trace-ledgers.md`
- `docs/architecture/testing-and-validation.md`

The current spike branch proves the broad shape: `Layer`-provided facts, parameter services, composed rule packs, ledger components, trace trees, and focused calculators. It is not yet production-ready because spike package names, spike IDs, illustrative source refs, plain classes, raw numeric parameter fields, untyped thrown/died errors, and missing graph validation remain.

## Package Productionization Plan

- [x] Rename `packages/spike-au-pay` to production package path/name.
  - Target package names should align with `docs/architecture/package-boundaries.md`.
  - Likely split: pay facts/calculator in `@whattax/rules-au-pay`, PAYG withholding tables/rules in `@whattax/rules-au-payg`.
- [x] Rename `packages/spike-au-stsl` to `@whattax/rules-au-stsl`.
- [x] Rename `packages/spike-au-income-tax` to `@whattax/rules-au-income-tax`.
- [ ] Decide whether Medicare remains in the first annual-tax rule pack or moves to `@whattax/rules-au-medicare`.
- [x] Replace package imports, package names, lockfile entries, tests, and TS project references after renaming.
- [x] Replace all runtime IDs containing `spike-*`.
  - Fact IDs.
  - Rule IDs.
  - Component IDs.
  - Parameter service IDs.
  - Rule pack versions.
  - Error messages.
  - Test descriptions.
- [x] Remove `internal-spike` / `spike-fixture` source references from production rules.
- [x] Refresh the WhatTax workspace lockfile so new workspaces are present and Turbo no longer warns about missing packages.

## Type And Schema Productionization Plan

- [x] Upgrade core fact descriptors to carry schemas, typed authority, and stable IDs.
- [ ] Add optional question metadata where caller-collected input facts need it.
- [x] Add initial rule descriptors with typed provided facts, required facts, source policy, and layer reference.
- [ ] Add parameter descriptors or metadata where needed so parameter services can be included in graph validation.
- [x] Convert pay facts to schema-backed values.
- [x] Convert STSL facts and parameter tables to schema-backed values.
- [x] Convert annual income-tax facts, components, ledger, parameter tables, and reports to schema-backed values.
- [x] Convert take-home pay and annual-tax reports to schema-backed values.
- [x] Replace unbranded `string` years with branded income-year or parameter-year schemas.
- [x] Replace raw percentage/rate numbers with branded rate schemas where they cross boundaries.
- [x] Replace raw cents/range numbers with branded money/cent/range schemas where they cross boundaries.
- [ ] Ensure scenario layers decode unknown/input values through Effect Schema and fail with typed errors.
- [x] Replace thrown errors and `Effect.die` calculation paths with typed tagged errors.

## Core Calculation Coverage Plan

- [ ] PAYG withholding: official-source-backed Schedule 1 table coverage, Scale 1/2 behavior, tax-free-threshold true/false, weekly/fortnightly/monthly, rounding, and threshold boundaries.
- [ ] STSL: realistic multi-bracket behavior or isolated official-scope subset, active/zeroed/disabled behavior, PAYG composition, and salary-sacrifice interaction where in scope.
- [ ] Annual tax: income-tax marginal brackets, LITO phase-out, Medicare levy threshold/shade-in/full-rate behavior, liability floor, and bracket/threshold boundary tests.
- [ ] Cross-rule composition: PAYG plus STSL plus salary sacrifice, annual tax additive/subtractive ledger components, missing dependency visibility, and explicit aggregator replacement.
- [ ] Trace and ledger snapshots: rule IDs, source refs, inputs/outputs, rounding modes, ledger status, and explanation order.

## Graph Validation Plan

- [x] Build graph metadata from descriptors.
- [x] Validate no missing required providers for selected goals.
- [x] Validate no duplicate providers unless explicitly replaced.
- [x] Validate no cycles.
- [x] Validate source references for descriptors that require sources.
- [ ] Validate effective-date overlaps where effective periods are introduced.
- [ ] Add tests that fail on descriptor/layer drift.

## Verification Plan

- [x] Run focused engine typechecks.
- [x] Run focused engine tests.
- [ ] Run repo-wide typecheck if workspace dependency state allows it.
- [ ] Run repo-wide tests if workspace dependency state allows it.
- [ ] Record any environment blockers clearly in this file and in the final response.

## Checklist

- [x] Create this markdown tracker before code changes.
- [x] Baseline branch/workspace status recorded.
- [x] Package productionization completed.
- [ ] Type/schema productionization completed.
- [x] Typed calculation errors added.
- [x] Rule descriptors added.
- [x] Graph validation added.
- [ ] Calculation coverage expanded.
- [ ] Verification completed.

## Change Record

### 2026-05-11

- Created `codex/productionize-core-calculations` branch from the current WhatTax spike branch.
- Created this checklist and change record as the working source of truth.
- Moved the three calculation spike packages under production rule-package paths:
  - `packages/rules/au/pay` as `@whattax/rules-au-pay`.
  - `packages/rules/au/stsl` as `@whattax/rules-au-stsl`.
  - `packages/rules/au/income-tax` as `@whattax/rules-au-income-tax`.
- Added `packages/rules/au/*` to the WhatTax workspace and refreshed `pnpm-lock.yaml`; `pnpm list --depth -1 --recursive` now shows all three rule packages.
- Updated the TypeScript base config to use `lib: ["ESNext"]` and removed rule-package/core `ES2022` overrides.
- Verification: `pnpm --filter @whattax/core --filter @whattax/rules-au-pay --filter @whattax/rules-au-stsl --filter @whattax/rules-au-income-tax check-types` passes.
- Removed remaining `spike`/`spike-fixture` names from runtime packages and tests; the first productionization commit temporarily kept validation-only parameter source refs before the official-source data slice replaced them.
- Made fact descriptors schema-aware and converted current pay, STSL, annual-tax facts, ledgers, parameter tables, and calculator reports to schema-backed classes.
- Added branded core tax primitives for tax years, rates, decimal coefficients, and cents-or-infinity boundaries.
- Added schema-backed `CalculationError` and replaced rule-level `throw`/`Effect.die` failures with typed `Effect.fail(...)` paths.
- Verification after schema/error work: focused engine check-types and all 18 rule-package tests pass.
- Added core rule descriptors and graph validation for duplicate providers, missing providers, missing required sources, and cycles.
- Added descriptor arrays and graph tests for pay, STSL composition, and annual-tax rule packs.
- Verification after graph work: focused engine check-types pass; rule-package tests now cover 23 tests across 6 files and pass.
- Refactored graph validation to use Effect `HashMap`, `HashSet`, `Array`, `Option`, and the built-in `Graph.directed` / `Graph.isAcyclic` APIs instead of JavaScript `Map`, `Set`, and hand-rolled DFS.
- Updated annual income-tax parameters to official 2025-26 resident brackets, LITO, and Medicare levy threshold/shade-in source refs; refreshed annual-tax expected values to match those official tables.
- Verification after annual-tax/source and graph-refactor work: `pnpm --filter @whattax/core --filter @whattax/rules-au-pay --filter @whattax/rules-au-stsl --filter @whattax/rules-au-income-tax check-types` passes, and `pnpm --filter @whattax/rules-au-pay --filter @whattax/rules-au-stsl --filter @whattax/rules-au-income-tax test` passes with 23 tests across 6 files.
- Commit `55eb808` records the first verified productionization slice in the WhatTax submodule; parent adad commit `cefb981` records that submodule pointer.
- Replaced PAYG Schedule 1 validation coefficients with the official ATO Scale 2 coefficient rows and the ATO `whole weekly dollars + 99 cents` formula input.
- Replaced the STSL single-bracket validation shortcut with the official ATO Schedule 8 STSL component rows that apply from 24 September 2025 to 30 June 2026.
- Exported official source refs from PAYG, STSL, annual tax, LITO, and Medicare parameter modules and marked the corresponding calculation rule descriptors as `sourcePolicy: "required"`.
- Verification after official PAYG/STSL source work: focused engine check-types pass, and rule-package tests pass with 23 tests across 6 files.

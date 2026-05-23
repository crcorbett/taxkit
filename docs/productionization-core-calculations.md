# Core Calculation Productionization

This file is the working checklist and change record for productionizing the current WhatTax calculation-engine spikes. It is intentionally detailed so work can resume from this document without relying on chat history.

## Goal

Productionize WhatTax's core calculation engine from the recent spike branch into reviewable, production-named, type-safe Effect-native packages.

The work is scoped to core calculation functionality only: facts, parameters, rules, rule packs, calculators, traces, ledgers, graph metadata, validation, and deterministic tests. It does not include adad, UI workflows, hosted APIs, SDK ergonomics, docs-site polish, or consumer application behavior except where package boundaries need to protect the calculation engine.

## Architectural Constraints

- Keep the implementation extremely type-safe and Effect TS-native.
- Use the most modern TypeScript library baseline supported by the repo compiler. The repository uses the cataloged TypeScript version with `lib: ["ES2025"]`.
- Use Effect `Layer` composition as the primary rule and parameter composition mechanism.
- Use Effect Schema for every boundary value, persisted value, report shape, trace shape, and parameter table.
- Prefer branded schema values and derived types over plain strings, unbranded numbers, and structural-only contracts.
- Keep input facts, derived facts, and parameter services separate.
- Keep algorithms separate from tax-year data.
- Expose facts and rules through typed `Context` services and `Layer`s so missing dependencies are visible at compile time.
- Preserve deterministic calculation behavior: explicit inputs plus selected rule packs and parameter layers must produce reproducible reports/traces.
- Treat trace, ledger, source references, graph metadata, and validation as part of the engine contract, not debugging add-ons.
- Prefer Effect collections and algorithms (`HashMap`, `HashSet`, `Array`, `Graph`, `Option`, `Match`) for engine validation and closed-domain dispatch logic instead of ad hoc JavaScript `Map`/`Set`/mutable arrays or non-exhaustive switches.
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
- [x] Decide whether Medicare remains in the first annual-tax rule pack or moves to `@whattax/rules-au-medicare`.
  - Decision: keep the initial non-SAPTO Medicare levy rule in `@whattax/rules-au-income-tax` while it is only used as one annual-liability component. Split to `@whattax/rules-au-medicare` when Medicare-family/SAPTO/private-health variants need their own independently swappable pack.
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
- [x] Refresh the WhatTax workspace lockfile so new Bun workspaces are present and Turbo no longer warns about missing packages.

## Type And Schema Productionization Plan

- [x] Upgrade core fact descriptors to carry schemas, typed authority, and stable IDs.
- [x] Add optional question metadata where caller-collected input facts need it.
- [x] Add initial rule descriptors with typed provided facts, required facts, source policy, and layer reference.
- [x] Add parameter descriptors or metadata where needed so parameter services can be included in graph validation.
- [x] Convert pay facts to schema-backed values.
- [x] Convert STSL facts and parameter tables to schema-backed values.
- [x] Convert annual income-tax facts, components, ledger, parameter tables, and reports to schema-backed values.
- [x] Convert take-home pay and annual-tax reports to schema-backed values.
- [x] Replace unbranded `string` years with branded income-year or parameter-year schemas.
- [x] Replace raw percentage/rate numbers with branded rate schemas where they cross boundaries.
- [x] Replace raw cents/range numbers with branded money/cent/range schemas where they cross boundaries.
- [x] Ensure scenario layers decode unknown/input values through Effect Schema and fail with typed errors.
- [x] Replace thrown errors and `Effect.die` calculation paths with typed tagged errors.

## Core Calculation Coverage Plan

- [x] PAYG withholding: official-source-backed Schedule 1 table coverage, Scale 1/2 behavior, tax-free-threshold true/false, weekly/fortnightly/monthly, rounding, and threshold boundaries.
- [x] STSL: realistic multi-bracket behavior or isolated official-scope subset, active/zeroed/disabled behavior, PAYG composition, and salary-sacrifice interaction where in scope.
- [x] Annual tax: income-tax marginal brackets, LITO phase-out, Medicare levy threshold/shade-in/full-rate behavior, liability floor, and bracket/threshold boundary tests.
- [x] Cross-rule composition: PAYG plus STSL plus salary sacrifice, annual tax additive/subtractive ledger components, missing dependency visibility, and explicit aggregator replacement.
- [x] Trace and ledger snapshots: rule IDs, source refs, inputs/outputs, rounding modes, ledger status, and explanation order.

## Graph Validation Plan

- [x] Build graph metadata from descriptors.
- [x] Validate no missing required providers for selected goals.
- [x] Validate no duplicate providers unless explicitly replaced.
- [x] Validate no cycles.
- [x] Validate source references for descriptors that require sources.
- [x] Validate effective-date overlaps where effective periods are introduced.
  - Parameter descriptors now carry effective tax-year periods, and graph validation reports overlapping parameter descriptors for the same parameter ID.
- [x] Add tests that fail on descriptor/layer drift.

## Verification Plan

- [x] Run focused engine typechecks.
- [x] Run focused engine tests.
- [x] Run repo-wide typecheck if workspace dependency state allows it.
- [x] Run repo-wide tests if workspace dependency state allows it.
- [x] Record any environment blockers clearly in this file and in the final response.
  - No environment blockers remain for the verified WhatTax checks.

## Checklist

- [x] Create this markdown tracker before code changes.
- [x] Baseline branch/workspace status recorded.
- [x] Package productionization completed.
- [x] Type/schema productionization completed.
- [x] Typed calculation errors added.
- [x] Rule descriptors added.
- [x] Graph validation added.
- [x] Calculation coverage expanded.
- [x] Verification completed.

## Change Record

### 2026-05-11

- Created `codex/productionize-core-calculations` branch from the current WhatTax spike branch.
- Created this checklist and change record as the working source of truth.
- Moved the three calculation spike packages under production rule-package paths:
  - `packages/rules/au/pay` as `@whattax/rules-au-pay`.
  - `packages/rules/au/stsl` as `@whattax/rules-au-stsl`.
  - `packages/rules/au/income-tax` as `@whattax/rules-au-income-tax`.
- Added `packages/rules/au/*` to the WhatTax workspace and refreshed the workspace lockfile so all three rule packages are first-class packages.
- Updated the TypeScript base config away from rule-package/core `ES2022` overrides.
- Verification: focused engine `check-types` passes.
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
- Verification after annual-tax/source and graph-refactor work: focused engine `check-types` passes, and focused rule-package tests pass with 23 tests across 6 files.
- Commit `55eb808` records the first verified productionization slice in the WhatTax submodule; parent adad commit `cefb981` records that submodule pointer.
- Replaced PAYG Schedule 1 validation coefficients with the official ATO Scale 2 coefficient rows and the ATO `whole weekly dollars + 99 cents` formula input.
- Replaced the STSL single-bracket validation shortcut with the official ATO Schedule 8 STSL component rows that apply from 24 September 2025 to 30 June 2026.
- Exported official source refs from PAYG, STSL, annual tax, LITO, and Medicare parameter modules and marked the corresponding calculation rule descriptors as `sourcePolicy: "required"`.
- Verification after official PAYG/STSL source work: focused engine check-types pass, and rule-package tests pass with 23 tests across 6 files.
- Updated take-home-pay and annual-tax scenario layers to accept `unknown`, decode with `Schema.decodeUnknownEffect`, and provide facts through `Layer.effectContext`.
- Added malformed-input regression tests for the scenario layers.
- Verification after scenario-schema work: focused engine check-types pass, and rule-package tests pass with 25 tests across 6 files.
- Added official ATO Schedule 1 Scale 1 rows and removed the previous typed "Scale 1 not implemented" failure path; PAYG now derives Scale 1/2 behavior from the tax-free-threshold fact.
- Added a shared pay-period withholding scaler so weekly and fortnightly conversion stays exact and monthly withholding rounds to whole dollars after conversion, matching the ATO pay-period method.
- Refactored PAYG and STSL row lookups to use Effect `Array.findFirst` and `Option.match` rather than JavaScript `Array.find` plus nullable branching.
- Refactored pay-period withholding scaling to use Effect `Match.value` plus `Match.exhaustive` rather than a TypeScript `switch`, so new `PayPeriod` variants fail typecheck until handled.
- Replaced the remaining core/rule package `switch` statements with Effect `Match.value` plus `Match.exhaustive` for rounding modes, ledger component effects, and pay-period weekly-factor conversion; `rg "\bswitch\s*\(" packages/core/src packages/rules/au -g "*.ts"` now returns no matches.
- Expanded PAYG tests for Scale 1, fortnightly, monthly nearest-dollar rounding, and tax-free-threshold behavior.
- Expanded STSL tests for monthly PAYG+STSL rounding and the highest official Schedule 8 row.
- Expanded annual-tax tests for income-tax threshold, LITO phase-out boundaries, Medicare levy threshold/shade-in/full-rate boundaries, and liability floor behavior.
- Verification after coverage expansion: focused engine check-types pass, and rule-package tests pass with 31 tests across 6 files.
- Kept the first Medicare levy implementation in `@whattax/rules-au-income-tax` until independent Medicare-family/SAPTO/private-health variants justify a separate `@whattax/rules-au-medicare` rule pack.
- Added schema-backed question metadata for caller-collected input facts: gross pay, tax-free-threshold claimed, salary sacrifice, STSL debt, and annual taxable income.
- Added core parameter descriptors and parameter metadata for PAYG Schedule 1, STSL Schedule 8, income-tax rates, LITO, and Medicare levy tables.
- Extended rule descriptors with parameter descriptors and graph validation for parameter-source drift.
- Added graph tests that fail when a rule parameter's source is not listed on that rule descriptor.
- Added trace/ledger snapshot tests for PAYG-only, PAYG+STSL, and annual-tax component explanation order, source refs, rounding modes, ledger effects, and ledger statuses.
- Verification after descriptor/metadata/snapshot work: focused engine check-types pass, and rule-package tests pass with 38 tests across 6 files.
- Repo-wide verification after final Effect `Match` cleanup: `check-types` passes with 9 successful Turbo tasks, and `test` passes with 6 successful Turbo tasks.

### 2026-05-12

- Migrated the repository from pnpm to Bun workspaces, added `bun.lock`, and removed `pnpm-workspace.yaml` / `pnpm-lock.yaml`.
- Updated the workspace TypeScript catalog and dev dependency, then set the base compiler lib to `ES2025`.
- Configured Oxlint and Oxfmt to extend Ultracite provider configs directly, keeping `sort-keys`, `oxc/no-barrel-file`, and `jsdoc/check-tag-names` enforced.
- Replaced package `export *` barrels with explicit named exports so public entrypoints stay reviewable and bundler-friendly.
- Added public JSDoc coverage across core primitives, descriptors, graph validation, and AU rule packages without invalid `@category` tags.
- Added parameter effective periods and graph validation for overlapping parameter descriptors.
- Added descriptor-driven graph snapshots for AU pay, STSL, and income-tax rule packs.
- Added repository standards docs for code patterns, docstrings, tooling, and the architecture atlas.

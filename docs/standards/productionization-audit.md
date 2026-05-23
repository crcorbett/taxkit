# Productionization Audit

This audit captures structural improvements completed while hardening the core
calculation packages and repository standards.

## Completed In This Pass

- Added Ultracite with the Oxlint/Oxfmt provider.
- Migrated the repository to Bun workspaces and root catalog dependency
  management.
- Added root `bun run check` and `bun run fix` scripts through Ultracite.
- Enabled Oxlint type-aware mode with `oxlint-tsgolint`.
- Added Knip as the repository dependency and workspace hygiene check.
- Set the base TypeScript lib to `ES2025` and keep the compiler version in the
  root Bun catalog.
- Replaced `export *` barrels with explicit named exports.
- Added parameter effective periods and graph validation for overlapping
  parameter descriptors.
- Added GitHub Actions quality checks for `check`, `knip`, `check-types`, and
  `test`.
- Documented code patterns, formatting/lint rules, and docstring conventions.

## Structural Improvements

1. Done: public core primitives, descriptors, rule layers, parameter services,
   and official AU rule packages now have public JSDoc coverage.
2. Done: parameter descriptors include effective periods, and graph validation
   reports overlapping parameter periods.
3. Addressed: large parameter modules remain colocated because row schema,
   table schema, service tag, descriptor, source ref, and live layer still form
   one cohesive unit. Split only when a table grows independent behavior.
4. Done: descriptor-driven rule-pack graph snapshots are stable fixtures in
   the AU pay, STSL, and income-tax graph test suites.
5. Done: package entrypoints use explicit named exports instead of broad
   barrels.
6. Done: CI runs Bun-backed `check`, `knip`, `check-types`, and `test`.

## Audit Findings

- The Effect graph validation work is structurally sound: it now uses
  `HashMap`, `HashSet`, `Array`, `Option`, and `Graph`.
- Closed-domain dispatch now uses `Match.exhaustive`; there are no remaining
  `switch` statements in `packages/core/src` or `packages/rules/au`.
- Ultracite and Knip are configured at the root and enforced through Bun.
- Explicit named exports are required for package entrypoints; `export *`
  barrels are not allowed.
- Object key sorting is enabled and followed across source and tests.
- Public rule descriptors keep their full `Layer` generics, while graph
  validation consumes a structural erased descriptor that excludes the layer
  field. This avoids `any` while keeping graph validation independent from layer
  variance.

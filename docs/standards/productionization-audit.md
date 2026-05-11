# Productionization Audit

This audit captures the next structural improvements identified after
productionizing the initial core calculation packages.

## Completed In This Pass

- Added Ultracite with the Oxlint/Oxfmt provider.
- Added root `pnpm check` and `pnpm fix` scripts through Ultracite.
- Enabled Oxlint type-aware mode with `oxlint-tsgolint`.
- Added Knip as the repository dependency and workspace hygiene check.
- Set TypeScript libs to `ES2024`, the newest concrete lib accepted by the
  current TypeScript compiler. `ES2025` should be adopted once TypeScript
  exposes it as a valid `lib` target.
- Documented Effect patterns, formatting/lint rules, and docstring conventions.

## Structural Improvements To Prioritize

1. Add docstrings to all public core primitives, descriptor types, rule layers,
   and parameter services before the first public release.
2. Introduce a first-class effective-period type for parameter descriptors, then
   replace the current placeholder graph note with real overlap validation.
3. Split large parameter modules only when a table grows independent behavior.
   Until then, colocating row schema, table schema, service tag, descriptor, and
   source ref is acceptable.
4. Add rule-pack-level generated graph snapshots once descriptor generation is
   stable.
5. Decide whether package barrels should remain broad or move toward explicit
   named export files before publishing stable package entrypoints.
6. Add CI jobs for `pnpm check`, `pnpm knip`, `pnpm check-types`, and
   `pnpm test`.

## Audit Findings

- The Effect graph validation work is structurally sound: it now uses
  `HashMap`, `HashSet`, `Array`, `Option`, and `Graph`.
- Closed-domain dispatch now uses `Match.exhaustive`; there are no remaining
  `switch` statements in `packages/core/src` or `packages/rules/au`.
- The repo had no formatter/linter/dependency hygiene toolchain before this
  pass. Ultracite and Knip are now configured at the root.
- Public API barrels are intentional for an open-source library, so the
  Ultracite `no-barrel-file` rule is disabled rather than forcing private deep
  imports.
- Object key sorting is disabled because tax parameter rows, traces, and source
  refs need review-friendly domain ordering.
- Public rule descriptors keep their full `Layer` generics, while graph
  validation consumes a structural erased descriptor that excludes the layer
  field. This avoids `any` while keeping graph validation independent from layer
  variance.

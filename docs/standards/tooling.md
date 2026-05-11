# Formatting, Linting, And Dependency Hygiene

WhatTax uses Ultracite with the Oxlint and Oxfmt provider. This gives the repo a
fast default linter/formatter while still allowing WhatTax-specific overrides
for public-library architecture.

## Configured Tools

- `ultracite` wraps the configured provider commands.
- `oxlint.config.ts` extends `ultracite/oxlint/core` and
  `ultracite/oxlint/react`.
- `oxfmt.config.ts` spreads `ultracite/oxfmt`.
- `oxlint-tsgolint` is installed and `ultracite check --type-aware` is the
  default root check command.
- `knip` is configured in `knip.jsonc` for unused dependency and workspace
  hygiene.

The Ultracite docs describe the Oxlint/Oxfmt provider shape and formatter
defaults: root config files, 2-space indentation, 80-character line width,
semicolons, double quotes, and ES5 trailing commas.

## Root Commands

```sh
pnpm check
pnpm fix
pnpm knip
pnpm check-types
pnpm test
```

Use `pnpm check` for style and lint checks. Use `pnpm fix` only when you intend
to accept formatter and safe lint fixes. Use `pnpm knip` before publishing or
when changing package boundaries.

## WhatTax Overrides

The repo intentionally keeps these Ultracite/Oxlint rules disabled:

- `oxc/no-barrel-file`: public package entrypoints are part of the library API.
- `sort-keys`: domain objects, traces, source refs, and parameter rows should be
  ordered for readability and review, not alphabetically.
- `func-names`: `Effect.gen(function* () { ... })` is idiomatic and should not
  need artificial local names.
- `func-style`: named declarations are acceptable for small local helpers and
  generated framework entrypoints.
- `max-classes-per-file`: schema-backed rows, tables, and services often belong
  together in one parameter module.
- `unicorn/no-array-method-this-argument`: Effect `Array` helpers are not native
  JavaScript array method `thisArg` usage.

These overrides should stay narrow. Correctness, suspicious-code, import,
promise, TypeScript, React, Vitest, and JSDoc rules remain active through the
Ultracite presets.

## Formatting Rules

- Let Oxfmt own whitespace, quotes, import sorting, and wrapping.
- Avoid manual alignment that a formatter will remove.
- Keep generated files excluded or ignored rather than hand-editing generated
  output to satisfy lint rules.
- Prefer package-level public exports over deep imports from private modules.

## Knip Rules

Knip is configured at the root because WhatTax is a monorepo. Package entrypoints
are listed explicitly so public export maps are treated as intentional. The
initial scope is dependency, file, and boundary hygiene; public exports should
be reviewed manually before removal.

# Formatting, Linting, And Dependency Hygiene

WhatTax uses Bun workspaces and Ultracite with the Oxlint/Oxfmt provider. The
tooling is intentionally strict because WhatTax is intended to become a public
library with stable package boundaries and predictable bundle behavior.

## Configured Tools

- `bun` is the package manager and workspace runner.
- Root `package.json` owns workspace globs and catalog dependency versions.
- `ultracite` wraps the configured provider commands.
- `oxlint.config.ts` extends `ultracite/oxlint/core` and
  `ultracite/oxlint/react`.
- `oxfmt.config.ts` spreads `ultracite/oxfmt`.
- `oxlint-tsgolint` is installed and `ultracite check --type-aware` is the
  default root check command.
- `knip` is configured in `knip.json` for unused dependency and workspace
  hygiene.
- TypeScript is cataloged at the root and uses `ES2025` lib support.
- Changesets record package-facing changes before release automation exists.
  See [Versioning and Changesets](./versioning.md).

## Root Commands

```sh
bun run check
bun run fix
bun run knip
bun run changeset
bun run version-packages
bun run check-types
bun run test
```

Use `bun run check` for style and lint checks. Use `bun run fix` only when you
intend to accept formatter and safe lint fixes. Use `bun run knip` before
publishing or when changing package boundaries.

Use `bun run verification` after changes that affect docs routing, package
exports, Effect config composition, HTTP API contracts, runtime layers or
shared schemas. Package-filtered commands are useful during iteration, but
finish with the root verification gate when package wiring may be affected.

Add a changeset for package-facing changes:

```sh
bun run changeset
```

## Ultracite Rules

Do not disable a rule just because it is inconvenient. Treat Ultracite as the
default best-practice reference and change the code first.

Important enabled rules:

- `sort-keys`: public values, traces, fixtures, descriptors, and config objects
  use deterministic key ordering.
- `oxc/no-barrel-file`: package entrypoints use explicit named exports instead
  of `export *`, improving API review, bundling, and code splitting.
- `jsdoc/check-tag-names`: docstrings use only linter-recognized tags.

Current WhatTax-specific overrides are narrow:

- `func-names`: `Effect.gen(function* () { ... })` is idiomatic and should not
  need artificial local names.
- `func-style`: named declarations are acceptable for small local helpers and
  generated framework entrypoints.
- `max-classes-per-file`: schema-backed rows, tables, and services often belong
  together in one parameter module.
- `unicorn/no-array-method-this-argument`: Effect `Array` helpers are not native
  JavaScript array method `thisArg` usage.

## Formatting Rules

- Let Oxfmt own whitespace, quotes, import sorting, and wrapping.
- Avoid manual alignment that a formatter will remove.
- Keep generated files excluded or ignored rather than hand-editing generated
  output to satisfy lint rules.
- Prefer package-level public exports over deep imports from private modules,
  but keep those exports explicit and named.

## Knip Rules

Knip is configured at the root because WhatTax is a monorepo. Keep this config
lean: remove unused package dependencies or expose intentional public exports
through entrypoints before adding ignores. Knip is part of the required quality
gate alongside `check`, `check-types`, and `test`.

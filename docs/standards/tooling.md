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
bun run version-repo
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

Apply pending Changesets to the fixed release-train package versions and
changelogs only when intentionally preparing a versioning commit:

```sh
bun run version-repo
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

Current WhatTax-specific custom rules:

- `whattax/no-manual-tag`: bans manual `_tag` object literals. Use
  `Data.TaggedClass`, `Data.TaggedError`, `Schema.TaggedClass`, or an owning
  package constructor.
- `whattax/no-layer-exports-in-service-files`: bans `Live`, `Mock` and `Test`
  layer exports from `service.ts`/`services.ts` files. Service files own
  `Context.Service` contracts and canonical schemas; production wiring belongs
  in `live.layer.ts`, test wiring belongs in `test.layer.ts` or test helpers.
- `whattax/no-runtime-execution-outside-boundaries`: bans direct Effect runtime
  execution outside app/runtime boundary files. Package and service logic must
  return `Effect` values and layers; app entrypoints and runtime modules own
  `BunRuntime.runMain`, `ManagedRuntime.make` and runtime disposal.
- `whattax-no-switch/no-switch`: bans `switch`. Use Effect `Match` with
  exhaustive handling.
- `whattax/no-typeof`, `whattax/no-instanceof` and
  `whattax/no-in-operator`: scoped to `packages/calculators/src`. Calculator
  service code must decode with Schema and branch with `Option`, `Result`,
  `Exit` or `Match` instead of ad hoc runtime type probes.
- `whattax/no-undefined-comparison`: scoped to `packages/calculators/src`.
  Optional request policy must use `Schema.optional` plus `Option`, not
  `=== undefined` or `!== undefined`.
- `whattax/no-nullish-comparison`: scoped to `packages/calculators/src`.
  Nullable request policy must use `Schema.NullOr` or schema transforms plus
  `Option.fromNullable`, not raw `null` comparison.
- `whattax/no-conditional-object-spread`: scoped to
  `packages/calculators/src`. Optional response fields must be schema-owned,
  not built with conditional object spreads.
- `whattax/no-context-nullish-default`: scoped to
  `packages/calculators/src`. Calculator context must not invent jurisdiction
  or tax-year defaults with `??`; missing context must remain absent or fail
  through an owning schema/tagged error.
- `whattax/no-nested-wrapper-calls`: scoped to `packages/calculators/src`.
  Sequential calculator transformations must use pipe-first data flow such as
  `query.pipe(filterEntries, toResponse)` or `pipe(query, filterEntries,
  toResponse)`, not nested wrappers such as `toResponse(filterEntries(query))`.
- `whattax/no-native-array-methods`: scoped to `packages/calculators/src`.
  Calculator services must use Effect `Array` or `Chunk` helpers such as
  `Array.filter(items, predicate)`, `Array.findFirst(...)` and `Chunk.map(...)`
  instead of native `items.filter(...)`, `items.find(...)` or
  `items.reduce(...)`.
- `whattax/no-native-collections`: scoped to `packages/calculators/src`.
  Calculator services must use `HashMap` and `HashSet`, with `Option`-based
  lookups, instead of native `Map` and `Set` constructors.
- `whattax/no-throw`: scoped to `packages/calculators/src`. Calculator
  failures must be typed tagged errors returned through `Effect.fail`,
  `Effect.try` or `Effect.tryPromise`, not thrown exceptions.
- `whattax/no-async-await-promise`: scoped to `packages/calculators/src`.
  Calculator services must return `Effect` values and compose them with
  `Effect.gen`, `Effect.flatMap`, `Effect.all`, `Layer` and service
  dependencies instead of `async`, `await` or `new Promise`.
- `whattax/no-json-parse-stringify`: scoped to `packages/calculators/src`.
  Calculator boundary values must be decoded and encoded by owning schemas, for
  example `Schema.decodeUnknown`, `Schema.decodeJson`, `Schema.encode` or
  `Schema.encodeJson`, not ad hoc `JSON.parse` or `JSON.stringify`.
- `whattax/no-ambient-time-or-random`: scoped to `packages/calculators/src`.
  Calculator logic must receive time/randomness as explicit canonical input or
  through Effect boundary services such as `Clock` and `Random`; deterministic
  calculator services must not hide `Date.now`, `new Date` or `Math.random`.

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

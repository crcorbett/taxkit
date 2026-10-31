---
document_type: standard
lifecycle: current
authority: canonical
owner: taxkit-tooling-owner
last_reviewed: 2026-10-30
review_trigger: formatter, lint, dependency, typecheck, Changeset or root command change
---

# Formatting, Linting, And Dependency Hygiene

TaxKit uses Bun workspaces and Ultracite with the Oxlint/Oxfmt provider. The
tooling is intentionally strict because TaxKit publishes library packages with
stable boundaries.

## Configured Tools

- `bun` is the package manager and workspace runner. Root `package.json` owns
  the workspace globs and catalogue dependency versions.
- `oxlint.config.ts` extends the complete, unmodified `style` and `strict`
  presets from `@commonplaces/oxlint-plugin`. The shared package owns rule
  selection and default severity. Do not copy a subset, filter the presets,
  add local `off` settings, or weaken shared checks for a package.
  Local settings name semantic owners and exact host boundaries; they do not
  suppress shared preset checks. Repository plugins use `taxkit-effect`,
  `taxkit-bun`, `taxkit` and `taxkit-package`, so they cannot replace shared
  `effect`, `bun` or `package` rules.
- The published Commonplaces plugin is pinned to 0.8.0 with Oxlint 1.89.0,
  inside its supported range. Required Effect platform and test APIs use
  explicit `allowedUnstableApis` entries for the pinned release; the unstable
  API diagnostic remains enabled. Native Effect test callbacks are registered
  with Vitest's assertion rule rather than disabling it.
- `oxfmt.config.ts` spreads `ultracite/oxfmt` and preserves authored Markdown
  wrapping.
- TypeScript 7 is the root compiler. `@effect/tsgo` patches it at install and
  supplies Effect diagnostics; `bun run check:effect` runs them.
  The SDK assembler separately uses `typescript-ast`, an alias for TypeScript
  6.0.3, for its JavaScript compiler API; TypeScript 7 supplies the native
  compiler rather than that API.
- Effect and its versioned platform, Atom, SQL and test packages use 4.0.7.
  Alchemy and its provider/framework packages use beta.84. Effect 4.1 removes
  `effect/Crypto`, which Alchemy’s OAuth module still imports; 4.0.7 is the
  latest tested compatible release, despite the wider declared peer range. Miniflare follows
  the v5 beta line used by Wrangler; its `latest` tag still points to v4.
- `knip.json` checks development reachability and `knip.production.json`
  checks the published package and runtime graph, including the standalone
  API server Layer as an explicit host entry alongside the API Worker.
- The SDK's type and unit-test tasks depend on its own build: its package
  imports resolve through `dist`, so those tasks must wait while a rebuild
  replaces the assembled package.
- `tools/documentation` owns `bun run check:docs` and
  `tools/repository-paths` owns `bun run check:repository-paths`.
- Changesets record package-facing changes; see
  [Versioning and Changesets](./versioning.md).

## Root Commands

| Command | Use |
| --- | --- |
| `bun run verification` | Before merging: the five checks `build`, `lint`, `check-types`, `knip` and `test`. |
| `bun run lint` / `bun run fix` | Formatting, type-aware Oxlint with the boundary-directive pass, docs and path checks. |
| `bun run format` | Oxfmt. |
| `bun run check-types` | Workspace types plus the Alchemy roots, root tools and Effect diagnostics. |
| `bun run knip` | Both Knip graphs. |
| `bun run test` | Root tool tests, workspace unit tests, Chromium tests, then the native pair suite. |
| `bun run test:tools` / `bun run test:native` | Only the root tool tests, or only the slower native Website/API pair tests. |
| `bun run release:check` | `verification` plus packed SDK, downstream consumer, API smoke, docs validation and Changeset status. |

## Shared rules and repository ownership

The full shared presets are the source of truth. Native TypeScript/Effect,
Alchemy, React, accessibility, tests and convention checks apply repo-wide.
Ternaries are rejected through the shared preset, including outside MDX.
The shared `style` preset owns its compatibility settings; TaxKit does not
restate or change those settings.

Local ownership rules apply outside explicitly declared ingress, egress and
runtime boundaries. Their `excludeFiles` lists express those rules' ownership
scope and never exclude files from the shared presets. Domain package rules and
workspace dependency fences remain additive. Configured rule options stay at
error severity.

The native `package/workspace-import-boundaries` rule consumes checked current
manifests from `tools/oxlint/workspaces.boundary.ts`, including public export
conditions, wildcard/null fences and dependencies, devDependencies,
optionalDependencies and peerDependencies. Its synchronous Schema decode is an
exact configuration-host exception; it grants no application runtime execution
or decoder permission. `taxkit-package/workspace-roles` separately enforces
browser/backend and runtime/deployment roles. The architecture owner is
[package boundaries](../architecture/package-boundaries.md). Focused actual CLI
fixtures live in `tools/oxlint/workspace-imports.boundary.test.ts`; they
create temporary source/manifests and restore them in scoped finalizers, so run
them sequentially away from builds. Isolated exact-path fixtures copy the real
configuration, lint tools and root/workspace manifests, then run with that
temporary workspace as the command's working directory; the same native import
fences remain enabled. Ordinary temporary source fixtures stay inside the
repository's lint fixture directory. The manifest guard covers every actual
non-infrastructure package and rejects app dependencies in every dependency
field. Approved Alchemy Worker helpers remain available to app hosts.
Important portable rules include:

- `taxkit-effect/no-manual-tag`: bans manual `_tag` object literals. Use
  `Data.TaggedClass`, `Data.TaggedError`, `Schema.TaggedClass`, or an owning
  package constructor.
- `taxkit-effect/no-layer-exports-in-service-files`: bans `Live`, `Mock` and `Test`
  layer exports from `service.ts`/`services.ts` files, including named export
  specifiers and named re-exports. Service files own `Context.Service`
  contracts and canonical schemas; production wiring belongs in
  `live.layer.ts`, test wiring belongs in `test.layer.ts` or test helpers.
- `taxkit-effect/no-runtime-execution-outside-boundaries`,
  `taxkit-effect/no-console-outside-runtime` and
  `taxkit-effect/no-process-outside-boundaries`: keep execution and host lifecycle in
  exact files owned by `oxlint.config.ts`. Package and service logic returns
  `Effect` values and tagged failures. The rules resolve canonical imports,
  renamed bindings, aliases and statically known destructuring; lexically
  shadowed same-named locals are not host or runtime APIs.
- `taxkit-effect/no-schema-encoder-outside-egress` and
  `taxkit-effect/no-throwing-schema-sync-codec`: encode once at exact egress and use
  Effect or non-throwing Result/Exit/Option codecs. Canonical `Schema`
  imports, namespace imports, renamed bindings and statically known method
  aliases are all enforced.
- `taxkit-effect/no-unknown-service-contract` and
  `taxkit-effect/no-unknown-tagged-error-cause`: keep service inputs schema-derived and
  expected errors closed and tagged. Scope-resolved aliases of `Effect.Effect`,
  `Schema.Unknown`, `Schema.TaggedErrorClass` and `Data.TaggedError` remain
  subject to the same contract.
- `taxkit-effect/no-effect-test-global-mix`: rejects a file that splits unaliased
  `describe`, `expect`, `it` or `test` imports between `@effect/vitest` and
  `vitest`. Shared globals must have one owner. Vitest-only utilities such as
  `vi` and hooks may still come from `vitest`; an explicitly aliased secondary
  shared API is also valid.
- `taxkit-effect/no-module-level-mutable-test-state`: rejects module-level `let` and
  `var` in test files so one test cannot leak changed state into another.
  Immutable declarations, function-local variables and ambient declarations
  remain valid.
- `taxkit-effect/no-switch`: bans `switch`. Use Effect `Match` with
  exhaustive handling.
- `taxkit-bun/no-host-api-outside-adapters` and
  `taxkit-bun/no-runtime-outside-entrypoints`: keep Bun file/process/server APIs and
  `BunRuntime.runMain` in exact live/runtime/script boundaries. Global Bun
  methods and canonical platform runtime imports remain enforced through
  aliases and statically known destructuring without treating local objects
  named `Bun` or `BunRuntime` as host APIs. Non-host global Bun members such as
  `Bun.version` remain outside this rule, including direct and destructured
  access.

Current TaxKit-specific custom rules include:

- `taxkit/no-typeof`, `taxkit/no-instanceof` and
  `taxkit/no-in-operator`: scoped to `packages/calculators/src`. Calculator
  service code must decode with Schema and branch with `Option`, `Result`,
  `Exit` or `Match` instead of ad hoc runtime type probes.
- `taxkit/no-undefined-comparison`: scoped to `packages/calculators/src`.
  Optional request policy must use `Schema.optional` plus `Option`, not
  `=== undefined` or `!== undefined`.
- `taxkit/no-nullish-comparison`: scoped to `packages/calculators/src`.
  Nullable request policy must use `Schema.NullOr` or schema transforms plus
  `Option.fromNullable`, not raw `null` comparison.
- `taxkit/no-conditional-object-spread`: scoped to
  `packages/calculators/src`. Optional response fields must be schema-owned,
  not built with conditional object spreads.
- `taxkit/no-context-nullish-default`: scoped to
  `packages/calculators/src`. Calculator context must not invent jurisdiction
  or tax-year defaults with `??`; missing context must remain absent or fail
  through an owning schema/tagged error.
- `taxkit/no-nested-wrapper-calls`: scoped to `packages/calculators/src`.
  Sequential calculator transformations must use pipe-first data flow such as
  `query.pipe(filterEntries, toResponse)` or `pipe(query, filterEntries,
  toResponse)`, not nested wrappers such as `toResponse(filterEntries(query))`.
- `taxkit/no-native-array-methods`: scoped to `packages/calculators/src`.
  Calculator services must use Effect `Array` or `Chunk` helpers such as
  `Array.filter(items, predicate)`, `Array.findFirst(...)` and `Chunk.map(...)`
  instead of native `items.filter(...)`, `items.find(...)` or
  `items.reduce(...)`.
- `taxkit/no-native-collections`: scoped to `packages/calculators/src`.
  Calculator services must use `HashMap` and `HashSet`, with `Option`-based
  lookups, instead of native `Map` and `Set` constructors.
- `taxkit/no-throw`: scoped to `packages/calculators/src`. Calculator
  failures must be typed tagged errors returned through `Effect.fail`,
  `Effect.try` or `Effect.tryPromise`, not thrown exceptions.
- `taxkit/no-async-await-promise`: scoped to `packages/calculators/src`.
  Calculator services must return `Effect` values and compose them with
  `Effect.gen`, `Effect.flatMap`, `Effect.all`, `Layer` and service
  dependencies instead of `async`, `await` or `new Promise`.
- `taxkit/no-json-parse-stringify`: scoped to `packages/calculators/src`.
  Calculator boundary values must be decoded and encoded by owning schemas, for
  example `Schema.decodeUnknown`, `Schema.decodeJson`, `Schema.encode` or
  `Schema.encodeJson`, not ad hoc `JSON.parse` or `JSON.stringify`.
- `taxkit/no-ambient-time-or-random`: scoped to `packages/calculators/src`.
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

Knip is configured at the root because TaxKit is a monorepo. Keep both configs
lean: remove unused dependencies or correct intentional public exports and
entrypoints before adding exact, explained exceptions. `knip.production.json`
uses trailing `!` production patterns for the published packages, the API and
Website runtimes and the docs packages, and excludes tests and tools.

## Repository Path Hygiene

`bun run check:repository-paths` inventories tracked files and rejects
workstation-specific home or checkout paths. Use repository-relative links,
repository identities or pinned HTTPS references in tracked text. Findings
contain only file, line and category so local usernames cannot leak into logs.

Type-aware lint checks unsafe values, dropped Promises and callback return
types. `promise-function-async` stays off because the Effect policy forbids
`async`; native Promise facades remain checked for unhandled Promises. The
actual-CLI fixture checks both sides of that choice. Narrow inline exceptions
explain compatibility exports, secret-stringification tests and inherited
Data/Match signatures. They are checked for unused permissions.

Production hostnames belong to `packages/infrastructure/src/hostnames.ts`,
and transport paths belong to `packages/api/http/src/routes.ts`. The shared
ownership rules enforce these in runtime source. Independent test expectations
keep literal addresses; the PostHog adapter owns its external API paths.

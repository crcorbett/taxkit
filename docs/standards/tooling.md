---
document_type: standard
lifecycle: current
authority: canonical
owner: taxkit-tooling-owner
last_reviewed: 2026-10-04
review_trigger: formatter, lint, dependency, typecheck, governance gate, Changeset, or root command change
---

# Formatting, Linting, And Dependency Hygiene

TaxKit uses Bun workspaces and Ultracite with the Oxlint/Oxfmt provider. The
tooling is intentionally strict because TaxKit is intended to become a public
library with stable package boundaries and predictable bundle behavior.

## Configured Tools

- `bun` is the package manager and workspace runner.
- Root `package.json` owns workspace globs and catalog dependency versions.
- `ultracite` wraps the configured provider commands.
- `oxlint.config.ts` extends `ultracite/oxlint/core`, the reviewed React
  profile and the Remix profile. Oxlint and `@oxlint/plugins` use the same
  1.86.0 plugin runtime.
- `oxfmt.config.ts` spreads `ultracite/oxfmt` and preserves authored Markdown
  wrapping. Agent instructions, documentation, generated routes and the
  vendored anti-slop source have exact formatter ignores; application and
  package source remains formatted.
- The root `check` and `fix` scripts request Ultracite's type-aware mode. The
  optional `oxlint-tsgolint` adapter is not currently installed or qualified,
  so those commands stop before linting rather than silently weakening the
  configured policy. HGI-205 owns adapter qualification and the existing
  repository-wide type-aware findings.
- `knip` uses `knip.json` for development-aware dependency and workspace
  hygiene and `knip.production.json` for production-only package, command, API
  and docs runtime reachability. The production command first generates the
  docs source through the compiled Fumadocs config and admits the two ignored
  generated modules that the built docs app actually consumes.
- `tools/documentation` owns the Effect-native `check:docs` policy, bounded
  receipts, negative fixtures, and machine-readable owner contract.
- `tools/documentation` also owns the flat sequential, non-executing
  `check:runbooks` validator and its strict prose/sidecar adversarial fixtures.
- `tools/governance` owns the Effect-native repository harness gate. It
  Schema-decodes repository-local owners at filesystem ingress and checks the
  accepted HE crosswalk, stable TaxKit profile lifecycle/index owners,
  canonical skill receipt and overlays, Claude links, portable references,
  critical journeys, and external non-claims. Its canonical inventory contains
  nine complete Commonplace skills (including Linear, strict Effect and Alchemy),
  two TaxKit profile overlays and two declared local extras. The receipt binds
  the upstream commit; governance validates all eleven Claude links. Canonical
  template versions do not override TaxKit's installed graph. Skill adoption
  alone does not prove the pending clean-slate strict-enforcement migration.
- `tools/evals/harness-foundation` owns the target-specific epoch verifier. It
  hashes both complete validator closures and reconciles the immutable Git
  target, canonical skill/journey projections, receipts, retained failures,
  independent review, clocks, authority, limitations and non-claims.
- TypeScript 7.0.2 is the exact root compiler; `@effect/tsgo` 0.48.0 patches
  its native binary at install and supplies Effect diagnostics. Errors remain
  fatal; warnings and suggestions remain visible without failing compilation.
  `check:effect-language-service` runs the native diagnostic command and the
  compatibility compilation. Its plugin configuration identifier remains
  `@effect/language-service` (the upstream-required name); Knip excludes this
  exact identifier from dependency discovery because `@effect/tsgo` provides it.
  Explicit Bun host types belong to tools/configs,
  not browser or domain packages.
- The two AST policy tools import the official `@typescript/typescript6`
  compatibility API at 6.0.2. This supports programmatic syntax inspection;
  it does not replace the TypeScript 7 compiler. Remove it after a qualified
  native compiler API replaces those checks. See the
  [official side-by-side guidance](https://devblogs.microsoft.com/typescript/announcing-typescript-7-0/#running-side-by-side-with-typescript-6.0).
- Stable Effect 4 imports use `effect/http`, `effect/http-api`,
  `effect/process` and `effect/encoding`; no RC import paths remain in owned
  executable code. The exact graph remains in the root catalogue and lockfile.
- `web:test:browser` qualifies the exact Atom/React/Scheduler graph in Chromium
  and runs within `verification`. The narrow peer-metadata patch and removal
  condition are documented by `apps/web/README.md`; no library source is patched.
- Changesets record package-facing changes before release automation exists.
  See [Versioning and Changesets](./versioning.md).

## Root Commands

```sh
bun run check
bun run fix
bun run check:docs
bun run check:runbooks
bun run check:harness-governance:types
bun run test:harness-governance
bun run check:harness-governance
bun run check:harness-foundation-epoch:types
bun run check:harness-foundation-epoch
bun run knip
bun run knip:production
bun run changeset
bun run version-repo
bun run check-types
bun run test
```

Until HGI-205 qualifies the type-aware adapter and findings, use
`bun run lint` for the accepted Oxlint gate and `bun run format:check` for the
accepted Oxfmt gate; `bun run verification` invokes both. Do not remove
`--type-aware` from `check` or `fix` to make those aspirational commands pass.
Use `bun run fix` only after HGI-205 and only when you intend to accept
formatter and safe lint fixes. Use `bun run knip` for the complete
development-aware graph. Use `bun run knip:production` when changing package
exports, repository command entrypoints, the standalone API runtime or the docs
production graph. It excludes test and development reachability while
including the docs app, its two package boundaries and their real generated
browser/server modules. Neither command replaces the SDK-owned packed-artifact
and strict downstream-consumer gates.

Use `bun run check:docs` for mechanical documentation ownership. Its bounded
console output names the violated invariant, owner, target, recovery hint, and
full JSON detail path. The check treats public lifecycle status as an opaque
product value and cannot prove publication, runtime rendering, or external
availability.

Use `bun run check:runbooks` after any runbook, release command, Changesets,
package graph, HGI-203 handoff, recovery or authority-boundary change. It checks
the exact five-runbook inventory and canonical paths, public command existence,
prose/sidecar agreement, unique owners, substantive required sections, accepted
proof binding and unknown-principal stops. It executes no documented command;
its only output artifact is the ignored bounded
`tmp/runbook-validation-report.json` receipt.

Use `bun run check:harness-governance` after a repository harness profile,
structured HE audit, canonical skill, repository-profile overlay, local extra,
Claude link, critical-journey, or governance-policy change. The focused tests
include adversarial cases for missing mappings, volatile lifecycle/owner
profiles, unqualified exceptions, partial/stale trees, unexpected overlays,
copied/absolute links, broken references, and false external claims. The gate
is repository-local and deterministic; success proves none of remote Git,
hosted CI, registry, release, deployment, provider, production, public-site,
or external-consumer state.

Use `bun run check:harness-foundation-epoch` only for the recorded
target-specific closeout or after a review trigger requires a successor epoch.
It validates the complete hash-bound local evidence graph but does not rerun
the five journeys or establish Git publication, hosted CI, release, registry,
deployment, provider, public-site, or external-consumer state.

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

The vendored `tools/oxlint/anti-slop` plugin owns 15 generic rules. All run at
error severity and reject chained or unexplained assertions, widening followed
by assertion, unknown parameters, returns and aliases, unsafe dictionary and
object parameter types, runtime `typeof`, `Reflect.get`/`Reflect.apply`, module
mocking, conditional empty-object spreads, widened known values and vague
`Shape` symbol names. The separate opt-in Effect plugin rejects imported
service or Layer constructors named `make*`; exported compatibility aliases may
remain at their owner, but repository consumers import the clearer `create*`
name.

The generic plugin is deliberately separate from TaxKit policy. It does not
own TaxKit content, SEO, TanStack route naming, package naming or reference-site
rules. Those concerns are excluded unless a TaxKit semantic owner and focused
proof are added. The plugin source is ignored by the root lint and formatter
because it is installed verbatim; its behaviour is proved through fixtures and
the normal source tree still receives every configured rule. TypeScript files
disable the JavaScript-only `no-redeclare` rule so a value and its derived type
may share one name. JavaScript files keep that rule.

Current TaxKit-specific overrides are narrow:

- `func-names`: `Effect.gen(function* () { ... })` is idiomatic and should not
  need artificial local names.
- `func-style`: named declarations are acceptable for small local helpers and
  generated framework entrypoints.
- `max-classes-per-file`: schema-backed rows, tables, and services often belong
  together in one parameter module.
- `unicorn/no-array-method-this-argument`: Effect `Array` helpers are not native
  JavaScript array method `thisArg` usage.

Portable custom rules live under `effect/*`, `bun/*` and `mdx/*`; tax,
calculator, decoder and route-transport policy remains under `taxkit/*`.
Important portable rules include:

- `effect/no-manual-tag`: bans manual `_tag` object literals. Use
  `Data.TaggedClass`, `Data.TaggedError`, `Schema.TaggedClass`, or an owning
  package constructor.
- `effect/no-layer-exports-in-service-files`: bans `Live`, `Mock` and `Test`
  layer exports from `service.ts`/`services.ts` files, including named export
  specifiers and named re-exports. Service files own `Context.Service`
  contracts and canonical schemas; production wiring belongs in
  `live.layer.ts`, test wiring belongs in `test.layer.ts` or test helpers.
- `effect/no-runtime-execution-outside-boundaries`,
  `effect/no-console-outside-runtime` and
  `effect/no-process-outside-boundaries`: keep execution and host lifecycle in
  exact files owned by `oxlint.config.ts`. Package and service logic returns
  `Effect` values and tagged failures. The rules resolve canonical imports,
  renamed bindings, aliases and statically known destructuring; lexically
  shadowed same-named locals are not host or runtime APIs.
- `effect/no-schema-encoder-outside-egress` and
  `effect/no-throwing-schema-sync-codec`: encode once at exact egress and use
  Effect or non-throwing Result/Exit/Option codecs. Canonical `Schema`
  imports, namespace imports, renamed bindings and statically known method
  aliases are all enforced.
- `effect/no-unknown-service-contract` and
  `effect/no-unknown-tagged-error-cause`: keep service inputs schema-derived and
  expected errors closed and tagged. Scope-resolved aliases of `Effect.Effect`,
  `Schema.Unknown`, `Schema.TaggedErrorClass` and `Data.TaggedError` remain
  subject to the same contract.
- `effect/no-effect-test-global-mix`: rejects a file that splits unaliased
  `describe`, `expect`, `it` or `test` imports between `@effect/vitest` and
  `vitest`. Shared globals must have one owner. Vitest-only utilities such as
  `vi` and hooks may still come from `vitest`; an explicitly aliased secondary
  shared API is also valid.
- `effect/no-module-level-mutable-test-state`: rejects module-level `let` and
  `var` in test files so one test cannot leak changed state into another.
  Immutable declarations, function-local variables and ambient declarations
  remain valid.
- `effect/no-switch`: bans `switch`. Use Effect `Match` with
  exhaustive handling.
- `bun/no-host-api-outside-adapters` and
  `bun/no-runtime-outside-entrypoints`: keep Bun file/process/server APIs and
  `BunRuntime.runMain` in exact live/runtime/script boundaries. Global Bun
  methods and canonical platform runtime imports remain enforced through
  aliases and statically known destructuring without treating local objects
  named `Bun` or `BunRuntime` as host APIs. Non-host global Bun members such as
  `Bun.version` remain outside this rule, including direct and destructured
  access.
- `mdx/no-route-local-component-registry`: keeps the MDX registry app-owned and
  route components composition-only.

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
lean: remove unused package dependencies or correct intentional public exports
and entrypoints before adding exact, ownership-explained exceptions.

`knip.json` includes development tooling, tests and the current application
scaffolds. `knip.production.json` uses trailing `!` production patterns for
every source counterpart of the eight code-bearing release artifacts,
`@taxkit/scripts` public and executable entrypoints, `apps/api/src/index.ts`,
and the docs app/docs-package graph. It excludes tests, fixtures, examples,
root tools and `apps/web`. The production command generates docs source first
and uses `--no-gitignore` so the explicitly named `.source/browser.ts` and
`.source/server.ts` production modules remain reachable; the unused generated
dynamic module is not admitted as an entry. The JSON-only
`@taxkit/tsconfig` artifact has no TypeScript source entrypoint and stays under
strict downstream tarball proof. Both Knip graphs are part of root
verification.

## Repository Path Hygiene

Run the focused portability gates with:

```bash
bun run check:repository-paths:types
bun run test:repository-paths
bun run check:repository-paths
```

The root-owned tool inventories tracked files through Effect's child-process
boundary, reads them through Effect FileSystem and rejects workstation-specific
home or checkout paths. Use repository-relative links, repository identities or
pinned HTTPS references in tracked text. Portable tool state such as
`~/.portless` remains valid. Findings deliberately contain only file, line and
category so local usernames and matched content cannot leak into logs.

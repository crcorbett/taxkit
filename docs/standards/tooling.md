# Formatting, Linting, And Dependency Hygiene

TaxKit uses Bun workspaces and Ultracite with the Oxlint/Oxfmt provider. The
tooling is intentionally strict because TaxKit publishes library packages with
stable boundaries.

## Configured Tools

- `bun` is the package manager and workspace runner. Root `package.json` owns
  the workspace globs and catalogue dependency versions. An external package
  used by more than one manifest is pinned once in the root catalogue and
  referenced as `catalog:`; exact versions stay exact.
- `oxlint.config.ts` extends the complete, unmodified `style` and `strict`
  presets from `@commonplaces/oxlint-plugin`. The shared package owns rule
  selection and default severity. Do not copy a subset, filter the presets,
  add local `off` settings, or weaken shared checks for a package.
  Local settings name semantic owners and exact host boundaries; they do not
  suppress shared preset checks. Repository plugins use `taxkit-effect`,
  `taxkit` and `taxkit-package`, so they cannot replace shared `effect` or
  `package` rules.
- `@commonplaces/oxlint-plugin` is the one dependency outside the exact-pin
  policy: its manifest value is `"latest"`. `bun run lint` first runs
  `bun run lint:refresh`, which installs the current npm release with
  `--no-save --no-cache --ignore-scripts` and then runs
  `effect-tsgo patch --oxlint`; a registry, patch or compatibility failure
  stops linting. The manifest stays `"latest"`, so the executed plugin may be
  newer than the lockfile; record the installed rule version when reporting
  lint results. The lockfile records 0.12.1 with Oxlint 1.89.0, inside its
  supported range; the 0.12.0 [upgrade notes](https://github.com/crcorbett/commonplace-lint/blob/main/docs/upgrading.md)
  list the rules it added. Required Effect platform and test APIs use explicit
  `allowedUnstableApis` entries; the unstable API diagnostic remains enabled.
  Native Effect test callbacks are registered with Vitest's assertion rule
  rather than disabling it.
- `oxfmt.config.ts` spreads `ultracite/oxfmt` and preserves authored Markdown
  wrapping.
- TypeScript 7 is the root compiler. `@effect/tsgo` patches it at install and
  supplies Effect diagnostics; `bun run check:effect` runs them.
  The SDK assembler separately uses `typescript-ast`, an alias for TypeScript
  6.0.3, for its JavaScript compiler API; TypeScript 7 supplies the native
  compiler rather than that API.
- Effect and its versioned platform, Atom, SQL and test packages use 4.1.2,
  with root `overrides` keeping transitive Effect packages on the same release.
  Alchemy and its provider/framework packages use 2.0.0-beta.85. Miniflare
  follows the v5 beta line used by Wrangler; its `latest` tag still points to
  v4.
- `knip.json` checks development reachability and `knip.production.json`
  checks the published package and runtime graph, including the standalone
  API server Layer as an explicit host entry alongside the API Worker.
  Production entries for packages come from their `package.json` export maps;
  the production config names entries only where Knip cannot infer them: the
  Alchemy stacks, the API and Website hosts, the documentation examples and
  the SDK, whose exports point at its built `dist`.
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
| `bun run lint` / `bun run fix` | Formatting, type-aware Oxlint (`--deny-warnings`) with the boundary-directive pass, docs and path checks. |
| `bun run lint:doctor` | The plugin's `commonplace-lint-doctor`: version policy, refresh order, local rules that repeat a preset rule and missing option paths. `lint` runs it after the refresh; see below. |
| `bun run format` | Oxfmt. |
| `bun run check-types` | Workspace types plus the Alchemy roots, root tools and Effect diagnostics. |
| `bun run knip` | Both Knip graphs. |
| `bun run test` | Root tool tests, workspace unit tests, Chromium tests, then the native pair suite. |
| `bun run test:tools` / `bun run test:native` | Only the root tool tests, or only the slower native Website/API pair tests (`tools/apps-local/test`). |
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
The three repository plugin entries (`tools/oxlint/taxkit-rules.ts`,
`effect-rules.ts` and `package-rules.ts`) only register rules.
Each rule lives in its own file under `tools/oxlint/rules/`, with shared AST
helpers in `tools/oxlint/rules/shared/`. Rules contain no owner paths:
`oxlint.config.ts` names each owner list by role and passes it as options,
`rules/shared/options.consumer.ts` is the one synchronous options decoder, and
`strict-effect/no-owner-paths-in-rules` rejects a path written in rule code.
`tools/oxlint/owner-paths.test.ts` fails when an exact path in the lint or Knip
configuration no longer exists, or a browser import grant names a missing
package export.

A repository rule exists only where the shared presets do not cover the same
cases on the same paths. Earlier releases removed the manual `_tag`, throwing
`*Sync` codec and calculator `typeof`/`instanceof`/`in`/JSON/`throw`/Promise,
nullish comparison, conditional spread and ambient clock copies. The 0.12.0
cleanup removed fourteen more local rules and two near-duplicates. Each now
uses the shared rule with TaxKit's owner lists in `oxlint.config.ts`; the
native restricted-name rules close the alias forms the shared rules do not
follow. The fixtures in `tools/oxlint/lexical-policy.test.ts`,
`portable-rules.test.ts`, `contract-boundaries.test.ts`,
`analytics-boundaries.test.ts` and `inline-try-promise-callbacks.test.ts` run
the real Oxlint command against these cases.

| Removed local rule | Shared rule and TaxKit setting |
| --- | --- |
| `taxkit/no-native-collections` | `effect-conventions/no-native-collections`; `no-restricted-globals` (`Map`, `Set`, `WeakMap`, `WeakSet`) and `no-restricted-properties` (`globalThis.*`, `window.*`) for aliases. |
| `taxkit-effect/no-host-imports-in-contracts` | `effect-conventions/no-host-api-in-contract`; `no-restricted-imports` on contract files adds `bun:*` and the Effect Bun/Node platform packages. |
| `taxkit-effect/no-layer-exports-in-service-files` | `effect-conventions/no-layer-export-in-service`; `no-restricted-exports` on service files adds export specifiers and re-exports. |
| `taxkit-effect/no-unknown-service-contract` | `effect-conventions/no-unknown-service-contract`. |
| `taxkit-effect/no-unknown-tagged-error-cause` | `effect-conventions/no-unknown-tagged-error-payload`; `no-restricted-properties` rejects `Data.TaggedError`, so errors use `Schema.TaggedError`. |
| `taxkit-effect/no-effect-test-global-mix` | `effect-conventions/no-mixed-test-globals`; `no-restricted-imports` in test files keeps `describe`, `expect`, `it` and `test` on `@effect/vitest`. |
| `taxkit/no-decoding-outside-boundaries` | `effect-conventions/no-schema-decoder-outside-ingress`, excluding `decodingBoundaryFiles`. |
| `taxkit-effect/no-schema-encoder-outside-egress` | `effect-conventions/no-schema-encoder-outside-egress`, excluding `schemaEncoderEgressFiles`. |
| `taxkit-effect/no-runtime-execution-outside-boundaries`, `taxkit-effect/no-runtime-references-outside-boundaries`, `taxkit-bun/no-runtime-outside-entrypoints` | `effect/no-runtime-execution-outside-main` with `runtimeBoundaryFiles`, `strict-effect/no-runtime-outside-boundary`, and `no-restricted-properties` for runner references outside those files. |
| `taxkit-effect/no-process-outside-boundaries` | `effect/no-ambient-process`; `no-restricted-globals` (`process`) outside `processBoundaryFiles`. |
| `taxkit-effect/no-console-outside-runtime` | `effect/no-console`; `no-restricted-globals` (`console`). Only the copy-control browser test may name it, to spy on `console.error`. |
| `taxkit-bun/no-host-api-outside-adapters` | `bun/no-ambient-host-api`; `no-restricted-globals` (`Bun`). Bun reaches TaxKit only through `@effect/platform-bun` Layers. |
| `taxkit-effect/no-bare-effect-try-promise` | `effect-conventions/require-try-promise-catch`; the narrower `taxkit-effect/inline-try-promise-callbacks` below. |

The native restricted-name rules are name based. They follow destructuring
and assignment from the global or the `Effect`, `ManagedRuntime`, `BunRuntime`
and `NodeRuntime` names, and leave a same-named local `console`, `process`,
`Bun` or `Map` alone. They do not follow a renamed module import such as
`import { Effect as Fx }`, a namespace chain such as `Root.Effect.runSync`, or
an uncalled named import of a runner; calls through those forms are still
rejected by the shared runtime rules. Non-Schema `decode*` calls (for example
`Stream.decodeText`) are byte transforms and are outside the decoder rule.

Repository rules that remain, and why the shared presets do not cover them:

- `taxkit-effect/inline-try-promise-callbacks`: all owned source. The shared
  rule requires an options object with `try` and `catch`; this rule also
  requires both callbacks inline and rejects extracted, shorthand, `undefined`
  or spread callbacks, so each Promise boundary maps its rejection at the call.
- `taxkit-effect/no-module-level-mutable-test-state`: rejects module-level `let` and
  `var` in test files so one test cannot leak changed state into another.
  Immutable declarations, function-local variables and ambient declarations
  remain valid.
- `taxkit-effect/no-switch`: bans `switch`. Use Effect `Match` with
  exhaustive handling.
- `taxkit/no-invented-tax-context`: scoped to `packages/calculators/src`.
  Calculator context must not invent jurisdiction or tax-year defaults with
  `??`; missing context must remain absent or fail through an owning
  Schema/tagged error. The shared `web/no-context-nullish-default` covers page
  metadata fields (`title`, `description`, `image`) only, and
  `effect-conventions/no-decoded-nullish-default` covers empty defaults only.
- `taxkit/no-date-construction`: scoped to `packages/calculators/src`.
  Calculator dates and tax years come from Schema-owned date types, so explicit
  `new Date(value)` is rejected too. The shared `strict-effect/no-native-work`
  rejects the ambient reads (`new Date()`, `Date.now`, `Math.random`).
- `taxkit/no-nested-wrapper-calls`: scoped to `packages/calculators/src`.
  Sequential calculator transformations must use pipe-first data flow such as
  `query.pipe(filterEntries, toResponse)` or `pipe(query, filterEntries,
  toResponse)`, not nested wrappers such as `toResponse(filterEntries(query))`.
- `taxkit/no-native-array-methods`: scoped to `packages/calculators/src`.
  Calculator services must use Effect `Array` or `Chunk` helpers such as
  `Array.filter(items, predicate)`, `Array.findFirst(...)` and `Chunk.map(...)`
  instead of native `items.filter(...)`, `items.find(...)` or
  `items.reduce(...)`.
- `taxkit/no-object-writes`: all owned source. Return immutable values instead
  of `Object`/`Reflect` writes, including through aliases.
- `taxkit-package/workspace-roles`: browser/backend and runtime/deployment
  roles. Its Website source root, server entries and exact host module grants
  are options in `oxlint.config.ts`; package role policy lives in
  `tools/oxlint/package-roles.ts`.

`bun run lint:boundary-directives` runs Oxlint with the shared decoder rule
allowed and unused disable directives as errors, so no source can carry a
directive that silences decoder placement.

SDK source boundaries are lint settings rather than a separate command:
`strict-effect/module-ownership` lets only `packages/sdk/typescript/src/http.ts`
import `@taxkit/api-http`, `no-restricted-imports` keeps Node and Bun modules out
of SDK source and Australian packs out of the root entry, and the package role
policy forbids `@taxkit/api-http` from depending on `taxkit` in any dependency
field.

## Lint doctor and conformance

`bun run lint:doctor` runs the plugin's `commonplace-lint-doctor` from the
repository root, and `bun run lint` runs it right after `lint:refresh`. Generated
lint fixtures that tests write on demand are listed under
`ownerPaths.allowMissing` in `commonplace.repository.json`, which the doctor
reads from 0.12.1. Any `duplicate` finding means a local rule repeats a preset
rule: remove it and configure the preset rule.

`commonplace.repository.json` at the root maps TaxKit's files to the
Commonplace repository responsibilities, lint-policy registries and
owner-path sources. The conformance validators live in the
`development-workflows` plugin, not in this repository. A maintainer with the
`commonplace-plugins` checkout runs them against this repository:

```sh
python3 <commonplace-plugins>/plugins/development-workflows/skills/repo-structure/scripts/conformance.py . --verbose
```

Add `--lint` to also run `bun run lint`. `packages.privateLeaf` declares
`packages/docs-examples` as a private leaf package: it holds checked
documentation examples that tests and builds run, nothing imports it, and so it
has no exports.

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

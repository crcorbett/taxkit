# Formatting, Linting, And Dependency Hygiene

TaxKit uses Bun workspaces, Turbo, Oxlint and Oxfmt (with Ultracite's Oxfmt
settings). The tooling is intentionally strict because TaxKit publishes
library packages with stable boundaries.

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
- TypeScript 7 is the root compiler. `@effect/tsgo` patches it at install, so
  every `tsc` in `check-types` reports Effect diagnostics. Error-severity
  diagnostics such as `floatingEffect` fail the compiler; warnings and
  suggestions print without failing (`ignoreEffectWarningsInTscExitCode` and
  `ignoreEffectSuggestionsInTscExitCode` in `tsconfig.base.json`).
  `tools/effect-language-service/diagnostics.test.ts` compiles a floating
  Effect and its yielded equivalent with the real patched compiler and checks
  the failing and passing exit statuses.
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
  Knip infers package entries from `package.json` export maps, test and
  config files from its Vitest and Vite plugins, and command files from
  package scripts. The configs name only what it cannot infer: the Alchemy
  stacks, the root tool tests, the API and Website hosts and routes,
  compile-only type tests (`type-tests/**`, `test/**/*.typecheck.ts`), the
  documentation examples and the SDK's production entries, whose exports point
  at its built `dist`.
- The SDK's type and unit-test tasks depend on its own build: its package
  imports resolve through `dist`, so those tasks must wait while a rebuild
  replaces the assembled package.
- `tools/documentation/check.runtime.ts` (documentation links, anchors and
  commands) and `tools/repository-paths/check.runtime.ts` (portable paths)
  run as the last two steps of `bun run lint`.
- Changesets record package-facing changes; see
  [release policy](./release-policy.md).

## Version decisions

The catalogue holds every external version that more than one manifest uses,
the root manifest included: `playwright`, `@modelcontextprotocol/client`,
`webmcp-types` and `@cloudflare/workers-types` are `catalog:` references.
Two deliberate differences from the shared repository skill's version
snapshot stay:

- React and React DOM use 19.3.1, not the snapshot's 19.3.0. 19.3.1 is the
  installed patch release that the Website, MDX presenter and browser tests
  run and verify against; moving back to an older patch would only match a
  snapshot that predates it. `@types/react` and `@types/react-dom` stay at
  their own 19.3.0 releases.
- `tsconfig.base.json` sets `verbatimModuleSyntax: true` for every workspace,
  the Website included, where the snapshot's TanStack app sets it to false.
  Every TaxKit import already separates `import type`, the Website builds and
  passes its SSR and native checks with it, and one setting for every
  workspace keeps type-only imports out of bundles. Revisit it only if a
  TanStack release needs it off.

The Website gets Worker runtime types (`cloudflare:workers`, `Fetcher` and
the other platform globals) from `@cloudflare/workers-types`, the package
Alchemy's own Worker declarations import, and its binding shapes from
Alchemy's `InferEnv` (for example `TaxKitApiBinding`). Its standalone Vite
build takes compatibility from `@taxkit/infrastructure/worker-settings`, so no
Wrangler configuration or generated runtime declaration repeats those
settings.

## Root Commands

Every root script is listed here. A qualified name is `<group>:<step>`: the
group is the root check the step belongs to (`lint`, `check-types`, `test`,
`format`, `build`) or the target it acts on (`pr`, `production`, `sdk`, `api`,
`axiom`, `posthog`, `trace`, `changeset`, `release`).

| Command | Use |
| --- | --- |
| `bun run verification` | Before merging: `build`, then `lint`, then one Turbo run of `check-types`, `check-types:root`, `knip`, `test` and `test:browser`, then one Turbo run of `test:tools` and `test:native` one task at a time. |
| `bun run build` | Every workspace build through Turbo, including the Website route tree and the API docs catalogue. |
| `bun run lint` | Uncached: `format:check`, `lint:refresh`, `lint:doctor`, one type-aware Oxlint pass (`--deny-warnings`, unused disable directives are errors), then the documentation and repository-path checks. |
| `bun run check-types` | Turbo `check-types` in every workspace plus `check-types:root`. Effect diagnostics come from the patched compiler. |
| `bun run knip` | Both Knip graphs, uncached. Verification runs the same script as the cached root Turbo task `//#knip`. |
| `bun run test` | Turbo `test` and `test:browser`, then `test:tools` and `test:native` one at a time. |
| `bun run format` / `bun run fix` | Oxfmt writes formatting; `fix` also applies Oxlint fixes with the repository configuration. |
| `bun run format:check` | Oxfmt check; the first `lint` step. |
| `bun run lint:refresh` | Installs the current `@commonplaces/oxlint-plugin` and repeats the Effect patch; see below. |
| `bun run lint:doctor` | The plugin's `commonplace-lint-doctor`: version policy, refresh order, local rules that repeat a preset rule and missing option paths. |
| `bun run check-types:root` | The Alchemy roots (`tsconfig.alchemy.json`) and root tools (`tools/tsconfig.json`); cached root Turbo task. |
| `bun run test:tools` | The root tool tests, including the actual-Oxlint fixtures; cached root Turbo task. |
| `bun run test:native` | `build:native-pair` then `test:native-pair`, the Website/API pair in Miniflare (`tools/apps-local/test`); cached root Turbo task. |
| `bun run build:native-pair` / `bun run test:native-pair` | The two halves of `test:native`. |
| `bun run prepare` | `effect-tsgo patch --oxlint`, run by every install. |
| `bun run dev` | The native Website/API pair under `alchemy dev`; see the [Website README](../../apps/web/README.md#local-development). |
| `bun run clean` | Turbo `clean` in every workspace. |
| `bun run changeset` / `bun run changeset:status` / `bun run version-packages` | Changesets; see the [release runbook](../runbooks/release.md). |
| `bun run release:check` | `verification` plus `sdk:check-packed-artifact`, `sdk:validate-downstream`, `api:smoke` and `changeset:status`. |
| `bun run sdk:check-packed-artifact` / `bun run sdk:validate-downstream` | The packed SDK archive and a fresh downstream consumer; see the [packed consumer check](../runbooks/packed-consumer-proof.md). |
| `bun run api:smoke` | The standalone API's public routes through an external HTTP consumer. |
| `bun run pr:plan` / `bun run pr:deploy` / `bun run pr:destroy` | Preview stage operations; see the [deployment runbook](../runbooks/deployment.md). |
| `bun run production:plan` / `bun run production:deploy` / `bun run production:drift` | Production operations; see the [deployment runbook](../runbooks/deployment.md). |
| `bun run axiom:plan` / `bun run axiom:deploy`, `bun run trace:plan` / `bun run trace:deploy`, `bun run posthog:plan` | The separate Axiom, trace-export and PostHog stacks at `prod`; each needs the maintainer's explicit request to apply. |

The `pr:*` scripts and the Checks cleanup guard share
`tools/infrastructure/preview-stage.runtime.ts`. It decodes the first argument
with the owning `PullRequestStage` Schema from `@taxkit/observability/stage`,
refuses `--stage` among the forwarded flags (exit status 64), builds, then runs
native Alchemy with the remaining flags.

### Turbo caching

`turbo.json` registers `check-types:root`, `knip`, `test:tools` and
`test:native` as root (`//#`) tasks. Their inputs are the root files and every
tracked source under `apps`, `content` and `packages`, without installed or
built output; `test:tools` also hashes the installed lint plugin manifest,
because `lint:refresh` can install a newer release than the lockfile.
`globalDependencies` lists `.bun-version`, `tsconfig.base.json` and
`raw-modules.d.ts`, which every workspace's compiler reads. Root tool tests
write temporary manifests and sources, and the native build rewrites app
sources, so verification runs those two tasks after the other Turbo work with
`--concurrency=1`. `lint` stays uncached so its refresh always fetches the
current plugin.

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
- `taxkit/no-object-writes`: all owned source. Return immutable values instead
  of `Object`/`Reflect` writes, including through aliases.
- `taxkit/protected-rule-directives`: all owned source. A disable or enable
  directive that names `effect-conventions/no-schema-decoder-outside-ingress`
  (the rules listed in its options) or the guard itself fails lint, at the
  comment and at the start of the file, so no directive can silence decoder
  placement. `portable-rules.test.ts` proves a named directive and a file-wide
  guard directive fail and an unrelated directive passes.
- `taxkit-package/workspace-roles`: browser/backend and runtime/deployment
  roles. Its Website source root, server entries and exact host module grants
  are options in `oxlint.config.ts`; package role policy lives in
  `tools/oxlint/package-roles.ts`.

Three former local rules now belong to the shared presets.
`strict-effect/no-imperative-collections` reports `switch` and every `let` or
`var`, including module-level test state, so `taxkit-effect/no-switch` and
`taxkit-effect/no-module-level-mutable-test-state` were removed;
`portable-rules.test.ts` proves one preset report for each construct in a test
file. The same preset rule reports native `filter`, `find`, `reduce`, `some` and
the other traversal methods in calculators, so `taxkit/no-native-array-methods`
was removed too. Its only extra names were `concat`, `flat` and `slice`: they
return new values without changing their input, and its name-only match also
rejected string `slice`, so they do not justify a second rule.

The strict fixture cases in `portable-rules.test.ts` take their folders from
the checked workspace inventory in `tools/oxlint/workspaces.boundary.ts` and
the root `tools` folders: every workspace `src`, `test` and `scripts` folder
receives the rejected fixture in one batched real Oxlint run. `bun run lint`
is the accepted case for the real sources.

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

The repository-path check (`tools/repository-paths`, the last `lint` step)
inventories tracked files and rejects
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

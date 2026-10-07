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
- Both documentation commands parse options with Effect CLI, provide the Bun
  services at their executable boundary and return a nonzero exit on failure.
  Pure inspections use persistent HashMap/HashSet values and checked optional
  reads. `test:documentation` runs through Bun-hosted Effect Vitest;
  `check:docs:types` checks the implementation and tests. All eleven canonical
  strict rules apply to this owner. Only the two exact command files can run
  Effects; ordinary policy code and tests have no runtime admission.
  Vite's server resolver has separate `source` export conditions; the existing
  isolated Quality source copy runs documentation tests before scripts build
  output exists. A local prebuilt package is not fresh-checkout evidence.
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

## Incremental clean-slate enforcement

SDK source, type fixtures and Vitest config use all eleven canonical rules.
`packages/sdk/typescript/src/client.runtime.ts` alone admits the plain API's
Promise signatures and execution. These are separate exact overrides; neither
admits async/await, Promise chains, mutation or arbitrary callbacks. Real CLI
acceptance, rejected neighbouring code and exact selectors cover this ownership.
Three exact representation tests encode secret-negative error bytes; two also
decode actual native Promise rejections. Their Schema error factories use the
canonical Error-constructor rule instead of Oxlint's inaccurate native rule.
SDK command scripts remain pending in DEV-73.


Release-script source, tests and config also use all eleven canonical rules.
Their only execution admissions are the two exact `.runtime.ts` command files
under `packages/scripts/src/release-readiness`. Each file has its own real CLI
acceptance case; invalid neighbouring code and exact selector assertions prevent
that permission spreading. The package README owns output, receipt, ordered
command and native-service lifetime behaviour. Historical evidence remains
unchanged; this scope does not complete DEV-73.

DEV-73 currently configures all eleven canonical strict Effect rules in directly owned lint TypeScript
files (`tools/oxlint/*.ts`), repository-path and governance tools, and in core,
rules, calculators, shared testing helpers and the HTTP API, including their tests. Actual Oxlint fixtures assert
one admitted file, exit code and each of the ten applicable domain diagnostics;
the web-runtime filename rule applies when web scope is migrated. Lint and
fixture caches explicitly include the canonical plugin asset. Five rules now apply globally to owned code: native `.at` rejection, safe Option
handling, tagged-error identity, `new` for Error construction and web runtime
filename conventions. Actual-command fixtures additionally cover web source,
JavaScript tools and root configuration. Remaining rules outside domain packages
and semantic audits are pending in T002.
Existing repository rules continue to apply; this partial adoption is not
repository-wide strict-compliance evidence. Exact report/error serialization
tests may invoke owning Schema encoders as their representation boundary;
this grants no runtime or other strict-policy exemption.

The repository-path and governance commands have exact canonical runtime admissions at
`tools/repository-paths/check.runtime.ts` and `tools/governance/check.runtime.ts`; ordinary tools and tests cannot run
Effects themselves. Its real-command accepted/rejected fixtures and exact
configuration assertion reject missing enforcement or a widened command selector.
Repository-path and governance tests use the Bun-hosted Effect Vitest runner.

Quality-workflow source and tests also use all eleven canonical rules. Its
only runtime admission is `tools/quality-workflow/check.runtime.ts`; real CLI
fixtures and the exact-selector assertion protect it. `test:quality-workflow`
uses Bun-hosted Effect Vitest and `check:quality-workflow:types` checks its
source and tests in root verification. The test scope owns temporary clones,
child processes and the ephemeral loopback server. Effect FileSystem preserves
relative symbolic links; only an ordinary-file `readLink` EINVAL permits the
copy-file fallback. Other filesystem errors fail the test. The six isolated
release-boundary mutations still execute their actual owning commands.

The binding tracker and Bun, Effect, MDX and package TypeScript lint policies
also use all eleven canonical rules. Their host is Oxlint's synchronous
listener lifecycle: each rule creates its own Ref for one source file and uses
pure persistent updates through the installed Ref's MutableRef field. They
do not execute Effects or construct a runtime. Static membership uses HashSet;
lexical lookup uses HashMap with reference-identity keys. The key wrapper uses
Effect Hash/Equal without changing host nodes or comparing their cyclic fields.
Actual CLI tests preserve import/destructuring aliases, shadowing, reassignment
clearing and direct inline rejection mapping. A JavaScript canary verifies all
ten applicable strict diagnostics. The TaxKit route/decoder policy uses the same
strict rules and lexical binding tracker. It folds pure route analysis into
immutable maps/lists; only listener observations use a per-file Ref. Diagnostic
deduplication uses reference identity, and duplicate-restore warnings retain
first-consumer order. One owning Schema decodes the exact rule-options ingress;
missing options fail closed before checking source. The real CLI rejects missing
options through Oxlint's metadata validator. The listener's defensive fallback
is not separately claimed as that CLI proof. Binary checking and compiler
checking are distinct; neither establishes full repository or whole-T002 coverage.

Two exact generated TypeScript paths qualify canonical collection-exception
behaviour. Only the synthetic host admits `host.value` assignment and
`host.push`; its neighbouring file, other target/method/receiver and loops
remain strict. These are scoped test fixtures, not production mutation owners.
The eight real CLI cases verify both admitted and rejected code. Four isolated
config mutations then run `test:oxlint:task` itself: removing or disabling the
required collection rule, adding another assignment target, and adding another
method must make that verifier fail with its expected failure identity. The
normal tracked configuration is preserved throughout those copied-workspace
checks. No canonical plugin asset or production runtime admission changes.

Migrated strict paths also reject native Map/Set/WeakMap/WeakSet constructors
through lexical aliases and Object/Reflect writes, including escaping writer
callbacks and forwarded methods. Built-in identity requires
an unresolved name or a global variable with no local definitions; a same-named
local stays separate. The shared tracker indexes host Reference objects so read
uses remain distinct from declarations and write-only identifiers. A separate
runner-reference rule catches captures, exports and callbacks alongside the
existing call rule, using the same exact runtime boundaries. Callback/context
runner variants and Node/Bun runtime imports use the installed API identities.
Actual CLI cases retain old diagnostic counts and accept persistent collections
and Ref-owned immutable updates. These additions remain incremental; readonly
contracts, other paths and static JavaScript qualification are pending.

The pinned Turbo version defaults to automatic root AGENTS.md edits when it
detects an agent. TaxKit opts out with `agentGuidance: false` in `turbo.json`,
keeping the canonical task router under maintainer control and preventing a
checking command from changing tracked source during isolated-clone tests.
Read the installed Turbo package's `docs/README.md` and applicable reference
before changing its task configuration.


The retained `tools/evals` owners use all eleven canonical strict rules and
persistent checked collections. Each of their two executable files has its own
exact runtime admission; former Bun hasher admissions are removed. SHA-256 text
and byte operations belong to their named input boundaries and use safe typed
errors. `check:harness-foundation-epoch:types` and Bun-hosted `test:hgi-206` run
inside root verification. Root verification runs focused policy/host tests;
it does not assert that either saved historical epoch qualifies today's graph.


DEV-73 also applies all eleven canonical rules to the migrated retained-input,
upload-file, source-contract and native memo owners under `tools/docs-deployment`.
The upload command alone has an exact runtime admission. Its former raw Bun
API permission and the memo test's execution permission are removed. Input
hashing uses Effect Crypto; typed file JSON is decoded once at ingress.
The rest of this directory remains explicitly pending for strict migration.
The existing deployment test command uses Bun-hosted Vitest and shared source
resolution; its assertions still read local fixtures and saved records.


Migrated deployment credential and workflow-input owners receive the same strict
rules. The local host reads its full environment through ConfigProvider and a
named restoration boundary, preserving empty values and underscored names.
Checked optional lookup owns command-environment filtering and scope selection;
workflow JSON uses typed ingress. Cached credential JSON is parsed once, with
malformed fallback kept separate from unreadable input. Three executable hosts
and one checked fake test command each have a separate exact runtime admission.
Their obsolete raw Bun API permissions are removed. The fake command's argument
read and Schema receipt encoding are exact test-only representation permissions.


Workflow-source, native plan projection and saved-evidence owners now receive
all eleven strict rules. Plan text uses checked regex-group and resource/summary
lookups. The JSON writer reuses the receipt's field Schemas in its retained
canonical field order, so saved SHA-256 comparisons retain their original bytes.
Saved inventory and deployment selection use checked optional values; absent
stages become an Option internally and retain the same workflow text at egress.
Three exact executable admissions remain separate from source and test files;
the plan test's runtime and evidence runtime's raw Bun admissions are removed.
Scoped Effect Vitest preserves the original workflow, historical capture and
accepted-finding checks. Synthetic provider and plan representations have exact
Schema encoding permissions only; no provider request is part of these tests.


The deployment automation receipt checker now uses persistent HashMaps/HashSets,
checked optional lookups and pure ordered findings. Its comparison retains the
original locale ordering, exact authority/plan/provider/host/run/input checks
and receipt nulls. Its executable reuses the qualified file JSON/SHA-256 input
boundary with the automation's own safe errors; there is no second hashing or
JSON parser. The aggregate evidence type now derives from a Struct reusing the
existing field Schemas. Six adopted files receive all eleven strict rules. The
command alone has an exact runtime admission; its raw Bun/decode exceptions and
the policy test's execution admission are removed. Synthetic register encoding
and decoding permissions apply only to the exact command test.


Actual lint acceptance checks give each source file its own ordinary test
deadline. A growing group of files must not share a five-second deadline across
multiple real command processes. Each test still requires exactly one admitted
file, exit code zero and no finding from its required rule namespace. Rejected
fixtures and disabled-rule/broadened-permission checks retain their assertions.


Retained deployment policy, Schema, command and canonical record-egress files
receive all eleven strict rules, with actual accepted/rejected lint fixtures.
The command alone has an exact runtime admission; its old raw Bun permission
and the historical test's execution permission are removed. Canonical saved
record JSON encoding is admitted only in `retained-record.egress.ts`. It retains
the original key ordering for stored SHA-256 proof. Internal provider equality
uses the owning Schema's field comparison; it does not serialise records.


Inventory service/live/test/report-egress and workflow proof/run/teardown command
files now receive all eleven strict rules. Actual lint fixtures accept each
adopted file and reject its generated neighbour. Only the four named commands
have exact runtime admission. Unused Bun/process and inventory-test execution
permissions are removed; report encoding and synthetic report ingress have exact
reviewed owners. Native SDK services remain private to the live Layer and runtime
composition. Configuration uses its owning Schema; callers receive checked reports.


All six owned lint implementation files now use TypeScript and participate in
`check:oxlint:types`. `host.types.ts` derives rule, context, source-code, node and
variable types from Oxlint 1.86.0's exported RuleTester contract. The synchronous
host owns each listener lifetime; scoped Ref/persistent collection ownership and
reference identity remain. `allowImportingTsExtensions` is limited to the no-emit
lint-tool project because Oxlint directly loads these source files. Plugin paths,
exact options-decoding admission and actual CLI fixtures follow the `.ts` owners.
Completed earlier SPEC/task records and dated evidence retain their historical
JavaScript paths; this current tooling owner records their TypeScript successors.


The native calculator-page browser test has exact Playwright `fill` admissions
for `calculatorInput` and `plainCalculatorInput` in
`apps/web/test/native-pair.boundary.test.ts`. These are typed browser locators,
not array mutation. Actual CLI fixtures admit both names only at that test
path, reject the same operation in the nearby application leaf, and retain the
unrelated-receiver rejection. No portable strict rule is disabled.

The browser tool host has exact decoding admission at
`apps/web/src/lib/browser-tools.boundary.ts`, its controlled `.test.ts` and
`apps/web/test/native-browser-tools.boundary.test.ts`. Only the production host
has fixed-failure encoding admission. Native Toolkit owns normal JSON outputs.
No general runtime runner is admitted at any of these paths or the browser atoms.
The controlled host test alone may mention its native callback's Promise type;
async/await, new Promises and Promise chains remain rejected. Actual CLI fixtures
accept each necessary construct and reject those workflows and neighbouring
codecs/runners. The existing page runtime and a registration-scoped FiberSet own
the callback bridge; this does not authorise another browser ManagedRuntime.

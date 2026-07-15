---
status: completed
last_reviewed: 2026-07-14
source_of_truth: execution-plan
confidence: high
---

# TanStack Start loader transport boundaries execution plan

Spec:
[TanStack Start loader transport boundaries](../../product-specs/tanstack-start-loader-transport-boundaries.md)

Task list:
[`tanstack-start-loader-transport-boundaries.tasks.json`](../../product-specs/tanstack-start-loader-transport-boundaries.tasks.json)

## Goal

Implement `TSLB-001`, `TSLB-002` and `TSLB-003` sequentially with one subagent
per task. The parent reviews the diff, runs the required audits and verification,
and explicitly accepts each task before delegating the next. After three failed
correction turns for one task, stop and replan or request a user decision.

## Status

| Task | Status | Evidence |
| --- | --- | --- |
| TSLB-001 | accepted | Encoded loader transport, canonical app errors, route-root restoration, focused tests and architecture corrections pass all task gates and parent review. |
| TSLB-002 | accepted | Exact Oxlint restoration-placement rule, direct consumer provenance checks and real CLI fixtures pass the task gates and parent review. |
| TSLB-003 | accepted | Client harness, built SSR/hydration/client-navigation proof, final inventories and documentation close-out pass all task gates and parent review. |

## Current call graph

```ts
DocsContentService Effect
  -> route boundary encodes Schema.Exit(success, error, defect)
    -> createServerFn returns encoded data
      -> docs route loader restores too early
        -> TanStack serialises a decoded Effect Result
          -> route component trusts inferred loader data
```

## Target call graph

```ts
DocsContentService Effect
  -> Effect.exit once
    -> Schema.Exit(success, error, Schema.Never) JSON encoding
      -> createServerFn and route loader return encoded data unchanged
        -> TanStack SSR hydration or client-navigation transport
          -> direct route-root consumer restores once
            -> typed Result match
              -> focused canonical values reach React leaves
```

## Decisions

- The server-function RPC and TanStack loader hydration are distinct
  representation crossings. Keep the encoded representation intact through
  both and restore it only where the route first consumes loader data.
- `apps/docs/src/lib/docs/errors.ts` will own app-local browser-safe tagged
  errors shared by MDX and route transport code.
- The route-boundary constructor owns repeated codec policy. One-use decoder,
  mapper, hook and wrapper helpers are forbidden.
- No Changeset is expected for app-internal runtime, repository tooling, test
  and maintainer-documentation changes. Every task must still record Changeset
  status and must not consume existing pending Changesets.

## Validation log

Preflight completed:

```bash
# Spec/task JSON and repository baseline passed before implementation.
jq empty docs/product-specs/tanstack-start-loader-transport-boundaries.tasks.json
bun run docs:validate
bun run verification
git diff --check
```

The installed implementation baseline is
`@tanstack/react-start@1.167.65`, `@tanstack/react-router@1.169.2` and
`effect@4.0.0-beta.60`. Each task must recheck installed source before relying
on framework or Effect API syntax.

## Audit record

### TSLB-001 implementation evidence

Status:
: Accepted by the parent and committed. The task-list status is `completed`.

Implemented call graph:

```ts
DocsContentService Effect
  -> Effect.exit once
    -> Schema.Exit(success, error, Schema.Never) JSON encoding
      -> createServerFn and route loader return encoded data unchanged
        -> TanStack SSR hydration or client-navigation transport
          -> direct route-root consumer restores once
            -> typed Result match
              -> canonical values reach focused React composition and leaves
```

The final implementation matches the target call graph. Both route loaders
return their server-function output without restoration. Each direct route
component owns one immutable `Route.useLoaderData()` binding, one restore
binding and one local `Result.match` before passing canonical docs-content
values to composition components.

Ownership decisions:

- `apps/docs/src/lib/docs/errors.ts` owns the app-local browser-safe
  `DocsContentPreloadError` and `DocsRouteTransportError`. The preload path
  reuses the canonical `DocsSourcePath` schema.
- `apps/docs/src/lib/docs/route-boundary.ts` owns the repeated home/page codec,
  exact Cause cardinality and restore policy. `toRouteResult` was removed, and
  producer and consumer cardinality remain output-specific and inline.
- `apps/docs/src/lib/docs/loaders.ts` owns route input decoding, module-scoped
  runtime execution and unchanged encoded output. `createServerFn` keeps its
  default strict input/output serialisability checks.
- Route components own restoration and exhaustive composition. Extracted
  components receive schema-derived docs values only and do not read route
  data, decode transport or run Effect services.

Quality audit passes:

1. Call-graph audit: compared initial SSR and client-navigation paths to the
   target graph. Removed early loader restoration, confirmed both server
   functions encode through the same boundary, and confirmed each route root
   restores exactly once per invocation.
2. Effect and ownership audit: verified `Schema.Never`, one `Effect.exit`,
   `Effect.failCause` for any defect/interruption, exact failure cardinality
   through Effect `Array`, and `Effect.orDie` only at canonical encoding.
   Moved app errors to the neutral browser-safe owner and retained expected
   failures in typed channels.
3. React and helper audit: split meaningful failure, navigation, article and
   layout responsibilities while keeping the route root in control of
   restoration and `Result.match`. Replaced a repeated local tagged-error
   union with a type derived from the boundary result. Confirmed there are no
   route hooks, providers, higher-order components, memoisation wrappers,
   decoder wrappers, unsafe casts or one-use Effect error helpers.

Correction turns:

- Parent correction turn 1: Knip reported
  `apps/docs/src/lib/docs/route-boundary.type-test.ts` as unused. Added that
  exact fixture as an `apps/docs` Knip entry. The fixture remains included by
  the docs TypeScript project, its incompatible success and error programs are
  guarded by `@ts-expect-error`, and Knip now passes without category or file
  ignores.

Verification evidence:

| Gate | Outcome |
| --- | --- |
| Installed-source preflight | Confirmed `@tanstack/react-start@1.167.65`, `@tanstack/react-router@1.169.2` and `effect@4.0.0-beta.60`; rechecked strict server-function types and Effect Schema/Cause APIs. |
| `bun run test:docs-boundaries` | Passed 6 tests and 32 assertions covering success, every expected failure, malformed transport, standalone/composite defect and interruption, empty/multiple producer causes and invalid decoded causes. |
| `bun run --filter=docs check-types` | Passed, including the incompatible success/error compile-time fixture. |
| `bun run --filter=docs build` | Passed client, SSR and Nitro/Vercel production builds. |
| `bun run docs:validate` | Passed with 0 documentation issues. |
| `bun run verification` | Passed lint, format, Knip and all workspace type checks after correction turn 1. |
| Loader/route call-graph audit | Passed exact checks for unchanged encoded loader output and one immutable loader, restore and local `Result.match` binding per route root. |
| Effect/helper audit | Passed checks for canonical schemas, exact Cause policy, typed errors, allowed `Effect.orDie` placement, no broad catches, nested runtime, unsafe cast or helper sprawl. |
| Browser import-graph audit | Passed; the route boundary imports only browser-safe docs schemas/errors, Effect and the neutral app-local error owner. It imports no docs service, runtime, server, filesystem, environment, generated source or MDX loader. |
| Documentation review | Passed reader fit, Australian spelling, sentence-case headings, banned-language review, useful call graph, canonical naming and source-of-truth links. |
| `bun run changeset status --verbose` | Passed. Existing pending minor Changesets remain unchanged and no package receives a patch from this slice. |
| `git diff --check` | Passed after the final handoff edits. |

Changeset decision:
: No Changeset was added. TSLB-001 changes app-internal docs routing, focused
tests, repository analysis configuration and maintainer documentation. It does
not change a package export, installation behaviour or package-facing
contract. Existing pending Changesets were not consumed or modified.

Residual risk:
: TSLB-001 proves deterministic codec, failure and production-build behaviour.
The specialised restoration-placement lint rule belongs to TSLB-002, and
browser SSR/hydration plus client-navigation runtime proof belongs to TSLB-003.
Both follow-on slices are recorded below.

Parent acceptance:
: Accepted after correction turn 1. The parent reran the focused boundary
tests, docs typecheck and build, docs validation, full repository verification,
Changeset status, exact loader/route call-graph checks, browser-safe import
checks, helper/unsafe-pattern audits, JSON validation and `git diff --check`.
The implementation matches the spec's target SSR and client-navigation graphs,
keeps one-off output-specific Cause policy inline, and leaves no TSLB-001 work
for a later task.

### TSLB-002 implementation evidence

Status:
: Accepted by the parent and committed. The task-list status is `completed`.

Implemented enforcement flow:

```ts
exact canonical boundary-module import
  -> direct unaliased named boundary binding
    -> exact configured route-consumer file
      -> direct TanStack createFileRoute component or head binding
        -> direct Route.useLoaderData or owned head loaderData provenance
          -> one direct restore call
            -> same-consumer Result.match
              -> focused canonical values reach JSX composition
```

The lint flow matches the spec's production call graph. It governs only the
post-hydration restore call; the existing decoder rule remains global and the
actual Schema decoder remains in the exact route-boundary module.

Diagnostic coverage:

- Allowed real CLI fixtures cover direct component input, one immutable loader
  binding, a statically resolved same-file named component, direct route
  `head` input and an Option-normalised route `head` input.
- Rejected ownership and source fixtures cover unrelated files, ordinary
  components, leaves, hooks, helpers, callbacks, providers, unresolved route
  and component bindings, reassignment, `getRouteApi`, props, context and
  closure capture. Scope-resolved cases cover closure-sourced loader data,
  shadowed route bindings and canonical-name shadowing without false reports.
- Rejected import and member fixtures cover namespace, default, aliased,
  dynamic and CommonJS imports, boundary aliases, destructuring, member
  extraction, computed or optional access, callback passing and
  `call`/`apply`/`bind`. Whole-boundary assignment, object and array storage,
  function arguments and callback capture are rejected before alias dataflow
  can obscure the canonical import binding.
- Rejected composition fixtures cover multiple restores, unmatched results,
  encoded loader forwarding and restored `Result` forwarding. Unrelated
  methods named `restore` remain valid.
- The route fixture proves direct Schema decoding is still rejected. Comment-
  token fixtures cover file, next-line and line forms for both `eslint` and
  `oxlint` directives naming either boundary rule.

Quality audit passes:

1. AST coverage and diagnostics: replaced identifier-name matching with
   Oxlint scope-variable identity for imports, routes, loader data, Option and
   Result. Added direct head, closure-source, shadowing, optional-member,
   alias-forwarding, unresolved-route and all directive-spelling cases. The
   correction audit now rejects every whole-boundary runtime reference except
   the object of canonical `.restore`, while retaining shadowed-local and
   unrelated-restore negative proof without duplicate member diagnostics.
2. Configuration narrowness: audited one exact boundary module and exact
   production/fixture consumer files, with no globs, filename inference,
   route decoder exemption, nested config or boundary `ignorePatterns`
   exemption. The root directive pass names both boundary rules.
3. Maintainability: split the rule into policy-owned import, consumer,
   provenance, result and forwarding phases so repository complexity lint
   passes. Confirmed one visitor, no duplicated matcher visitor, source-text
   parsing, unsafe cast or speculative generic AST utility, and deterministic
   diagnostic counts across the real CLI suite.

Correction turns:

- Parent correction turn 1: a canonical boundary assigned into an existing
  alias could evade restore-member tracking. Replaced declarator-only alias
  checks with scope-resolved runtime-reference validation. Added configured
  assignment-alias and whole-boundary argument/storage CLI regressions, and
  removed the outer canonical reference from the shadowed-local negative.
  Preserved type-only `TSTypeQuery` use and pinned it in the allowed fixture.

Verification evidence:

| Gate | Outcome |
| --- | --- |
| `bun run test:oxlint` | Passed 26 real CLI tests and 41 assertions across both boundary rules. |
| `bun run lint` | Passed the comment-token boundary-directive pass and repository-wide Oxlint run with nested config disabled. |
| `bun run test` | Passed 6 docs-boundary tests, 26 Oxlint tests and all 17 Turbo package test tasks. |
| `bun run verification` | Passed lint, format, Knip and all 22 workspace type/build checks. |
| Positive production/fixture CLI run | Passed both production docs routes and the exact allowed route fixture with `--disable-nested-config`. |
| Negative CLI categories | Passed ownership, import, member, provenance, multiplicity, matching, forwarding, decoder and directive-token diagnostics through the focused suite. |
| Config audit | Passed exact module/file entries, no route globs, no route decoder exemption, no boundary ignore and one root config only. |
| Helper audit | Passed one-visitor review with no source-text parsing, unsafe casts, duplicated visitor policy or generic AST utility. |
| Documentation review | Passed reader fit, Australian spelling, sentence-case headings, banned-language review, canonical names and source-of-truth ownership; `bun run docs:validate` reported 0 issues. |
| `bun run changeset status --verbose` | Passed. Existing pending minor Changesets remain unchanged and no package receives a patch from this slice. |
| Task-status audit | `TSLB-002` is `completed` in the task list and accepted by the parent. |
| `git diff --check` | Passed. |

Changeset decision:
: No Changeset was added. TSLB-002 changes repository lint tooling, exact CLI
fixtures, root script wiring and maintainer documentation. It does not change
package exports, installation behaviour or a package-facing contract. Existing
pending Changesets were not consumed or modified.

Residual risk:
: The rule intentionally rejects unsupported static shapes instead of
performing arbitrary interprocedural or type-aware analysis. Runtime browser
SSR/hydration and client-navigation proof remained TSLB-003 scope and is
recorded below. The spec call graph remains accurate.

Parent acceptance:
: Accepted after correction turn 1. The parent reproduced the boundary-object
assignment bypass with an exact configured CLI fixture, verified the correction
and new assignment/storage/argument regressions, and reran all 26 Oxlint tests,
repository lint, full tests, full verification, docs validation, exact-config
and source-text/helper audits, Changeset status, JSON validation and
`git diff --check`. The rule now fails closed for every specified import,
ownership, member, provenance, matching and forwarding category without
reporting shadowed locals or unrelated `restore` methods.

### TSLB-003 implementation evidence

Status:
: Accepted by the parent. The task-list status is `completed`.

Final production call graph:

```ts
apps/docs/navigation.json build-time representation
  -> canonical DocsNavigation schema decode
    -> DocsContentService Effect
      -> Effect.exit once
        -> Schema.Exit(success, error, Schema.Never) JSON encoding
          -> createServerFn and route loader return encoded data unchanged
            -> TanStack SSR hydration or client-navigation transport
              -> direct route-root restore
                -> local Result match
                  -> focused canonical values reach React composition and leaves
```

Internal docs links now use TanStack `Link`, so a hydrated navigation runs the
destination route loader and server-function RPC without requesting a new
document. The built runtime bundles the app-authored navigation representation
before decoding it through `DocsNavigation`; this removes the invalid
source-relative filesystem lookup discovered in the first Vercel preview.

Browser harness:

- `apps/docs/vitest.browser.config.ts` runs Vitest Browser Mode with the
  Playwright provider and one headless Chromium instance. It builds the harness
  with production React/TanStack branches so handled route defects do not emit
  development-only framework warnings; the tests still assert zero console
  warnings and errors.
- The programmatic `/$scenario` route uses `Route.useLoaderData`, the canonical
  `docsHomeRouteBoundary.restore` operation and a local `Result.match`.
- Seven Chromium tests prove success, all three canonical expected failure
  categories, malformed transport, defect and interruption. Expected and
  malformed states render route UI; defect and interruption reach the route
  `errorComponent`.
- `Effect.acquireUseRelease` owns DOM, React root, router history and console
  spy cleanup. No production route, hook, provider, HOC, DTO mirror or cast was
  added.
- This is client-route evidence only. It does not prove SSR or hydration.

Built browser evidence:

- Built `apps/docs` with the Vercel Nitro preset and served the output through
  `https://docs.taxkit.localhost` using portless.
- A Chromium context with JavaScript disabled received HTTP 200 and found the
  server-rendered home heading `Open-source tax engine, API and SDK
  documentation` plus `61 documentation pages loaded.` before interaction.
- A JavaScript-enabled context retained the same heading and page count after
  hydration, with no console warnings, console errors or uncaught page errors.
- After waiting for the hydrated TanStack link handler, clicking `/start`
  produced a successful GET fetch to
  `/_serverFn/c8c6dd06eff1c0e65f1a26f5f19875cdffdd3fa5ecbc071662ff68412ee81193`,
  loaded the destination MDX chunk and rendered the `Start` heading. The
  transition made zero document requests.
- Review screenshot: `/tmp/taxkit-tslb-003-start.png`. It is intentionally not
  committed.

Dependency changes:

- Added docs-app dev dependencies `@vitest/browser-playwright@4.1.7`,
  `playwright@^1.60.0` and the existing workspace-catalogued `vitest`.
- The lock resolves Vitest and its browser provider to `4.1.7` and Playwright to
  `1.61.1`. No production dependency changed.
- Added explicit docs `test:browser` and portless `preview` commands.

Final inventories:

- The repository-owned decoder scan found 42 executable operations after
  excluding helper declarations/references, custom-rule diagnostic strings,
  generated output and source strings used only as Oxlint fixtures. The three
  new operations decode canonical browser-test fixtures in the exact
  allowlisted browser harness. Every executable decoder remains in an exact
  `decodingBoundaryFiles` entry.
- Production restoration remains exactly two calls: one in each direct route
  root, each consuming one immutable `Route.useLoaderData` binding and followed
  by local `Result.match`. The browser harness contains one canonical restore
  under an exact programmatic-test override. Unit tests contain four focused
  codec restore calls. Remaining matches are tested Oxlint fixture source.
- `routeTransportConsumerFiles` remains an exact production/CLI-fixture list
  with no route glob. The browser harness has an exact-file override because a
  programmatic `createRoute` must not be admitted as a production
  `createFileRoute` consumer.
- The route boundary import graph contains only browser-safe canonical docs
  schemas/errors, Effect modules and the neutral app-local error owner.

Quality audit passes:

1. Behavioural proof: expanded the client harness across every required
   outcome category, kept strict clean-console assertions and separately proved
   server HTML, hydration and one real client-navigation RPC in the built app.
   The first built probe exposed the relocated navigation filesystem path;
   bundling and schema-decoding the authored representation corrected it.
2. Architecture and component shape: reconciled the final call graph, retained
   one immutable loader and restore binding per production route, converted
   internal navigation to TanStack `Link`, and confirmed focused leaves have no
   loader, boundary, service or runtime imports. No route-specific abstraction
   family or shared package was introduced.
3. Documentation and release readiness: reconciled app/package READMEs,
   frontend/content/testing architecture, spec and indexes against the full
   documentation standards suite. Confirmed current names, sentence-case
   headings, Australian spelling, source-of-truth links, no generated evidence
   in git and no package publication/versioning action.

Verification evidence:

| Gate | Outcome |
| --- | --- |
| `bun run --filter=docs test:browser` | Passed 7 Chromium tests covering success, three expected failures, malformed transport, defect and interruption with clean console assertions. |
| `bun run test:docs-boundaries` | Passed 6 tests and 32 assertions. |
| `bun run test:oxlint` | Passed 26 real CLI tests and 41 assertions. |
| `bun run lint` | Passed the boundary-directive pass and repository-wide Oxlint run. An earlier concurrent lint run observed the Oxlint suite's temporary fixture; the required sequential rerun passed. |
| `bun run test` | Passed docs boundary tests, Oxlint tests and all 17 Turbo package test tasks. |
| `bun run --filter=docs check-types` | Passed app and checked-example TypeScript checks. |
| `bun run --filter=docs build` | Passed client, SSR and Nitro/Vercel production builds. |
| `bun run docs:validate` | Passed with 0 documentation issues. |
| `bun run verification` | Passed lint, formatting, Knip and all 22 workspace checks. |
| Built browser proof | Passed server-rendered home, clean hydration, 200 server-function fetch, zero-document client transition and rendered `/start` MDX checks. |
| Decoder/restore inventories | Reconciled 42 executable decoder operations, two production restores, one programmatic harness restore, four focused unit restores and exact lint configuration. |
| Effect/React/helper audits | Passed exact failure cardinality, typed errors, canonical schemas, linear pipelines, no broad catches, no nested runtime, no casts/DTO mirrors and no wrapper family. |
| Documentation review | Passed reader fit, Australian spelling, sentence-case headings, banned-language, template, diagram, canonical-name and source-of-truth review. |
| `jq empty docs/product-specs/tanstack-start-loader-transport-boundaries.tasks.json` | Passed; every task is `completed`. |
| `bun run changeset status --verbose` | Passed. Existing pending minor Changesets are unchanged and this slice adds no package release. |
| Changeset diff audit | Passed; `.changeset/*` has no diff. |
| `git diff --check` | Passed. |

Changeset and release decision:
: No Changeset was added. The browser tooling is private docs-app development
tooling; the route, navigation and docs-content changes support the private docs
runtime; documentation changes are maintainer-facing. No public package export,
installation contract or published behaviour changed. Existing pending
Changesets were neither modified nor consumed. No versioning or publication
command ran.

Residual risk:
: The client harness intentionally does not prove SSR. The built proof covers a
local Nitro/Vercel preview through portless, not a deployed Vercel environment.
The custom restoration rule remains static analysis and the browser harness
uses an exact test-only override for programmatic routes.

Parent acceptance:
: Accepted with no subagent correction turn. The parent independently reran the
seven-test Chromium harness, six codec tests with 32 assertions, all 26 Oxlint
CLI tests with 41 assertions, package tests, repository lint, full tests, docs
type checking, the Vercel/Nitro build, docs validation and Changesets status.
The parent then proved raw SSR content, clean hydration and a real `/start`
client transition with successful server-function responses, no document
request, the expected MDX heading and no console or page errors. Three parent
audit passes reconciled behavioural proof, Effect/React/helper ownership and
documentation/release status. The parent corrected definition-list indentation
in the content architecture page before final verification.

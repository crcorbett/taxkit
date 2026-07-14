---
status: active
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
| TSLB-003 | pending | Browser proof, final inventory, documentation and rollout close-out. |

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
: Implemented and awaiting parent review. The task-list status remains
`pending`, and no parent acceptance is recorded.

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
Neither follow-on task has started.

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
: Implemented and awaiting parent review. The task-list status remains
`pending`, and no parent acceptance is recorded. TSLB-003 has not started.

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
| Task-status audit | `TSLB-002` remains `pending` in the task list while this plan records implementation awaiting parent review. |
| `git diff --check` | Passed. |

Changeset decision:
: No Changeset was added. TSLB-002 changes repository lint tooling, exact CLI
fixtures, root script wiring and maintainer documentation. It does not change
package exports, installation behaviour or a package-facing contract. Existing
pending Changesets were not consumed or modified.

Residual risk:
: The rule intentionally rejects unsupported static shapes instead of
performing arbitrary interprocedural or type-aware analysis. Runtime browser
SSR/hydration and client-navigation proof remains TSLB-003 scope and has not
started. The spec call graph remains accurate.

Parent acceptance:
: Accepted after correction turn 1. The parent reproduced the boundary-object
assignment bypass with an exact configured CLI fixture, verified the correction
and new assignment/storage/argument regressions, and reran all 26 Oxlint tests,
repository lint, full tests, full verification, docs validation, exact-config
and source-text/helper audits, Changeset status, JSON validation and
`git diff --check`. The rule now fails closed for every specified import,
ownership, member, provenance, matching and forwarding category without
reporting shadowed locals or unrelated `restore` methods.

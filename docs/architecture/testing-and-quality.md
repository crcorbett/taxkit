---
status: canonical
last_reviewed: 2026-07-14
source_of_truth: docs
confidence: high
---

# Testing and quality

TaxKit quality depends on deterministic calculation tests, package boundary
tests, graph validation, trace snapshots, API/SDK parity and build/type health.

## Scope

This doc owns cross-cutting quality expectations. Detailed rule-package test
requirements live in [Testing and validation](./testing-and-validation.md).

## Main areas

- rule-builder unit tests
- ATO golden tests and known scenarios
- property tests for thresholds and monotonicity
- date-boundary tests
- graph validation in CI
- trace snapshots
- package export and browser-safety tests
- API and SDK parity tests

## Current baseline

The current repository baseline is canonical root verification:

```bash
bun run verification
```

Root verification includes lint, format, Knip and workspace type checks. For
docs, that means `apps/docs` type checking also typechecks checked examples,
and dependent package builds run before type checks through Turbo. Heavier
docs runtime gates remain explicit package commands so normal local
verification does not rebuild and validate the whole docs corpus on every
change:

```bash
bun run docs:validate
bun run docs:build
bun run --filter=docs test:browser
bun run --filter=@taxkit/docs-content test
```

Run those package-local docs gates whenever MDX content, Fumadocs source
wiring, docs examples, validation policy or docs rendering changes.

Release-facing package work must also prove actual tarballs rather than
workspace imports or dry-run file lists:

```bash
bun run --filter=@taxkit/sdk check-packed-artifact
bun run --filter=@taxkit/sdk validate:downstream
```

The focused command uses an Effect-native, scope-managed Bun runtime to pack,
inspect and import the SDK artifact. The strict command builds the nine-package
release closure, materializes each declared dist-only
`publishConfig.exports` view, Bun-packs it, rejects source/protocol leakage,
installs all tarballs in a clean external workspace, typechecks and runs SDK
examples, imports every JavaScript public entrypoint and browser-bundles the
browser-safe SDK surface. It has no audit-only success mode.

The docs browser command runs a programmatic client-side TanStack route harness
in Chromium. It may prove direct `Route.useLoaderData` restoration, recoverable
route UI, framework error boundaries and console cleanliness, but it does not
prove SSR or hydration. Prove initial SSR, hydration and client navigation
separately against the built app on `https://docs.taxkit.localhost`, including
a successful server-function response and no document request during the client
transition.

Public API route work should also capture contract evidence from the standalone
API app:

- generated OpenAPI route evidence from `/api/docs/openapi.json`
- at least one metadata route smoke check
- at least one successful calculation route smoke check
- at least one schema-guided error response with field paths and descriptor
  help
- Changeset status evidence for package-facing changes

The implemented release-readiness command composes the complete local release
evidence without taking ownership of those validators:

```bash
bun run release:check
```

`@taxkit/scripts` runs root verification, workspace tests and builds, docs
content validation, the focused SDK artifact check, strict downstream package
validation, API smoke, docs browser proof and Changeset status in that order.
The command uses the Effect Platform child-process `Command` model through a
`ReleaseCommandRunner` service, records schema-backed outcomes, and fails fast
with tagged execution or non-zero-exit errors. Package-owned command
implementations remain in their current packages and apps. The live runner
depends on `ChildProcessSpawner`; only the Bun runtime entrypoint provides
`BunServices.layer`, and that same runtime resolves the workspace root through
Effect `Path.fromFileUrl`.

```text
root release:check
  -> @taxkit/scripts runtime
  -> ReleaseCommandRunner
  -> canonical root, app and package commands
  -> schema-backed ordered outcomes or one tagged failure
```

`release:check` is the complete local release-evidence graph, not publication
approval. Versioning, changelog application and publishing remain explicit
operations after a human reviews pending Changesets and the release impact.

## Review evidence

Substantial code, package-boundary, API, SDK, app-runtime or documentation
rollouts record three audit passes in their task evidence or execution plan:

1. Compare the final code and command graphs with their owning architecture and
   spec.
2. Inspect Effect flow, schemas, tagged errors, unsafe casts, DTO mirrors and
   helper or abstraction sprawl.
3. Inspect CI, lint, packed-consumer, browser/API, documentation and Changeset
   evidence appropriate to the changed surface.

New shared abstractions must satisfy the
[abstraction admission contract](../design-docs/abstraction-admission.md).
Focused tests must prove the claimed policy or substitution point; coverage
that only calls through a wrapper is not admission evidence. Static lint is a
supporting gate and cannot replace semantic ownership or call-graph review.

## Guardrails

- A rule pack is incomplete without source references and golden tests.
- Graph validation failures should fail the build.
- API responses must stay schema-backed.
- Public docs content must validate through `@taxkit/docs-content` before
  documentation/runtime slices are accepted.
- Keep browser tooling in app dev dependencies and browser harness routes out
  of production route trees.
- Browser-safe exports must not import Node-only modules.
- Oxlint can enforce restricted APIs, such as banned `Object.*` enumeration
  helpers, but it does not currently provide a safe built-in rule for banning
  functions below a minimum line count. Prefer review and architecture guidance
  for tiny one-off wrapper or mapper helpers.
- `tools/oxlint/effect-rules.js`, `bun-rules.js` and `mdx-rules.js` own
  domain-neutral contracts. `taxkit-rules.js` owns tax/calculator policy plus
  decoder and route-transport rules. Do not put package names or tax defaults
  into a portable rule message.
- Portable Effect rules ban manual `_tag` literals and `switch`, keep live/test
  Layers out of service contracts, restrict encoder execution, reject throwing
  Schema sync codecs, preserve typed service errors and tagged-error causes,
  and keep runtime, console, process and host imports at configured boundaries.
  Use `Data`/`Schema` tagged classes, `Match`, Effect Platform services and
  exact live/runtime adapters instead. Binding-sensitive rules resolve
  canonical and namespace imports, renamed bindings, aliases and statically
  known destructuring. Accepted real-binary fixtures prove that unrelated
  shadowed locals with the same names do not report.
- Bun rules keep `Bun.file`, `Bun.write`, `Bun.spawn`, `Bun.serve` and
  `BunRuntime.runMain` in exact adapter/entrypoint files. The MDX rule keeps
  route-local component registries out of route composition. The test-global
  rule rejects split ownership of unaliased `describe`, `expect`, `it` or
  `test` between `@effect/vitest` and `vitest`. Vitest-only utilities such as
  `vi` or hooks may be imported beside `@effect/vitest`; an explicitly aliased
  secondary shared API is also valid.
- Calculator service code under `packages/calculators/src` has stricter custom
  Oxlint rules that ban raw `typeof`, `instanceof`, `in`, `=== undefined`,
  conditional object-spread shaping and jurisdiction/tax-year `??` defaults.
  These rules enforce Schema, Option, Match and schema-owned optional fields for
  public calculator policy. The same scope also bans raw `null` comparison,
  nested wrapper-call composition, native array pipelines, native `Map`/`Set`,
  thrown exceptions, `async`/`await`/`new Promise`, ad hoc
  `JSON.parse`/`JSON.stringify` and hidden time/randomness so calculator
  services use pipe-first composition, Effect `Array`, `Chunk`, `HashMap`,
  `HashSet`, `Effect`, `Layer`, `Clock`, `Random` and schema codecs instead of
  vanilla JavaScript/TypeScript escape hatches.
- `taxkit/no-decoding-outside-boundaries` is enabled repository-wide. The
  rule reports executable Effect Schema decoders, direct decoder
  helpers, decoder members, statically named computed members, decoder factory
  creation and statically traceable aliases. It must not report encoding,
  schema declarations or declarative APIs such as `Schema.decodeTo`.
- `oxlint.config.ts` owns one named, exact `decodingBoundaryFiles` allowlist.
  An override may disable only `taxkit/no-decoding-outside-boundaries` for an
  exact reviewed file; it must not use `ignorePatterns`, package-wide globs,
  filename-pattern exemptions, broad test exemptions or nested configuration.
  Inline `oxlint-disable` and `eslint-disable` comments naming the rule are
  forbidden and must be checked from comment tokens, not raw repository text.
- Custom-rule tests must cover prohibited and allowed Effect decoder families,
  imports and aliases, descriptor/member decoders, static computed members,
  factory creation and extraction. They must also cover a TSX decoder attempt,
  negative cases for encoding and `Schema.decodeTo`, and real Oxlint CLI
  fixtures for both a prohibited file and an exact allowlisted file. Run those
  fixture commands with `--disable-nested-config`.
- Every enabled portable custom rule must also have accepted and rejected
  fixtures executed through the installed Oxlint binary with
  `--disable-nested-config`. Direct visitor-unit tests alone are not acceptance
  evidence. Fixture-only rejected source stays non-executable and is copied to
  an exact generated path for the binary run.
- Portable binding rules require rejected real-binary cases for renamed or
  destructured canonical bindings and accepted unallowlisted cases for
  unrelated same-named locals. Dynamic property values, aliases returned from
  arbitrary functions and cross-module value flow remain review-only because
  Oxlint cannot resolve them without interprocedural type analysis; do not add
  broad suppressions to simulate that analysis.
- `taxkit/no-route-transport-restore-outside-consumers` governs the separate
  post-hydration restore operation. It tracks scope-resolved direct, unaliased
  named imports from canonical route-boundary modules and permits a restore
  only in an inline or statically resolved same-file `createFileRoute`
  `component` or `head` consumer. Namespace, default, aliased, dynamic and
  CommonJS boundary imports fail closed.
- A route component may restore a direct `Route.useLoaderData()` result or one
  immutable local binding initialised from that call. A route-owned `head` may
  restore its `loaderData` input directly, or an immutable value normalised
  with Effect `Option` when the input is optional. The consumer must restore
  once, match the `Result` itself and pass focused canonical values into React
  composition. Encoded loader data and the whole restored `Result` must not be
  forwarded to children.
- The restore rule rejects unresolved route or consumer bindings, ordinary
  components, leaves, hooks, helpers, callbacks and providers. It also rejects
  `getRouteApi`, prop, context and closure sources, mutable or aliased loader
  bindings, member extraction, destructuring, computed or optional access,
  whole-boundary assignment, storage or argument forwarding, callback passing
  and `call`/`apply`/`bind` indirection. Lexically shadowed and unrelated
  methods named `restore` remain outside the rule.
- `oxlint.config.ts` owns the exact route-boundary module and consumer-file
  lists. These lists must not use route globs, filename inference, nested
  configuration or `ignorePatterns` exemptions. Route TSX files remain under
  `taxkit/no-decoding-outside-boundaries`; the specialised restore rule does
  not make them decoder boundaries.
- The root boundary-directive pass rejects `eslint-disable` and
  `oxlint-disable` comment tokens naming either boundary rule. Real Oxlint CLI
  fixtures must run with `--disable-nested-config` and cover every allowed and
  rejected consumer, import, member, data-source and forwarding category.
- The lint rule cannot determine whether a helper owns meaningful repeated
  policy. Use the boundary contract, compile-time tests, three documented
  audit passes and parent review to reject one-use decoder/error wrappers.
- Static lint also cannot infer whether `Schema.Defect()` should be replaced by
  an owning provider/domain error, whether an arbitrary provider SDK import is
  a true adapter, or whether a new abstraction has semantic weight. Keep those
  checks review-only rather than adding broad filename exemptions or brittle
  text-search rules.
- Verification evidence should be recorded in specs, task lists or exec plans
  when work spans multiple packages.
- Keep `bun run release:check` as orchestration over canonical commands. A new
  release gate must first have an owning package command and focused tests; do
  not implement its validation policy inside `@taxkit/scripts`.

## Related Docs

- [Testing and validation](./testing-and-validation.md)
- [Graph, trace and ledgers](./graph-trace-ledgers.md)
- [API and SDK](./api-and-sdk.md)

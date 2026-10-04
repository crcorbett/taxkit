---
document_type: architecture
lifecycle: current
authority: canonical
owner: taxkit-quality-owner
last_reviewed: 2026-10-04
review_trigger: verification graph, proof boundary, CI, deployment, or test-owner change
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
bun run knip:production
bun run test:skills
```

Root verification includes lint, format, both Knip graphs and workspace type
checks. The development-aware graph covers repository tooling, tests and
current application scaffolds. The production graph separately proves the
eight code-bearing packages in the nine-artifact release closure,
`@taxkit/scripts` exports and commands, and the standalone API runtime without
test or development reachability. It also models the real `apps/docs`,
`@taxkit/docs-content` and `@taxkit/docs-fumadocs` production entries,
including the generated browser/server source consumed by the app and the
build-time Vite/source config. `@taxkit/tsconfig` is JSON-only and remains
covered by strict packed/downstream artifact proof rather than a fabricated
TypeScript entrypoint. Root tools and `apps/web` remain outside the production
graph by ownership. Root verification also typechecks and executes
the root repository-path gate, which scans
Git-tracked readable text and safely reports only repository-relative file,
positive line and closed finding category. Binary files are identified by a
NUL byte or failed strict UTF-8 decode and skipped. For skill governance it
also runs `test:skills`, which validates required policy language and rejects
stale provider-wrapper examples. The root graph also runs
`check:harness-governance` exactly once. That Effect-native gate decodes the
TaxKit profile, structured HE findings/crosswalk, canonical skill receipt, and
critical-journey inventory at filesystem ingress, then checks local skill-tree
digests, the two permitted profile overlays, the two declared extras, eight
relative Claude links, the maintained lifecycle with stable spec/plan index
owners, self-contained references, portable runtime paths, and external
non-claims. Its positive and adversarial corpus is owned by
`tools/governance/`; focused type and test commands are
`check:harness-governance:types` and `test:harness-governance`.
Target-specific requalification is separately owned by
`check:harness-foundation-epoch` and its focused TypeScript check. That command
binds one immutable candidate to complete validator sources, the canonical
skill and journey projections, retained failures, five receipts, fresh
independent review, clocks, limitations and non-claims. It is a closeout check,
not another root-verification or Quality-workflow edge.
For docs, `apps/docs` type checking also
typechecks checked examples,
and dependent package builds run before type checks through Turbo.
`@taxkit/docs-content#generate` names content, navigation, source config,
canonical schema and package-manifest inputs, writes `.source/**`, and follows
the compiled `@taxkit/docs-fumadocs` build. The content build executes that
named generation command, and the docs app build follows both packages.
Heavier
docs runtime gates remain explicit package commands so normal local
verification does not rebuild and validate the whole docs corpus on every
change:

```bash
bun run docs:validate
bun run docs:build
bun run test:docs-boundaries
bun run --filter=docs test
bun run --filter=docs test:browser
bun run --filter=docs test:built
bun run --filter=docs test:cloudflare-built
bun run --filter=@taxkit/docs-content test
```

Run those package-local docs gates whenever MDX content, Fumadocs source
wiring, docs examples, validation policy or docs rendering changes.
`test:docs-boundaries` checks browser imports, then invokes the default docs
test owner once. That owner includes native import-checker fixtures, the typed
native route-result corpus and tests that reuse one app-owned server runtime.
The runtime tests use its native context/disposal Effects inside a scope and
verify release after success, failure and interruption; they need no Promise
execution permission. The exact private factory retains the runtime creation
permission, with a neighbouring rejection fixture and an exact-selector test. The package content test composes
the deterministic `DocsContentService` test Layer over the generic
`FumadocsSource` test Layer and covers accepted, missing and malformed content.

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
browser-safe SDK surface. It also executes the installed caller-owned client
for all three supported calculators, awaits disposal and checks subsequent
safe/normal failures. It has no audit-only success mode.

The SDK's `check-types` command also checks its script project. The native SDK
test command includes controlled FileSystem/process fixtures, including failed
reads, malformed manifests, failed searches, pipe/exit failures, stdout limits,
interruption and cleanup. Script source and tests have the same canonical
strict rules as SDK source, with execution admitted only in the three exact
command runtime files. The owning package README describes their output and
manifest-preservation contract.

`bun run sdk:test:browser` executes the SDK's source and controlled lifetime
suite in Chromium, including startup, interruption, independent clients and
cleanup failures. Full verification includes this browser suite. It establishes
browser execution separately from the packed consumer's browser bundle.

The docs browser command runs a programmatic client-side TanStack route harness
in Chromium. It may prove direct `Route.useLoaderData` restoration, recoverable
route UI, framework error boundaries and console cleanliness, but it does not
prove SSR or hydration. Prove initial SSR, hydration and client navigation
separately against the built app on `https://docs.taxkit.localhost`, including
a successful server-function response and no document request during the client
transition. `bun run --filter=docs test:built` is that built-production HTTP,
workerd and Playwright proof: it serves the generated Cloudflare no-bundle
Worker and static assets on an ephemeral local port, asserts SSR response
content and HTTP 404 before browser inspection, then proves clean hydration,
server-function navigation through real sidebar and authored-MDX links, browser
history, pending and client not-found behavior without another document
request. It also asserts that initial hydration does not steal focus, client
navigation focuses the destination heading, the skip link reaches the main
landmark, navigation is labelled and current, the mobile disclosure is
operable, representative interactive colours meet the owned contrast
threshold, reduced motion removes no required information, immutable asset
headers, runtime reuse and compressed upload limits, and the console is clean.
The command owns workerd/browser cleanup. `test:cloudflare-built` is an
explicit alias. Its screenshot mode is supplemental visual evidence only: a
visually correct image does not prove SSR content, hydration, request resource
type, HTTP status, keyboard or focus behavior, contrast, motion suppression or
console cleanliness.

The built proof independently builds the official Cloudflare target, verifies
Wrangler's no-bundle dry-run without credentials or bindings, and copies only
`dist/server` and `dist/client` to an isolated temporary directory before
starting Wrangler/workerd. It proves initial SSR, static assets and immutable
cache headers, direct and client not-found behavior, hydration, server-function
transport, no-document client navigation, sequential/concurrent request
isolation, representative accessibility and console/page cleanliness. It also
checks the gzip upload against the 3 MiB Workers Free limit and records local
process-to-first-response and first-response-request timing. Those timings are
readiness observations, not Cloudflare CPU-startup-limit validation. The
provider must establish the account plan, upload acceptance, deployment/runtime
identity and applicable startup-limit readback.

The separate
`docs/verification/docs-deployment-journeys.json` inventory owns only four
deployment-supporting claims: local workerd, hosted Preview, hosted Production
and Production rollback/operator proof. `bun run check:docs-deployment`
Schema-decodes that owner and the admitted dated receipts. It does not join the
five local release journeys. The accepted DCD-002 requalification chain binds
exact candidate `d9cb8945529fb72158e59ca0daf02a98e1e4de1a`, exact
pre-deploy and pre-destroy state/provider readback, equal plans, provider
Worker/deployment/version/assets/URL readback, hosted HTTP/browser proof,
reviewed desktop/mobile screenshots and exact-stage teardown/absence. It is a
dated Preview-and-teardown observation, not current Preview availability.

The accepted DCD-003 chain separately validates the first fixed `prod`
deployment, the successor's trusted Preview and exact-stage absence, the
successor Production update, and the normal source-bound redeploy of
`d9cb894…`. Executable cross-receipt checks require two viewport classes,
provider/hosted/screenshot identity equality, distinct deployment/version IDs,
stable Worker/URL/state instance, and restoration of the initial d9 state
bundle. A negative test changes the restored bundle hash and must fail. These
dated observations establish no custom domain, DNS, byte promotion,
known-bad-content recovery, paid-plan or release claim.

The retained `0d714e6…` observation is disconfirming history: it did not
establish the same pre-mutation, isolate-equality, mobile-request, public-cache,
state-detail or screenshot-input contract.

The built graph retains Node filesystem code in two qualified, non-normal-route
branches: generated Fumadocs `getText("raw")`, while the runtime adapter calls
`getText("processed")`, and the lazily imported validation policy. The harness
executes normal requests from a temporary working tree containing only emitted
output; it also rejects checkout-absolute paths in the filesystem-bearing
modules. It fails if these branches spread, bindings appear, credential names
enter output, the Worker constructs per request, or output-only execution
fails.

The Worker entry exposes temporary migration instrumentation only when a
request opts in with `x-taxkit-docs-runtime-proof: construction-count`. The
returned construction count and random isolate identifier contain no
configuration or user data and are not a public API guarantee. This channel is
owned by the deployment migration, reviewed on runtime/entry/privacy changes,
and retired after an equally strong non-public provider oracle exists;
otherwise its bounded carrying cost remains explicit.

The API app's native test command covers isolated Config providers, primary
port validation, smoke argument/port ingress, stalled headers and bodies,
invalid HTTP responses, native child-process failures, bounded command output,
interruption, consumer timeout and folder cleanup failures. Controlled fixtures
use native test services and a virtual clock. The actual smoke command still
proves the standalone loopback server and external plain JavaScript consumer;
fixtures alone do not prove that process or hosted execution. Its OpenAPI-path
mutation retains the exact existing calculate-path failure oracle, now checked
before the external consumer runs.

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
captures `ChildProcessSpawner`, FileSystem, Path and Crypto; only the Bun runtime entrypoint provides
`BunServices.layer`, and that same runtime resolves the workspace root through
Effect `Path.fromFileUrl`.

```text
root release:check
  -> @taxkit/scripts runtime
  -> ReleaseCommandRunner
  -> canonical root, app and package commands
  -> schema-backed ordered outcomes or one tagged failure
```

Release-script checks also cover exact command-host permissions, independent
stream state, all original chunk-split redaction cases, long values and complete
large output. Native-service fixtures preserve true exits and first-failure
records, close process/stream scopes on interruption, and map native digest or
filesystem errors without secret text. A reused program starts with an empty
accumulator each time. Fixed SHA-256 vectors and immutable receipt readbacks
protect retained representation. The dated
[release-script receipt](../documentation-audit/clean-slate-foundation/2026-10-04-release-script-boundaries.json)
records this local qualification separately from hosted checks.

`release:check` is the complete local release-evidence graph, not publication
approval. Versioning, changelog application and publishing remain explicit
operations after a human reviews pending Changesets and the release impact.

The Quality workflow invokes `bun run release:check -- --ci` for every
configured pull request and for pushes to `main` rather than relying on path
filters. Feature-branch pushes are covered by the pull-request event, so the
same Quality graph is not run twice for one change. The explicit CI mode runs
the same nine ordered checks without consuming or
rewriting an HGI-203 candidate packet; it returns bounded local command detail
only. The sequential release orchestrator stays live, while every eligible
deterministic root, workspace and app/package leaf runs through Turbo. Root
commands use explicit `//#...:task` entries so a public wrapper never calls
itself. Builds declare their output paths and environment-sensitive inputs;
provider, candidate, receipt, dependency-install and browser-install work
remain live. Its exact read-only runner bootstrap fetches complete Git history,
materialises the configured `main` comparison ref, restores only Bun package
downloads and Playwright Chromium binaries, then still runs frozen install and
Chromium `--with-deps` through the app-local Playwright executable before the
canonical graph. This keeps Changesets and docs build/browser proof bound to
the checked-out graph; floating `bunx` resolution is rejected.

After every dependency-cache save, trusted Quality fetches the minimum
`taxkit/ci` config with the full-SHA Doppler secrets-fetch action. Only the
fetch step receives repository `DOPPLER_CI_TOKEN`. A following value-free check
requires project `taxkit` and config `ci`, and only the canonical release step
receives the named `TURBO_TEAM` and `TURBO_TOKEN` outputs with
`local:rw,remote:rw`. Same-repository pull requests and pushes to `main` can
therefore populate and reuse matching task hashes after the separately
authorised bridge exists. Fork pull requests do not run the fetch action and
run the same release graph with `local:rw` only. The policy rejects broad
injection, wrong metadata, direct legacy bindings, a fetch before cache saves,
remote read-only regression, `pull_request_target` and extra step-level
bindings. A cache miss or unavailable service changes speed only; a missing or
bad Doppler config fails the trusted path closed instead of silently changing
source.
Same-repository pull-request
code can access the cache token; this accepted trust boundary must be reviewed
if contributor trust or token scope changes. Cache logs and artifacts are not
candidate, release, provider, deployment or public-site proof.

The read-only, single-config repository bridge is established and merged-main
Quality has read it successfully at an exact revision. The direct Turbo secret
and variable have been removed. Fork behaviour remains repository-policy proof
until an authorised hosted fork run is recorded.

The GitHub dependency caches are separate from Turbo. The Bun cache resolves
its user-level path with `bun pm cache` and never contains `node_modules`.
Warm hosted frozen install currently takes only 1–2 seconds after restore,
while the installed tree is about 1.4 GB with thousands of workspace links;
transferring a second installed-tree archive is not justified by that saving.
Chromium uses an explicit `ms-playwright` directory under GitHub's runner
temporary directory and outside the checkout. Both keys include OS,
architecture and `bun.lock`; Bun also includes `.bun-version`, while Chromium
includes the resolved app-local Playwright version. Event name is deliberately
absent: a pull request may restore a content-identical default-branch cache,
while GitHub keeps its writes scoped to the pull-request merge ref and
unavailable to `main` or sibling pull requests. Restore/save actions are pinned
to the full v6.1.0 commit, are non-fatal, and save only after their install
succeeds. Frozen dependency installation, system-package setup and the complete
browser check remain live on hits, misses and cache outages.
Turbo treats `PLAYWRIGHT_BROWSERS_PATH` as an explicit build and browser-test
input so strict environment filtering cannot detach those tasks from the
installed Chromium identity.

A non-CI `release:check` remains the authority-bound new-candidate
operation in the release-readiness runbook. Its static contract is owned by
[`../../tools/quality-workflow/check.runtime.ts`](../../tools/quality-workflow/check.runtime.ts): it rejects missing read-only permissions, timeout or concurrency
limits, floating action or browser-tool resolution, unsafe dependency-cache
paths/keys/order, shallow/ambiguous release history, absent canonical graph
invocation, and additional workflow-local release steps. Its fixtures name public exports,
packed SDK, API, docs, manifests, workflows, and release scripts as
release-relevant boundaries. This is local workflow-configuration proof only;
it does not prove a hosted run, publication, deployment, registry state, or
external consumer behaviour.

All six workflows pin `actions/checkout` v7.0.1 by exact commit. Quality and
the receipt reconciler also pin Doppler's v2.0.0 fetch action to its exact
commit and leave broad environment injection disabled. Checkout
places the selected Git revision in GitHub's workspace; it does not install or
run TaxKit. The following pinned setup action installs the repository's Bun
version, and Bun owns frozen dependency installation and repository commands.
The GitHub-hosted Quality run is the compatibility proof for checkout's
Node.js 24 action runtime.

The harness gate is not a separate Quality workflow step. The existing
`release:check -- --ci` graph begins with root verification and therefore
inherits it without duplicating execution or widening workflow authority.

Deployment automation is intentionally outside Quality. The local
`check:docs-deployment-automation` command Schema-decodes three target-owned
automation records plus four controls (including the read-only completed-run
receipt reconciler) and runs focused negative fixtures for
candidate trust, mutation locking, equal replans, teardown safety,
and credential/environment denial. This proves
repository desired state only. A hosted workflow claim additionally requires
default-branch workflow identity, protected-environment and credential
readback, exact-candidate execution, provider/state agreement and a dated
receipt. Quality retains `contents: read`, cancellable concurrency and no
provider credential or mutation edge.

The separate manual Production hosted check reads a reviewed deployment proof
file on `main` and runs the same HTTP and Chromium checks against the live
Worker. It uses no deployment credential and cannot update the Worker. Its
focused local browser test first serves a JavaScript asset as 404, then 200,
and checks that the browser retries once and clears the first attempt's
diagnostic. A successful hosted run establishes the recorded site behaviour at
that time; it does not change the failed original deploy run or prove a
rollback.

The credentialed `check:docs-deployment-inventory` command is also excluded
from root verification and Quality. Its focused service fixtures prove
state/provider agreement and disagreement behavior without a provider. Its
credential-boundary fixtures additionally prove exact file/JSON Schema,
absent-versus-malformed classification, protected fallback, excess-property
rejection, redaction and account mismatch. An authorized live invocation
separately checks exact TaxKit state and Workers. Neither fixture nor live
inventory proves hosted application behavior.

The former provider-bound GitHub/open-PR orphan command and process fixtures
are retired. Historical JSON reports remain evidence for their dated epoch;
root validation does not invoke or model that contributor-lifecycle helper.
PR-close teardown is the current Preview cleanup owner.

The docs app's focused server tests construct one ManagedRuntime with an
injected deterministic probe identity, read both the content and probe services
concurrently, prove stable construction state across reads, and dispose the
runtime. The built workerd journey separately proves one emitted runtime/probe
Layer, stable opt-in proof headers across initial, missing and concurrent
requests, SSR, hydration, client navigation, server functions, 404s and clean
browser diagnostics. `test:cloudflare-built -- --screenshots` additionally
writes ignored desktop/mobile PNGs and a digest manifest for visual review.
Those images supplement, but cannot replace, the behavioral oracles or prove
provider-global isolate lifetime.

The five consumer-visible release journeys are maintained in
[`../verification/critical-journeys.json`](../verification/critical-journeys.json):
calculator direct use, packed SDK, HTTP API, docs runtime and release closure.
Their packet is bounded, sanitised local evidence in
[`../evidence/releases/HGI-203-local.json`](../evidence/releases/HGI-203-local.json);
raw logs and transient tarballs are not committed. Complete sanitized command
detail is retained at unique ignored paths with digests, while a bounded attempt
receipt binds the verified base commit and changed-content manifest digest.
`release:present` verifies that receipt and all referenced detail before writing
or reusing an immutable presentation sidecar, so terminal output remains
reconstructable without rerunning. The failed-provenance index retains prior
terminal evidence outside the default route. Local browser proof does not prove deployed SSR,
hydration or public availability, and no local receipt proves publication or
deployment.

Candidate evidence verifies every sorted safe path and digest in its exact
changed-content manifest, plus the complete transient attempt receipt/detail
chain. Accepted lifecycle evidence retains only the bounded sanitized JSON
summary in Git and does not require ignored raw command logs in a clean clone.
A later release attempt must first prepare a new candidate packet; the runtime
fails closed instead of reusing an accepted candidate identity. It compares the
base commit, manifest path and manifest digest with the accepted summary, so
changing lifecycle back to `candidate` alone cannot reuse an accepted proof.

## Review evidence

Substantial code, package-boundary, API, SDK, app-runtime or documentation
rollouts record the review evidence their changed boundaries require. Acceptance
is based on path-evidenced task gates and semantic review, not a fixed number of
audit passes or workers. Review the final code and command graphs against their
owning architecture and SPEC; inspect Effect flow, schemas, tagged errors,
unsafe casts, DTO mirrors, and helper or abstraction sprawl; then inspect the
CI, lint, packed-consumer, browser/API, documentation, and Changeset evidence
that applies to the changed surface.

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
- `tools/oxlint/effect-rules.ts`, `bun-rules.ts` and `mdx-rules.ts` own
  domain-neutral contracts. `taxkit-rules.ts` owns tax/calculator policy plus
  decoder and route-transport rules. Do not put package names or tax defaults
  into a portable rule message.
- `tools/oxlint/anti-slop/**` is a separately installed generic rule owner.
  `oxlint.config.ts` registers its generic and Effect plugins, enables every
  admitted rule at error severity and keeps the vendored source under an exact
  ignore. Do not copy its rules into TaxKit plugins or add broad source
  exemptions to pass them.
- Portable Effect rules ban manual `_tag` literals and `switch`, keep live/test
  Layers out of service contracts, restrict encoder execution, reject throwing
  Schema sync codecs, preserve typed service errors and tagged-error causes,
  and keep runtime, console, process and host imports at configured boundaries.
  Use `Data`/`Schema` tagged classes, `Match`, Effect Platform services and
  exact live/runtime adapters instead. Binding-sensitive rules resolve
  canonical and namespace imports, renamed bindings, aliases and statically
  known destructuring. Accepted real-binary fixtures prove that unrelated
  shadowed locals with the same names do not report.
- The six owned TypeScript policy modules use all eleven canonical strict
  rules. Synchronous Oxlint listener state is per rule/file and Ref-owned;
  pure analysis uses immutable folds, not Ref accumulators. Shared Hash/Equal
  keys preserve the host's object identity without modifying syntax nodes.
  The route/decoder corpus checks exact warning counts, separate observations
  for two files in one process and lexical decoder assignments/root aliases.
  Rule options are an exact Schema ingress in `taxkit-rules.ts`; the actual CLI
  rejects missing required options before listener construction. The shared
  scoped CLI operation accepts a configuration path for this invalid-config
  fixture. Binary checks remain distinct from compiler checking and do not establish
  completion of repository-wide strict enforcement.
- Eight collection-host CLI canaries test exact file, assignment target,
  method and receiver containment while retaining loop rejection. The admitted
  source is generated test-only code. Four additional isolated configuration
  mutations run the whole real CLI verifier and require its expected failure:
  removed/disabled required rule, broader assignment target and broader method.
  Their non-empty Schema-decoded corpus must contain every named case once in
  order. The runner fixes the target/command, restores copied configuration
  between cases and scopes temporary files/processes. No tracked edits may
  overlap these copy-based checks.
- Lexical gap CLI cases reject renamed native/weak constructors, Object/Reflect
  writes and runner captures/callbacks on migrated strict paths. Exact counts
  distinguish actual built-ins from local names, cleared aliases and declarations
  from reads. The positive persistent-collection/Ref fixture requires exit zero.
  Existing runtime-call assertions stay intact; callback/context variants and
  named/namespace Node runtime calls have additional proof. These checks do not
  establish readonly contract coverage or full remaining-path qualification.
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
- Deployment workflow receipt decoding is allowed only in
  `tools/docs-deployment/workflow-check.boundary.ts`. The five
  `workflow-*-check.runtime.ts` files remain exact Bun runtime entrypoints but
  are no longer decoder boundaries. `workflow-check.boundary.test.ts` proves
  strict JSON ingress, Config failure and typed identity mismatch;
  `workflow.contract.test.ts` proves all five adapters use Config, the shared
  boundary and `BunRuntime.runMain` while excluding direct environment,
  `Bun.file`, unchecked JSON, raw runtime execution, console and process-exit
  paths.
- `tools/docs-deployment/strict-boundaries.policy.ts` owns one exact-source
  architecture contract for the corrected docs runtime, workflow, credential
  and child-process owners. Its adversarial contract test rejects recurrence
  of direct environment/file/JSON/runtime execution, raw Promise concurrency,
  ambient child environments, bypassed shared boundaries and unmanaged docs
  runtime state/randomness. It permits only the named process-byte adapter and
  Worker fetch/ManagedRuntime bridge documented by the tool owner. This
  semantic control runs once inside `test:docs-deployment`; do not duplicate it
  as another root-verification command or broaden it into a repository-wide
  text ban.
- Custom-rule tests must cover prohibited and allowed Effect decoder families,
  imports and aliases, descriptor/member decoders, static computed members,
  factory creation and extraction. They must also cover a TSX decoder attempt,
  negative cases for encoding and `Schema.decodeTo`, and real Oxlint CLI
  fixtures for both a prohibited file and an exact allowlisted file. Run those
  fixture commands with `--disable-nested-config`.
- The Oxlint CLI, repository-path, governance and skill-policy suites run through Bun-hosted Vitest with `@effect/vitest`.
  Effect scopes own fixture cleanup and child processes; the shared
  `tools/oxlint/cli-fixture.ts` boundary decodes process bytes.
  `check:oxlint:types` checks the tests and their imported lint configuration.
  Success, failure and interruption must remove generated fixtures. Intentional
  source fixtures are excluded from test discovery, not from real CLI coverage.
- HTTP contract and shared testing-helper suites have explicit TypeScript test
  projects in their package `check-types` commands. Framework assertions do not
  narrow tagged unions: fixtures use canonical brands and Effect Match.
  OpenAPI filesystem and error representation tests own their exact Schema
  egress admissions. The Fetch signature admission is tested through an exact admitted CLI fixture and a neighbouring canary,
  without overwriting production source. Oxlint does not support stdin.
- Every enabled portable custom rule must also have accepted and rejected
  fixtures executed through the installed Oxlint binary with
  `--disable-nested-config`. Direct visitor-unit tests alone are not acceptance
  evidence. Fixture-only rejected source stays non-executable and is copied to
  an exact generated path for the binary run.
- The anti-slop configuration contract enumerates all 15 generic rules and the
  Effect constructor-import rule. Accepted and rejected Effect fixtures run
  through the installed Oxlint binary. The portable Effect fixture also proves
  that module-level mutable test state is rejected while local mutable state is
  allowed.
- Portable binding rules require rejected real-binary cases for renamed or
  destructured canonical bindings and accepted unallowlisted cases for
  unrelated same-named locals. Dynamic property values, aliases returned from
  arbitrary functions and cross-module value flow remain review-only because
  Oxlint cannot resolve them without interprocedural type analysis; do not add
  broad suppressions to simulate that analysis.
- `effect/no-bare-effect-try-promise` requires direct inline function-valued
  `try` and `catch` properties for canonical `Effect.tryPromise` calls in
  packages, `apps/api` and repository tools. Its focused binary fixtures cover
  root, namespace and subpath imports, renamed bindings, static
  aliases/destructuring, reassignment, arrow/function/method properties,
  extracted, shorthand, non-function and spread policy, and unrelated shadowed
  locals. Website applications are not in this rule's current scope.
- Nullable leakage and hand-rolled `Result`/`Exit` representations remain
  review concerns outside the exact calculator and manual-tag contracts. A
  `null` literal, `Schema.NullOr`, `Option.getOrNull` or domain tag name cannot
  prove boundary leakage or outcome re-encoding without type/provenance
  analysis. Do not add text-only rules or duplicate the repository-wide
  decoder placement owner.
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
  policy. Use the boundary contract, final call graph, compile-time tests, and
  primary-owner review to reject one-use decoder/error wrappers. Record the
  observed consumer and substitution evidence; a fixed audit-pass count is not
  acceptance proof.
- Static lint also cannot infer whether `Schema.Defect()` should be replaced by
  an owning provider/domain error, whether an arbitrary provider SDK import is
  a true adapter, or whether a new abstraction has semantic weight. Keep those
  checks review-only rather than adding broad filename exemptions or brittle
  text-search rules.
- Verification evidence should be recorded in specs, task lists or exec plans
  when work spans multiple packages.
- Repository portability verification must use the root-owned
  `check:repository-paths` command. Rejected fixtures assemble private-looking
  values from neutral fragments so the checker and its tests remain inside the
  policy they prove. Reports must never include matched text, usernames,
  process stderr or surrounding content.
- Repo-owned skill changes must pass `bun run test:skills` and the skill
  validator. Canonical baseline or repository-profile changes must also pass
  `bun run check:harness-governance`, which compares only repository-local
  paths with the content-addressed receipt and never reads a user home or
  installed global skill collection. Epoch requalification must additionally
  pass `bun run check:harness-foundation-epoch` against its exact candidate
  evidence. The stale-pattern test checks fenced provider examples for raw
  clients, generic SDK callbacks, raw IDs, primitive config, `instanceof`, and
  unchecked SDK result escape. Positive and adversarial fixtures also protect
  the PRD route/container/leaf ownership boundary and require separate
  documentation-impact classifications for tests, fixtures, configuration,
  exports, manifests, lifecycle, release, rollback, critical journeys and
  semantic owners. Broader semantic Effect/React quality remains a parent
  review responsibility.
- Keep the development-aware `knip` graph and dedicated `knip:production`
  graph independent. Production entry and project patterns require Knip's
  trailing `!` marker, must map manifest exports to real source counterparts,
  and must not include tests, fixtures, examples, root tools or `apps/web`.
  The docs production graph intentionally includes `apps/docs`, both docs
  packages and the generated `.source/browser.ts` and `.source/server.ts`
  modules they actually consume; `--no-gitignore` admits those two generated
  production inputs without admitting the unused generated dynamic entry.
  Exact exceptions need a named owner and runtime reason.
  Knip does not replace SDK packed-artifact or downstream-consumer proof.
- Keep `bun run release:check` as live orchestration over canonical
  Turbo-backed commands. A new
  release gate must first have an owning package command and focused tests; do
  not implement its validation policy inside `@taxkit/scripts`.

## Related Docs

- [Testing and validation](./testing-and-validation.md)
- [Graph, trace and ledgers](./graph-trace-ledgers.md)
- [API and SDK](./api-and-sdk.md)

Checked docs-content examples are explicit development Knip entries and use
declared workspace development dependencies. Their server boundary tests run
the retained weekly calculation and reject malformed input; generated-page
tests prove processed-text selection, receiver identity and error redaction.

Skill-policy fixture reads use Effect FileSystem and exact Schema-owned JSON
ingress. Bounded Effect traversal owns repeated I/O; pure classification uses
persistent collections. `check:skills:types` checks this suite during root
verification. A readLink assertion proves the actual canonical symlink target.

The Quality-workflow test owner uses Bun-hosted Effect Vitest, Effect FileSystem,
and scoped platform child processes. Its isolated release-boundary suite runs
all six retained owning commands and four strict-enforcement mutations as
independent named tests with their existing five-minute deadlines and scoped
temporary repository copies. A separate test proves documentation tools work
before any package build in a fresh source-only copy. The suite preserves
relative links and removes each copy on completion or interruption. The native
Effect Bun HTTP server owns the short-lived loopback-port reservation. Its
policy source and tests have a focused `check:quality-workflow:types` project in
root verification and all eleven canonical strict rules. The executable alone
has an exact runtime admission. This local test-host qualification does not
change the hosted workflow or establish publication/deployment.


Documentation policy and runbook suites also use Bun-hosted Effect Vitest and
scoped Effect child processes. Their pure inspections preserve ordered
findings using persistent collections. Actual command tests verify successful
JSON output, a failing receipt and saved complete report, unknown-option
failure and bounded pre-receipt errors. A temporary copy with a missing runbook
section must fail after writing its receipt while retaining accepted historical
packet checks and reporting zero operational commands executed. Both command
files have separate exact canonical runtime admissions. Accepted real CLI
checks include all eight source/test files; the neighbouring generated policy
file must reject all ten applicable strict constructs. Root verification checks
these sources and tests through `check:docs:types`.


The shared tool Vitest configuration explicitly selects workspace source exports
in Vite's server resolver. The isolated Quality copy runs all documentation
tests before `packages/scripts/dist` exists, creating only temporary Git
metadata for the command inventory. This checks fresh source loading rather
than relying on local ignored build files; package exports stay unchanged.


Retained evaluation-tool tests run through Bun-hosted Effect Vitest. Known
SHA-256 text/byte vectors, including UTF-8 text, preserve digest bytes. Pure
policy fixtures use declared retained hashes and qualify the complete accepted
bindings, missing source/detail hashes and duplicate observations. They are
explicitly distinct from real source hashing. Actual child-process cases retain
the two existing historical verifier failures and reject unknown options with
bounded output. Full verification typechecks both owners and runs these focused
tests. Real lint fixtures qualify all ten source/test files and a rejected
neighbour, plus exact assertions for the two runtime admissions.


Deployment-tool tests use Bun-hosted Vitest. Their migrated upload, input,
source-contract and native memo suites use `@effect/vitest` with scoped local
FileSystem work. The 94 retained cases remain present. Added tests check
empty/ASCII/UTF-8 hash bytes, safe read/decode/Crypto errors, empty required
source, overlapping upload directories and an admitted symlink leaving the
source directory. Actual lint fixtures accept each of the nine migrated files,
reject a neighbouring generated file and check the one exact runtime admission.
These tests run no provider command; other deployment-tool strict work is pending.


Credential and workflow-input tests now use scoped Effect Vitest. The old
runtime calls and generated raw fake command are removed. The tracked fake
command runs through a scoped symlink with synthetic environment and no env-file
loading, writes its Schema-owned receipt, and returns a typed failure for the
negative child-exit case. The existing exact argument and stripped-credential
assertions remain. Added cases cover full environment-name/empty-value restore,
provider absence/shape/read errors, cached credential precedence, unreadable
input, malformed scalars, empty token and most-specific token scope in both
orders. Strict source tests reject bypassing the new environment boundary and
raw environment reads. Actual lint fixtures qualify all eighteen adopted files
and one rejected neighbour, plus four exact runtime assertions.


Workflow-source, plan-projection and saved-evidence tests now use Effect Vitest.
The original eighteen workflow cases, eleven plan/capture cases and six evidence
cases remain, including all five historical capture digests, eight accepted
finding cross-references and the exact canonical projection JSON. Added tests
refuse ambiguous/incomplete saved inventories, preserve absent-stage output,
reject mismatched/extra plan actions, preserve CRLF no-op teardown, and check
safe typed configuration/read/write failures. Real lint fixtures qualify ten
adopted files plus their rejected neighbour, and three exact runtime assertions.
All reads are retained source/evidence or scoped synthetic files; these checks
establish no current provider state or deployment authority.


The eight retained automation receipt cases now use Effect Vitest with persistent
maps and checked fixture selection. Their existing exact authority, plan,
provider/hosted identity, input and workflow-run assertions remain. Added scoped
command tests preserve the not-established count, check safe missing/malformed/
excess-field errors, and require the exact finding for an incomplete control
register. The actual retained-record command still checks screenshot digests
through the qualified file input boundary. Its reported establishment count
belongs to saved receipts and is not a current provider readback. Real lint
fixtures accept six adopted files, reject their neighbour and check the sole
exact command runtime admission. The provider inventory service remains pending
strict migration.


Each accepted lint-fixture file runs as an individual Effect test with the
ordinary test deadline. This retains the existing exact file-count, exit-code
and namespace checks while keeping process startup for one file separate from
the other files. The scoped process owner still interrupts and releases an
unfinished child; no global deadline or assertion is weakened.


Retained deployment-policy tests now use Effect Vitest with controlled Crypto.
All previous policy assertions and historical receipt fingerprints remain.
Fixed SHA-256 examples cover primitives, escaped/Unicode text, numeric keys,
nested objects and array order; failure cases check non-finite input and safe
Crypto errors. Three changed-provider examples vary deployment ID, version ID
and state-bundle digest while outer identities still agree, proving that Schema
field equality protects the complete provider record. Real lint fixtures cover
six adopted files, their rejected neighbour and the exact command admission.


Inventory tests use native synthetic Alchemy State/Worker services and a separate
checked-report test Layer. They preserve the old agreement assertions and check
named stack/resource requests, invalid replies, safe read/write failures, exact
pretty report bytes, Config defaults and explicitly empty settings, other-stack
filtering and first matching ownership tags. Interrupting the inventory operation
cleans up all three unfinished initial reads. Actual lint tests qualify the eleven
adopted inventory/workflow files, reject their neighbour and check four exact
command runtime admissions. Source checks still require credential decoding and
cache-safe workflow output, following the owning Config Schema and ignoring only
formatting whitespace. Saved receipts remain distinct from current provider proof.


All six owned lint files, including the shared binding tracker, now compile as
TypeScript. Their host types derive from Oxlint's exported RuleTester contract,
including the actual source-code nodes and lexical variables. They do not copy
an AST model. The loader reads the TypeScript source directly; the local no-emit
compiler allows those explicit source imports. Immutable route observations use
native node types and scoped Ref updates. Narrowing checks precede variant-only
fields, and dynamic imports follow the native ImportExpression listener.
Original lexical/route/metadata checks remain. Separate identity tests require
matching-looking host objects to remain separate map keys, repeat reads of the
same object to find its binding, and unrelated equality objects to be refused.
Actual CLI fixtures accept all eight adopted policy/type/test files and reject
the neighbouring JavaScript fixture; compiler, runtime and lint proof are distinct.

The isolated release-boundary corpus binds each failure oracle to its command,
target and recovery. Removing the SDK's public `TaxKit` export must fail the
real downstream command at `build @taxkit/sdk` with child exit 2. The exact
bounded step/exit diagnostic is the current oracle; raw compiler text is not
required or retained by the SDK command. The historical HGI packets keep the
observations they originally qualified.

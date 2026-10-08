---
document_type: architecture
lifecycle: current
authority: canonical
owner: taxkit-quality-owner
last_reviewed: 2026-10-08
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

Core checks its source and deterministic tests through explicit imports. Its
empty compiler `types` list also applies to the separate source-only build;
neither check relies on Node type packages supplied by another workspace.

The current repository baseline is canonical root verification:

```bash
bun run verification
bun run knip:production
bun run test:skills
```

Root verification includes lint, format, both Knip graphs and workspace type
checks. Web compiler checking also includes Vite and both Vitest
configuration owners. Its native package tests cover settings, safe error
serialization and public build-input selection. Chromium retains two Atom
cases and adds two actual file-route/generated-client cases: successful health
decoding and preload retirement that interrupts HTTP work and aborts its
signal. The fake transport is bounded browser-test proof; it is separate from
a built application or provider journey. The browser config pre-optimises the
observed imports so first-run dependency discovery cannot reload the test
iframe before assertions.
 The development-aware graph covers repository tooling, tests and
current application scaffolds. The production graph separately proves the
nine code-bearing packages in the ten-artifact release closure,
`@taxkit/scripts` exports and commands, and the standalone API runtime without
test or development reachability. It models the current Website,
`@taxkit/docs-content` and `@taxkit/docs-fumadocs` production entries,
including the generated source and build-time compiler/config they consume.
The old docs workspace is absent from both unused-code inventories. `@taxkit/tsconfig` is JSON-only and remains
covered by strict packed/downstream artifact proof rather than a fabricated
TypeScript entrypoint. Root tools remain outside the production
graph by ownership. Root verification also typechecks and executes
the root repository-path gate, which scans
Git-tracked readable text and safely reports only repository-relative file,
positive line and closed finding category. Stage new retained receipts before
the final path check so their text is included in the tracked-file inventory;
an earlier pass does not cover files added afterwards. Binary files are identified by a
NUL byte or failed strict UTF-8 decode and skipped. Shared skills come from the latest plugin through `docs/skills.md`; copied
skill text, tree-digest, overlay and alias checks are removed as approved in
#140. The root graph runs `check:harness-governance` exactly once. It checks
the TaxKit profile, accepted findings and task mappings, six current critical
journeys and external non-claims. Its focused type and test commands remain
`check:harness-governance:types` and `test:harness-governance`. Retained HFI/HGI
evaluation records describe their original candidates; they do not select or
validate the current plugin version.
Current documentation checking belongs to the Website and native API pair.
`bun run docs:validate` checks authored content and examples; `bun run
web:test:native-pair` freshly builds the pair and observes real page HTML,
Markdown, private RPC, search, discovery, image delivery and browser behaviour.
Every accepted authored page keeps its original address. Content generation and
compiled package builds remain owned by Turbo and their package commands.

The old app's 49 original sources are verified before historical boundary
inspection. Its positive lint selectors retire with the source; all existing
invalid-code canaries remain, alongside the current native hosts' positive and
negative cases. No missing active source receives an archive exemption.
Infrastructure stage/memo metadata stays for historical receipt decoding.
The old asset-header bytes are inspected through the verified source bundle.

The current old writer CLI and workflow stops have real process proof. Workflow
YAML must decode as one manual, permission-free Bash stop with no checkout or
provider steps; its actual script exits unsuccessfully. Actual root aliases,
local Doppler and receipt-writer CLIs stop before Config/custody/state writes.
The actual Alchemy importer refuses its typed marker before session providers,
remote state and planning. Its prior startup creates only logs and an empty
profile, which the isolated test records rather than ignoring.

Saved old workflow, command, journey, control, source and provider receipt
identities remain in the retention manifest. The historical receipt algorithm
runs against an owned temporary Git fixture, never missing or changing active
files. It does not qualify a complete historical app rebuild or provider action.

Release-facing package work must also prove actual tarballs rather than
workspace imports or dry-run file lists:

```bash
bun run --filter=@taxkit/sdk check-packed-artifact
bun run --filter=@taxkit/sdk validate:downstream
```

The focused command uses an Effect-native, scope-managed Bun runtime to pack,
inspect and import the SDK artifact. The strict command builds the ten-package
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
transition. The retired built-app proof is retained history through the source manifest;
it is no longer an executable current-workspace command.

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
local release journeys or historical HGI/HFI snapshots. The accepted DCD-002 requalification chain binds
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

The Quality job has a bounded sixty-minute timeout, enforced by its source
policy. The previous thirty-minute limit could stop a successful cold run
before the final native browser check. This budget preserves the complete
check graph, read-only permissions and cancellation on a newer candidate.

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

The six current consumer-visible journeys, including the native Website, are maintained in
[`../verification/critical-journeys.json`](../verification/critical-journeys.json):
calculator direct use, packed SDK, HTTP API, docs runtime, release closure and
the native Website. The original five-journey packet remains bounded, sanitised
historical local evidence in
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
  Worker native request/cached ManagedRuntime context bridge documented by the
  tool owner. Worker bypass fixtures reject extra execution, eager docs
  acquisition, missing abort signal/typed encoding and lost response fields or
  unrelated-header filtering. These remain source assertions, separate from
  actual Worker behaviour and underlying framework promise cancellation. This
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
  every owned TypeScript/JavaScript source extension, including both website
  apps, infrastructure and root config. Its focused binary fixtures cover
  root, namespace and subpath imports, renamed bindings, static
  aliases/destructuring, reassignment, arrow/function/method properties,
  extracted, shorthand, non-function and spread policy, and unrelated shadowed
  locals. New path canaries require exactly one missing-mapping diagnostic
  while an inline mapped neighbour remains accepted in the same file.
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
  and must not include tests, fixtures, examples or root tools. The native Website
  is included, with its scripts and fixtures excluded from production.
  The production graph includes the current Website, both retained docs
  packages and the generated `.source/browser.ts` and `.source/server.ts`
  modules their current consumers use; `--no-gitignore` admits those two generated
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
all six retained owning commands and six strict-enforcement mutations as
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


The hosted docs proof uses a closed native service with private Playwright
objects, scoped browser/listener cleanup, native HTTP/FS/Crypto, immutable Ref
observations and a bounded callback Queue. Overflow fails safely. The command's
Config boundary still requires Workers URLs, exact stage identity and bounded
retry metadata before browser launch; controlled adapter tests use loopback only.
One five-minute deadline bounds the complete hosted operation. Optional values
become Option internally and preserve null fields at the JSON output boundary.
The producer owns the full observation Schema; workflow admission retains its
separate required-field projection.

Native fixtures retain configuration, error and lifetime checks. Real Chromium
checks qualify asset propagation, unexpected diagnostics, Queue overflow and
browser interruption that retires an actual pending streaming response. A
controlled HTTP/DOM host qualifies the complete browser operation, navigation,
contrast/focus/mobile controls, actual screenshots and their output identities.
Its headers and DOM are fixtures, not Worker or hosted readback. The malformed
server-function oracle checks the actual body and JSON content type: raw Buffer
bytes send broken JSON, whereas the previous Playwright string input sent a
valid JSON string. Reverting that request to the old form fails the real-browser
fixture at the expected 4xx assertion. The built proof uses the same correction.
Actual strict CLI fixtures and source counterexamples guard the named service,
codec, event Queue, browser scope and sole exact command runtime admission.

The old docs package/root test tasks and their environment selectors are
retired with the workspace. Their original configuration remains in Git history;
current Website/native test tasks retain their own browser environment inputs.


The local built Worker proof has its own closed `LocalCloudflareBuiltProof`
service, whole receipt/screenshot Schemas and native Command entry at the
existing path. Native filesystem, Config, Crypto, HTTP, monotonic time and
child-process streams own orchestration. Private SDK objects never enter its
public reply. Both process pipes drain alongside exit, with a 1 MiB cap per
pipe. Artifact reads stop at 64 MiB even when metadata understates a growing
file; total artifact/digest size and 10,000-file ceilings bound collection.
The five-minute operation and two-minute browser deadlines preserve scoped
cleanup. Recorded child identity must disappear, and browser work completes
before the receipt is saved and read back.

Native fixtures check exact UTF-8 output limits, real child termination after
an overflowing pipe, nonzero exit, total timeout, independent path/NUL/opaque
byte digests, growing artifact limits, whole receipt decoding and readback,
screenshot cardinality and no writes after a late cleanup defect. Controlled
Chromium fixtures check the exact malformed JSON body, navigation without a
document reload, delayed pending state, focus/contrast/mobile/motion,
screenshots, private diagnostics, event overflow and actual pending-response
retirement. The controlled fixture has two browser fetches and a separate
malformed API request; these counts are kept separate. These fixtures do not
prove the generated Worker or any provider environment. The real built local
workerd command supplies separate Worker/assets/concurrent-request evidence.
Actual strict CLI checks cover every adopted source/test/command and a rejected
neighbour; source counterexamples guard bounds, digests, cleanup, encoding and
readback. A draft PR and local proof do not finish DEV-73.


Canonical strict coverage includes every owned `.ts`, `.tsx`, `.js`, `.jsx`,
`.mjs` and `.cjs` path, including newly added root/config/app/tool files. The
existing explicit generated/vendor exclusions remain. Exactly five unexecuted
inputs under `tools/oxlint/fixtures/` retain their intentionally isolated Effect
and Bun rule contexts. Other rules still inspect them; they are read as lint
input bytes, outside the owning TypeScript project and application execution.
Their purpose ends when those focused binding/host-rule cases are retired.
Actual CLI neighbours reject each exclusion spreading to a directory wildcard.
Native checks also assert the exact exclusion list and whole-source selector.
Valid CommonJS has its own positive and negative input; ES-module syntax cannot
stand in for a CommonJS policy test. All six extensions must admit one file and
reject the named bad constructs through the actual lint binary. Fresh isolated
copies prove removing that selector or broadening the fixture exclusion fails
the complete verifier. No host runtime or mutable-operation admission expands.

## Native RPC contract proof

The private `@taxkit/api-rpc` test command uses the actual Effect 4 generated
client, JSON parser and POST server. Its corpus checks the real retained
calculator, expected error classes, global/per-procedure native defects, bounded
and malformed envelopes, unknown tags/IDs, version skew, broken JSON and invalid
success replies. Private sentinels must be absent from actual native reply bytes
and captured logs. An independent adapter SchemaError keeps its exact defect
identity. Deterministic clock/body fixtures prove one deadline through headers
and complete decoding, earlier interruption and scope cleanup. Operation-policy
proof observes credential omission and redirect rejection at HttpClient ingress.

This corpus does not prove browser CORS, service binding, Worker origin,
production app startup or safe exported traces. The saved native app suite
separately qualifies those local host paths; T009 retains safe trace exports.
A browser build of the private client exposed live calculation modules
through broad Schema imports; narrow canonical diagnostics/report/input exports
remove those modules. The native Website suite now checks the real browser
bundle after app composition. Existing golden calculator and packed SDK checks protect the old
exports and report values when these Schema owners move.

The private native RPC package is accepted and rejected by the installed lint
binary at its own source/test/configuration paths. Exact temporary fixtures at
the parser and two transport-test files prove the required decoding/encoding
permissions while rejecting runtime execution and unintended encoding. The
Effect test scope restores each real owner's original bytes on failure or
interruption. A neighbouring RPC file still rejects decoding. These fixtures
qualify lint permissions; they do not prove a real browser or Worker connection.

### Native API host candidate proof

`apps/api/test/worker.boundary.test.ts` exercises shared HTTP/native RPC
dispatch, one supplied calculator construction, incoming request paths and
request finalisers. It checks deferred address reads, one checked runtime
configuration read, absent settings, CORS origins, bounded streaming reads,
whole-body timeout and earlier interruption. Positive console/reporting
fixtures contain sensitive messages, annotations and Causes; native malformed
JSON/tag/ID paths have fixed replies and no console egress on the selected
version. No exported-trace claim follows from an empty log observation.

The API app owns the fixed native logger/reporter and body ingress adapter.
Only this exact fixture receives Schema encoding permission; no decoder,
runtime, host-work or throwing-codec exception follows. Local built Worker
experiments establish one artifact's workerd startup/HTTP/RPC/error behaviour.
They do not qualify cloud deployment, real Website wiring, complete fatal
protocol paths or exported telemetry; the active task and receipt retain those
limits and the local proxy/upload observations.


### Native app graph proof

`packages/infrastructure/src/apps-stack.test.ts` runs actual native Stack/Plan
with the real two-app declaration, memory state and a typed mock Worker provider.
Explicit native profile, credential and HTTP services fail on access; provider
writes fail on call. Real-clock tests bound each plan to one second. Create,
no-change and update cases retain the circular peer addresses, self URL markers,
same private peer resource, fresh Output values and null for absent addresses.
A provider without `precreate` still produces native `UnsatisfiedResourceCycle`.
Native root selection tests check stages, fixed safe failure, fixture-provider
precedence and the upstream env-file conflict before secret access.

Alchemy beta.80 publishes distinct Bun source and default compiled planner
entries. Both are corrected by the exact tracked patch; the compiled source map
is generated from the corrected native source. The dated receipt records an
independent source run and deliberate patch removal: both entries time out on
the same actual graph without the correction, then their original bytes are
restored. Passing mock classifications do not establish Cloudflare's real diff
or Apply. No hosted or Doppler retrieval claim follows.

Only `apps-secrets.boundary.ts` receives stage-decoding permission. Actual CLI
fixtures at that real path admit decoding while rejecting encoding and runtime
execution; a neighbouring source still rejects decoding. Scoped finalisers
restore the real source after each fixture.


## Native Website pair proof

The Website README owns `build:native-pair` and `test:native-pair`. Public native
Alchemy source builders produce the API and Website artifacts with no provider,
credentials, state, plan or apply. Compiled RPC dependencies build first because
ordinary native bundler imports select compiled exports. A missing compiled
export must fail actual Worker startup; a source-only unit test is insufficient.
The native Website main is `server.js`, distinct from the standalone Cloudflare
Vite `index.js` output. Build sequentially before testing.

The saved native pair test runs actual workerd modules and Chromium through the
public API URL and private binding. It catches retaining a receive loop across
Worker requests, idle settings collection, `/rpc/` redirect drift, automatic HTTP
trace headers and replay on page load. It also checks editing, no-JavaScript
calculation, invalid input, bounded upload rejection, built browser imports and
observed native log fields. Browser Atom fixtures separately check editing,
form unmount and expected-error hydration. Fixture scopes dispose resources;
observation queues use non-blocking `Queue.clear` when silence is the expected
result. `Queue.takeAll` waits for an item and cannot prove an empty queue.

Exact real-CLI canaries admit only the named Website hosts/encoders and reject
execution/encoding/decoding in other owners. The generated Wrangler file stays
outside formatter/lint edits; its real generator owns byte identity. Both Knip
graphs now include the Website. These checks establish local candidate behaviour,
not cloud deployment, exported telemetry or upstream cancellation. The named
failure/cancellation and local development tests below qualify T003's remaining
local paths. Its [acceptance review](../documentation-audit/clean-slate-foundation/2026-10-05-native-connection-acceptance-review.json)
records the bounded complete local connection; T009 retains safe trace exports.


The current inventory now has six named journeys, including the native Website.
The scripts owner explicitly separates `CurrentReleaseJourneyInventory` from
the exact retained five-journey `ReleaseJourneyInventory` used by HGI-203. The
runbook reader checks each against its own Schema. A current inventory change
must not loosen the historical packet or attribute new proof to that attempt.

The native Website journey derives the settings function identity from the real
generated resolver. It proves data-free GET success and empty 400/405 rejection
before framework parsing. Use short privacy markers: a long marker can be
truncated by the native JSON error preview and falsely pass an absence check.
The source builder scopes an exact settings-operation defect, copies that
actual native artifact to ignored proof output, restores the source and builds
the ordinary pair. Its fault test requires injected code, empty 500, positive
fixed reporting and no marker. A boundary-removal run fails on real response
reflection; restoration passes. These checks do not qualify every native
framework error, exported tracing, provider logs or complete cancellation.

The real native Website journey also tests unknown function IDs, extra path
parts and missing IDs against the function's generated URL. A short marker
appeared in native framework logs before the exact-address check. Removal
proof must inspect actual native logs as well as the saved 404 assertion, then
restore exact source and rebuild both ordinary/fault artifacts.

The native RPC failure fixture compiles the actual API entry separately for a
post-calculation defect and a report field damaged after native encoding. The
API compiler consumes compiled RPC dependencies; changing an unused source
module is not proof. Each controlled build removes only its owned ignored
output, restores exact entry bytes, and checks a marker in the actual entry
plus the reached native response. Minified function names are not an oracle.

The saved test requires a successful canonical calculation before malformed
wire cases, safe global/procedure/fatal replies, version and expected service
errors, and a valid-JSON damaged reply through the genuine Website binding.
Chromium loads that actual Worker-produced error document and real assets;
editing must clear the error without a calculation request. Positive fixed
API/Website logs must omit private markers and pay values. Removal checks fail
the saved test when global/procedure encoding or the owned reply decoder is
disabled, then rebuild restored dependencies and artifacts. Procedure removal
loses the fixed reply value; it does not establish marker reflection. Only
exact fixture decoding, encoding and named Playwright input filling are admitted;
actual CLI canaries still reject runtime execution at that fixture path.

The cancellation fixture keeps the actual calculation, encoder and response
bytes. Its controlled API roots delay headers or send a real first body byte
before delaying the remainder. Identity content encoding prevents compression
from buffering that first byte and masking the unfinished-body check. Both
paths must hit the complete ten-second client deadline. Browser checks require
actual `requestfailed` abort observations on deadline, editing and same-document
browser Back leaving the form. A hard document replacement can lose the old
page's observation and is not a substitute for the route-cleanup check.

Removing the deadline makes the saved native test fail on the eight-second
successful result; removing explicit edit interruption fails browser abort
observation. Exact source restoration, compiled dependencies and all four native
tests must then pass. Caller abort does not establish upstream cancellation.
Log-message pay checks exclude unrelated numeric timestamp metadata; private
text markers remain checked across the whole record. Controlled capture checks
must tolerate pay-like timestamps and reject pay values added to a message.
These observations are bounded by the [dated receipt](../documentation-audit/clean-slate-foundation/2026-10-05-native-cancellation.json).

### Native local development qualification

The existing native Website suite also owns `native-local-development.boundary.test.ts`.
It launches the real public Alchemy CLI with the separate local root, scrubbed
environment, owned empty env file, source selection inherited by children, and
a scoped empty profile directory. It reads actual CLI resource addresses rather
than assuming available ports. Both saved resource modes must be local; the
API resource must select its source entry. An empty default profile directory
is native SDK bookkeeping, not credential custody.

The browser first proves client-only validation and editing before modifying
source; otherwise a source edit during hydration can cause a false mismatch.
The test observes a changed and restored heading with no calculation replay,
an exact browser RPC and a JavaScript-free private-binding calculation. A
scoped actual API source edit adds a fixed response header, and the current
local health response must gain then lose it after exact restoration. Reload
polling admits temporary socket closure but requires an actual successful
response for each observation. The child process scope sends SIGINT and
releases descendants; both actual app ports must stop serving afterwards.
Run this test alone with respect to source scans and other development watchers.
It establishes local development only; cloud state, login, provider writes,
deployment and exported tracing remain separate claims.

Both saved local resource records must also contain explicitly disabled global,
log/invocation/persistence and trace collection with zero sampling. Native mock
Plan checks require the same fields on each actual planned resource. Removing
the API graph policy must fail the real CLI local-state Schema check after its
runtime journey, followed by exact restoration and passing saved checks.
This oracle qualifies declared containment, not provider upload or exported rows.

The development fixture uses the non-polling watcher used by Linux CI. It waits
100 milliseconds after the first visible page edit before restoring the source,
because the pinned Vite watcher suppresses repeat file-change events within
50 milliseconds. Both visible updates remain required at the original deadlines.
The dated receipt retains the original hosted restoration timeout and the
direct watcher reproduction; a locally passing run does not turn that failed
hosted attempt into a success.


### Previous calculator answer qualification

The native pair fixture also checks T004's deliberate answer behaviour. After
an actual successful browser calculation, editing retains the answer with an
out-of-date message and makes no request. Returning to the original figures
still requires Calculate; one new real RPC clears the stale message and returns
the retained answer. A controlled unavailable reply and an invalid form must
keep the previous answer visible and out of date. A fresh Chromium context
loads actual successful private POST HTML over its real document connection,
hydrates without replay, and retains that answer after editing and a failed retry.
The semantic `output` has a name and atomic polite announcements.

The server-restored browser input's named Playwright `fill` call is admitted
only at the existing native fixture. Actual CLI cases admit that receiver there,
reject a different receiver there, and reject the same receiver at the leaf.
Runtime and other collection permissions remain unchanged. The existing
interruption/route cleanup and private JavaScript-free paths must still pass.
The [dated receipt](../documentation-audit/clean-slate-foundation/2026-10-05-stale-calculator-answer.json)
owns candidate and removal/restoration observations. This does not complete
T004's other calculators, package interface or transport limits.


### Take-home result explanation qualification

The same native pair fixture now requires the result explanation to begin
collapsed, receive keyboard focus and open with Enter without calculation.
Its actual 1654-dollar weekly reply must show 1654 dollars gross/taxable pay,
353 dollars PAYG/total withholding, the claimed threshold and the exact ATO
reference. Editing to 2000 dollars retains those report amounts; editing the
checkbox in restored successful Worker HTML keeps the old report's threshold
choice. The main answer, stale warning, private no-JavaScript calculation,
source reload, errors and cancellation still require their existing oracles.

Three focused browser cases render owning Schema fixtures to admit a valid
HTTPS source link and reject a non-HTTPS reference and malformed HTTPS address.
Missing trace scale must not imply either threshold choice. These fixtures
qualify link/absence presentation; they do not qualify tax rules or an ATO
website. The [dated explanation receipt](../documentation-audit/clean-slate-foundation/2026-10-05-take-home-explanation.json)
records this bounded slice. All calculator pages and complete T004 acceptance
remain unfinished.


The explanation oracle also requires a distinct successful native browser
request after restoring the server answer and retrying: 2000 dollars weekly,
threshold not claimed, produces 1425 dollars take-home with 575 dollars PAYG
withholding. Both gross/taxable fields become 2000 dollars, the recorded
threshold changes to not claimed and the stale warning clears. This rejects
an explanation hard-coded to the first 1654-dollar example.


The successful saved-answer navigation must continue to the real Website as a
private POST, rather than fulfilling a document from captured HTML. The latter
can classify the document outside the local address space in selected Chromium;
mocked errors then work but a real API retry is refused by Local Network Access.
The extended recovery oracle caught this gap. Actual private/public Worker
calls still returned the expected 1425-dollar reply; Chrome's console named
the loopback refusal. Changing only navigation to a real private POST qualified
recovery without changing browser permissions, request tracing or transport
policy. Captured error HTML remains a display-only hydration fixture and
establishes no subsequent real-network retry.

The browser lifetime fixture separately requires an actual completed mocked
client failure followed by a pending retry: the busy label must show and the
previous alert must disappear. Native AsyncResult preserves a previous failure
during waiting; treating it as the current outcome gives a premature error.
Removing the container's waiting check must fail that rendered-browser oracle.


### Calculator catalogue RPC qualification

The existing RPC tests also require the named catalogue operation to return all
three retained IDs and 2025–26 Australian contexts through the real service in
the explicit test Layer, and canonical titles through native HTTP/JSON RPC.
Version mismatch must stay a checked failure for either procedure. Damaged
JSON and valid JSON with the wrong result shape must be checked invalid
responses for both operation exits. Both operations use the existing stalled
headers/body, earlier interruption, caller-scope cleanup and credential/redirect
policy oracles. Unknown native procedure tags remain rejected.

The existing saved native pair fixture additionally reads the built actual API
catalogue with the checked native client, then repeats it after idle time. This
qualifies the catalogue operation at a separate real local Worker connection;
it does not claim homepage consumption, new calculator pages, rate/concurrency
policy, provider state or deployment. The
[dated catalogue receipt](../documentation-audit/clean-slate-foundation/2026-10-05-calculator-catalogue-rpc.json)
owns exact candidate and qualification outcomes.


### Catalogue-backed calculator pages

The native pair journey checks catalogue navigation in actual rendered HTML,
then uses both additional pages with real browser RPC and ordinary HTML POST
without JavaScript. The retained monthly 9500-dollar unclaimed withholding
answer is 2756 dollars; the 67000-dollar annual answer is 12228 dollars. Route
changes start with an empty result for the new calculator; editing retains its
own answer visibly out of date, without another request. Explanations and source
links belong to the checked returned report. The agent route links to actual
native OpenAPI output.

Form boundary checks reject invalid annual numbers and identity/form mismatch
in saved submissions. Exact Playwright `fill` admissions for `calculatorInput`
and `plainCalculatorInput` belong only to the native pair test. Actual CLI
fixtures qualify both receivers and reject the same operation in the nearby
application leaf; existing unrelated-receiver rejection remains enforced.
The [dated page receipt](../documentation-audit/clean-slate-foundation/2026-10-05-calculator-pages.json)
records candidate qualification and remaining T004 work. Local known results
are retained behaviour, not current-law Medicare or deployment proof.


The page fixture additionally uses distinct actual private POST submissions:
1654 weekly with threshold claimed returns 353 withheld; 30000 annual taxable
income retains 1465.80 liability. Server HTML and hydrated input values must
agree, with no browser calculation replay. Default-example-only assertions
would allow broken form restoration to pass; these distinct inputs prevent it.
Both additional pages retain the old answer through a controlled 503 retry and
invalid input, without automatic or invalid-input requests. Native disclosure
and Calculate also work with the keyboard.

### Native request size admission

The native API boundary test sends valid HTTP and RPC calculation JSON padded
to exactly 65536 encoded bytes. Both must return the retained report through
one supplied application operation, with request scope and cleanup intact.
The rejection tests cross the limit in separate chunks or use multi-byte text
whose character count is below the byte limit; the unread tail must remain
untouched and the source must close. Existing stalled-body and earlier caller
interruption checks remain required.

The saved native pair fixture checks actual built public HTTP/RPC and all
three Website form paths with oversized multi-byte text. Each returns empty
413; public API rejection retains the checked Website CORS policy. Normal
catalogue and all retained calculator journeys must still pass. The
[dated size-policy receipt](../documentation-audit/clean-slate-foundation/2026-10-05-request-body-policy.json)
records exact qualification, damaged-limit detection and limits of this proof.
It does not establish standalone Bun admission, later MCP envelopes or the
complete rate/work/concurrency/client-failure policy.

Native page screenshots use the existing ignored repository build root
`.alchemy/native-pair/screenshots`, created through Effect Path/FileSystem.
A hard-coded `/private/tmp` output passed locally on macOS but failed the exact
Linux Quality run for page draft #141. Portable artifact placement belongs in
the owning fixture; retain that failed hosted attempt alongside its corrected
candidate. Complete local verification must also finish: an ENOSPC failure
inside an isolated dependency installation is not a passing Quality check.

Private RPC response policy has exact-limit calculator/catalogue oracles using
valid native replies at 2 MiB, progressive/multi-byte oversized streams with
unread tails and source release, and status rejection without body reading or
automatic retry. Real native HTTP controllers must abort on checked status
rejection. TestClock confirms the complete deadline has not fired at nine
seconds and releases stalled headers/body at ten. The native delayed fixtures
now wait twelve seconds: the contract change justifies a 12-second browser
observation allowance. The cancellation fixture has a 65-second total Effect
budget and 70-second test-runner allowance including cleanup. Two local runs
exhausted the previous 45-second total after the deadlines and editing checks,
before departure could finish. The total allows three sequential ten-second
deadlines alongside Worker/browser startup and edit/departure work; each
individual deadline and cancellation assertion remains unchanged. Original
15-second page observation guards remain unchanged.


The calculation work-policy candidate adds focused calculator substitution tests
and shared native application tests. The built Worker test fills one API pool
using an RPC batch and HTTP, waits for eight reached operations through fixed
safe host events, checks extra HTTP/private SSR/public browser failures, then
checks five-second HTTP 504 and canonical RPC timeouts plus cleanup. The genuine
native client preserves the timeout identity. Browser restoration covers both
new errors with no replay. The dated [work-policy receipt](../documentation-audit/clean-slate-foundation/2026-10-05-calculation-work-policy.json)
owns candidate outcomes, failures, exact source/artifact identity and limits.
Timers cannot force CPU pre-emption, and local proof does not establish provider
or deployed behaviour. No broader decoder/encoder/Playwright lint exception is
introduced: tests use existing exact transport boundaries and qualified receivers.


### Complete named RPC qualification

The existing RPC corpus now runs the reply-size/status/decoder/lifetime tests
against all nine named operations. Valid complete replies exactly at 2 MiB
succeed; crossing streams stop before their tail. Every operation tests stalled
headers/body, earlier interruption, caller scope closure, credential/redirect
policy, malformed JSON/result shapes and both older revisions. Controlled
metadata failures prove fixed expected guidance and fixed remote defect values.
The existing native pair test also calls all seven new metadata operations
through the real built API Worker. Rule-list membership is compared without
assuming the existing immutable collection's iteration order. The dated
[receipt](../documentation-audit/clean-slate-foundation/2026-10-06-closed-rpc-operations.json)
records qualification and remaining T004 limitations.


## Shared request and metadata protections

The HTTP package's actual standalone router rejects oversized encoded bodies
before JSON decoding. Controlled streams prove five-second read closure in JSON
and HTML policies, and controlled monotonic time rejects late synchronous reads.
All eight metadata operations have controlled five-second timeout, cancellation,
late-result and calculation-capacity tests. Actual HTTP handlers encode declared
504 envelopes at all eight metadata endpoints; all nine RPC client methods
preserve the checked operation timeout through native JSON transport.

The built native pair additionally reaches stalled schema metadata through both
HTTP and the generated RPC client, checks five-second 504/RPC failures, CORS and
safe cleanup logs. Its form paths return safe 413 HTML and its API POST paths
return checked 413 JSON. Genuine packed consumers import the HTTP admission
export and the SDK's canonical metadata error declaration. The
[request and operation protection candidate](../documentation-audit/clean-slate-foundation/2026-10-06-request-operation-protections.json) records qualification; rate identity/limits and whole T004 acceptance remain
unfinished. Timers cannot force synchronous CPU pre-emption or remote Worker
cancellation. Local evidence does not establish deployed behaviour.


The [core schema-owner candidate](../documentation-audit/clean-slate-foundation/2026-10-06-domain-schema-owners.json)
binds historical trace/ledger codec compatibility to genuine packed declarations
and runtime consumers. Whole T004 acceptance remains in the active plan.

The [fallible primitive candidate](../documentation-audit/clean-slate-foundation/2026-10-06-fallible-domain-values.json)
tracks invalid amounts, arithmetic overflow, complete calendar checks and
historical optional-end bytes. Core's existing type command now includes tests;
its separate build configuration retains source-only output. Rule snapshots
encode dates through the owning codec rather than snapshotting internal Option
objects. Exact-path lint controls retain decoder/encoder separation and reject
runtime execution in those admitted files. The packed consumer checks the
changed constructor types and safe error representations. Qualification and
limits belong to the dated record; this does not accept table relationships,
rate limiting or all of T004.


The parameter-table slice adds focused tests at the three rules-package owners.
They check malformed rows, whole-table gaps/overlaps/open-middle bounds and
missing scale coverage through owning fallible constructors and the saved
representation Schema. Valid single-cent inclusive rows, signed Schedule 1
coefficients and both authored Schedule 1 years remain admitted. No new runtime,
decoder or encoder file admission is added. The SDK's genuine packed consumer
checks all five public table constructors and typed/saved decoding, plus 15
fixed historical table/period/source SHA-256 hashes. Its explicit `bun` hash
import belongs to the generated external test host; the consumer retains an
empty ambient-types list. The active plan and dated receipt distinguish focused
proof from the complete current-candidate graph.


The domain absence slice adds Core representation round trips for all three
trace and question forms, descriptor absence/value cases, total parameter
collections and explicit false/true duplicate-provider behaviour. Twelve actual
CLI cases prove exact new test codec admissions and retain runtime rejection.
SDK tests distinguish checked report narrowing from transport decoding.
Genuine packed fixtures reject wrong constructor/child/service types, assert
22 pre-change metadata response hashes, and retain original trace/ledger and
table/source fingerprints. The
[dated candidate](../documentation-audit/clean-slate-foundation/2026-10-06-domain-absence-owners.json)
owns qualification; public request absence and rate work remain unfinished.


Calculator `check-types` includes `tsconfig.test.json`, covering the public
service and shared-work fixtures. This prevents raw request fields bypassing the
new canonical Option Types. The SDK regression retains guided errors when
options are omitted, so a whole-union fact check cannot replace the selected
calculator decoder. Genuine packed declarations reject raw option strings/null
and unwrapped false permission. Its runtime retains 24 original request forms,
22 error/metadata forms, 36 reports and 36 safe input errors by saved hashes and
key identity, alongside the earlier metadata/table/trace expectations.


Website Chromium qualification sets `optimizeDeps.force` because its explicit
workspace RPC include can change without a lockfile change. Vite must rebuild
that dependency bundle on each run. The failed request-absence attempt retained
old request Schemas in that cache; the corrected run uses current Option owners.
The candidate receipt keeps the failed graph and focused browser recovery.


The built shared-work fixture encodes its known batch payload with the RPC
payload Schema and its public HTTP body with CalculatorRunRequest before any
unknown adversarial framing. Encoding domain Options as generic JSON otherwise
fails admission before reaching work, hiding the intended pool/cleanup proof.
Reached-operation warnings, capacity, deadline and privacy oracles remain fixed.


The API app work-pool, 64 KiB and defect fixtures use their checked native frame
and HTTP body codecs. Malformed tag/id cases mutate an encoded valid frame.
The request-absence attempt exposed generic JSON encoding of domain Options
that failed admission before the intended service/error path; the candidate
receipt retains that failed graph and the original assertions stay fixed.

### Native documentation connection qualification

The documentation RPC corpus checks five named operations with a separate
revision agreement through the real native HTTP server/client. It requires
complete owning page/navigation/search values, byte-equal Markdown, fixed public
failures, safe native fatal and procedure reply bytes, and damaged JSON/result
classification. An unrelated adapter SchemaError retains its exact identity.
Every call must accept a valid native reply padded to exactly 2 MiB and reject
progressive/multi-byte oversized replies before their tail. Controlled clocks
observe deadline through headers/body, earlier interruption and scope cleanup;
operation ingress observes credential/redirect policy.

The native workerd/Chromium pair separately compares all accepted pages and
exact Markdown through this client at the built API, retaining every existing
calculator journey and public HTTP check. API/client tests do not establish
Website rendering on their own. The extended native Website journey below
qualifies local page rendering. Search interaction has its own qualification
below. Discovery files have their own qualification below; old-app retirement,
deployment and public availability remain unproved by these local slices.

### Native Website documentation qualification

The existing native Website journey now reads actual SSR HTML for every accepted
page and independently checks headings, substantive article content, navigation,
title, description, canonical and Markdown link. A checked loader value alone
cannot satisfy that oracle. Requests carry a hostile page header to prove that
SSR still uses the original address. Generated native page GET ingress accepts
only a checked public page header; malformed paths, query and content-type
input reject before framework parsing. Direct missing-page requests must return
native HTML 404.

Three source-built API artifacts change an otherwise valid page's Markdown,
frontmatter or compiled-module identity. Each cold Website must return safe
recoverable HTML and a checked native loader failure. This exposed a cross-request
stream in the installed Fetcher adapter; preserving the native JSON byte body
restored the intended failure path. A genuine valid server-function reply is
also damaged in Chromium to prove the route restoration boundary rejects it.
The native builder restores its actual source owners in a scope.

Real sidebar and authored links must use native GET requests with zero document
requests, one current-page marker and deliberate heading focus. Initial
hydration must not steal focus. Mobile navigation, table keyboard focus,
contained horizontal content and no-JavaScript reading are observed separately.
Full-page desktop/mobile images start at the document top and supplement these
functional checks. Browser bundle exclusion uses a positively observed API
service identity; a calculator service name appearing in accepted documentation
prose is not executable engine code. Exact decoder consumers and neighbouring
renderer restrictions are exercised by the actual lint command.


### Native Website search qualification

The existing native pair reads the built search function identity, checks its
exact ingress and compares real SSR result titles with the actual API search
operation. Literal numbers, quoted text and Unicode stay unchanged. Original
SSR words resist forged headers; duplicate/unexpected keys, overlong words,
malformed URI components and invalid UTF-8 fail safely. Empty words, no matches
and actual unavailable API settings have distinct rendered states. A genuine
native reply is damaged in Chromium to prove restoration rejects it.

Actual search navigation uses native GET without replacing the document;
standard GET form submission and document links also work without JavaScript.
Desktop/phone captures supplement keyboard focus, contained content and result
navigation assertions. The focused browser fixture mounts the actual search
loader/components in a scoped detached plain shell: rendered-value checks
need no insertion into the runner document. Actual page/focus/form observations
remain in the native journey. It waits for the rendered form after navigation,
then checks restored words and duplicate-key rejection. A router promise alone
is not an observation that React has finished showing its destination.

Exact lint selectors admit URL ingress decoding only in the search-location
boundary, output encoding in the existing native loader host, and one restore
consumer in the search route. Actual CLI positive and neighbouring-renderer
negative cases retain the runtime/decoder/composition restrictions. The native
search operation and content contract remain unchanged; no separate index or
analytics is qualified. The [dated search receipt](../documentation-audit/clean-slate-foundation/2026-10-07-website-docs-search.json)
keeps failures, fresh qualification and retained source identities separately.

The real local-development fixture requires served-page readiness after printed
addresses. It retries only 502/503 responses at 100-millisecond intervals for at
most fifteen seconds, then requires 200 before strict browser navigation and
heading observation. Application errors, socket errors and persistent gateway
failures still fail. This strengthens the start condition without diagnosing
an earlier hosted 502 or establishing that its cause has been reproduced.


### Native Website discovery qualification

Content tests derive all four closed documents from a checked synthetic
catalogue and configuration, observe lazy cached settings, reject unsafe origins
and relate each path to its media type and body bound. The existing private RPC
corpus covers the fifth operation, including malformed/oversized/status/fatal
replies, deadlines, interruption and revision skew. A valid checked reply for a
different file must be rejected; fixed discovery guidance cannot contain the
private source diagnostic.

The source-built native pair compares each Website GET body against the real
checked API client and accepted catalogue, checks all accepted canonical sitemap
addresses and parses XML in Chromium. It checks actual GET/HEAD media/cache/
`nosniff` headers, explicit empty 200 HEAD, method/query rejection and a real
unavailable binding's empty uncached 503. Exact processed Markdown comparison
preserves useful imports inside fenced code examples; an assertion rejecting
all import lines would falsely reject accepted documentation. Existing source
compilation owns removal of authored MDX syntax. Retained source hashes qualify
source preservation separately. The [dated discovery receipt](../documentation-audit/clean-slate-foundation/2026-10-07-website-docs-discovery.json)
records candidate identities, corrections and actual check results; it does not
close T005, establish deployment or prove the later Markdown/image/retirement
work.


Controlled built page-mismatch fixtures retain ContentCatalogue with
`Layer.provideMerge` while replacing only ContentService page replies. Dropping
that dependency causes general RPC unavailability before the intended mismatch
can be observed; the existing exact presentation-error assertion catches this.
The builder must retain the complete service graph rather than weakening that
assertion to accept unrelated failure.


### Native Website Markdown qualification

The owning header suite tests bounded complete fields, empty list members,
quoted separators/escapes, quality and specificity, zero exclusions, ties and
false substring matches. Optional native RegExp capture values pass through
nullish Options before use. Full-field coverage consumes each list separator;
zero-width empty matches must not skip the next media range.

The existing source-built native journey compares all accepted same-page and explicit
`.md` GET bodies with the owning processed catalogue. It checks every HEAD's
explicit 200, empty body and equal media/cache/`nosniff`/Vary/canonical headers.
Real original addresses ignore forged native page headers. Actual weighted,
quoted, invalid and excluded fields select HTML/Markdown or safe empty errors.
File/query/missing inputs and a real unavailable API binding are exercised.
Chromium parses every HTML article's alternate/visible Markdown link and opens
that link to the exact processed text. Existing navigation/no-JavaScript and
calculator/native failure/cancellation cases remain in the same journey.

Actual lint commands admit only the exact new HTTP boundary and header fixture,
reject encoding and runners there, and reject decoding in nearby leaves/routes.
The [dated Markdown receipt](../documentation-audit/clean-slate-foundation/2026-10-07-website-docs-markdown.json)
records candidate identities, actual checks, failures/corrections and remaining
work. Local qualification does not establish hosted success or deployment.


The retained docs asset-propagation fixture allows five seconds for successful
Chromium hydration after the missing asset is served, while permanent missing
assets keep the short wait. Its oracle still requires exactly two actual asset
requests, one retry, a present router and no diagnostics. The fixture tests
propagation recovery, not 200-millisecond browser performance. This changes no
production deadline or retry policy; the new dated receipt retains the original
hosted failure and the limit of its diagnostic evidence.


The Website's checked HTML choice is supplied as concrete `text/html` to the
framework through the native request Context. Otherwise the framework's own
limited Accept check rejects a valid `text/*` preference even after the owning
Schema chooses HTML. Original URL, caller signal and the host request scope
remain intact. The actual wildcard journey must render an article, and focused
HTTP policy tests preserve existing Vary fields without invoking content lookup.

### Native Website share-image qualification

The focused boundary suite checks PNG signature/dimensions/truncation/byte limits
and safely encoded unusual title/description characters using the owning public
page contract. The existing source-built native pair reruns the actual generator
and compares every output byte with the previously copied build asset. The asset
set must exactly match accepted paths. Actual static GET/HEAD media, cache,
empty body and bytes are checked separately from generation. All accepted HTML
heads must contain matching canonical/image/card values and decoded TechArticle
text/addresses. Chromium independently decodes each served image and observes
its natural 1200 by 630 dimensions. A representative long-title image is viewed.
Worker/browser artifacts must exclude the build renderer and its WebAssembly.
Existing calculations, native development and content/failure journeys remain.
Exact CLI fixtures qualify decoder/encoder permissions and adjacent refusals.
The [dated image receipt](../documentation-audit/clean-slate-foundation/2026-10-07-website-docs-images.json)
owns observations and limitations; it does not prove a hosted social preview.

The full Knip graph includes the Website Vite host and its
imported generation program. PNG byte validation belongs to build scripts, keeping
build-only checks out of the public metadata module.


## Current documentation replacement check

The release graph retains nine check IDs and now binds `docs-browser` to
`bun run web:test:native-pair`. The command freshly builds the native API and
Website and runs all native cases without selecting a name-filtered
subset that could become empty. The reader journey independently proves all
accepted pages and metadata, real private calls without document reload,
search, discovery, Markdown, generated PNG delivery and browser decoding.
It also observes skip-link keyboard use, initial/navigation focus, one main,
article and Documentation navigation landmark, current links, mobile layout,
text contrast of at least 4.5 and suppressed motion. Fixed error recovery and
actual 404 responses remain separate from a successful transport decode.

Quality resolves and installs Chromium through the Website's exact local
Playwright executable. The existing path/version/key/order and cache/trust
policy remains; its refusal cases also reject selection of the old docs owner.
The current journey/profile and release runbook select this replacement.
Historical HGI-203/DAR/HFI records and their Schemas keep their old identities.

The old app workspace, build/test selection and writers are now retired.
The verified retained-source and operation routes preserve history and refuse
new old-resource operations. The later
[retirement receipt](../documentation-audit/clean-slate-foundation/2026-10-07-docs-retirement.json)
records the completed local retirement checks. None of these local results
proves provider state; historical hosted resources require separate authority.
The earlier [replacement-check receipt](../documentation-audit/clean-slate-foundation/2026-10-07-website-docs-checks.json)
retains its original checkpoint and limitations.


## Exact local CI detail identity

CI-mode release output now uses the existing report renderer over its checked
returned result. Each successful check names its actual sanitised stdout/stderr
path and SHA-256. The CI header retains its report-only limit; candidate output
and retained attempt bytes stay unchanged. Evidence consumers verify these
returned file identities rather than selecting the newest file in a directory.
A later test can use the same check ID and produce another valid small log.

The native process-boundary test runs two real commands with the same ID and
proves the first report names only the first pair of returned artifacts, with
no raw excerpts, secret sentinels or host paths. The Quality source policy
requires the exact named renderer from the Schema/report owner and the result
returned by the canonical CI call; plain success text, another result, shadowed
renderers and candidate reads are rejected. See the [dated detail-output receipt](../documentation-audit/clean-slate-foundation/2026-10-07-release-detail-output.json).


## Native MCP caller qualification

API tests use the exact official MCP client 2.3.1 against the native application,
including real frame/header parsing, expected/defect privacy, different caller
allowances and filled-pool cancellation/reuse. The complete native-pair suite
also uses it over real local TCP against the source-built API. Its report and
accepted Markdown page must equal HTTP results, and alternating HTTP/MCP work
must exhaust one local allowance. Empty log queues use the installed `Queue.clear`
operation; `takeAll` waits for a first message and cannot prove silence.

Exact API/native client fixtures admit wire decoding and checked egress only;
actual CLI fixtures reject runtime execution and neighbouring production-file
codecs. The test type conditions select compiled vendor exports while retaining
workspace source exports, matching the official client's runtime dependencies.
No vendor/library-check suppression or dependency upgrade is introduced.
The [dated MCP record](../documentation-audit/clean-slate-foundation/2026-10-07-native-mcp.json)
retains source/log identities, failed attempts and remaining work at that
checkpoint. The newer session candidate below separately qualifies actual older
calls. The later
[agent setup receipt](../documentation-audit/clean-slate-foundation/2026-10-07-agent-setup-and-cancellation-bounds.json)
records T006's local acceptance and separately approved guide delivery. The
documented modern cancellation limit remains.

## Native older-client lifetime candidate

The existing `native-mcp.boundary.test.ts` now starts the real built API,
stalled-work API and accelerated-expiry API with SDK-generated Durable Object
exports. Official client 2.3.1 supplies all handshakes and tool frames over actual
TCP sockets. Two `2025-11-25` conversations list tools and read/calculate through
canonical Schemas; reports and processed Markdown equal HTTP. Interleaved
HTTP/modern/older calculations exhaust one native allowance despite a forged
private rate header. Real modern frames with mismatched routing/version headers
receive 400. Origins and malformed IDs fail, and GET/DELETE remain 405.

Thirty further official-client handshakes fill the older host's 32-attempt
allowance. A further request receives 429 with Retry-After; existing clients
still work. Native initialise with an existing ID receives 400, preserves those
conversations and does not reopen allocation. SQL inspection after calculations,
docs reads and all 32 conversations sees only native metadata bookkeeping and
the emulator's name table. Platform-private metadata values are not exposed by
that inspection; no claim of their contents comes from this query. Actual native
instance eviction loses the old IDs, and a fresh official-client handshake works.

A separate stalled-work object reaches eight actual calculations. Another
conversation's cancellation notification must leave them running; the owning
client's cancellation must release exactly one place within one second, and a
replacement must enter before the original five-second budget. Cleanup releases
the rest. A modern real outgoing TCP request is then explicitly aborted through
its native signal. Its client stops, but no place is released immediately and a
replacement receives safe capacity refusal. All eight actual operations release
at their five-second budget. This negative observation cannot be replaced by an
in-process cancellation pass or the older conversation's positive test.

The expiry fixture changes only `McpSessionLifetime` from ten minutes to 1.5
seconds while retaining the real app, handlers, native class and alarm callback.
Thirty-two actual metadata operations occupy all request places; another is
refused immediately with 503. No new HTTP request or manually invoked callback
runs while the check waits for all 32 cleanup observations. The native platform
alarm must release them within three seconds. Old IDs then receive 404 and a
new official client must initialise and list six tools with a different ID.
The [session candidate record](../documentation-audit/clean-slate-foundation/2026-10-07-native-mcp-sessions.json)
records the source-built alarm-removal challenge, restoration, complete-check
status and limits. Ten-minute cloud timing and prompt modern remote cancellation
are not established by this accelerated local proof.

The source builder gets native class exports from memory-only compilation of
the actual API declaration; all provider, credential and network operations
refuse. It runs no provider plan/apply. Actual source-built class exports and
successful clients prevent an emulator-only binding from qualifying an absent
handler. Native graph tests require this class on the API and its absence on
the Website in create/no-change/update cases. Exact session ingress permits only
its decoder; actual CLI fixtures reject its encoder/runtime and a neighbouring
service decoder. No public package export, SDK contract, dependency version or
collection policy changes.

## Native visible browser caller qualification

`native-browser-tools.boundary.test.ts` uses the built Website/API, disposable
Chrome153 with WebMCP enabled and its actual developer-tools protocol caller.
Installed Playwright types own command/event identities. Five tools must appear
without a calculation request; read/fill/calculate/read-result must agree with
visible fields and reports. A completed manual RPC must produce the same annual
answer. Excess fields on a no-argument tool must fail without another request.
An edit retains a stale answer, overlapping calculation is busy, caller abort
and edit interrupt unfinished calls, manual retry succeeds, and route exit removes
all five registrations and interrupts unfinished execution. Reply observations
retain unmatched native events so one reply cannot hide another cancellation.
After leaving, actual Chrome garbage collection runs before the caller returns
to the annual page. Visible fields, the shared form and the previous stale
report must survive without a new RPC request. This failed before the retained
view's callback also held the whole weak-family description group.

Controlled host tests separately prove absent/unsupported/wrong-origin fallback,
receiver preservation, independent refusal, a two-second stalled registration,
safe declared/defect failures and abortable scoped callbacks. They do not establish
native browser acceptance. Existing hydration tests restore a different amount,
period and threshold choice and require the displayed form, shared view and next
explicit checked request to agree. Directly seeding a narrowed projection would
otherwise show restored fields while submitting defaults.

Actual CLI fixtures admit only exact host/test decoders, fixed host failure egress
and the controlled test's Promise signature. They reject neighbouring codecs,
general runtime execution, async/await, new Promises and Promise chains. The
[dated browser receipt](../documentation-audit/clean-slate-foundation/2026-10-07-browser-calculator-tools.json)
owns versions, source/check identities and failed attempts. This proves native
protocol calls controlled by the test, not an autonomous model session. Prompt
modern remote cleanup remains unqualified: work ends at the five-second
budget. The later agent setup receipt records the completed connection guide
and its separate delivery; autonomous model-session behaviour remains unproved.


### Saved calculator state through a paused first render

The page view stays alive in its root registry. The browser fixture restores a
different amount, period and threshold through a separate server registry. It
then renders once into the client registry without subscribing, lets its queued
cleanup run, mounts hydration and waits for a React effect and another cleanup
interval. Guidance, displayed form, shared state and the next explicit request
must still agree; no calculation may occur on mount. This is a controlled live
renderer lifetime check, not a network or autonomous agent proof.

The original shared-registry fixture could observe server HTML before hydration
completed. Complete built-app checks exposed disappearing saved reports/errors.
The stronger fixture failed for all nine saved errors before `Atom.keepAlive`
was applied to the shared view, then passed. The native saved-report/error checks
also wait for document network idle and use bounded locator reads. Actual native
HTML, browser fields, retained answers and no replay remain separate oracles.
See the [dated browser receipt](../documentation-audit/clean-slate-foundation/2026-10-07-browser-calculator-tools.json)
for the failed graph, direct reproduction, correction and subsequent evidence.

Keeping a value node alone does not keep its weak-family grouping object. The
native return-after-garbage-collection check catches that separate identity
failure: the earlier focused checks left the description reachable while mounted
and never forced browser collection between visits. The retained view now reads
through its immutable group, so registry values and descriptions share a
lifetime. Root disposal still releases the registry and scoped client.


### Retained PostHog project

The infrastructure tests use the installed Distilled operations with controlled
HTTP replies, plus a real native Fetch request to a loopback redirect. They check
complete paged ownership before create, safe permission failures, uncertain
write recovery without a second POST, unchanged keys during update, supported
privacy readback, one-attempt deadlines and streamed reply bounds. The native
Stack/Plan tests use memory state and a deterministic management Layer; profile,
credential and network services refuse access. Exactly one shared project retains; no-change
and in-place rename preserve identity, missing retained resources refuse, and
the native bulk-delete scan skips the project resource type.

Actual lint fixtures admit the SDK only in its exact private adapter, including
refusal of neighbouring static exports and literal dynamic imports. Decoder and
synthetic encoder permissions remain exact paths; ordinary fetch and runtime
execution still refuse. The
[dated candidate receipt](../documentation-audit/clean-slate-foundation/2026-10-08-retained-posthog-projects.json)
records local checks and failed attempts. These tests do not prove real project
capacity, credential scope, provider changes or stored events.
The current graph supersedes that receipt's un-applied two-project shape;
historical receipts retain their original source and observations.
Native response and request-signal checks cover deterministic abort on rejected
backend replies and redirected relay/management replies, plus bodyless backend
204 success. An Effect scope also owns the actual HTTP client's abort lifetime;
a fixture's own finaliser alone is not proof of native transport cleanup.


The docs-content generation, test and type leaves rely on Turbo's existing
`^build` dependency. They do not launch another docs-fumadocs build. The root
`docs:catalogue` route uses the filtered generation task, so its cold run still
prepares compiled dependency artifacts. This prevents the package test and
build branches from concurrently removing the same compiled directory. The
first retained-project full test run exposed that race; the failed log remains
in the dated receipt, rather than being counted as a passing check.

### Website event relay

Focused Effect tests cover complete unchanged bytes, exact/crossing limits
without Content-Length, refused origins/metadata, DNT, provider status/retry
advice, stalled requests/headers/replies, late headers within one deadline,
interruption and independent concurrent request scopes. A real native Fetch
client against a local server proves redirect refusal before a second request.

Four built-Website cases exercise off, malformed enabled config, forwarding and
redirects through the actual runtime/route, including DNT and header stripping.
A positive compiled-source oracle rejects old output. A checked synthetic
fixture contains actual PostHog 1.438.2 gzip, JSON and retried request bytes from
controlled Chromium. SDK integrity/browser observations are separate from
deterministic replay. Only the minimal Fetch profile is qualified; no library
lifetime or withdrawal claim follows. The
[dated relay receipt](../documentation-audit/clean-slate-foundation/2026-10-08-website-event-relay.json)
retains failed attempts, exact source and local checks. Real project/credential
scope, activation and provider storage remain unqualified.

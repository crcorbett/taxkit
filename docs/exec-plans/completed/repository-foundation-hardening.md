---
status: completed
last_reviewed: 2026-07-14
source_of_truth: execution-plan
confidence: high
---

# Repository Foundation Hardening Execution Plan

Spec:
[Repository foundation hardening](../../product-specs/repository-foundation-hardening.md)

Task list:
[`repository-foundation-hardening.tasks.json`](../../product-specs/repository-foundation-hardening.tasks.json)

## Goal

Implement the complete task list one task at a time. Use exactly one subagent
per task, sequentially. The parent agent owns review, three-pass improvement
audits, verification and final acceptance before the next task is delegated.
Return corrections to the same subagent; after a third failed correction turn,
stop the rollout and record a blocker for replan or user decision.

## Status

| Task | Status | Notes |
| --- | --- | --- |
| FND-001 | complete | Beta.98 migration accepted after correction turn 2 and independent parent verification. |
| FND-002 | complete | Accepted after correction turn 2 and independent focused, strict downstream and repository verification. |
| FND-003 | complete | Parent accepted correction turn 3 after the final Bun non-host false positive was removed and all gates passed. |
| FND-004 | complete | Parent accepted the corrected Effect-native release-readiness command and Changeset after all mandatory gates passed. |
| FND-005 | complete | Parent accepted the durable docs, status reconciliation and complete final release evidence. |

## Validation Log

### 2026-07-14 - Planning and live dependency audit

- Confirmed the npm `beta` dist-tag is `4.0.0-beta.98` for `effect`,
  `@effect/platform-bun`, `@effect/platform-node`, and `@effect/vitest`.
- Confirmed `@effect/language-service` latest is `0.87.0`.
- Confirmed the workspace is still on beta.60 and CI pins Bun 1.3.8 while
  `.bun-version` and `packageManager` use Bun 1.3.14.
- Confirmed `CLAUDE.md` is a drifted regular file rather than a symlink to
  `AGENTS.md`.
- Confirmed `packages/scripts` is documentation-only and strict downstream
  validation still records packed-manifest protocol blockers.
- Chose five sequential slices so the Effect migration lands before tooling
  and static enforcement target the final APIs.

### 2026-07-14 - FND-001 correction turn 1 ready for parent review

- Upgraded `effect`, `@effect/platform-bun`, `@effect/platform-node`, and
  `@effect/vitest` to one exact `4.0.0-beta.98` catalog family. The only
  explicit platform-node consumer now uses the catalog, and `bun.lock` has no
  beta.60 Effect-family entries.
- Added `@effect/language-service@0.87.0`, the root `prepare` patch, the
  TypeScript plugin registration, and a focused compiler project under
  `tools/effect-language-service`. Repeated patch/check runs are idempotent.
- Migrated current APIs at their owners: callable `Schema.Defect()`,
  `SchemaError.issue`, `Schedule.max`, direct yieldable tagged errors,
  `Effect.promise` for asynchronous Bun shutdown, definitive `return yield*`,
  and one flattened calculator pipeline.
- Beta.98's stricter HTTP JSON encoding exposed rich `Money`, `GrossPay`, and
  `BigDecimal` values inside trace representation fields. Rule owners now
  record cents, pay periods, and formatted decimals in trace inputs/results;
  domain facts and report values remain canonical classes.
- Changed files owned by this slice: `package.json`, `bun.lock`,
  `tsconfig.base.json`, `packages/docs-content/package.json`,
  `tools/effect-language-service/*`, the API runtime/smoke files, the docs
  route-boundary source/type/runtime tests, docs-content/docs-fumadocs error
  schemas, the calculator live layer, affected AU rule trace producers, and
  `.changeset/effect-beta-98.md`.
- Changeset: `.changeset/effect-beta-98.md` patches
  `@whattax/calculators`, `@whattax/docs-content`,
  `@whattax/docs-fumadocs`, and `@whattax/rules-au-pay`. The fixed-group rule
  propagates the rules-pay patch across the fixed release train, including the
  touched income-tax and STSL packages. Existing pending Changesets currently
  make the aggregate fixed-train and calculators release minor; docs-content
  and docs-fumadocs remain patch releases.
- Audit pass 1, direct beta migration: no beta.60 dependency, stale
  `Schedule.both`, non-callable `Schema.Defect`, compatibility shim, or runtime
  wrapper remains.
- Audit pass 2, Effect and ownership: calculator flow is one linear pipe;
  typed errors, layers, schemas, app runtime boundaries, and direct route
  restoration remain owned in place. No unsafe cast, DTO mirror, broad catch,
  or helper abstraction was added. The only Effect diagnostic suppression is
  exact and test-local for an intentionally incompatible negative type test.
- Audit pass 3, determinism and tests: install/prepare and repeated language
  service checks are deterministic; the dependency family is consistent; HTTP
  trace encoding, route transport, package tests, workspace type checks, and
  production builds pass.
- Mandatory verification passed: `bun install`,
  `bun run check:effect-language-service`, beta.60 `rg` audit,
  `bun run verification`, `bun run test`, `bun run build`, and
  `bun run changeset status --verbose`.
- Call-graph status: the spec graphs remain accurate. Root catalog resolution
  flows through `bun.lock` to workspace packages; install runs the prepare
  patch; the registered plugin participates in the focused `tsc` project; and
  runtime migrations remain in existing app, route, calculator, and rule
  owners. No diagram update is required.
- Residual risks: Effect is still beta. Web builds pass but Vite/Rolldown emits
  a non-failing warning about an upstream Effect PURE annotation.

### 2026-07-14 - FND-001 parent correction turn 2

- Replaced the drifting GitHub-main TypeScript schema URL with the installed
  local `./node_modules/@effect/language-service/schema.json` path.
- Declared root `effect: catalog:` because the focused compatibility fixture
  imports Effect directly. Registered that exact fixture in the root Knip
  entry/project contract; no dependency suppression was added.
- Kept `prepare` as the only `effect-language-service patch` action. The
  focused check now runs `effect-language-service check` followed by the
  focused `tsc` project, and root `verification` invokes it before lint,
  formatting, Knip, and workspace type checks.
- Added the package-owned `apps/api` `smoke` alias because the first exact
  `bun run --filter=api smoke` attempt reported `No packages matched the
  filter` while only `smoke:public-routes` existed. The exact command then
  passed health, calculator catalog, calculation, OpenAPI, and external
  temporary-consumer checks; the child process and temp workspace were
  cleaned up.
- `bun run --filter=docs test:browser` passed one file and seven tests. Vite
  re-optimized dependencies because the lockfile changed, then the harness
  completed normally.
- Correction-turn verification passed: `bun install`,
  `bun run check:effect-language-service`, `bun run verification`,
  `bun run test`, `bun run build`, `bun run changeset status --verbose`,
  `bun run --filter=api smoke`, and
  `bun run --filter=docs test:browser`.
- Environment caveats: API smoke is local loopback plus a temporary external
  consumer, not deployed-environment evidence. The docs browser command is the
  Vitest client route harness and does not independently prove built-app SSR or
  hydration. Web builds still pass with the upstream Effect PURE-annotation
  warning from Vite/Rolldown.
- Changeset and call-graph status are unchanged. The compatibility graph is
  now `bun install -> prepare patch` and
  `verification -> language-service check -> focused tsc`; runtime migrations
  remain at their existing owners.

### 2026-07-14 - FND-001 parent acceptance

- Parent review accepted the beta.98 API migrations, JSON-native trace
  representations, exact negative type-test diagnostic suppression, local
  language-service schema, explicit root dependency, and patch/check split.
- The parent independently reran `bun run verification`, `bun run test`,
  `bun run build`, `bun run --filter=api smoke`,
  `bun run --filter=docs test:browser`, and
  `bun run changeset status --verbose`; all passed.
- Final audit found no compatibility shim, unsafe cast, DTO mirror, broad
  catch, repeated decoder, runtime relocation, or helper sprawl. Decoder and
  direct route-consumer contracts remain unchanged.
- Accepted residual warning: Vite/Rolldown reports an upstream Effect
  PURE-annotation placement warning, but both web client and server builds
  complete successfully.

### 2026-07-14 - FND-002 correction turn 1 submitted for parent review

- CI now reads `.bun-version`, installs with the frozen lockfile, and invokes
  the canonical root verification, test and build commands. `CLAUDE.md` is a
  relative symlink to `AGENTS.md`.
- Eight TypeScript release packages clean `dist` before `tsc`; all nine
  release-closure manifests declare explicit files and dist-only publication
  exports. Workspace exports may retain source conditions for local tooling.
- Actual Bun 1.3.14 pack output resolves workspace and catalogue dependency
  protocols but does not apply `publishConfig.exports`. The SDK-owned strict
  validator therefore unpacks each raw Bun tarball, materializes that declared
  publication export map with schema-decoded structured manifests, and
  Bun-packs the staged package for final inspection and clean-consumer use.
- Final tarball manifest audit passed with no source conditions, `src` files,
  missing export targets, or unresolved dependency protocols. Artifact counts
  were core 90, income-tax 86, pay 94, STSL 50, calculators 30, SDK 38,
  API HTTP 70, testing 6 and tsconfig 3 files.
- Strict downstream proof passed a clean tarball-only install, valid and
  negative type tests, plain and Effect SDK runtime calculations, every
  JavaScript public entrypoint import, and root/AU/schemas browser bundles.
  Runtime release blockers and dev manifest diagnostics were both empty; the
  scope-managed temp workspace was removed.
- Audit pass 1, CI and agent contract: `.bun-version` is the sole workflow Bun
  version input; local and CI root commands match; workflow failures remain
  visible; and the agent-doc link resolves to the canonical root contract.
- Audit pass 2, publication contract: clean builds, workspace/publication
  export separation, concrete packed dependency ranges, declared files and
  every final tarball target were inspected from actual artifacts rather than
  workspace imports or dry-run output.
- Audit pass 3 identified a parent-review correction: the strict validator was
  Effect-native, but the focused checker still used top-level Bun APIs and
  shell lifecycle commands. Correction turn 2 replaces that runtime without
  moving or duplicating closure validation. The obsolete audit-only command
  and success mode remain removed; strict failure diagnostics remain for real
  future manifest regressions.
- Mandatory verification passed: `bun run verification`, `bun run test`,
  `bun run build`, `bun run --filter=@whattax/sdk check-packed-artifact`,
  `bun run --filter=@whattax/sdk validate:downstream`, the integrated final
  tarball manifest audit, and `bun run changeset status --verbose`.
- Changeset: `.changeset/deterministic-release-artifacts.md` records the
  package-facing build, publication and validation changes. Existing pending
  Changesets aggregate core, API HTTP, calculators, all three rules packages,
  SDK, testing and tsconfig to minor releases; docs-fumadocs remains patch.
- Call-graph status: the final path is
  `workspace clean build -> raw Bun pack -> Schema decode -> publication export
  materialization -> final Bun pack -> manifest/file audit -> clean consumer
  install -> typecheck/runtime/public imports/browser bundle`. Package
  manifests remain owned by their packages and no validator moved to the
  planned scripts package.
- Residual risks: Bun pack semantics can change; internal tarballs use
  consumer-only local overrides until registry publication exists; Effect
  remains beta; and web builds retain the non-failing upstream Effect PURE
  annotation and chunk-size warnings.

### 2026-07-14 - FND-002 parent audit correction turn 2

- Renamed the focused checker to
  `packages/sdk/typescript/scripts/check-packed-artifact.runtime.ts` and
  updated the package command, exact decoder-boundary allowlist, package docs,
  architecture guidance and current task evidence. Completed historical plans
  retain their original filenames as historical evidence.
- Replaced top-level Bun and shell operations with one linear `Effect.gen`
  program run by `BunRuntime.runMain` with `BunServices.layer`. Effect Platform
  FileSystem, Path and ChildProcess own files, paths, command execution and
  lifecycle; Effect Console owns output.
- The packed `package.json` is decoded through a Schema-derived external
  boundary. Command and artifact failures use `PackedArtifactCommandError` and
  `PackedArtifactValidationError`; no raw throw, process mutation, global
  console, top-level await, `Bun.$`, `Bun.file`, `Bun.write`, or shell cleanup
  remains.
- The scoped temp directory intentionally lives under the SDK root so the
  focused packed SDK import can resolve existing workspace-installed
  dependencies. This preserves the old SDK-only proof without copying or
  packing the dependency closure; strict closure ownership remains solely in
  `validate-downstream-consumer.runtime.ts`.
- Audit pass 1, runtime contract: confirmed BunRuntime/BunServices provision,
  Effect Platform command/filesystem/path use, Schema-derived manifest types,
  typed errors, Effect Console and scope-managed cleanup.
- Audit pass 2, linearity and abstraction: the primary operation is one linear
  Effect program. The only extracted operation is the command boundary reused
  for pack, list, extract and smoke; no one-use mapper, lifecycle wrapper,
  manifest helper layer or runtime abstraction was added.
- Audit pass 3, ownership and regression safety: the checker remains focused
  on one SDK tarball and six SDK entrypoints, while the strict validator still
  exclusively builds and validates the nine-package closure. No live reference
  targets the old filename and the scoped workspace is removed on success and
  typed failure.
- Focused evidence: `whattax-sdk-0.0.4.tgz` contained 38 files, all export
  targets resolved, dependency ranges were concrete, source/tests were absent,
  six SDK entrypoint groups imported, and cleanup completed.
- Mandatory verification passed after the rewrite:
  `bun run --filter=@whattax/sdk check-packed-artifact`,
  `bun run --filter=@whattax/sdk validate:downstream`,
  `bun run verification`, `bun run test`, `bun run build`,
  `bun run changeset status --verbose`, JSON parsing and `git diff --check`.
- FND-002 remains ready for parent review rather than complete. FND-003 remains
  pending and untouched.

### 2026-07-14 - FND-002 parent acceptance

- Parent review accepted CI parity, the canonical agent-doc symlink, clean
  builds, package-owned workspace/publication export separation, the staged
  Bun release-artifact graph, and both Effect-native SDK validator runtimes.
- The parent independently reran the focused SDK tarball check, strict
  nine-package downstream validation, `bun run verification`,
  `bun run test`, `bun run build`, and Changeset status; all passed.
- Final audit confirmed actual tarball manifests contain no source condition,
  source file, missing target, `workspace:*`, or `catalog:` dependency; the
  clean consumer imported every JavaScript public entrypoint and bundled the
  browser-safe SDK surface.
- Final implementation contains no audit-only bypass, raw Bun shell runtime,
  manual process lifecycle, unsafe cast, mirrored boundary DTO, or cross-package
  validator relocation.

### 2026-07-14 - FND-003 correction turn 1 ready for parent review

- Split portable contracts into `effect/*`, `bun/*` and `mdx/*`; retained
  decoder placement, direct route restoration and calculator/domain policy
  under `whattax/*`. Removed the superseded switch plugin and reduced the
  WhatTax plugin without weakening either boundary rule.
- Enabled seven repository-wide Effect rules, four semantically scoped Effect
  contract/test rules, two repository-wide Bun rules and one docs-route MDX
  rule. `oxlint.config.ts` owns all exact egress, runtime, process, console, Bun
  and test-only throwing-codec boundaries.
- Migrated the two production throwing codec sites. The docs server-function
  path now decodes unknown input inside one linear Effect and maps failure to
  `DocsSourceError`; OpenAPI normalization now keeps `Schema.SchemaError` in an
  Effect consumed by the package-owned snapshot test.
- Review-only decisions are explicit: semantic ownership of `Schema.Defect()`,
  arbitrary provider-SDK placement and abstraction/helper value cannot be
  inferred reliably from syntax. No broad suppression, line-count rule or
  brittle text search was added.
- Audit pass 1 confirmed current encoder, codec, runtime, host, test-global and
  MDX callsites align with exact config scopes. Portable messages contain no
  WhatTax package or tax policy, while calculator rules remain scoped to their
  existing package owner.
- Audit pass 2 confirmed messages name current canonical Schema, Match, Config,
  Context/Layer and Effect Platform alternatives. The only decoder-list change
  is the exact real-Oxlint process-boundary test; route consumer files and rule
  semantics are unchanged.
- Audit pass 3 confirmed all 12 Effect, 2 Bun and 1 MDX rules have accepted and
  rejected evidence through the installed Oxlint binary. Shared plugin helpers
  represent reusable AST concepts; no visitor-only acceptance path, helper
  layer or duplicate rule framework was added.
- Mandatory verification passed: `bun run test:oxlint` (32 tests, 65
  assertions), `bun run lint:boundary-directives`, `bun run lint`,
  `bun run verification`, `bun run test` (17 Turbo tasks), focused docs type,
  boundary and browser gates, focused API type and OpenAPI gates, Changeset
  status, task JSON parsing and `git diff --check`.
- No Changeset is required. The slice is root tooling, executable fixtures,
  docs and app-internal boundary work. `packages/api/http/src/openapi.ts` is not
  in the package export map and only its internal snapshot test consumes the
  new Effect result; no public package, endpoint or SDK contract changes.
- Call graph matches the spec:
  `oxlint.config.ts -> effect|bun|mdx|whattax plugin -> real CLI fixtures`.
  Codec migrations remain
  `unknown docs input -> Schema decoder -> typed docs service -> route encoder`
  and `generated OpenAPI -> Schema decoder -> normalizer -> snapshot Effect`.
- Residual risks: direct Bun/runtime/console/process aliases are not yet
  scope-resolved like decoder aliases; exact boundary lists need maintenance;
  future Effect betas can add codec names; docs browser evidence remains a
  client harness rather than independent built-app SSR/hydration proof.

### 2026-07-14 - FND-003 parent audit correction turn 2

- Replaced direct-name matching with one shared lexical binding tracker used by
  the Effect and Bun plugins. It follows canonical named and namespace imports,
  renamed bindings, alias chains, statically known members and destructuring,
  handles reassignment without retaining stale provenance, and recognises
  `console`, `process` and `Bun` only when they are unresolved globals.
- Runtime enforcement now follows Effect execution methods,
  `ManagedRuntime.make` and `BunRuntime.runMain`; Schema enforcement follows
  codec methods, `Schema.Unknown`, `Schema.TaggedErrorClass`,
  `Data.TaggedError` and `Effect.Effect` type references through aliases.
  Unallowlisted accepted fixtures prove unrelated same-named locals remain
  valid.
- Service-layer enforcement covers declarations, default/named export
  specifiers and named re-exports. The test-import rule treats unaliased
  `describe`, `expect`, `it` and `test` as one shared API: splitting ownership
  between `@effect/vitest` and `vitest` is invalid, while Vitest-only utilities
  and explicitly aliased secondary shared APIs are valid.
- Audit pass 1 confirmed the current encoder, codec, runtime, console, process,
  Bun, test-import and MDX inventories align with exact scopes. Binding
  provenance is cleared on unrelated reassignment and dynamic computed keys
  are not guessed, preventing stale or speculative reports.
- Audit pass 2 confirmed all messages retain canonical Effect/Schema/Platform
  alternatives, no production boundary list was broadened, and decoder and
  direct route-consumer restoration remain unchanged. Only exact fixture scopes
  were added.
- Audit pass 3 confirmed all 12 Effect, 2 Bun and 1 MDX rules execute accepted
  and rejected evidence through the installed Oxlint binary. Alias,
  destructuring, namespace, layer re-export and same-named-local controls are
  represented. One provenance helper has two real plugin consumers; there is
  no duplicate tracker, one-use wrapper layer, broad suppression or text-based
  enforcement.
- Mandatory verification passed: `bun run test:oxlint` (32 tests, 69
  assertions), `bun run lint:boundary-directives`, `bun run lint`,
  `bun run verification` (22 type/build prerequisites) and `bun run test` (17
  Turbo tasks). Focused docs type, boundary and browser gates and focused API
  type/OpenAPI gates also passed. The first verification attempt found one
  formatter-only issue in `effect-rules.js`; formatting was applied and the
  canonical command then passed.
- Call graph remains
  `oxlint.config.ts -> effect|bun plugin -> binding tracker -> real CLI fixture`
  alongside the unchanged `mdx|whattax` plugin paths. Codec migrations remain
  linear and typed. Dynamic or interprocedural alias flow is review-only;
  exact boundary lists and future Effect codec-family changes still require
  maintenance.
- No Changeset is required. Correction turn 2 changes root tooling, executable
  fixtures and developer documentation only; it does not change a published
  package export, endpoint contract or SDK surface. FND-003 is ready for parent
  review, not complete, and no commit has been created.

### 2026-07-14 - FND-003 parent audit correction turn 3

- Narrowed `bun/no-host-api-outside-adapters` object-pattern reporting to the
  rule-owned `file`, `serve`, `spawn`, `spawnSync` and `write` properties.
  Declaration and assignment patterns still flow through the shared binding
  tracker before reporting, so later accesses retain their provenance.
- Added an unallowlisted real-global fixture proving direct `Bun.version`,
  declaration destructuring and assignment destructuring are accepted. The
  rejected fixture retains declaration destructuring of `file`, `spawn` and
  `write` and adds assignment destructuring of `spawn` through the installed
  Oxlint binary.
- The narrow audit confirmed no configuration scope, allowlist, decoder rule,
  route-consumer rule or other plugin behavior changed. Dynamic keys remain
  review-only; statically selected host and non-host keys are distinguished.
- Mandatory verification passed with `bun run test:oxlint` at 32 tests and 71
  assertions, boundary-directive lint, full lint, canonical verification, full
  tests, Changeset status, task JSON parsing and `git diff --check`.
- No Changeset is required because this is a root lint false-positive fix plus
  executable fixture and developer-documentation evidence. No public package
  contract changed. FND-003 remains ready for parent review, not complete; no
  commit was created and FND-004 remains pending.

### 2026-07-14 - FND-003 parent acceptance

- Accepted all three audit passes after correction turn 3. Independent parent
  review confirmed scope-resolved alias and shadowing behaviour, exact boundary
  ownership, service re-export coverage and real installed-Oxlint evidence.
- Independent `bun run test:oxlint`, `bun run lint`, `git diff --check` and
  `bun run changeset status --verbose` passed. The no-Changeset decision is
  accepted because no published package, endpoint or SDK contract changed.

### 2026-07-14 - FND-004 ready for parent review

- Implemented the private `@whattax/scripts` workspace package with
  schema-backed `ReleaseCheck`, `ReleaseCommandOutcome` and
  `ReleaseReadinessReport` contracts; `ReleaseCommandExecutionError`,
  `ReleaseCheckFailedError` and `ReleaseWorkspacePathError` tagged errors; and
  the `ReleaseCommandRunner` service contract.
- The primary `runReleaseReadiness` program runs nine exact checks with
  `Effect.forEach(..., { concurrency: 1 })`. It owns non-zero exit
  classification and fail-fast policy. The live and deterministic layers only
  execute commands, so tests exercise the production policy rather than a
  duplicate mock implementation.
- The live layer builds beta.98 Effect Platform `ChildProcess` commands and
  requires only `ChildProcessSpawner`. It captures stdout, stderr and exit code
  concurrently, maps platform failures inline to the tagged execution error,
  and records every result in the canonical outcome. The Bun runtime
  entrypoint resolves the workspace root with `Path.fromFileUrl`, composes
  `BunServices.layer` with `Layer.provideMerge`, and owns the only
  `BunRuntime.runMain` call.
- The deterministic test layer uses `HashMap`, `Ref`, `Option`, `Match` and
  `Data.TaggedClass` results. Four tests prove the complete command order,
  exact executable/arguments/cwd, ordered outcomes, non-zero failure policy,
  process execution failure, short-circuit behavior and useful success/failure
  rendering, including typed workspace-path failures.
- Root `bun run release:check` delegates to the package entrypoint. The live
  run passed root verification, tests and builds, docs validation, focused SDK
  artifact proof, strict downstream validation, API smoke, docs browser proof
  and Changeset status in that order. Existing validator implementations and
  ownership did not move.
- Audit pass 1, command ownership and flow: compared each plan entry with its
  current root, SDK, API or docs package script. The package contains only
  command definitions and orchestration; no pack, consumer, API, browser,
  Changeset, build, test or verification logic was copied. One linear Effect
  program owns sequence, non-zero classification and fail-fast behavior.
- Audit pass 2, Effect boundaries and abstractions: confirmed Schema tagged
  classes own checks/outcomes/reports, Data tagged errors own expected
  failures, the Context service is host-neutral, live/test Layers are separate,
  process text decoding is exact-boundary allowlisted, `Path.fromFileUrl` owns
  file-URL restoration, and the runtime is the sole Bun service provider and
  execution boundary. No unsafe cast, `unknown` error/cause, DTO mirror, manual
  env/process lifecycle, raw Bun API, `async`/`await`, `switch`, native mutable
  collection or one-helper-per-command abstraction was added.
- Audit pass 3, tests, rendering and integration: the deterministic layer
  proves all required behavior without spawning a process; report/error
  renderers include check ids, exact commands, cwd, exit and captured output
  where relevant; package ownership and testing docs match the implementation;
  root integration, Knip, Oxlint exact boundaries and the actual nine-step live
  command all pass.
- Mandatory verification passed:
  `bun run --filter=@whattax/scripts test` (1 file, 4 tests),
  `bun run --filter=@whattax/scripts check-types`,
  `bun run --filter=@whattax/scripts build`, `bun run verification` (23 Turbo
  type/build prerequisite tasks), `bun run release:check` (9 ordered checks),
  `bun run changeset status --verbose`, full lint, Knip, formatting and
  `git diff --check`.
- Changeset `.changeset/curvy-flies-rhyme.md` records a patch for the new
  private `@whattax/scripts` package, producing pending version `0.0.1` without
  consuming or altering the fixed release-train Changesets.
- The final call graph matches the spec:
  `root release:check -> package release:check -> BunRuntime entrypoint ->
  BunServices.layer -> Path.fromFileUrl + ReleaseCommandRunnerLive ->
  ChildProcessSpawner -> runReleaseReadiness -> ReleaseCommandRunner ->
  ChildProcess command -> canonical owning commands`.
- Residual risks: Effect process APIs remain unstable while Effect 4 is beta;
  successful command output is retained in memory until the final report;
  exact command definitions require deliberate updates when owners rename
  scripts; API smoke is local rather than deployed evidence; and the docs
  browser gate remains the current client route harness rather than independent
  built-app SSR/hydration proof.

### 2026-07-14 - FND-004 parent correction turn 1

- Removed manual `URL.pathname` workspace derivation. The runtime now obtains
  `Path.Path` from the platform layer and maps `Path.fromFileUrl` failure to
  `ReleaseWorkspacePathError`, with deterministic rendering coverage.
- Removed `BunServices.layer` provision from `ReleaseCommandRunnerLive`. The
  live layer remains expressed against `ChildProcessSpawner`; the Bun runtime
  entrypoint composes it with `BunServices.layer` through
  `Layer.provideMerge`, retaining `Path` and the runner in one provided graph.
- Reconciled current canonical package maps in `AGENTS.md`, root `README.md`,
  `docs/architecture/README.md`, `docs/architecture/package-boundaries.md` and
  `docs/documentation-audit/README.md` so `packages/scripts` is implemented and
  `packages/ui` remains the only planned placeholder. Historical plans/specs
  and the manual repo-status HTML snapshot were intentionally unchanged.
- Correction audit pass 1 confirmed host ownership: only the runtime imports
  Bun services or calls `BunRuntime.runMain`; only the runtime resolves the
  file URL; the live layer imports and requires `ChildProcessSpawner` without
  choosing a host.
- Correction audit pass 2 confirmed current documentation and path accuracy:
  no current canonical source describes `packages/scripts` as planned,
  placeholder or documentation-only; all local Markdown links in the five
  edited canonical Markdown docs resolve; package manifest/source paths and the
  `CLAUDE.md -> AGENTS.md` symlink exist; the manual HTML snapshot has no diff.
- Correction audit pass 3 confirmed Effect and abstraction quality: Schema
  contracts, Data tagged errors, Context service, separate Layers, one linear
  fail-fast program and one runtime boundary remain intact. No unsafe cast,
  unknown error/cause, helper-per-command layer, manual path/process/env code,
  raw Bun API, `async`/`await`, `switch` or mutable collection was added.
- Fresh mandatory verification passed after correction:
  `bun run --filter=@whattax/scripts test` (1 file, 4 tests), package
  check-types and build, `bun run verification` (23 successful Turbo
  prerequisites), the full `bun run release:check` (all 9 ordered live gates),
  Changeset status, task JSON parse, canonical Markdown path audit, stale
  current-reference scan, HTML no-diff check and `git diff --check`.
- Changeset and release impact remain unchanged:
  `.changeset/curvy-flies-rhyme.md` produces the independent private-package
  patch `@whattax/scripts@0.0.1`; no Changeset was consumed and FND-005 was not
  started.

### 2026-07-14 - FND-004 parent acceptance

- Accepted the corrected service and layer graph, runtime-only Bun ownership,
  Effect Path restoration, deterministic substitution tests and canonical
  package-status reconciliation.
- Independent package tests, typecheck, build, task JSON parsing,
  `git diff --check` and Changeset status passed. The implementer's fresh full
  `verification` and nine-command `release:check` evidence is accepted.

### 2026-07-14 - FND-005 ready for parent review

- Added `docs/design-docs/abstraction-admission.md` as the single owner of the
  repository admission ledger. A shared helper, hook, provider, service, layer,
  component family or package now requires an owner, semantic weight, a second
  consumer or real substitution point, a simpler before/after call graph and
  focused proof. The contract rejects speculative reuse and one-use Effect,
  React and package wrappers.
- Applied that contract to Effect service/layer composition, test review and
  the implemented `@whattax/scripts` workflow without adding a code
  abstraction. Strengthened frontend ownership around direct route-root
  restoration, route-high shell and semantic landmarks, smallest-owner stable
  fallbacks, focused readonly leaf props, leaf-local presentation commands and
  route/container-owned remote or domain commands.
- Reconciled root/app/package routing, the documentation audit and the manual
  status snapshot. `packages/scripts` and its nine-gate release command are
  implemented; `packages/ui`, generated inventories, deployment, publication,
  SEO, RPC and broader product work remain explicitly unimplemented.
- Mandatory verification passed independently: `bun run verification` with 23
  Turbo prerequisites; `bun run test` with 6 route-boundary tests, 32 Oxlint
  tests/71 assertions and 18 Turbo tasks; and `bun run build` with 14 tasks.
  The full `bun run release:check` also passed all 9 ordered checks.
- Focused acceptance gates passed independently: the 9-package strict
  downstream tarball/install/type/runtime/public-import/browser proof reported
  no runtime blockers; docs browser passed 7 tests; API smoke passed health,
  catalogue, calculation and OpenAPI routes plus an external consumer;
  Changeset status, docs validation, task JSON, link/path, package-claim,
  symlink, stale-reference, formatting and diff audits passed.
- Audit pass 1 compared final graphs and owners. CI remains `.bun-version ->
  frozen install -> verification/test/build`; packed validation remains clean
  package builds and dist-only manifests -> actual tarballs -> clean consumer;
  lint remains exact config -> portable/WhatTax rules -> real Oxlint fixtures;
  release remains root command -> scripts runtime/runner -> canonical commands;
  frontend remains encoded transport -> direct restore/Result match -> visible
  composition -> focused leaves.
- Audit pass 2 inspected Effect, Schema, errors and abstraction quality. The
  workspace has one beta.98 family, current APIs, schema-backed outcomes,
  tagged expected failures, host-neutral service contracts, separate live/test
  Layers and linear primary Effects. No compatibility shim, unsafe cast, DTO
  mirror, unknown service error, repeated decoder, helper-per-command layer or
  new hook/provider/package sprawl was introduced.
- Audit pass 3 inspected complete evidence and freshness. All 9 packed closure
  packages declare files and dist-only publication exports; compiled release
  packages clean `dist`; current package maps, status claims and links resolve;
  the boundary lint contracts remain enabled; and all local release evidence
  passed both through the orchestrator and through the task's named standalone
  gates.
- No FND-005 Changeset is required because the slice changes developer docs,
  README guidance, task evidence and a manual status snapshot only. Pending
  status remains 3 patch releases and 9 minor releases, with no major. No
  version, changelog application or publication was performed.
- Residual risks are limited to Effect beta/process API drift and its current
  non-failing Rolldown PURE warning; deliberate maintenance of exact lint and
  release-command lists; buffered successful command output; local-only API
  smoke; and browser-harness evidence that does not independently prove built
  SSR/hydration.

### 2026-07-14 - FND-005 parent acceptance

- Accepted the abstraction-admission contract, Effect and React composition
  guidance, package/status reconciliation, manual snapshot and archived plan.
  The final content preserves boundary-only decoding and direct route-root
  restoration while rejecting speculative helper, hook, provider and package
  abstractions.
- Parent review found no production-behaviour change and accepted the
  no-Changeset decision. The canonical final `bun run release:check` passed all
  nine ordered gates on the accepted state before commit.

## Decisions

- Preserve WhatTax's exact decoder allowlist and direct route-consumer restore
  model; the `site` repository is a reference, not a source of weaker policy.
- Implement only actionable portable patterns. Deployment, release PR, SEO,
  RPC, shared UI, URL-state and generated-inventory work stays out of scope.
- Keep package-owned validation in place. `@whattax/scripts` orchestrates the
  release graph but does not absorb validator implementations.

## Open Risks

- Effect and its process APIs remain beta. Future upgrades may require direct
  source migrations, and current web builds retain a non-failing upstream PURE
  annotation warning.
- Exact lint boundary lists, codec names and release command definitions need
  deliberate owner updates. Dynamic or interprocedural aliases and abstraction
  semantic weight remain review-only.
- API smoke remains local rather than deployed evidence. The docs browser gate
  remains a client route harness rather than independent built-app SSR and
  hydration proof.
- Pending Changesets are validated but unconsumed. Versioning, changelog
  application, publication and deployment require explicit approval.

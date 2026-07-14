---
status: active
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
| FND-003 | pending | Portable Effect/Bun/MDX lint contracts. |
| FND-004 | pending | Effect-native release-readiness command. |
| FND-005 | pending | Architecture/process reconciliation and final audit. |

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

## Decisions

- Preserve WhatTax's exact decoder allowlist and direct route-consumer restore
  model; the `site` repository is a reference, not a source of weaker policy.
- Implement only actionable portable patterns. Deployment, release PR, SEO,
  RPC, shared UI, URL-state and generated-inventory work stays out of scope.
- Keep package-owned validation in place. `@whattax/scripts` orchestrates the
  release graph but does not absorb validator implementations.

## Open Risks

- Effect beta.98 may require API migrations beyond dependency metadata.
- Packed publication exports must be tested from actual tarballs to avoid
  workspace-only success.
- New lint rules will remain review-only where an exact AST signal cannot be
  enforced without broad suppressions.

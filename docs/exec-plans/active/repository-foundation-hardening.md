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
| FND-002 | pending | CI, agent docs, clean builds and packed surfaces. |
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

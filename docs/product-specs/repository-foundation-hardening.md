---
status: canonical
last_reviewed: 2026-07-14
source_of_truth: docs
confidence: high
---

# Repository Foundation Hardening

## Overview

Harden WhatTax's repository contract using the proven, portable parts of the
`site` reference implementation while preserving WhatTax's stricter trust
boundaries and package ownership. This work upgrades the workspace to the
latest compatible Effect 4 beta family, makes CI execute the canonical local
quality contract, makes package builds and packed artifacts deterministic,
expands enforceable Effect/Bun/MDX boundaries, and implements one genuinely
cross-cutting Effect-native release-readiness command.

## Problem

The repository has strong architecture guidance, but several foundations can
still drift:

- CI pins a different Bun version and bypasses part of `bun run verification`.
- Effect packages are on beta.60 while the current compatible beta family is
  beta.98, and the Effect language service is not installed.
- `CLAUDE.md` duplicates and has drifted from the canonical `AGENTS.md`.
- most package builds do not clean `dist` first, and most release-train package
  manifests expose workspace-only source conditions without a separate packed
  publication surface.
- portable Effect, Bun and MDX rules are mixed into the `whattax` lint
  namespace or remain review-only.
- `packages/scripts` is still planned, so the complete release gate remains a
  collection of commands rather than one typed, testable orchestration path.
- abstraction admission and frontend composition expectations are not yet a
  single durable review contract.

## Call Graphs

```ts
Quality: current

GitHub Actions
  -> pinned Bun literal
  -> check + knip + check-types + test
  -> partial overlap with local verification

Package consumer: current

workspace import
  -> package exports[source]
  -> src/*.ts

packed downstream validation
  -> packed package manifests
  -> unresolved workspace/catalog protocol blockers
```

```ts
Quality: target

GitHub Actions
  -> Bun version from .bun-version
  -> frozen install
  -> bun run verification
  -> bun run test
  -> bun run build

Release readiness: target

root release:check
  -> @whattax/scripts release-readiness command
  -> Platform Command service
  -> canonical verification, test, build and package-owned release gates
  -> schema-backed command evidence and typed failures

Package consumer: target

workspace import
  -> package exports[source]
  -> src/*.ts

packed consumer
  -> publishConfig exports without source conditions
  -> clean dist-only artifact
  -> concrete dependency ranges
  -> clean install and public-entrypoint smoke
```

```ts
Lint: target

oxlint.config.ts exact scopes and allowlists
  -> effect/* portable Effect rules
  -> bun/* host and Bun runtime rules
  -> mdx/* docs registry rules
  -> whattax/* tax/domain and route-transport rules
  -> real Oxlint CLI fixtures for allowed and rejected cases
```

```ts
Tests: target

memory Command layer
  -> release-readiness program
  -> ordered invocation and typed failure assertions

temporary packed consumer
  -> bun install from tarballs
  -> public export imports
  -> no source-condition or workspace/catalog protocol leakage
```

## Goals

- Upgrade `effect`, compatible `@effect/*` runtime/test adapters and the lockfile
  to `4.0.0-beta.98`, addressing source and test migrations caused by the
  upgrade.
- Install `@effect/language-service@0.87.0`, patch it in `prepare`, register the
  TypeScript plugin, and keep a deterministic compatibility check.
- Make `.bun-version` the CI source of truth and make CI call canonical root
  scripts instead of reproducing a weaker contract.
- Make `AGENTS.md` the only agent-instruction source by symlinking
  `CLAUDE.md` to it.
- Clean compiled output before package builds and define explicit packed
  publication surfaces for release-train packages without weakening workspace
  source imports.
- Make strict packed install and public-entrypoint smoke validation pass; do not
  hide release blockers behind audit-only success.
- Separate portable `effect`, `bun`, and `mdx` rules from WhatTax-specific
  domain and route rules, with exact scopes and real Oxlint binary fixtures.
- Enforce encoder egress, non-throwing schema codecs, typed service errors,
  runtime/host adapter placement, Bun live/runtime placement, consistent test
  globals, and app-owned MDX registries where those contracts are statically
  reliable.
- Implement `@whattax/scripts` with one Effect-native release-readiness command
  that composes existing package-owned commands rather than moving their
  implementation ownership.
- Document an abstraction admission ledger and route-high/leaf-local React
  composition rules without moving decoding away from direct route consumers.

## Non-goals

- Effect RPC or `effect-start` extraction.
- Relocating `packages/api/http` again.
- Cloudflare-specific runtime or deployment workflows before a deployment
  target exists.
- Automated release PRs or npm publication. Versioning and publication still
  require explicit user approval.
- SEO/AEO/OG systems, URL-state abstractions, a shared UI package, generated
  docs inventories, or broad leaf-component data fetching.
- Weakening `whattax/no-decoding-outside-boundaries` or allowing ordinary React
  leaves to decode, fetch, acquire services or run Effect runtimes.

## Ownership And Boundaries

- Root config owns toolchain versions, CI entrypoints, workspace scripts and
  agent-document routing.
- Each package owns its build output, exports, packed manifest and README.
- `packages/sdk/typescript` continues to own strict downstream package graph,
  pack and clean-install validation.
- `tools/oxlint` owns portable lint plugins and executable fixtures;
  `oxlint.config.ts` owns exact scopes and allowlists.
- `packages/scripts` owns cross-cutting command orchestration only. Package
  validators remain with their owning packages.
- `docs/architecture/effect-services.md`,
  `docs/architecture/testing-and-quality.md`,
  `docs/architecture/frontend.md`, and package READMEs own durable rules.

## Proposed Approach

### Effect beta and language service

Treat beta.98 as one compatible family. Do not mix beta versions across
`effect`, `@effect/platform-bun`, `@effect/platform-node`, or `@effect/vitest`.
Run install, type, test and build gates immediately after the bump, then migrate
to current Effect APIs with linear `pipe` or `Effect.gen` programs, typed error
channels and owning schemas. Do not add compatibility wrappers around removed
APIs unless at least two real call sites share semantic policy.

The language service is a developer check, not a runtime dependency. The root
`prepare` script patches TypeScript after install, `tsconfig.base.json`
registers the plugin, and a focused root script proves the patch remains
compatible with the pinned TypeScript and Effect versions.

### CI and package surfaces

CI reads `.bun-version`, installs with the frozen lockfile, then runs
`verification`, `test`, and `build`. Focused browser/API/packed checks remain
release-readiness gates unless a changed surface requires them in CI.

All TypeScript package builds remove `dist` before `tsc`. Release-train package
manifests declare `files`, keep workspace `source` conditions for local
development, and define publication exports containing only built `types` and
`default` paths. Packed validation must inspect the actual tarball manifest and
prove a clean consumer can install and import public entrypoints.

### Lint namespaces

Portable rules must not carry WhatTax package names or tax policy. The
`whattax` namespace retains decoder allowlisting, route transport restoration
and tax-specific service rules. Rules must be AST-based, narrowly scoped and
tested by invoking the real Oxlint binary against accepted and rejected
fixtures. A rule is not added when its static signal cannot distinguish policy
from ordinary valid code without a broad allowlist.

Encoder use follows the same boundary model as decoding: schema encoders may
run only at explicit egress, persistence or transport boundaries. Throwing
schema codecs are forbidden in production. Service contracts must not erase
expected errors to `unknown`, and tagged errors must not carry untyped
`unknown` causes when an owning error schema/type exists. Console, process,
runtime execution and Bun host APIs stay in app/runtime/layer/script adapters.

### Release-readiness command

`@whattax/scripts` provides one command entrypoint and one primary Effect
program. It invokes existing root and package-owned gates through Effect
Platform `Command`, records ordered schema-backed outcomes and fails with typed
command errors. Tests provide a memory layer and assert ordering, arguments,
short-circuit/failure policy and rendering. The command does not reimplement
SDK packing, docs validation, API smoke logic or Changesets.

### Abstractions and React composition

A new shared helper, service, hook, provider or package needs an owner, real
semantic weight, a second consumer or substitution point, a simpler call graph
and focused tests. One-use Effect error mappers, decoders and wrappers remain
inline.

Route roots restore and match transported state once, then compose visible
containers and semantic landmarks. Leaf components receive focused readonly
values and callbacks, own only local interaction state, and do not cross trust
boundaries. Error, empty, loading and footprint-constrained fallbacks remain at
the smallest owning composition boundary.

## Tests And Verification

- Each implementation task runs `bun run verification` and its focused type,
  test, build, lint, pack or smoke gates.
- Every substantial slice records three improvement audit passes covering call
  graph, ownership, Effect control flow, canonical schema/type/error reuse,
  unsafe casts, DTO mirrors and helper sprawl.
- Final acceptance runs `bun run verification`, `bun run test`,
  `bun run build`, the release-readiness command, strict packed downstream
  validation, Changeset status, API smoke and docs browser evidence where the
  final command contract includes them.
- The parent reviews and accepts each delegated task before the next task. A
  task returns to the same subagent for at most three failed correction turns.

## Risks And Tradeoffs

- A large beta jump can expose broad API drift. The upgrade is isolated as the
  first slice so later work targets the final Effect APIs.
- Publication exports can diverge from workspace exports. Tarball inspection
  and clean-consumer imports are therefore acceptance gates, not optional
  release notes.
- Over-broad lint rules create suppression culture. Exact scopes and real CLI
  fixtures are required, and unverifiable rules must remain documented review
  guidance.
- A release command can become a second build system. It may orchestrate only
  canonical commands and must not absorb package-owned implementation logic.

## Versioning And Changelog Impact

The Effect compatibility upgrade, build/publication surface changes, and
release-readiness tooling are package-facing. Add a patch Changeset for the
fixed release train with a user-facing summary covering the updated Effect beta
compatibility and deterministic package artifacts. Do not run
`bun run version-repo` or publish in this rollout.

## Acceptance Criteria

- The workspace uses Effect beta.98 consistently and all upgrade failures are
  resolved without compatibility-helper sprawl.
- Effect language-service patching and compatibility checks pass after a clean
  install.
- CI and local verification use the same Bun and root command contracts.
- `CLAUDE.md` resolves to `AGENTS.md`.
- clean builds, packed manifests, clean install and public export imports pass
  for the release train; no unresolved workspace/catalog protocols remain.
- portable lint namespaces and their real CLI fixtures pass; exact WhatTax
  decoder and route-consumer policies remain enforced.
- `@whattax/scripts` executes the release-readiness graph through Effect
  Platform Command and has deterministic layer-based tests.
- durable docs contain the abstraction-admission and React composition rules,
  and package/status/audit docs accurately describe implemented ownership.
- every task has parent review, three documented improvement passes where
  substantial, a reviewed Changeset decision and recorded verification.

## References

- [Effect services](../architecture/effect-services.md)
- [Testing and quality](../architecture/testing-and-quality.md)
- [Package ownership](../architecture/package-ownership.md)
- [Frontend](../architecture/frontend.md)
- [Versioning and Changesets](../standards/versioning.md)
- [Implementing specs](../exec-plans/implementing-specs.md)

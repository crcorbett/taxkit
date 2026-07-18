---
status: canonical
last_reviewed: 2026-07-14
source_of_truth: root-docs
confidence: high
---

# TaxKit

TaxKit is the public monorepo for the open-source tax engine, API, SDK and
documentation site.

The repo is early, but the main public integration surfaces now exist. The
implemented surface is a standalone Bun API app, a TanStack Start web scaffold
that calls that API, a Fumadocs-backed docs app, an Effect HTTP API package
with health, generated docs, metadata and public calculation endpoints, a
reusable calculator orchestration package, deterministic core engine
primitives, Australian pay, income-tax and STSL rule packages, a private
TypeScript SDK package, private `@taxkit/docs-content` and
`@taxkit/docs-fumadocs` packages, shared testing helpers and shared TypeScript
config, plus private Effect-native repository release orchestration in
`@taxkit/scripts`. The SDK is implemented for local and downstream
validation, but it is not published yet.

## What exists today

- [apps/api](./apps/api/README.md): standalone Bun process that owns API
  startup, listening config and Effect runtime teardown for `/api/*`.
- [apps/docs](./apps/docs/README.md): TanStack Start public documentation app
  that renders MDX through package-owned docs content and reusable Fumadocs
  helpers.
- [apps/web](./apps/web/README.md): TanStack Start app that loads health data
  from `apps/api` through server/client runtime boundaries.
- [packages/api/http](./packages/api/http/README.md): Effect HTTP API contract,
  generated docs, public calculator routes, thin handler adapters, server
  handler exports and browser-safe client exports.
- [packages/calculators](./packages/calculators/README.md): reusable public
  calculator orchestration package for catalog metadata, graph construction,
  calculation dispatch and schema-guided expected error shaping.
- [packages/sdk/typescript](./packages/sdk/typescript/README.md): private
  TypeScript SDK package with plain, safe-result, Effect and AU entrypoints.
- [packages/docs-content](./packages/docs-content/README.md): private
  source-only content package for docs frontmatter, navigation, validation,
  generated source access and the docs content service.
- [packages/docs-fumadocs](./packages/docs-fumadocs/README.md): private
  reusable package for generic Fumadocs configuration, source adapters and
  MDX render primitives.
- [packages/core](./packages/core/README.md): deterministic engine primitives,
  schema-backed facts, rule descriptors, graph validation, trace and ledger
  contracts and calculation engine service.
- `packages/rules/au/*`: implemented Australian pay, annual income-tax and
  STSL rule packages with Effect rule layers, official parameter services,
  calculators and golden tests.
- [packages/testing](./packages/testing/README.md): shared test helpers for
  workspace packages.
- [packages/tsconfig](./packages/tsconfig/README.md): shared TypeScript config
  presets.
- [packages/scripts](./packages/scripts/README.md): private Effect-native
  orchestration package for the complete local release-readiness command.
- [packages/ui](./packages/ui/README.md): documented planned shared UI
  ownership without a package manifest or runtime code yet.

## Planned package families

The architecture docs describe the intended package families for the tax engine:
core primitives and facts, domain models, rule packs, API clients, SDKs, docs
tooling and supporting app shells. Treat those as planned architecture unless a
matching package root and package README say otherwise.

Start with:

- [Architecture overview](./docs/architecture/README.md)
- [Package ownership](./docs/architecture/package-ownership.md)
- [Package boundaries](./docs/architecture/package-boundaries.md)
- [API and SDK architecture](./docs/architecture/api-and-sdk.md)

## Commands

```sh
bun install
bun run --filter=api dev
bun run --filter=web dev
bun run --filter=docs dev
bun run check:repository-paths
bun run verification
bun run release:check
bun run changeset
bun run version-repo
```

`bun run --filter=api dev` serves the API through portless at
`https://api.taxkit.localhost`. `bun run --filter=web dev` injects that
portless URL into `TAXKIT_API_BASE_URL` and `VITE_TAXKIT_API_BASE_URL` before
serving the web app at `https://taxkit.localhost`. `bun run --filter=docs dev`
serves the public docs app at `https://docs.taxkit.localhost`. `bun run
check:repository-paths` rejects machine-local checkout references in tracked
readable text without printing the matched private value. `bun run
verification` is the baseline verification command for documentation, package
wiring and scaffold changes. `bun run release:check` runs the complete ordered
release evidence, including tests, builds, package artifacts, API smoke, docs
browser proof and Changeset status.

Package-facing changes must include a Changeset. Use `bun run changeset` during
implementation to record the user-facing package impact, and use
`bun run version-repo` only when intentionally consuming pending Changesets into
fixed release-train package versions and changelogs.

## Documentation entry points

- [AGENTS.md](./AGENTS.md): short atlas for agents and task routing.
- [CLAUDE.md](./CLAUDE.md): Claude-compatible pointer to the canonical root
  operating rules.
- [CHANGELOG.md](./CHANGELOG.md): root release-train changelog. Package-level
  changelogs live beside each implemented package, and public app/API
  changelogs live beside the owning app.
- Engineering conventions start with [Effect services](./docs/architecture/effect-services.md),
  [Configuration](./docs/architecture/configuration.md), [Package ownership](./docs/architecture/package-ownership.md)
  and [Code patterns](./docs/standards/code-patterns.md).
- [Product specs](./docs/product-specs/index.md): current implementation
  intent and task lists.
- [Exec plans](./docs/exec-plans/README.md): live and completed rollout plans.
- [Design docs](./docs/design-docs/index.md): documentation and design
  conventions.
- [Documentation audit](./docs/documentation-audit/README.md): current docs
  inventory, README coverage, missing docs and migration priorities.
- [References](./docs/references/README.md): external or imported reference
  material.

## Status snapshot

[docs/repo-status-outline.html](./docs/repo-status-outline.html) is a local,
static status snapshot for a quick visual overview. It is useful for review in a
browser, but it is not canonical; refresh it when repo structure or implemented
surfaces materially change.

Open it directly at:

```text
open docs/repo-status-outline.html
```

## Runtime boundary

- `apps/api` is the API runtime owner. It creates one process-lifetime
  `ManagedRuntime`, serves `packages/api/http` through Bun and disposes scoped
  resources on shutdown.
- `apps/docs` is the docs runtime owner. It consumes `@taxkit/docs-content`
  and `@taxkit/docs-fumadocs` rather than owning canonical frontmatter,
  navigation or reusable Fumadocs internals.
- `apps/web/src/lib/runtime.server.ts` and
  `apps/web/src/lib/runtime.client.ts` own the web SSR and browser client
  runtimes. They call the standalone API over HTTP.
- `@taxkit/api-http/client` and `@taxkit/api-http/client/live` are
  browser-safe.
- `@taxkit/api-http/client/server`, `@taxkit/api-http/server` and handler
  exports are server-only and should stay out of `apps/web`.

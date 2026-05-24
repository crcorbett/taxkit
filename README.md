---
status: canonical
last_reviewed: 2026-05-24
source_of_truth: root-docs
confidence: medium
---

# WhatTax

WhatTax is the public monorepo for the open-source tax engine, API, SDK and
documentation site.

The repo is early. The implemented surface is a standalone Bun API app, a
TanStack Start web scaffold that calls that API, an Effect HTTP API package
with health, metadata and public calculation endpoints, a reusable calculator
orchestration package, deterministic core engine primitives, Australian pay,
income-tax and STSL rule packages, shared testing helpers and shared TypeScript
config. The SDK package and docs site are planned but not implemented yet.

## What Exists Today

- [apps/api](./apps/api/README.md): standalone Bun process that owns API
  startup, listening config and Effect runtime teardown for `/api/*`.
- [apps/web](./apps/web/README.md): TanStack Start app that loads health data
  from `apps/api` through server/client runtime boundaries.
- [packages/http-api](./packages/http-api/README.md): Effect HTTP API contract,
  generated docs, public calculator routes, thin handler adapters, server
  handler exports and browser-safe client exports.
- [packages/calculators](./packages/calculators/README.md): reusable public
  calculator orchestration package for catalog metadata, graph construction,
  calculation dispatch and schema-guided expected error shaping.
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
- [packages/scripts](./packages/scripts/README.md) and
  [packages/ui](./packages/ui/README.md): documented planned ownership areas
  without package manifests or runtime code yet.

## Planned Package Families

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
bun run verification
bun run changeset
bun run version-repo
```

`bun run --filter=api dev` serves the API through portless at
`https://api.whattax.localhost`. `bun run --filter=web dev` injects that
portless URL into `WHATTAX_API_BASE_URL` and `VITE_WHATTAX_API_BASE_URL` before
serving the web app at `https://whattax.localhost`. `bun run verification` is
the baseline verification command for documentation, package wiring and
scaffold changes.

Package-facing changes must include a Changeset. Use `bun run changeset` during
implementation to record the user-facing package impact, and use
`bun run version-repo` only when intentionally consuming pending Changesets into
fixed release-train package versions and changelogs.

## Documentation Entry Points

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

## Status Snapshot

[docs/repo-status-outline.html](./docs/repo-status-outline.html) is a local,
static status snapshot for a quick visual overview. It is useful for review in a
browser, but it is not canonical; refresh it when repo structure or implemented
surfaces materially change.

Open it directly at:

```text
file:///Users/cooper/Projects/whattax/docs/repo-status-outline.html
```

## Runtime Boundary

- `apps/api` is the API runtime owner. It creates one process-lifetime
  `ManagedRuntime`, serves `packages/http-api` through Bun and disposes scoped
  resources on shutdown.
- `apps/web/src/lib/runtime.server.ts` and
  `apps/web/src/lib/runtime.client.ts` own the web SSR and browser client
  runtimes. They call the standalone API over HTTP.
- `@whattax/http-api/client` and `@whattax/http-api/client/live` are
  browser-safe.
- `@whattax/http-api/client/server`, `@whattax/http-api/server` and handler
  exports are server-only and should stay out of `apps/web`.

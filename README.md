---
status: canonical
last_reviewed: 2026-05-23
source_of_truth: root-docs
confidence: medium
---

# WhatTax

WhatTax is the public monorepo for the open-source tax engine, API, SDK and
documentation site.

The repo is early. The implemented surface is a TanStack Start web scaffold, an
Effect HTTP API package with a health endpoint and shared TypeScript config.
The tax engine, calculator endpoints, SDK package and docs site are planned but
not implemented yet.

## What Exists Today

- [apps/web](./apps/web/README.md): TanStack Start app that loads the current
  health API through server/client runtime boundaries.
- [packages/http-api](./packages/http-api/README.md): Effect HTTP API contract,
  server handler exports and browser-safe client exports for `GET /api/health`.
- [packages/tsconfig](./packages/tsconfig/README.md): shared TypeScript config
  presets.
- [packages/core](./packages/core/README.md), [packages/scripts](./packages/scripts/README.md)
  and [packages/ui](./packages/ui/README.md): documented planned ownership
  areas without package manifests or runtime code yet.

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
pnpm install
pnpm dev
pnpm check-types
pnpm build
```

`pnpm dev` starts the current web app. `pnpm check-types` and `pnpm build` are
the baseline verification commands for documentation and scaffold changes.

## Documentation Entry Points

- [AGENTS.md](./AGENTS.md): short atlas for agents and task routing.
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

- `apps/web/src/lib/runtime.server.ts` is the only server `ManagedRuntime`.
- `apps/web/src/lib/runtime.client.ts` is the only client `ManagedRuntime`.
- `apps/web/src/lib/server/api-handler.server.ts` is the only app-side import
  of `@whattax/http-api/server`.
- `@whattax/http-api/client` and `@whattax/http-api/client/live` are
  browser-safe.
- `@whattax/http-api/client/server`, `@whattax/http-api/server` and handler
  exports are server-only.

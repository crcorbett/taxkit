---
status: canonical
last_reviewed: 2026-07-18
source_of_truth: docs
confidence: medium
---

# Product specs

Current specs live here. Each spec should be compact, current, and linked to
the architecture docs that own durable boundaries.

Specs:

| Spec | Status | Notes |
| --- | --- | --- |
| [API compatibility harness](./api-compatibility-harness.md) | Implemented | OpenAPI snapshot, route fixtures and live API app smoke coverage are in place. |
| [API HTTP package topology](./api-http-package-topology.md) | Implemented | The implemented HTTP API package now lives at `packages/api/http` as `@taxkit/api-http`. |
| [Boundary-only decoding](./boundary-only-decoding.md) | Implemented | Exact decoder placement enforcement, typed calculator continuations and pre-render docs route decoding are in place. |
| [Documentation structure and development docs](./documentation-structure-and-development-docs.md) | Canonical | Baseline docs structure and local skill routing. |
| [Documentation improvement roadmap](./documentation-improvement-roadmap.md) | Implemented | README coverage, root routing and maintenance conventions are in place. |
| [Downstream consumer validation](./downstream-consumer-validation.md) | Implemented | The nine-package closure passes strict tarball, clean-install, public-import, runtime, type and browser validation. |
| [Docs Fumadocs package separation](./docs-fumadocs-package-separation.md) | Implemented | Generic Fumadocs code, TaxKit docs contracts and app rendering are split. |
| [Docs MDX Fumadocs runtime](./docs-mdx-fumadocs-runtime.md) | Implemented | Docs content package, docs app runtime and validation path exist. |
| [Extract API app](./extract-api-app.md) | Implemented | `apps/api` owns the standalone Bun API runtime. |
| [Extract public calculator service](./extract-public-calculator-service.md) | Implemented | `@taxkit/calculators` owns reusable calculator orchestration. |
| [Public calculation API routes](./public-calculation-api-routes.md) | Implemented | Public metadata, graph and calculate routes exist. |
| [Public MDX developer documentation](./public-mdx-developer-docs.md) | Implemented | Public MDX docs content and navigation are in place. |
| [Repository foundation hardening](./repository-foundation-hardening.md) | Implemented | Effect beta.98, CI, deterministic package artifacts, portable linting, release readiness and durable review contracts are implemented and verified. |
| [Repository portability and production contracts](./repository-portability-and-production-contracts.md) | Draft | Website-agnostic hardening for path hygiene, string contracts, portable Effect linting and the production package/API dependency graph; blocked on the `IsoDate` compatibility and calculators fixed-group decisions. |
| [SDK-backed HTTP API thin wrapper](./sdk-backed-http-api-thin-wrapper.md) | Implemented | HTTP calculate delegates execution through the SDK Effect facade. |
| [SDK public naming and export contract](./sdk-public-naming-and-export-contract.md) | Implemented | Public SDK names and packed export contract are stabilised. |
| [TanStack Start loader transport boundaries](./tanstack-start-loader-transport-boundaries.md) | Implemented | Schema-encoded Effect outcomes survive initial SSR and client navigation before direct route-root restoration. |
| [TaxKit hard cutover](./taxkit-hard-cutover.md) | Implemented | Repository, package, configuration, GitHub and local-checkout identity cutover completed; the private release train is versioned to `1.0.0`. |
| [TypeScript SDK and publishing](./typescript-sdk-and-publishing.md) | Implemented through release prep | SDK implementation and release-prep checks exist; npm publication remains gated. |

Authoring guides:

- [Writing specs](./writing-specs.md)
- [Writing spec task lists](./writing-task-lists.md)

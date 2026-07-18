---
status: implemented
last_reviewed: 2026-07-17
source_of_truth: docs
confidence: high
---

# TaxKit hard cutover

## Overview

Replace the retired repository identity with TaxKit in every mutable surface.
This is a breaking cutover, not a compatibility migration: current source,
packages, docs, URLs, configuration, GitHub identity and local checkout must
use only the TaxKit identity.

## Implementation status

The cutover is implemented. The repository, checkout, package scope, runtime
configuration, local domains, documentation and tooling use the TaxKit
identity. The breaking Changeset has been consumed into the private `1.0.0`
release train. No package has been published and no release tag has been
created.

Validation evidence is recorded in the
[completed execution plan](../exec-plans/completed/taxkit-hard-cutover.md).

## Problem

The repository has a coherent engine, API, SDK and documentation lifecycle,
but its current identity spans package names, TypeScript imports, runtime
configuration, Effect schema/service identifiers, custom lint namespaces,
local URLs, release validation and external repository metadata. Partial
renaming would create misleading public contracts and package-resolution
failures.

## Goals

- Rename the GitHub repository to `crcorbett/taxkit` and set `origin` to its
  canonical URL.
- Rename the local checkout directory to `taxkit`.
- Rename the root package to `taxkit` and every workspace package from the
  retired scope to `@taxkit/*`.
- Update all source imports, package dependency declarations, export checks,
  Effect `Context`/`Schema` identifiers, public symbols, custom lint namespace,
  configuration keys, local domains, test fixtures and generated-artifact
  prefixes to the TaxKit identity.
- Update all maintained documentation, specs, task lists, execution plans,
  changelog and repository metadata so a tracked-file identity audit has no
  retired token left.
- Preserve existing runtime ownership and call graphs; this work changes
  identity, not engine, API, SDK or frontend architecture.

## Non-goals

- Compatibility aliases, re-export shims, redirects in application code or
  dual package publication.
- Rewriting immutable Git history, external package-registry records or
  GitHub's server-side redirect behaviour. They are historical evidence, not
  live project surfaces.
- Publishing packages or choosing the package naming and registry approach.
  Those decisions require a separate explicit release operation.

## Canonical identity

| Surface | Target |
| --- | --- |
| Product and public title | `TaxKit` |
| Repository and local directory | `taxkit` |
| GitHub repository | `crcorbett/taxkit` |
| Root package | `taxkit` |
| Workspace package scope | `@taxkit/*` |
| Effect schema/context identifier prefix | `taxkit/` |
| Custom Oxlint plugin namespace | `taxkit/` |
| Environment prefix | `TAXKIT_` |
| Local app domains | `taxkit.localhost`, `api.taxkit.localhost`, `docs.taxkit.localhost` |
| Task-list schema origin | `https://taxkit.local/schemas/...` |

## Call graphs

```ts
Production: package and runtime identity

TaxKit app or consumer
  -> @taxkit/api-http or @taxkit/sdk
    -> @taxkit/calculators
      -> @taxkit/core and jurisdiction rule packages
```

```ts
Production: API runtime

apps/api Bun process
  -> TaxKitServerLayer
    -> CalculatorApiHandlerLive
      -> @taxkit/sdk/effect calculateRunRequest
        -> @taxkit/calculators PublicCalculatorService
```

```ts
Tests: release closure

release:check
  -> TaxKit workspace verification
  -> packed @taxkit/* artifacts
  -> clean downstream consumer
  -> API smoke and docs browser proof
```

## Ownership and boundaries

- Each owning app or package changes its own package name, imports, README,
  tests and artifact assertions. No central adapter package bridges names.
- `packages/api/http` remains the HTTP transport owner; this is not a package
  topology move.
- Effect services, schemas, tagged errors and branded IDs retain their owning
  package and existing typed contracts. Their externally visible identifier
  strings change atomically with the namespace.
- App configuration retains schema ownership. Apps compose the renamed config
  keys; they do not add fallback reads for retired keys.
- `tools/oxlint` continues to own portable lint policy. The renamed project
  rule file and plugin namespace retain the existing exact boundary allowlist
  and no-decoding policy.

## Proposed approach

1. Establish the TaxKit naming contract and inventory every tracked mutable
   surface. Confirm the target GitHub repository does not already exist and
   record the npm authentication gate.
2. Apply the identity change atomically across source, manifests, lockfile,
   tooling, documentation and test fixtures. Rename public symbols only where
   they expose the product identity; do not alter neutral domain contracts.
3. Regenerate dependency resolution, add a release Changeset for the breaking
   package identity cutover, and prove the release closure from packed
   artifacts rather than workspace aliases.
4. Commit the verified source migration, rename the GitHub repository, update
   the local remote and push `main` to the canonical remote.
5. Rename the local project directory only after all remote work completes,
   then rerun final repository and identity checks from the new path.

## Required implementation rules

- Keep Effects linear and composable. Do not introduce rename wrappers,
  forwarding helpers, duplicate schemas, local DTO mirrors or compatibility
  branches.
- Reuse canonical schema-derived types, services, layers, IDs and tagged
  errors. Rename identifiers in their owning modules only.
- Preserve explicit trust boundaries: decoding remains only at approved
  boundaries, with no new decoder exemptions or inline disables.
- Keep route components as leaf consumers: restore route data at the route
  consumer, match the `Result` once, and pass focused canonical values into
  compositional React children. The rename must not move decoding or transport
  restoration into shared UI helpers.
- Keep private package constraints intact and do not add registry fallback
  configuration or old-name aliases.

## Verification

- `bun install --frozen-lockfile` or the repository's equivalent regenerated
  lockfile validation passes after workspace names change.
- `bun run verification` passes.
- `bun run release:check` passes, including packed-artifact and clean
  downstream-consumer checks using the TaxKit package names.
- API smoke and docs browser proof use the TaxKit local domains and environment
  variables.
- A tracked-tree identity audit reports no retired identity token in source,
  configuration, documentation, tests, task plans, execution plans or package
  metadata.
- `gh repo view crcorbett/taxkit` reports the renamed repository; `origin`
  points at it and `main` is pushed.
- The final `git status -sb` is clean when run from the repository root.

## Risks and decisions

The GitHub repository, origin and local checkout now use the canonical TaxKit
identity. The package release train is versioned to `1.0.0`, remains private
and passes packed downstream validation.

Npm publication requires a separate approach covering the public package
name, registry ownership, authentication, provenance, tagging and publish
verification. Repository versioning does not approve or perform publication.

## Acceptance criteria

- Every mutable tracked surface uses only TaxKit identifiers.
- Every workspace dependency and import resolves through `@taxkit/*`.
- No compatibility alias, old configuration fallback, old URL or old lint
  namespace remains.
- The existing API, SDK, calculator, docs and frontend call graphs remain
  unchanged apart from canonical names.
- Full verification and release readiness pass before GitHub and local-folder
  cutover is accepted.
- The GitHub repository, `origin`, pushed branch and local directory all use
  the TaxKit name.

## References

- [Package ownership](../architecture/package-ownership.md)
- [API and SDK](../architecture/api-and-sdk.md)
- [Deployment](../architecture/deployment.md)
- [Testing and quality](../architecture/testing-and-quality.md)
- [Effect services](../architecture/effect-services.md)
- [Frontend](../architecture/frontend.md)

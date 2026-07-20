---
document_type: product-spec
lifecycle: implemented
authority: supporting
owner: taxkit-product-owner
last_reviewed: 2026-07-20
review_trigger: historical intent, task evidence, or successor correction
successor: null
tombstone: false
---

# Downstream consumer validation

## Overview

TaxKit has a strict SDK-owned downstream release gate that proves actual
package tarballs from outside the monorepo. The gate builds and packs the nine
packages in the release closure, audits their final manifests and file lists,
installs the unpublished tarballs into a clean temporary consumer, typechecks
SDK examples, runs the SDK, imports every JavaScript public entrypoint and
bundles the browser-safe SDK surface.

This work does not publish packages or remove `private: true`. Package-name
availability and registry publication remain later release-preparation work.

## Call graphs

```ts
Focused SDK artifact

bun run --filter=@taxkit/sdk check-packed-artifact
  -> bun pm pack @taxkit/sdk
  -> extract the actual tarball
  -> Schema-decode package/package.json
  -> require concrete dependency ranges
  -> require dist-only exports and packed files
  -> import root, Effect, AU, AU Effect, schemas and testing entrypoints
  -> remove the temporary artifact tree
```

```ts
Strict release closure

bun run --filter=@taxkit/sdk validate:downstream
  -> build core, income-tax, pay, STSL, calculators, SDK, API HTTP and testing
  -> bun pm pack each package from its workspace manifest
     -> Bun resolves workspace:* and catalog: to concrete versions
  -> extract each raw tarball
  -> Schema-decode the manifest and structured package JSON
  -> materialize publishConfig.exports as the staged top-level exports
  -> bun pm pack the staged publication view
  -> inspect final manifest and tar file list
     -> no source export conditions
     -> no source files
     -> every types/default target exists
     -> no workspace:* or catalog: dependency range
  -> create a temporary consumer outside the repository
  -> depend on all nine tarballs
     -> consumer-only file overrides resolve unpublished internal packages
  -> bun install
  -> TypeScript typecheck with a negative misuse assertion
  -> run plain and Effect SDK calculations
  -> import every JavaScript public entrypoint in the nine manifests
  -> browser-bundle root, AU and schemas SDK entrypoints
  -> print artifact counts and command evidence
  -> remove the temporary workspace through Effect scope finalization
```

The release closure is:

- `@taxkit/core`
- `@taxkit/rules-au-income-tax`
- `@taxkit/rules-au-pay`
- `@taxkit/rules-au-stsl`
- `@taxkit/calculators`
- `@taxkit/sdk`
- `@taxkit/api-http`
- `@taxkit/testing`
- `@taxkit/tsconfig`

## Publication surface

Compiled package builds remove `dist` before `tsc`. Workspace manifests may
retain `source` export conditions for local development. Their `files` fields
limit artifacts, while `publishConfig.exports` owns the dist-only publication
view.

Bun 1.3.14 resolves workspace and catalogue dependency protocols during
`bun pm pack`, but it does not replace top-level exports with
`publishConfig.exports`. The strict validator therefore stages the actual Bun
tarball, materializes the declared publication export map with structured
manifest APIs, and Bun-packs that staged package again. The final tarball, not
the workspace directory or a dry-run file list, is the validation subject.

Internal dependency ranges in final manifests remain concrete package versions.
Because those versions are intentionally unpublished, the generated consumer
uses file overrides pointing at the matching local tarballs. Overrides are
consumer-only installation wiring and do not alter the registry-ready packed
manifests.

## Ownership

`packages/sdk/typescript` owns both packed checks because it already owns SDK
consumer examples, browser-safety checks and publication compatibility. The
validator may orchestrate package builds and tarball creation, but package
manifests and exports remain owned by their packages. It must not duplicate API,
rule or calculator implementation logic.

The strict command has no audit-only success mode. Manifest regressions print
the exact package, dependency section, dependency name and protocol, then fail.
Artifact-shape failures likewise name missing targets or leaked source files.

`apps/api` separately owns live HTTP public-route smoke. That process proof is
complementary and does not replace package installation evidence.

## Verification

```bash
bun run --filter=@taxkit/sdk check-packed-artifact
bun run --filter=@taxkit/sdk validate:downstream
bun run --filter=@taxkit/sdk check-boundaries
bun run --filter=@taxkit/sdk test-types
bun run --filter=@taxkit/sdk test
bun run verification
bun run test
bun run build
bun run changeset status --verbose
```

The strict downstream command must exit zero before release readiness can be
claimed. Supporting package tests or copied-directory imports never replace it.

## Non-goals

- npm publication or package-name claims
- removing `private: true`
- applying Changeset versions with `bun run version-repo`
- moving package or app ownership
- making the SDK depend on `@taxkit/api-http`
- live network calls other than package installation from the configured npm
  registry for external dependencies

## Risks

- Bun packaging semantics can change, so the final tarball manifest and file
  list remain executable evidence rather than an assumption.
- Publication and workspace exports intentionally differ. Every new public
  subpath must be added to both views and proved from the tarball.
- The consumer uses local overrides only because internal versions are not yet
  published. A later publication slice must validate installation through the
  registry or a release registry using the same concrete manifest graph.

## References

- [Repository foundation hardening](./repository-foundation-hardening.md)
- [TypeScript SDK and publishing](./typescript-sdk-and-publishing.md)
- [SDK public naming and export contract](./sdk-public-naming-and-export-contract.md)
- [API and SDK architecture](../architecture/api-and-sdk.md)
- [Testing and quality](../architecture/testing-and-quality.md)

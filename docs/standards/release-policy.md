# Release policy

TaxKit uses Changesets to manage package versions and package changelogs.
Public apps can also maintain curated app-level changelogs for public
contracts, deployments and operational changes that are meaningful outside npm
package installation. The root `CHANGELOG.md` is the curated release-train
changelog for humans reading the repository as one product.

## Release Train Policy

`taxkit` owns the installable TaxKit distribution and its public version.
Its archive contains the compiled engine, calculators, Australian rules and
HTTP contracts behind explicit SDK entry points. Internal workspace packages
remain private source owners; they are not separate publication requirements.

Add a Changeset for `taxkit` when any included module changes the public
API, calculation behaviour or distributed files. Use the highest required bump
for the combined public contract. Internal-only tools and app changes retain
their own ownership and do not force an SDK release.

Apps are not part of the package release train and do not have independently
managed npm package versions. Public apps can still maintain app-level
changelogs. `apps/api/CHANGELOG.md` tracks public HTTP API contract and
deployment-facing changes.

## Changeset Config

The repository config lives in `.changeset/config.json`.

Important settings:

- `fixed: []`: the SDK is the single public version owner; internal workspace
  packages are not a fixed public release group.
- `privatePackages.version: true`: package versions are managed even while
  packages remain `private: true`.
- `privatePackages.tag: true`: release tags can still be created for private
  package versions.
- `access: "public"`: the SDK's npm publication is public. Every other
  workspace package retains `private: true`.
- `bumpVersionsWithWorkspaceProtocolOnly: true`: internal dependency ranges are
  only rewritten where workspace protocol is used.

## Rules

- A change to the SDK's public API, calculation behaviour, distributed files or
  install guidance needs a `taxkit` Changeset, at the highest semver bump the
  combined public contract requires.
- A public HTTP API contract or deployment-facing change needs an `api`
  Changeset and an `apps/api/CHANGELOG.md` entry. A Website change worth a
  changelog entry names `web`.
- Internal tooling, tests, CI, maintainer documentation and other changes that
  do not reach the SDK archive or a public app contract need no Changeset.
- Changeset summaries describe the public effect, not only the mechanics.
- Versions change only through `bun run version-packages`, in a release
  preparation change, never by hand during normal work.
- Only `taxkit` is published to npm. Every other workspace package stays
  `private: true`; Changesets still manages its internal version.
- Publishing needs the maintainer's explicit request; a green release check or
  available credentials do not.

The [release runbook](../runbooks/release.md) holds the commands and the
release procedure.

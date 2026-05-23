# Versioning And Changesets

WhatTax uses Changesets to manage package versions and changelogs.

## Release Train Policy

All `@whattax/*` packages are in one fixed version group:

- `@whattax/core`
- `@whattax/http-api`
- `@whattax/rules-au-income-tax`
- `@whattax/rules-au-pay`
- `@whattax/rules-au-stsl`
- `@whattax/tsconfig`

When any package in this group is released, every package in the group receives
the same version. This follows the Effect-style release train model: packages
are tested, documented, and consumed as one compatible set.

The web app is not part of the release train. It is an internal docs/app
workspace and does not have an independently managed package version.

## Changeset Config

The repository config lives in `.changeset/config.json`.

Important settings:

- `fixed`: keeps all `@whattax/*` packages on the same version.
- `privatePackages.version: true`: package versions are managed even while
  packages remain `private: true`.
- `privatePackages.tag: true`: release tags can still be created for private
  package versions.
- `access: "public"`: future npm publication for scoped packages should be
  public by default once package `private` flags are removed.
- `bumpVersionsWithWorkspaceProtocolOnly: true`: internal dependency ranges are
  only rewritten where workspace protocol is used.

## Commands

Create a changeset for package-facing work:

```sh
bun run changeset
```

Apply pending changesets to package versions and changelogs:

```sh
bun run version-packages
```

Inspect pending releases without modifying files:

```sh
bun run changeset status --verbose
```

## Rules

- Every package-facing API, behavior, or tooling change needs a changeset.
- Use the highest required semver bump across the release train.
- Keep changeset summaries user-facing; describe the public effect of the
  change, not the implementation mechanics only.
- Do not manually edit package versions during normal work. Let
  `bun run version-packages` consume changesets and update versions together.
- Keep package `private: true` until the package is ready for npm publication.
  Changesets still manages versions while packages are private.

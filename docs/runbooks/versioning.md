---
document_type: runbook
lifecycle: current
authority: canonical
owner: repository-maintainers
last_reviewed: 2026-10-13
review_trigger: Changesets configuration, package graph or release train change
---

# Versioning

TaxKit uses [Changesets](https://github.com/changesets/changesets). The fixed
group in `.changeset/config.json` versions the public packages together; see
the [versioning standard](../standards/versioning.md) for semver rules.

1. Add a Changeset with `bun run changeset` in the same change as any public
   package contract change. Private apps and tools do not need one.
2. Check the pending release with `bun run changeset:status`.
3. When preparing a release, run `bun run version-packages`, review the
   manifest and changelog diff, then run `bun run release:check`.
4. Commit the version change through an ordinary pull request.

Publishing to npm is a separate operation and needs the maintainer's explicit
request. Roll back an unpublished version change by reverting its commit.

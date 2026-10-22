---
document_type: runbook
lifecycle: current
authority: canonical
owner: repository-maintainers
last_reviewed: 2026-10-20
review_trigger: Changesets configuration, package graph, release train or release evidence change
---

# Versioning

TaxKit uses [Changesets](https://github.com/changesets/changesets). `@taxkit/sdk`
owns the single installable package; the other workspace packages remain
private implementation owners. See
the [versioning standard](../standards/versioning.md) for semver rules.

1. Add a Changeset with `bun run changeset` in the same change as any public
   package contract change. For changes to modules included in the SDK archive,
   name `@taxkit/sdk` in the Changeset. Private apps and internal tools do not
   need one.
2. Check the pending release with `bun run changeset:status`.
3. When preparing a release, run `bun run version-packages`, review the
   manifest and changelog diff, then run `bun run release:check`.
4. Commit the version change through an ordinary pull request.

Publishing to npm is a separate operation and needs the maintainer's explicit
request. Roll back an unpublished version change by reverting its commit.

## Release evidence

The release record is the merged pull request and its checks. The pull request
body states what changed, the checks that ran, Preview readback and anything
not checked; the Changesets and generated `CHANGELOG.md` entries carry the
package-facing notes; the Checks run on the merge commit records the Production
deploy and its public checks. Do not add a dated release-record file under
`docs/` or merge a follow-up `[skip ci]` commit to record a release; add any
later readback as a pull request comment. `[skip ci]` is reserved for
documentation-only commits; see
[GitHub Actions](./deployment.md#github-actions). Existing dated evidence files
stay as history.

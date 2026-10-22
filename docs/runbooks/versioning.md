---
document_type: runbook
lifecycle: current
authority: canonical
owner: repository-maintainers
last_reviewed: 2026-10-20
review_trigger: Changesets configuration, package graph, release train or release evidence change
---

# Versioning

TaxKit uses [Changesets](https://github.com/changesets/changesets). `taxkit`
owns the single installable package; the other workspace packages remain
private implementation owners. See
the [versioning standard](../standards/versioning.md) for semver rules.

1. Add a Changeset with `bun run changeset` in the same change as any public
   package contract change. For changes to modules included in the SDK archive,
   name `taxkit` in the Changeset. Private apps and internal tools do not
   need one.
2. Check the pending release with `bun run changeset:status`.
3. When preparing a release, run `bun run version-packages`, review the
   manifest and changelog diff, then run `bun run release:check`.
4. Commit the version change through an ordinary pull request.

Publishing to npm is a separate operation and needs the maintainer's explicit
request. Roll back an unpublished version change by reverting its commit.

## Local SDK publication

Only `taxkit` is configured for public npm publication. Keep the root,
apps and all other workspace packages private. Never publish all workspaces.

1. Verify the npm account with `npm whoami`, using
   `https://registry.npmjs.org`. For an existing `taxkit` package, check its
   maintainers with `npm owner ls taxkit`; organisation membership does not
   establish ownership of an unscoped package. Before a first publication,
   a registry 404 is only a preflight result: the successful publication and
   owner readback establish the claim. Check whether the exact SDK version
   already exists before attempting publication.
2. Apply the queued Changeset, update the root changelog and keep only the SDK
   publishable. Run `bun install --frozen-lockfile` with the repository's pinned
   Bun after updating the lockfile, then `bun run release:check` locally.
3. Merge the checked release preparation through a normal pull request. For an
   explicitly authorised local-only release, use `[skip ci]` in the source and
   merge commit messages, and verify no Actions run started. Do not change
   workflow settings or bypass branch protection.
4. Start from the clean merged source. Reuse local verification only if its
   source tree and dependencies match. From the SDK folder, run
   `bun pm pack --destination /absolute/release-directory` to create the archive.
   Bun resolves catalogue dependency versions in its packed manifest; npm
   publication from the workspace directory does not perform that build step.
5. Inspect the archive: the SDK name/version, only Effect as a runtime
   dependency with a concrete version, compiled public exports, MIT licence,
   README and package links. Run `npm publish ./taxkit-<version>.tgz
   --dry-run --access public --registry=https://registry.npmjs.org --ignore-scripts
   --provenance=false` from the external release directory. A dry run does not
   prove registry write access.
6. Publish that exact archive by repeating the command without `--dry-run`.
   Complete npm's existing two-factor approval in its secure prompt or browser;
   do not copy tokens or one-time codes into chat, and do not weaken security.
   Local publication does not generate CI provenance.
7. Read back the public version, `latest` tag, owner and archive integrity. Use
   an unauthenticated registry read and a fresh external install to check every
   public path, calculation, declarations and browser build. Record the source
   commit, archive integrity, registry result and CI status in the release PR.
   Tag only the SDK version after successful readback, then remove the working
   branch and keep the project clean on `main`. The public version tag is
   `taxkit@<version>`; leave the previous `@taxkit/sdk` publication and tags
   intact.

A published name/version cannot be overwritten. If publication fails, read the
registry before retrying; a failed local response may still have published it.
Stop on a mismatched readback rather than unpublishing, changing visibility or
moving a tag silently. An unpublished preparation change can be reverted;
correcting a published package normally requires a new version.

## Release evidence

The release record is the merged pull request and its checks. The pull request
body states what changed, the checks that ran, Preview readback and anything
not checked; the Changesets and generated `CHANGELOG.md` entries carry the
package-facing notes; the Checks run on the merge commit records the Production
deploy and its public checks. Do not add a dated release-record file under
`docs/` or merge a follow-up `[skip ci]` commit to record a release; add any
later readback in the existing pull request. `[skip ci]` is normally reserved
for documentation-only commits, with the explicitly authorised local SDK
publication procedure above as an exception; see
[GitHub Actions](./deployment.md#github-actions). Existing dated evidence files
stay as history.

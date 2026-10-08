# Development and release tracking

## During implementation

Read the accepted task and issue before starting. Use the repository's branch
rules and include the current Linear identifier in a branch, PR or description
when its conventions support it. Keep the issue's approach, constraints,
decisions and actionable follow-ups current as the code changes.

Link the actual repository, commits, pull request and useful check results.
Cross-link related issues explicitly with the native Related to operation.
For a newly discovered bug, describe a concrete trigger, expected behaviour,
actual behaviour and the check that will show it is fixed. Use a child when
it belongs to the stage; use Related to for shared context without dependency.

Issue sync, PR linking and status automation are separate GitHub features.
Check the project's actual settings before relying on an automatic transition.
Use a non-closing reference such as `Refs DEV-123` when merging does not finish
acceptance. Closing words and configured PR automation can move an issue to
Done while a deployment or release is still pending. Read back the status and
correct it to match the accepted outcome if that happens.

## Read the repository's release record first

Identify the existing changelog owner before writing release notes: inspect
the release runbook, Changesets configuration, package paths and version command.
Use that process and its existing `CHANGELOG.md` files. For a generated
changelog, write the source Changeset and let the version step create the entry;
review the generated entry in the version PR. For a maintained changelog, follow
its existing unreleased/version convention. Preserve old entries and do not
create a second changelog or manually stamp a proposed version as published.

Keep the two audiences connected through evidence:

| Record                                | Reader and content                                                                                                                        |
| ------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------- |
| Changeset and repository changelog    | Maintainers: the concrete change, affected package, relevant implementation, compatibility or migration details, and issue/PR links.      |
| Linear issue description and activity | People doing the work: the chosen approach, useful checks, blockers, review and remaining acceptance, with links to engineering evidence. |
| Native Linear project update          | People following the product: what changed for users, why it matters, availability, limits and any action they need to take.              |

These are different views of the same change. Keep the feature, version and
delivery facts consistent; technical wording must not become an invented
speed claim, new capability or claim that a website is already updated.

## Changesets and generated changelogs

A Changeset is the repository's short release note and version-bump request;
it is not an issue, a project update or proof of publication. Inspect the
repository's Changesets configuration and release runbook. If it uses
Changesets, add one for a delivered package/plugin change according to those
rules. Lead with the concrete change and include engineering detail that helps
maintainers assess it, including compatibility or migration when affected.
Link the current issue and the Changeset's committed file from the issue or PR.
Do not add
Changesets to a repository that uses a different release process.

For Commonplace Plugins, edit the canonical skill under
`plugins/development-workflows/skills` or `plugins/foundations/skills`, update
the source review date and fingerprints, add the package's Changeset, and run
the repository's required test and verification commands. Use
`docs/runbooks/release.md` as the current command owner; this reference does not
replace it. The two plugins are private and are not published to npm.

At version review, compare the generated changelog entry with the included
Changesets, merged changes and accepted issue scope. Check the package, version,
PR/issue links and any migration instructions. Only the new version entry should
describe this delivery; retain earlier release history. Report unsupported or
missing notes as a correction before publication. After release, link the
changelog at the verified release commit and its actual version heading when
available. Read the file to check the heading; do not guess a fragment or link
only to a changing branch.

## Turn a release into a Linear product update

1. Read the exact changelog entry, release evidence, affected issues and latest
   native project updates. Identify the published package/version or shared
   release group. For a multi-package release, keep all relevant versions.
2. Select only changes that belong to this project. Group entries by the user
   result so a multi-commit fix or shared release becomes one useful update.
   Include maintenance honestly; do not invent a user benefit for an internal
   change. Keep package and migration detail in the linked engineering record.
3. Lead with the concrete product result. Explain who it affects, what is now
   possible or fixed, and the reason it matters. State any required upgrade,
   migration or remaining limitation. Use plain language and supported claims.
4. State the delivery level actually checked. A version PR's changelog is
   proposed. A merged implementation is merged. A published package can be
   obtained at that version. A website or feature is available only after its
   required deployment and behaviour checks. If publication or rollout is still
   pending, post a progress update and say what remains rather than announcing
   availability. Keep the corresponding delivery issue open.
5. Link the affected Linear issues, the exact engineering changelog/version
   and the release. Keep commits, PRs and detailed check output in the delivery
   issue, with a short link from the product update. Use a compact update:
   what changed; availability or required action; limits or next work; links.
6. Before writing, search existing updates for this project and the same
   version/release group. Reuse an accurate saved update. Edit it by its live ID
   when a meaningful correction is needed; do not add a new post for every
   Changeset, changelog bullet, commit or unknown write result. Post a later
   rollout milestone only when availability changes, and link the release
   update it follows. Read back the saved update, its links and version.

For example, an engineering entry might describe checking the saved-copy key
in a shared-link resolver. Its product update can say that shared links now
reopen the copy a person saved, if that behaviour and its availability were
checked. Keep decoder names and test logs behind the engineering link; include
an upgrade instruction if people must install the new version first.

## Track each delivery fact

Record only the facts proven for this task:

| Evidence                            | What it proves                                                             |
| ----------------------------------- | -------------------------------------------------------------------------- |
| Local test/check output             | The checked behaviour in that checkout.                                    |
| CI result for a commit              | The pipeline passed for that revision.                                     |
| Merged PR/commit                    | The source change reached its target branch.                               |
| Version Packages PR and changelog   | A proposed version and engineering release notes; review is still needed.  |
| Published tag and GitHub release    | The identified version was released. Verify the tag's commit.              |
| Changelog at the release commit     | The engineering notes recorded for that exact package/version.             |
| Stable/client branch readback       | Clients following that branch can fetch that complete release.             |
| Live deployment and behaviour check | The checked change runs and behaves as expected at the identified address. |

Keep a parent whose acceptance includes publication open until that outcome is
verified. An implementation-only child may be Done once its own acceptance
passes; link the existing release child rather than creating another one.
Choose the remaining issue's status from the actual next action, such as
In Review for a concrete version PR review or In Progress for active release
work. An ordinary pending step alone does not make project health Off track.

Commonplace's normal flow is: the implementation change and Changeset reach
`main`; Actions opens a Version Packages PR; the reviewed version PR merges;
Actions creates a private plugin tag/release and advances `stable` when that
version belongs to the exact release commit. Verify `main`, `stable`, the new
tag, release and packaged manifests. An unrelated `main` update need not move
`stable`. Do not rewrite a published tag to repair a release; use a new patch.

Post the final engineering evidence on the delivery issue and the product
summary as a native project update using the process above. Link both to the
exact released changelog. Reconcile required children, links and blockers before marking the
delivery issue Done. A growing repository project can stay In Progress after
this particular feature is finished. If refreshing an installed client, state
which client was refreshed; an already-open chat may still have the old skill.

---
name: linear
description: Manage Linear projects and issues, or keep tracked repository work current through implementation, review, Changesets, changelogs and releases. Use for issue details, labels, status, native dependencies and related issues, progress comments and product-focused project updates linked to engineering release notes.
---

# Linear

Keep Linear's delivery record aligned with the actual work and its evidence.
Repository decisions and accepted tasks own implementation scope; Linear records
their progress, dependencies and outcome. Use plain Australian English.
Linear project updates explain the product change for people using it. The
repository changelog owns the engineering release record. Connect both through
the exact version and source links so their wording can serve different readers
without making different claims.

## Find the right workspace and project

1. Confirm the connected workspace before choosing any project or issue. A
   signed-in tool can point at a different account from the browser.
2. For Cooper's **Personal** workspace, read
   [the workspace profile](references/personal-workspace.md). It records the
   existing projects, labels and shared-team choice. Refresh the relevant live
   records before writing; the dated profile is a starting point, not live state.
3. Match the repository's verified remote to the project's repository link.
   Similar names are not a match. Reuse the existing project and team. If a
   project is missing, create it when the request includes setting up tracking;
   otherwise ask only for the missing project choice and continue independent
   work. Do not create teams or change the plan or sync settings as a workaround.
4. Read the target issue with its relations, relevant comments, the project's
   latest update, and its team's statuses and labels. Follow list pagination.
   Exclude archived or retired entries even when a list call returns them.

Use the connected Linear tools first. When using Executor, choose the matching
account, read its `execute` guide, then discover and describe the Linear tools.
Read [tool operations](references/tool-operations.md) for operation names,
input details, account routing and write verification. Do not guess tool paths.

## Create or reconcile the delivery issues

Search the chosen project before creating an issue. Match the task or stage,
accepted scope and existing identifiers, rather than its title alone. For an
S00–Sxx plan, keep one main issue for each accepted stage. Create child issues
for separately actionable implementation problems, checks or release work;
one issue per file or command makes the board harder to use.

An issue description should state the problem, intended result, acceptance
checks, relevant decisions, dependencies and links to the owning task or SPEC.
Add implementation details that change the next person's decisions: affected
parts, chosen approach, discovered constraints and remaining work. Link code
and evidence instead of copying large files or logs. Keep credentials out.

Update the existing issue by its current stable identity. Read back moved issues
to obtain their current identifier; old team prefixes can remain redirects.
Preserve unrelated description text, labels, parents, links and relationships.
Prefer targeted description patches and label add/remove operations. When a
tool replaces a collection, merge the existing values with the requested change.

## Choose status, labels and relations separately

- **Status:** use the team's current workflow. Queued work stays queued; active
  implementation is in progress; a concrete outstanding review can be in review.
  Record who or what needs to review it. Mark Done only when the accepted outcome
  and its required checks or release are proven. A failing check being fixed is
  still active work. Do not claim cancellation or duplication as completion.
- **Labels:** reuse a few labels that describe the work or interface. Preserve
  existing labels. Project identity already identifies the repo. Read the
  Personal profile for the available work labels and their meaning.
- **Blocked by / Blocks:** if A cannot proceed until B is resolved, A is
  **Blocked by B** and B **Blocks A**. Use native issue relations, not `blocked`
  or `blocking` labels. Keep the workflow status honest about current work.
  For a separate actionable missing approval or setup, reuse or create a
  prerequisite issue within the authorised scope and describe what resolves it.
- **Related to:** explicitly link issues that share a problem, decision or
  implementation context but have no prerequisite order. A description link
  alone is not proof that the native relation was saved. Parent/child already
  shows decomposition; add another relation only when it expresses a separate
  connection or the user asks for it. Parent membership does not prove a blocker.

Read back relations after each change and check their direction. Remove only the
blocker that was resolved, keeping other prerequisites and useful context.
Linear can move a resolved blocking relation under Related; inspect the live
result before adding or removing another relation. Do not invent a dependency
between successive stages when the accepted plan does not require it.

## Keep activity current while working

Treat tracking as part of the implementation task when the user or project has
requested it. Normal issue, comment and project updates within that scope are
authorised; a request limited to a report or draft remains read-only. A skill
does not authorise account reconfiguration, unrelated issues or outreach.

Post an issue comment when the approach changes, a useful slice is finished,
a blocker appears or clears, a review is ready, or delivery completes. State
what changed, what was checked, what is still unknown and the next action.
Do not post a comment for every command. Check recent comments before retrying
a timed-out write so the same update or follow-up issue is not created twice.

For a milestone or material change in the project's outlook, publish a native
project update with progress since the previous update, important blockers,
next steps and links to the affected issues and code. Lead with what people can
do, what became easier or what problem was fixed; explain availability and any
action they need to take. Keep implementation detail and check logs in linked
issue activity and repository records. Use **On track** when the
accepted work remains achievable, **At risk** when a threat needs action, and
**Off track** when the accepted plan is already missed or cannot proceed as
planned. Do not invent dates or choose health from the count of Done issues.
Project status, update health and issue status are different fields. Finishing
one stage does not finish the whole project. Editing a project description or
posting an issue comment does not publish a native project update.

## Connect code changes and releases

Read [development and release tracking](references/development-and-release.md)
when work involves commits, pull requests, Changesets, changelogs or publication.
Read the repository's generated or maintained changelog before drafting a
release update. Review the exact version entry against its changes and turn it
into a product summary with an immutable engineering link. Group the project's
released changes into one update per version or shared release; search existing
updates by version and release before posting so retries do not duplicate it.
Record implementation, review, CI, deployment and release evidence separately. If
publication is part of acceptance, keep the delivery issue open until the
release is verified, even when the implementation PR has merged.

Before finishing, reconcile the accepted main and child issues, native related
links and remaining blockers. Read back changed fields and saved comments or
updates. Return the useful issue/project links and any work still outstanding.

## Sources

Reviewed on 3 October 2026 against the connected Personal workspace and current
Linear tool schemas. Product behaviour is documented in
[issue relations](https://linear.app/docs/issue-relations),
[issue status](https://linear.app/docs/configuring-workflows),
[project updates](https://linear.app/docs/initiative-and-project-updates) and
[GitHub integration](https://linear.app/docs/github).

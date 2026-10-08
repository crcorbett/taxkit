# Tool operations

These operation names and fields were checked on 3 October 2026. The host can
prefix tool names differently. Read its current schema rather than copying an
unverified prefix, account path or argument shape.

## Connect and read

Prefer the signed-in Linear connector when available. Call `get_workspace`
first. For Personal, its result must identify `coopers-personal`; a tool bound
to a work account is not interchangeable with it.

Executor **Personal** is the fallback for Cooper's personal projects; Executor
**Tilt Legal** is for work accounts. Read the chosen Executor's `execute` guide
through its own `skills` tool. That tool serves Executor documentation, not
arbitrary Commonplace SKILL.md files. Discover the saved connection and search
the `linear_mcp` namespace; describe the selected tool and use the exact returned
path. Check `result.ok` before consuming `result.data`. MCP replies can contain
JSON in text content; check the response before parsing it. If an interaction
pauses a write, follow its returned resume instructions for the exact reviewed
arguments within the user's existing authority.

| Need                | Operations and important inputs                                                                                                                                    |
| ------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| Workspace and teams | `get_workspace`, `list_teams`, `get_team`. Filter retired teams.                                                                                                   |
| Projects            | `list_projects`, `get_project({query, includeResources: true})`. Repository links help distinguish similarly named projects. The current project list limit is 50. |
| Status and labels   | `list_issue_statuses({team})`, `list_issue_labels({team})`. Check retirement as well as archive state.                                                             |
| Existing issues     | `list_issues({project, query, ...})`, then `get_issue({id, includeRelations: true})`. The list's summary is not full relation evidence.                            |
| Comments            | `list_comments({issueId})` or `list_comments({projectId})`. Use one parent.                                                                                        |
| Native updates      | `get_status_updates({type: "project", project, ...})`. Read the latest relevant update before posting another.                                                     |

Follow each provider's cursor until `hasNextPage` or equivalent is false when
claiming a complete inventory or searching all relevant records. Field lists
vary by connector. Request only needed fields, without dropping pagination or
the retirement flags needed to select active entries.

## Write the smallest change

| Need             | Operation and inputs                                                                                                                                                                                      |
| ---------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Create an issue  | `save_issue({team, project, title, description, state, ...})`. Search first; omitting `id` creates a new record.                                                                                          |
| Update an issue  | `save_issue({id, state, patch, addLabels, removeLabels, ...})`. `labels` replaces the whole label set; use it only for an intended complete replacement.                                                  |
| Child issue      | Set `parentId` to the parent issue's live identity. Parent membership does not set a blocker.                                                                                                             |
| Prerequisites    | On A, use `blockedBy: [B]`; or on B, use `blocks: [A]`. Preserve other current prerequisites if the schema replaces an array. Use `removeBlockedBy` / `removeBlocks` only for the relation being removed. |
| Related context  | `relatedTo: [otherIssue]`; remove a specific relation with `removeRelatedTo`. Resolve both live identities and read back both ends.                                                                       |
| Duplicate        | `duplicateOf` points to the canonical issue. Setting the Duplicate status alone does not identify it.                                                                                                     |
| Progress comment | `save_comment({issueId, body})` or `{projectId, body}`. Use literal Markdown newlines and exactly one parent. An existing `id` edits that comment.                                                        |
| Project update   | `save_status_update({type: "project", project, health, body})`. Health is `onTrack`, `atRisk` or `offTrack`. An existing `id` edits that update.                                                          |
| Project setup    | `save_project({name, setTeams, ...})`; an existing `id` updates it. Use only within a request to set up or amend project tracking.                                                                        |

Use stable issue UUIDs returned by the current read where supported. A supplied
identifier such as `CAL-4` can resolve to the same issue now called `DEV-25`.
Do not create a replacement issue or move it back because its old URL redirects.

Preserve a collection using the tool's additive operations, or merge its current
values and the requested additions if replacement semantics apply. Re-read
after a write, especially when another agent is working on the same issue.
Update only owned fields; do not overwrite another person's fresh progress.

## Verify the result and handle uncertainty

Check error flags or error unions even when the tool call itself succeeds.
After a write, fetch the issue/project/comment/update again and compare the
changed fields. For blockers and Related to, verify both endpoints and the
direction. A successful text patch does not prove that a native relation exists.

A timeout is an unknown outcome. Search and read back the likely issue,
comment or update before retrying a create. If the intended record already
exists, reuse it and apply only the remaining change. Retry recovery is not a
reason to add new relationships or tidy other fields. Do not post the same
completion evidence again merely because the first response was lost.

If access or a required tool is missing, preserve the prepared change and state
what could not be saved. Continue independent work, but do not claim the account
was updated. Use the signed-in browser only when a necessary operation lacks a
working API. Re-check the browser's workspace and existing records there too.

# Personal workspace profile

Verified on 3 October 2026. This profile applies only to Cooper's **Personal**
workspace at [coopers-personal](https://linear.app/coopers-personal), workspace
ID `61df4cb4-17b9-464a-8bdf-1efba15600b6`. Confirm it through the connected tool.
For another workspace, discover that workspace's own projects, teams and rules.

## Teams and repository projects

Use the shared **Development (DEV)** team, ID
`ed6b68f2-2ec2-4db2-983f-bdc5951dc79a`. Cooper's side projects stay on the Free
plan, with a project and kanban per repo. The former **Calico (CAL)** team is
retired. Do not restore it or make one team per repository.

These are the available repository projects. Resolve each current project
before writing; identifiers and team prefixes can change after moves.

| Repository                      | Linear project                                                                                      | Snapshot identifier |
| ------------------------------- | --------------------------------------------------------------------------------------------------- | ------------------- |
| `crcorbett/calico`              | [Calico](https://linear.app/coopers-personal/project/calico-0d549259a171)                           | `P-DEV-2`           |
| `crcorbett/taxkit`              | [Taxkit](https://linear.app/coopers-personal/project/taxkit-c6ed29d0dbd4)                           | `P-DEV-3`           |
| `crcorbett/common-practice`     | [Common Practice](https://linear.app/coopers-personal/project/common-practice-60cd2f063f45)         | `P-DEV-4`           |
| `crcorbett/site`                | [Site](https://linear.app/coopers-personal/project/site-819620c0aa31)                               | `P-DEV-5`           |
| `crcorbett/learned`             | [Learned](https://linear.app/coopers-personal/project/learned-6819954d5c28)                         | `P-DEV-6`           |
| `crcorbett/adad`                | [Adad](https://linear.app/coopers-personal/project/adad-1b0d432846f1)                               | `P-DEV-7`           |
| `crcorbett/commonplace-plugins` | [Commonplace Plugins](https://linear.app/coopers-personal/project/commonplace-plugins-5f9e1a5b4a1f) | `P-DEV-8`           |

**Common Practice** is the product repo. **Commonplace Plugins** owns this
marketplace. Keep their issues separate. Older unrelated projects and issues
may still exist; preserve their history rather than tidying them away.

The [Calico kanban](https://linear.app/coopers-personal/project/calico-0d549259a171/view/kanban-38af506fde28)
contains the S00–Sxx roadmap and implementation follow-ups. Find stages by their
accepted task and current issue details. Do not assume a saved board includes
newly created issues unless its current filters actually include them.

## Issue status

Read the live Development statuses before changing an issue. The verified set:

| Status      | When to use it                                                                          |
| ----------- | --------------------------------------------------------------------------------------- |
| Backlog     | Accepted future work that has not been selected to start.                               |
| Todo        | Ready, selected work that has not started.                                              |
| In Progress | Implementation or fixing a failed check is underway.                                    |
| In Review   | A concrete code, behaviour or acceptance review is pending. Record what needs checking. |
| Done        | The issue's accepted result and required evidence are complete.                         |
| Canceled    | Work explicitly dropped; explain the decision.                                          |
| Duplicate   | A confirmed duplicate; link the canonical issue using the native duplicate operation.   |

There is no extra Blocked or Blocking status in this setup. Native issue
relations show those conditions while the existing workflow records progress.

## Issue labels

Use the existing labels. Keep unrelated labels already on the issue. Select
the relevant work areas and interfaces; avoid applying the whole list.

| Labels                          | Meaning                                                       |
| ------------------------------- | ------------------------------------------------------------- |
| `infra`                         | Hosting, provider setup, deployment and recovery.             |
| `backend`                       | Server services and processing.                               |
| `frontend`                      | Browser code and page behaviour.                              |
| `ui`                            | What people see and how they use it, including accessibility. |
| `docs`                          | Documentation, decisions, runbooks and evidence.              |
| `data`                          | Source files, records, databases, imports and storage.        |
| `search`                        | Matching, ranking and checking results against their sources. |
| `auth`                          | Sign-in, permissions and account separation.                  |
| `analytics`                     | Usage measurement and event capture.                          |
| `ai`                            | Models, embeddings and AI suggestions.                        |
| `web`                           | Website interface.                                            |
| `api`                           | HTTP interface and operation contracts.                       |
| `mcp`                           | Tools exposed to agents through Model Context Protocol.       |
| `cli`                           | Commands for operators and maintainers.                       |
| `Bug`, `Feature`, `Improvement` | Existing work-kind labels.                                    |

The former `blocked` label is **retired**. Some list responses still return it,
and the retired CAL team, even when archived items are excluded. Check
`retiredAt` as well as `archivedAt` before selecting an entry. Use native
**Blocked by**, **Blocks** and **Related to** relationships.

## GitHub and tracking

GitHub issue sync is disabled for this workspace. The GitHub integration stays
connected for code links. Do not enable issue sync, create mirrored GitHub
issues or change the plan to support normal delivery tracking. A branch, PR or
commit link does not prove that issue status automation is configured.

Keep each tracked goal's main issue and its actionable follow-ups current.
Post meaningful activity and milestone updates as part of that work. Separate
local checks, CI, live provider checks, deployment and public behaviour when
recording completion. Published code alone does not prove a working public page.

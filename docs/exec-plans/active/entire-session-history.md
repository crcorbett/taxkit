---
document_type: execution-plan
lifecycle: current
authority: supporting
owner: taxkit-tooling-owner
last_reviewed: 2026-10-01
review_trigger: Entire setup, import, capture, publication, or verification result
---

# Entire session history setup

Spec: [Entire AI work history](../../product-specs/entire-session-history.md).

## Sequence

1. Read project owners and DAW as a read-only reference; inspect clean checkout,
   fetch and fast-forward main, then use `codex/entire-session-history`.
2. Verify current official documentation and installed CLI 0.11.3 help.
3. Install Codex and Claude Code recording; review Codex commands using its
   normal approval screen. Connect Sydney and retain GitHub as `origin`.
4. Preview selected local Codex and Claude Code history; import with the native
   importer using temporary copies where old locations or compression require it.
5. Exercise both fresh agents, commit relevant source, push normally through
   Sydney, and independently read hosted transcripts and GitHub source revision.
6. Run docs, runbook, path and full repository verification, retain evidence,
   and open a draft PR. Complete this plan only after publication readback.

## Documentation impact

| Surface | Decision | Reason and owner |
| --- | --- | --- |
| Root README | Change required | Owns contributor setup and AI work history entry point. |
| Recording configuration | Change required | Entire and both agents own executable recording settings. |
| SPEC, plan and their indexes | Change required | Current intent and acceptance belong to this slice. |
| Dated proof | Change required | Import counts, hosted links and exact checks are observations. |
| Architecture, package/app READMEs | Preserve | No application, package or runtime boundary changes. |
| Standards, runbooks and authority matrix | Preserve | Existing authority rules and five operational procedures remain applicable. |
| Public/generated API and MDX | N/A | No consumer contract, generated source or public docs product change. |
| Skills and agent instructions | Preserve | No skill or repository instruction changes. |
| CI and lint commands | Preserve | Existing verification commands validate this setup. |
| Changeset and release notes | N/A | No package-facing behaviour or release change. |

## Proof and limits

The starting source is `9832897`. Neither enabled status nor an ended chat proves
publication. Checkpoint references and hosted transcript readback must accompany
source SHA readback. Raw logs and transcripts remain machine-local and ignored.
No deployment, package publication or merge is requested.

## Codex fresh-session check

A fresh Codex CLI session edited this plan using the installed Entire recording
commands.

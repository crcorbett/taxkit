---
document_type: product-spec
lifecycle: implemented
authority: supporting
owner: taxkit-tooling-owner
last_reviewed: 2026-10-01
review_trigger: Entire recording, session storage, importer, or verification change
---

# Entire AI work history

## Intent and authority

Cooper authorises configuring TaxKit for Codex and Claude Code, connecting its
Git history to the existing Australian Entire account, importing relevant local
history and publishing future checkpoints. After visibility readback showed
TaxKit is public, Cooper explicitly selected public chat publication. This
permission covers the setup branch, relevant commits, pushes and a draft PR.
It does not cover package publication, deployment or unrelated infrastructure.

## Acceptance tasks

- Install both agents' recording commands, preserving existing settings.
- Set telemetry off, absolute Git recording command paths and commit linking
  to always. Ignore machine-local logs, working transcripts and local settings.
- Connect the actual repository to Sydney, preserving the direct GitHub remote.
- Preview and import selected local history, including old worktree locations;
  preserve originals and verify duplicate avoidance.
- Use fresh Codex and Claude Code sessions, a normal commit and push, and
  hosted readback of transcripts and GitHub source changes.
- Update the root README, retain bounded evidence and pass required checks.

## Boundaries and recovery

The source repository and its checkpoints are public. Recording settings are
shared; machine approvals and local destination overrides belong to each clone.
No credentials or raw transcripts belong in the source branch. Imported history
is read-only in Entire. Ordinary Claude web/desktop history is optional and has
no direct importer in installed CLI 0.11.3.

To stop future capture, use `entire disable`; retained checkpoints are preserved.
To restore the former source configuration, revert this branch's setup changes
and remove the newly added local `entire` remote. Removing published chat records
requires a separate explicit deletion decision; disabling does not unpublish.

## Claude Code fresh-session check

A fresh Claude Code session edited this spec using the installed Entire
recording commands.

All acceptance tasks are complete. The [completed plan](../exec-plans/completed/entire-session-history.md)
and [dated proof](../documentation-audit/entire-session-history/2026-10-01.json)
retain import counts, hosted transcripts and exact GitHub readback.
[Draft PR #84](https://github.com/crcorbett/taxkit/pull/84) contains the setup.

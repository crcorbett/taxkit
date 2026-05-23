---
status: active
last_reviewed: 2026-05-23
source_of_truth: exec-plan
confidence: medium
---

# Extract API App Execution Plan

## Spec

- [Extract API app](../../product-specs/extract-api-app.md)
- [Task list](../../product-specs/extract-api-app.tasks.json)

## Execution Rules

- Implement tasks sequentially.
- Delegate one task at a time to a subagent.
- Parent agent reviews the diff, runs `bun run verification`, runs
  task-specific smoke checks, and accepts the task before delegating the next.
- Commit each accepted task when its `commitAfterPassing` flag is true.

## Progress

| Task | Status | Notes |
| --- | --- | --- |
| API-001 | pending | Add standalone Bun API app and lifecycle runtime. |
| API-002 | pending | Rewire web app to external API. |
| API-003 | pending | Remove TanStack-mounted API routes. |
| API-004 | pending | Update docs and final verification. |

## Validation Log

- Pending.

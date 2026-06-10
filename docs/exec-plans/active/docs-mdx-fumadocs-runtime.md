---
status: active
last_reviewed: 2026-06-10
source_of_truth: execution-plan
confidence: high
---

# Docs MDX Fumadocs runtime execution plan

Spec:
[Docs MDX Fumadocs runtime](../../product-specs/docs-mdx-fumadocs-runtime.md)

Task list:
[`docs-mdx-fumadocs-runtime.tasks.json`](../../product-specs/docs-mdx-fumadocs-runtime.tasks.json)

Goal:
Implement the docs MDX Fumadocs runtime task list sequentially. Each task is
delegated to one subagent when available; the parent agent reviews, audits
Effect patterns and package boundaries, verifies mandatory gates, accepts the
task, updates this plan and commits each coherent slice before delegating the
next task.

## Status

| Task | Status | Notes |
| --- | --- | --- |
| DOCS-RUNTIME-001 | pending | Create docs content package and Fumadocs source boundary. |
| DOCS-RUNTIME-002 | pending | Add DocsContentService and validation policy. |
| DOCS-RUNTIME-003 | pending | Create docs app runtime and route shell. |
| DOCS-RUNTIME-004 | pending | Wire reference, examples and OpenAPI validation. |
| DOCS-RUNTIME-005 | pending | Update architecture docs and root verification wiring. |
| DOCS-RUNTIME-006 | pending | Run final seam, boundary and canonical-reuse audit. |

## Validation log

### 2026-06-10 - Planning baseline

- Read the `prd-implementer` skill instructions and canonical implementation
  docs.
- Read the target spec and task list.
- Read relevant architecture docs for content, frontend, package ownership and
  Effect service patterns.
- Created an active implementation goal requiring strict sequential task
  execution, one subagent per task, parent review, Effect/code-quality audits,
  verification and acceptance before the next delegation.
- Planning baseline verification passed before implementation began:
  - `jq empty docs/product-specs/docs-mdx-fumadocs-runtime.tasks.json`
  - `bun run format:check`
  - `bun run verification`
  - `bun run changeset status --verbose`
- Changeset rationale: no new Changeset is required for the planning baseline
  because it only adds a draft spec, task list, index entry and active
  execution plan. Runtime/package implementation slices will make their own
  Changeset decisions.

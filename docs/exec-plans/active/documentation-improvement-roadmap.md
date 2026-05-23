---
status: active
last_reviewed: 2026-05-23
source_of_truth: exec-plan
confidence: medium
---

# Documentation Improvement Roadmap Exec Plan

## Spec

- `docs/product-specs/documentation-improvement-roadmap.md`
- `docs/product-specs/documentation-improvement-roadmap.tasks.json`

## Goal

Implement the documentation improvement roadmap in sequential task-list slices.
Each slice is delegated to a subagent, then reviewed, audited and accepted by
the parent before the next slice begins.

## Progress

- [x] DOC-IMPROVE-001: Fill README coverage for existing packages
- [x] DOC-IMPROVE-002: Refresh the root README
- [x] DOC-IMPROVE-003: Clarify current versus planned architecture docs
- [x] DOC-IMPROVE-004: Add docs maintenance guidance and final audit

## Validation Evidence

- DOC-IMPROVE-001: worker changed `packages/http-api/README.md`,
  `packages/tsconfig/README.md`, and `docs/documentation-audit/README.md`.
  Parent audit confirmed required README sections, confirmed the audit no
  longer lists those packages as missing README coverage, and ran
  `bun run verification` successfully.
- DOC-IMPROVE-002: worker refreshed `README.md` and
  `docs/repo-status-outline.html`. Parent audit confirmed README local links
  resolve, current/planned sections are distinct, the HTML is labelled as a
  manual snapshot, and health-only API docs/OpenAPI wording matches current
  `packages/http-api/src/server.ts`.
- DOC-IMPROVE-003: worker updated architecture and planned package README
  wording. Parent audit confirmed implemented surfaces were listed separately
  from then-planned packages, and planned packages were not described as
  importable runtime packages. `bun run verification` passed after refreshing
  local Bun workspace links with `bun install`.
- DOC-IMPROVE-004: worker added docs maintenance routing to `AGENTS.md`,
  expanded maintenance triggers in `docs/design-docs/agent-first-documentation.md`,
  and refreshed `docs/documentation-audit/README.md` with remaining gaps and
  migration priorities. Parent final audit confirmed root atlas paths resolve,
  stale missing-README claims are gone, and `bun run verification` passed.

## Decisions

- `docs/repo-status-outline.html` is treated as a manually refreshed status
  snapshot unless a generated-docs convention is added later.

## Follow-On Debt

- Decide later whether `docs/repo-status-outline.html` should become generated
  once repo status changes frequently enough to justify automation.

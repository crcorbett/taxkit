---
name: prd-writer
description: "Thin router for WhatTax spec authoring. Use when writing a SPEC, PRD, or feature proposal so the work follows canonical docs instead of inventing a new PRD bundle."
---

# PRD Writer

This skill is intentionally thin. It routes spec authoring into canonical repo docs instead of carrying a parallel planning framework inside the skill.

## Start Here

Read in this order:

1. `docs/product-specs/writing-specs.md`
2. `docs/product-specs/writing-task-lists.md` when the spec needs
   implementation sequencing
3. `docs/exec-plans/implementing-specs.md` when implementation is beginning
4. the relevant architecture docs from `docs/architecture/*`

## Default Rules

- New current specs belong in `docs/product-specs/`.
- Substantial specs that need implementation sequencing should get a sibling
  `.tasks.json` file in `docs/product-specs/`.
- New active implementation plans belong in `docs/exec-plans/active/`.
- Prefer one compact canonical spec over a sprawling PRD bundle.
- Prefer progressive, end-to-end implementation spikes with explicit
  verification gates over package-by-package TODO lists.
- Link to architecture docs instead of restating service, API, frontend or
  package-ownership guidance.

## Expected Output

For most substantial work, produce:

1. one spec in `docs/product-specs/`
2. one sibling task list in `docs/product-specs/<topic>.tasks.json` when the
   spec needs implementation sequencing, verification gates, or staged
   delegation
3. one active execution plan in `docs/exec-plans/active/` when implementation
   begins and live progress/validation evidence must be recorded

For small work, a single spec may be enough.

Task lists should follow `docs/product-specs/writing-task-lists.md`: include
principles, global verification, ordered tasks, mandatory verification,
browser verification where relevant, completion criteria, and
`commitAfterPassing` for each implementation spike.
Use `bun run verification` as the default repo-health gate in
`globalVerification.requiredBeforeFinalPR` and in each task's
`mandatoryVerification`, then add task-specific smoke tests, browser checks, or
architecture audits as additional gates.

## Common References

- `docs/architecture/README.md`
- `docs/architecture/effect-services.md`
- `docs/architecture/package-ownership.md`
- `docs/architecture/api-and-sdk.md`
- `docs/architecture/frontend.md`
- `docs/architecture/testing-and-quality.md`
- `docs/product-specs/writing-task-lists.md`

## Notes

- Reuse old or imported planning material only as source material to revalidate.
- Keep specs compact, current, and ownership-aware.
- Keep task lists concrete: each task should produce a working repo state and
  name `bun run verification` plus any task-specific tests, browser checks, and
  architecture audits required before it can be considered complete.
- Do not generate package-by-package code tutorials unless the user explicitly asks for that depth.

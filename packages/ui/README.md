---
status: canonical
last_reviewed: 2026-05-23
source_of_truth: package-readme
confidence: low
---

# UI

Planned shared UI package for TaxKit-owned apps. This directory is currently
documentation-only: it has no package manifest, source exports or runtime code.

## Scope

`packages/ui` should exist as a runtime package only when repeated UI
components or design tokens are shared across TaxKit apps. It should not own
tax rules, API contracts or calculator state.

## Main Areas

Potential future areas:

- shared layout primitives
- form controls for schema-backed calculator inputs
- report display components
- documentation-site UI helpers

## Runtime Shape

When implemented, UI code may depend on React as an app-facing package.
Browser-safe constraints still apply: do not import server-only handlers or
Node-only modules.

## Guardrails

- Keep domain schemas in owning engine/API/SDK packages.
- Keep UI components presentational unless a clear app boundary owns state.
- Avoid duplicating calculator logic in components.
- Add visual or browser verification when user-facing surfaces change.

## Related Docs

- `docs/architecture/frontend.md`
- `docs/architecture/api-and-sdk.md`
- `docs/architecture/testing-and-quality.md`

---
status: canonical
last_reviewed: 2026-05-23
source_of_truth: package-readme
confidence: low
---

# Scripts

Planned home for repo-owned automation and validation scripts.

## Scope

`packages/scripts` should own reusable scripts when shell commands become too
large for package scripts or need typed shared helpers.

## Main Areas

Potential future areas:

- docs audits
- package-boundary validation
- generated graph validation
- source-reference checks
- release or publishing helpers

## Runtime Shape

Scripts may use Node-only APIs when they run only in development or CI. Do not
import script code from browser-safe SDK or engine entrypoints.

## Guardrails

- Prefer package scripts for simple commands.
- Keep generated output deterministic.
- Document required environment variables next to the script.
- Add tests for reusable parsing or validation helpers.

## Related Docs

- `docs/architecture/testing-and-quality.md`
- `docs/documentation-audit/README.md`

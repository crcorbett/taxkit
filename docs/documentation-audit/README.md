---
status: canonical
last_reviewed: 2026-06-25
source_of_truth: documentation-audit
confidence: medium
---

# Documentation audit

## Current docs inventory

Current tracked documentation entrypoints:

- `README.md`
- `AGENTS.md`
- `docs/architecture/`
- `docs/design-docs/`
- `docs/exec-plans/`
- `docs/product-specs/`
- `docs/references/`
- `apps/api/README.md`
- `apps/docs/README.md`
- `apps/web/README.md`
- `packages/calculators/README.md`
- `packages/core/README.md`
- `packages/docs-content/README.md`
- `packages/docs-fumadocs/README.md`
- `packages/api/http/README.md`
- `packages/rules/au/income-tax/README.md`
- `packages/rules/au/pay/README.md`
- `packages/rules/au/stsl/README.md`
- `packages/scripts/README.md`
- `packages/sdk/typescript/README.md`
- `packages/testing/README.md`
- `packages/tsconfig/README.md`
- `packages/ui/README.md`

Current architecture docs cover facts, rules, calculators, graph/trace/ledgers,
API/SDK, package boundaries, package ownership, Effect services, frontend,
content/posts, deployment and testing quality.

## Package README coverage

Current app/package roots with package manifests:

- `apps/api`: covered by `apps/api/README.md`
- `apps/docs`: covered by `apps/docs/README.md`
- `apps/web`: covered by `apps/web/README.md`
- `packages/calculators`: covered by `packages/calculators/README.md`
- `packages/core`: covered by `packages/core/README.md`
- `packages/docs-content`: covered by `packages/docs-content/README.md`
- `packages/docs-fumadocs`: covered by `packages/docs-fumadocs/README.md`
- `packages/api/http`: covered by `packages/api/http/README.md`
- `packages/sdk/typescript`: covered by `packages/sdk/typescript/README.md`
- `packages/rules/au/income-tax`: covered by
  `packages/rules/au/income-tax/README.md`
- `packages/rules/au/pay`: covered by `packages/rules/au/pay/README.md`
- `packages/rules/au/stsl`: covered by `packages/rules/au/stsl/README.md`
- `packages/testing`: covered by `packages/testing/README.md`
- `packages/tsconfig`: covered by `packages/tsconfig/README.md`

Current planned ownership placeholders:

- `packages/scripts`: covered by `packages/scripts/README.md`
- `packages/ui`: covered by `packages/ui/README.md`

These placeholder directories have README guidance only. They are not runtime
packages until package manifests, source exports and verification exist.

## Missing or stale docs

- Completed execution plans have been moved to `docs/exec-plans/completed/`.
  `docs/exec-plans/active/` is available for the next live implementation
  plan.
- `docs/repo-status-outline.html` is a manual snapshot. It is linked from the
  root README, but it can drift and must be refreshed after material repo-shape
  or implemented-surface changes.
- `packages/scripts` and `packages/ui` remain planned ownership placeholders.
- `packages/domain/au/*` remains planned for Australian date dimensions and
  domain facts that are not owned by a single rule pack.
- `apps/web` is still a scaffold and health-check consumer, not a finished
  user-facing product app.
- `@whattax/sdk` is implemented as a private package but has not been
  published. Publication remains gated behind explicit release approval,
  package-name confirmation, `bun run version-repo` and publish verification.
- No generated documentation inventory exists yet; this audit is maintained by
  hand.

## Docs maintenance convention

The canonical maintenance convention lives in
`docs/design-docs/agent-first-documentation.md`.

At audit time, check that:

- new package or app roots have local READMEs when they gain manifests, exports
  or commands
- root routing only links to files and package roots that exist
- ownership, runtime boundary and public-surface changes update the owning
  architecture docs
- specs and sibling task lists stay aligned when sequencing or acceptance
  criteria change
- `docs/repo-status-outline.html` is refreshed or explicitly treated as a
  snapshot
- planned package families stay labelled as planned until manifests, source
  exports and verification exist

## Proposed maintenance priorities

1. Keep spec frontmatter, sibling task lists and execution-plan location
   aligned after each implementation slice.
2. Refresh `docs/repo-status-outline.html` whenever repo shape or implemented
   surfaces materially change.
3. Decide whether the manual status snapshot should become generated once repo
   status changes frequently enough to justify automation.
4. Add a generated docs inventory only if manual audit drift becomes a
   recurring source of mistakes.
5. Keep planned package families labelled as planned until package manifests,
   source exports and verification exist.
6. Keep this audit updated when new package roots, docs buckets or public
   surfaces are added.

---
status: canonical
last_reviewed: 2026-07-17
source_of_truth: documentation-audit
confidence: high
---

# Documentation audit

This route owns dated audit and corpus-accounting evidence, not current
maintainer policy. Lifecycle and semantic ownership are defined by
[`../README.md`](../README.md).

Current HGI-200 receipts:

- [`corpus-inventory.json`](corpus-inventory.json)
- [`link-report.json`](link-report.json)
- [`HGI-200-S1-receipt.json`](HGI-200-S1-receipt.json)
- [`HGI-200-S1-git-receipt.json`](HGI-200-S1-git-receipt.json)

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

Current design docs cover agent-first documentation maintenance and the
repository-wide abstraction-admission contract.

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
- `packages/scripts`: covered by `packages/scripts/README.md`
- `packages/testing`: covered by `packages/testing/README.md`
- `packages/tsconfig`: covered by `packages/tsconfig/README.md`

Current planned ownership placeholder:

- `packages/ui`: covered by `packages/ui/README.md`

This placeholder directory has README guidance only. It is not a runtime
package until a package manifest, source exports and verification exist.

## Missing or stale docs

- Completed execution plans live under `docs/exec-plans/completed/`. The
  HGI-200 through HGI-206 rollout is the only current plan under
  `docs/exec-plans/active/`; completed material remains historical.
- `docs/repo-status-outline.html` is a manual snapshot. It was refreshed on
  2026-07-17 for the completed TaxKit cutover, private `1.0.0` release train,
  strict packed-consumer validation and current delivery priorities. It can
  still drift and must be refreshed after material repo-shape or
  implemented-surface changes.
- `packages/ui` remains a planned ownership placeholder.
- `packages/domain/au/*` remains planned for Australian date dimensions and
  domain facts that are not owned by a single rule pack.
- `apps/web` is still a scaffold and health-check consumer, not a finished
  user-facing product app.
- `@taxkit/sdk` is implemented as a private package but has not been
  published. Publication remains gated behind explicit release approval,
  a package naming and registry approach, authentication, provenance and
  publish verification.
- No generated documentation inventory exists. This audit is deliberately
  maintained by hand until repeated drift justifies an owner, canonical input
  model, deterministic generator and focused tests under the abstraction
  admission contract.

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
3. Keep the status snapshot and documentation inventory manual until recurring
   drift satisfies the abstraction-admission bar for automation.
4. Reject generated inventory or package proposals that have no implemented
   owner, consumer, simpler maintenance graph and focused proof.
5. Keep planned package families labelled as planned until package manifests,
   source exports and verification exist.
6. Keep this audit updated when new package roots, docs buckets or public
   surfaces are added.

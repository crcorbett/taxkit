---
document_type: execution-plan
lifecycle: current
authority: canonical
owner: taxkit-documentation-owner
last_reviewed: 2026-07-20
review_trigger: acceptance or scope change in TaxKit HGI-200 through HGI-206
---

# TaxKit harness-governance documentation rollout

This is TaxKit's repository-local current-intent route for the
cross-repository campaign. The cross-repository ledger owns dependencies; this
plan owns TaxKit implementation state without copying the global contract.

Current authority is local repository writes and local/read-only verification.
Release, publication, registry, deployment, provider, credential, and evidence
deletion/movement require separately approved authority and target runbooks.

## Progress

- **HGI-200 — in progress:** one maintainer router, lifecycle/truth layers,
  legacy architecture tombstone, public/history separation, and corpus proof.
- HGI-201, HGI-202, HGI-207, HGI-208, HGI-203, HGI-204, HGI-205, and HGI-206
  remain pending in dependency order.

HGI-200-S1 changes only the router/architecture successor class. It preserves
public docs, completed plans, specs, and binary evidence in place. Stop before
another semantic-owner class, publication/provider access, evidence movement,
or an unresolved lifecycle decision.

Acceptance requires corpus/link receipts, a held-out route test,
`bun run check:repository-paths`, `bun run verification`, and a scoped Git
receipt. These local checks do not prove publication, registry state, external
consumers, API/docs production behavior, or release authority.

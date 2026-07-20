---
document_type: execution-plan
lifecycle: current
authority: canonical
owner: taxkit-documentation-owner
last_reviewed: 2026-07-20
review_trigger: acceptance or scope change in TaxKit HGI-200 through HGI-206
successor: null
tombstone: false
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
- HGI-207 (decisions) and HGI-201 (PRD/local skills) depend on HGI-200.
- HGI-202 (docs policy) depends on HGI-200, HGI-201, and HGI-207; HGI-208
  (docs-maintenance skill) depends on HGI-202.
- HGI-203 (critical journeys/release proof) depends on HGI-202 and HGI-208;
  HGI-204 (runbooks) depends on HGI-203.
- HGI-205 (CI/controls/automation) depends on HGI-202, HGI-203, and HGI-204;
  HGI-206 (requalification/closeout) depends on HGI-200 through HGI-205.

Completed-plan follow-ups are not active work in historical plan bodies. Their
explicit successors are HGI-207 for lifecycle/publication decisions, HGI-201
and HGI-208 for PRD and skill routing, HGI-202 for public/maintainer policy,
HGI-203 for release proof, HGI-204 for operations, and HGI-205 for controls.

HGI-200-S1 changes only the router/architecture successor class. It preserves
public docs, completed plans, specs, and binary evidence in place. Stop before
another semantic-owner class, publication/provider access, evidence movement,
or an unresolved lifecycle decision.

HGI-200-S2 classifies the retained pre-campaign SPEC and plan records, makes
the historical indexes route follow-ups to explicit current HGI tasks, and
corrects the local HGI task IDs and dependency order. Its bounded receipt is
[`HGI-200-S2-receipt.json`](../../documentation-audit/HGI-200-S2-receipt.json).
It does not accept the HGI-200 parent or alter public content, binary evidence,
or the architecture tombstone route.

Acceptance requires corpus/link receipts, a held-out route test,
`bun run check:repository-paths`, `bun run verification`, and a scoped Git
receipt. These local checks do not prove publication, registry state, external
consumers, API/docs production behavior, or release authority.

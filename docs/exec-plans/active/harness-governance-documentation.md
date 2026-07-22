---
document_type: execution-plan
lifecycle: current
authority: canonical
owner: taxkit-documentation-owner
last_reviewed: 2026-07-21
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

- **HGI-200 — completed:** one maintainer router, lifecycle/truth layers,
  legacy architecture tombstone, public/history separation, metadata for 19
  retained SPECs, 20 completed-plan records and two active records, integrated
  fresh-context acceptance, corpus proof, and pushed Git identity.
- **HGI-201 — completed:** current PRD/task and
  implementation guides, `docs-writer`, architecture/standards review rules,
  and semantic contradiction fixtures now reject fixed worker/pass-count ritual
  while preserving the Effect, provider-boundary, package, and React contract.
  Exact Git publication/readback: [`HGI-201-validation.json`](../../documentation-audit/HGI-201-validation.json).
- **HGI-207 — completed:** accepted decisions define public `draft` and
  `published` semantics, transient tarball handling, and sanitized release
  receipt retention while preserving publication/deployment non-claims. See
  [`hgi-207/README.md`](../../documentation-audit/hgi-207/README.md).
- **HGI-202 — completed and published:** the mechanical owner contract, Effect-native
  bounded `check:docs` gate, exact lint boundaries, public status and navigation
  ownership controls, and positive/negative fixtures are recorded in
  [`HGI-202-candidate.json`](../../documentation-audit/HGI-202-candidate.json)
  and [`HGI-202-receipt.json`](../../documentation-audit/HGI-202-receipt.json).
  Exact semantic Git identity and origin/main readback are recorded in
  [`HGI-202-validation.json`](../../documentation-audit/HGI-202-validation.json).
  This does not claim a release, public-doc publication, deployment, provider
  state, or external availability.
- HGI-208 (docs-maintenance skill) is completed.
- HGI-203 (critical journeys/release proof) is accepted and published at
  semantic commit `f3a7bdf4e63fcc6ce9dedaf963337def9f65c3a5`; its exact candidate,
  attempt, bounded summary, independent acceptance and Git readback are in
  [`HGI-203-validation.json`](../../documentation-audit/HGI-203-validation.json).
- **HGI-204 — completed and published:** exactly four canonical runbooks, one
  authority model, strict accepted-evidence binding, a non-executing
  Effect-native validator, adversarial fixtures, fresh-context acceptance and
  exact semantic Git readback are recorded in
  [`HGI-204-validation.json`](../../documentation-audit/HGI-204-validation.json).
- HGI-205 (CI/controls/automation) is the next pending TaxKit slice;
  HGI-206 (requalification/closeout) depends on HGI-200 through HGI-205.

Completed-plan follow-ups are not active work in historical plan bodies. Their
explicit successors are HGI-207 for lifecycle/publication decisions, HGI-201
and HGI-208 for PRD and skill routing, HGI-202 for public/maintainer policy,
HGI-203 for release proof, HGI-204 for operations, and HGI-205 for controls.

HGI-200-S1 changes only the router/architecture successor class. It preserves
public docs, completed plans, specs, and binary evidence in place. Stop before
another semantic-owner class, publication/provider access, evidence movement,
or an unresolved lifecycle decision.

HGI-200-S2 classified the retained pre-campaign SPEC and plan records, makes
the historical indexes route follow-ups to explicit current HGI tasks, and
corrects the local HGI task IDs and dependency order. Its bounded receipt is
[`HGI-200-S2-receipt.json`](../../documentation-audit/HGI-200-S2-receipt.json).
It did not alter public content, binary evidence, or the architecture tombstone
route. Integrated parent acceptance is recorded in
[`HGI-200-validation.json`](../../documentation-audit/HGI-200-validation.json).

HGI-201, HGI-203 and HGI-204 passed independent acceptance and exact Git
publication/readback. HGI-207, HGI-202 and HGI-208 have local completion
receipts. These local records do not prove
publication, registry state,
external consumers, API/docs production behavior, or release authority.

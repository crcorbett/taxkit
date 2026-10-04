---
document_type: execution-plan
lifecycle: current
authority: supporting
owner: taxkit-implementation-owner
last_reviewed: 2026-10-04
review_trigger: task progress, dependency qualification, acceptance evidence or authority change
---

# Clean slate foundation implementation

Cooper's 4 October request authorises implementation, reviewable commits and
draft PRs. It supersedes the old Q14 whole-design admission hold; Q1–Q13 remain
settled. No merge, deploy, publication or provider mutation is authorised.
Final provider-plan approval is a separate boundary. The
[SPEC](../../product-specs/clean-slate-foundation.md) and
[task ledger](../../product-specs/clean-slate-foundation.tasks.json) own scope,
dependencies and acceptance; this plan owns execution evidence.

## Starting point and retention

Clean source `8ed03f0e1a96d2cc258b68935b9f9be443666e1b`, verified against remote
main on 4 October. No open TaxKit PRs were returned by GitHub at grounding.
The completed Alchemy/Doppler handover is already present through `ae63107`.
The [retention manifest](../../documentation-audit/clean-slate-foundation/retention-manifest.json)
binds retained paths to Git objects, captures all three 2025–26 calculators,
known-result examples, existing contract/URL owners and historical recovery
identities. No existing wiring or historical evidence has been removed.

The latest DEV-72 comment independently diagnosed the prior offline frozen
install as sandbox tempdir `EPERM`; the same copy installed with normal access.
This differs from the completed hosted asset-propagation recovery. The fixture
now includes captured stdout/stderr in a failing install assertion rather than
hiding the install error behind exit code 1. No package or lock change is needed
for this diagnostic correction.

The cloud toolchain is activated through the environment's existing activation
script. Baseline identity: Bun 1.3.14, Node 24.16.0. Core and calculator tests
passed before edits. All T001 required checks passed: check:docs, check:runbooks, core tests,
calculator tests (five), test:quality-workflow (19), verification and diff check.
Turbo reused unchanged task results where valid; the modified fixture executed
and passed. This is local proof only. The
[baseline receipt](../../documentation-audit/clean-slate-foundation/2026-10-04-baseline.json)
records command outcomes and log digests.

## Delivery ledger

| Task / Linear | State | Evidence and next action |
| --- | --- | --- |
| T001 / DEV-72 | Implemented and locally tested | Retention, admission and diagnostic checks pass; draft PR review pending. |
| T002 / DEV-73 | Qualification in progress | Qualify exact current dependency graph and complete strict enforcement before application changes. |
| T003 / DEV-74 | Pending T002 | First same-stage website/backend calculation. |
| T004 / DEV-75 | Pending T003 | All three calculators and deliberate public interface changes. |
| T005 / DEV-76 | Pending T003 | Accepted content, route retention, search and discovery. |
| T006 / DEV-77 | Pending T004/T005 | Remote MCP and page-owned browser tools. |
| T007 / DEV-78 | Pending T003/T005 | Reviewable Alchemy domain/Doppler plan; no apply. |
| T008 / DEV-79 | Pending T004/T005/T006 | Minimal private PostHog events. |
| T009 / DEV-80 | Pending T003/T004/T006 | Safe logs/traces/metrics in retained shared datasets. |
| T010 / DEV-81 | Pending T007/T008/T009 | Full review, release/consumer proof and separately authorised delivery. |

Adad must not qualify an invented replacement revision. The existing source
baseline remains `8ed03f0e1a96d2cc258b68935b9f9be443666e1b`; a new compatible
revision will be named only after the affected package and downstream checks.

## T001 documentation impact

| Surface | Decision | Owner, verification and limits |
| --- | --- | --- |
| SPEC/tasks and active indexes | Change required | Reconcile explicit implementation authority and actual task state; docs and runbook checks. |
| Retention and baseline proof | Change required | New dated manifest and this active plan; compare Git identities and existing golden tests. Historical hosted proof is not fresh readback. |
| Quality-workflow fixture | Change required | Expose failed offline install output at its assertion; test:quality-workflow and full verification. |
| Tax rules, public contracts, generated content and package READMEs | Preserve | No domain/interface/public behaviour changes in T001; existing tests capture results. |
| Historical evidence, runbooks, provider resources and release train | Preserve | No replacement/removal/apply; recovery owners remain unchanged. |
| Changeset | N/A | Internal test diagnostics and implementation evidence only; no package-facing change. |
| Skills, lint policy, CI and dependency manifests | Preserve | Qualification and adoption belong to T002; no partial portable baseline claimed. |

Resume through the first incomplete task and retain failed-check evidence.
Revert this slice to its starting Git source for local recovery; provider
recovery remains separately governed by the retained deployment runbook.

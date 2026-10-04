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

## T002 dependency migration (partial slice)

The stable Effect migration is isolated on
`codex/dev-73-stable-effect-qualification`, based on T001 commit
`771a506a071277f1f975672c4edaa9e32bf629b0` ([draft PR 88](https://github.com/crcorbett/taxkit/pull/88)).
T001 hosted Quality passed. T002 remains in progress: this dependency slice does
not complete Atom/Scheduler lifecycle qualification, canonical skill adoption,
or the full immutable/strict-policy migration required before T003.

The graph uses Bun 1.4.2, TypeScript 7.0.2, stable Effect/platform 4.0.0, React
19.3.0, Alchemy beta.80, Fumadocs 15.4.6/core 16.16.0, Vite 8.3.2, Vitest 5.0.3
and Playwright 1.63.0. The native `@effect/tsgo` 0.48.0 tool patches TypeScript 7;
its configuration must retain the upstream `@effect/language-service` identifier.
A skipped diagnostic fixture was found and corrected during qualification.
The two programmatic AST tools use the official TypeScript 6 compatibility API;
the compiler remains TypeScript 7. Warnings/suggestions remain visible and
errors remain fatal.

The current Alchemy text adapter is bound to beta.80 commit
`ef7d3077a7d196edf26fa1f3bb8bc9b0ef9fef04`. Comparing the published beta.79 and
beta.80 source shows the formatter's only change is the stable Effect Prompt
import; NamespaceTree is byte-identical. Parser tests and deployment evidence
checks execute locally. Historical beta.64 captures and hosted receipts remain
unchanged. This does not qualify a fresh provider plan, bootstrap or deployment.

The [Medicare scope conflict](../../documentation-audit/clean-slate-foundation/2026-10-04-medicare-scope-conflict.json)
records primary legislation that disagrees with retained 2025–26 individual
thresholds. Cooper was asked whether to authorise a separate source-backed
correction. No tax result has changed while that decision remains pending.
Adad DEV-68/69 must not treat retained-output preservation as current-law proof.

| Affected surface | Decision | Evidence / limitation |
| --- | --- | --- |
| Manifests, lock, compiler, Effect imports and language tooling | Change required | Exact graph, native diagnostic gate, stable module paths; package/consumer checks. |
| HTTP OpenAPI and all three calculators/rule packages | Preserve results/contracts | Existing golden tests and snapshot retained; Medicare accuracy conflict remains explicit. |
| Fumadocs integration and generated route tree | Change required | Current plugin array contract and generator output; browser, SSR and built-Worker checks. |
| Deployment parser and operational docs | Change required | Current beta.80 identity with source comparison and local tests; historical receipts preserved. |
| Process/browser proof environment | Change required | Named browser-cache input, isolated Wrangler config/logs, bounded descendant exit check. No credentials forwarded. |
| Knip and existing lint rules | Change required | Current dependency ownership and seven stricter upstream lint findings; this is not the complete T002 policy adoption. |
| Changesets | Change required | Major fixed-train compatibility boundary in `stable-effect-toolchain.md`; no versions consumed or published. |
| Canonical skills, complete strict enforcement, Atom lifecycle | Pending | Required remaining T002 work; downstream tasks remain queued. |

Recovery for this slice is to revert its source/manifests/lock together and
reinstall the previous frozen graph. No provider state is changed by that local
recovery. Full application improvements DEV-74–81 remain unimplemented.

The [partial qualification receipt](../../documentation-audit/clean-slate-foundation/2026-10-04-stable-dependency-qualification.json)
records the exact graph, command evidence, retained failures and pending work.

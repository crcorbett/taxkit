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

## Persistent implementation goal

Cooper explicitly confirmed on 4 October 2026: complete DEV-73's enforced
dependency/Effect and host proof gates, then implement DEV-74–81's approved
rebuild through reviewable, tested draft PRs. Continue until implementation is
finished and verified, or a concrete external blocker prevents every remaining
safe action. A draft PR, checkpoint or completed slice is not the terminal goal.

This runtime exposes no native persistent-goal capability. This active plan and
the task ledger are the durable continuation record; the task plan mirrors it.
Medicare result changes remain gated on Cooper's concrete decision. Continue all
independent work. No merge, deployment, publication or provider apply authority
is added. Keep Linear activity, status and evidence aligned with actual results.

Next continuation milestone: qualify the Bun-hosted Effect test runner in the
repository, then migrate remaining app, package, tool, test, config and
infrastructure workflows to the complete canonical strict policy before
downstream acceptance. Domain boundary enforcement is implemented in PR #93. The latest
stable-v4 adad qualification handoff remains revision
`59b0a36ff1bc6f95501734ee65d789a4f5a37fcc`; it is not Medicare-correctness proof.

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

## T002 canonical skill refresh

Adopt all nine complete repository skills from Commonplace development-workflows
0.6.1, commit `91a47d9fdde8aad214a0ab12742517cce344b709`. This is the current
successor of the design's 0.6.0 reference. The two existing local profiles are
retained and updated with TaxKit's stable-v4 compatibility precedence. Linear,
strict Effect and Alchemy now have local folders and relative Claude links.
The receipt binds canonical tree hashes separately from the two overlays;
existing local extras and historical evidence remain preserved. Runtime and
policy share one canonical inventory to avoid divergent tree/link admission.

Documentation impact: **Change required** for complete skill trees, receipt,
profile overlays, AGENTS route, governance inventory/negative tests and tooling
standard. **Preserve** package contracts/results, historical baseline evidence,
provider/release authority and all runtime wiring. **N/A** for a Changeset:
this slice changes repository instructions and their verification only. Full
portable-policy integration remains pending; no strict-compliance claim follows
from copying its asset. Recover by reverting this entire slice, including its
receipt and profiles, to the previous immutable skill collection.

The [skill adoption receipt](../../documentation-audit/clean-slate-foundation/2026-10-04-canonical-skills.json)
records full verification and the actual-command provisional strict-rule scan:
341 files, 2,155 diagnostics before exact host-exception reconciliation. These
are not all adjudicated defects. The root's existing gate remains green; the
stronger clean-slate policy is not yet integrated or accepted. DEV-74 remains
blocked by that unfinished DEV-73 requirement.

## T002 repository-integrated Atom qualification

The previously isolated Atom lifecycle proof now lives with the web app and
runs through `web:test:browser` within root verification. The exact peer patch
only adds Scheduler 0.28.0 to Atom 4.0.0's accepted range. Test effects own React
root/host disposal; real Chromium proves hydration, scheduling/cancellation,
StrictMode registry identity, rapid updates and final disposal. App runtime
adoption and RPC interruption remain with T003. Bun's pre-patch peer warning is
retained and explained; it is not silenced by an override.

Documentation impact: **Change required** for root/web manifests, lock, exact
patch, browser config/fixture, command/gate and owning README/tooling standard.
**Preserve** all tax parameters/results, package API, current app runtime and
provider state. **N/A** for a new Changeset: this adds development qualification
and a gate, without a shipped package or app feature change. Revert this slice
and reinstall the parent frozen graph for recovery.

The [Atom qualification receipt](../../documentation-audit/clean-slate-foundation/2026-10-04-atom-qualification.json) records the exact graph, bounded peer patch and passing full verification.

## T002 immutable domain migration

Replace mutable graph construction with a checked-index immutable Graph snapshot,
Medicare local reassignment with Match, and native array traversal with Effect
Array operations in rules and calculator tests. Tax tables, branching boundaries,
rounding, ledger order and trace formula strings remain unchanged. The pending
Medicare policy decision is independent of this behaviour-preserving migration.

Enable the canonical immutable-collections rule across core, all rule packages
and calculators, including tests. Actual Oxlint binary positive and negative
fixtures cover those three path families. This is incremental enforcement:
other strict rules and owned app/tool/config paths remain T002 work, and DEV-73
is not complete. There are no new exemptions or disabled existing rules.

Documentation impact: **Change required** for the lint gate, regression fixture,
this progress owner and the package Changeset. **Preserve** all tax results,
public contracts and historical provenance. **N/A** for provider operations.
Recover by reverting this complete slice; no external state changes.

Verification on 4 October: frozen install, root tests (including all three
retained calculator golden suites and 46 Oxlint tests), type checks, build and
full verification passed. Existing visible upstream diagnostic warnings remain
non-fatal. No snapshots, tax tables or source artifact records were changed.

## T002 domain boundary enforcement

Configure all eleven canonical rules across core/rules/calculators. Remove the
remaining direct date lookup, consolidate date invariants in their canonical
Schemas, and remove redundant currency guards over checked AUD-only Money.
The DateInterval whole-record invariant now also applies to direct decoding,
closing its previous constructor-only validation gap. Convenience constructor
failure formatting follows owning Schema diagnostics. Valid dates and all tax
results remain unchanged; no Medicare threshold change is included.

Use owning Schema encoders in the exact report-determinism and secret-negative
error representation tests. These two egress admissions grant no exception from
strict rules. Real Oxlint fixtures check admitted file count, exit code and ten
applicable domain diagnostics; web runtime filename coverage remains with web
migration. Ordinary source/test type checks and behavioural regressions remain
necessary alongside syntactic policy.

Documentation impact: **Change required** for core README, validation tests,
strict configuration, tooling standard, fixture proof and a core Changeset.
**Preserve** tax results, source provenance and existing public representations.
This is partial T002 progress; app/tool/config/infrastructure migration and
remaining semantic audits are unfinished. Revert the whole slice for recovery.

Domain-boundary verification on 4 October: 16 core date tests, all repository
tests, full verification and build passed. The real-binary portable fixture
suite passed 17 cases with admitted-file and rule assertions. No tax snapshots
or parameter tables changed. Prior frozen graph proof remains applicable; this
slice does not edit dependency manifests or the lockfile.

## T002 owned collection and global policy migration

Replace native map/filter/some/every traversal in owned deployment,
documentation, quality, governance, evaluation, lint, SDK proof and release
readiness code with Effect Array operations. Preserve absent optional-chain
results explicitly and require Boolean predicates where native traversal
previously accepted truthy optional values. Existing validators, evidence
formats and failure classifications remain the behavioural oracle. The real
workerd proof caught one Playwright evaluateAll callback that cannot access a
host Effect import after browser serialization. Retain that original native DOM
projection for the upcoming host workflow migration; no exemption or complete
strictness claim is made for it.

Enable five canonical rules globally: no-native-at, no-unsafe-option-unwrap,
tagged-error-name, error-constructor-new and runtime-file-convention. Replace
the remaining two native `.at` reads with checked Option lookup. Name web
context/selection modules for their actual role; server/client modules retain
runtime ownership. CLI fixtures now cover web, JavaScript tooling and root
configuration in addition to domain source/tests, including admitted file count.
No new broad exception or disabled existing rule is introduced.

Documentation impact: **Change required** for global enforcement, web README
and import pointers, removal of its obsolete Knip exception/internal type export,
tooling standard, actual-command fixtures, this evidence
owner and the private scripts Changeset. **Preserve** operational commands,
provider authority, prior receipts, wire formats, tax tables/results and public
copy. The remaining six policy families outside domain packages and semantic
contract/state/lifetime audits remain unfinished T002 work. Recover by reverting
this slice; provider state is unchanged.

The [owned-collection receipt](../../documentation-audit/clean-slate-foundation/2026-10-04-owned-collections.json)
records 370 traversal conversions, global rule fixtures, validation and the
browser-realm correction. The final local workerd proof passed SSR, immutable
assets, missing-route status, client navigation and diagnostic cleanliness.
The isolated Bun-hosted @effect/vitest experiment also passed; repository test
runner adoption is the next continuation milestone, not completed by that spike.

---
document_type: execution-plan
lifecycle: current
authority: supporting
owner: taxkit-implementation-owner
last_reviewed: 2026-10-08
review_trigger: task progress, dependency qualification, acceptance evidence or authority change
---

# Clean slate foundation implementation

Cooper's 4 October request authorises implementation, reviewable commits and
draft PRs. It supersedes the old Q14 whole-design admission hold; Q1–Q13 remain
settled. Cooper's 7 October direction now authorises native Preview and
Production deployments from this Mac after exact source, target, credentials,
plans, recovery and readback are qualified. Merge, publication, unrelated
provider changes and credential creation remain outside this authority. The
[SPEC](../../product-specs/clean-slate-foundation.md) and
[task ledger](../../product-specs/clean-slate-foundation.tasks.json) own scope,
dependencies and acceptance; this plan owns execution evidence.

## Persistent implementation goal

Cooper explicitly confirmed on 4 October 2026: complete DEV-73's enforced
dependency/Effect and host proof gates, then implement DEV-74–81's approved
rebuild through reviewable, tested draft PRs. Continue until implementation is
finished and verified, or a concrete external blocker prevents every remaining
safe action. A draft PR, checkpoint or completed slice is not the terminal goal.

The local continuation also records this objective in the runtime's native goal
manager. This active plan and the task ledger remain the durable repository
continuation record.
Medicare result changes remain gated on Cooper's concrete decision. Continue all
independent work. Cooper's 7 October direction adds native Preview and Production
deployment authority from this Mac, subject to the qualification above. Keep
Linear activity, status and evidence aligned with actual results.

Next continuation milestone: continue T008's accepted analytics work. The private
backend and API collection owner have focused local proof; Website/browser,
relay and retained provider resources remain. T007's
operational handover is locally accepted and ready for draft review. T006 is locally accepted and ready for
draft review with its documented five-second modern cancellation limit. All three calculator
pages have local native/browser proof. T003's connection/containment
qualification is locally accepted. T002's
installed dependency graph, app/script/SDK/infrastructure
migrations, six-extension strict scope, fixture containment and final source
review are complete locally. The [acceptance review](../../documentation-audit/clean-slate-foundation/2026-10-05-foundation-acceptance-review.json)
records the completed local checks and their limits. The companion adad
qualification remains exactly `59b0a36ff1bc6f95501734ee65d789a4f5a37fcc`;
later SDK work has not been qualified there, and neither result is Medicare
correctness proof.

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
| T002 / DEV-73 | Complete locally; review outstanding | Exact dependency graph, complete strict enforcement, native lifetimes/browser evidence and source review pass. New-commit hosted proof is separate; Linear status is unchanged. |
| T003 / DEV-74 | Complete locally; draft review outstanding | Native connection/containment and exact #136 hosted Quality pass. T009 exported tracing remains unmet. Linear state unchanged. |
| T004 / DEV-75 | Complete locally; draft review outstanding | Named operations, body/work/rate policy and domain/package checks pass. Draft #154 has exact-head hosted Quality proof; Linear state is unchanged. |
| T005 / DEV-76 | Complete locally; draft review outstanding | Documentation reader and old app/build/operation retirement passed the complete local graph and exact #155 hosted Quality. Metrics remain deferred. |
| T006 / DEV-77 | Complete locally; draft review outstanding | Six remote and five visible browser tools reuse the checked owners. All nine local checks pass at `72bfa16ac08dacc4c26f3de023a2880baefe1c55`, with both fourteen-case native runs. Draft #162 contains the stage-derived connection guide, deployed and read back on pr-162 and Production with both supported clients. The explicit modern five-second cleanup limit remains; no autonomous model session or prompt cleanup is claimed. |
| T007 / DEV-78 | Complete locally; draft review outstanding | Exact native graph/source/secret/state/live plans are delivered in drafts #159–161, with #162 guide delivery. Draft #163 aligns the current native CLI/runbooks/recovery and paged provider reads. Full local verification passes `226c60bddb225467db64e772d48304af2368a216` in 684.12 seconds; all 1,750 frozen identities match, including the fourteen-case built app check. No new provider, state, credential or deployment mutation; rollback and no-op convergence remain unqualified. |
| T008 / DEV-79 | In progress | Backend and Website calculator preference candidates are locally qualified. The retained-project candidate has focused local proof; browser sender choice, relay, real provider resources and stored-event proof remain. |
| T009 / DEV-80 | Deferred by Cooper on 6 October | Leave the metrics approach for now and proceed with other work. Existing fixed safe errors and disabled collection remain; exported telemetry is not completed. |
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

## T002 Effect-native lint test host

Move the four actual-command lint suites to Bun-hosted Vitest and
`@effect/vitest`. A shared fixture boundary owns scoped FileSystem writes and
ChildProcessSpawner execution, decoding process bytes once. Preserve fixture
admission paths: the tryPromise policy requires repository tools paths, while
other negative cases deliberately exercise external or exact consumer paths.
Remove the four obsolete Bun adapter exceptions. Enable all eleven canonical
rules for the directly owned lint TypeScript files and cover this scope with
real CLI accepted/rejected cases. Cleanup tests exercise success, failure and
interruption. Add the test TypeScript project to root verification, including
its imported lint configuration; declaration output is disabled for this
non-emitting test project.

Documentation impact: **Change required** for test-host and decoding ownership,
root verification, strict fixture admission and this active plan. **Preserve**
all production contracts, tax results, provider authority and existing receipts.
**N/A** for a package Changeset: only root development dependencies and tooling
tests change; no versioned package surface changes. The lockfile rehoists the
already pinned runner dependencies. Recover by reverting the complete slice.
The [tooling-test receipt](../../documentation-audit/clean-slate-foundation/2026-10-04-effect-tooling-tests.json)
records passing frozen install, all tests (57 lint cases), full verification
and build. This is not completion of DEV-73.

## T002 HTTP and shared assertion boundaries

Extend all eleven canonical rules to HTTP API and shared testing source/tests.
Use checked Array/Option access and framework failure for expectAt, with tests
for identity, null, false, absent and undefined entries. Replace raw OpenAPI
filesystem/JSON handling with Effect FileSystem and owning Schema codecs;
encode the HTTP secret-negative error via CalculatorApiErrorEnvelope. Retain
one exact Fetch Promise type admission, prove neighbouring files reject it and
prove async/await is still rejected at the host itself via an exact real CLI fixture.

Add TypeScript test projects to both package gates. This exposed previously
unverified raw context strings and union-property reads in HTTP tests; use
canonical calculation identities and explicit Match narrowing. Do not broaden
types or silence errors. The existing snapshot and calculator results stay
unchanged. Native HTTP lifetime composition remains a subsequent task.

Documentation impact: **Change required** for package test commands/READMEs,
serialization and host ownership, strict enforcement, fixtures, this plan and
the shared testing Changeset. **Preserve** public API contract/OpenAPI snapshot,
tax results and source provenance. **N/A** for provider operations. Revert the
complete slice for recovery. The [API/test-boundary receipt](../../documentation-audit/clean-slate-foundation/2026-10-04-api-test-boundaries.json)
records passing frozen install, all tests (64 lint, five API and five assertion
cases), full verification and build.

## T002 repository-tool test and command boundaries

Run repository-path and governance tests through Bun-hosted Effect Vitest.
Remove raw async/Promise execution wrappers; use test-owned Effects and the
existing scoped platform services. Governance fixture trees use immutable Record
updates; checked Option access replaces unchecked indexed findings and trees.
Enable all eleven canonical rules for repository-path and governance tools,
including tests. The repository-path executable retains one exact runtime admission,
with real CLI fixtures and a configuration assertion protecting its selector.
The governance runtime also has one exact admission. Its traversal, collection
construction and checked lookups are functional; Option owns missing tree/reference
entries. Schema string encoding preserves the original sorted digest byte format
and existing receipt hashes, without replacing them with a new canonicalization.

Documentation impact: **Change required** for test-host commands, strict scope,
exact runtime admission, real-command fixtures and this progress owner.
**Preserve** repository path redaction, governance semantics and all product
contracts/results. **N/A** for a Changeset: this slice changes root tooling only.
Revert the complete slice for recovery; no external state changes.

The [tool-runtime receipt](../../documentation-audit/clean-slate-foundation/2026-10-04-tool-runtime-boundaries.json)
records passing focused tests (11 path, 15 governance), 70 real CLI lint cases,
all repository tests, full verification and build. The refreshed provisional
inventory reports 1,550 strict diagnostics before additional host/fixture
qualification; this is not a confirmed defect count or whole-repository acceptance.

## T002 docs adapters and checked examples

Extend all eleven canonical strict rules to docs-content and docs-fumadocs.
Generated collection operations return Effects; the private processed-text
boundary preserves receiver identity and redacts SDK failures. The Fumadocs
live Layer owns representation decoding. Shiki consumes immutable replacement
nodes. Fumadocs MDX configuration is synchronous in the installed version and
needs no Promise or runtime admission. Only the validation executable retains
an exact runtime admission, checked by real CLI cases and a configuration test.

The browser example uses the typed API client and takes an explicit URL. The
server example validates canonical cents/period request fields and calls the
native Effect SDK. Align both draft guides with the checked files, retaining
all documented calculator results and draft lifecycle. Add request rejection,
retained-result, processed-text receiver and secret-redaction tests.

Documentation impact: **Change required** for both package READMEs, public
examples/guides, generated-collection architecture, strict fixture scope,
Changeset and this plan. **Preserve** tax rules/results, published-status
records, OpenAPI and provider state. **N/A** for operational runbook changes:
no deployment or release procedure changes. Initial full verification caught
missing Knip example entries; include examples rather than ignore dependencies.
The local workerd proof passed but exposed hard-coded old dependency versions
in its receipt. Read installed manifests (including Wrangler’s resolved workerd)
at the harness owner and rerun before retaining the evidence. No historical
receipt is rewritten. Recover by reverting this complete slice.

The [docs-adapter receipt](../../documentation-audit/clean-slate-foundation/2026-10-04-docs-adapter-boundaries.json)
records frozen install, all tests (75 lint and 13 docs-content), full verification,
build and the corrected local workerd proof. Its observed dependency versions
come from installed manifests. This is not provider or whole-T002 acceptance.

## T002 skill-policy test boundaries and local handoff

Run the retained skill-policy suite through Bun-hosted Effect Vitest, with
Effect FileSystem, canonical fixture Schemas, bounded repeated I/O, persistent
membership and checked capture groups. Replace unchecked tuple indexes with
explicit tuple bindings. The actual readLink operation proves the mirror is a
symbolic link and has its required target. Preserve every policy assertion and
historical fixture. Enforce all eleven canonical rules and add an explicit
TypeScript test gate plus real CLI path coverage. The exact test file is an
admitted ingress owner for its three existing JSON fixture corpora.

Documentation impact: **Change required** for test-host and typecheck ownership,
commands, strict path coverage, this plan and the continuation prompt.
**Preserve** canonical skill trees/hashes, historical fixtures, tax results and
all provider state. **N/A** for a Changeset: root test tooling only.
Cooper requested a local-thread handoff after this slice on 4 October. Stop at
the committed/pushed handoff; the remaining approved work stays incomplete.
Recover by reverting this slice; no provider operation was performed.

The [skill-test receipt](../../documentation-audit/clean-slate-foundation/2026-10-04-skill-test-boundaries.json)
records 21 retained tests, 77 actual CLI cases, all tests, full verification and
build. Resume using the [local continuation prompt](clean-slate-local-handoff.md);
the approved overall goal is unfinished, and cloud execution stops for handoff.

## Local T002 Quality-workflow continuation

Resume locally from the complete handoff revision `4fb6bc6`. Live readback on
4 October confirms draft PRs #88–99 remain open and their latest hosted Quality
checks passed, including #99 run `37178632478`. DEV-72 remains In Review and
DEV-73 remains In Progress. Preserve native relations: DEV-76 depends on both
DEV-74 and DEV-75. No newer Medicare scope decision was found. The approved
end-to-end DEV-73–81 goal remains active; the earlier cloud pause is history.

The pinned Bun 1.4.2 frozen installation passed locally. The actual installed
Oxlint binary reports 1,505 strict diagnostics when all eleven rules are applied
to owned paths before host/fixture qualification. This is a provisional inventory,
not a defect count; command admissions and intentional fixtures are included.

Migrate the Quality-workflow policy and release-boundary tests to Bun-hosted
Effect Vitest. Scope owns temporary copies, child processes and the ephemeral
loopback server. Preserve exact relative links; the installed FileSystem.stat
follows them, so readLink distinguishes links from ordinary files. Only host
EINVAL from readLink admits copying an ordinary file; all other errors fail.
Replace native mutable syntax walks and unchecked lookups with immutable
traversal, persistent membership and checked Array/Record reads. Typechecking
exposed previously unverified record access, effect error/context inference and
non-empty fixture arrays; correct the owners without loosening types.

Enable all eleven rules for `tools/quality-workflow/**`, one exact command
runtime admission, real CLI path fixtures and a focused type project in root
verification. Retain all 18 policy cases and all six actual-command mutation
oracles; add a safe named-error check for rejected workflow shapes. No tracked edits may overlap those isolated-clone checks.

Documentation impact: **Change required** for root commands/type project, lint
scope and fixtures, tooling/controls standards, testing architecture, this active
plan and its dated receipt. **Preserve** workflow permissions, canonical skill
trees/hashes, release mutation corpus, package exports, tax results and provider
state. **N/A** for Changesets, public docs and runbooks: root test tooling changes
no versioned package surface or operational procedure. Recover by reverting the
complete slice. DEV-73 remains unfinished until all its remaining paths and
semantic reviews are qualified; then continue DEV-74–81 in accepted order.

Local qualification exposed Turbo 2.11.7 automatically appending a managed
AGENTS.md block. Restore the canonical router and use its documented
`agentGuidance: false` configuration to prevent later checks changing tracked
source. The existing task guidance and provider authority remain unchanged.

The [Quality-workflow receipt](../../documentation-audit/clean-slate-foundation/2026-10-04-quality-workflow-boundaries.json)
records this slice's local checks and remaining limits. It is a DEV-73 progress
checkpoint, not completion of the full enforcement or later rebuild.

Local Quality-workflow qualification passed: frozen install, 80 actual CLI lint
cases, all repository tests, 20 Quality tests (including the six real-command
mutations), full verification, 21 skill tests, two Chromium Atom lifecycle tests
and the 15-task build. The canonical AGENTS router remains unchanged after
those checks. No package, tax result, canonical skill or hosted workflow changed.

## Local T002 JavaScript lint binding policies

Continue from `b3e2aaf`; hosted Quality run `37180562303` passed on that exact
draft #100 revision. Migrate the binding tracker and Bun, Effect, MDX and
package policies to persistent membership/maps, checked reads and immutable
walks. Oxlint owns a separate synchronous listener for each rule and source
file. A Ref owns genuine changing bindings or import observations; synchronous
MutableRef updates replace immutable values without executing an Effect.

Effect 4 structurally hashes ordinary objects. The first direct HashMap
experiment over the host's cyclic AST did not finish promptly and was stopped.
Use a local Hash/Equal identity wrapper around syntax-node and lexical-variable
keys instead. It preserves the old native Map identity contract without
modifying host objects or structurally comparing their fields. The actual
CLI tests now check exact warning counts for import aliases, destructuring,
same-named local parameters, clearing reassigned bindings and inline try/catch
callbacks. Correct HashSet size through its public accessor. Normalise optional
predicate results to booleans: installed Effect findFirst also accepts Option
selectors and an undefined predicate result is invalid.

Enable all eleven canonical rules for those exact JavaScript policy files and
their scoped canary; no new runtime or mutation exception is added. The larger
TaxKit route/decoder policy and remaining owned paths stay pending in T002.

Documentation impact: **Change required** for lint configuration/corpus,
tooling standards, task evidence, this plan and its dated receipt. **Preserve**
tax/package behaviour, all old adversarial cases, canonical skill fingerprints,
workflow permissions and provider state. **N/A** for Changesets, public docs
and runbooks: only root checking policy changes. Recover by reverting this
complete slice. The [binding-policy receipt](../../documentation-audit/clean-slate-foundation/2026-10-04-lint-binding-policies.json)
records checks and limits; DEV-73–81 remain active and unfinished.

Local qualification passed the frozen install, 88 actual CLI cases, all tests,
15-task build and full verification, including all six isolated release mutations.
Unchanged package/app build, type and Chromium checks reused matching cache
entries. Final documentation and format checks passed. This establishes the
five named JavaScript owners only; it does not close T002.

## Local T002 TaxKit JavaScript route and decoder policy

Continue from `abba51b` and draft #101, whose exact hosted Quality run
`37181078867` passed. Finish strict coverage for `taxkit-rules.js`: use persistent
static membership, checked syntax reads, immutable parent traversal and folds
for canonical imports, named consumers, restore calls and warning deduplication.
Keep pure analysis free of Ref accumulators. Per-file host listeners alone own
changing observations. Shared reference-identity keys preserve AST/consumer
identity; preserve first-consumer order for duplicate-restore warnings.

Reuse the lexical binding tracker for Schema imports, declaration/destructuring
aliases and assignments; retain conservative decoder-name rejection and all
old negative/positive cases. Add actual-command checks for assigned decoder
aliases, root namespace aliases and separate file lifetimes in one process.
The exact rule-options ingress has one owning Schema and a defensive fail-closed
listener. The malformed-config test confirms Oxlint rejects missing options
through metadata before constructing that listener; do not attribute that
early failure to the defensive Schema fallback.

The retained route corpus caught invalid Option selectors in the first rewrite:
installed Effect 4 Array.filterMap consumes Result. Correct to Result selectors,
preserving each assertion and diagnostic count. The whole old corpus then passes.

Documentation impact: **Change required** for lint scope/ingress, shared AST
ownership and CLI corpus, tooling/testing owners, task evidence, this plan and
dated receipt. **Preserve** canonical skills, existing route/decode adversarial
oracles, tax/package behaviour and all provider state. **N/A** for Changesets,
public docs and runbooks: root checking policy only. Recover by reverting this
complete slice. The [route-policy receipt](../../documentation-audit/clean-slate-foundation/2026-10-04-lint-route-policy.json)
records qualification and limits. Remaining repository paths, static JavaScript
qualification and the complete T002 semantic/gap audit remain unfinished;
continue DEV-74–81 after the accepted dependencies are satisfied.

Local frozen install, all 92 actual CLI tests, complete repository tests,
15-task build and full verification passed after final test cleanup. Four
one-operation test generators now return their existing Effects directly.
The verification graph passed 21 skill cases and all 20 Quality cases, including
six actual-command mutations. Unchanged package/app and browser tasks reused
matching caches. Root `test` separately owns the CLI corpus; `verification`
does not invoke it. The earlier binding receipt's wording about fresh corpus
proof refers to its separate successful test commands, not an extra invocation
inside `verification`. Final receipt-only docs/format checks precede commit.

## Local T002 enforcement canaries and verifier mutations

Continue from `9b6860e` and draft #102. The provisional installed-CLI inventory
with current exact admissions preserved reports 1,295 strict diagnostics across
remaining owned paths. It includes legacy hosts and fixtures, is not a defect
count and is not directly comparable with the earlier inventory configuration.

Qualify canonical assignment/method exceptions with eight actual CLI canaries.
Only one generated synthetic host may assign `host.value` or call `host.push`;
its neighbour and other targets/methods/receivers stay rejected, as do loops.
These test-only exceptions grant no production mutation authority. Fixture
callbacks avoid Unicorn's separate immediate-mutation restriction rather than
turning it off. Keep every other rule active.

Add four isolated mutations of copied `oxlint.config.ts` and run the real whole
`test:oxlint:task` verifier for each: required rule removed, rule disabled,
assignment target broadened, method broadened. A separate non-empty owning
Schema admits only named modes; assert all four occur once in order. Fix the
target and command in the runner, preserve exact mutation searches, expected
failure identity and recovery. Restore the copied config between cases and
scope all temporary files/processes. Do not edit tracked source while these
copy-based checks run. Preserve all six old release mutation oracles and the
existing five-control registry.

Documentation impact: **Change required** for lint config/corpus, strict mutation
Schema/runner, tooling/controls/testing owners, task evidence, this plan and
dated receipt. **Preserve** production admissions, canonical skill hashes,
existing control/release corpora, tax/package behaviour and provider state.
**N/A** for Changesets, public docs and operational runbooks: root checking
proof only, with no new provider/release procedure. Recover by reverting this
complete slice. The [enforcement receipt](../../documentation-audit/clean-slate-foundation/2026-10-04-enforcement-canaries.json)
records proof and limitations. Remaining path migrations, static JavaScript
qualification and semantic/gap review remain pending; DEV-73–81 stay active.

Local qualification: pinned frozen install, 100 actual CLI tests, complete
repository tests, 15-task build and full verification passed. Quality proof
contains 21 cases and ten isolated failure mutations (six retained release,
four strict settings); 21 skill cases passed. Unchanged app/package/browser
tasks reused matching caches. Vitest shortened the first expected rule name;
a stable assertion message corrected failure identity without changing the
rule-membership check. Parent #102 hosted Quality passed at exact `9b6860e`
(run 37181658155). Final receipt-only docs/format checks precede commit.

## Local T002 lexical policy gaps

Continue from `852d246` and draft #103. An actual installed-CLI probe in
calculator source found no native-collection diagnostic for renamed weak
constructors, no write diagnostic for Object/Reflect, and no runner-reference
diagnostic for an exported Effect runner. The file did have unrelated style
findings; this is evidence of those specific missing checks, not a combined
baseline acceptance claim.

Retain the canonical skill asset. Extend the existing native-collection rule
through shared lexical tracking and add focused Object/Reflect write and
runner-reference owners. Writer captures, callbacks, forwarded methods and
nested destructured exports stay rejected. One exact new test decoding
admission owns the external CLI report Schema; no production decoder
admission changes. Recognise configured built-ins only when unresolved
or in the host's global scope without local definitions. Read references
remain distinct from declarations and write-only bindings. Persistent maps
index the existing host Reference objects; no syntax node is modified.
The installed Oxlint Scope/Variable/Reference declarations own those fields.

Direct runner calls retain their existing policy. Captures, callback use,
destructured exports and forwarded function references have a separate
policy; both share exact existing runtime boundaries. The installed Effect
runner family includes callback/context-taking variants, and Node runtime
imports join Bun runtime imports. Apply new native-collection, object-write
and reference checks to the already migrated strict paths. Other path
qualification is pending; do not add broad exclusions to make it appear done.

Documentation impact: **Change required** for lint owners/config, CLI corpus,
tooling/testing owners, this plan, task evidence and dated receipt. **Preserve**
canonical skills, existing CLI counts, runtime-boundary identity, tax/package
behaviour and provider state. **N/A** for Changesets, public docs and runbooks:
root checking policy only. Recover by reverting the complete slice. The
[lexical gap receipt](../../documentation-audit/clean-slate-foundation/2026-10-04-lexical-policy-gaps.json)
records proof and limitations. Readonly class/domain contracts, complete path
migration, static JavaScript checking and semantic review remain unfinished.

Local qualification passed: pinned frozen install, all 126 actual CLI cases,
complete repository tests, 15-task build and full verification. Quality proof
retains 21 cases and all ten isolated mutations; 21 skill cases passed.
Unchanged app/package/browser tasks reused matching caches. Parent #103 hosted
Quality passed at exact `852d246` (run 37182416078). A duplicate syntax-name
import was removed after the actual CLI rejected plugin loading; the final
corpus passed. Final receipt-only docs/format checks precede commit.


## Local T002 documentation checking tools

Continue from `9fdc16e` and draft #104. Its hosted Quality run 37183144873
passed at that exact revision. Documentation and runbook inspections now use
persistent maps/sets, ordered pure collection operations and checked optional
reads. Optional regular-expression captures are explicitly absent when the
host returns an undefined value; this preserves unfiltered command checking
and quoted metadata. Preserve all existing findings and accepted source bytes.

Both executable files use Effect CLI and provide Bun services only at their
outer execution boundary. Failed policy receipts fail the command after the
report is written. Hashing remains the same SHA-256 operation, with a named
safe error at the host Promise boundary. Tests use Effect Vitest and scoped
platform child processes. The test scope removes its exact generated document
and temporary runbook copy on completion or interruption. Runtime and Bun API
permissions formerly used by these tests are removed. Only the two named
executables receive canonical runtime admissions; exact test record encoding
and JSON representation admissions do not admit runtime execution.

Documentation impact: **Change required** for root commands, strict selectors,
tests, tooling/testing owners, the documentation router's command description,
this plan, task evidence and dated receipt. **Preserve** canonical skill assets,
the runbook contract, all five runbooks and historical packets, tax/package
results, dependency lock and provider state. **N/A** for Changesets and public
content: repository checking tools only. Recover by reverting the complete
slice. The [documentation-tools receipt](../../documentation-audit/clean-slate-foundation/2026-10-04-documentation-tools.json)
records qualification and remaining limits. DEV-73 and later tasks remain
unfinished; continue remaining owned paths and semantic review.

Focused qualification: 41 documentation cases (36 preserved, five added) and
130 real CLI cases, including all eight documentation source/test files,
rejecting a neighbouring policy file and exact command admission assertions.
Actual root JSON and runbook commands passed; five runbooks/eleven commands
were inspected and no operational command was executed. Unknown options keep
Effect CLI's bounded usage output and a nonzero exit. Pinned frozen install, complete tests and the 15-task build passed. Full
verification passed after the optional Boolean default correction: 21 Quality
cases/all ten isolated mutations and 21 skill cases. Matching unchanged-input
build/package/browser caches were reused. Final receipt-only docs/runbook,
format and diff checks precede commit.


### Documentation-tools hosted recovery

Draft #105's first hosted Quality run 37184339726 failed at exact `09415cf`:
Vitest could not load `@taxkit/scripts/release-readiness` before the ignored
package build existed. Local prebuilt files hid that requirement. Reopen this
slice's host qualification without changing its document/runbook rules.
The earliest owner is `tools/vitest.config.ts`: Vite's server resolver requires
its own `source` export conditions. A package-inlining attempt did not solve
the failure and was removed. A fresh archived copy with frozen offline install
and no scripts dist passed all 41 documentation tests after that correction.
The existing isolated Quality source-copy test now runs those documentation
tests before any build, using only temporary local Git metadata for inventory.
This prevents the same false local acceptance from relying on prebuilt files.
**Change required** for test configuration, the existing Quality owner, testing
and tooling pointers, this plan and reopened receipt. Historical provider
records and package exports remain **Preserve**. Final requalification precedes
an additional tested commit on #105; no force push or external operation.


Hosted-recovery local requalification passed: complete tests, the 15-task build
and full verification, including 21 Quality cases/all ten isolated mutations
and the fresh source-only documentation check. Matching unchanged-input
package/build/browser caches were reused. The initial hosted failure remains
recorded; the successor hosted result is separate. Final receipt-only
checks precede the corrective commit on the same draft.


## Local T002 retained evaluation tools

Continue from corrected #105 at `adc79d2`. Both evaluation owners now use
persistent maps/sets, checked optional values and Effect array operations.
Array equality retains ASCII sorting without unchecked JSON comparisons.
Missing aggregate hashes now fail with the owning error before text is rendered.
Historical skill constants derive their type from the owning Schema.
SHA-256 host work moves to two named input operations with safe typed errors;
known text/byte vectors preserve empty, ASCII and UTF-8 digests. CLI composition
and Bun services stay at the two separately admitted executables. Raw error
stacks are suppressed after the existing bounded repair message. Ordinary
source/test files receive no runtime permission.

Before migration, HGI-206 stopped at its missing historical active-owner source;
the foundation epoch stopped at its canonical skill receipt projection. Those
nonzero failures remain expected. Historical evidence is not rewritten to make
it accept the clean-slate graph. Policy-only fixtures decode retained records
and use declared hashes to check complete accepted bindings and three owning
failure identities. They do not claim fresh source or accepted current-epoch
proof. The earliest durable epoch owner now makes that distinction explicit.

Documentation impact: **Change required** for checking code, root focused
commands/verification, strict selectors and test-only representation/byte
admissions, tooling/testing and epoch/router owners, this plan, task evidence
and dated receipt. **Preserve** canonical skills, all historical evidence JSON,
scenario/candidate IDs, tax/package results, package exports, lock and provider
state. **N/A** for Changesets, public content and operational procedures:
repository checking tools only. Recover by reverting the complete slice.
The [evaluation-tools receipt](../../documentation-audit/clean-slate-foundation/2026-10-04-evaluation-tools.json)
records checks and limits. DEV-73 and downstream tasks remain unfinished.

Focused checks passed: 16 evaluation cases (three retained, thirteen added)
and 134 lint-suite cases using actual CLI fixtures and configuration assertions.
Frozen install, complete tests, the 15-task build and full verification passed.
This includes 21 Quality cases/all ten isolated mutations, 21 skill cases and
the fresh source-only documentation check. Matching unchanged-input package,
build and two Chromium check caches were reused. Final docs/runbook checks
precede commit; hosted proof remains separate.


## Local T002 deployment input and upload-file tools

Continue from #106 at `d95ab45`. Retained file JSON uses typed Schema decoding;
SHA-256 uses Effect Crypto with the same bytes and safe target errors. The
upload program uses checked mode lookups, ordered Effect traversal and persistent
allowlists. The original modes, required files, content checks and real-path
containment remain. The upload command has one exact canonical runtime admission;
its obsolete raw Bun permission and the memo test's execution admission are removed.
Source-contract path/source/finding types derive from owning Schemas. Pure
ordered findings replace mutation; checked missing reads use empty source so
required patterns fail. The native memo test uses scoped ordered Effect work.

The test command now uses Bun-hosted Vitest with source resolution. All 94
retained cases remain; only the migrated suites use `@effect/vitest` in this
slice. The other suites retain assertions but remain pending strict migration.
Added input/hash/error, empty-source and upload path tests execute only within
scoped temporary files. Lint scope covers the nine migrated files and their
rejected neighbour, not the whole deployment directory.

Documentation impact: **Change required** for tool README, code/test/command
owners, strict selectors, testing/tooling pointers, this plan/task ledger and
the [dated receipt](../../documentation-audit/clean-slate-foundation/2026-10-04-deployment-artifacts.json).
**Preserve** deployment modes/resource identities, source-contract oracles,
all historical receipt and capture bytes, workflows, runbook procedures, package
exports, lock, canonical skills, retained tax results and provider state.
**N/A** Changesets, public content and operational procedure edits: root local
checking tools only. Recover by reverting the complete slice.

Before changes, the actual reviewed strict selectors produced 82 findings across
eight source/test files; this is an incremental observation, not a repository
defect count or a trend. Focused types/lint passed, with 108 deployment-tool
cases (94 retained, fourteen added) and 137 lint-suite cases. Frozen install,
complete tests, the 15-task build and full verification passed, including
21 Quality cases/all ten isolated mutations, 21 skill cases and the fresh
source-only documentation check. Matching unchanged-input package/build and
two Chromium proof caches were reused. Final documentation checks precede commit. #105's corrected hosted Quality passed at
`adc79d2` (run 37184994613); #106 hosted proof remains separate.


## Local T002 deployment credential and workflow-input tools

Continue from #107 at `cc4935b`. Credential file JSON is restored once, then
checked by the existing owning Schema; malformed cache fallback and unreadable
input retain separate safe outcomes. Token selection uses checked optional
values and preserves most-specific scope independently of iteration order.
Child-environment filtering uses persistent checked entries. Workflow-input
JSON and optional PR restore use typed Schema/Option ingress.

The local host restores the complete flat environment through Effect
ConfigProvider, including empty values and repeated underscores, and emits
safe typed read/shape errors. The former raw environment exception in the
source-contract checker is removed. Three exact executable runtimes are admitted;
their obsolete raw Bun permissions are removed. Four more suites use scoped
`@effect/vitest`. The generated raw fake Doppler program is replaced by a tracked
checked executable and owning receipt/config Schemas. Tests invoke it through a
scoped symlink with synthetic values and env-file loading disabled. Its argument
read and runtime permission are exact test-only admissions. No Doppler/provider
command is run. A negative child exit must produce the owning process-exit error.

Before edits, the actual added strict scope reported 50 findings; this is a
scoped observation, not a whole-repository count or trend. Existing assertions
remain, including malformed cache fallback, account matching, hidden raw token,
fixed child arguments and unrelated-env retention. Added tests check environment
restoration/errors, cached precedence, unreadable input, scalar JSON, empty token
and most-specific scope in both orders. Actual CLI fixtures cover the eighteen
adopted files, their rejected neighbour and four exact runtime admissions.

Documentation impact: **Change required** for boundary/test/fixture/code/config
owners, tool README, testing/tooling, this plan/task ledger and the
[dated receipt](../../documentation-audit/clean-slate-foundation/2026-10-04-deployment-credentials.json).
**Preserve** credential formats, original cache precedence and scope rules,
resource/workflow/runbook authority, all saved evidence/capture bytes, package
exports, lock, canonical assets and retained tax results. **N/A** Changesets,
public content and operational-procedure edits: root local tools only.
Focused types/lint passed, with 125 deployment-tool cases (108 retained from
#107, seventeen added) and 143 lint-suite cases. Frozen install, complete
tests, the 15-task build and full verification passed, including 21 Quality
cases/all ten isolated mutations, 21 skill cases and the fresh source-only
documentation check. Matching unchanged-input package/build and two Chromium
proof caches were reused. Final documentation checks precede commit. Recover
by reverting the slice; these changes alter no provider state. #107 hosted
Quality passed at exact `cc4935b`, run 37185846915. DEV-73 and downstream tasks
remain unfinished.


## Local T002 workflow and saved-evidence checks

Continue from #108 at `b853070`. Workflow-source tests use scoped Effect work,
checked step lookup and ordered assertions; all eighteen original cases remain.
The beta.80 text parser uses checked regex-group/resource/summary lookup. Its
JSON writer reuses the receipt's owning field Schemas in the exact retained
canonical order, so existing SHA-256 comparisons do not change their bytes.
The runtime encodes once for writing and hashing, with safe typed configuration,
read/decode/write failures. The plan verifier and saved-evidence writer consume
that same checked encoding. Saved inventory/version selection now handles
missing values explicitly; absent-stage Option becomes the original workflow
text only at egress. Receipt/protocol nulls, aliases and field order remain.

All eleven strict rules apply to ten adopted files and a rejected neighbour.
Three executable admissions are exact; the plan test's execution admission and
evidence runtime's obsolete raw Bun admission are removed. Existing source
contracts admit only their exact old host call or the exact safe-error-reporting
variant. All retained workflow, eleven plan/capture and six saved-evidence cases
remain, including five historical digests and eight accepted cross-references.
Twelve added cases check ambiguous/missing inventory, absent-stage output,
mismatched/extra plan actions, CRLF no-op teardown and bounded typed host failures.
Focused types/lint, 137 deployment-tool cases and 148 actual lint-suite cases
have passed. Frozen install, complete tests, the 15-task build and full
verification passed, including 21 Quality cases/all ten isolated mutations,
21 skill cases and the fresh source-only documentation check. Matching
unchanged-input package/build and two Chromium check caches were reused.
Final documentation checks precede commit; hosted proof remains separate.

Documentation impact: **Change required** for code/test/config owners, tool
README, tooling/testing, this plan/task ledger and the
[dated receipt](../../documentation-audit/clean-slate-foundation/2026-10-04-deployment-workflow-checks.json).
**Preserve** all historical receipt/capture bytes, original oracles,
resource/workflow/runbook authority, package exports, lock, canonical assets
and retained tax results. **N/A** Changesets, public content and operational
procedure edits: root local tools only. Recover by reverting the complete
slice; no provider, registry or deployment state changes. #108 hosted Quality
passed at exact `b853070cdc394be6d0facfde4572c806d99d8847`, run 37186826183.
DEV-73 and downstream tasks remain unfinished.


## Local T002 deployment automation receipt policies

Continue from #109 at `0b195427`. The saved-receipt checker uses persistent
maps/sets, checked selections and pure findings; temporary flags and pushed
arrays are removed. Exact principal/environment/stage lock, candidate, plan,
provider/hosted identity, workflow-run and input checks remain. Finding sort
order retains the original locale comparator. Missing receipt/evidence is an
explicit optional failure; receipt nulls remain part of the existing contract.
Provider variants use their owning Schema predicates. Aggregate evidence types
now derive from a Struct that reuses all owning field Schemas.

The command reuses the qualified file JSON/SHA-256 boundary with its own safe
input errors. Serial traversal retains receipt/screenshot read order and later
same-ID map precedence. Nonempty findings use the owning array refinement.
Eight retained automation cases now use Effect Vitest; missing fixture selections
fail instead of silently returning. Five added command cases check unchanged
not-established counts, safe missing/malformed/excess input and the exact finding
for an incomplete control register. Six adopted files and their rejected
neighbour receive all eleven strict rules; one executable runtime admission is
exact, with the former raw Bun/decode and test execution exceptions removed.

Documentation impact: **Change required** for receipt/runtime/test/Schema/config
owners, README, tooling/testing, this plan/task ledger and the
[dated receipt](../../documentation-audit/clean-slate-foundation/2026-10-04-deployment-receipt-policies.json).
**Preserve** all saved receipt/capture bytes, register authority/identities,
source-contract oracles, workflows, runbook procedures, package exports, lock,
canonical assets and retained tax results. **N/A** Changesets, public content
and operational procedure edits: root checking tools only. Recover by reverting
this complete slice; no provider, registry or deployment state changes.

Focused types/lint, 142 deployment-tool cases (137 retained, five added), 151
actual lint-suite cases and the retained-record command have passed. Frozen
install, complete tests, the 15-task build and full verification passed, including
21 Quality cases/all ten isolated mutations, 21 skill cases and the fresh
source-only documentation check. Matching unchanged-input package/build and
two Chromium check caches were reused. Final documentation checks precede
commit; hosted proof remains separate. #109 hosted Quality passed at exact
`0b1954276b335791783e885a238bdd8d294686b6`, run 37187566467. The broader retained
plan/digest policy, provider inventory service and root checks remain pending,
as do other T002 owners and DEV-74–81. DEV-73 remains in progress.


## T002 hosted lint-fixture timing recovery

Hosted #110 Quality failed at `1d65240dc148069eab52f9d7232973499401c4c6`,
[run 37188315652](https://github.com/crcorbett/taxkit/actions/runs/37188315652).
The accepted credential group launched eighteen actual lint processes within
one ordinary five-second test deadline; the other 150 lint cases passed.
The retained-record work was saved in local stash
`48c8d05ce87b60843ae70c53426a9129b515fc18` before updating #110.

Accepted source files now run as separate Effect tests, each retaining the
ordinary deadline and exact one-file/exit-code/namespace assertions. Required
negative fixtures and deliberate verifier faults retain their original checks.
The scoped child process still owns cleanup after interruption. All 217 lint
cases pass. Frozen install (790 installs/1020 packages, unchanged lock), complete
tests, the 15-task build and full verification passed, including 142 deployment
tool cases, 21 Quality cases/all ten deliberate faults, fresh source-only
documentation, 21 skill cases and 16 evaluation cases. Matching package/build
and both local Chromium check caches were reused. Documentation, runbook,
formatting and diff checks passed; updated hosted proof remains separate.

Documentation impact: **Change required** for the fixture owner, tooling/testing,
this plan/task ledger and the
[dated timing receipt](../../documentation-audit/clean-slate-foundation/2026-10-04-lint-file-deadlines.json).
**Preserve** all lint policies and assertions, rejected-fixture/fault coverage,
package exports, lock, historical receipts and tax results. **N/A** Changesets,
public content and runbook/provider procedures: root test scheduling only.
Recover by reverting this slice. DEV-73 and DEV-74–81 remain unfinished.


## Local T002 retained deployment record proof

Continue from the corrected #110 at
`a82922496d94a24670d08faa02f6a1584a143406`.
The broader receipt policy now uses persistent collections, checked selections
and ordered pure findings. All original authority, candidate, plan, provider,
hosted, screenshot, teardown and rollback guards remain. Expected path types
come from the owning rollback receipt representation. Internal provider equality
uses the owning Schema rather than temporary serialised fingerprints. Actual
saved-record proof uses one exact JSON egress and controlled Crypto, preserving
the original locale key order, numeric keys and JSON primitive/array bytes.
Encoding/digest failures carry safe closed reasons. Callers sequence those
Effects, retaining receipt and finding order; the command reports bounded errors.

Historical policy tests use Effect Vitest. The existing 142 tool cases
remain; thirteen added cases check fixed fingerprints, object/array order,
non-finite input, safe Crypto failure and provider mismatches that outer fields
alone would miss. Six adopted files and a rejected neighbour receive all eleven
strict rules; the command has its sole exact runtime admission. Its obsolete raw
Bun permission and the policy test's execution permission are removed.
The first local qualification passed with 155 tool cases, 154 grouped lint cases
and full verification. After restoring this work onto the corrected parent,
qualification passed with 155 tool cases, 225 per-file lint cases, frozen install
(790 installs/1020 packages, unchanged lock), complete tests, the 15-task build
and full verification. All 21 Quality cases/ten deliberate faults, fresh
source-only documentation, 21 skill cases, 16 evaluation cases and both local
Chromium suites passed. Matching package/build/browser caches were reused.
Final docs/runbook/format/diff checks precede commit; hosted proof is separate.

Documentation impact: **Change required** for policy/Schema/runtime/test/egress,
lint config/fixtures, README, tooling/testing, this plan/task ledger and the
[dated receipt](../../documentation-audit/clean-slate-foundation/2026-10-04-retained-deployment-proof.json).
**Preserve** historical receipt/capture bytes and original guard/finding order,
workflow/register/runbook authority, package exports, lock, canonical assets
and retained tax results. **N/A** Changesets, public content and operations:
root local checks only. Recover by reverting the complete slice; provider and
registry state are unchanged. Full qualification and hosted proof are separate.
Provider inventory and other T002 owners, then DEV-74–81, remain unfinished.


## Local T002 inventory and remaining workflow checks

Continue from #111 `391d513158f0a40c9922858a614a573d2779e68a`;
its hosted Quality passed in run 37189852276. The inventory service now exposes
one checked named read. Native State/Worker services are private to the live
Layer and acquired once. Each external reply is checked beside its read with
safe named failures. Preserve bounded concurrency, stack filtering, the first
matching ownership tag, exact agreement findings and saved report bytes.
A test Layer substitutes a checked report. Configuration has one owning Schema;
report JSON encoding and safe write failure have explicit owners. The remaining
workflow proof/run/teardown commands use checked selections, explicit typed
failures and bounded runtime reporting, retaining original receipt guards.

Eleven adopted files receive the full strict policy, their rejected neighbour
fails, and four commands alone have exact runtime admissions. Remove obsolete
Bun/process and historical inventory-test execution permissions. The existing
155 deployment-tool cases remain; 21 added cases cover native service ingress,
provider failure redaction, named requests, other stacks/first tag semantics,
parallel interruption cleanup, exact pretty JSON, test-Layer substitution,
write refusal and Schema-backed Config/default/empty/CI behaviour. Focused
176 tool cases, 241 actual lint cases and type/lint checks pass. Frozen install
(790 installs/1020 packages, unchanged lock), complete tests, the 15-task build
and full verification passed. All 21 Quality cases/ten deliberate faults, fresh
source-only documentation, 21 skill cases, 16 evaluation cases and both Chromium
suites passed. Matching package/build/browser caches were reused. Final docs,
runbook, formatting and diff checks precede commit; hosted proof is separate.

Documentation impact: **Change required** for inventory service/live/test/egress/
Schema/runtime, workflow command/source checks, lint config/fixtures, README,
tooling/testing, this plan/task ledger and the dated inventory receipt.
**Preserve** saved receipts/capture bytes, report representation, original guard
and finding order, workflow/register/runbook authority, package exports, lock,
canonical skills/assets and retained tax results. **N/A** Changesets, public
content and provider operations: local root tools only. Recover by reverting
this complete slice. DEV-73 and DEV-74–81 remain unfinished; other root scripts,
checked JavaScript, SDK/app/infrastructure and readonly/Schema/helper/lifetime
review remain. No inventory command or current provider read has been run.


## Local T002 compiler-checked lint implementation

Continue from #112 `ae8279c899e93246cbb4f7e3289ffec274bec3b2`;
its hosted Quality passed in run 37190926549. The six owned JavaScript policy
files now use TypeScript and the existing compiler check. A shared type owner
derives native listener/context/source/node/variable types from Oxlint's public
RuleTester contract. Keep host object identity, readonly route observations,
scoped Ref updates and persistent collections. Source imports use the actual
`.ts` files; the lint-tool no-emit project admits those imports. The loader,
strict selector, options-decoding admission and CLI fixtures follow the new paths.
Type narrowing handles node variants, optional source fields and native dynamic
imports. Original required rules, host containment, error messages, alias/shadow,
route, metadata and negative fixtures remain. Added map/equality tests protect
reference identity for matching-looking and unrelated host objects.

Compiler, focused/root lint and all 245 actual lint tests pass (including
two identity cases and two added accepted files). Frozen install (790 installs/
1020 packages, unchanged lock), complete tests and the 15-task build passed.
The initial full check correctly failed because Git still tracked the old deleted
JavaScript paths. Record the renames in the local index; no checker permission
changed. Full verification then passed, including 21 Quality cases/all ten
isolated faults, fresh source-only documentation, 21 skill cases, 16 evaluation
cases and both Chromium suites. Matching package/build/browser caches reused.
Final docs/runbook/format/diff checks precede commit; hosted proof is separate. No package interface,
canonical skill or tax result changes. Documentation impact: **Change required**
for the implementation/type/test/config owners, tooling/testing, this plan/task
ledger and the dated typed-lint receipt. **Preserve** completed SPEC/tasks and
historical evidence with their qualified JavaScript paths, canonical skills,
package exports, lock, operational procedures and tax results. **N/A** Changesets,
public content and provider operations: root local checking only. Recover by
reverting this complete slice. DEV-73, remaining release scripts, SDK/app/
infrastructure and semantic/lifetime review, then DEV-74–81, remain unfinished.


## Local T002 release-script boundaries

Continue from #113 `422d8576f2e2f94bb28744f98dead646e509ac70`;
hosted Quality passed in run 37191992734. The actual installed lint command
initially reported 78 findings across 17 release-script files; that is a scoped
observation, not a whole-repository defect count. All eleven rules now apply to
package source/tests/config. Two exact command-runtime admissions replace no
other rules. Actual accepted-file tests, a rejected neighbour and exact-selector
assertions qualify that scope.

The live command Layer captures native process, filesystem, path and Crypto
services once and exposes named `execute` with no per-call service requirement.
Each output stream owns a private Ref; pure immutable transitions preserve the
original marker expression, chunk lookahead, redaction, full detail and bounded
excerpt behaviour. Sequential Effect accumulation keeps the nine-check order,
true exit/failure states, last successful step and stops before later commands.
Raw CLI arguments are decoded once. Native Crypto hashing maps failures to a
safe named error; Schema-owned artifact/receipt fields, persistent uniqueness,
checked selections and outbound encoding retain saved bytes and immutable
attempt/presentation rules. Retained accepted packets cannot become a current
candidate; historical evidence and all tax results remain unchanged.

All 59 release-script cases pass (42 retained plus 17). All 266 real lint cases
pass (245 retained plus 18 accepted files, one rejected neighbour and two exact
runtime selectors). Package compiler, root lint and both unused-code profiles
pass. Frozen install checked 790 installs/1020 packages with unchanged lock;
all 22 package test tasks and the 15-task build passed. Final full verification
passed, including 21 Quality cases/all ten isolated faults, fresh source-only
documentation, 176 deployment-tool cases, 21 skill cases and 16 evaluation cases.
Both Chromium suites executed: two web Atom and seven documentation route cases.
Matching unchanged-input build/type caches reused; final docs/runbook/format/diff
and Changeset status checks precede commit. The attempted removal of CLI-test
decoding permission correctly failed its actual acceptance fixture: argument
and UTF-8 decoding still need that reviewed ingress. Preserve that permission;
remove only its unused execution admission. Final narrower config passed again. Controlled native-service tests make no provider requests. Full
qualification is recorded in the
[release-script receipt](../../documentation-audit/clean-slate-foundation/2026-10-04-release-script-boundaries.json).
Documentation impact: **Change required** for package source/tests/README,
strict config/fixtures, narrower production unused-export inventory, tooling,
testing, this active plan/ledger, receipt and the private-package patch Changeset.
**Preserve** the nine command arguments/order, three public handoff Schemas,
package export map, historical evidence, failed attempts, operational procedures,
canonical skills, dependency lock and calculator results. **N/A** generated public
content, HTTP contracts and provider state: local command checking only. Recover
by reverting the entire slice. DEV-73 and SDK/app/config/infrastructure and
semantic/lifetime review remain unfinished, followed by DEV-74–81. Medicare
correction still awaits Cooper's bounded scope decision.


## Local T002 SDK caller-owned lifetime

The accepted T004 caller-lifetime requirement is implemented alongside T002
strict SDK source enforcement. The plain entrypoint no longer constructs a
package-global runtime. Each plain client has a private lazy runtime, a closed
Ref and a shared Deferred for cleanup completion. `dispose()` interrupts
startup/calculation work, waits for finalisers and shares its result with
repeated/overlapping callers. Its public Promise signatures contain no runtime
or arbitrary execution callback. One-shot helpers own a temporary Effect scope;
both paths reuse the existing `calculateReport` operation.

The exact private `client.runtime.ts` admits required Promise signatures and
execution, with separate exact selectors. SDK source, type fixtures and both
Vitest configs receive all canonical rules. Native Promise rejection tests use
owning Schema ingress; error-byte tests use exact egress permissions. Canonical
error-constructor policy remains enforced when replacing the inaccurate native
factory rule in two exact tests. Directly imported core is now a production
dependency; the lockfile records that classification and browser-test hosts.

The package README, API/SDK architecture, draft client/error examples and
packed/downstream fixtures own the new lifetime contract. The current packed
journey includes all three retained results and actual client closing. The
major SDK Changeset records the caller's new cleanup responsibility; docs-content
has a patch Changeset. No version application or publication is authorised.
A package-owned Chromium suite executes the same SDK source/lifetime tests;
full verification includes it. Packed installation and browser bundling remain
separate from that browser execution proof.

Qualification passed: 24 SDK tests in Bun and actual Chromium; 288 real lint
cases; frozen 793-install/1020-package graph; complete package test/build tasks;
actual SDK and nine-package downstream tarballs with retained results and
closing; full verification with all ten isolated faults and fresh source-only
checks; web/docs Chromium suites; docs/runbook/format checks; and Changeset
inspection. Matching unchanged-input caches were reused where reported. The
initial build environment and both Knip inventory findings were corrected;
no unused-file/export exception was added. Exact observations are in the
[SDK lifetime receipt](../../documentation-audit/clean-slate-foundation/2026-10-04-sdk-client-lifetime.json).
T002 remains in progress; T004 remains pending because its dependencies, UI and
transport-limit work are unfinished. SDK command migration, other app/config/
infrastructure owners and the complete semantic/readonly review remain next.
Retained results and historical evidence remain unchanged; Medicare correction
still awaits its separate bounded decision.


## Local T002 SDK checking scripts

The three SDK command scripts now receive all canonical strict rules. The
import checker uses Effect FileSystem and child-process services, immediate
manifest decoding, immutable findings and an exact command runtime. It removes
its raw Bun, Promise, console and process-exit permissions. Ripgrep exit 0 is a
match, exit 1 is absence and other exits are operational failures. This retains
the direct-reference claim, separate from the packed/browser graph checks.

The packed and downstream commands use shared manifest Schemas, Schema-derived
records and checked field selections. Staged metadata is decoded once and
encoded through its owning Schema, preserving unrelated fields and absent
optional dependency keys; no JSON-key-order or retained-tarball-byte claim is
made. One-use mapping was inlined. Command scopes close before the next command;
stdout is bounded to 1 MiB and stderr is drained without retention. Operational
errors retain the named step and available exit code without raw native errors
or captured output. Failed folder cleanup fails otherwise successful work and
remains alongside an earlier work failure. Expected-error mapping and reporting
run before closing the folder scope, preserving both causes.

`check-types` now includes the scripts project; its first run found the old
three-parameter Schema type and its unchecked requirement. The obsolete generic
JSON decoder was removed. Native SDK tests include command fixtures, while the
Chromium suite retains its browser-compatible source/lifetime scope. Focused
local compiler, strict lint and all 56 SDK tests pass (24 retained plus 32 new
script cases). The real nine-package consumer and 46-file SDK artifact passed;
final source/full qualification passed after the failure-oracle correction. The previous lifetime
revision `72c32864039779b0a51ee671cec69cbdf5e60487` passed hosted Quality run
`37195752724`; that does not qualify this later script revision.

Documentation impact: **Change required** for SDK scripts/project/command and
native test ownership, exact strict selectors and real CLI fixtures, package
README, API/SDK and testing architecture, packed-consumer runbook, active
plan/T002 ledger, dated receipt and the private SDK patch Changeset. **Preserve**
SDK public exports and lifetime, nine-package closure, concrete packed ranges,
current journey oracles, historical receipts and failed attempts, canonical
skills, dependency versions/lock and all retained tax results. **N/A** generated
public content, HTTP changes and provider state: local checking only. Revert
this complete slice to recover. DEV-73 and app/config/infrastructure and full
semantic/readonly review remain unfinished, followed by DEV-74–81. Medicare
correction still awaits Cooper's separate bounded decision.


The first full verification stopped at the isolated public-export mutation:
removing `TaxKit` still failed the SDK build with exit 2, but the old oracle
expected raw compiler text that the safe command report intentionally omits.
The current corpus now binds the exact `build @taxkit/sdk`/exit-2 diagnostic;
its runner independently fixes all six oracles to their command/target/recovery
contracts. This prevents an edited fixture from weakening its own expected
failure. Historical HGI observations remain unchanged. The failed attempt is
retained in the SDK-script receipt; full requalification follows the correction.


Final qualification passed: frozen 793-install/1020-package graph with unchanged
lock; all 297 real lint cases; 56 native SDK cases; complete 22-task tests and
15-task build; final 46-file SDK and nine-package downstream proof; all 21
Quality cases/all ten isolated faults (213.42 seconds), including fresh
source-only documentation tests; full verification; actual Chromium's 24 SDK,
two web and seven docs cases; both unused-code profiles; docs/runbook/format/diff
and Changeset inspection. Matching unchanged-input caches were reused where
reported. Two unnecessary local Schema exports were made private after Knip
reported them; no unused-code exclusion was added. The
[SDK checking-script receipt](../../documentation-audit/clean-slate-foundation/2026-10-04-sdk-checking-scripts.json)
retains the failed full attempt and corrected oracle evidence. T002 remains in
progress. A fresh expanded canonical probe reports 452 provisional diagnostics
across 376 owned source arguments, with exact permissions preserved; existing
fixture/host cases remain to be qualified and this is not a confirmed defect
count. Continue with API app, documentation app, web and infrastructure paths,
then complete the semantic/readonly review and DEV-74–81 implementation.


## Local T002 API app boundaries

All API app source, command, native test and test-configuration paths now
receive the canonical strict rules. Only `src/index.ts` and the smoke runtime
can execute an application program; actual CLI fixtures qualify their exact
selectors and reject a neighbouring command fixture. The installed stable
Config API's `orElse` catches invalid values as well as absence. The first
settings fixtures exposed that fallback; `Config.option` plus `flatMap` now
uses `PORT` only when `API_PORT` is absent. Invalid present primary ports fail
with a safe settings error. Host trimming, blank fallback and normal defaults
remain; caller providers can be substituted without ambient mutation.

The smoke command has checked settings/arguments and named native HTTP
operations. It reuses the endpoint-owned `HealthResponse` through a new root
export, existing catalog/run Schemas and native HTTP body encoding. Headers
and body decoding share each deadline: 15 seconds for health including retries,
five seconds for other requests. Its OpenAPI projection requires the calculate
path and retains the existing isolated-mutation failure oracle. The external
consumer remains deliberate plain JavaScript outside the checkout, covering
health/catalog/take-home/annual/OpenAPI. Native command services own a 30-second
limit, 1 MiB stdout bound, drained stderr, exact decoded route evidence and safe
reason/available-exit errors. Command scopes stop processes; folder cleanup
failure fails otherwise successful work and remains alongside earlier failure.
Expected-error reporting occurs before final scope closure.

Focused qualification passes: source/script/test compiler projects, all 45
native API cases, all 310 lint cases (297 retained, ten accepted API files,
one rejected neighbour and two exact runtime selectors), actual positive
standalone API smoke and both unused-code profiles. Complete repository verification and the actual failure simulation pass;
independent readback confirms both observed API processes exited, their
folders are absent and smoke port 4173 is available.
The previous SDK-script revision `60db52739b19dddf8301a8363bd0cd7fa0740bb7`
passed hosted Quality run `37197728534`; it does not qualify this later API work.

Documentation impact: **Change required** for API app settings, command/test
ownership, endpoint Schema export and HTTP patch Changeset, app/HTTP READMEs,
API/SDK and testing architecture, lint/config/CLI canaries, current T002 ledger,
active plan and dated receipt. **Preserve** all HTTP wire shapes and route paths,
retained tax rules/results, dependency selections, fixed release graph, current
journey/mutation oracle, historical evidence and canonical skills/digests.
**N/A** public/generated content, operational runbook procedure, workflow and
provider state: commands and consequential authority are unchanged. Revert this
complete slice to recover. T002 remains in progress; continue documentation
app, web, infrastructure and whole semantic/readonly review, then DEV-74–81.
Medicare correction still awaits Cooper's separate bounded decision.


Final API qualification passed: frozen 793-install/1020-package graph (selected
versions unchanged; test dependency declarations recorded), all 45 native API
cases, 310 actual lint cases, complete 23-task tests (17 matching caches) and
15-task build (12 matching caches), actual positive/forced-failure/invalid-port
API checks and independent process/folder/port readback, final 46-file SDK and
nine-package consumer proof, full verification with all 21 Quality cases/all
ten isolated faults and fresh source-only documentation (217.24 seconds),
176 deployment-tool cases, 21 skill cases, 16 evaluation cases and both unused-code
profiles. Chromium passes 24 SDK cases using matching unchanged-input caches and
two web cases in an actual run.
The production unused-export check found the test-only settings-program export;
it is now private and tests compose the same live settings Layer. No exclusion
was added. Final documentation/runbook/format/diff and Changeset checks pass;
the HTTP patch remains pending with the existing major fixed train. The
[API app receipt](../../documentation-audit/clean-slate-foundation/2026-10-04-api-app-boundaries.json)
records failures, recovery and the proof limits. This accepts only this local
API slice; DEV-73 and the overall continuation goal remain unfinished.


## Local T002 documentation import checker

The docs source import checker now uses native FileSystem/Path services, pure
inline TypeScript compatibility-parser inspection, immutable findings and one
exact Bun command runtime. It removes raw Bun/Promise workflows, mutable
findings, direct process exit and raw console permissions. Native list/stat/read
and existence failures have safe closed operation labels. Server/test/generated
owners and non-file entries remain excluded; an empty browser-runtime file is
still rejected. Direct static references and the existing runtime-expression
pattern remain a source-only claim, separate from transitive bundle proof.

The docs test command includes twelve native Effect checker cases. Its compiler
project includes the checker, fixtures and test configuration. Three adopted
files receive the complete canonical rules, with a rejected neighbour and exact
execution selector. The first 315-case lint run caught a missing negative-fixture
selector and duplicated unrelated builtin-rule setting in the runtime selector.
The corrected configuration preserves all assertions and passes all 315 cases
(310 retained, three accepted files, one rejected neighbour, one exact runtime).
Focused compiler, actual source command, native tests and both unused-code
profiles pass. Final frozen install, all 23 test tasks (21 matching caches), all
15 build tasks (13 matching caches) and full verification pass. All 21 Quality
cases include all ten isolated faults and fresh source-only docs (234.05 seconds).
Verification also passes 176 deployment-tool, 21 skill and 16 evaluation cases,
all 24 compiler tasks (22 matching caches), both unused-code profiles and matching
unchanged-input Chromium caches for 24 SDK and two web cases. The frozen graph
reports 792 installs/1020 packages; selected dependency versions are unchanged.

Documentation impact: **Change required** for command/test/compiler ownership,
three pinned-tool declarations and lock metadata, exact lint selectors/CLI
fixtures, docs README, frontend/testing architecture, current T002 ledger,
active plan and dated receipt. **Preserve** source-policy semantics, TypeScript 7
compiler/TypeScript 6 parser selections, route/runtime/bundle behaviour,
public/generated content, tax results, historical evidence and canonical
skills/digests. **N/A** package Changeset (the private docs app is unversioned),
operational runbook/CI procedures and provider state. Revert this complete slice
to recover. DEV-73 remains unfinished, followed by DEV-74–81; Medicare correction
still awaits the separate bounded decision. The API parent is qualified locally
at `be1fcc43cfd9201f209354b317f8182cc3e9fafd` in draft #117; its hosted run
`37199271547` passed for that exact API revision and is separate from this
later checker work. The dated checker receipt records recovered failures and
proof limits; accepting this local slice does not complete DEV-73.


## Local T002 documentation runtime and route tests

The route-result corpus is now a typed native Effect test owner. It retains
success, both expected error types, malformed transport, standalone/composite
defects and interruptions, empty/multiple producer failures and invalid decoded
representations. Owning Schemas construct branded fixtures and native encoders
create the negative representations. No Promise runner, raw loop, constructor
identity assertion or throwing-codec admission remains in this test owner.

The runtime tests acquire the actual private factory and release it through its
native disposal Effect inside a scope. Two concurrent context requests build
content once; the same service/probe is reused, and acquired content is released
after success, failure and interruption. Native FileSystem/Path read the actual
production owner for the retained single-runtime/single-probe assertions. The
factory alone has exact creation permission; tests have no runtime permission.
The server config uses package source for both ordinary/server resolution and
includes the typed route corpus; the root docs test invokes that owner once.
All 19 focused server cases and 321 actual lint cases pass before final
repository qualification. Earlier source/compiler tests caught a nonexistent
TaggedError static predicate and lint caught missing braces/shadowing/a loop;
Schema.is and native iteration corrected them without weakening assertions.
The complete test run then caught missing encoding permission for two deliberate
negative-wire encoders. That exact egress permission is retained; decoder,
runtime and throwing-codec permissions remain removed. The corrected complete
test run passes 321 actual lint cases and all 23 test tasks (22 matching caches).
Frozen install preserves 792 installs/1020 packages. All 15 build tasks pass
(14 matching caches), and full verification passes all 21 Quality cases/all ten
isolated faults/fresh source-only docs (217.07 seconds), 176 deployment-tool,
21 skill and 16 evaluation cases, compiler and both unused-code profiles.
Unchanged SDK/web Chromium cases replay matching caches (24/two respectively).
The refreshed installed-CLI inventory reports 400 provisional diagnostics:
383 app, ten lint-fixture and seven infrastructure cases. These include host
and fixture classification; they are not 400 confirmed defects. Remaining
host/source paths and semantic/readonly review are still required.

Documentation impact: **Change required** for the typed test owner, native
runtime tests, docs/default root command and server configuration, strict
selectors/CLI canaries, app README, frontend/testing architecture, current T002
ledger, active plan and receipt. **Preserve** runtime implementation/lifetime,
route wire representations and failure semantics, public/generated content,
selected dependencies, tax results, historical evidence and canonical skills.
**N/A** package Changeset (private unversioned app; test-only change), operational
runbooks/CI procedures and provider state. Revert this complete slice to recover.
DEV-73 remains unfinished, followed by DEV-74–81. The separate Medicare decision
remains pending. Parent draft #118 revision
`4a1abfc00caf9493d22b1ca8e19eb364c5c4ab14` is locally qualified; its hosted
run `37200459089` does not qualify this later test revision.


## Local T002 isolated Quality fixture deadlines

The exact #118 checker revision `4a1abfc00caf9493d22b1ca8e19eb364c5c4ab14`
failed hosted run `37200459089`: the four strict mutation cases and fresh-source
documentation command shared one 300000ms test deadline; it expired at 301225ms.
Twenty of 21 Quality cases passed, including the other six real-command defects.
Local #118 and #119 qualification passed; neither local pass establishes hosted
success. The runner log reported a deadline expiry, not a rejection assertion. The
unchanged grouped owner also timed out for #119 run `37201123414`, exact
revision `4cb71a3f49f6125e201603b1b132c569d43d3b2b`, at 301155ms with 20/21
Quality cases passing. Both failures are retained in the corrective receipt.

Every one of the ten deliberate faults now gets an independent named native
test, scoped copy and the same finite 300000ms deadline. A separate named test
proves documentation tools work in a fresh source-only copy, with a temporary
Git index and no package build before or after the command. Each mutation still
requires the owning command to fail with its exact recorded oracle. Complete
ordered corpora and exactly-one selected fixture are asserted in every test;
mutation bytes, owning commands, failure oracles and recovery are unchanged.
The Quality suite now has 30 cases (19 policy plus eleven isolated tests).
Final local qualification passes: frozen unchanged 792-install/1020-package
graph, actual 321-case root lint corpus, complete 23-task package tests and
15-task build replaying matching caches, and full verification with all 30
Quality cases/all ten isolated faults/separate fresh-source docs (257.01 seconds).
The four strict cases each take 43.934–44.871 seconds locally. Deployment-tool,
skill and evaluation cases pass (176/21/16), as do both unused-code profiles.
Compiler and unchanged SDK/web Chromium replay matching caches. Hosted
qualification of this later correction remains separate and pending.

Documentation impact: **Change required** for the Quality test owner, controls
standard, testing architecture, T002 ledger, active plan and dated receipt.
**Preserve** all ten mutation contracts, historical HGI proof, command/CI/cache
policy, canonical skills/digests, package selections/exports and tax results.
**N/A** Changeset (internal repository test only), app/public/generated content,
operational runbook procedure and provider state. Revert the complete slice to
recover. DEV-73 remains unfinished, followed by DEV-74–81; the Medicare decision
remains separate and pending. This corrective slice follows local draft #119
`4cb71a3f49f6125e201603b1b132c569d43d3b2b`; neither parent hosted outcome is
silently replaced by this later correction.


## Local T002 docs app and host migration

All docs app source and the actual Vite/server-test/browser-test configurations
now receive canonical strict rules. Named server-function handlers replace
redundant async dynamic-import wrappers; the installed Start compiler extracts
the handlers and removes unused server imports from browser callers. The exact
Worker entry normalises the framework's Response or Promise through one native
request program, with the request abort signal. Ordinary responses do not
initialise documentation services. Opt-in proof requests acquire the existing
runtime's cached context, encode its typed probe and replace only two proof
headers. Body/status and unrelated headers are preserved. This does not prove
cancellation inside the framework promise. Vite reads its Alchemy signal through
an owning Config Schema with the original absent default.

The native Chromium harness scopes its DOM host, React root, router history and
console spies. Its fake server-function loader is its only execution host;
Schema-owned brands and native Effects replace raw Promise/throwing-codec test
workflows. Readonly MDX link props preserve aria labels on both routes and
ordinary anchors. Navigation positioning uses the named DOM scroll operation.
The compiler and unused-code inventories now include the actual host and test
configurations. Redundant browser decoding/throwing-codec/encoding permissions
are removed.

Focused qualification passes the actual app/script compilers, all 19 retained
server cases, both unused-code profiles, all seven Chromium route cases and
336 real CLI lint cases. The first Chromium run caught two tuple-callback
errors; the first strict corpus caught a default-rule/admission distinction.
Both are corrected without removing assertions and retained in the
[receipt](../../documentation-audit/clean-slate-foundation/2026-10-04-docs-app-hosts.json).
The final built local Worker proves SSR/immutable assets 200, direct/client 404,
zero document reloads during client navigation, three server functions, clean
diagnostics, one reused context, filesystem isolation and retained accessibility
checks. Complete repository qualification remains in progress.

Documentation impact: **Change required** for app source/host configuration,
compiler and unused-code ownership, strict selectors/CLI canaries, app README,
frontend/testing architecture, T002 ledger, active plan and dated receipt.
**Preserve** route representations/failure semantics, lazy docs context,
response contracts, public/generated content, dependency selections, tax
results, historical evidence and canonical skills. **N/A** Changeset/package
release notes (private unversioned app; no published contract), operational
runbooks/CI procedures and provider state. Revert this complete slice to
recover. Remaining proof-script/web/infrastructure and semantic/readonly work
keeps DEV-73 unfinished, followed by DEV-74–81. The Medicare decision remains
separate and pending. Parent draft #120 revision
`c4d497c2d23262a82c59fd146338e049eafb1259` has separate hosted qualification.

The first complete verification caught two obsolete exact-source architecture
assertions: they required the prior async fetch/managed-runtime runner/unknown
encoder. The owning policy now admits exactly one native Worker execution and
requires lazy cached context, native typed encoding, the abort signal, proof
header filtering and original response fields. Ten new deliberate bypass cases
reject recurrence; all 186 deployment-tool cases pass, including the 176 retained
cases. The tool README and testing owner move with this correction. Complete
verification is rerun; the failed attempt remains in the receipt.

Parent #120 hosted run `37201707816` passed for exact revision
`c4d497c2d23262a82c59fd146338e049eafb1259`, read back on 2026-10-04.
That qualifies the separate Quality deadline correction, not this later app
worktree. Parent #118/#119 hosted failures remain retained.

Final local qualification passes: unchanged frozen 792-install/1020-package
graph, actual 336-case root lint corpus, all 23 package test tasks replaying
matching caches and all 15 build tasks (14 matching caches). Complete
verification passes all 30 Quality cases/all ten isolated faults/separate
fresh-source docs, 186 deployment-tool, 21 skill and 16 evaluation cases, both
unused-code profiles and all 24 compiler tasks (23 matching caches). Unchanged
SDK/web Chromium results replay matching caches for 24/two cases; the changed
docs route and built Worker checks executed directly in Chromium. The checked
lint-selector lookup is native Record/Option. Failed earlier attempts are
retained in the receipt. This locally qualified app slice leaves DEV-73 and
DEV-74–81 unfinished.


## Local T002 native infrastructure policy and readonly memo

Canonical rules now cover all source/tests in the existing private source-only
infrastructure package. All 17 retained stage/log/header policy cases use the
native runner; file/path services inspect the real app asset-header input. The
test runtime admission is removed. Shared exported memo settings, including
nested arrays, are readonly. The installed Alchemy input requires writable
arrays, so the stack supplies fresh copies with identical values. The actual
installed-Alchemy invalidation test still observes both sibling docs workspaces.

Two compiler controls use the provider's include type and native Array/Option
restoration. A reversible weakening probe removes readonly and requires both
controls to fail with unused expected-error directives; it passes after an
initial unsuitable generic-resource/undefined-tuple probe was corrected.
Original source is restored, and the final compiler/lint and all 18 local cases
pass. All 341 real CLI lint cases pass (336 retained plus four accepted files
and a rejected neighbour); all 186 deployment-tool cases pass. Manifest/lock
metadata adds two already selected native test dependencies without selecting
new versions. Frozen install, all 23 package test tasks, all 15 builds and full
verification pass. The 30 Quality cases include all 11 isolated fixtures
(269.95 seconds); compiler, both Knip inventories, SDK Chromium (24) and web
Chromium (2) pass. The earlier unexplained test-runner exit and restricted
Chromium startup failure are retained separately in the receipt; retries pass.

Documentation impact: **Change required** for test/memo/stack ownership,
manifest/lock metadata, installed memo test, strict config/canaries, package
README, package/testing architecture, versioning standard, major Changeset,
T002 ledger, active plan and
[receipt](../../documentation-audit/clean-slate-foundation/2026-10-04-infrastructure-native-tests.json).
The incompatible readonly export is recorded for standalone private
infrastructure, outside the fixed nine-package train. No version is applied.
**Preserve** resource values/identity/stages, provider/state composition, cache
inputs/invalidation, asset/log/trace settings, explicit source-only exports,
selected dependencies, tax results, historical proof and canonical skills.
**N/A** renderer/shape validator (existing source-only profile exception),
app/public/generated content, runbook/CI procedure and provider state. Revert
the complete slice to recover. No provider graph/plan/apply/readback is claimed.
DEV-73 remains unfinished, followed by DEV-74–81; Medicare remains separate.


### Web application host qualification — 2026-10-05

All web source, native tests and Vite/Vitest configurations receive canonical
strict rules. Native ManagedRuntime method types replace the copied Promise
contract and one-use runtime helper. The actual root loader forwards its Router
abort signal and returns readonly health fields. Module runtime ownership and
the existing separate HTTP API remain intact. Schema-owned configuration errors
carry only runtime identity, settings operation and a fixed safe message.

Vite selects the existing public API input through native Config and its
installed file/environment precedence, then encodes the owning Schema into a
typed browser constant. The HTTP owner still validates URLs at runtime; missing
and invalid inputs preserve that timing. An actual build showed an unrelated
public-prefix sentinel in the browser output despite the explicit selection.
Automatic prefix exposure is now disabled while Vite's mode/SSR metadata stays
native. Two actual build/serve configuration tests guard that correction.

The 16 native settings/build-owner tests and compiler pass. Chromium passes
the two retained Atom cases and two actual file-route/generated-client cases:
health decoding and preload retirement that interrupts HTTP work and aborts
its signal. The first iframe failed before assertions during dependency
re-optimisation; explicit observed imports correct it. An initial 361 real CLI
cases pass. Frozen install, all 24 package test tasks, all 15 builds and full
verification pass. The 30 Quality cases include all 11 isolated fixtures;
186 deployment-tool, 21 skill and 16 evaluation cases, both Knip inventories,
complete compiler tasks, SDK Chromium (24) and all four web Chromium cases
pass. Final lint admits actual Vite JSON restoration only at its exact
reviewed boundary test, without runtime or throwing-codec permission.

Corrected generated output is exercised through local Bun/Vite preview and
the actual separate API. SSR health and browser refresh HTTP health both
return 200; loader data restores and console/page errors are empty. Recorded
browser asset hashes contain the public API input and no named server/provider
markers or unrelated public/private test sentinels. Both processes are stopped
and their ports independently verified closed. This is local proof, not
qualification of the configured Vercel Node 22 runtime or deployment.

Documentation impact: **Change required** for app configuration/types/runtime/
loader/test owners, compiler/Knip/strict inputs and exact host canaries, app
README, frontend/testing architecture, T002 ledger, active plan and
[receipt](../../documentation-audit/clean-slate-foundation/2026-10-05-web-app-hosts.json).
**Preserve** HTTP URL/health ownership, valid health data/shell, module lifetime,
SSR/browser split, public API setting/precedence/runtime validation, provider
preset, retained Atom cases, selected dependencies, generator ownership,
canonical skills/digests, tax outputs and history. **N/A** Changeset (private
unversioned app), runbook/public-content/CI procedure and provider state.
Revert the complete slice to recover. No merge/deployment/publication/apply
or version application. DEV-73 remains incomplete; Medicare stays separate.


### Hosted docs proof migration — 2026-10-05

Implementation replaces the generic browser callback contract and raw Promise
workflow with the named `CloudflareHostedProof` service and a private live Layer.
Config/Schema owns checked input and branded identities, Option owns absence
internally, and the full
producer Schema preserves historical identity/null/output fields. Native HTTP,
FS/Crypto, scoped Chromium/listeners, immutable Ref observations and a bounded
Queue own work and cleanup. Queue overflow fails safely. The complete hosted
operation has one five-minute deadline. Same-site missing hashed-asset retries
retain their attempt/delay settings and clear only failed-attempt diagnostics.

Real Chromium retry/private-error/overflow tests pass, and interruption retires
an actual pending streaming response. The first pending-handler fixture did not
observe request retirement; the streaming fixture tests the browser's actual
unfinished response and retains that earlier failed observation. A controlled
HTTP/DOM fixture exercises the complete operation and screenshot files. It
showed that Playwright sends JSON-string quotes around `data: "{"`; raw Buffer
bytes now send the intended malformed JSON. The built proof receives the same
single request correction. Reverting the live request to the old string form
fails the full fixture at the 4xx assertion; exact source is restored. Fixture
HTML/runtime headers do not establish real Worker or hosted behaviour.

Documentation impact: **Change required** for script/service/Schema/test owners,
compiler/native test inputs, canonical strict selectors/actual CLI fixtures,
source counterexamples, app README, testing architecture, T002 ledger and dated
receipt. **Preserve** command paths, workflow/authority/receipt identities,
provider state, runtime behaviour, public content, installed dependencies,
canonical skills/digests and tax results. **N/A** Changeset (private unversioned
app with no published package contract), generated content, deployment/CI
procedure and new provider authority. Revert the complete slice for recovery.
The first root test failed at browser launch because the two docs test tasks
dropped the installed browser location. Their exact Turbo environment/hash
inputs are now checked by a native read of the actual configuration. Full
repository qualification passes: all 24 package test tasks, all 15 builds,
369 real CLI lint cases, 191 deployment-tool cases and all 30 Quality cases
(including 11 isolated checks, 269.67 seconds). Both unused-code profiles and
all 24 compiler tasks pass. Unchanged SDK/web Chromium checks replay matching
caches for 24/four cases. All 37 docs scripts (including seven actual Chromium
cases) and 19 docs server cases pass. The real built local Worker retains SSR,
immutable assets, direct/client 404s, three server functions, nine concurrent
requests, one shared context, no document reloads/diagnostics and accessibility
checks, including the corrected raw malformed JSON. The final repeat build
first omitted the local browser path; restoring it passes, and that failed
invocation remains in the receipt. Branded identities preserve saved text;
native Option.flatMap retains an already checked previous-version identity.
No dependency selection or tax result changed. The
[receipt](../../documentation-audit/clean-slate-foundation/2026-10-05-hosted-docs-native-proof.json)
records local proof, recovery and non-claims. Native built-proof orchestration
and remaining T002 semantic/enforcement review are next. DEV-73 and DEV-74–81
remain unfinished; Medicare remains a separate decision.


### Native built Worker proof — locally qualified, 2026-10-05

This slice starts from draft #124 revision
`b2a556c8818a83fdfe97d79709bbda0d89b4b8db`; its exact hosted Quality run
`37209125848` passed. That parent result does not qualify this later worktree.
The existing built-proof path now has native Command parsing, a closed named
service and whole owning receipt/screenshot Schemas. Private native filesystem,
Crypto, Config, child-process streams, HTTP, monotonic time and scoped browser
work own orchestration. Output pipes are capped at 1 MiB each, artifact/digest
reads at 64 MiB and file inventories at 10,000; a growing-file test proves the
stream limit independently of metadata. The whole operation has a five-minute
limit and browser work two minutes. Provider credentials remain outside the
selected child/browser environment. The receipt is saved and read back only
after cleanup, including rejection of requested screenshot mismatches or a
late cleanup defect. The compiler owns all adapters, command and tests.

All 24 package test tasks pass (23 matching caches), including 53 docs script
and 19 server cases and 378 actual CLI lint cases. Forty strict source contract
cases pass, with fifteen deliberate built-proof bypass controls. All 15 builds
pass (14 matching caches). Root lint admits 396 files with no warning/error.
Full verification passes 30 Quality cases, including 11 isolated checks in
263.91 seconds, 206 deployment-tool cases, both unused-code profiles, all 24
compiler tasks and matching SDK/web browser checks. Frozen install retains
792 installs/1020 packages. The generated local Worker/Chromium command passes
all sixteen observable checks, nine concurrent requests, one shared context,
three server functions and zero document reloads/diagnostics; both screenshots
and their manifest are saved. Independent process readback finds no remaining
task process. All three artifact/input hashes exactly match the prior script.

Controlled Chromium tests retain two browser fetches separately from a malformed
POST. Reverting Buffer bytes to the old string fails the actual HTTP body
assertion, observing a quoted JSON string; the adapter is restored. Browser
console/Queue overflow and real pending-response interruption fail or release
as expected. The first real-browser failure remains unexplained; temporary
logging removal and incorrect fixture API/scope/count observations remain in
the recovery record. They are not silently counted as successful checks.

A fresh actual-CLI scan of 396 Git-owned source paths finds ten contextual
findings in five deliberately permissive lint inputs and none in application/
tool workflows. Its exit 1 is retained as inventory evidence. Final canonical
whole-source scope/fixture containment and the broader T002 semantic review
remain pending. DEV-73 and DEV-74–81 remain unfinished; Medicare is separate.

Documentation impact: **Change required** for private script/service/Schema,
compiler/test and enforcement owners, app README, testing architecture, this
plan, T002 ledger and the
[dated receipt](../../documentation-audit/clean-slate-foundation/2026-10-05-native-built-worker-proof.json).
**Preserve** command aliases, local-only Wrangler arguments, installed manifests,
digest bytes, all existing observable checks, screenshot/output identities,
public content, dependency selections, canonical skills/digests, provider state
and tax results. **N/A** Changeset (private unversioned app), generated/public
content, new provider operation and release contract. No merge, deployment,
publication, provider apply or version application.


### Whole-source strict coverage — locally qualified, 2026-10-05

This slice follows draft #125 revision
`cd5b2a8dec1fdd53375486852485a898215d9ede`. Its hosted Quality run
`37212184618` passed at that exact revision; it qualifies the parent draft only.
Local qualification of this later source-coverage work is separate. The canonical override covers all six owned source
extensions, including future root/app/config/tool files. Exactly five named,
unexecuted lint inputs retain their isolated rule contexts; directories and
neighbours remain strict, and other rules still inspect those inputs. Existing
runtime/codec/assignment/method admissions and generated/vendor exclusions are
unchanged. These inputs sit outside the policy compiler's ./*.ts ownership and
are read as source bytes, never executed as app/tool workflows.

Actual CLI checks cover all six extensions and five fixture neighbours, with
one-file admission, nonzero exit and named rules. The first CommonJS input used
ES-module syntax and failed before the intended rules; valid CommonJS positive/
negative inputs correct that oracle. All 401 lint cases pass after correction.
Two new independent repository-copy checks remove whole-source coverage or
broaden fixture exclusions and must fail the complete real verifier. The six
strict and six retained release-boundary mutations keep their five-minute
limits. All 24 package tests pass (23 matching caches), with 401 real CLI cases and
53/19 docs script/server cases. All 15 builds replay matching caches. Root lint
and an explicit canonical inventory admit all 397 owned source paths with zero
findings. Complete verification passes 32 Quality cases, including 13 isolated
checks in 360.78 seconds; removing coverage and broadening the fixture exclusion
fail the real verifier at their expected messages. Both unused-code profiles,
all 24 compiler tasks, 206 deployment-tool cases and matching SDK/web browser
checks pass. Frozen install retains 792 installs/1020 packages. Final T002
semantic/acceptance review remains pending before the task closes.

Documentation impact: **Change required** for lint/test/Quality owners, testing
architecture, controls standard, this plan/T002 and the
[receipt](../../documentation-audit/clean-slate-foundation/2026-10-05-owned-source-coverage.json).
**Preserve** canonical rules/skills/digests, exact host admissions, dependencies,
public/generated content, prior evidence, provider state and tax results.
**N/A** Changeset (repository tooling only), new runbook/provider operation and
public contract. No merge/deployment/publication/provider apply/version
application. DEV-73 remains in progress; Medicare separate.

## T002 final source review and Promise mapping

The source review found stale service/config examples and one remaining lint
scope gap: inline Promise rejection mapping did not cover both website apps,
infrastructure and every owned source extension. The selector now covers all
six extensions. Six real CLI path canaries reject a missing mapping while
accepting an inline mapped operation in the same file. The wider rule correctly
rejected extracted catch callbacks in the two private Playwright proof adapters;
those mappings now construct the same safe closed error inline.

The facts/rules/configuration/service guides now use their actual native owners
and identities. They preserve proposed-feature boundaries: taxable pay currently
equals gross pay, question inputs have three supported kinds, and the web
scaffold receives only its checked public config constant. Older Doppler provider
claims are labelled historical rather than fresh external readback. Materially
revised legacy guides now carry separate lifecycle and authority metadata.

The dated [review receipt](../../documentation-audit/clean-slate-foundation/2026-10-05-foundation-acceptance-review.json)
records path evidence for Schema ownership, generic descriptor/continuation
coupling, helper purpose, deterministic scenario Layers, SDK caller lifetimes,
app-owned runtimes, readonly state and exact host/fixture containment. T003/T004
own the deliberately new RPC/calculator/public interfaces; retained pure rule
Layers are not provider runtime construction. Documentation impact is **Change
required** for these owners, the enforcement corpus and current plan/tasks;
**Preserve** for public content, historical proof, canonical skills, package
contracts and tax results. A Changeset is **N/A** because this slice changes
private proof scripts, repository enforcement and maintainer guidance only.
All required local checks pass; the dated receipt retains exact outcomes and
source identity. Hosted qualification of the new commit remains separate.
Recover by reverting this complete slice. No provider operation is authorised.

A separate actual built-Worker check exposed interference from intercepting
unrelated asset requests during the pending-route test. Bounded phase diagnostics
identified `route.continue` on an already-handled script request; the request was
not an expected server-function abort. The route handler now matches only the
same-origin server-function path. It does not suppress errors. Controlled native
browser cases load a late script asset and cover both screenshot paths, while
body-interruption cleanup remains checked. All 54 script cases and the native
compiler/root lint pass. Two local skill profiles now route to current receipts
without describing already-qualified work as pending; their separate hashes are
refreshed, with upstream tree identities preserved. Final corrected-candidate
verification passes all 32 Quality cases, including 13 isolated cases in
381.59 seconds; all 24 type tasks, both Knip checks, 206 deployment cases, 21
skill cases, 16 evaluation cases, 24 SDK browser cases and four website browser
cases pass. Root tests pass all 24 tasks (23 matching caches), including 54
changed script cases and 19 server cases. The final frozen install checks 792
installs/1020 packages without changes; the build passes all 15 tasks (14 matching caches).
Both actual built-Worker commands pass sequentially, with and without captures.

T002 is complete locally. The task ledger records that result; previous partial
sections remain historical evidence. Cooper review and the new commit's GitHub
checks remain separate. Linear tracking writes remain blocked by automatic
approval review, so no changed external status is claimed. Continue T003; the
end-to-end implementation goal remains active. Medicare is still unresolved.

## T003 native RPC contract (in progress)

Start T003 from locally accepted foundation commit
`5d9e9ab21ed7ce5687cea560c1db3ebe658bd375` ([draft 127](https://github.com/crcorbett/taxkit/pull/127)).
Its GitHub Quality run `37215859846` was in progress at creation; this is not
hosted acceptance. The new private `packages/api/rpc` is rendered through the
canonical package tool, then adapted to the actual stable Effect 4 exports and
TaxKit calculator owners. The template's generic catalogue, RC imports and
NDJSON do not describe this bounded POST/JSON calculation contract.

The handler calls `PublicCalculatorService.calculate`; request and result
Schemas remain calculator-owned. A checked native-parser ingress prevents
unchecked tags/IDs reaching native identity encoding. Per-procedure and global
native defects use fixed safe encoding. The scoped generated client distinguishes
expected failures, unavailable transport, invalid replies and one whole-response
deadline; unrelated adapter defects and earlier interruption retain their
classification. Focused native tests pass the real calculator and failure/body
paths. Complete local slice checks pass; the two real app hosts remain pending.

Documentation impact: **Change required** for the new package README/exports,
transport/package/quality architecture, exact boundary permissions, Knip entries,
lockfile, Changeset, task ledger and dated receipt. **Preserve** calculators,
public HTTP/OpenAPI, existing app and provider wiring, canonical skills,
historical receipts and retained tax outcomes. Provider runbooks are **N/A** for
this contract-only step because no provider graph or command changes. T003 stays
in progress until actual API/Website, binding, origin, browser and lifetime proof
passes. No merge, provider operation or publication is authorised.

A subsequent readback confirms GitHub Quality `37215859846` passed the exact
foundation commit `5d9e9ab21ed7ce5687cea560c1db3ebe658bd375`. It does not qualify
this new T003 candidate. The [RPC receipt](../../documentation-audit/clean-slate-foundation/2026-10-05-native-rpc-contract.json)
records 27 native cases, the observed broad-Schema browser import correction,
local package/SDK proof and remaining app-host requirements.

The final transport pass has 27 cases. All 25 workspace test tasks pass (25
matching package caches on the final rerun), alongside 428 fresh actual lint cases. New exact RPC path fixtures
prove decoding/encoding permission limits and restore real source bytes on all
outcomes; a neighbouring source file still rejects decoding. Old and narrow
Schema exports retain the same five object identities in source and built
consumers. Frozen install checks 793 installs across 1021 packages with no
changes. Final full verification passes, including 32 Quality cases with 13
isolated command/failure cases in 376.88 seconds. Both unused-code inventories,
25 type tasks, 206 deployment cases, 21 skill cases and 16 evaluation cases pass.
The matching browser results cover 24 SDK and four website cases. This qualifies
the private contract slice locally; T003 still needs the real app connection.

## T003 native API host candidate

Continue above RPC draft #128 at
`876b4855dcba79ad5ecdbfd945a8a38875e39b85`. The API candidate uses the native
Alchemy Worker entry and constructs its router once. HTTP now calls the same
`PublicCalculatorService.calculate` operation as RPC directly; the SDK is a
test-only comparison dependency. Public HTTP JSON and OpenAPI are preserved.
A host-supplied route Layer keeps service and CORS policy at the app root while
preserving existing Bun/in-process consumers.

Documentation impact is **Change required** for API/HTTP READMEs and transport,
lifetime, configuration and quality owners, task evidence, candidate receipt,
package dependencies, exact fixture encoding permission and Changeset.
**Preserve** retained tax results, canonical skills, HTTP/OpenAPI, Bun smoke and
all historical evidence. Provider procedures are **N/A** until a graph or
command changes; no cloud apply is authorised. Full native Worker artifact,
request lifetimes, safe log/reporter output and browser/CORS proof must pass
before accepting this candidate. T003 remains in progress.

The [native API receipt](../../documentation-audit/clean-slate-foundation/2026-10-05-native-api-host.json)
records 57 API cases, exact fixture permission canaries, five HTTP cases and
existing Bun consumer smoke. The actual native generated Worker runs in the
installed local Cloudflare runtime using Node 24.16.0. HTTP and RPC retain net
pay of 130100 cents; exact-origin preflight, fixed malformed/tag/ID replies,
empty 413 and a stalled-body 408 at 5011 milliseconds pass. The native request
tests separately prove finalisers and earlier interruption. The direct test
caller retains its unfinished upload; Wrangler's front-proxy observation of
incomplete chunked requests is inconclusive. Neither result proves cancellation
of the caller upload. Both unused-code inventories pass with the native entry
explicitly owned. Full repository candidate checks pass: frozen install, all 16 builds and 26
workspace test tasks, both unused-code inventories, compiler tasks, 32 Quality
cases (13 isolated cases in 381.355 seconds), 206 deployment cases, 21 skill
cases, 16 evaluation cases and actual Chromium SDK/website checks. This accepts
the API host sub-slice locally; it does not complete T003.

Readback confirms GitHub Quality run `37218849773` passed the exact RPC draft
#128 commit `876b4855dcba79ad5ecdbfd945a8a38875e39b85`. That hosted result does
not qualify the current API host candidate. T003 remains in progress for the
Website, native binding/origin graph, root secret precedence, real browser
journeys and complete native fatal/log/trace paths.


## T003 native app graph candidate

Continue above API draft #129 at
`1e72f6b39bb580215f3ef985337e2d00e8f4cfec`. GitHub Quality run `37221971202`
passed that exact API host commit. The separate candidate `alchemy.apps.run.ts`
declares API and Website native resources with self URLs, peer Outputs and the
same-stage private `TAXKIT_API` binding. Native Stack secrets select checked
Doppler stages and disable ambient application overrides. Current docs workflows
continue to use their existing root and authority.

Actual native planning exposed a beta.80 deadlock: resolving peer properties
waited on the same memoised resource through the address cycle. A narrow patch
defers fresh/circular resource Outputs before recursive property resolution,
covering native source and compiled entry points plus generated mapping. Native
mock plans complete create/no-change/update; missing early-create capability
still fails. Removing the patch brings back the timeout in both installed entry
points. Original bytes are restored. Real Cloudflare diff, apply and Doppler
retrieval are not proved. The Website application is still the existing scaffold;
T003 remains in progress.

Documentation impact is **Change required** for infrastructure/API exports and
READMEs, deployment/configuration/package/quality owners, the docs procedure's
explicit candidate exclusion, exact decoding permission/canaries, task evidence
and the [graph receipt](../../documentation-audit/clean-slate-foundation/2026-10-05-native-app-graph.json).
**Preserve** current docs identities/procedures, public HTTP/RPC contracts,
canonical skills, retained calculators and all historical evidence. Public MDX,
release/version/publication and Changesets are **N/A**: this slice changes only
private app/infrastructure composition and a private locked dependency patch.
Website runtime/browser and complete native privacy/lifetime proof remain next.


The graph sub-slice passes 32 infrastructure cases and the source/default patch
removal oracle. Full qualification passes frozen 795-install/1021-package
installation, all 16 builds, 27 workspace test tasks, 435 actual CLI cases,
both unused-code inventories and compiler paths. Full verification includes 32
Quality cases with 13 isolated cases in 373.78 seconds, 206 deployment cases,
21 skill cases, 16 evaluation cases and actual Chromium 24 SDK/four retained
website cases. Current browser results still belong to the scaffold; the real
Website/RPC/Atom connection remains the next T003 work.


## T003 native Website implementation

Continue above graph draft #130, commit
`f373345f07fd877bdf903d24a0d7eb78f5fadb85`. The Website replaces its two retained
HTTP runtimes with one server runner using the same native private binding and a
React-owned Atom graph using the root loader's checked public API address.
TanStack carries named transport functions and encoded loader values, never an
Effect Context. The first calculator keeps explicit Calculate and ephemeral
page state; edits and unmount interrupt old calls. Native app build, initial
render/navigation, shared calculator result, full-body deadline, real binding,
CORS, hydration and browser bundle proof remain required before acceptance.
T003 remains in progress. Current docs deployment authority is preserved.


The [Website receipt](../../documentation-audit/clean-slate-foundation/2026-10-05-native-website.json)
records the native candidate, exact host permissions and bounded local proof.
Real app use exposed a native receive-loop lifetime error, idle settings being
collected, `/rpc/` redirect drift, HTTP tracing headers despite RPC tracing being
off, and a broad fact import loading the engine in the browser. The earliest
owners are corrected and have regression oracles. Root restoration passes
checked submissions through ordinary React context; no Effect Context crosses
the framework transport. The saved native pair command builds compiled RPC
dependencies, then the actual Alchemy native API/Website artifacts. It qualifies
private/direct browser calls, repeated and idle use, expected unavailable-error
hydration without replay, no-JavaScript form, editing, request limits and the
browser import boundary. Full repository closeout is pending.

Documentation impact is **Change required** for affected app/package READMEs,
frontend/configuration/service/transport/package/quality owners, exact command/
SDK/encoding permissions and canaries, both unused-code inventories, generated
Wrangler declarations, the current journey and task/evidence pointers.
**Preserve** existing docs deployment procedures/resources, public HTTP/OpenAPI,
canonical skills, all historical evidence and retained tax results. A pay-package
patch Changeset records the narrow fact import; private app/RPC/infra changes
need no other Changeset. Native builders perform local source work only.
T003 remains in progress for complete native failure/trace/cancellation proof;
all calculator pages and exported telemetry remain later work. No merge,
deployment, publication or provider operation is authorised.


Adding the native Website journey exposed a reader that still applied HGI-203's
fixed five-journey Schema to today's inventory. A separate explicit current
Schema admits the six current journeys; the original historical Schema and
packet digest remain intact. Release/runbook readers and focused tests use the
correct owner. This is part of the Website documentation slice, not a new
accepted release attempt.

Current governance and its repository profile now require the named sixth
Website journey too. Missing or substituted Website entries fail the current
check. The saved HFI/HGI checkers and their expected nonzero historical failure
identities are preserved; no old source hashes or acceptance records are
refreshed.

The Website sub-slice passes full local closeout: all 16 build tasks, all 27
package/app test tasks, 452 actual CLI lint cases, local HTTP consumer smoke and
full verification including the fresh native API/Website build and Chromium
journey. Current governance requires six named journeys; its negative fixtures
and the saved historical nonzero command identities pass. The final full check
also validates generated Wrangler declarations and both unused-code inventories.
The initial full runs stopped on the old journey assumption, unchecked list
access in its new negative test, then a native RPC fixture missing its required
URL; each correction was checked before the passing final run.
This accepts the local Website sub-slice only. T003 remains in progress for the
full native failure/trace/cancellation paths and development pair. Source review
found that TanStack's native server-function failure handling can independently
log and serialise errors; the Effect host logger alone cannot qualify that path.
No old HFI/HGI hash or acceptance record is refreshed.

The final staged diff check found trailing spaces in Wrangler's own generated
runtime declarations. `.gitattributes` suppresses only end-of-line whitespace
checks for that exact generated file, preserving the generator's bytes. A
temporary ordinary source fixture still fails `git diff --check` and is restored
byte-for-byte; the staged generated output passes. Generated type checking and
post-receipt docs/runbook checks remain required before committing.

## T003 native Website settings failure qualification

Continue from Website draft #131, commit
`3e15c9f919cf275cff95b6061939d71f6e6fe4cb`, on
`codex/dev-74-native-failure-paths`. The real built settings function reflected
a short malformed-JSON marker. A long marker had falsely passed because the
native error preview truncated it. The named data-free GET transport now rejects
query inputs and unsupported methods before native parsing. Its unexpected
internal failure uses the native HTTP matcher/reporter and Response before
TanStack serialises errors. Expected checked errors are preserved.

The native builder scopes a temporary settings-operation defect, copies its
actual output, restores source bytes, then rebuilds the ordinary pair. Both real
Worker journeys pass; removing the settings failure boundary reflects the marker
and fails the saved test, while restoring it passes. Focused lint/types pass.
Full repository closeout and remaining native global/fatal/trace/cancellation
proof are pending; T003 remains in progress. The source build must run alone
from source scans and other source-replacement tests. No provider operation.

Documentation impact: **Change required** for Website configuration/host/reply,
source/test builder, exact encoder admission/canaries, README, frontend/quality
architecture, current journey, SPEC lifetime/transport clarification and active
task/evidence pointers. **Preserve** public HTTP/RPC wire, all historical HGI/HFI
records, retained results, canonical skills and existing docs operations.
**N/A** public-package Changeset and provider proof: this is private Website
application/test work only.

Draft #131 hosted Quality failed while resolving `api/worker`: its Website test
builder used an undeclared package, hidden locally by an existing root link.
The Website now declares the API as a workspace development dependency, with
no version changes. A fresh isolated checkout installs 742 packages, passes
frozen installation and both native Worker tests. The preceding full local
check passed 455 actual CLI cases, all 27 package/app test tasks, all 16 builds
and full verification. Final full closeout of the dependency correction is
pending; no hosted success is attributed to the failed #131 revision.
Documentation impact also covers the Website manifest and lockfile; the private
test dependency requires no public-package Changeset.

After the dependency correction passed full verification, a real native
unknown-function request exposed a separate framework log leak (response did
not reflect the marker). The Website now compares the request path to the
function's native generated URL before lookup. Known settings still succeed;
unknown/extended/missing IDs return empty 404, with safe native logs. This is
part of the same private Website failure sub-slice. Final closeout is rerun
after its removal oracle; no complete native failure-path acceptance is claimed.

The complete local Website settings failure sub-slice passes final frozen
installation, 455 actual CLI cases, all 27 root test tasks, all 16 builds, local
HTTP consumer smoke and full verification. Final verification includes 32
Quality cases, both unused-code inventories, all compiler tasks, Chromium
24 SDK/eight Website cases, genuine Wrangler declarations and both freshly
source-built normal/internal-defect Worker journeys. Exact-address removal
restores the real native log marker and fails the saved 404 test; the internal
reply-boundary removal restores response reflection. Both restore byte-for-byte
and pass. An omitted Chromium path caused the repeated root tests/docs build
to fail; the configured reruns pass. Only post-check receipt/plan text changes
remain, checked through docs/runbooks and the staged whitespace check.
T003 remains in progress; safe exported telemetry, further API native failure
and complete cancellation/development pair proof remain unfinished.

## T003 native RPC failure qualification

Continue from draft #132 at `f4464a91385ec4044126c81b81b9453308cfee95` on
`codex/dev-74-native-rpc-failures`. Its hosted Quality run 37233537827 passed
at that exact revision; this is parent proof only. The current candidate adds
actual native global/procedure/fatal reply checks and controlled API artifacts
from the entry the native compiler consumes. A successful canonical request is
the positive control. Malformed wire cases, checked service/version errors,
safe fatal identity, private Website failure, and damaged valid-JSON reply
classification now pass through real Workers. Chromium loads the actual error
document and assets; editing clears its error without replay.

Removing global encoding reflects the private marker. Removing procedure
encoding loses its fixed safe value but does not reflect the marker. Removing
the owned reply decoder changes the Website checked error to empty 500. Each
saved test fails and exact source/dependency restoration passes. An earlier
procedure oracle incorrectly demanded marker reflection; its restored check
passed and the narrower oracle was then qualified. Source-only injection into
a compiled dependency did not reach the native artifact and was rejected as
proof. Neither failed attempt establishes privacy.

Documentation impact: **Change required** for the source builder, saved native
fixture/config, exact encoding/decoding/input-fill admissions and CLI canaries,
API/Website/RPC READMEs, API/frontend/quality architecture, current journey and
active evidence pointers. **Preserve** production RPC code/wire, public
HTTP/OpenAPI, canonical skills, historical receipts, retained results and docs
operations. **N/A** Changeset: only private test/command/docs behaviour changes;
all temporary production source replacements are restored. Full local closeout
is pending. T003 remains in progress for cancellation, the complete development
pair and safe exported telemetry. No provider operation is authorised.

Final local closeout passes frozen installation, 459 actual lint cases, all 27
repository test tasks, all 16 builds, fresh public HTTP consumer smoke and full
verification. Verification includes 32 Quality cases (13 isolated cases), both
unused-code inventories, all compiler tasks, real Chromium, actual Wrangler
declarations and all three freshly built native Worker/browser journeys.
The dated RPC failure receipt binds exact changed source and all ordinary/fault
artifacts. Only receipt and plan closeout text follow those checks; docs/runbooks,
Changeset status and staged whitespace checks validate that final record.
T003 remains in progress for cancellation, development and exported telemetry.

## T003 native cancellation qualification

The parent RPC-failure revision `29a96d6313a88e33354b8a57287d4ad124dc3efe`
passed hosted Quality run 37246990555, job 111566708865. That result belongs to
PR #133 and does not qualify the current cancellation candidate.

The current branch `codex/dev-74-native-cancellation` adds two controlled API
roots to the existing source builder. Each runs the actual calculation and
encoder first. One delays headers; the other sends one actual encoded body byte
then delays the rest, with identity encoding to prevent compression buffering.
The generated client reaches its complete five-second deadline for both.
Chromium observes actual aborted requests after the deadline, editing, and
browser Back leaving the form. The upstream artificial stream can continue;
remote-operation cancellation is not established.

Removing the deadline makes the saved test fail on the eight-second successful
report. Removing explicit edit interruption fails its actual browser abort
check. Exact source restoration, rebuilt compiled dependencies and all four
native tests pass. Failed hard-navigation and compressed-body experiments are
retained in the [dated receipt](../../documentation-audit/clean-slate-foundation/2026-10-05-native-cancellation.json).
A speculative dependency change was restored and is not part of this candidate.

A numeric Worker timestamp coincidentally contained the sample pay amount.
The native privacy checks now inspect emitted messages for pay values, while
private text remains checked across complete records. Controlled log capture
checks must accept pay-like numeric metadata and reject pay values added to a
message. This is a test-observation correction, not relaxed production reporting.

Documentation impact: **Change required** for the builder, saved native tests,
exact permissions and real CLI canaries, owning READMEs, architecture, current
journey and T003 evidence. **Preserve** production API/RPC/form code, HTTP/OpenAPI,
retained tax results, canonical skills, runbooks and historical proof. **N/A**
Changeset: private test/command/docs changes only. Complete local closeout
passes, including all 463 actual lint cases, 27 package/app test tasks, the
build, public API smoke and full verification. Its 32 isolated quality cases
pass in 423.02 seconds; all four fresh native tests pass in 24.30 seconds.
The root/architecture overviews and status outline also retire the stale
health-scaffold description. Post-check docs and runbook validation qualify
these wording changes and the bounded receipt.
T003 remains in progress for development and safe exported telemetry;
DEV-75–81 and the separate Medicare decision remain unfinished.

## T003 native local development candidate

Continue from cancellation draft #134 at
`554ee3c10fefaaa943ba157841edba8d62ae942b` on
`codex/dev-74-native-local-dev`. The exact parent hosted Quality run
37250859036 / job 111577989697 passed at 2026-10-05T01:35:21Z.
This qualifies the parent only.

The separate local Alchemy root uses the same native app graph with local state,
no Doppler composition and a named development stage check before declaration.
The root development command builds the API dependencies and inherits source
selection through launcher children. Actual local use exposed stale Vite flag
reads, a development-tool barrel in Worker SSR, an older SDK Worker engine and
launcher source flags being dropped. The fixes use a fresh ConfigProvider,
the supported runtime-only Bridge export, the root workerd override matching
the existing app compatibility date, and inherited Bun options respectively.
No additional SDK patch is introduced.

The saved existing native suite qualifies actual CLI startup, browser/private
calculations, both live source edits with exact restoration, local resource
readback and process shutdown. The first saved attempts retained an incorrect
profile-directory expectation, a hydration/edit race and a transient reload
socket closure; these are failed attempts, not accepted proof.

Documentation impact: **Change required** for root/local command configuration,
API/Website/infrastructure READMEs, deployment/frontend/testing owners, exact
lint fixture permissions, current journey and T003 receipt. **Preserve** tax
rules/goldens, SDK/HTTP/OpenAPI and public docs content, cloud/docs provider
composition, canonical skills and release procedures. **N/A** public Changeset:
this slice changes private app development/configuration and local fixtures.
Local closeout passed: 467 actual CLI lint cases (403 portable), all 27
package/app test tasks freshly executed, all 16 builds (11 unchanged cached),
fresh standalone HTTP/consumer smoke, and full verification including all six
fresh native tests in 35.94 seconds. The exact root `bun run dev` command also
passed API health, HTML, private and actual Chromium RPC calculations, with no
browser errors or initial replay, then stopped with both ports refused.
Post-receipt docs checks remain required. This accepts the local development
sub-slice only. T003 remains in progress for safe exported telemetry;
DEV-75–81 remain later work.

## T003 platform telemetry containment candidate

Continue from local development draft #135 at
`b3d759504f8dcdbb9dfea6d5521d98646dc0317b` on
`codex/dev-74-native-trace-containment`. Parent local closeout passed. Hosted
Quality run `37254770742`, job `111589383583`, failed at the exact parent head:
the page did not show the restored heading within 15 seconds. Preserve this
failed result; it is not hosted acceptance.

Source review of pinned Alchemy beta.80 shows native Worker upload metadata
supplies invocation logs by default when observability is omitted. Cloudflare's
current [Workers Logs](https://developers.cloudflare.com/workers/observability/logs/workers-logs/)
documentation describes request URL records independently of application console
formatters. Its [automatic span fields](https://developers.cloudflare.com/workers/observability/traces/spans-and-attributes/)
also include full URL/query/header data. The native Telemetry binding exposes
enablement, sampling and persistence; it does not expose a closed field filter.
The [custom span API](https://developers.cloudflare.com/workers/observability/traces/custom-spans/)
adds attributes and treats undefined as a no-op; that is not proved suppression
of automatic platform fields.

Implement explicit disabled platform logging/invocation/persistence/tracing in
the API declaration and matching API/Website graph, retaining fixed local
application reporting. Qualify the actual native planned resource properties
and local pair after safeguard removal/restoration. This is desired-state local
containment, not uploaded Cloudflare metadata or exported row proof. Preserve
the current docs app policy and existing dataset ownership. No competing trace
exporter is introduced. CSF-009 safe native exported tracing remains unmet
until its version-matched platform/exported-row privacy checks succeed; do not
claim safe native spans survive disabling the path. The SPEC/task owner now
separates T003's local connection/containment acceptance from T009's later safe
exported tracing requirement. T003 remains in progress pending this candidate's
complete qualification and review; it does not wait on a circular T009 dependency.

Documentation impact: **Change required** for API/infrastructure declarations,
focused graph proof, local state readback, API/Website/infrastructure READMEs,
configuration/testing/deployment owners, current task and dated evidence.
**Preserve** HTTP/RPC/calculator contracts, docs policy, shared datasets,
canonical skills, cloud command authority and provider state. **N/A** public
Changeset: private resource-policy and local qualification only.

Focused checks: the infrastructure typecheck passes. A first direct package
test used the older compiled API export and failed the new API property checks;
after the owning `api` build, all 32 infrastructure tests pass. The README now
records that prerequisite; root test already builds dependency exports.
The real CLI local journey passes. Removing only the API graph's explicit
observability property makes the saved local-state Schema reject its missing
policy after runtime checks. Exact source restoration makes both tests pass.

The hosted heading-restoration timeout exposed a test timing weakness. The
pinned Vite watcher drops repeat change events within 50 ms. A direct native
non-polling watcher check sees only the first event for immediate change/restore,
but both events for saves spaced 100 ms apart. The saved real CLI test now uses
that non-polling watcher on macOS too and separates the first visible edit from
restoration by 100 ms, retaining both visible assertions and original deadlines.
Both real CLI tests pass in 16.52 seconds. A separate removal run happened to
pass without the delay, so it is not a deterministic real-app removal failure;
the direct watcher reproduction and original hosted failure remain distinct.
Exact fixture restoration followed by both saved tests passes again.

The first attempt to create the graph removal driver hit local ENOSPC before
writing or executing it. A fresh disk check then showed sufficient space without
any deletion by this task. The retry and exact restoration succeeded; do not
infer a cleanup or provider event from that change in available space.

The current candidate's full local closeout passes: all 467 lint cases, all
27 fresh app/package test tasks, 16 builds (11 unchanged cached), standalone
API/temporary consumer smoke, complete verification including 32 Quality cases
and 13 isolated copies in 453.92 seconds, both unused-code graphs, all types,
24 fresh SDK browser cases, eight fresh Website browser cases, actual Wrangler
declarations and all six fresh native tests in 37.17 seconds. The
[containment receipt](../../documentation-audit/clean-slate-foundation/2026-10-05-native-trace-containment.json)
records the exact candidate and artifacts. No application/config change follows
these checks; final acceptance edits are documentation/evidence only.

The [T003 acceptance review](../../documentation-audit/clean-slate-foundation/2026-10-05-native-connection-acceptance-review.json)
reconciles its four original outcomes and explicit containment criterion against
source and actual tests. T003 is now **completed locally**. Exact candidate
hosted correction, draft review and unchanged external Linear status remain
separate. T009 still owns CSF-009 safe exported tracing and remains unmet;
DEV-75–81, provider delivery and the Medicare choice remain unfinished. Begin
T004 without treating a draft or this task milestone as the persistent goal's
completion.


## T004 previous calculator answer candidate

Continue from containment draft #136 at
`ab145823ac7a83afb55daf8978d8c03e6a4e9bed` on
`codex/dev-75-stale-calculator-answer`. Its exact hosted Quality run
`37257851322`, job `111598645867`, succeeds at that exact parent head, completed
`2026-10-05T03:19:58Z`. This also qualifies the hosted source-restoration
correction; failed #135 stays failed. Current T004 candidate proof is separate.

Implement the agreed Q10–Q12 answer behaviour before expanding other pages.
Native AsyncResult already retains the last success through refresh, failure
and interruption. Remove the submit reset, derive the retained report in the
policy container, keep checked server-submission success as its fallback, and
render it in the readonly leaf with a visible out-of-date message and named
semantic output. Editing still interrupts; initial rendering/editing/reverting
figures still calculate nothing. A successful explicit calculation clears the
message; failed/invalid retries retain it. No new browser storage or URL state.

Documentation impact: **Change required** for Website atom/container/leaf/style,
existing actual native fixture, exact named server-restored Playwright input
permission and CLI canaries, app/frontend/testing owners, task/journey/evidence.
**Preserve** canonical tax facts/results, SDK/RPC/HTTP contracts, cancellation,
fixed reports/disabled platform policy, docs resources/content, skills,
provider authority and runbooks. **N/A** Changeset: private app behaviour only.

First full native suite passes all six tests in 39.71 seconds. The expanded
native pair check then passes in 5.45 seconds: actual browser success, stale
editing/reverting, one successful fresh RPC, unavailable/invalid retry, plus
actual successful server-submission HTML hydration and failed retry. The first
lint attempt required semantic `output` rather than a status role on a div;
that correction passes the real native suite. The expanded lint attempt also
rejects the new named server-restored input's native `fill` method. Admit only
that exact receiver/path and qualify accepted/rejected CLI cases; do not widen
runtime or general collection permissions. Removal proof and repository
closeout pass below. T004 remains in progress; all three pages and complete
later requirements are not claimed.


All 470 actual CLI lint cases pass, including 406 portable cases. The new named
fixture call is accepted; an unrelated receiver there and the same receiver
at the leaf are rejected. Removing previous-success reading and rebuilding the
native artifacts fails the actual stale-answer browser observation after an
edit. Restoring the old submit reset and rebuilding fails the invalid-form
assertion: the previous answer disappears. The unavailable-retry positive check
still passes in that mutation, so do not mislabel the removal failure. Exact
source restoration, fresh artifacts and the saved native browser test pass in
4.15 seconds.

Repository closeout passes: 470 CLI lint cases (406 portable), 27 app/package
test tasks (4 fresh, 23 cached), 16 build tasks (1 fresh, 15 cached), fresh API
smoke with cached prerequisites, and full verification. Verification freshly
runs 32 Quality cases including 13 isolated copies in 485.30 seconds, both
unused-code checks, four changed type tasks (23 cached), actual Worker type
checks and all six native tests in 41.83 seconds. SDK's 24 browser checks and
the Website's eight browser checks are replayed from cache in that command;
the Website checks were freshly run for this slice in 2.67 seconds. This is
local proof for the stale-answer slice, with exact source/artifact identities
in the dated receipt. Hosted candidate proof and draft review remain pending.


## T004 take-home explanation candidate

Continue the stale-answer draft #137 at
`8e4236e1a9c596c3a5d3762d3ac1d4c150393edf` on
`codex/dev-75-take-home-explanation`. At initial readback its exact hosted
Quality run `37260854862`, job `111607580162`, is in progress. Local proof for
that parent remains separate from this candidate.

Implement the Q11 explanation for the existing take-home page using a focused
readonly result leaf: main answer and stale warning first, native expandable
pay breakdown, explicit Australian resident/2025–26/PAYG-only assumptions and
limits, recorded threshold choice and report-owned source references. All
amounts and changing assumptions remain attached to the report while the form
changes. Missing trace scale cannot imply a choice. Valid HTTPS citations are
links; other references are text. No new storage, calculation, public package
contract, route or client.

Documentation impact: **Change required** for the result/form leaves, styling,
existing browser/native fixtures, pending-error container correction,
app/frontend/testing owners and task/journey/
evidence pointers. **Preserve** atoms/runtime/lifetimes, canonical
facts/rules/results, SDK/RPC/HTTP/OpenAPI, public MDX, infrastructure/disabled
platform policy, skills, lint permissions and runbooks. **N/A** Changeset for
this private app rendering slice.

The first actual six-test native suite passes in 41.98 seconds, including
keyboard expansion and report identity after editing. Initial type/lint checks
reject an unexported URL Schema and unchecked trace index. Use the owning
record's Option lookup, with no policy exception. The malformed HTTPS browser
case then rejects the attempted encoded-URL Schema check: that Schema is only
annotated text, and validity belongs to its transformation. Correct link
presentation with the platform validity check plus HTTPS condition; complete
browser and repository qualification is pending. T004 remains in progress for
other calculators and complete interface/transport/domain requirements.


The explanation oracle also requires a distinct successful native browser
request after restoring the server answer and retrying: 2000 dollars weekly,
threshold not claimed, produces 1425 dollars take-home with 575 dollars PAYG
withholding. Both gross/taxable fields become 2000 dollars, the recorded
threshold changes to not claimed and the stale warning clears. This rejects
an explanation hard-coded to the first 1654-dollar example.


At later exact readback, parent #137 Quality succeeds at
`8e4236e1a9c596c3a5d3762d3ac1d4c150393edf`, run `37260854862`,
job `111607580162`, completed `2026-10-05T04:06:19Z`. This qualifies the
parent only, not this explanation candidate.

The distinct-result recovery case originally times out. Diagnostic browser
headers contain no tracing/credential leak, and actual private/public Worker
calls return the expected 1425-dollar result. Chrome's console identifies
Local Network Access refusing the loopback request. The before/after evidence indicates that synthetic saved-document
fulfillment changes the navigation's address-space classification; its mocked
failure observation cannot qualify a later real request. Replace that saved
navigation with one actual private POST using the existing form, then hydrate
without replay. The controlled unavailable reply is limited to one request.
The real subsequent RPC then updates the answer, both amounts and threshold
assumption; the focused native fixture passes in 5.15 seconds. No browser
permission/flag, provider, tracing or public transport change.

The investigation also identifies a separate visible-state issue: AsyncResult
retains the old failure/interruption while a new request waits. Add the policy
container's waiting check so only a finished request failure becomes an alert;
form validation still displays immediately. A focused browser case observes a
completed failure and pending retry, busy state and absent old alert. Record
its removal/restoration proof separately from the address-space fixture cause.
Complete repository qualification remains pending.


The pending-error removal fails the actual rendered alert assertion (one failed,
11 skipped, 2.03 seconds). The driver restores the source bytes exactly, then
all 12 Website browser checks freshly pass in 3.00 seconds. Final focused
types/lint/docs/runbooks/format pass. The root test command freshly passes
470 actual CLI lint cases, including 406 portable cases, in 59.97 seconds;
27 app/package tasks pass with one fresh and 26 cached. The root build passes
16 cached tasks. The first API smoke command is cached; a direct app smoke
command then freshly passes real HTTP, external temporary consumer and cleanup.

Complete verification passes with 32 fresh Quality cases, including 13 isolated
copies in 520.83 seconds, both unused-code checks, one fresh type task with
26 cached tasks, actual Worker declaration checks, fresh native builds and
all six native tests in 47.46 seconds. SDK's 24 and Website's 12 browser checks
are cache replays inside that command; the Website's fresh run is recorded
above. Exact source and artifact identities belong to the dated receipt.
This locally qualifies the bounded explanation/retry-display slice; hosted
candidate checks, draft review and the remaining T004 work stay open.


## T004 calculator catalogue connection candidate

The take-home explanation is pushed as draft #138 at
`48dcf8e657130da5a85a3a36db1c2dd974e62126`; exact hosted Quality run
`37264804942`, job `111619227474`, is in progress at first readback. Continue
on `codex/dev-75-calculator-catalogue` without treating its earlier local
checks as hosted acceptance.

The remaining pages must use the supported calculator catalogue rather than
introducing a separate list. Add one closed named `ListCalculators` RPC over
`PublicCalculatorService.listCalculators`, using its owning `MetadataQuery`
and `CalculatorCatalogResponse` Schemas. Native request admission recognises
only the existing Calculate and new declared procedure. Each client operation
owns its receive-loop scope, complete five-second deadline, checked transport
failures and disabled credential/redirect/tracing policy. Decode failures on
the new native exit use the existing safe marker; unrelated defects remain
defects. No generic operation callback or browser engine is added.

Documentation impact: **Change required** for RPC source/tests/README, native
API/Web fixture, API/SDK/package-ownership/effect-services/testing architecture,
API README, task/plan/evidence and one minor private RPC Changeset. **Preserve**
canonical tax rules/results, public HTTP/OpenAPI/SDK and MDX contracts, form
behaviour, infrastructure, disabled platform policy, skills/lint/CI and
runbooks. Public generated snapshots are **N/A** for an RPC-only addition.
The Changeset records the private package interface; no version or publication
operation is performed. T004 remains in progress; homepage consumption, the
other two pages and complete transport/domain qualification remain open.

The first 36 RPC checks pass. Initial type checking rejects a test-only union
of calculation and catalogue Effects at `Effect.flip`. Discard each unused
success value inside its selected branch; the error observation then has one
checked type, with no cast or widened exception. Types and all 36 checks pass
after that correction. Fresh saved native catalogue and complete repository
qualification are pending.


At later readback, parent #138 Quality succeeds at the exact head, run
`37264804942`, job `111619227474`, completed `2026-10-05T04:58:45Z`.
The catalogue candidate freshly builds and passes all six native tests in
42.27 seconds, including two checked catalogue reads through the actual built
API before/after idle. Full repository qualification remains pending.


Catalogue closeout passes: 470 fresh actual CLI lint cases (406 portable) in
56.56 seconds; 27 app/package tests (16 fresh, 11 cached); final root build
with four fresh and 12 cached tasks; fresh API HTTP/external consumer smoke;
fresh packed SDK (46 files) and downstream installation/types/runtime/exports/
browser checks. The initial build omitted the provisioned browser path and
failed docs MDX generation; adding that environment path passes, with no install
or code change. The damaged catalogue-reply marker removal produces the
required failure; exact restoration returns all 36 tests to passing.

Full verification passes: 32 fresh Quality tests including 13 isolated copies
in 474.10 seconds, both unused-code checks, 16 fresh and 11 cached type tasks,
24 fresh SDK browser checks, actual Worker declarations, fresh native builds
and all six native tests in 39.99 seconds. Website's 12 browser checks are
replayed inside that command and were freshly run above in 2.97 seconds.
Post-check changes are confined to this plan and the dated receipt. Exact
source and built artifact identities are retained there; hosted candidate
proof and draft review remain separate. T004 still requires actual catalogue
consumption, other pages and complete package/transport/domain qualification.


## T004 calculator pages candidate

Parent draft #139 at `cd03dd81694098d79a214650727ad3ee69f70f8d`
passes hosted Quality run `37267118835`, job `111626168020`, completed
`2026-10-05T05:37:20Z`. Continue on `codex/dev-75-calculator-pages`.
The root bootstrap consumes that checked catalogue for navigation. Independent
withholding and annual pages use the existing backend and report-owned
explanations; standard HTML forms use the same private operation. Saved forms
check identity/form/report correlation. The annual page preserves the tax
figures and states the unresolved Medicare limitation. Developer and agent
routes link to real native API descriptions, without claiming later MCP.

Documentation impact: **Change required** for Website source, dependency/lock,
TanStack-generated route tree, app README, frontend/effect/testing/tooling
owners, exact host lint admissions/actual CLI fixtures, active task/plan,
journey and dated evidence. **Preserve** tax rules/results, public HTTP/OpenAPI,
SDK, MDX, infrastructure, skills, CI and runbooks. A package Changeset is **N/A**
for private Website presentation/dependency and focused test-lint admission;
no public package interface changes or version operation occur.

Initial app/type/browser checks pass. The native new-page oracle exposes an
empty result after Calculate. Mounted React consumers now hold their atom-family
description group; native qualification is still pending. Lint simplification
and initial test-fixture placement errors are corrected without broad policy
exceptions. Linear readback returns `Could not find referenced Issue` for both
DEV-75's saved UUID and identifier; no tracking mutation is attempted.
T004 remains in progress for complete page and package/transport/domain proof.


Stronger native proof uses different saved values from the initial examples.
The first version returns correct server HTML but hydration resets the amount
to the page example. Retaining the grouping object alone does not fix that
restoration. Move checked form seeding to each feature's supported
`useAtomInitialValues` hook before its form read; root registry settings remain
the sole provider seed. Fresh native build and the strengthened focused
journey pass in 9.76 seconds. Do not treat the earlier default-only pass as
proof of arbitrary saved-form restoration. Native screenshots are inspected;
form controls are spaced and the single main landmark has a keyboard skip link.
Final failed/invalid retry, keyboard and complete qualification follow.

Calculator-page closeout passes: root tests include 473 fresh actual CLI lint
cases (409 portable) in 82.92 seconds and 27 app/package tasks (one fresh,
26 cached). The changed Website's nine ordinary tests pass freshly; its 12
browser checks pass freshly before and during full verification. Root build
and API smoke pass with one fresh task each. The unchanged packed SDK and
downstream checks reuse valid cached results; this is not new consumer proof.

Full verification exits zero: 32 fresh Quality checks, including 13 isolated
copies, in 581.05 seconds; both unused-code checks; 27 type tasks (one fresh,
26 cached); actual Worker declarations; fresh native builds and all six native
tests in 50.96 seconds. The stronger page journey also proves failed/invalid
attempts retain the previous answer, keyboard commands and no calculation
replay. All four native screenshots are inspected after the final build.
Post-check edits are confined to this plan and its dated receipt, with exact
source and built-artifact identities recorded there. Hosted candidate checks
and draft review remain separate.

T004 remains in progress. Next, qualify the accepted 64 KiB request policy and
checked size/deadline failures across the actual public HTTP and native RPC
connections. Remaining work includes the common operation budget, concurrency
and trusted non-exported rate identity, ten-second complete-response client
deadline, bounded metadata responses, complete named operations and retained
domain/package qualification. Preserve the existing annual Medicare figures
and visible limitation pending Cooper's scope decision.

## T004 native request size-policy candidate

Calculator pages are pushed as draft #141 at
`5cfd306c7bcf7a109b47c379bf68ea80e0eea48d`; hosted Quality run
`37271500109`, job `111639279386`, is in progress at first readback.
Continue on `codex/dev-75-request-body-policy`. The streamed native POST
reader and RPC byte admission now share the accepted 64 KiB limit, preserving
the five-second body-read deadline, source cleanup and empty 413/408 replies.
Strengthen the existing API oracle to accept valid HTTP/RPC JSON at exactly
65536 bytes, reject progressive oversized chunks and multi-byte text, and keep
its one supplied operation/request-scope proof. Actual built Workers must
reject the oversized text at both API paths and all three Website form paths.

Documentation impact: **Change required** for owning RPC reader/codec and
focused API/RPC/native fixtures; RPC/API/Web READMEs; API/SDK/testing owners;
active task/plan, stable journey and dated receipt. A major private RPC
Changeset records the stricter package-facing size contract. **Preserve**
retained tax rules/results, calculator/domain/SDK interfaces, public HTTP
route/Schema/OpenAPI definitions, generated public MDX, infrastructure, skills,
lint admissions, CI and runbooks. Public OpenAPI/MDX snapshot regeneration is
**N/A** for this host-only admission change. No versioning or publication.

First focused checks: 61 API tests and all 27 type tasks pass freshly. Running
RPC tests alongside the type command's prerequisite dependency rebuild causes
one suite to report a missing compiled calculator export; 11 deadline tests
still pass. After dependency build finishes, all 36 RPC tests pass freshly in
1.21 seconds. Do not overlap dependency rebuilds with focused consumers.
Initial lint rejects two test labels spelled utf8; correct them to utf-8.
Final lint, native proof and complete qualification are pending. T004 stays
in progress: checked failure guidance, standalone HTTP admission, common
work/concurrency/rate policy, ten-second clients, metadata response limits,
complete named operations and retained domain/package review remain open.

Restoring the old one-MiB constant makes the existing native oversized-body
oracle fail as required; exact source bytes are restored. All 36 RPC tests
then pass freshly in 1.11 seconds. Final lint has zero errors; docs/runbooks,
root format and Changeset status pass. Fresh native builds and all six native
tests pass in 50.93 seconds, including oversized multi-byte text at both API
paths and all three calculator forms, unchanged CORS and existing retained
calculator/error/restoration/cancellation/development journeys. Complete
repository qualification follows with source edits frozen.

The first sequential root test/build/API smoke/packed/downstream checks pass.
Full verification then exits 101 during isolated Quality dependency installation
with ENOSPC. Its scoped copies unwind; free disk later reads 12 GiB without
manual removal of repository/user files. Retain this failed attempt and rerun.

Parent #141's exact hosted Quality run fails, completed
`2026-10-05T06:28:38Z`: the page test cannot open its macOS-only `/private/tmp`
screenshot path on Linux; five other native tests pass. The current candidate
corrects that fixture to Effect Path/FileSystem-created
`.alchemy/native-pair/screenshots` under the existing ignored build root.
Local macOS proof had not exercised a different temporary root. Durable testing
ownership now records portable artifact placement and that false-green limit.
The failed head stays in history; no rerun or hosted success is inferred.
All complete checks must be repeated as required after the correction.

Corrected complete local qualification passes. Root CLI executes 473 fresh
cases (409 portable) in 73.61 seconds. Package/app tests have one fresh Web
task and 26 cached tasks; build has one fresh task and 15 cached tasks. API
smoke and packed/downstream consumer checks reuse unchanged-input cached
evidence. Full verification executes 32 fresh Quality cases across 13 isolated
copies in 602.97 seconds, all 27 type tasks (12 fresh, 15 cached), 24 fresh SDK
browser tests, 12 fresh Website browser tests, and fresh native builds with all
six native tests in 52.96 seconds. All four portable screenshot files are
visually checked for controls, explanations, warning and distinct restored
values. No hosted correction proof is claimed.

Post-verification changes are limited to this plan and the
[bounded receipt](../../documentation-audit/clean-slate-foundation/2026-10-05-request-body-policy.json).
Recheck docs/runbooks/format/Changeset status and whitespace before commit.
T004 remains in progress; next qualify checked client failures and the accepted
complete-response deadline, then the remaining shared request/work policy.

## T004 checked private client response candidate

Draft #142 at `ee29ccf6fb15228770d8cea479d5f90c1c519425` passes hosted
Quality run `37275408391`, job `111651213039`, completed
`2026-10-05T07:22:11Z`. This qualifies the portable screenshot correction;
failed #141 remains failed. Continue on `codex/dev-75-client-response-policy`.

The actual private client previously classified empty 408/413/429 as invalid
responses because native RPC tried to parse each body. Its concrete HTTP
adapter now checks statuses first and owns request cleanup through bounded body
reading. Two closed operations share a 2 MiB byte cap and one ten-second
complete-response deadline. The SPEC records the channel-wide cap because the
installed Web text/arrayBuffer reader ignores MaxBodySize. Keep native Protocol,
parser, version and exit/defect codecs; no generic SDK callback or new protocol.
Checked status/size/deadline errors carry fixed codes, literal messages and
manual retry guidance, without raw causes. Both page containers preserve safe
guidance on current/restored failures and never replay a calculation.

Documentation impact: **Change required** for client Schemas/errors/private
response boundary/live Layer, focused transport/deadline/browser/native tests,
exact decoder admission and its positive/nearby negative lint oracle, RPC/Web
READMEs, API/SDK/testing owners, SPEC/task/plan, stable journey and receipt.
**Preserve** retained tax/rule/results, public HTTP/OpenAPI/SDK contracts,
request body admission, infrastructure, telemetry, skills/CI/runbooks. Generated
OpenAPI/public MDX regeneration is **N/A**. Private major Changeset records
stricter reply/error representation; no versioning/publication.

Focused 50 RPC tests and types pass; lint passes after ordinary key/import
format fixes and moving native unknown-cause projection to its exact private
response boundary. Initial use of generic native transformClient fails types
because status/size handling adds HttpClientError; use the existing native
makeProtocolHttp over the concrete injected HttpClient instead. Its actual
Web Response needs an owned ArrayBuffer byte copy. The cancellation fixture
now delays twelve seconds and checks ten-second deadlines, with explicitly
justified 12-second browser and 45-second total observations. Complete built
Worker/browser/repository qualification is pending. T004 remains in progress.

Three canonical guard changes fail as required (deadline four assertions, cap
four assertions, status filtering eight assertions), then exact source bytes
are restored. All 54 fresh RPC tests pass, including empty successful status
replies. Seventeen fresh browser tests pass; six checked error variants restore
their safe guidance without another calculation. The first fresh native run
finds a saved-input copy mismatch and the unchanged thirty-second test runner
limit. Assert the canonical specific input message and allow fifty seconds for
only the cancellation test, around its forty-five-second Effect budget including
cleanup. All six fresh native tests then pass in 66.59 seconds. These fixture
corrections preserve the original fifteen-second page guards. Final focused
lint/docs/runbooks/root format/Changeset status pass. Stage all sources and
freeze them for complete repository qualification.

Complete local qualification passes: 475 fresh CLI cases (411 portable) in
60.04 seconds; 27 app/package test tasks (17 fresh, 10 cached); build 16 tasks
(five fresh, 11 cached); API smoke one fresh task and 11 cached. Direct packed
SDK checking freshly packs 46 files. Fresh downstream install/typecheck/runtime,
exports and browser bundle pass; scoped temporary folders are removed. Full
verification passes 32 fresh Quality cases across 13 isolated copies in
495.22 seconds, all 27 type tasks (16 fresh, 11 cached), 24 fresh SDK browser
tests, 17 fresh Website browser tests, fresh native builds and all six native
tests in 67.16 seconds. Four final native screenshots are visually checked.
Post-verification changes affect only this plan and the
[bounded receipt](../../documentation-audit/clean-slate-foundation/2026-10-05-client-response-policy.json);
recheck documentation/format/Changeset status and whitespace before commit.
No hosted current-candidate success is inferred. T004 remains in progress.

Read-only preparation for the remaining shared work policy confirms the native
RPC server merges each request's context into handler work, but current RPC
handlers capture the calculator at Layer construction. HTTP handlers read it
inside each named operation. Any request-owned access policy must preserve the
shared instance and give both transports the correct request context; wire RPC
headers cannot establish trusted rate identity. One request can carry several
calculation messages, so request-count-only concurrency is insufficient. A local
installed Semaphore probe holds eight calls, rejects the ninth immediately and
reuses a cancelled place. This proves API behaviour only, not an implemented
application policy. The five-second work budget must distinguish caller cleanup
from synchronous CPU preemption. The private Alchemy binding bridge owns its
own Effect abort signal; current caller/browser proof does not establish
upstream Worker cancellation. Rate-key provenance, common work policy, standalone
HTTP admission and remaining named metadata operations still require work.


## T004 shared calculation work-policy candidate

Base `9ca78ccb22b99fda32f55ca67329ad930b55685a` is pushed as draft #143. Its
hosted Quality run `37301629784` passed that exact head, read back on 5 October
2026 after completion at 11:35:09 UTC. Earlier failed parent checks retain their
own history. The next branch is `codex/dev-75-calculation-work-policy`.

The calculator package already owns application calculation orchestration. Its
new `work` Layer applies the accepted eight-place pool/five-second budget over
that same service contract, without adding a pass-through package or modifying
tax algorithms. Native API initialisation and standalone HTTP router construction
own one pool each. Installed `HttpRouter.provideRequest` builds its supplied
Layer once while constructing middleware; it does not rebuild a pool for each
request. Both transports and each RPC batch calculation use the shared service.

`CalculatorCapacityExceeded` and `CalculatorOperationTimedOut` are canonical
checked errors with fixed guidance. HTTP declares separate 503/504 response
Schemas, native RPC revision 2 preserves their identities, and browser/SSR
forms display manual-retry guidance. Existing request errors keep their four
cases/HTTP 400 and metadata error contract. Metadata does not occupy a pool place.
The direct SDK stays caller-owned with retained calculation behaviour; its
Schema export adds the canonical errors for typed server consumers.

Docs-maintainer impact: **Change required** for calculator ownership/exports,
API/RPC/SDK/app READMEs, effect/API/testing architecture, draft API error copy,
generated OpenAPI snapshot, journey, active SPEC/tasks/plan and dated evidence.
**Preserve** tax rules/source/golden results, unresolved Medicare choice,
infrastructure/provider identities, existing content lifecycle/navigation,
telemetry containment, skills and CI/lint permissions. Runbooks and commands
are **N/A**: no operational procedure or consequential authority changes. The
OpenAPI snapshot is regenerated through its owner; authored MDX stays draft and
no MDX generator or publisher gains authority.

Focused service proof covers capacity, immediate rejection, cancelled-place
reuse, timeout cleanup, late-result rejection, expected-failure/defect identity
and independent host pools. Application proof holds seven RPC batch calculations
plus one HTTP calculation and checks shared capacity/timeouts. Native qualification
and full closeout are pending in the dated receipt. Timers cannot stop synchronous
CPU work; uninterruptible work/cleanup can delay a reply. No forced remote
cancellation, rate identity, rate limiter, standalone HTTP body admission, MCP,
merge, deployment or publication is claimed. T004 remains in progress.


The corrected built-work fixture passes both native failure tests in 12.88
seconds. It reaches eight real operations, checks HTTP 503/504 CORS through the
native bridge, private SSR and public browser guidance, exactly seven batch
RPC timeouts plus one HTTP timeout, a later genuine client timeout and nine
reached cleanup events. Earlier failures retain provenance: installed severity
is `Warn`, and the real button name is `Calculate`. The source controls now
fail explicit capacity/cleanup/late-result assertions rather than merely waiting
for the test runner's timeout; exact source is restored. The generic upstream
package validator cannot qualify the pre-existing calculator layout because it
has no rendering receipt; no false scaffold receipt or ignored-log cleanup is
introduced. Repository-owned contract, export/type and actual consumer checks
remain the applicable qualification. Full repository closeout is pending.


On 6 October the interrupted full-run handle and temporary logs were unavailable;
no full pass is attributed to it. The pinned Bun 1.4.2 and Playwright Chromium
1243 were restored; frozen installation checked 777 installs/1001 packages with
no dependency changes. The first fresh root run passed 55 RPC cases but exposed
an obsolete mismatch fixture sending newly accepted revision 2. Both procedures
now explicitly send revision 1 and all 56 focused RPC cases pass. Turbo's
interrupted sibling tasks are not reported as passes. The actual downstream
fixture also imports/builds the new `@taxkit/calculators/work` declaration/default
export and checks retained values through it. Full closeout is repeated below.


Corrected full local qualification passed on 6 October 2026: root tests
(87.55 seconds; all 27 workspace test tasks fresh), build (3.25 seconds;
five fresh/eleven cached), docs validation, API smoke (one fresh/eleven cached),
exact root and fresh direct SDK packed/downstream checks, Changeset status and
full verification (555.87 seconds). Verification reached all 32 isolated Quality
workflow cases, lint/format, both unused-code checks, compiler checks, 24 SDK
browser cases, 19 Website browser cases and seven fresh native cases over five
files (76.46 seconds). All 41 staged source files were restored byte-for-byte
after the fault builds. Four fresh screenshots were inspected; retained answers,
supported-year copy, breakdown controls and the Medicare caveat remain visible.

The first full verification passed its 32 workflow cases but stopped at three
unnecessary new HTTP-adapter re-exports. They were removed without widening any
lint exception. Both unused-code checks and types then passed independently;
complete closeout was repeated on the corrected source. The dated receipt binds
40 source files, nine compiled artifact roots and four screenshots. Only this
plan and its receipt are changed after full qualification, with documentation,
runbook, format, Changeset and whitespace checks repeated before commit.

Primary-owner review accepts the local shared calculation-limit slice. RPC
revision 2 and its widened expected error contract deliberately require the
major Changeset; tax behaviour and local SDK lifetime remain unchanged. This is
not whole T004 acceptance. Trusted rate identity/limiting, standalone HTTP body
admission, remaining named operations, MCP and the later tasks remain open.
Parent #143's exact head has hosted Quality success; this candidate has no hosted
result yet. Next continue the complete closed named RPC metadata operations.
No merge, publication, deployment, provider apply or Medicare correction occurs.


## T004 complete closed RPC operations candidate

Parent draft #144 is pushed at `ded95d387f244f427c8349feba8fdd342274be42`;
its exact hosted Quality run `37386080486` was running at initial readback.
The new `codex/dev-75-closed-rpc-operations` branch adds the seven missing metadata
calls to the existing RPC group/service/live/test handlers, reusing calculator
Schemas and the existing application service. Revision `3` makes the complete
operation set explicit; revisions `1`/`2` are rejected before service dispatch.
No public HTTP/OpenAPI or local SDK interface changes.

The group owns procedure admission and exit-decoder identities. A private
concrete Effect transformation owns the native client scope, complete response
deadline, fetch policy and safe error projection for all nine named calls; it
receives an Effect, not an arbitrary raw-client callback. The request-error
projection has four real consumers. This reduces repeated policy paths while
keeping application operations explicit and closed. Existing browser test
Layers implement every required method; unused metadata methods fail explicitly.

Docs-maintainer impact: **Change required** for RPC/app/calculator READMEs,
API/Effect/testing architecture, current SPEC/tasks/plan, stable journey, audit
router and dated proof. **Preserve** tax algorithms/source/golden results,
Medicare choice, HTTP/OpenAPI/SDK, body/work/rate owners, content lifecycle,
provider/infrastructure identities, telemetry, skills, CI and lint permissions.
Runbooks/commands/generated public references are **N/A**: no operational,
public HTTP or publication change. A major private RPC Changeset records the
required service methods and contract revision.

Focused transport tests cover all nine operations. The first new metadata
membership assertion incorrectly assumed list ordering; production is preserved
and the oracle checks complete membership/length. Vitest's asymmetric matcher
needs a mutable input array, so Effect Array copies the readonly expected list
only at that framework boundary. Corrected compiler checks pass and 208 RPC
cases pass in 616 ms before the final matcher adjustment; complete current
qualification follows in the dated receipt. Actual native new metadata calls,
negative controls and full repository checks are pending. T004 remains active
for remaining body/work/rate policy and whole domain/package acceptance. No
merge, deployment, publication, provider apply or Medicare correction occurs.


Current corrected root lint/types/docs/runbooks and all 208 RPC cases pass
(783 ms). Both unused-code checks pass. Four source removals fail their focused
oracles: eleven-second client budget, removed schema-call revision check,
missing schema-call ingress tag and missing schema-call reply marking. Every
changed source is restored exactly. A fresh native build and all seven Worker
cases pass in 80.37 seconds overall (74.63 seconds for tests), including every
new metadata call and the browser's engine-import exclusion. Full closeout
follows on the staged source; no source edits run during isolated verifier or
fault builds. Parent #144's hosted check remains running at this readback.


Full local qualification passes for the 27-file closed RPC candidate on
6 October 2026: root tests (87.33 seconds; 16 fresh/11 cached workspace tasks,
208 RPC cases), build (qualified seven fresh/nine cached tasks before the final
16-task cache reuse), docs validation, fresh API smoke, genuine root and direct
packed/downstream SDK consumers, Changeset status and verification (578.42
seconds). Verification reaches 32 fresh workflow cases (470.85 seconds), both
unused-code checks, compiler, 24 SDK browser cases, 19 Website browser cases and
seven freshly built native Worker tests (75.19 seconds). All 27 staged files
match their pre-check hashes after fault-source restoration. Four newly captured
screenshots are byte-identical to the already inspected work-policy images.

Parent #144 now has exact hosted Quality success: run `37386080486`, job
`112019569943`, completion `2026-10-05T23:22:36Z`, head
`ded95d387f244f427c8349feba8fdd342274be42`. This does not establish hosted proof
for the new nine-operation candidate. The dated receipt binds 26 source files,
nine compiled artifact roots and four screenshots; only this plan and receipt
change after full qualification. Docs/runbooks/format/Changeset/whitespace checks
are repeated before the tested commit, push and draft PR.

Primary-owner review accepts this local closed-operation slice and its concrete
Effect policy reuse. Required named service methods and revision 3 have a major
private RPC Changeset. T004 remains in progress for trusted rate identity/
limiting, shared standalone HTTP body admission, metadata operation budgets and
whole domain/package review. Next share the HTTP body owner and complete the
remaining request/operation protections. Tax behaviour, Medicare choice,
provider identities and unrelated work are preserved; no merge, publication,
deployment or provider apply occurs.


## DEV-75 shared request and operation protections — 6 October 2026

Parent draft #145 is pushed at `fc22e47a083ff967efa4763c310d8fbdd7e214fe`;
its exact hosted Quality run `37388858997` remains running at this readback.
The current branch `codex/dev-75-request-operation-protections` moves the shared
native body guard into the HTTP transport owner, preserves the RPC compatibility
alias and mounts the standalone HTTP guard. Fixed canonical body errors supply
checked JSON 413/408 guidance or safe HTML form guidance with a recovery link.
All nine calculator-service operations share the five-second completion budget;
metadata does not consume a calculation place. Public HTTP metadata declares 504;
the existing RPC revision already admits this checked timeout, so remains 3.

Docs-maintainer impact: **Change required** for affected package/app READMEs,
package/API/Effect/testing architecture, generated OpenAPI, source/declaration/
packed consumers, exact decoder admissions, current SPEC/tasks/plan, stable
native journey, audit router and dated receipt. **Preserve** retained rules,
source/golden results, Medicare decision, browser calculation behaviour, closed
RPC revision, SDK lifetime, infrastructure/provider identity, telemetry, skills,
CI and operational procedures. **N/A** for runbook/command/public-content
changes: no new procedure, publication or public editorial change. Major
Changesets record service/error and HTTP/SDK/RPC consumer changes.

Early checks found ordinary key-order/style issues, two fixture variable/type
issues and missing exact egress decoder admissions. These are corrected at the
owning files; no runtime or generic policy exception is broadened. The obsolete
RPC body error factory admission is removed because that Schema now lives in the
canonical HTTP Schemas module. Focused checks, source-removal controls, genuine
packed consumers, native built tests, full repository checks and local CI-mode
release graph qualification follow. T004 remains in progress; nothing is merged,
deployed, published or applied to a provider.


The first HTTP metadata fixture supplied its controlled service too late:
`HttpApiBuilder` captures the construction context, so the original successful
service was still used. The fixture now supplies the substitute while building
handlers. Its eight real endpoint 504/error assertions remain unchanged. The
owning OpenAPI generator's output also needed the repository formatter before
root format qualification. Both failed checks remain in the dated receipt.


Focused current checks pass: 35 calculator cases, 17 HTTP cases, 217 RPC cases
and 62 native API cases, plus root lint/types, both unused-code checks and docs/
runbooks. Six source-removal controls detect relaxed size/deadline/late-result
checks, removed standalone admission and a wrong metadata status declaration.
Each source is restored exactly. The size/admission controls reach the native
payload parser's checked failure instead of the required early 413; the other
four fail their unchanged assertions. The control harness initially required an
assertion failure for the first parser control; its classification is corrected,
with failed harness provenance retained. A wrong new relative documentation link
is also repaired and rechecked. The generic package validator is inconclusive
because it scans ignored `.turbo` logs and rejects their machine-specific paths;
no logs or historical renderer receipts are deleted or invented to conceal that.

The documented local CI-mode release graph will execute the full nine checks,
including actual root verification/tests/build, docs/browser, API smoke and
packed/downstream consumers, without creating a release candidate or touching
external state. Native prequalification precedes that graph to check the new
controlled built fixture before the long isolated verification tests.


The first complete native run passed six of seven cases and reached all new
metadata timeout/status assertions, then failed a new assumption that the final
log queue contained only two entries. Four bounded host events were observed.
The corrected oracle still requires exactly two Info cleanup events and checks
all captured messages for private-fixture/figure leakage. Its focused actual
Worker case passes in 19.23 seconds; the full graph will rerun all seven cases.
The live Personal Linear workspace and exact Taxkit repository link now resolve;
DEV-75 is still Backlog, has the draft PR attachments and no comments. Tracking
writes remain unclaimed while the earlier automatic-approval rejection is pending.


The first full CI-mode graph passed verification, including 32 workflow cases
(508.54 seconds), 24 SDK browser cases, 19 Website browser cases and all seven
native cases (81.54 seconds). Root tests then stopped on one of 475 lint cases:
an older exact API test decoder oracle still expected rejection after that file's
new explicit admission. The corrected oracle accepts that file, tests both other
new decoder admissions and rejects three neighbouring files. Existing runtime
and encoder restrictions stay checked. All 47 original staged files were
restored exactly before this test-only correction; full checks follow again.


The corrected CI-mode release graph passes all nine ordered checks on
6 October 2026 in 758.84 seconds. It covers complete repository
verification and tests, build, docs validation/browser, genuine packed and
downstream consumers, API smoke and Changeset status. Verification reaches
32 fresh workflow cases (532.07 seconds), both unused-code checks, compiler,
24 SDK browser cases, 19 Website browser cases and all seven freshly built
Worker cases (84.15 seconds). The corrected lint corpus contains 480 cases,
including the three exact decoder admissions and three neighbouring refusals.
All 48 staged source files match their pre-check bytes after the builders and
negative CLI fixtures finish.

The native artifact inventory is captured immediately after successful
verification, before later root build work; four screenshots are byte-identical
to the previously inspected parent images. Parent #145 has exact hosted Quality
success for `fc22e47a083ff967efa4763c310d8fbdd7e214fe`, run `37388858997`,
job `112028862698`, completed `2026-10-05T23:51:17Z`. This qualifies that parent
only; hosted checks and review for this candidate remain pending. The dated
receipt retains the failed graph and both corrected lint fixture attempts.

Primary-owner review accepts the local request/metadata operation slice:
canonical body errors, native checked JSON/HTML rendering, shared HTTP body
owner, closed calculator metadata errors, one reused operation budget and thin
transport mappings have concrete owners and focused failure controls. The
major Changeset records public error/export changes. Only this active plan and
receipt change after qualification; docs/runbooks/format/Changeset/whitespace
checks follow before commit, push and draft PR.

T004 remains in progress for the trusted non-logged rate key/limiter and full
domain/package review. The recommended next rate design shares an allowance
by connection; Cooper's optional browser preference is still unanswered and
no limiter is implemented here. Read-only domain review found throwing
constrained money/date helpers, semantic optional dates/metadata, mirrored
non-recursive data fields and incomplete tax-table relationship checks. Those
need separate corrections with unchanged source data, historical codecs and
golden results. No Medicare correction or provider operation is included.


## DEV-75 canonical trace and ledger field owners — 6 October 2026

Parent draft #146 is pushed at `72c8f42041ae942ef67a1327d6dc69ab1fb6d12c`;
its exact hosted Quality run `37393720058` is still running. The next branch,
`codex/dev-75-domain-schema-owners`, removes ordinary handwritten ledger Type/
Encoded interfaces. Both aliases infer from the owning Schema. Recursive trace
aliases share one non-recursive field Schema and annotate only children. This
deliberately removes interface declaration merging; a major core Changeset
records the public type-owner change. Values and encoded contracts stay the same.

Four pre-change/current actual codec probes match encoded bytes, key order,
omissions, explicit undefined keys and round trips, including nested traces and
a ledger containing a Money value. The first probe incorrectly mixed direct
Effect source imports with the installed distribution and failed on Money; the
probe now uses the real package export and passes. This was a probe setup error,
not a qualified core defect. The genuine packed/downstream consumer now checks
the public aliases, recursive brands, exact historical bytes and round trips.

Docs-maintainer impact: **Change required** for core README, the graph/trace/
ledger owner (including legacy metadata and its outdated raw-Unknown example),
Effect architecture, packed consumer fixture, current SPEC/tasks/plan, audit/
testing pointers, dated receipt and major core Changeset. **Preserve** tax/source/
golden values, current codecs and optional representations, HTTP/RPC/OpenAPI,
calculator/browser behaviour, package paths, toolchain, skills, lint permissions,
CI, infrastructure and telemetry. **N/A** for runbooks/new commands/public MDX:
no operation, command or editorial publication changes. Focused and complete
qualification follows before accepting the slice. T004 remains unfinished for
rate identity/limits and the wider domain audit; no provider operation occurs.

Both source-removal controls fail at their intended packed-consumer phases: a
field-order change fails runtime, and replacing checked JSON inputs with unknown
values fails type checking. Source is restored after each. The first outside
harness expected a raw child error that the safe runner suppresses; its classifier
now uses the named phase. No runner error output or production policy changed.


Local acceptance for the trace/ledger field-owner slice: the complete nine-stage
CI-mode graph passes in 745.19 seconds, including 32 fresh
workflow cases (514.33 seconds), all 480 real lint cases, complete tests and
builds, packed/downstream consumers, API smoke and docs/browser proof. Actual
native verification passes seven built Worker cases (84.41 seconds). All
13 staged candidate files match their pre-check hashes; the API fault-build
source also matches its unchanged parent. Nine native output inventories were
captured immediately after verification, before root build; four screenshots
match the already inspected parent bytes. Only this plan and receipt change
after the full graph; final docs/runbooks/format/Changeset/whitespace checks follow.

Parent #146 now has exact hosted Quality success for
`72c8f42041ae942ef67a1327d6dc69ab1fb6d12c`, run `37393720058`, job
`112044577422`, completed `2026-10-06T00:40:15Z`. Current-candidate hosted proof
and reviewer acceptance remain separate. Primary-owner review accepts the
local inferred-alias change and its exact historical codec proof. A major core
Changeset records the loss of open-interface declaration merging. This does
not accept Option migration, constrained constructors, table relationships or
rate limiting. T004 and the overall DEV-73 then DEV-74–81 goal remain active.

Linear reads recovered. All 44 DEV-73 comments were enumerated; the original
Medicare correction decision remains unresolved with no newer decision found.
DEV-75 still reads Backlog and initially had zero comments. Cooper separately
approved the prepared #146 progress comment after the connector paused it;
comment `6a17034d-46f9-4450-821e-d5534c34df7c` is saved and independently read
back as the sole comment. No status, description or native dependency change
is claimed. Retained Medicare values and all tax outputs stay unchanged.


## DEV-75 fallible money and calendar values — 6 October 2026

Draft #147 is pushed at `390c3cd143ac31f787b646b8795b59bc66df2cbc`; hosted
Quality run `37396296951` was in progress at slice start. The next branch is
`codex/dev-75-fallible-domain-values`. Arbitrary money/date/decimal constructor
inputs and derived constrained amounts return owned checked errors. Pure
`aud(Cents)` assembles already checked cents; new `audFromCents(number)` checks
a number that still needs validation. Dollar, arithmetic, rounding, decimal and
calendar operations return Effects. Rule operations translate these failures to
safe calculation errors. Trusted authored constants retain canonical Schema
construction; no package or domain runtime is added. Public Type contracts and
examples change together with deliberate major Changesets.

Date overlap will treat an absent end as open-ended instead of using the finite
9999-12-31 surrogate. The Australian interval helper will check the complete year
label, including its suffix and representable end date; generic TaxYear stays
an open branded identifier. Any optional-value migration in this slice must
preserve the original codec bytes and admitted representations. The outside
installed-Schema probe shows OptionFromOptionalKey(OptionFromUndefinedOr(...))
can retain missing, explicitly undefined and present keys; a simpler nested
optional-key composition failed that requirement and was not adopted. This
prototype is not production or packed proof.

Docs-maintainer impact: **Change required** for primitive/rule owners, affected
public examples/export checks, package READMEs, relevant architecture, current
SPEC/tasks/plan, dated evidence and major Changesets. **Preserve** tax/source
values, known golden results, historical encoded data, supported years, UI
behaviour, selected dependency versions/toolchain and canonical skills.
**Change required** for Core's test typing/dependency declaration (the installed
@effect/vitest version is unchanged), source-only build override, and exact
primitive/date-snapshot decode/encode admissions with actual CLI controls.
**N/A** for provider operations, new commands and operational runbooks unless
the final change introduces one. Rate limiting, whole-table relationships and
whole T004 acceptance remain separate unfinished work. No merge, deployment,
publication, provider apply or credential change is included.

Focused implementation findings: a domain-only Option ordering check vanished
under Schema.toEncoded. The final codec composes its encoded representation and
Option field owner, with one shared ordering predicate checked at both forms.
The installed BigDecimal parser admits an empty string as zero; that existing
case remains valid. Initial test assumptions about both behaviours were wrong
and corrected from installed source and actual tests. Initial lint fixes also
needed numeric grouping, safe imports and a relocated type-error directive.
An outside formatting step altered source labels and literal JSON digits; those
changes were restored. Fifteen actual pre-change/current table, period and
source-artifact encodings match exactly after restoration. No source value or
golden snapshot was updated to disguise a failure.

Rule descriptor snapshots now use the owning date encoder and retain their
existing expected snapshots. Core tests compile under the package's existing
type command. Focused calculator tests require checked safe errors for oversized
derived PAYG amounts in both public pay operations. Public browser/server code
fences match their package-owned examples; the money concept explains the new
constructors. Twenty new real-CLI cases allow only seven exact decode/encode
operations and reject thirteen neighbour/runtime operations. Complete
qualification and primary-owner acceptance follow before this slice is committed.

Final arithmetic review found the installed decimal parser accepts safe but very
large exponents. Cent conversion now bounds the power from the existing exact
decimal magnitude before constructing it, returns checked failure for a result
that cannot fit and rounds tiny values to zero. It retains zero multiplication,
ordinary exact rates and half-away-from-zero cent rounding. A focused extreme-
exponent test passes; removing the bound fails that assertion and source is
restored. All 500 current real-CLI lint cases pass, including the twenty added
cases; complete graph proof remains pending.

The first complete qualification failed at the browser settings test after
494.51 seconds. An outside numeric-formatting edit had also grouped the digits
inside two local test URL ports; both original URL strings are restored and
changed quoted strings checked for the same accidental edit. The 32 workflow
tests passed in that attempt, but native verification was not reached. Its
completion-triggered artifact inventory is retained as unqualified, not accepted
native proof. Focused browser/API checks and a complete corrected attempt follow.


Local acceptance for the fallible money/calendar slice: the corrected complete
CI-mode graph passes all nine stages in 686.09 seconds. It
includes 32 workflow tests (472.14 seconds), all 500 real lint cases, complete
tests/builds, genuine packed/downstream consumers, API smoke and docs/browser
checks. Native verification passes seven built Worker cases (80.38 seconds).
All 97 staged files match their saved pre-check hashes and the API Worker matches
its unchanged parent source. Nine native inventories were captured after
successful verification, before the later root build; four screenshots match
the already inspected parent images. The earlier failed attempt and unqualified
inventory remain recorded.

Primary-owner review accepts this local constructor/derived arithmetic/calendar
change. Core's 59 tests cover safe fixed failures, overflow, decimal rounding
and extreme exponents, real Gregorian dates, whole Australian labels and all
three historical end-key representations. All 15 authored table, period and
source-artifact encodings match saved pre-change bytes. Five deliberate removal
controls fail for their named reason and restore sources. Public examples and
major Changesets record the deliberate type/Effect changes; HTTP/RPC saved
representations and retained tax results stay unchanged. Only this plan and
receipt change after qualification; final docs/runbooks/format/Changeset and
whitespace checks follow. Hosted checks and reviewer acceptance are separate.
T004 and the wider DEV-73 then DEV-74–81 goal remain active; next are whole-table
relationships, remaining semantic absence/service ownership and trusted rate
identity/limiting. The Medicare correction decision remains unresolved.


## DEV-75 whole parameter-table relationships — 6 October 2026

Draft #148 is pushed at `02c813f2d082a13ccbe38e52f350aa43bca8bb84`;
its hosted Quality run `37401147145` is in progress at slice start. The next
branch is `codex/dev-75-parameter-table-checks`. Row and whole-table checks stay
at the five existing parameter owners. Income tax and LITO begin at a zero
threshold and have adjacent ordered brackets with only the final bound open.
Schedule 1 checks each supported scale separately; STSL checks inclusive weekly
rows. Both use adjacent cent ranges and a final open bound. Medicare checks
threshold order and its positive levy/shade-in rate relationship. Local rates
and multipliers lie between zero and one; the generic decimal brands remain
open and Schedule 1's legitimate negative dollar coefficient remains valid.

The outside prototype found that Array(class row) checks vanish under
Schema.toEncoded. Each table derives the saved row array from its row owner and
applies the same relationship check to saved and decoded arrays through the
installed decodeTo composition. Thirty invalid table cases reject at three
entry points, 24 invalid row cases reject at three entry points, and all 15
saved table/period/source encodings still match the pre-change bytes. These
are preparatory observations, not repository, packed or native qualification.
Initial outside module resolution failed because root node_modules did not
include the Core workspace link; only temporary prototype links were corrected.

Docs-maintainer impact: **Change required** for the three rules package READMEs,
rules/parameter and testing architecture, current SPEC/tasks/plan, audit pointer,
qualified receipt, focused tests/consumer assertions and deliberate Changesets.
**Preserve** all authored tables/source hashes, known tax goldens, historical
encodings, supported years, HTTP/RPC/OpenAPI behaviour, rate/body/work policy,
selected toolchain/dependencies, skills and commands. **N/A** for new operational
runbooks, public editorial lifecycle and provider/publication operations.
Repository lint/types/tests, boundary controls, packed/native/full qualification
and primary-owner review follow. T004 remains in progress for the broader
semantic absence/service ownership and trusted rate identity/limiting work.
The unresolved Medicare correction is not included.

Focused proof passes: ten new owning tests cover 60 invalid row/table cases at
construction and saved representation checks, plus valid inclusive point rows,
tiny decimal exponents, signed dollar coefficients, both Schedule 1 years and
independently interleaved scales. Genuine packed consumers compare all 15
historical table/period/source hashes and reject incomplete/invalid tables at
construction, typed decoding and saved representation decoding. Five deliberate
removals fail their intended owning assertion and restore exact source bytes.
The first packed attempt failed because the generated consumer excludes ambient
Bun types; explicit CryptoHasher import fixes that external test host without
changing its configuration. Lint/types/restored rules/docs/runbooks/format and
Changesets pass. Complete nine-stage qualification follows with sources frozen.


Local acceptance for the parameter-table slice: all nine CI-mode stages pass
in 663.63 seconds, including 32 workflow tests (461.42
seconds), all 500 real lint cases, 59 Core tests and 52 rule tests, complete
tests/builds, genuine packed/downstream consumers, API smoke and docs/browser
checks. Seven built Worker cases pass (78.16 seconds). All 21 staged files
match saved pre-check hashes; the API Worker is unchanged from its parent. Nine
native inventories were captured after successful verification, before later
root builds; four screenshots exactly match already inspected parent images.

Primary-owner review accepts this local row/table relationship slice. Ten new
owner tests reject 60 invalid inputs at constructor and saved-representation
boundaries; the genuine packed consumer retains 15 original hashes and rejects
15 invalid constructor/typed/saved decoding cases. Five deliberate removals fail
their intended assertions and restore exact sources. No tax values, expected
snapshots, supported years, runtime permissions or lint rules change. Only this
plan and receipt change after qualification; final docs/runbooks/format/Changeset
and whitespace checks follow.

Parent #148's exact hosted head fails Quality run 37401147145/job 112068388626
at Core build: an explicit Node ambient-type setting cannot resolve in the clean
hosted install. An isolated outside copy reproduces both build and typecheck
failures; removing that unnecessary ambient dependency passes both. The next
separate corrective slice will qualify that change. This local table pass does
not establish hosted success. T004 remains active; semantic absence/service
ownership and trusted rate identity/limiting still need work. The Medicare
correction decision and retained zero-income behaviour remain unchanged.


## DEV-75 Core clean-build correction — 6 October 2026

Draft #149 retains the accepted table slice at
`ab1293b053929707a73b4c5c345eb82b63629db7`. Parent #148's exact hosted
Quality run 37401147145/job 112068388626 fails at Core build with TS2688:
the newly added test configuration requests automatic Node type definitions,
but Core declares no such dependency and uses no Node globals. The production
build inherits that unnecessary requirement. A local full pass did not prove
the same type resolution in GitHub's clean install.

An isolated outside copy, with only Core's declared dependency links and no
ancestor Node type package, reproduces both the original source-only build and
source/test typecheck failure. Setting the owning compiler types list to empty
passes both real compiler commands. This correction uses explicit imports and
adds no dependency, platform types, runtime admission or emitted-output change.
The same draft will receive a separate tested corrective commit.

Documentation impact: **Change required** for the Core compiler/README,
testing-quality owner, current SPEC/tasks/plan, audit pointer and dated receipt,
plus a patch Core Changeset. **Preserve** all source operations, exports, emitted
paths, dependencies/lockfile, tables/source records/goldens, HTTP/RPC/browser
behaviour, request/rate policy, skills/commands/CI and unresolved Medicare values.
**N/A** for new runbooks, commands, provider operations or public content changes.
Focused owning compiler/tests, a fresh source-only frozen install, the complete
CI-mode graph and exact current-head hosted readback follow. T004 stays active.


Local acceptance for the Core compiler correction: a fresh copy of all 1,563
tracked files installs 740 packages with the frozen lockfile unchanged. Core
source/test checking, all 59 tests and source-only build pass there. Both original
isolated compiler commands fail for the expected missing Node type package;
both corrected commands pass. No dependency or emitted-path change is needed.

The complete current CI-mode graph passes all nine stages in
665.34 seconds, including 32 workflow tests (459.21
seconds), all 500 real lint cases, 59 Core and 52 rule tests, packed/downstream
consumers, API smoke, builds and docs/browser checks. Seven built Worker cases
pass (79.04 seconds). All nine staged source files match their saved hashes;
the API Worker is unchanged. Nine native inventories and four screenshots
exactly match the accepted table parent, captured before later root builds.

Primary-owner review accepts this local clean-build correction. Only this plan
and receipt change after qualification; final docs/runbooks/format/Changeset
and whitespace checks follow. Draft #149 will contain the accepted table
commit and a separate tested compiler correction. Exact corrected-head hosted
Linux proof remains separate; parent #148's failure stays recorded as history.
T004 and the wider goal remain active for semantic absence/service ownership
and trusted rate identity/limiting. No Medicare or provider change is made.


## DEV-75 domain absence and descriptor owners — 6 October 2026

Draft #149 is open at 5fd1ebbb13455bfef86fc27dab9c88e53fcf1385 with both
local slices accepted; exact hosted Quality run 37404351740/job 112078530836
is still in progress. Continue independently on
codex/dev-75-domain-absence-owners without claiming hosted acceptance.

The next local slice gives trace formula/rounding and question help text
canonical Option codecs, preserving missing, present undefined and present
value bytes and own keys. Ordinary descriptor metadata gets one Schema owner;
generic service/schema/Layer relations stay typed. Fact-question and source-
artifact absence becomes Option at the existing constructors. Their old
constructors already omit explicit undefined. Rule parameters use a total
empty collection when omitted, matching the current public metadata meaning;
duplicate-provider permission preserves explicit false. Recursive trace
constructor input is derived from the same fields, with only its child relation
annotated; outside real compiler probes catch invalid fields and child records.

Move the calculation engine's live Layer to its own file while retaining
public exports and named run behaviour. Keep its genuine generic calculation/
Layer/result relations; its optional validation input has an existing total
empty-collection meaning and derives from the diagnostic Schema owner.
The outside optional-codec prototype retains all six trace/question forms.
Twenty-two pre-change actual metadata responses are saved before implementation
for exact compatibility comparison, not regeneration after a change.

Documentation impact: **Change required** for Core/rules/calculator/SDK owners,
relevant Effect/rule/API/testing architecture, examples or generated references
when their actual contracts change, active SPEC/tasks/plan/audit, a dated receipt
and appropriate major Changesets. **Preserve** all authored tables/source data,
tax results, historical codec/snapshot expectations, dependencies, runtime
permissions, tooling, commands and Medicare decision. **N/A** for provider
operations and new runbooks. Focused types/tests, genuine packed compile/runtime
checks, deliberate removals, actual response comparisons and the full local
graph are required before acceptance. Broader public request absence and
trusted rate identity/limiting remain active work; T004 is not complete.


Parent draft #149 at 5fd1ebbb13455bfef86fc27dab9c88e53fcf1385 now passes
exact hosted Quality run 37404351740/job 112078530836. This establishes the
previous table/clean-build slices on that head, not the current absence work.

Current focused Core (65), SDK (57), genuine packed declarations/runtime,
lint/types, docs/runbooks/format/Changeset checks pass. Packed assertions retain
all 22 saved metadata hashes, three question forms and prior trace/ledger and
table/source expectations. Six deliberate removals fail at the intended tests
or actual packed declaration stage and restore exact source bytes. Twelve
actual CLI admission cases retain test-only codecs and reject runtime execution.
The SDK regression exposed repeat representation decoding of domain reports;
selected Type narrowing fixes it. Native service Identifier lookup retains
empty tuple meaning and actual input/parameter service types. Full current
CI-mode qualification follows; no T004 or wider-goal acceptance is claimed.


The first complete absence attempt fails at workspace tests after successful
verification (32 workflow and seven native cases). Two HTTP fixtures decode
the typed client result a second time, treating canonical trace/question
Options as wire values. The fixtures now validate the owning Schema Type;
raw HTTP JSON still uses its representation decoder. Expected tax amounts,
input-error parity, secret/path checks and OpenAPI remain unchanged. Focused
HTTP, RPC and calculator tests pass. The HTTP README records this boundary;
the dated receipt retains the failed attempt. A fresh complete graph is
required before acceptance.


Local acceptance for the domain absence slice: all nine CI-mode stages pass
in 650.81 seconds, including 32 workflow cases (455.52
seconds), 512 actual lint cases, 65 Core, 52 rules and 57 SDK tests. Seven
built native app cases pass in 77.86 seconds. Genuine packed compile/runtime
checks retain the 22 historical metadata hashes, question/trace/ledger key and
byte expectations, all 15 table/period/source fingerprints and tax results.
Six deliberate removals fail at their owning tests or real packed declaration
stage. Twelve actual CLI cases qualify exact test codecs and retain runtime
rejection. All 53 staged files restore exact bytes; the API Worker source and
lockfile remain unchanged. Nine native inventories are captured before later
root builds; all four screenshots match the inspected parent bytes.

Primary-owner review accepts this local slice and its eight major package
Changesets. Only this plan and receipt change after qualification; final docs,
runbooks, format, Changeset and whitespace checks follow before commit/push and
a stacked draft. Hosted acceptance of the new immutable head remains separate.
Broader public request absence/domain error review and trusted rate identity/
limiting remain active; T004 and the wider goal are incomplete.


## DEV-75 public request absence — 6 October 2026

Draft #150 is open at facca8306d3d37fce40f09d988ba080d596bb07b after the
complete local domain-owner graph passed. Exact hosted Quality run
37408781152/job 112092261901 succeeds at 03:46:36 UTC; that parent result
remains separate from the current request candidate.
Continue on codex/dev-75-request-absence-owners.

Give the calculator-owned optional request context/help/filter fields and
optional error/metadata fields canonical nested Options. Preserve missing,
present undefined and present values at their existing codecs, including
explicit false permission. Consumers receive canonical values and flatten
only where both absent forms share a meaning. The SDK's genuine generic facts
relation derives constructor input from the same request field owners; its
service call constructs context/help once through the existing field owners.
The selected calculator still decodes facts; constructing the whole union first
would lose calculator-specific guidance. No mirrored wire DTO, repeated fact
decode or generic transport callback is introduced.

Outside prototypes retain 24 request forms, 22 error/metadata forms, all 22
saved actual metadata replies, 36 actual reports, 36 actual input errors,
36 HTTP replies, 34 RPC replies and the full generated OpenAPI. A fresh staged
source copy installs the frozen lockfile unchanged; calculator/RPC types,
RPC emitted build and SDK source build pass after fixture inputs are migrated.
Three actual SDK runs preserve report bytes and nested constructor defaults.
These are preparation only; the implemented candidate still needs owning
workspace, packed and built-app qualification. Fresh-copy RPC test suites did
not load because dependency packages had not been built; no test pass is claimed.

Documentation impact: **Change required** for calculator/SDK/HTTP/RPC owners,
matching public examples/templates, affected Effect/API/testing architecture
and optional-field standards, current SPEC/tasks/plan/audit, a dated receipt
and major Changesets for public Type changes. **Preserve** wire/OpenAPI
representations, tables/source records, tax results and retained snapshots,
public lifecycle/navigation status, commands/toolchain/dependencies/CI/skills,
runtime permissions and Medicare values. **N/A** for new runbooks and provider
operations. The public-copy route supplies clear reader wording after this
owner decision. Genuine packed compile/runtime and unchanged original
expectations, actual removal checks and the complete local graph are required.
Catalogued execution metadata, domain errors and trusted rate identity/limits
remain independent unfinished work; T004 and the wider goal stay active.


The calculator type command now includes its service/work tests. Those fixtures
previously escaped source type checking and admitted raw optional request values.
The SDK Promise rejection check and RPC unknown-JSON fixture now respect their
actual Type/representation boundary; original tax/privacy assertions stay fixed.
Focused calculator, SDK, HTTP and RPC tests and workspace types pass. Packed and
complete graph qualification remain pending. This command scope correction is
Change required; command names, CI, dependency versions and permissions remain
Preserve.


Focused lint, docs/runbooks, types, SDK tests, content and Changeset checks pass.
Four deliberate removals fail at the intended owner: guided-help test, calculator
test compiler, SDK build after removing the help default, and real packed
declarations admitting raw help. The help-default removal stops before packing;
its receipt retains that actual boundary. All altered source bytes restore.
Complete local CI-mode qualification follows on a frozen staged candidate.


First full request candidate fails verification at the Website browser request
after its source/packed checks pass. The explicitly optimised RPC dependency
contains old Schema.optional fields: Vite retained it despite changed workspace
source and an unchanged lockfile. Browser qualification now forces its dependency
bundle to rebuild; all 19 Chromium tests pass and the compiled cache contains
current Option owners. The receipt keeps the failed 490.46-second graph. This
corrects the earliest test-config owner; no production Vite, runtime, permission
or tax assertion changes. Fresh full qualification is required.


The second complete request graph reaches built native tests: six pass, but the
shared-work fixture fails because it sends domain Options through unknown JSON.
RPC batch payloads and the public HTTP body now use their canonical encoders
before framing. The existing eight reached-operation warnings, pool, timeout,
cleanup and privacy assertions remain fixed. The 555.75-second failed graph and
two failed preparation invocations are retained; fresh qualification follows.


Both corrected built native failure/work tests pass in 20.26 seconds, retaining
seven RPC plus one HTTP place, excess HTTP/form/browser rejection, metadata
budgets, cleanup and safe warnings. Current types/docs checks also pass. Fresh
complete graph follows; no whole T004 acceptance is claimed.


Third full request graph passes verification, including all seven native cases,
then fails three API app fixtures at workspace tests. Known native frames/arrays
and HTTP bodies now encode through their owning Schemas; malformed tag/id cases
mutate a valid encoded frame. All 62 focused API app tests pass. The failed
616.45-second graph remains in the receipt; no complete acceptance is claimed.


After correcting the API fixtures, all workspace tests, build, genuine packed
SDK consumer checks and API smoke checks pass. The malformed tag/id checks now
start from a valid encoded request too. Original expectations remain fixed;
complete qualification follows on all 47 frozen candidate files.


Local acceptance for public request absence: all nine CI-mode stages pass in
660.13 seconds. This includes 32 workflow cases (469.15 seconds),
512 lint cases, 65 Core, 52 rules, 37 calculator, 62 API app, 58 SDK, 17 HTTP and 217 RPC
tests, plus seven native cases (77.67 seconds). Genuine packed declarations
and runtime retain 24 request forms, 22 error/metadata forms, 36 reports and
36 safe input errors, with the earlier metadata, trace/ledger, table/source and
tax expectations fixed. Four deliberate removals fail at their actual owning
test/compiler/build/packed stages. All 47 staged sources restore exact bytes;
API Worker, lockfile and OpenAPI snapshot match parent. Nine native inventories
are captured before later builds; four screenshots match inspected parent bytes.

Primary-owner review accepts this local slice and its four major package
Changesets plus the content patch. Only plan/receipt change after qualification;
final docs/runbooks/format/Changeset/whitespace checks precede commit and stacked
draft. Hosted proof remains separate. Trusted rate identity/limiting and remaining
domain review keep T004 and the wider goal active.


Public-request slice is committed as 1b85440f844858a96a91172014a10afb87aa452c
and pushed on codex/dev-75-request-absence-owners in attached draft #151.
Its complete nine-stage local graph passes in 660.13 seconds; fresh workflow
32 cases take 469.15 seconds and seven built native cases take 77.67 seconds.
Hosted Quality run 37414462610 is running on that immutable head. The earlier
approved DEV-75 comment is posted and read back. A new #151 update remains
unsent after the connector's fresh-confirmation window ends; no approval is
inferred and no tracking status/relations are changed.

Next domain contract slice starts from clean #151 head on
codex/dev-75-domain-contract-closeout. Core cause absence gets one canonical
Option/default owner retaining four pre-change forms, while the redundant
catalogue program field is removed in the fresh interface. Current 14 rule
error producers omit causes; historical opaque diagnostics are not safe
telemetry. Constructor/representation arguments whose meaning is an empty
collection stay total, rather than creating artificial domain absence.
Selected input/continuation typing, rule-program ownership and all retained
tax/table/report metadata expectations remain fixed.

Owning types, 66 Core tests, catalogue type tests and real packed declarations/
runtime pass. One Core test initially inferred an optional record as a required
record; explicit string-key generics correct that test observation. Two packed
preparations stop at consumer type checking; the captured outside diagnostic
shows the runtime check querying a removed key as keyof CalculatorCatalogEntry
(TS2345). The membership check now admits the string key while retaining its
actual absence assertion. Original expected data is not regenerated.
Owning docs/READMEs, public error copy, SPEC/tasks and Changesets are reconciled
in this slice; full qualification remains pending. T004 and the goal stay active.


Domain closeout wider lint/docs/runbooks/content/Changeset checks pass after
fixing test key order, replacing raw JSON serialisation with the owning Schema
codec, and consuming the negative type expression. The failed lint attempt is
retained. Removing the diagnostic codec fails the new Core compatibility test
while all 65 original cases pass; restoring the unused catalogue program fails
the genuine installed consumer compiler. Both source files restore exact bytes.
Complete local qualification is next; this remains an active candidate.


Domain contract closeout local acceptance: all nine CI-mode stages pass in
668.91 seconds, including 32 workflow cases (458.61 seconds),
512 lint cases, 66 Core, 52 rule, 37 calculator, 62 API app, 58 SDK, 17 HTTP
and 217 RPC tests, plus seven native cases (78.08 seconds). Genuine packed
consumers retain four original diagnostic forms, reject raw cause/program
Types, preserve catalogue runtime absence and all earlier request/report/tax
oracles. Both deliberate removals fail; all 19 staged sources restore exact
bytes. Nine native inventories are captured before later builds, and four
screenshots match inspected parent bytes. API Worker, lockfile and OpenAPI
remain identical to parent.

Primary-owner source/docs review accepts this local domain slice. Four package
major Changesets and the content patch record the Type/capability consequences.
Only plan/receipt change after qualification; final docs/runbooks/format/
Changeset/whitespace checks precede delivery. Hosted proof remains separate.
T004 stays active for native rate identity/limits; no provider operation,
Medicare correction or wider rebuild completion is claimed.


GitHub #151 original head 1b85440f fails Linux Quality run 37414462610/job
112109888774 at 04:52:42Z: the Website native fixture imported calculator Schemas
without a declared app dependency. Corrective head
0d83692f5f3a81e3b4a776a4b82d990892685e9b uses the identical payload Schema from
CalculatorRpcPayload.fields.request.fields.payload. Focused Website compiler,
lint, docs, runbooks and formatting pass; direct owner/encoded-byte checks are
identical. The pushed draft #151 is unchanged in scope and base; fresh hosted
run 37416691591/job 112116757973 is running at 05:04:36Z.

The original 19-source domain qualification passed all nine local stages in
668.91 seconds (32 workflow cases in 458.61 seconds; seven native in 78.08).
Its evidence is retained as prior local qualification, with the Linux parent
failure recorded separately. Domain branch now follows corrected #151; complete
combined qualification is repeated before delivery. This adds no dependency,
permission, runtime behaviour, saved output or Medicare correction. T004 and
native rate work remain active.


Domain contract closeout local acceptance: all nine CI-mode stages pass in
916.14 seconds, including 32 workflow cases (674.60 seconds),
512 lint cases, 66 Core, 52 rule, 37 calculator, 62 API app, 58 SDK, 17 HTTP
and 217 RPC tests, plus seven native cases (88.59 seconds). Genuine packed
consumers retain four original diagnostic forms, reject raw cause/program
Types, preserve catalogue runtime absence and all earlier request/report/tax
oracles. Both deliberate removals fail; all 21 frozen sources restore exact
bytes. Nine native inventories are captured before later builds, and four
screenshots match inspected parent bytes. API Worker, lockfile and OpenAPI
remain identical to parent.

Primary-owner source/docs review accepts this local domain slice. Four package
major Changesets and the content patch record the Type/capability consequences.
Only plan/receipt change after qualification; final docs/runbooks/format/
Changeset/whitespace checks precede delivery. Hosted proof remains separate.
T004 stays active for native rate identity/limits; no provider operation,
Medicare correction or wider rebuild completion is claimed.


Shared rate-limit implementation starts from clean draft #152 head
0a8b823685a2a4aa453f8a4bccd624f4be976931 on
codex/dev-75-shared-rate-limits. Draft #151 corrective head 0d83692f passes
GitHub Quality run 37416691591/job 112116757973 at 05:26:07Z; #152 run
37418263663 remains running at the 05:29Z readback. The approved #146 DEV-75
comment is already saved as 6a17034d-46f9-4450-821e-d5534c34df7c; no duplicate
comment is posted. T004 stays active.

Documentation impact before implementation: Change required for calculator
rate Schemas/service/export and README; HTTP errors/OpenAPI source and generated
snapshot; RPC errors/revision/consumers and README; API/Website host/private
binding config and READMEs; native infrastructure graph/namespace configuration
and owning operational runbook; API/SDK, Effect and frontend architecture;
public limits/error guidance; package Changesets; active SPEC/tasks and dated
proof. Regenerate OpenAPI through its owning test command. Preserve tax
algorithms, source/table/report oracles, lockfile, tool versions, standards,
CI, skill assets, agent instructions and external authority. Root topology
changes are N/A because existing packages continue to own the work. Native
fixtures and packed/browser consumers must prove the whole shared allowance,
metadata independence, checked failures and privacy before acceptance.

The native host alone adds rate admission below its existing bounded service.
Public HTTP/RPC and binding-only Website calls share 60 calculations per minute
per checked redacted connection key; each batch member consumes one unit.
Missing/invalid/forwarded identity fails safely; metadata consumes no unit.
Required checked CALCULATOR_RATE_NAMESPACE has no fallback or chosen Production
value. Local native fixtures use isolated explicit values with Alchemy's own
packing. Provider namespace uniqueness and real edge identity remain separate
pre-apply readback. No provider apply, publication or Medicare correction is
authorised. This is implementation intent, not accepted runtime proof.


Rate candidate progress at 06:12Z: draft #152 Quality passed
37418263663/job 112121639658 at 05:45:25Z. The approved DEV-75 comment remains
the sole saved comment. Infrastructure's 32 tests pass with the real captured
Config representation in its persisted no-change fixture; no provider writes.
API/Web/infrastructure compiler checks pass and API tests include native provider
error/defect containment. The seven retained built-native tests pass. A new
whole-host rate test passes separately, proving shared HTTP/Website/batch
admission, IPv6 aliases, another client's allowance, metadata independence,
fixed 429/503 guidance and no fixture addresses/figures in captured app logs.
A repeated run crossed the fixed minute reset; the test now starts its short
burst outside the last five seconds of a window. The rejection expectation
remains unchanged. Whole-slice qualification is still pending.

The website's first private call failed because an explicit AbortSignal cannot
be serialised by the pinned native RPC. A disposable diagnostic retained this
failed result and restored both source owners exactly. Use the installed native
RPC adapter and omit the transferred signal, preserving local cancellation and
the API work/reply budgets. Existing fatal, malformed/stalled reply, work-pool,
CLI reload and no-JavaScript checks are retained; reply fixtures now change the
shared private/public response owner rather than dropping the new native method.
No experimental compatibility flag, dependency upgrade or remote-cancellation
claim is introduced.

Documentation impact refinement: the five canonical runbooks cover existing
docs/release/consumer/recovery operations; the native app cloud delivery
procedure remains T010/DEV-81. Runbook edit is evidenced N/A for this local rate
slice; infrastructure README and the active SPEC own required native Config and
pre-apply readback. This does not extend docs deployment authority to the apps.


Cooper's 6 October steering defers metrics/telemetry approach work for now and
authorises proceeding with the other tasks. Leave CSF-T009/DEV-80 pending and
revisit its approach before implementation. Do not add exporters, datasets,
dashboards or metric collection in this rate slice; preserve disabled platform
collection and fixed safe error containment. This is a task-specific deferral,
not a pause or completion of the overall clean-slate continuation.


## T004 shared native calculation admission and local closeout

The [shared-rate receipt](../../documentation-audit/clean-slate-foundation/2026-10-06-shared-rate-admission.json) qualifies the frozen 60-source candidate from draft #152 head
0a8b823685a2a4aa453f8a4bccd624f4be976931. All nine ordered local release checks
pass in 661.41 seconds. The actual built native pair passes all eleven cases,
including the original seven; 534 actual lint cases, 32 workflow tests, 83 API
tests and browser/packed consumers pass. Both deliberate admission removals fail
at the intended native assertions and restore exact bytes. The native artifact
inventory is captured after verification and before the later workspace build;
all four screenshots match inspected parent bytes. Tax sources, original
compatibility expectations and lockfile are unchanged.

The provider factory stays separate from the native executable composition. Its
private namespace Schema is checked by the real factory before native limiter
use. HTTP, RPC and Website calls share canonical connection admission; metadata
remains independent. SDK facade exports and checked public errors are included.
Documentation impact is Change required at the recorded semantic owners;
Preserve for tax/oracles/dependencies/skills/CI/provider state; operational
runbooks are evidenced N/A for this local slice, with app cloud delivery still
owned by T010. Final documentation, runbook, formatting, Changeset and whitespace
checks qualify supporting closeout changes.

Together with the preceding accepted calculator/SDK/domain/request slices,
CSF-T004 is locally complete. This does not accept a cloud deployment, exact
global quota, real edge headers, account namespace uniqueness or remote
cancellation. Hosted proof is still a separate immutable-head observation.
Continue T005/DEV-76 next; T009/DEV-80 metrics approach stays deferred under
Cooper's latest instruction. The wider goal remains active.

## T005 content catalogue implementation

The replacement docs slice starts from rate-admission head
d39a16ec3f9e5f4ffac8068169f8b6931adbb5ed on
codex/dev-76-public-content-catalogue. Draft #154's Quality check passes run
37430978989/job 112161511716 at 07:58:40Z on 6 October. This is hosted check
proof for that head, not deployment or publication. The proposed new Linear
comment is still unposted pending the connector's fresh confirmation.

Before implementation, documentation impact is Change required for the content
package and its generated catalogue/acceptance contracts, checked example
ownership, Website/API content routes and client contracts, public source
fidelity corrections, package/content/frontend architecture, affected app and
package READMEs, exact lint/Knip/compiler/build/cache owners, discovery assets,
current runbook/command/profile pointers and active SPEC/tasks. Preserve tax
rules and original calculation expectations, retained public MDX and historical
proof, dependency versions, metrics deferral and provider state. New external
publication, registry release and cloud operations are N/A to this local slice.
Later retirement of apps/docs requires equivalent replacement journeys first.

The four checked integration examples currently give docs-content development
dependencies on the HTTP API and SDK. Move their ownership to the private
docs-examples workspace before the HTTP API depends on content contracts; keep
their bytes and result/error expectations. This removes the impending circular
build graph without copying docs Schemas into the transport. The existing
Fumadocs processed-text compiler remains the single Markdown producer. Its
official installed Bun loader needs React resolution in the content package;
declare the already selected catalog version instead of adding a compiler,
dependency upgrade or resolution fallback. Public acceptance remains pending
page-by-page review; all existing drafts are retained meanwhile.

The checked examples follow the standard compiler build and emit application
JavaScript/source maps without a library export or declaration contract. Their
four source files remain exact parent bytes. Source and build compiler checks,
the retained source tests and ordinary Node imports preserve the weekly result
and all three invalid-request failures. An exploratory declaration build found
TS2883 for inferred HTTP errors; no public declaration portability is claimed
for these copied application templates. The canonical skill profile and receipt
remain exact parent bytes.

The installed Fumadocs Bun loader successfully reads processed text from all
61 sources with the already selected React version. This qualifies the producer
choice, not a new production catalogue generator. The source review identifies
remaining draft corrections: old Effect service/catch names, unsafe validation
examples, stale release/content paths and incomplete error reference tables.
All pages and authored navigation remain draft; no acceptance record is added.
Source links in machine Markdown also need canonical destination conversion.

Before extending HTTP, qualify a compiled content service/contract owner that
can survive ordinary installed-package resolution. The source-only Fumadocs
collection cannot become an unqualified dependency of the packed HTTP package.
Authored prose and the existing processed-text compiler stay package-owned;
the accepted catalogue, transports, HTML and discovery remain T005 work.

All nine local release checks pass in 894.46 seconds. Later focused checks
qualify the final template build configuration and supporting documentation.
The separate optional `check:harness-foundation-epoch` command fails at
skill-receipt-projection with all its relevant inputs unchanged from the parent.
Its July manifest contains six old skills while the current receipt contains
the adopted collection. Preserve that dated proof; current graph qualification
remains active-plan/T010 work. This is an inherited mismatch, not acceptance
of the current checkout by the old epoch.

The [checked-source receipt](../../documentation-audit/clean-slate-foundation/2026-10-06-checked-docs-source-owner.json)
records exact example/source identities, the draft-review candidates, passed
checks and retained failed experiments. This is a reviewable T005 preparation
checkpoint, not completion of the public docs replacement.


### Compiled content contract candidate

T005 now implements `@taxkit/content` as a private compiled owner before the
HTTP package acquires a content dependency. Existing page/navigation brands and
source error contracts move here with compatibility re-exports from
docs-content. The accepted catalogue adds whole-record checks for published
status, address/source agreement, uniqueness and matching navigation. A service
requires the checked catalogue at composition and exposes page, navigation and
bounded search operations; no empty production fallback is supplied.

Documentation impact is **Change required** for content/docs-content READMEs,
package/content architecture, exact fixture decode admissions, Knip workspace
ownership, Changeset and this plan. **Preserve** authored drafts and acceptance
records, tax results, installed dependency versions, metrics deferral and
historical proof. **N/A** for provider operations and runbook procedure changes:
this service reads checked local values. Application catalogue generation,
source corrections/acceptance, HTTP composition, replacement docs journeys,
discovery assets and any packed public release dependency remain unfinished.


The initial draft #155 source-preparation head
`d3fe4762be09803a2f7ad02073385de90295dbf3` passes hosted Quality run
37436215902/job 112178548557 at 08:50:41Z on 6 October. This hosted result
belongs to that earlier head. The compiled content candidate needs its own
fresh local checks and later hosted result after push.

An isolated actual Bun tarball installs with Effect 4.0.0 and passes ordinary
Node execution plus NodeNext declaration checking with library checking enabled.
The compiler probe uses ES2024, disposal and DOM libraries required by Effect's
published declarations; its initial missing-library failures remain recorded.
Bun pack retains repository source and test exports despite publishConfig, so
this qualifies private ordinary compiled resolution only. Public release
preparation and the HTTP dependency closure still need deliberate qualification.
Search constructs its bounded excerpt through the owning checked type and maps
projection failure to a fixed safe content error.


The private compiled content checkpoint passes its seven focused tests, the
existing nine docs-content tests, source/build types, strict lint, docs and
runbook checks, authored-content validation, Knip and ordinary installed
NodeNext/Node execution. The full repository verification passes in 676.65
seconds; the wider test run passes in 87.83 seconds. Root build passes all
18 tasks (13 unchanged cached results), and frozen install preserves the exact
lockfile. Final owner/proof metadata receives fresh docs/runbook/format checks.
This checkpoint leaves authored sources and navigation draft and adds no
acceptance record, transport or replacement route. T005 stays in progress;
T009 stays deferred. The [compiled-contract receipt](../../documentation-audit/clean-slate-foundation/2026-10-06-compiled-content-contract.json)
records source identities, exact checks, retained failed attempts, ordinary
private compiled resolution and the remaining public publication limitation.


### Public source corrections and checked copied examples

The next T005 source pass corrects old Effect service/catch names, a stale
content path, release availability claims and incomplete service-error tables.
External-input and raw HTTP examples now use their canonical schemas; calculator
help uses the typed HTTP client and checked descriptor fields. Unsafe casts and
mirrored raw DTOs are removed from the affected guides. Three complete copied
TypeScript fences bind to compiled example files and authored-content validation
rejects drift. The prior checker proved links and the four template files but
could not prove independent copied snippets; the new source-binding check owns
that missing invariant. The four original integration template bytes remain.

Documentation impact is **Change required** for affected public pages, checked
example/compiler/test owners, exact decode admissions, the snippet validation
owner and prevention test, docs-examples README, the stale architecture call
graph and this plan. **Preserve** source lifecycle/acceptance records, tax code
and retained outputs, metrics deferral, canonical skills and provider state.
**N/A** for operational runbooks and external publication. All pages remain
draft while review and the production catalogue generator continue.


### Native source compilation and source-bound acceptance

Continue T005 with an independent native MDX index generated by the selected
Fumadocs SDK. The existing Vite source and app remain available. Both source
connections use one generated collection adapter and the same checked content
service; the native compiler is local build-only code.

The repository-owned `docs:catalogue` command reads exact owner-policy bindings
before constructing that compiler connection. New version-two acceptance
records bind the reviewed source SHA-256; retained version-one records keep
their original representation. The command checks bytes before and after
processing, rereads acceptance records to catch changed decisions, constructs
the canonical catalogue and encodes only at generated-file output. Missing
acceptance, duplicate bindings, wrong owners/targets, changed bytes, paths
outside the checkout, draft navigation and hidden accepted child pages fail.
With no accepted pages it fails instead of silently producing an empty site.
The real authored corpus currently reaches this deliberate stop. No public
page or navigation acceptance has been added in this slice.

Five complete public TypeScript fences now bind to compiled example/test source
files: validation, raw errors, calculator help, a fact definition and integration
tests. Original retained templates and the weekly-pay oracle are preserved.

Documentation impact: **Change required** for content contracts/README,
docs-content exports/compiler/build/README and copied-snippet policy,
docs-examples sources/types/README, public MDX corrections, documentation
architecture/current content architecture, root command/dependencies/lock,
exact decoder/encoder/runtime admissions, generated-source cache inputs,
root documentation types prerequisite, Knip entries, Changeset and this plan.
**Preserve** all authored draft statuses, acceptance bindings, retained Vite
app and source, calculator/rule results, deferred metrics and canonical skill
profiles/historical receipts. **N/A** for provider/release/deployment operations
and runbook procedure changes: this command only builds a local ignored file.
T005 remains in progress; source review/acceptance, link presentation, HTTP,
Website, discovery/images and old-app retirement still require their own proof.


The clean-checkout Quality oracle caught the documentation command selecting
compiled content before package output existed. The command and its child
fixtures now explicitly select source exports. The real isolated source-only
checkout test passes after this correction; the command no longer needs a
content build to check documentation ownership. Root documentation type
checking still generates the compiler indexes through its declared build
prerequisite. This preserves the original fresh-tool contract rather than
warming the fixture or weakening its assertion.


The native source producer closeout records full verification passing in
592.37 seconds. The all-tests run caught missing import separators in six new
positive lint fixtures; only those sample strings changed. The final repository
test run passes (91.28 seconds), root build passes, Changeset status passes,
and lint passes. A new private tarball installs outside the checkout; ordinary
Node 24 and strict NodeNext declarations (including dependency declarations)
preserve version-one acceptance and reject an invalid version-two source hash.
Raw Bun packing still retains repository source/test exports, so this is private
compiled-consumer proof, not publication qualification.

The receipt is
`docs/documentation-audit/clean-slate-foundation/2026-10-06-native-docs-catalogue-source.json`.
It preserves the failed source-condition and fixture-layout attempts and the
interrupted check run without claiming they passed. The real compiler processes
61 draft pages. A supplementary temporary compiler review admits 41 complete
import fences, with three explicit context/negative examples recorded separately.
The remaining page review found browser/SDK wording, current-context wording,
local command and illustrative-example details to resolve before acceptance.
No acceptance is inferred from that review probe. T005 and the full goal remain
in progress; no provider or publication authority is added.

### Public source correction review

The next pass corrects sixteen named pages: browser SDK choices, native versus
standalone API development, caller-owned SDK cleanup, external-input decoding,
the complete error-envelope JSON and the actual Schedule 1 Layer excerpt.
Annual examples retain their existing values and explicitly link the unresolved
Medicare threshold review. The OpenAPI guide now points to the existing checked
snapshot and regeneration test; its validation policy requires those source
pointers instead of an internal acceptance-policy heading. The type-safety
guide uses the same checked complete external-input fence as the validation
guide. No tax algorithm, fixture result or original integration template changes.

Documentation impact: **Change required** for those public pages, docs-content
validation/README, its patch Changeset, task evidence and this plan. **Preserve**
all 61 draft statuses, empty acceptance bindings, current architecture and
runtime ownership, retained historical evidence, selected dependencies and
Cooper's metrics deferral. Runbook procedure changes and provider operations
are evidenced **N/A**.

The complete repository verification passes in 596.86 seconds; repository tests,
build, focused content/example checks and all seven docs browser tests pass.
The built retained docs app also passes local workerd/Chromium page-loading,
navigation, back/forward, missing-page, accessibility and cleanup checks.
Both actual HTTP error JSON examples pass the owning API Schema. The earlier
native source commit `bd9df35a22e3395bba1cb4134cdbbae8c4f5d458` passed hosted
Quality run `37450554220`; the next commit's hosted checks remain separate.

The [page-correction receipt](../../documentation-audit/clean-slate-foundation/2026-10-06-public-page-copy-review.json)
binds each changed page, command result and built-output identity. It retains
the initial validation failure and the temporary probe's corrected Effect
module selection. These are reviewed source corrections, not publication
acceptance. Public link presentation, explicit acceptance, the replacement
Website/API routes, discovery and images remain unfinished T005 work. The
current HTML link adapter is not applied to processed Markdown, so the
replacement must qualify both representations before retirement. No merge,
deployment, publication or provider apply is claimed or authorised.

### Shared compiler link presentation

The next T005 slice moves page-link presentation into the existing MDX compiler.
Fumadocs still owns parsing, highlighting, HTML and processed Markdown. A private
docs-content plugin maps parsed links and reference definitions through checked
navigation, including section indexes. Repository references point at immutable
source revision `a151e51e8a30247526fa93412df046955846eca4`; all 34 distinct
repository destinations exist in that revision. Anchors, queries, fragments and
external links survive, while code examples and authored source bytes stay
unchanged. Unknown page addresses and paths outside the checkout reject the
compiler. The retained Vite and independent native indexes use this same policy.

The synchronous Fumadocs configuration boundary checks imported navigation once
using a non-throwing Schema result. It reports a fixed safe configuration error
without running Effect. Its exact decoder admission does not admit throwing
Schema codecs, encoders, runners or the neighbouring link module. Actual CLI
fixtures retain those restrictions. The compiler callback restores VFile's
unset path as an Option because its declared string getter can return undefined.
The shared configuration helper exposes its known SDK callback directly; no
runtime type inspection or compatibility cast is needed.

Documentation impact is **Change required** for docs-content/compiler and
docs-fumadocs configuration/READMEs, content architecture, exact lint admission
and actual CLI fixtures, selected dependency declarations/lock, patch Changeset,
task evidence and this plan. **Preserve** the 61 authored draft pages and draft
navigation, empty acceptance bindings, tax results and original examples,
deferred metrics, package ownership, CI/cache contracts and historical proof.
Runbook procedure changes and external operations are evidenced **N/A** for this
local compiler slice. Current cache inputs already include the configuration,
navigation, source modules and dependency manifests.

The first full verification and repository tests pass, but the final build
catches Node's required JSON import attribute. The ES2022 typecheck had rejected
that attribute during the initial experiment, leaving a bundled-config-only
pass. Correct the real host contract by adding the attribute and selecting
ESNext modules in docs-content, the retained docs app and script typechecks, and
the documentation tool typecheck that imports generated Config types. Preserve
root and compiled-public-package module settings. This changes the impact row
to include those exact compiler profiles; requalify the actual native build and
the complete checks after the correction. Retain the failed build as evidence.

Focused checks pass, including fourteen parsed-tree cases. The real native
service processes all 61 pages with 244 canonical page-link occurrences and 57
repository-link occurrences, with no unresolved relative destination. A separate
real compiler and Chromium check renders all 61 HTML bodies and confirms that
their page/source destinations also appear in processed Markdown. The corrected
configuration passes global types, the root build, all seven retained docs
browser tests and the built local workerd/Chromium checks. Fresh full repository
verification passes in 595.73 seconds; separate repository tests pass in 91.06
seconds and the final 61-page HTML/Markdown comparison passes.

The [compiler-link receipt](../../documentation-audit/clean-slate-foundation/2026-10-06-public-docs-links.json)
binds the reviewed source bytes, native/HTML page identities, immutable source
readback, final checks and the failed native-build experiment. Earlier copy
commit `a151e51e8a30247526fa93412df046955846eca4` passed hosted Quality run
`37453265100`; the new link commit has separate hosted checks after push.
Explicit page/navigation acceptance, Website/API routes, discovery/images and
old-app retirement remain T005 work. This slice establishes neither deployment
nor public availability. Metrics remain deferred under Cooper's instruction.

### Individual public-source acceptance

The next T005 slice records a named review decision for each of the 61 authored
pages and a separate navigation decision covering seven sections. Review checks
current package/API/SDK names, commands, source links, complete checked examples,
excerpt prerequisites, private release status and the retained annual fixture's
Medicare limitation. Each decision has its own version-two record and exact
owner-policy binding. Codex performs this source review under Cooper's approved
T005 implementation authority; the receipt does not claim that Cooper personally
reviewed every page.

Only the reviewed lifecycle fields change from draft to published. This means
accepted current repository documentation under HGI-207, with no deployment or
external publication claim. All prose, examples, navigation addresses and reader
order remain unchanged. The first real catalogue build correctly rejects two
older short API navigation titles: `Overview` and `Errors` differ from their
page titles. Use the owning `API overview` and `API errors` titles in navigation,
review that correction and bind its new bytes; preserve the strict catalogue
contract. Final formatted source bytes own each acceptance hash;
future edits must receive a new review before the catalogue can include them.
The real native builder produces 61 accepted pages in seven sections, and the
checked content service reads every page, finds Quickstart with bounded search
and returns the expected missing-page error. Repeated generation produces the
same 233,447 bytes with SHA-256
`05c2730c38c745e43e1eab3199bd9001529ad139d6d67ec6871af701d386a07f`.
All processed page bodies match the preceding compiler-link receipt.

Documentation impact is **Change required** for the 61 lifecycle fields,
navigation status, 62 strict acceptance records and exact policy bindings,
docs-content/content READMEs, content architecture, patch Changeset, dated review
receipt and active task/plan pointers. **Preserve** authored prose and examples,
tax algorithms and retained results, original integration-template bytes,
selected dependencies, CI/cache contracts, historical receipts and deferred
metrics. Runbook procedures and external operations are evidenced **N/A** for
this local acceptance slice. The
[individual review receipt](../../documentation-audit/clean-slate-foundation/2026-10-06-public-content-acceptance.json)
retains each decision and source identity, the first rejected projection and
its corrected navigation owner. Focused documentation/content tests, global
types, the root build, all seven docs browser tests and built retained local
workerd/Chromium checks pass. Fresh full repository verification passes in
636.40 seconds; separate repository tests pass in 98.84 seconds. Final
evidence-only changes receive fresh documentation, runbook, content, Changeset,
format and whitespace checks. Replacement routes, discovery/images and old-app
retirement remain unfinished; T005 stays in progress and metrics stay deferred.

### T005 checked public-content HTTP candidate — 6 October

Continue the same draft #155 with four public documentation endpoints at
`/api/v1/docs`: navigation, page JSON, bounded search and processed Markdown.
The HTTP package owns status/query/text encoding and delegates to the compiled
`ContentService`. Both API roots supply checked generated JSON. No incoming
request runs the source compiler, no personal calculation report is exposed,
and no shared content cache is introduced.

The actual built native API compares all 61 page objects and Markdown bodies
with their owning catalogue, plus navigation/search/CORS/invalid-query/missing
page behaviour. The existing native pair passes all 11 tests in seven files.
The retained standalone smoke now checks the four content replies through the
real process with one five-second deadline; deterministic header/body deadline
and cleanup cases accompany it. All 85 API tests and 29 HTTP tests pass. The
actual external ten-artifact downstream consumer passes with `@taxkit/content`
included in the private staged closure and fixed version group.

Documentation impact is **Change required** for HTTP contracts/OpenAPI,
application composition/smoke/native build, accepted JSON export and cache
inputs, exact decoder/source-checking profiles, dependency closure/versioning,
owning READMEs/architecture and active evidence. Semantic review also updates
the public endpoint/error references, with two fresh exact source-review records
and active bindings. The other 59 pages, navigation and all 62 prior records
remain unchanged. The unused private Promise client adapter and its production
permission/Knip allowance are retired; the actual lint fixture checks the native
replacement. **Preserve** tax outputs/templates, native calculation policy,
history, retained docs app and metrics deferral. **N/A** for provider,
registry/deployment operations, new skills and operational runbook procedures.
The [bounded HTTP receipt](../../documentation-audit/clean-slate-foundation/2026-10-06-public-content-http.json)
retains the failures and narrow corrections. Complete repository verification
passes in 607.31 seconds; all repository tests pass in
98.16 seconds. The final compiled Node reader, repeated catalogue
build and ten-artifact external package consumer pass. Replacement Website
connection/routes, discovery/images and old-app retirement remain T005 work.
No merge, publication, deployment or provider apply.

### T005 native documentation connection candidate — 7 October

After the qualified HTTP commit `103feda047566d0941dc974784adf38eeaf9d68a`,
continue the agreed Q9 Website connection with four named native documentation
RPC calls over the same API POST endpoint. The content owner supplies the
bounded public page address and fixed missing-page/search failures to both
transports. A separate documentation client and revision agreement preserve
the existing nine calculator methods and revision 4. Each documentation call
owns its native client scope, a complete-response deadline and the accepted
2 MiB closed JSON limit. No raw Cause, request or source diagnostic crosses
that connection. The API supplies the same generated content service.

Documentation impact: `Change required` for content/RPC/HTTP contracts and
READMEs, API/Website composition, transport/frontend architecture, Changesets,
focused tests, bounded proof and this plan. `Preserve` for calculator contracts,
retained tax results, accepted authored pages, navigation and review records.
Runbooks have evidenced `N/A` for this local connection candidate: no provider,
credential, deployment or operational command changes. Website page/search
composition and discovery remain unfinished; the retained docs app stays until
equivalent actual journeys qualify its replacement. Metrics remain deferred.

Focused qualification passes all 308 RPC tests, the 572 actual-command lint
fixtures, types, lint, the root build and production dependency checks. The
actual built native pair passes all 11 cases; ordinary compiled Node compares
all 61 page values and Markdown bodies against the same owning catalogue.
All authored pages, navigation, 64 historical source-review records, active
bindings and four original integration templates remain byte-equal to the
qualified HTTP parent. The
[native connection receipt](../../documentation-audit/clean-slate-foundation/2026-10-07-native-docs-connection.json)
records the rejected experiments and narrow corrections. Complete repository
tests pass in 95.83 seconds and fresh full verification
passes in 628.61 seconds, including the eleven built native
cases. A final ordinary compiled Node comparison passes and all forty frozen
source identities remain unchanged. The HTTP parent `103feda` has separately passed
hosted Quality run `37474986158`; that result does not qualify this new candidate.

### T005 Website documentation composition candidate — 7 October

Continue from qualified connection commit
`049b04ff9b71e8705507e819ba3ea31f8c9fa64e`. Its exact hosted Quality run
`37481631010` completed successfully on 6 October at 15:10:07 UTC. That is parent
commit proof, not qualification of this new slice.

The Website now composes four named documentation operations over its native
private connection. Its materialised native Request preserves the JSON byte
body and binding receiver; calculator rate-key composition stays separate.
The app has one server runtime and uses only browser-safe compiled presentation
and checked contracts in browser modules. No authored-source fallback exists.

The catch-all route renders all 61 accepted pages. A dedicated route boundary
restores checked results before visible route-owned sidebar/article composition.
Compiled Markdown and frontmatter must match the API page at preload and display.
Missing pages keep native HTTP 404; expected failures provide fixed recovery UI.
Canonical links use the checked Website origin; explicit Markdown links use the
existing API endpoint. Native browser page GET takes no data or client Context,
only a bounded public page header. SSR uses the original pathname. Exact
generated function identities, query/content-type/method/path admission and
safe not-found handling are owned at native ingress.

The actual native pair passes eleven cases across seven files. It checks every
page's real HTML, hostile SSR headers, native GET, three cold source-built
content mismatches, damaged genuine browser transport, internal navigation
without document reload, unique current-page semantics, heading focus without
hydration stealing, phone navigation/table keyboard focus and reading without
JavaScript. Images are supplemental reading-review evidence. Fresh independent
reading review returns **ship** with no material fixes. The
[Website documentation receipt](../../documentation-audit/clean-slate-foundation/2026-10-07-website-docs-connection.json)
records complete repository qualification separately; whole T005 stays in progress.

The mismatch test first exposed a stream tied to an earlier Cloudflare request
in the generic Fetcher adapter. The native Request byte body fixes that actual
cold-request failure. A browser bundle test also initially mistook a service
name in accepted documentation prose for executable engine code; it now requires
the positively observed API service identity and excludes that identity from
browser output. The receipt retains failed attempts and the owning corrections.

Documentation impact: **Change required** for Website/client composition,
checked native loader admission, route/MDX/focus/table ownership, build inputs,
exact lint profiles and actual fixtures, affected app/content/RPC READMEs,
frontend/API/content/package/testing architecture, native journey, SPEC/tasks,
this plan and bounded evidence. **Preserve** all accepted page/navigation/review
and template bytes, calculator contracts and retained results, historical docs
operations, disabled collection and metrics deferral. **N/A** for new runbook
commands or provider/release/credential operations: existing native checks are
extended; no deployment procedure changes. **N/A** for a new Changeset: only
private app consumers and tests change, with no package export/wire change;
the earlier native documentation contract Changeset is preserved.

Search UI, crawler/discovery files, Markdown negotiation, share images and
old-app retirement remain unfinished T005 work. No local check establishes
public availability, publication, deployment or safe exported telemetry.

The standalone browser suite later exposed a static server-only import through
the new page route. The application router now supplies its named page loader
through the existing typed context pattern used by settings. The same route tree
passes all twenty focused browser checks; no test-only module alias or production
compiler substitution is introduced. Actual native page/transport proof remains
separate. The page schema also stays private after the first Knip failure.

### T005 hosted receipt portability correction — 7 October

Hosted Quality for `7647642d` stopped at the repository path check: the embedded
design documentation report still named two private machine roots. That new
receipt was untracked during the earlier local path checks and staged later,
so those checks did not cover it. The corrected portable report replaces only
those roots with descriptive markers, retains the original isolated report
hash and records the projected hash. Product source, catalogue, compiled
artifacts, reading findings and capture bytes are unchanged. The earliest
checking owner now states that new retained receipts must be staged before
the final tracked-file check. The existing checker and its scope are preserved.

Documentation impact: Change required for this receipt, the testing/quality
owner and active plan; Preserve for product/runtime source and accepted
content, review findings, tax results and prior immutable receipts; N/A for
package contract, Changeset, operational procedure and provider state. Focused
checks and corrected-commit hosted proof are recorded separately; earlier
full local qualification does not establish hosted success. T005 remains in
progress and metrics remain deferred.

### T005 Website search implementation — 7 October

The next bounded slice connects a human search page to the existing named
`searchDocs` operation and accepted catalogue. A plain GET form keeps search
usable without JavaScript; results use the existing document link behaviour.
The original address owns SSR words, while the generated native browser GET
carries only a bounded ASCII URI component header. The installed native URI
codec carries Unicode, and the owning content Schema retains the 100-character
term, 20-result and 240-character excerpt limits. Empty, missing, invalid,
loading and unavailable states remain distinct. No separate search index,
collection event or personalised content is introduced.

Documentation impact before acceptance: Change required for Website source,
Schema/route/host ingress, exact route-consumer lint proof, native reading/search
journey, Website/frontend/content/API/testing owners, SPEC/task and this plan;
Preserve for accepted source/review/navigation, content service/RPC contract,
retained results and disabled collection; N/A for a new package export,
Changeset, deployment procedure, provider or credential operation. Discovery,
Markdown negotiation, images and old-app retirement remain later T005 work.


The search router now preserves literal URL pairs: the framework's default
JSON parser changed `1e3` into `1000`. The focused fixture uses the actual
search loader/components with a plain shell because the browser runner already
owns an HTML document; it waits for rendered words after navigation before
asserting checked outcomes. Human results show accepted titles/descriptions;
raw Markdown excerpts remain an API contract and are not displayed as prose.

Hosted Quality run `37500299332` for `b7cbed17` failed on the real CLI
fixture's initial Website navigation: 502 instead of 200 after API health
succeeded. Its retained hosted excerpt identifies no underlying cause. The
fixture now observes served-page readiness after printed addresses, retrying
only 502/503 for fifteen seconds before a strict 200 browser navigation.
Other errors remain failures. Qualification and later hosted status must be
recorded separately; the earlier failed run is not reclassified as success.


The first full search verification passed the complete tests and workflow
failure-canaries, then caught a browser-fixture type clash: Bun's HTML-rewriter
`Element.append` accepts text/streams rather than a DOM node. The fixture only
needs its own rendered values, so its scoped React shell remains detached.
No cast, lint exception or global type override is added. Real page, focus and
form observations remain in the native journey. Fresh focused types, lint and
browser checks precede complete qualification of the corrected sources.
### T005 discovery implementation intent — 7 October

Search commit `8b32afca` passed complete local tests and verification and was
pushed to draft #155. Its own hosted Quality run `37509022712` remains pending
at this observation. Metrics remain deferred.

The next slice derives `/sitemap.xml`, `/robots.txt`, `/llms.txt` and
`/llms-full.txt` from the accepted catalogue in the backend content owner.
Native Website addresses are deferred `Worker.URL` values, so the ordinary
source build cannot safely bake the actual stage origin into static files.
One closed discovery operation will use the application's already checked,
cached Website settings at request time; the Website will return its checked
document without owning a second catalogue or reading authored MDX. Public
origin validation will have one shared Schema with separate API and Website
identities. No calculation values, invented modification dates, additional
cache or collection event belong in these files.

The current llms.txt proposal, sitemap protocol and Google's crawler guidance
were read on 7 October. Agent links must lead to usable processed Markdown;
the current explicit API Markdown links can do this while same-page Markdown
negotiation remains a later slice. Robots controls crawling rather than access;
search retains its noindex response/page policy. The actual configured origin,
complete accepted-page coverage, text/media types, safe errors, request lifetime
and old useful routes need local built-app proof before accepting this slice.

Documentation impact: Change required for content/API/RPC/Website contracts,
their package guides, owning architecture, exact checks and current task/journey
pointers. Preserve source-bound acceptance, retained tax results, previous proof,
disabled collection and the older app until retirement proof. No new operational
command or provider action is intended, so runbook applicability is N/A.


The final scope uses only the new private discovery call and conventional
Website file URLs. An exploratory public HTTP JSON discovery route was removed:
existing public Markdown links already serve the short index, so that extra
route added no needed consumer. The four public HTTP content routes, accepted
source/review records and generated OpenAPI owner stay unchanged. Content and
private RPC have appropriate major Changesets for their new contracts.

The first native attempt exposed HEAD's default empty 204 response; its host
owner now explicitly returns 200 with GET-equivalent headers. The next attempt
found an invalid full-index assertion that rejected imports inside useful fenced
code examples. Exact accepted processed-body comparison replaces that assertion;
source compilation retains responsibility for removing authored MDX syntax.
No cast, policy exception or tax-data change is added. Current qualification is
pending at the [discovery receipt](../../documentation-audit/clean-slate-foundation/2026-10-07-website-docs-discovery.json).


Fresh discovery qualification passed owning types, lint, content, RPC and API
checks. Actual discovery GET/HEAD and XML/content assertions passed in the native
journey, which later found a controlled mismatch fixture had dropped the new
ContentCatalogue dependency. The fixture's Layer now retains that catalogue
while substituting only the intended page reply; mismatch assertions stay
unchanged. A fresh build and complete native run must qualify this correction.

Search commit `8b32afca` separately passed hosted Quality run `37509022712`,
job `112425009444`, completed 6 October at 18:26:09 UTC. The exact head was read
back on 7 October. This proves that search commit's hosted checks only; current
discovery files still need their own qualification and later hosted run.


The corrected candidate passed fresh types and lint plus all eleven native tests
across seven files, including the three intended presentation mismatches, all
discovery assertions and retained calculators. Parent review found no new
source/runtime/collection owner or policy exception. Full repository/package
qualification now runs against frozen staged sources; its final receipt must
retain failures and source identities before this slice is committed.

### T005 same-page Markdown implementation intent — 7 October

Discovery commit `501d419c` passed fresh types/lint, all eleven native tests,
all nine ordered local CI-mode release checks and final staged receipt checks;
it was pushed to draft #155. Its hosted Quality run `37515773213`, job
`112448158688`, is pending. Search's separately observed hosted success remains
its own proof. Metrics remain deferred.

The next slice reuses the existing backend processed-Markdown operation and
Website server runner. Accepted documentation has an explicit `.md` address and
same-page GET/HEAD representation selection through a bounded `Accept` Schema.
RFC 9110 section 12 was read on 7 October: quality values and specificity select
the representation, HTML wins equal preferences, and same-address responses
preserve existing Vary fields while adding Accept. Normal browser pages remain
HTML. Personal calculator reports, calculator form/RPC/native function paths,
search and agent landing pages do not gain report downloads.

The original URL owns the checked public page identity; headers cannot override
it. Only accepted processed bodies reach responses. Correct text media type,
GET/explicit empty 200 HEAD headers, canonical links, method/query admission,
missing-page and unavailable guidance need real built API/Website proof for
all accepted pages. No source fallback, second catalogue, new runtime or
backend public endpoint is intended. Owning Schema tests must exercise malformed
quality, wildcards, quoted parameters, duplicate weights and false substring
matches; narrow exact test decoding admissions need actual CLI positive and
neighbouring negative proof.

Documentation impact: Change required for Website Schema/host tests, exact
lint/test ownership, Website/frontend/API/content/testing guides, SPEC/task/
journey and dated local proof. Preserve accepted sources/reviews/navigation,
five-operation documentation RPC revision 2, four public HTTP content routes,
retained answers, historical receipts and collection deferral. N/A for a new
package contract/Changeset, operational command/runbook or provider operation.


Discovery head `501d419c` hosted Quality run `37515773213`, job `112448158688`,
completed with failure on 6 October at 19:21:33 UTC. Full verification passed;
the root test step failed the retained docs temporary-asset propagation case.
It observed two asset requests but a fixed browser-proof failure rather than
the expected recovery; raw underlying browser diagnostics are safely discarded.
The precise browser cause is unknown. The fixture's 200-millisecond successful
hydration budget did not match its functional recovery claim. Its successful
case now allows five seconds while preserving exact request/retry counts and
all positive/negative assertions. Production limits are unchanged. This owning
fixture/testing-guide correction joins the Markdown slice and new proof receipt;
the committed discovery receipt remains immutable.


Fresh native proof caught the framework returning 406 for a valid weighted
`text/*` preference after our Schema correctly selected HTML. The unit suite
only observed the selection and could not prove the renderer's behaviour. The
policy now supplies its checked concrete HTML choice through the native request
Context; the existing host renders that native request. URL/signal/scope remain
owned by the original request. The actual HTML wildcard assertion is retained;
focused Vary tests also require original fields to survive and use a partial
app mock that fails if an unused content operation is called.


Corrected focused checks pass owning types, lint and all 51 Website unit cases,
including four Vary-preservation checks. The freshly built Website main journey
passes after the article-link selector was narrowed to its actual owner; a
general `.md` selector had selected a valid GitHub README source link. Both
Markdown addresses and every HEAD/body/header oracle pass for all 61 accepted
pages, actual header failures and the real unavailable binding are observed,
and Chromium opens the real link to exact processed text. The remaining ten
native tests passed in the preceding full focused run; complete qualification
now rebuilds and reruns all eleven together on frozen staged sources.

Parent diff review retains one app runner/caller scope, the accepted catalogue
and five native documentation operations. Only the HTTP boundary and its
owned fixtures gain decoder permission; adjacent routes/leaves and encoder/
runner policy stay checked. Package contracts, accepted sources/reviews and
retained results are preserved, so this app/test-only slice needs no additional
Changeset. Final proof must record current source identities and the hosted
discovery failure separately before the tested commit/push.


The first complete graph passed all 32 actual Quality-policy/release-boundary
cases, then the unused-code check rejected an unnecessary exported
`WebsiteDocsRepresentation`. The header codec alone owns this output Schema;
keeping it module-private corrects the earliest owner and adds no ignored export
or lint exception. The failed graph remains recorded. Sources are frozen again
before corrected complete qualification.


### T005 public share images and metadata implementation intent — 7 October

Markdown commit `5d5544d0` passed all nine ordered local CI-mode checks, all
eleven source-built native cases, 51 Website cases, 608 actual lint-command
cases and final staged owner checks. It is pushed to draft #155. Hosted Quality
run `37523545054` is in progress for that exact head; no current hosted success
is claimed. Earlier discovery hosted failure and source identities remain at
their immutable dated receipts.

The next slice generates deterministic 1200 by 630 PNGs from accepted public
page titles, descriptions and paths. Official registry metadata on 7 October
confirms selected Takumi core/wasm 2.14.0 remains current; the isolated Node/Bun
probe qualifies all 61 pages, embedded Geist, matching native/wasm bytes and
determinism. The preview's long title and full description were visually read.
This is reference qualification, not a TaxKit build or served-image receipt.

Prefer build-generated static assets, which T005 explicitly allows without an
extra API. The checked catalogue remains the source. One scoped build renderer
uses embedded fonts and no fetched assets; output dimensions/signature/size
are checked before writing owned generated files. Installed Vite hook order
must complete writes before public files are copied. Selected NodeServices can
supply the native filesystem under the existing Vite host's one runner. No
renderer, compiler or new runtime belongs in browser/Worker page handling.

HTML share/canonical metadata uses the same checked page and Website settings.
A shared owned image-address mapping avoids another manually maintained index.
Any structured-data script has an owning Schema egress and safe script-text
escaping; absent author/publisher/update dates are not invented. No calculation
input, result, search word or query value is available to generated images.

Acceptance needs every generated image's bounded valid PNG/dimensions and
deterministic rerun, actual native static GET/HEAD/cache/media observations, all
61 rendered metadata addresses, Chromium image decoding and a representative
long-title view. Actual bundle checks exclude renderer/WASM/backend markers.
Accepted source/review/navigation/template identities remain unchanged. Local
development/build prerequisites and generated cache inputs need their own proof.

Documentation impact: Change required for the build/template/PNG/metadata
owners, Website dependency/lock/config/generated ignores, exact ingress/egress
lint and actual-command fixtures, Website/frontend/content/testing/command/cache
guides, SPEC/task/journey and dated receipt. Preserve current content acceptance,
five-call private RPC revision 2/four HTTP routes, tax results/Medicare boundary,
historical proof, collection deferral and rendered article design. N/A for a
new dynamic backend operation, package wire contract, provider operation or
operational runbook change unless actual implementation changes that assessment.
Old-app retirement and replacement harness qualification remain the final T005
work after images/metadata qualify; metrics stay deferred.


The image candidate's focused checks now pass types, strict lint, 53 Website
cases and the rebuilt native main journey. The first full native pass retained
ten existing passing cases while detecting Buffer versus Uint8Array assertion
containers, with identical file hashes. The corrected main journey compares
native byte values, all 61 static GET/HEAD/cache/media responses and exact copied
assets; all 61 Chromium image decodes and actual Schema-decoded metadata pass.
The built longest-title asset was visually inspected and fits its full title,
description and path. Full sequential repository/CI-mode qualification remains
required before this slice is accepted or committed. The dated image receipt
retains the attempts and final outcome. Whole T005 and deferred metrics remain
separate; no hosted social-preview claim is made.

The first full image qualification passed strict checks and the 32 Quality
counterexamples, then production Knip found an unaccounted build-only image
checker. The correction moves its Schema to the build scripts. The full Knip graph
already checks that Vite host/imported generator; the production graph checks
the shipped page modules. A proposed broader production-profile entry surfaced
unrelated test-only calculator exports and virtual Worker imports, so that
profile expansion is not part of this image slice. No unused-code suppression or artificial page
consumer is added. Final qualification must use the corrected frozen graph.

The corrected full-b run passed complete verification, including all eleven
fresh native cases. Workspace tests then found an invalid negative lint fixture
path: its existing-file replacement harness could not read the invented file.
The actual neighbouring build Schema path already supplies all three refusal
cases, so the nonexistent duplicate is removed. No production permission or
fixture harness is weakened; actual-command qualification is refreshed.


## 2026-10-07 — T005 current Website replacement checks

Share-image commit `0b406e7a` passed all nine local CI-mode checks and was
pushed to draft #155. Exact-head hosted Quality run `37533331150` was in
progress at readback. Prior Markdown head `5d5544d0` passed hosted run
`37523545054`; neither observation is attributed to the next candidate.

The current candidate replaces the release `docs-browser` command with the
existing source-building native API/Website owner and changes Quality's exact
Playwright bootstrap/cache identity path to apps/web. All native cases run;
no name filter can make the selected reader silently empty. Comparing the old
built proof with the replacement found missing skip-link, landmark, contrast
and reduced-motion oracles. These are added to the actual reader, including
mobile navigation and fixed error text, before switching the command.

Documentation impact: Change required for release command/schema/contract and
package/Website guides, Quality executable policy/refusal corpus and controls,
current journey/profile, testing architecture, SPEC/task/plan and dated receipt.
The permitted docs-maintainer local profile is updated and independently hashed;
canonical skill files stay unchanged. Preserve the old app/workspace, all
127 accepted source/review/navigation/template identities, historical
HGI/DAR/HFI packets/attempts, existing provider graph/procedure, retained tax
results and metrics deferral. N/A for a new package wire/export contract,
Changeset (private scripts/app/check selection only), infrastructure apply,
credentials or public content edits.

The nine-step full CI-mode graph, focused real command/policy tests and final
owners must pass on frozen source before acceptance. The [dated receipt](../../documentation-audit/clean-slate-foundation/2026-10-07-website-docs-checks.json)
records all attempts, exact identities, limits and rollback. T005 stays in
progress for old source/build/operation retirement. No deployment or provider
cutover is inferred from changing this local release command.

The first focused lint found unnamed RGB regex groups and unsorted host options;
these were corrected without permissions. The full isolated Quality corpus then
passed 31 cases and failed its source-only positive checkout: the strict runbook
sample's named root-command set omitted the newly documented existing native
command. Add that real command to the sample rather than weakening the validator.
All 46 documentation cases, focused workflow policy, docs/runbook/governance/skill
checks and all eleven freshly built native cases subsequently passed. The final
source review removes an unnecessary Schema recheck of internally calculated
luminance; only the real browser RGB strings are decoded. The final full graph
must qualify that exact corrected source and both old-owner bootstrap refusals.


## 2026-10-07 — T005 exact CI detail output

Replacement-check commit `ae961bc1` passed all nine local CI-mode checks in
910.51 seconds and all seven final owner checks, then was pushed to draft #155.
All 26 tested source identities, 127 accepted inputs, catalogue and 49 legacy
source files matched before commit. Hosted run `37537984626` is pending at
readback; image base `0b406e7a` passed hosted run `37533331150`.

Before that commit, primary review caught the private receipt generator using
a later small verification fixture as its newest-file selection. The actual
observed full verification had 480022 stdout bytes, all 32 workflow cases and
all eleven native cases. The receipt was corrected to that observed file and
its adjacent 2118-byte stderr. It also records the older discovery receipt's
fixture-detail limitation without rewriting that original evidence or claiming
a retroactive exact-source run. T005 was already in progress.

Promote prevention to the existing command/report owner: CI Console output now
renders its own returned report's exact sanitised detail paths/digests. The
existing candidate output stays byte-compatible. A native process test creates
a later same-ID command and proves the earlier report names only its own
returned pair, with no excerpts or sensitive paths. The exact Quality rule now
admits one Schema-owner renderer over the canonical returned report and rejects
plain text, another report, shadowing and candidate reads. The first focused
check correctly refused the fourth call until this precise policy and its
refusal corpus were updated; no broad permission was added. The next strict
lint rejected unchecked argument lookups and excess complexity. A focused
predicate now owns the returned-report output rule, and Effect Array heads
select arguments without unchecked indexing. Its first edit exposed a newline
return mistake in types; that was corrected. A second lint pass required the
four expected calls to share one exact-count check. Final types, all nineteen
workflow cases, exact policy and strict lint pass without relaxing a rule.

Documentation impact: Change required for private report/runtime/test and
Quality policy/corpus, scripts guide, release runbook, testing architecture,
SPEC/task/plan and [dated receipt](../../documentation-audit/clean-slate-foundation/2026-10-07-release-detail-output.json).
Preserve the nine-command order, current reader oracles, canonical skill/profile
identities, every accepted source/catalogue/legacy file and historical attempt
bytes. N/A for a new command/option, runbook sidecar entry, package-facing wire
contract or Changeset, app product/dependency change, provider action or metrics.
Corrected focused checks pass; freeze the final sources and run the full ordered graph
before acceptance. Consume its emitted returned paths/hashes directly for the
new receipt, and verify each actual detail. Old-app retirement remains next.

## 2026-10-07 — T005 retained-source and old-app retirement

Exact-output commit `2c5ffd40` passed the complete nine-check local CI-mode graph
in 937.84 seconds, all seven final owner checks and final receipt-metadata
checks, then was pushed to draft #155. Its receipt consumes every detail path
and SHA256 from that returned command's actual output; all eighteen files were
read back. Every frozen source/index identity, accepted input, catalogue byte
and original app source identity matched. The new head has its own pending
hosted check; neither that check nor the preceding head is assumed successful.

The initial T001 retention manifest remains historical baseline evidence at
`8ed03f0e`. Current T005 explicitly selects old-app retirement after equivalent
local journeys, source/artifact identities and useful URL dispositions are
proved. Add a concrete successor retention record without rewriting that
baseline, accepted historical receipts or their resource identities.

Retain all 49 original UTF-8 `apps/docs` sources from `5d5544d0` in a strict,
bounded historical JSON bundle, with original paths, byte sizes and SHA256.
The bundle is read-only data, never an active workspace, imported application,
or implicit source restoration. Verify its own pinned bytes and each original
source before historical inspections can use it. Exact original Git revision,
lock/config/input identities and deployed recovery receipts retain the wider
context. Source addressability does not prove a complete historical rebuild,
current provider state, deployment permission or exercised rollback.

The original and replacement catch-all routes use the same 61 authored page
addresses. Keep each accepted page at its original URL and qualify those routes
on the final candidate. The approved default calculator replaces the old `/`
docs landing; `/start` remains the documentation entry. Generated old private
server-function IDs and hashed build assets are not public page bookmarks;
original artifacts remain tied to their retained provider recovery identities.
The shared Fumadocs render/config/source package still has actual replacement
consumers and stays; remove only app-owned obsolete composition/build paths.

Retire old workspace/root build/test selection, exact lint/unused-code app
entries and current guides together. Preserve the physically ignored old
`dist`, `node_modules`, `.turbo`, `.vitest` and `.wrangler` entries; do not run a
folder cleanup. Current native API/Website checks retain their existing owners.
Historical old-app source inspection must be explicit and independently verified;
missing active source must never pass via a generic archive exemption.

Stop the old entry and writer routes before credential fetch, remote state,
plan or mutation. Installed Alchemy beta.80 validates a default Stack before
building session/provider/state services; a typed static retirement marker
must refuse that real boundary instead of returning an empty graph. Keep the
old `TaxKitDocsCloudflare/DocsWebsite` identity and approved historical recovery
route distinct from `TaxKitAppsCloudflare/TaxKitApi/TaxKitWebsite`. The latter's
provider operation still belongs T010. Preserve useful read-only historical
receipt tooling and prevent old automated writers from treating the new graph
as their resource. No provider operation is authorised or performed here.

Documentation impact: Change required for the concrete retention record/bundle
and native read/refusal proof; obsolete workspace/command/config selection;
current app/package/architecture/root/skill routes; old operation/runbook/current
journey/automation owners and real workflow refusal controls; SPEC/task/plan and
dated qualification. Preserve original historical and binary evidence, accepted
127 inputs/catalogue, shared rendering/source packages, deployed resource and
recovery IDs, canonical skills, ignored files, retained tax results and metrics
deferral. N/A for public tax/API wire changes, new provider authority, actual
provider/credential/registry/merge operations or another package Changeset unless
a package-facing change is actually required. This is implementation intent,
not retirement acceptance; source removal and closeout require the actual
replacement/history/refusal checks and full repository qualification.

Retirement implementation now has a verified 49-file source bundle, reconstructed
byte/hash proof and explicit historical source inspection. The actual Alchemy
CLI refuses the static marker before session provider/state construction. Its
initial startup made local `logs` and an empty `profiles/default`; the initial
empty-home assertion failed correctly and now records that precise limit.
Missing `Order` and an untyped test tuple were corrected by focused compiler
checks. Two private runner invocations used non-existent script names; they
made no acceptance claim and were replaced by actual manifest commands.

Four current writer/browser workflows are manual permission-free stops. Their
exact 2c5ffd40 bytes, the original automation/control/journey owners, root
command manifest and runbook are retained separately. Ten native refusal cases
run the actual workflow Bash, CLI entries and aliases with an empty environment.
The first receipt tests exposed their dependence on deleted current input
files; they now run the unchanged historical identity algorithm in an owned
Git fixture. Subsequent old runbook assertions now inspect the saved history
explicitly. Historical inspections never become a missing-source exemption.

Removed exactly the 49 verified tracked app files, then added the README
retirement tombstone. No recursive cleanup ran. Removed old workspace/build/test
selection and exact unused-code scope. The lockfile loses only the docs workspace
and its workspace alias, with no dependency version change. Removed eleven
old-only lint permission objects and fifty-nine old path entries, plus thirty-eight
old positive-file cases; every invalid-code canary remains. Current native
positive cases and their exact permissions remain. The old header byte oracle
moved into verified retained-source inspection. Focused lint required normal key
ordering, corrected without suppressions. Canonical skill assets remain fixed;
only the permitted docs-maintainer profile and its hash change with current facts.

Current guides and operation owners now route to the replacement and truthful
recovery stop. Documentation/runbook checks passed after old evidence-router
command mentions were made explicitly historical. The original dated observations
and binary receipts stay unchanged. Added actual HTML/canonical/share assertions
for every accepted page address to the existing real native pair journey.
Full source freeze and repository/release qualification remain next; these edits
are not yet a completed T005, hosted replacement or provider operation.

No new Changeset is required for this retirement slice: the removed app and
infrastructure export are private, no public package wire/export or version is
changed, and the existing T005 content/train Changeset remains intact.

The first full lint-proof run found six deleted-directory fixture writes and one
old Stack positive selector. Keep the rejected corpus bytes and all rule
expectations, move those generated cases to real owned Website test paths,
and select the real static retirement marker as the infrastructure positive
case. This is an actual-command correction, not a missing-file success.
The last pushed 2c5ffd40 hosted Quality run independently completed successfully
at its own exact head; that result does not qualify these uncommitted edits.

Review also removed unreachable legacy execution from the two retired CLI hosts.
Both are now small direct stop entries with no provider/config imports. Their
original 2c5ffd40 command bytes are retained and hashed for explicit historical
inspection. The receipt algorithm moves to the named historical owner used only
by owned fixtures; the actual CLI never selects it. Its first lint found one
unused Schema import, which was removed. Current process/Console permissions
were removed from the two stop entries. The historical source corpus retains
its original forty refusal cases; ten actual process stops and seven pinned
operation-owner digests cover current retirement separately.

The next unused-code check required the actual retired receipt-writer CLI to be
named as an entry after its fixture export moved out. Add only that real stop
entry, not an unused-file exclusion. Public authored MDX contains no retired
app path or removed docs command, so its accepted bytes need no revision here.


## 2026-10-07 — T005 local retirement qualification

The complete CI-mode release graph passed all nine ordered checks against the
frozen staged retirement source. Its exact returned eighteen detail files were
read and hashed; all frozen application/configuration sources, 127 accepted
inputs, the catalogue and retained original bytes matched after the graph.
The old app is now removed from current workspace/build/test selection, every
accepted original page URL returns the actual built Website HTML and correct
canonical/share address, and actual old commands/workflows refuse safely.
All 258 ignored old-app file metadata identities remain unchanged.

[Retirement proof](../../documentation-audit/clean-slate-foundation/2026-10-07-docs-retirement.json)
owns the exact checks, failed attempts, source identities, primary review,
recovery and limitations. T005 is locally completed. The task status, manifest
qualification wording and this proof note are post-qualification metadata;
they are checked separately and are not claimed as the frozen application
candidate bytes. Tested commit/push and exact draft PR155 readback remain the
immediate delivery step. Existing staged PRs still need review; no merge,
provider access/apply, deployment, hosted replacement or publication occurred.
Metrics remain deferred, retained tax results remain unchanged, and T006 is
next in the accepted order.


## 2026-10-07 — T006 protocol qualification begins

T005 retirement commit `366b3e1464a356ef12d08fef34ee3c1525566910` was pushed
to draft #155. Its remote head, exact draft title/body/base and source tree were
read back. DEV-76 is In Review with the tested source and current limitations;
its new hosted Quality run `37547139175` is independently still running.
The complete local nine-check graph passed in 899.20 seconds. No provider,
merge, publication or deferred metrics operation occurred.

T006 is active on `codex/dev-77-native-agent-tools`, stacked on that exact head.
First qualify the selected native Effect adapters with the actual official MCP
client before mounting or advertising them. Installed stable Effect 4.0.0's
McpServer, McpProtocol and native lifecycle source bytes match the official npm
tarball. The prior Effect rc.112 and Alchemy beta.75 source repositories were
checked for guidance; receiving Alchemy beta.80 and installed stable types own
compatibility. No dependency upgrade follows from that research.

The selected stateless `v2026_07_28` and older stateful `v2025_11_25` adapters
exist. The latter's default state is instance-local and has no public expiry
control. Its native Worker routing, hard lifetime and cleanup must be proved
before support is advertised; a scoped native session owner is an investigation
candidate only. Reuse the captured calculation/content operations, checked edge
identity, shared work/rate policy and safe reporter. No second engine, saved tax
figures or transport-owned calculation policy is admitted.

Current official Chrome guidance uses `document.modelContext` and cancellation
signals for registration and execution. Installed browsers are Chrome154 and
controlled Chromium153; actual version-specific input behaviour and a real
browser caller need separate proof. Fake registration cannot establish an agent
journey. Ordinary browser use and route cleanup remain required.

Documentation impact: Change required for exact active intent, native agent
transport/browser command owners, app guides, accepted setup/discovery content,
architecture, critical journeys and any necessary exact lint/type/export wiring.
Preserve retained tax outputs, accepted content outside changed setup claims,
original evidence, current native owners, private runtime lifetimes and disabled
collection. N/A for merge, hosted availability, provider apply, account/storage
features or metrics implementation. Package Changeset impact is decided against
actual public contract changes; no new package is inferred from this app-owned
transport. T006 remains unaccepted until its complete caller and lifetime proof.


## 2026-10-07 — T006 modern native MCP candidate

Hosted Quality run `37547139175` completed successfully for the exact T005
head `366b3e1464a356ef12d08fef34ee3c1525566910`. That observation belongs draft
#155; it does not qualify the current dirty T006 source or a deployment.

The native application now composes six canonical tools through installed
Effect's modern stateless adapter. First-use protocol construction retains the
instance scope and excludes first-caller request capabilities. Real official
client tests compare retained reports and accepted pages, separate two callers,
check safe expected/defect replies and fill eight places before cancelling one
and finishing a replacement. A real TCP client against the built Worker also
matches HTTP report/page values and proves one common HTTP/MCP allowance.

The early-abort test exposed a listener-registration race. Checking before a
stream listener starts misses an abort arriving between those steps. The native
Effect callback registers first and checks again, with owned listener removal
and awaited work cleanup. Removing captured Scope from native Toolkit services
was an unsuccessful investigation and is absent from the candidate. The built
journey's first timeout came from `Queue.takeAll` on an empty captured-log queue;
installed `Queue.clear` supplies the non-waiting silence check. Both failed
attempts and successful reruns remain in the dated proof.

Documentation impact: **Change required** for API/Web app guides, API/service/
test architecture, native-pair selection, current journey, exact wire fixture
permissions, active intent and dated proof/index. The release runbook still runs
its existing full native command, now also including this caller; check its
contract. **Preserve** accepted MDX/navigation/catalogue bytes, tax tables and
reports, SDK/package exports, canonical skill assets, native rate namespaces,
provider recovery history and disabled collection. **N/A** for a Changeset:
only private app composition and test dependencies change; no versioned package
contract/export changes. **N/A** for merge, deployment, publication, provider
apply, credential changes or deferred metrics work. Full current-source checks
and reviewable commit/push remain next. Older session routing/expiry, real
network cancellation, browser tools and public setup content remain unfinished;
T006 stays in progress.

The first complete CI-mode graph stopped after 567.01 seconds at production
unused-export checking. A toolkit export existed only for an actual-client test.
The toolkit is now private; the transport owns its search-response envelope and
reuses the canonical content result Schema in both production and the test.
Focused API tests/types, lint and production unused-export checking pass after
this correction. The frozen sources were unchanged after the failed graph.
Complete qualification must rerun; the failed attempt remains in the receipt.

The corrected frozen modern MCP source passed all nine ordered local CI-mode
checks in 896.89 seconds. All eighteen exact returned stdout/stderr files were
read and hashed; all 28 frozen sources matched after the graph. Both complete
verification and the separate final built-app step passed all twelve native
cases across eight files. The dated MCP receipt retains the failed first graph,
correction, exact source/check identities, primary review and proof limits.

This proof/plan closure is post-qualification metadata and is checked separately
before commit. Tested commit/push and a reviewable draft stacked on #155 remain
the immediate delivery step. T006 stays in progress: older Worker session
routing/expiry, real network cancellation, page-owned browser tools and public
setup content are still unfinished. No provider apply, merge, deployment,
publication or deferred metrics change occurred.


## 2026-10-07 — T006 browser tool implementation begins

Modern remote-tool commit `4b349e0d1605687d0c5670af3edcd4ffdb82481e` is pushed
to draft #156, stacked on #155. Its exact remote head, draft title/body/base
and clean checkout were read back; DEV-77 progress comment
`53a730de-dcfc-4721-8032-e86546a4aa07` was posted and independently read back.
Hosted Quality run `37554420197` is still running. Local nine-check success
does not establish its result or a deployed endpoint.

Continue on `codex/dev-77-browser-tools` from that exact commit. Browser tools
will discover the visible calculator catalogue and read/fill/calculate/read
results through the page's existing commands and React registry. They must not
call a second backend client, calculate tax locally, calculate on registration
or save figures. Current checked Website origin controls registration. Each
page owns registration and unfinished tool calls; leaving it removes the tools
and interrupts their work. Unsupported browsers remain ordinary absence.

Private probes used real Chrome for Testing 153.0.8010.12 on localhost. Its
experimental WebMCP feature is absent by default and available when enabled.
A same-origin caller and the native developer-tools caller both discovered
and ran actual registered tools, with a visible input change. That browser's
document caller expects JSON text; the native developer-tools caller accepts
structured input. Registration removal does not cancel unfinished execution;
a separate invocation signal reaches cleanup. These fixtures establish host
behaviour only, not a TaxKit browser-agent journey. Current Chrome guidance,
version-specific Chromium source, the Effect and Alchemy reference repositories
and installed receiving APIs were checked before choosing this method.

Select exact type-only `webmcp-types` 0.1.10; its official archive hash was
verified again before implementation. Its caller typing describes newer object
input, so real Chrome153 qualification uses the installed Playwright developer-
tools protocol types and actual native invocation, rather than casting browser
input or inventing compatibility. No existing dependency upgrade is authorised.

Documentation impact: **Change required** for page/command/lifetime owners,
Website guide, frontend/test architecture, current browser journey, public agent
setup after caller proof, exact decoder/encoder/host lint permissions and actual
CLI fixtures, active intent and dated proof/index. **Preserve** retained tax
reports/rules, ordinary HTML/manual commands, canonical accepted content beyond
approved setup claims, shared RPC/calculation policy, native remote checkpoint,
original recovery evidence and disabled collection. **N/A** for a Changeset
while only private app code and a type-only test/build dependency change. No
merge, deployment, publication, provider apply or metrics work is included.
T006 remains in progress; older session routing/expiry and real network
cancellation are separate required work.


## 2026-10-07 — T006 visible browser caller qualification

Hosted Quality run `37554420197` completed successfully for exact remote-tool
commit `4b349e0d1605687d0c5670af3edcd4ffdb82481e` in draft #156. This readback
qualifies that earlier head, not the current browser source or deployment.

The browser candidate now uses one shared page form/report/error state and the
existing visible edit/submit commands. Native Toolkit owns five commands and
JSON output. One concrete host boundary preserves the original receiver,
checks exact origin/capability and uses a registration-scoped FiberSet callback
bridge. Native registration is explicitly started/interrupted by the container;
deferred registry cleanup was too late when two pages used the same tool names.
A retained checked request identity and per-invocation subscription prevent old
calls returning a newer answer or cancelling newer unfinished work.

Actual Chrome153 native developer-tools invocation passed catalogue/form reads,
default take-home calculation, annual fill/calculate/read, equality after a real
manual RPC response, excess-input rejection without another request, stale
answer retention, busy rejection, caller abort, edit interruption, successful
manual retry and route removal/cancellation. Controlled host checks separately
cover absence, unsupported/wrong origin, receiver preservation, independent
refusal, stalled registration and safe failures. This proves actual native
protocol calls controlled by the test, not an autonomous model session.

Receiving Effect 4.0.0 accepts excess keys for an empty Struct. Native
`Tool.EmptyParams` now owns one unknown ingress decode and checked host metadata.
The installed FnContext has no typed once/resultOnce operations; native registry
operations own reads and fresh result waits. A writable form projection must
not receive saved initial values directly: its underlying form can stay at the
default. The home container seeds the owning page form. Hydration now proves a
different amount, period and threshold agrees with visible fields/shared state
and the next explicit request. These findings are promoted into current owner
and direct tests rather than treated as passed protocol or UI proof.

The dated browser receipt records sources, actual checks and proof limits.
Documentation impact is **Change required** for Website/frontend/test/tooling
owners, current journey, active intent and proof/index; **Preserve** for ordinary
manual/HTML behaviour, retained tax rules/results, existing allowance/RPC,
accepted public content, canonical skills, original recovery history and disabled
collection. **N/A** for a Changeset: private app plus type-only dependency, no
public package contract change. The existing native-pair and release operations
remain the owners. Complete frozen qualification, primary review and tested
commit/push/draft delivery remain next. Older remote sessions, actual remote
cancellation and public setup still prevent whole T006 acceptance.


## 2026-10-07 — Saved page state correction before browser delivery

The first full browser candidate graph failed complete verification: saved
reports/errors disappeared after built-page hydration. All twenty-five frozen
sources still matched. Private fixed-flag diagnostics confirmed that checked
submission data reached the browser, then the registry removed the unobserved
page view and its seeded parents before React subscribed. The once-only hook
then ignored re-seeding. Those temporary diagnostics are removed.

The original focused test reused a server/client registry and could inspect SSR
HTML too early. The stronger direct test uses a separate server, an unobserved
first client render and cleanup, an actual hydration effect, and another idle
interval. All nine saved errors failed before the correction. Keeping the shared
page view alive for the root registry retains its checked form/outcome parents
and fixes the loading race without another calculator or browser storage. Page
cleanup still cancels work and removes tools; root disposal releases the values
and client. This deliberate in-memory lifetime is recorded in the frontend owner.

All twenty-one focused browser tests and thirteen actual built-app cases across
nine files now pass, including distinct saved figures, retained reports, safe
errors, manual/browser calls, cancellation and route changes. The first full
graph and direct failures remain in the dated receipt. The corrected candidate
still needs the complete frozen graph and tested commit/push/draft delivery.
DEV-77 stays In Progress, metrics stay deferred and retained tax results remain
unchanged. No external availability or production proof is claimed.


## 2026-10-07 — Page description identity after browser memory cleanup

Primary review found another lifetime defect before browser delivery. The root
registry retained the view and its values, but the weak family could still lose
the grouping object after leaving a page. Returning then created a new group
with default fields while the old registry values remained. Earlier focused
checks retained the description while mounted and did not force collection
between visits. The second full graph was interrupted after seven successful
ordered stages; all twenty-eight frozen sources matched. That partial result
is not complete qualification.

The actual native caller now leaves the annual calculator, forces Chrome garbage
collection and returns. Before the correction the form reset from 77000 to
67000. The same check passes after the retained view reads through its immutable
description group. Fields, shared form and retained stale report survive without
another RPC request. This uses the existing weak family and root registry;
there is no custom cache, persistent store or extra runtime. Page cleanup still
removes registrations and interrupts unfinished work, and root disposal releases
the in-memory values and scoped client.

Types, lint, all twenty-one focused browser checks, a fresh native build and the
native return-after-collection caller passed. The current journey, task checks,
frontend and Website owners record both value and description lifetimes.
The corrected source c still needs the complete frozen nine-check graph and
tested commit/push/draft delivery. T006 remains in progress.


The frozen visible-browser source passed all nine ordered local CI-mode checks
in 888.5 seconds. All eighteen exact returned stdout/stderr
artifacts were read and hashed; all 28 frozen sources matched after the graph.
Complete verification and the final fresh native app check both passed thirteen
cases across nine files. The dated browser receipt owns the saved-state lifetime correction, sources, primary review,
failed focused attempts, corrections and exact detail/check identities.

This proof/plan closure is separately checked metadata. Tested commit/push and
reviewable draft delivery stacked on #156 remain immediate work. The broader
T006 task stays in progress for older remote sessions, actual remote cancellation
and qualified public setup. Browser proof is native caller execution controlled
by the test, not an autonomous model session, deployment or public availability.
Metrics collection remains disabled and its approach deferred.


## 2026-10-07 — Native session lifetime slice begins

Browser draft [#157](https://github.com/crcorbett/taxkit/pull/157) is open on
`codex/dev-77-browser-tools` at `964b7e9b839545e135476a516541e8f4750268e7`,
stacked on #156. Push, exact draft/base/head and attachment were read back.
Hosted Quality run 37565321855 is still in progress at this observation.
DEV-77 comment `d8aa3a49-624c-4375-920d-181070f3d812` and native project
update `560420b2-94e8-4784-854b-7b744b456e73` were independently read back.

Continue from that clean source on `codex/dev-77-native-session-lifecycle`.
Actual official-client preparation against the built TaxKit stalled-work API
filled all eight places and aborted one real outgoing HTTP request. The API
kept the place until its five-second work budget; a replacement could not
enter within the earlier observation. Default settings, the incoming-signal
flag, and incoming plus forwarding flags all behaved alike. This negative
network observation does not invalidate the earlier positive in-process test,
and that earlier test does not prove real network cancellation. No flag-only
correction is accepted. The next native oracle must retain this distinction.

Qualify the older native adapter separately. The installed adapter owns its
session identifiers, message parsing and cancellation matching, but exposes no
per-session expiry operation. The proposed local candidate uses one fixed-name
native Durable Object per stage with a scoped in-memory protocol host. Reuse
the same captured calculator/content service implementations and native rate
binding; do not copy an engine, parser, private protocol Map or provider client.
The calculation pool remains local to its application instance, as already
owned by the calculator work policy; a new native host is not a global pool.
Actual interleaved rate proof must establish the common allowance.

The candidate admits at most 32 initialisation attempts per ten-minute host
lifetime and at most 32 simultaneous native requests without queuing. The
short host lifetime bounds retained native client metadata. Native alarms and
an incoming time check close the whole host scope at expiry; only the alarm
timestamp may enter platform storage, never client metadata or tax figures.
The installed parser still owns all messages. Its actual HTTP admission rejects
initialise carrying an existing session ID before registration. Preserve that
native refusal and the existing conversations; it cannot bypass the exhausted
bootstrap allowance. No application parser or extra reinitialisation workaround
is needed.
Sessions are anonymous protocol conversation identities, not login identities.
The current original checked request key crosses only the private native
binding separately from JSON; caller-supplied copies must be replaced.

Before any acceptance, prove actual SDK composition and official-client
initialise/list/read/calculate, version/origin refusal, distinct sessions,
wrong-session cancellation isolation, real cancellation cleanup and immediate
place reuse, capacity, automatic expiry and fresh reconnect. Public setup is
still withheld until its supported connection contracts are tested. Modern
pre-response network cancellation remains a separately unresolved limitation;
do not claim that older session cancellation fixes it.

Documentation impact under attached `$docs-maintainer`: **Change required**
for the SPEC/task and this active intent, API/SDK architecture, API README,
native composition/graph proof where the object is declared, testing-quality
and the current MCP journey, and a dated source-matched qualification record.
**Preserve** canonical tax values, public HTTP/RPC/SDK contracts, browser tools,
accepted public content, skills, recovery history, disabled collection and
existing release-operation ownership. **N/A** for publication, provider apply
and a Changeset unless this slice changes a public package contract. Local
source builds and workerd experiments authorise no deployment or cloud state.


### Session preparation correction and parent hosted readback

Hosted Quality [37565321855](https://github.com/crcorbett/taxkit/actions/runs/37565321855)
passed at 03:36 UTC for exact browser head
`964b7e9b839545e135476a516541e8f4750268e7`. The existing DEV-77 comment and
project update were edited and independently read back; neither this parent
result nor its local receipt qualifies the dirty session slice.

The first actual older-client connection returned 503 because the local source
builder omitted the SDK-generated Durable Object export inventory. Memory-only
compilation of the actual application declaration now supplies its computed
properties to the native source builder. Provider, credential and network
operations refuse; no plan/apply or saved provider state is acquired. A real
built class export and actual older-client connection are both required.
The corrected private preparation reached eight real calculations, cancelled
one by the native conversation's notification and observed immediate cleanup
and entry of a ninth calculation, with no uncaught native exception.

The first permanent lifecycle check incorrectly expected reinitialisation to
close the host. Reading the receiving `McpRuntime` HTTP admission confirmed
its explicit existing-ID initialise refusal before registration. The extra
application workaround was removed. The check must instead preserve the
existing IDs and exhausted admission allowance, then independently prove
native alarm expiry and actual fresh reconnect. The earlier inference about
client reconnection at reinitialisation was not an observed result.


### Focused actual session observations

The corrected actual native cases passed as `dev77-session-candidate-ac`:
modern/older/HTTP report equality and common allowance, routing/version/origin
refusal, 32 distinct official-client conversations and bounded refusal,
unchanged IDs after native refused reinitialise, native bookkeeping-only SQL
tables, actual instance eviction and fresh handshake, wrong-conversation
cancellation isolation, immediate older cancellation/place reuse, all-request
capacity, unattended native alarm cleanup and fresh handshake after expiry.
The official client does not transparently reconnect its expired call; that
call fails and a new client must perform initialise. This corrects the earlier
untested inference about automatic reconnect.

The same actual case explicitly aborts a modern outgoing TCP request. The
caller stops, but a replacement remains busy and all work releases at the
five-second budget. This is a retained negative oracle, not a solved prompt
modern cancellation claim. The full native case takes roughly nine seconds;
its native alarm fixture shortens only the actual host lifetime to 1.5 seconds.
The alarm-removal challenge and source restoration run before frozen complete
qualification. No application edit is accepted from temporary challenge sources.

Native graph and actual lint checks passed. The first extended lint suite
failed because its neighbouring-path fixture named a nonexistent file;
replacing that target with the real `mcp-request.service.ts` makes all 616
actual CLI cases pass. The new host has decoder permission only; no encoder,
runner, neighbouring-service or vendor/library suppression was admitted.


### Actual alarm removal challenge

Replacing only the native alarm callback with an empty Effect makes the real
older-client lifecycle case time out at its three-second unattended cleanup
wait. The modern case still passes. The driver restores the original source
bytes exactly, then freshly builds the normal source; both actual cases pass.
The dated native-session receipt records the four build/test identities and
restored source hash. This rejects a host that cleans up only on another request.
Frozen full qualification is still required; no cloud timing is claimed.


### First frozen session graph failure

The first complete local graph stopped at repository verification after 521.22
seconds. All 39 frozen source identities matched; the 32 workflow cases passed,
but the unused-code check rejected the exported TypeScript class
`TaxKitMcpSessions`. That declaration is used only inside its own module. Keep
it private: the SDK separately owns the native generated class export from
registration. This is a source correction, not a new unused-code exception.
Fresh native class/client checks and a new full frozen graph are required. The
dated receipt retains both failure details and their hashes.


### Native reload fixture correction

The second frozen graph stopped during native verification after 681.43
seconds: thirteen native cases passed, but local reload never observed its
positive marker. All 39 frozen source identities matched before correction.
The fixture still altered `ApiWorkerInit`; the actual local Worker now uses
`ApiWorkerNativeInit` directly. Point the existing fixture at that served
composition, preserving its fifteen-second bound and exact restoration check.
This corrects the test target; it does not relax readiness or accept a failed
run. Focused reload checks and a new complete frozen graph are required.


### Complete older-session local qualification

The corrected source-frozen graph C passed all nine ordered checks in 877.26 seconds. Both full built-app runs passed all fourteen cases across
nine files, including actual session capacity, private rate forwarding,
conversation cancellation, unattended native alarm cleanup, eviction/fresh
handshake, the distinct modern five-second cleanup limit and native local
reload. All eighteen returned detail artifacts were read and hash-checked; all
forty frozen source identities matched before metadata closure. The dated
receipt retains both earlier failed graphs, corrections and the alarm-removal
challenge. Primary review accepts this local older-session sub-slice only.

Only this plan and its proof record changed during closeout. Documentation,
runbook, format, frozen-install and source-identity checks all passed. DEV-77 remains
in progress: prompt modern network cleanup and public setup are unfinished.
Metrics stay deferred, collection disabled and tax values retained. No cloud
class/binding state, public availability or provider operation is established.


## T007 domain preparation and existing connection

Cooper asked to check existing `cf` CLI connections before creating one. The
existing `default` OAuth profile is valid for the exact zone account and has
the required read capabilities. No credential was created or changed. The
[dated readback](../../documentation-audit/clean-slate-foundation/2026-10-07-domain-provider-readback.json)
records the independent successful GETs without token values or local paths:
no DNS records were returned, DNSSEC is disabled, the registration is active
with automatic renewal and transfer lock, and the shared dynamic redirect
entrypoint returns the specific 404 absence code. Seven general zone settings
were selected; that is not an exhaustive settings catalogue.

The native graph checks the existing stage Schema before declaring resources.
Only `prod` declares the adopted retained zone and retained DNS settings. Its
Website declares `taxkit.dev` plus the native `www` redirect, and its API declares
`api.taxkit.dev`; both use the zone's native Output. Local and `pr-N` stages
omit domain properties and all Production zone/settings resources. Self and
peer origins retain their native owners. The 34 focused infrastructure tests
and type check pass; formatting passes. The first lint attempt used a missing
script name and provides no lint proof; the corrected owned command passes after fixing the new fixture style.
Documentation, runbook and diff checks also pass. Full repository checks have
not qualified this slice yet.

Actual receiving-provider calls reproduced the broad read-error fallback.
The source and compiled provider now catch only native `RulesetNotFound`.
Failed access produces no shared-rule PUT, confirmed absence permits creation,
and existing foreign rules remain. All three regular provider tests and six
source/compiled probes pass. The provider can upload its script before that
read fails; this is not rollback of the complete Worker operation.

The native v3 plan projection now admits exact app/resource/binding rows and
summary counts, with Production-only adopted/retained zone/settings. Native
formatter tests use the actual receiving plans, memory state and refused
provider writes. 37 infrastructure cases, 42 plan/command cases, type checks,
lint and the actual policy CLI fixtures pass. The old receipts and writer stops
remain. Supplied source digests still need the native workflow evidence writer;
real scoped Doppler custody and live no-apply planning remain unfinished.
No live provider write, adoption, certificate, deployment or rollback is claimed.

### T007 documentation impact

| Surface | Decision | Owner and limits |
| --- | --- | --- |
| Native graph, infrastructure README and deployment architecture | Change required | Production-only retained zone/settings and native domains; focused stage and Output proof. |
| SPEC/task and active execution plan | Change required | T007 is in progress; earlier T006 draft is pushed, with modern cleanup and setup still pending. |
| Dated provider evidence | Change required | Independent exact-account cf GETs, bounded selected fields and explicit non-claims. |
| Current plan admission, workflows and operator procedure | Change required | V3 projection admits the actual native pair and Production adoption/settings. Current writer/evidence replacement and live plan/custody remain pending; old operations still refuse. |
| Public app origins, calculations, package contracts and metrics | Preserve | Native self/peer bindings and retained tax results remain; no public package change or Changeset. Metrics stay deferred. |
| Historical receipts, old recovery identities and provider resources | Preserve | No rewriting of historical graphs and no provider operation. |


### T007 local domain/redirect/plan candidate review

The existing default `cf` profile answered the requested exact account/zone
GETs without a new connection or credential. The receiving dependency patch
adds only the native redirect absence catch, with matching compiled code and
map; the existing Plan source/compiled/map patch is preserved. A frozen
installation resolves the corrected dependency. Preparation failures (compiler
API selection, interrupted installation dependency lookup, type inference and
fixture style) remain identified; later passing checks do not rewrite them.
The regular policy suite preserves exact codec permission and neighbouring
runtime/codec refusals. No public package contract changes, so no new Changeset
is required for these private app/deployment owners.

Docs-maintainer review records Change required for the native graph/README,
deployment/tool schemas and projection, architecture, current SPEC/tasks/plan,
runbook recovery/authority/sidecar, exact lint admission tests and dated proof.
Preserve applies to public calculations/results/content, app origins, metrics
(deferral and disabled collection), old receipts/resource identities and stopped
writer workflows. Live plan, real secret custody, workflow evidence writer and
external postconditions remain pending; full local qualification is next.

Draft #158 (`013e02845e49d78af33aa9ea157075c24b8e0065`) independently passed
GitHub Quality `37574967845` at 05:29 UTC on 7 October. Linear DEV-77 and its
existing session comment/project update now read back that exact hosted success.
That qualifies the earlier session draft only, not this dirty T007 candidate.

### T007 source-frozen local qualification

The 57 recorded source identities matched before and after the complete local
`bun run release:check -- --ci` execution. All nine ordered checks passed; all
18 sanitised detail artifacts were read and their digests independently matched.
Both native application runs passed all 14 cases. The release-boundary mutation
suite passed all 32 cases; its 13 real-command cases took about 10 minutes.
These results qualify the local snapshot only, not hosted CI, credentials, a
cloud plan, provider adoption or public availability. Four actual local v3
command probes also passed their expected success/refusal outcomes with
synthetic source identities and the real receiving patch digest.

After full qualification, documentation-only corrections distinguish retained
v2 from native v3 and remove obsolete DEV-73 planning claims in the affected
tool README. The dated receipt retains before/after hashes and separate focused
checks. Executable source remains identical to the fully checked snapshot.
No new check framework, Changeset, credential, provider apply or deployment was
introduced. A draft checkpoint does not complete T007: current writer/input
calculation, real scoped Doppler custody and live no-apply plan proof remain.

## T007 native source-bound plan follow-up

Draft #159 is pushed at `54dea58097ed9b409a1c202c6b416368273cb410`.
This follow-up uses the existing native projection command and existing
workflow-evidence source/codec owner. It adds no parallel deployment framework
and does not reactivate historical commands or stopped workflows.

The command checks the full clean candidate before and after hashing the named
tracked source paths. It calculates configuration/source-manifest/lockfile/patch
identities, checks installed beta.80 version and rejects optional caller hashes
that disagree. A separate native identity version two retains source path/hash
pairs; historical identities/receipts remain unchanged. Both local outputs must
resolve inside the selected ignored stage directory and cannot overwrite source,
one another, another stage or the supplied plan text. Capture has a twenty-second
deadline with scoped Git children. A failed projection write can leave the first
local identity file; that partial output supplies no approval.

The record excludes generated/ignored/dependency bytes, environment and provider
state. Installed version is not installed patch proof; supplied plan text is not
proof of its source/provider origin. Native bootstrap/provider receipt, actual
custody and live plan qualification remain pending. No credential, workflow,
dependency version, tax result or deferred metrics change is included.

Doppler read-only metadata checks found four existing TaxKit configurations and
seven secret names in each selected app configuration through an existing primary
checkout scope. No values were exported and no scope or credential was changed.
That observation proves configuration/name access only; this worktree's custody,
Alchemy profile and credential purposes are still unqualified. Mutable metadata
belongs in the dated follow-up receipt, not durable configuration policy.

Docs-maintainer impact: **Change required** for the deployment tool README,
deployment architecture/infrastructure README, runbook/authority sidecar,
SPEC/tasks/active plan and new dated proof. **Preserve** historical identities,
receipts, writer stops, public app/package/content contracts, tax results and
metrics deferral. **N/A** for generated references, public API/SDK and Changeset:
this slice changes private local deployment preparation only. Focused checks
and whole-checkout qualification are recorded in the linked follow-up receipt;
unexecuted or failed attempts remain identified.

### T007 hosted timeout correction

GitHub run `37580219079` for draft #159's exact head finished cancelled at
06:42 UTC on 7 October. The check annotation explicitly reports exceeding the
thirty-minute job limit. Its log records successful verification, workspace
tests, builds, docs validation, packed/downstream checks and API smoke before
cancellation during the final native browser check. This is not hosted success
or a proved browser failure. The hosted runner's cold verification took nearly
twenty-four minutes; the local complete graph took about seventeen and a half.

This follow-up raises the bounded Quality job limit to sixty minutes and updates
its owning policy, accepted fixture and separate thirty/120-minute refusals.
No check, permission or cancellation behaviour is removed. Docs-maintainer
records **Change required** for Quality workflow/policy/tests, testing-and-quality
architecture and this dated evidence; **Preserve** release operations and
provider authority. Hosted proof remains separate; local qualification follows
Cooper's direction below while GitHub credits are unavailable.

### Local execution direction

Cooper directed checks and deployments to run locally because GitHub credits
are unavailable. Commonplace Development Workflows 0.6.7, current `main` and
`stable` at `c1e08a8a8c257fd2ddb9fc913c75ce5f016f27fc`, was read directly.
Its Alchemy operation guide says to use the same full checks and existing native
commands locally, preserve provider/source authority and separate blocked CI
from local/provider proof. This does not upgrade TaxKit's vendored skills or
selected dependencies. No GitHub rerun or billing change is part of this work.
The prior #159 cancellation remains the independently observed timeout, separate
from Cooper's account-availability report. Local execution does not itself
supply secret/state/plan proof. Cooper subsequently named both Preview and
Production as authorised deployment targets from this Mac.

### T007 follow-up local qualification

Committed source `195b20885c4b56e253456585864e80e5c72fd7b7`, tree
`0af2d5e537747ca3a8f599325272d7af6ff739a6`, passed all nine ordered local release
checks in 951.84 seconds. All 1,742 recorded tracked file/link identities matched
before and after; the new receipt is excluded from this comparison. All eighteen
detail files were read and their digests independently matched. The complete
deployment suite passed 273 cases, Quality passed 34 cases (including thirteen
real-checkout cases in 580.10 seconds), and both native application runs passed
fourteen cases. Focused native/retained checks passed 92 cases; focused Quality
policy checks passed 21.

The actual clean receiving checkout also passed Preview and Production source
identity/projection commands using mock plan text. Each captured 770 tracked
source entries without supplied source hashes, calculated the receiving patch
digest, and refused a deliberately incorrect configuration digest. These are
real command checks with mock provider plans; they do not prove a cloud plan.
Isolated homes stayed empty and no credentials were used.

The [dated receipt](../../documentation-audit/clean-slate-foundation/2026-10-07-native-source-plan.json)
retains complete check outcomes, log/detail digests, source identities, corrected
attempts and limitations. This final receipt/plan update changes documentation
only. Exact native credentials, rate-limit namespace, state, cloud plans,
deployment receipts, recovery and public readback remain to be qualified for
Cooper's newly authorised local Preview and Production deployments.

## T007 local native cloud preparation

The existing TaxKit primary-checkout Doppler login supplies the native provider
bridge in memory, with each environment's own Cloudflare token selected from
its existing config. No scope, token or secret is changed. Current account-token
verification and independent cf metadata reads identify the retained Preview
and Production tokens, both active until 18 November. Both have Worker script,
observability and Secrets Store write permissions; Production domain/DNS
permissions remain unqualified. All 46 returned Worker settings were read with
no active rate-limit binding. The native secret composition therefore selects
namespace `10078` for Production and `10078<PR number>` for Preview. Actual
composition tests prove separate Preview values and unchanged development
selection. Four new cases, infrastructure types/tests and lint pass.

The native Bun client independently reads shared-store version seven and
authenticated state. Its existing same-account state bearer can be selected
without bootstrap, upgrade, refresh or credential copying. The native app stack
has no existing stages. A real diagnostic Preview plan against the changed
source reports two creates and nine binding changes, with no Production
resources. It is not an apply-qualified clean-source plan. Corrected attempts
and limitations are retained in the [dated receipt](../../documentation-audit/clean-slate-foundation/2026-10-07-native-cloud-preparation.json).

Docs-maintainer: **Change required** for native config/composition tests,
infrastructure README, deployment architecture, runbook/authority, plan and
receipt routing. **Preserve** tax results, deferred metrics, disabled collection,
old credentials, historical identities and stopped writers. **N/A** for a
Changeset and generated references: private infrastructure configuration only.
Whole-checkout qualification and exact clean native plans are next; Preview is
proved before Production under Cooper's existing deployment approval.

## T007 authorised local Preview and Production delivery

Draft [#161](https://github.com/crcorbett/taxkit/pull/161) at
`787e6f72a4a2e06605290eaeb1990a360776a387` passed the frozen install and all
nine ordered local release checks in 1,038.5 seconds. Every one of the 1,744
tracked files and links matched before and after those checks and both native
deployments. All eighteen check-output digests were independently read and
verified. Both browser runs passed fourteen cases. This is local proof; it
does not claim hosted Quality success or restore GitHub credits.

The real native Preview and Production plans were bound to that exact clean
source, account, stage, zone and installed Alchemy beta.80 patch. Cooper's
direct local deployment approval covered both operations. Cooper separately
approved three additions to the existing Production token: DNS settings read,
Worker routes write and dynamic URL redirects write, limited to taxkit.dev.
Independent metadata and reads through the unchanged stored credential proved
the same token identity, expiry and full earlier account policy. No Preview
token, Doppler config or secret value changed.

Native `deploy` ran without `--yes`; each specific plan prompt was answered
after comparing its resources with the qualified plan. Preview `pr-161`
completed at 07:54 UTC and Production at 08:03 UTC on 7 October. The existing
shared state store stayed at version seven without bootstrap or upgrade;
ordinary native state now contains only these two new app stages. Old Workers
and unrelated stacks were preserved. The live Website is
[taxkit.dev](https://taxkit.dev), the API is
[api.taxkit.dev](https://api.taxkit.dev), and the
[Preview Website](https://taxkitappscloudflare-taxkitweb7xvou7miucr7nekqlt7s3lct.coopercorbett.workers.dev)
uses its own API and rate namespace `10078161`; Production uses `10078`.

Independent provider reads prove the private Website-to-API connection, MCP
session class, exact origin bindings, current version/deployment IDs and
three Production hostname owners. The full DNS settings reply is identical
before and after apply. The only DNS records are the three Worker-managed
AAAA records; the single native www rule redirects with status 301 while
preserving path and query. HTTPS health, catalogue, known calculation, OpenAPI,
documentation page/navigation/search/Markdown, all three visible calculator
answers, mobile search and a calculation without JavaScript pass in both
environments. The official modern MCP client connects, lists six tools and
calculates through both deployed APIs. Modern prompt cancellation and public
agent setup remain unfinished, so T006 is not accepted.

Two limits remain explicit. A follow-up Preview plan proposes two Worker and
three binding updates because resolved peer Outputs become unknown during
planning; the actual saved bindings and public behaviour agree. No replay was
performed and no no-op convergence is claimed. The Production browser also
observes Cloudflare's injected `/cdn-cgi/rum` beacon. Worker script settings
report observability null and Logpush false, consistent with the explicitly
disabled app collection policy, but that does not disable this separate
browser beacon. Read-only site inventory did not identify its configuration
owner. The metrics approach remains deferred; no beacon configuration or
metrics implementation was changed and no privacy qualification is claimed.

The [dated cloud receipt](../../documentation-audit/clean-slate-foundation/2026-10-07-native-cloud-preparation.json)
retains authority, token permissions before/after, source/check/plan digests,
native applies, provider/public reads, corrected check attempts and recovery.
This three-document closeout changes no qualified code or configuration and
uses bounded documentation, runbook, portability and diff checks. T007 stays
in progress for the remaining current workflow/evidence alignment; T008,
deferred T009 and final T010 acceptance remain unfinished. No merge or package
publication occurred.

## T006 agent setup and cancellation bounds

Continue from deployment draft #161 at
`580806576a74a57407ee266a731863d374a587d2` on
`codex/dev-77-agent-setup-and-cancellation-bounds`. The `/agents` page now
projects the actual checked same-stage MCP address. Its accepted public guide
explains connection steps, all six remote tools, input-first use, the five
visible browser tools, experimental browser support, anonymous limits, older
conversation expiry and the modern five-second cancellation limit. The existing
catalogue supplies navigation, search, processed Markdown and agent discovery;
there is no second index or tool implementation.

Two local `enable_request_signal` experiments did not qualify prompt
pre-response cleanup. A minimal direct-socket Worker also stopped its client
without observing an incoming signal during 1.5 seconds before its response.
Restore the experimental test exactly and preserve the actual modern negative
oracle. No flag, dependency or provider change is retained. This investigation
supports the bounded limitation; it does not establish a production platform
failure or fix. The observed modern limit remains explicit in the accepted contract.

Docs-maintainer: **Change required** for the route/journey, accepted guide and
navigation bindings, API/Website READMEs, API architecture, active task/plan and
[dated receipt](../../documentation-audit/clean-slate-foundation/2026-10-07-agent-setup-and-cancellation-bounds.json).
**Preserve** the native protocol, response limits, older alarm/cancellation
proof, retained tax results, earlier receipts and deferred metrics. **N/A** for
Changesets because apps and this documentation content are private and published
package interfaces are unchanged; runbook operations, credentials and provider
settings are unchanged. Documentation, runbooks, Web types, lint and the exact
restored MCP cases passed. The new guide passed actual built browser/Markdown
assertions. The first built suite had one local startup timeout; its unchanged
two-case retry passed with original deadlines. Preserve that unresolved attempt.
The corrected source at `72bfa16ac08dacc4c26f3de023a2880baefe1c55` passed all
nine ordered local checks in 997.08 seconds, including both fourteen-case native
runs. All eighteen detail logs were read and hash-checked, and all 1,749 frozen
tracked identities matched through both native applies. Draft #162 is pushed.

Primary review accepts T006 against the current SPEC and task. The SPEC already
says remote cancellation is not guaranteed; the task expressly requires the
modern TCP-abort negative oracle to remain. Preserve that five-second bound,
the older positive cancellation/automatic alarm proof and the native browser
caller support ceiling. This is acceptance of the written contract, not a prompt
cancellation fix or an autonomous model session. Draft review remains outstanding.

Authorised native local deployment completed for pr-162 at 09:19:52 UTC and
Production at 09:23:34 UTC on 7 October. Preview created only its two apps and
nine bindings; Production updated the existing two apps and three bindings,
with the retained zone/settings unchanged. Actual live API, all three calculator
answers, guide, Markdown, search, mobile/no-JavaScript behaviour and both
supported official clients pass. Independent provider reads confirm same-stage
origins, the expected rate namespace, MCP class/service, unchanged domain IDs,
DNS settings, www rule and three DNS records with the next page empty. The
Production browser still observes the separate Cloudflare RUM beacon; metrics
remain deferred. No credential, shared-store upgrade, merge or package publication
occurred. Documentation-only closeout uses focused docs/runbook/path/diff checks;
the qualified application, content and configuration bytes remain unchanged.
Continue T007 operational-owner alignment and T008; deferred T009 and overall
T010 acceptance remain outstanding.


## T007 native operational handover

Continue from draft #162 at `778c6b2052c5bc065355146245e697cf52b14374` on
`codex/dev-78-native-operation-handover`. The current runbook, infrastructure
and deployment/tool owners now route to the installed native CLI and existing
source/projection command, exact source/stage/account/zone checks, separate
read/deploy credentials and authenticated shared state. Historical writer
workflows and receipts remain stopped and unchanged. No replacement runner is
introduced. The sidecar adds the two current evidence pointers and preserves
its five inspect-only procedures and unknown standing principals.

Fresh read-only provider checks use both existing scoped credentials: all fifty
Worker settings agree with the full paged search; the next page is empty, and
the three native API rate namespaces have exactly their expected owner. The
existing state store is version seven with pr-161, pr-162 and prod. Registration
is active, locked and auto-renewing; DNSSEC stays disabled; selected TLS settings
are preserved; four active certificate packs cover the three TaxKit hostnames
and their next page is empty. Protected DNS/domain/redirect and actual public
journeys retain the separate #162 receipt. These reads do not retrospectively
establish a namespace pre-read for pr-162. The runbook requires that check
before every future apply.

Docs-maintainer: **Change required** for current native operational commands,
recovery and authority pointers, deployment/infra/tool owners, sidecar evidence
pointers, active task/plan and the
[handover receipt](../../documentation-audit/clean-slate-foundation/2026-10-07-native-operation-handover.json).
**Preserve** native code, strict policy/fixtures, historical receipts, retained
tax results, disabled Worker records, separate unqualified RUM and deferred
metrics. **N/A** for a Changeset, public acceptance/generated content or provider
mutation: this is documentation-only. Eight focused checks pass, including all
273 deployment cases. The first runbook check required exact evidence paths to
be rendered; that correction passes without changing the check. Full verification
at `86dcf222c666c6f24fe509a070f88cd404cc1ff9` stopped at the existing JSON
format check; the same formatter corrects the sidecar and its focused checks pass.

Corrected clean source `226c60bddb225467db64e772d48304af2368a216` passes full
verification in 684.12 seconds. All 1,750 frozen file/link identities match. The
run includes 34 workflow cases, 26 SDK browser cases, 21 Website browser cases
and all 14 freshly built native Website/API cases. Primary review accepts T007
against its named preparation outcomes and affected owners; draft
[#163](https://github.com/crcorbett/taxkit/pull/163) awaits Cooper review. The
SPEC now points to the later dated deployment authority, rather than implying
the original implementation-only boundary remains the latest instruction.
Four documentation/task/evidence closeout files use focused docs, runbook, path,
format and diff checks; application and configuration source stay unchanged.
Cloud rollback, teardown, no-op convergence and overall T010 delivery are not
claimed. Continue T008; metrics and the Medicare decision remain separate.


## T008 backend and request collection candidate

Continue from draft #163 at `d9cadb664291b327cf3e3cb624d40c511d78a384` on
`codex/dev-79-analytics-policy-and-capture`. The new private compiled
`packages/analytics` uses the canonical renderer with an explicit TaxKit stable
configuration adaptation. Catalogue-owned identities, checked settings and safe
errors separate deliberate off from invalid enabled configuration. Backend
capture has one scoped HTTP attempt and one complete five-second deadline,
64 KiB reply bound, omitted credentials, disabled tracing and manual redirect
policy. It sends only the agreed catalogue ID/name and required event/operational
identity; transport success is not stored-event proof.

The API adds one successful-use decorator and one fresh collector per request,
capped at 64 successes. Denied/malformed collection policy or DNT does not
change calculation admission. The application captures its delivery service
during initialisation and supplies it to returned request operations; Worker
and older session `waitUntil` own best-effort sends. Registration omits the
collector so an agent conversation cannot retain its first collection choice.
Pure tax packages, local SDK calculations and the standalone local Bun host
have no analytics send.

Focused package/API tests and actual-path lint fixtures pass. The actual native
Fetch proof covers HTTP and RPC plus both official MCP client protocols with
deny → allow → deny in one conversation, one allowed event, no duplicate and
unchanged tax replies. Controlled failures/redirects remain best-effort; stalled
upstream data ends the app send at about five seconds while the tax reply returns
within two seconds. The controlled Node response bridge does not expose body
cancellation; that is a retained limitation. The first full local run passed
all preceding checks and 16 native cases, then exposed an outdated source-edit
fixture: its old import replacement left the temporary reload app without an
import. A named independent test import fixes that edit, and the isolated real
reload test passes with the original deadlines. Fresh frozen-source verification
then passed in 680.92 seconds at `311288c3b12c768af15e1efe4738286b56b5e506`,
including all 17 native cases. All 1,772 tracked file/link identities matched
after the run. Root tests and build passed at the preceding source; the only
changes were this test fixture and two documentation owners. Evidence is at the [dated candidate receipt](../../documentation-audit/clean-slate-foundation/2026-10-07-analytics-backend-and-request-policy.json).

Docs-maintainer: **Change required** for the new package and app READMEs,
package/Effect/API architecture, exact lint admission and rejection fixtures (including the existing
TaggedError class-factory exception with the replacement constructor check),
active task/plan and receipt. **Preserve** retained tax results, published
interfaces, accepted public content, canonical skills, existing provider state,
five inspect-only runbook procedures and deferred metrics. **N/A** for a
Changeset: this private package/app candidate does not alter the published
tax/SDK closure. No provider, credential, deployment, merge or publication
operation occurs.

T008 remains in progress for the private browser SDK/lifetime/allowlist, relay,
Website opt-out forwarding, actual browser privacy journeys, retained provider
projects and corresponding public/operational owners. Registry archive research
uses PostHog browser 1.438.2 and Distilled PostHog 1.0.0-rc.13; neither SDK is
installed by this checkpoint. Read-only preparation does not establish the
Cooper organisation region or complete paged absence before a project create.
No existing foreign project token is borrowed. Continue these independent
local parts; metrics and the Medicare decision remain separate.

### T008 browser library policy mismatch

Private Chromium experiments with the official PostHog 1.438.2 archive sent
a waiting pageview and a queued retry after Do Not Track changed to `1`.
Final supported-options-only experiments kept cookie/local/session storage
empty, but neither opt-out nor shutdown discards the waiting event. A runtime
signal experiment blocked sends; current public types declare no signal in
`fetch_options`, so that experiment is not a shipping contract. The latest
SDK also wraps `api_key`, `batch` and `sent_at` at `/e/`; the checked event
reconstruction preserves only agreed fields. No real provider request occurred.

Cooper has been asked to choose between the proposed small TaxKit-owned browser
sender and retaining the accepted SDK requirement while activation remains
unqualified. The SPEC is preserved pending that choice. Continue independent
provider and backend work; do not bypass private SDK queues or infer approval
from elapsed time. The connector produces a US-host UI link, but authenticated
management ownership, complete listing and capacity are still unverified. All
four TaxKit Doppler configs (`ci`, `dev`, `prd`, `stg_preview`) have no PostHog
variable names. No provider or credential has changed; metrics remain deferred.


### T008 Website calculator preference candidate

Draft [#164](https://github.com/crcorbett/taxkit/pull/164) contains the locally
qualified backend source. The next attached slice closes Website preference
forwarding independently of the pending browser pageview sender decision. One
private header boundary is shared with the API; browser requests read native
Do Not Track at each dispatch, and HTML requests read their original headers.
The same existing Atom client serves manual and visible-tool calculation.
Refusing/missing browser hosts, unexpected preference values and missing server
request contexts refuse collection without changing the calculation request.

The expanded native analytics fixture uses real built API and Website modules,
Chromium and synthetic capture settings. Exact two-line lint exemptions admit
only changing the native browser preference getter and throwing its controlled
refusal; ordinary object mutation and native throws remain forbidden elsewhere.
All orchestration stays in Effect scopes. Focused native tests now pass, including
actual Chrome WebMCP deny → allow → deny calls with one allowed event, five
manual browser preferences and six repeated HTML policies. The
[dated receipt](../../documentation-audit/clean-slate-foundation/2026-10-07-website-calculator-collection-policy.json)
owns candidate identities, actual checks and remaining proof.

Documentation impact: **Change required** for the shared export/README, API and
Website owners, frontend/API/Effect architecture, exact lint configuration and
fixtures, this plan and its proof. **Preserve** the accepted sender SPEC pending
Cooper’s choice, pure tax/SDK contracts, public documentation content, private
provider credentials and all five runbook procedures. **N/A** for a Changeset:
only a private package and private apps change; published package closure is
unchanged. No provider, credential, deployment, merge or publication occurs.
Metrics remain deferred; T008 remains in progress.


Website preference qualification: root tests passed in 70.35 seconds, builds in
4.89 seconds and full `bun run verification` in 689.81 seconds. All 18 built
native cases passed across 10 files in 122.67 seconds; the new policy case uses
real manual and Chrome WebMCP requests plus repeated private HTML calculations.
The actual-command policy fixture has 26 passing cases, with full root lint
regression checks also passed. All 1,775 frozen input identities matched after
the complete checks. Only this plan and the dated receipt then receive proof
metadata and focused closeout checks. This accepts the local Website forwarding
slice only; browser pageviews, relay, retained provider resources, stored UUID
proof and public privacy/operations updates remain T008 work in progress.
No new provider, credential or deployment operation is claimed.


### T008 retained PostHog project candidate

Continue from draft [#165](https://github.com/crcorbett/taxkit/pull/165) at
`c894892f443e1bee6cf90d85ecb14a1193f1046b` on
`codex/dev-79-retained-posthog-projects`. The separate native
`TaxKitPostHog` stack declares exactly two retained US projects in durable
`prod`; local and PR stages refuse. Distilled PostHog 1.0.0-rc.13 is pinned
without changing Effect or Alchemy. Checked organisation and management key
settings have no defaults and select only the existing `taxkit/prd` config.
No key or project has been created, and application collection remains off.

The private closed management service contains complete bounded inventory,
checked ownership markers, safe typed failures, one-attempt native transport,
streamed byte limits and supported privacy controls. An uncertain create reads
ownership again without automatically issuing another POST. Update preserves
project and capture-key identities. Native retention plus explicit delete
refusal protects history; bulk deletion skips the resource type. The native
provider registration bridge caches fallible acquisition within the stack
scope rather than creating another runtime or turning configuration errors
into defects. Cross-process create races remain a provider API limitation.

All 35 focused management/native lifecycle cases and 38 actual-command lint
fixtures pass, including a real loopback redirect, refused writes, malformed
inventory, stalled/oversized bodies and changed privacy/capture-key readback.
The dynamic-import fixture confirms the same exact SDK admission as static
imports. A mistyped test-config path stopped one command before tests started;
the actual package command then passed. No check or deadline was weakened.
The [dated receipt](../../documentation-audit/clean-slate-foundation/2026-10-08-retained-posthog-projects.json)
owns the full local qualification and its limits.

Documentation impact: **Change required** for private infrastructure exports and
README, configuration/deployment/Effect/package/testing architecture, exact
lint permissions and fixtures, this plan and dated proof. **Preserve** the
accepted browser sender SPEC pending Cooper's choice, pure tax and published
SDK contracts, public content, provider credentials/state and the five
inspect-only runbook procedures. **N/A** for a Changeset: this private
infrastructure candidate leaves the published package closure unchanged.
Provider capacity, full real inventory, fresh TaxKit credential scope, online
plan/apply and stored events are still unqualified. Metrics remain deferred.


The first complete test run passed all 659 lint cases, then stopped when the
docs-content build and test leaves both rebuilt docs-fumadocs and concurrently
removed its output. The earliest command owner now relies on Turbo's existing
upstream build ordering. Root `docs:catalogue` routes through the same filtered
generation task, preserving cold dependency preparation. The two package
READMEs and testing architecture describe leaf versus dependency-graph use.
This prerequisite correction changes no content, calculation or provider
behaviour; the original failure remains evidence and requires fresh complete
checks on the corrected source.

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

The local continuation also records this objective in the runtime's native goal
manager. This active plan and the task ledger remain the durable repository
continuation record.
Medicare result changes remain gated on Cooper's concrete decision. Continue all
independent work. No merge, deployment, publication or provider apply authority
is added. Keep Linear activity, status and evidence aligned with actual results.

Next continuation milestone: migrate the remaining deployment, SDK, app/config and infrastructure paths, then finish readonly
contract, Schema, helper and lifetime review before downstream acceptance.
The Bun-hosted Effect test runner and focused lexical gap proof are locally
qualified; static JavaScript checking remains pending. Domain boundary enforcement is implemented in PR #93. The latest
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
| T005 / DEV-76 | Pending T003/T004 | Accepted content, route retention, search and discovery. |
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

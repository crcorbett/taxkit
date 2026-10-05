---
document_type: execution-plan
lifecycle: current
authority: supporting
owner: taxkit-implementation-owner
last_reviewed: 2026-10-05
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

Next continuation milestone: finish T004's three calculator pages, then its
complete package, transport and domain qualification. T003's connection/containment
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
| T004 / DEV-75 | In progress after local T003 acceptance | Previous answer/stale-state candidate first; remaining calculator pages, breakdown/sources and transport/interface qualification follow. |
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

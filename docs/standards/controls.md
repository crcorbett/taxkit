---
document_type: standard
lifecycle: current
authority: canonical
owner: taxkit-ci-release-maintainer
last_reviewed: 2026-10-04
review_trigger: public boundary, workflow, action, release graph, or repeated-review finding change
---

# Controls and automation governance

The Quality workflow is the executable CI owner for the local release-facing
graph. It has read-only repository permission, a timeout, cancellation
concurrency, an explicit `taxkit-ci-release-maintainer` pin-update owner, and
full-SHA action pins. It invokes `bun run release:check -- --ci` on every
configured pull request and on pushes to `main`; feature-branch pushes are
intentionally covered by the pull-request event rather than running the same
Quality graph a second time. There are deliberately no path filters, so a new
or renamed release boundary cannot be skipped. The preceding bootstrap steps
materialise complete `main` comparison history, resolve cache identities,
perform a frozen Bun install and install Chromium plus its system packages
through the app-local Playwright executable; a shallow checkout, cached
`node_modules`, skipped install or floating browser-tool resolution fails
policy. The Schema-decoded workflow,
control register and negative corpus are owned by `tools/quality-workflow/` and
run through `bun run check:quality-workflow`.

`bun run test:quality-workflow` runs the policy cases and six isolated
release-boundary mutations through Bun-hosted Effect Vitest. Each mutation
runs its real owning command. Scoped temporary clones retain relative symbolic
links and clean up on success, failure and interruption; child processes and
the loopback-port reservation have the same lifetime owner. Syntax inspection
uses immutable traversal and checked record/array access. The root verification
also runs `bun run check:quality-workflow:types`, covering the policy and tests.
This changes local checking, not CI permissions or provider authority.

The same scoped runner also executes four clean-slate enforcement mutations
from `fixtures/strict-enforcement-defects.json`. Each changes only the copied
lint configuration and runs the real `test:oxlint:task` verifier. Removed/disabled
required rules and broadened synthetic assignment/method admissions must fail.
The fixture Schema admits exactly the four named modes; each named test asserts
the complete ordered corpus and selects exactly one fixture. All ten deliberate
faults have independent scoped repository copies, results and finite five-minute
test deadlines. The source-only documentation check is a separate named test,
with a temporary Git index and no package build before or after its command.
Grouping a growing lint corpus under one shared deadline previously timed out
on the hosted runner; the deadline length and all rejection assertions remain. The target and command are fixed in code. Synthetic
canary exceptions admit no production source. Retain the existing five-control
register and six release-boundary oracles; this adds attached T002 proof.

Every eligible deterministic command under that graph is a Turbo task. Quality
binds the Vercel team cache as read/write on all configured events.
Same-repository pull requests and `main` receive the existing team-scoped
remote-cache token; forks do not. The workflow policy rejects a missing
binding, remote read-only regression, `pull_request_target` and step-level
cache-mode overrides. This
accepts that same-repository pull-request code can access the token. Local cache
writes and the full uncached graph remain available if the credential or
service is absent; cache success cannot replace a command exit status or
release proof.

Quality separately caches Bun package downloads and Playwright Chromium
binaries through full-SHA GitHub cache restore/save actions. Bun's path comes
from `bun pm cache`; Chromium uses an explicit `ms-playwright` directory under
GitHub's runner temporary directory, outside the checkout. Keys include runner
OS, architecture and `bun.lock`. The Bun key also includes `.bun-version`; the
Chromium key includes the resolved app-local Playwright version. Event name is
excluded so a pull request can restore a matching default-branch cache. GitHub
ref scope keeps pull-request writes away from `main` and sibling pull requests.
Cache operations are non-fatal, saves occur only after the matching install
succeeds, and `bun install --frozen-lockfile` plus Playwright `--with-deps`
always run. A restored Chromium binary does not prove system packages were
installed.

| Signal and named failure | Owner, fixture, evidence and recovery | Review trigger | Retirement |
| --- | --- | --- | --- |
| Workflow change; a floating action/browser tool, shallow or ambiguous base history, write permission, unbounded run, other-job/comment spoof, or bypassed graph | `tools/quality-workflow/controls.json` entry `quality-workflow-semantics`; `policy.test.ts`, `check:quality-workflow`, bounded tagged finding and recovery | Workflow, action, browser dependency, public-boundary, or release-graph change | A stronger schema-decoded workflow policy replaces this exact contract. |
| Release-relevant revision; a boundary passes a partial local CI graph | `controls.json` entry `canonical-release-graph`; `@taxkit/scripts` CI report with owning failed command | Package, API, SDK, docs, manifest, workflow, or release-script change | A stronger canonical graph owns all nine ordered checks. |
| Turbo task, cache credential or event mode changes; a fork or `pull_request_target` receives the credential, missing cache blocks execution, or a hit is treated as proof | `controls.json` entry `turbo-remote-cache-boundary`; `policy.test.ts`, `check:quality-workflow`, full local fallback and exact mode recovery | Turbo config, task input/output, workflow event, contributor trust, credential or fallback change | A stronger token-bearing cache authority and fallback control replaces this contract. |
| Bun or Chromium cache changes; `node_modules`, an incompatible binary, skipped install or fatal cache outage enters Quality | `controls.json` entry `quality-dependency-cache-boundary`; `policy.test.ts`, `check:quality-workflow`, exact path/key/order and cache-removal recovery | Bun/Playwright version, lockfile, runner platform, cache action, key, path, event or install change | A stronger content-addressed dependency-cache control replaces this contract. |
| Proposed recurring context work; untrusted output enters canonical context or corroborates itself | `controls.json` entry `context-candidate-admission`; Schema-decoded report-only envelope | Candidate source, retrieval, reviewer, publisher, retention or recovery change | A separately accepted canonical context-governance owner replaces this contract. |

Controls are admitted only when their exact signal, prevented failure, owner,
fixture, evidence route, recovery, review trigger, and retirement condition
match the Schema-decoded register. Repeated findings move to the earliest
enforceable owner. The workflow configuration and local checks do not prove a
hosted run, publication, registry state, deployment, provider state, or external
consumer behaviour.

Docs deployment automation has a separate narrow control register at
[`tools/docs-deployment/controls.json`](../../tools/docs-deployment/controls.json).
Its Schema and negative fixtures admit only these controls:

| Signal and named failure | Owner, fixture, evidence and recovery | Review trigger | Retirement |
| --- | --- | --- | --- |
| Candidate selection; fork, stale SHA, failed Quality result or candidate execution through `pull_request_target` reaches credentials | `docs-workflow-candidate-trust`; `tools/docs-deployment/automation.policy.test.ts`; repair exact trusted source/default-branch binding and issue a new attempt | Trigger, checkout, Quality, principal or candidate change | Stronger accepted workflow identity policy preserves exact-source proof. |
| Preview, Production or teardown plan or mutation; cancellation, weak stage locking or job-wide provider credentials bypass serial operation, least exposure, equal replan or readback | `docs-workflow-mutation-lock`; deployment policy and workflow contract checks; restore the non-cancellable exact-stage lock, provider-step token allowlist and accepted/equal plan contract | Concurrency, plan, credential placement, environment admission, state or provider change | Stronger provider-aware distributed lock replaces repository orchestration locking. |
| Pull request closes; teardown executes candidate code or derives a target other than exact `pr-N` | `docs-preview-teardown-safety`; stop and return to reviewed default-branch code plus manual exact-stage recovery | Close trigger, checkout, stage derivation or destroy change | Stronger accepted Preview lifecycle preserves reviewed-code and exact-stage proof. |
| Named deployment workflow completes; a self-authored or detached run/artifact is promoted without completed Actions API readback, exact source/input identity or bounded failure metadata | `docs-workflow-receipt-reconciliation`; `workflow.contract.test.ts`, `workflow-run-check.runtime.ts`, and the read-only `workflow_run` reconciler; retain the source artifact and reconciliation stop, then retry against the exact completed run | Workflow_run trigger, receipt schema/checker, artifact naming, source checkout or external-state promotion change | A stronger provider-independent receipt reconciler preserves completed-run, artifact, source/input and failure-readback coverage. |

`bun run check:docs-deployment-automation` proves these local records and
cross-field invariants only. The native one-resource successor has three
automation entries—Preview, Production and exact-stage teardown—and all three
have claim-matched established receipts. Historical two-resource and orphan
receipts recorded below remain evidence for their dated graph, not admission
for the successor.

Production plan, deploy and rollback share one fixed non-cancellable group.
Preview delivery and teardown share one exact-`pr-N` non-cancellable group.
The workflow contract proves that Preview and Production expose the Cloudflare
token only to exact provider steps. These controls do not lock manual CLI
mutation; normal manual work stops while a matching workflow is queued or
running, and break-glass recovery needs separate sole-writer authority and
state/provider readback.

Preview and Production use the closed `workflow-evidence` Effect command for
shared identity calculation, native plan projection, bounded provider JSON
decoding and sanitised receipt/GitHub output encoding. Static workflow checks
reject the retired repeated `shasum`, plan-receipt `jq`, provider-selection
`jq` and `printf TAXKIT_DOCS_*` blocks. YAML remains the sole owner of
environment protection, operation authority, locks and provider execution.
The bootstrap receipt must describe beta.64 as mutation-capable and must not
contain a credential or temporary secret-bearing URL.

The plan parser is admitted only with the five real sanitised beta.64 fixtures
and their strict manifest. The manifest binds the exact upstream commit,
GitHub run/artefact capture route, redaction rule and raw/final digests. Fixture
tests recompute each digest and fail on version drift, unsupported actions,
unknown resources and malformed lines. A dependency upgrade must replace the
parser binding and fixture proof together.

The dated manual Preview/Production/rollback receipts under
`docs/evidence/deployments/` prove the same candidate, plan, provider/state and
hosted contracts for an authorized operator epoch, but they do not change
`externalState.status` for those historical candidates. Those historical
workflow receipts established the retired classes after protected-environment,
credential, source and provider readback. The scheduled open-PR orphan
automation is now retired; PR-close teardown is the current lifecycle owner.

The 2026-08-05 default-branch workflow epoch provides dated receipts for the
three mutation control classes: Preview plan/deploy and exact-stage teardown,
fixed Production deploy, and source-bound rollback. Those receipts are
retained under `docs/evidence/deployments/2026-08-05-*` and remain separate
from local control validation. Report-only run `30967000841` reached inventory
but stopped because its read-only Cloudflare credential cannot derive the
Alchemy beta.64 state-store bearer without the mutation bootstrap path; no
provider mutation occurred. Consequently the aggregate deployment register
remains `not-established`, and orphan detection remains an inconclusive
report-only signal rather than deletion or teardown authority.

The historical b59e4ee epoch adds claim-matched protected Preview, exact-stage
teardown, fixed Production and normal rollback receipts under
`docs/evidence/deployments/2026-08-10-*`; those receipts remain separate from
the current register. Report-only run `31319845724` passed on the open branch
and proved only a branch-bound state/provider read. The current main-sourced
promotions are recorded below and are the admission evidence for the four
classes.

The workflow owners now fail closed on unexpected actions/resources in the
equal replan, assert exact provider stage/Worker/deployment/version identity,
run the shared hosted proof checker (including its candidate-bound screenshots)
before retaining a mutation artifact, and require a successful Schema-decoded
Preview artifact before Production mutation. Teardown requires exact
preflight and post-destroy state/Worker absence and emits a separate absence
readback. These are executable controls; a workflow artifact is still only a
dated observation until its outer receipt is promoted and admitted by the
positive external-state path. Report-only scheduling remains reviewer-gated,
and the 1,000-row pull-request bound fails closed at incomplete inventory.

The hosted checker has a separate strict application boundary. Effect Config
and owning Schemas reject missing, empty, malformed, partial-number,
out-of-range, unsafe-path and mismatched stage/PR inputs before the Playwright
host is acquired. Effect Scope closes that host on success, failure and
interruption. The workflow owns the bounded retry count and delay. Local
boundary tests prove no browser acquisition for invalid input and deterministic
cleanup; they establish no Cloudflare deployment or hosted behaviour.

### 2026-08-10 current main-sourced Preview promotion

The merged default-branch workflow at `bc2ac82f48cce67a6ee5b1b6caf9e8903bf9c182`
planned candidate `cbcb86878379cc2a126a8e48bee256aa33096c79` for `pr-24` and
completed deploy run `31338052297` after the accepted/equal-replan digest
`1a9492fb7a656ddab44565fcc224e502d56dbd04287a31d53aefdb343af0278f`.
Reconciler run `31338154055` API-read the completed source run and its matching
artifact. The promoted receipt at
`docs/evidence/deployments/2026-08-10-preview-pr-24/workflow-receipt-31338052297.json`
passes the positive external-state policy and establishes only
`docs-preview-delivery`.

The corresponding teardown run `31337384729` stopped at the beta.64 dry-run
with no destroy or absence readback. Production, rollback and report-only
therefore remain unestablished; no claim is inferred from the Preview receipt.

### 2026-08-10 current Production, rollback and report-only promotion

The subsequent reviewed default-branch workflow epoch used implementation
source `fef1dfca39d56d28b1f5956e4604af1cc659672b` and candidate
`cbcb86878379cc2a126a8e48bee256aa33096c79`. Production plan run `31342982776`
and deploy run `31343083326` were reconciled by `31343175981`; the final
source-bound rollback run `31343236244` (reconciler `31343339747`) changed the
fixed Production deployment/version and passed the hosted contract before the
final redeploy run `31343392260` (reconciler `31343498809`). Its promoted
receipt is
`docs/evidence/deployments/2026-08-10-production-prod-fef1dfc/workflow-receipt-31343392260.json`.
The receipt binds the fixed `prod` Worker, account/state identities, plan,
configuration, deployment-input and lockfile digests, provider version
transition, workers.dev URL, SSR/assets/server-function/404/navigation,
accessibility, cache/header, console, runtime and desktop/mobile screenshot
proof. The rollback receipt is retained under the same route and remains a
normal source-bound recovery observation; the final redeploy is the current
Production state for this dated epoch.

The reviewed default-branch report-only run `31344401196` (reconciler
`31344453019`) used main source `53d93648a7b36713055d3edf69beb681c058386f`
after the report credential wiring correction. Its dedicated report receipt is
`docs/evidence/deployments/2026-08-10-orphan-inventory-main-53d936/workflow-receipt-31344401196.json`.
It proves state/provider agreement, an empty open-PR set, no mutation
capability and no automatic deletion; the report-only environment remains
reviewer-gated rather than unattended.

The reviewed-main Preview teardown run `31350160353` (reconciler
`31350243582`) now supplies the fourth established automation receipt at
`docs/evidence/deployments/2026-08-10-preview-teardown-pr-24/workflow-receipt-31350160353.json`.
It proves two equal exact-resource delete projections, pre-destroy freshness,
post-destroy state-stage and Worker absence, and HTTP 404 for the former
workers.dev URL. The failed beta.64 runs remain historical non-claims. The
deployment register therefore has four established entries; none establishes
custom-domain, DNS, billing, release, publication, byte-promotion or current
public-domain claims.

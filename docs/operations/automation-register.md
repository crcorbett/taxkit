---
document_type: automation-register
lifecycle: current
authority: canonical
owner: taxkit-ci-release-maintainer
last_reviewed: 2026-08-28
review_trigger: workflow, signal, authority, proof, stopping, escalation, rollback, or retirement change
---

# TaxKit automation registers

The read-only Quality and context-candidate register is
[`tools/quality-workflow/automation-register.json`](../../tools/quality-workflow/automation-register.json).
It is validated by `bun run check:quality-workflow`; each entry has structured
signal and immutable-revision state, a named principal bound to one resource and
environment, per-run proof and nonclaims, fail-closed stop/escalation,
rollback/recovery owners and commands, and successor-gated retirement. The
validator checks those cross-field identities rather than accepting prose by
length or keywords. `externalState.status` remains `not-established` and its
nonclaims must match the proof envelope.

Quality CI is convergent validation of one immutable revision with `contents:
read` and Vercel Remote Cache read/write access on trusted token-bearing events.
After dependency-cache saves, same-repository pull requests and `main` fetch
the read-only single-config `taxkit/ci` values through repository
`DOPPLER_CI_TOKEN`, verify safe metadata and bind named Turbo outputs only to
the canonical release step with `local:rw,remote:rw`. Fork pull requests do not
fetch Doppler and run the complete graph with `local:rw`. Same-repository
pull-request code can access the resulting team-scoped remote-cache token under
Cooper's accepted contributor-trust boundary.
The remote cache resource contains Turbo task artifacts and logs only. Its CI
report has no candidate identity or attempt-receipt claim, and a cache hit does
not establish provider state.
Documentation/context freshness is not an unattended editor: it stages an
untrusted report-only candidate outside canonical/default retrieval, excludes
prior candidates and mutable/generated evidence, and requires a named reviewer,
separate publisher, publication status and last-known-good recovery before any
canonical edit.

Neither entry grants release, publication, deployment, provider, credential, or
external-state authority. A green local or hosted result does not establish
that GitHub ran, nor any tag, registry, deployment, provider or public
availability consequence.

The TaxKit Doppler configs and GitHub bridges are established. Merged-main
Quality proved the trusted `taxkit/ci` path at an exact revision. The retained
direct Turbo secret and variable were then removed under the dated hard-cutover
receipt. Hosted fork behaviour remains unproved.

The distinct docs deployment owner is
[`tools/docs-deployment/automation-register.json`](../../tools/docs-deployment/automation-register.json).
It is decoded and cross-checked with the deployment-only control register by
`bun run check:docs-deployment-automation`. It admits exactly three desired
classes: trusted Preview delivery, fixed Production delivery and exact-stage
Preview teardown. Preview delivery and teardown share the unreviewed
`taxkit-docs-preview` credential environment; Production retains its separate
reviewer-protected environment. The records require non-cancellable stage
locks for plans as well as mutations, accepted/equal replans, narrow credential
identities, provider/state readback, bounded receipts and fail-closed recovery.
Teardown executes reviewed default-branch code rather than pull-request-head
code.

Because GitHub runners are ephemeral, each mutation workflow refreshes the
account-matched Alchemy `cloudflare-state-store` cache with
`alchemy provider cloudflare bootstrap` under `CI=0` before it reads
provider/state postconditions. Beta.79 writes that cache only when `CI=0`.
Alchemy reads the named Cloudflare values supplied by the fixed Doppler bridge
directly from the environment in either mode; it does not need a profile login
or persist the Cloudflare token in a profile.
That bootstrap is mutation-capable: beta.79 may refresh credentials, read a
short-lived edge-preview secret, and create or upgrade the state-store Worker.
The sanitised workflow receipt records those allowed effects and explicitly
records its before/after provider facts as not observed. No local OAuth
profile, credential or temporary secret-bearing URL is copied into retained
evidence.

The workflow contract also checks credential placement. Preview and teardown
fetch only `taxkit/stg_preview` through the Preview environment's
`DOPPLER_PROVIDER_TOKEN`, check the safe metadata, and map the two Cloudflare
outputs only to exact provider steps. Preview separately fetches `taxkit/ci`
through repository `DOPPLER_CI_TOKEN` after cache saves and maps its Turbo
outputs only to the provider-free deployment check and build. Teardown never
fetches `ci`. Production fetches `taxkit/prd` only through its reviewer-
protected environment and separately fetches `taxkit/ci` after cache saves.
Its Cloudflare outputs reach only bootstrap, plan and equal-replan/apply; its
Turbo outputs reach only the four post-cache proof/build steps. Checkout,
dependency and browser setup, hosted proof and artifact actions remain
provider-token-free. GitHub supplies the stage lock only to workflow runs. It
does not lock manual CLI mutation, which is unsupported while a matching run
is queued or active. An interrupted provider step remains uncertain until
state/provider readback records the result.

One closed-mode Effect command owns candidate/config/lock identities, native
plan projection, state/provider and Wrangler JSON decoding, and sanitised
plan/provider/GitHub output encoding for Preview and Production. It cannot
select or run a provider executable. Workflow YAML still owns the protected
environment, authority inputs, lock, Alchemy and Wrangler calls and their
fail-closed order.

The current native `Cloudflare.Website.Vite` graph has one `DocsWebsite`
resource. Preview, Production and teardown retain accepted observations. Plan
v2 admits exactly one native Website action. The separately authorised Preview
state reconciliation is recorded at
[`2026-08-21-native-alchemy-hard-cutover/legacy-state-cutover.json`](../evidence/deployments/2026-08-21-native-alchemy-hard-cutover/legacy-state-cutover.json).
It processed the five exact stages found by read-only inventory — `pr-15`,
`pr-16`, `pr-17`, `pr-18` and `pr-23` — and the final sanitised inventory
observed zero legacy stages. The current Preview, Production and teardown
workflows now admit the native Website graph only. The provider-free
Vite/workerd build is preflight proof; the deployment-input digest binds the
tracked Website source set rather than claiming byte identity with Alchemy's
internal build.

The first `pr-15` apply produced an incomplete same-run receipt after Alchemy
reported the legacy deletion; the subsequent `pr-16` pre-inventory confirmed
the resulting native-only `pr-15` state. The remaining four stages have
successful post-mutation readback. Provider/state agreement is established for
the recorded snapshots only; this does not establish Production deployment,
custom-domain/DNS, publication, permanent availability or unrelated provider
resources.

The first shared-environment PR-close run started automatically but stopped
before dry-run or destroy because Turbo console framing surrounded the
inventory JSON. The corrected contract writes machine inventory directly from
the Effect runtime to a named temporary report, while Turbo remains the command
engine. It also prevents failed source runs from entering positive receipt
promotion. Corrected run `32367035323` and reconciliation `32367125582` passed
for exact stage `pr-60`; the promoted receipt establishes teardown under the
shared Preview environment. The old approval environment is now absent.

The scheduled/open-PR orphan automation and its child-process implementation
are retired. PR-close teardown remains the explicit lifecycle owner. Historical
orphan schemas and receipts remain decodable evidence only and cannot establish
current automation.

## Historical observations

### 2026-08-10 historical branch-bound candidate readback

The protected report-only workflow run `31319845724` passed for branch candidate
b59e4ee and retained state/provider agreement for one fixed `prod` stage and
Worker with no Preview/orphan candidates at
`docs/evidence/deployments/2026-08-09-orphan-inventory/report-31319845724.json`.
This receipt is intentionally branch-bound and cannot alter the current
register. No provider mutation, state write, teardown or credential-scope
expansion is inferred from that historical observation.

In that historical epoch, each mutation workflow enforced the remaining
boundary in its own YAML: the initial plan and equal replan required
`DocsWebsite` and admitted `DocsBuild` only as a migration delete; provider
inventory and the latest Wrangler
deployment are bound to the candidate, stage, plan, account, Alchemy state,
Worker, URL, version and pre-mutation version; and the shared hosted proof
checker must pass after strict receipt filtering and screenshot-byte digest
recomputation before the provider artifact is accepted.
Production downloads and Schema-checks a successful `main` Preview receipt
identified by `accepted_preview_run_id`, its workflow path and exact
`accepted_preview_pr_number`/`pr-N` stage. Teardown records a separate
Schema-decoded absence readback, checks the live PR is closed for both event and
manual dispatch, and rejects a false no-op or unexpected action. These workflow
artifacts still require promotion into a dated repository receipt before an
entry can move to `externalState.status: established`.

The positive admission path is explicit: decode one outer
`DeploymentWorkflowExternalReceipt`, then decode its plan/provider/hosted (or
teardown absence) paths. Recompute retained screenshot bytes
and cross-check workflow path, source SHA, environment, principal, stage lock,
plan/config/deployment/lockfile identity, account/state identity, deterministic
PR stage, provider/hosted identity and postconditions. A stale branch-bound or
retired-graph receipt remains historical and cannot establish the current
default-branch automation class.

Production's authority record admits `production-deploy` and
`production-rollback` as separate operations under the same protected
principal and fixed-stage lock; a rollback receipt cannot be promoted through
deploy-only authority.

The live workflow owners also Schema-decode the plan/replan or teardown
projection before mutation. Production accepts both the Preview provider/
hosted artifact and its canonical plan artifact. The separate read-only
`workflow_run` receipt workflow fetches the completed source run and matching
artifact after the triggering workflow ends; a triggering job cannot assert its
own completed status. A future established receipt must name strict workflow-run
and workflow-input readbacks proving the expected workflow name and exact
workflow path. Preview and Production API heads must be `main` and
match the outer workflow commit; automatic PR-close teardown instead records the
pull-request API head separately while its `workflowCommit` and
`refs/heads/main` identify the reviewed implementation that was checked out.
The reconciler must verify that reviewed commit exists and is an ancestor of
current `main` before validating the artifact. The workflow input must bind the
same run/path/source, operation and exact deployment candidate input to the
outer candidate. Synthetic workflow IDs or branch-bound output cannot establish
external state. Promotion checks hosted environment/stage semantics,
one desktop and one mobile screenshot with retained bytes, positive numeric PR
identity before Preview bootstrap, and a rollback identity sourced from the
accepted Preview provider receipt.
The reconciler is governed by `docs-workflow-receipt-reconciliation` in the
deployment control register; it adds no provider mutation or credential
authority and does not create another deployment automation entry.
Its successful validation path fetches only `taxkit/ci` after the Bun cache
save, verifies project/config metadata and binds the two named Turbo outputs to
the exact two-check step. Failure and cancelled paths do not fetch it. The
uploader prepares a separate directory containing exactly one final
`workflow-run.json` or `workflow-run-failure.json`; downloaded source artifacts
and raw GitHub API responses remain runner-local.

Preview, Production and teardown jobs also prepare separate upload
directories. Their typed allowlist admits only the final sanitised files for
the relevant mode and checks admitted JSON for deterministic sentinels and
credential/token shapes. Raw Alchemy output, stderr, intermediate provider
inventories and raw hosted diagnostics remain in the runner work directory.

The central plan parser is pinned to Alchemy `2.0.0-beta.64` and exact upstream
commit `31edd3c4b2f0f3310fad07f5423aee20cf72be8d`. Its five real sanitised
fixtures retain source run/artefact identities and raw/final digests for
create, update, no-op, delete and already-absent destroy. This is local parser
proof. It neither advances the automation register nor proves current
Cloudflare state.

The separate `docs-workflow-cache-boundary` control governs acceleration in all
four workflows. Receipt validation, Preview and Production get the TaxKit
Vercel Remote Cache values through the same `taxkit/ci` bridge after their
cache saves. Teardown stays local-cache-only. The Turbo token grants no
Cloudflare, deployment, release or receipt-promotion authority.
Content-addressed GitHub caches retain Bun package
downloads in all four workflows and Chromium binaries only where the browser is
installed. A ref may restore a matching default-branch cache, while GitHub ref
scope isolates its writes. Frozen install, browser install, exact candidate
checks, plans, mutations, provider and hosted readback, artifact reads and
receipt promotion remain live. Cache action failure is non-fatal, while failure
of any owning command still stops the workflow.

### 2026-08-10 main-sourced Preview readback and teardown stop

The merged main workflow produced a successful, claim-matched Preview epoch:
plan `31336277416`, deploy `31336358628`, and reconciler
`31336453638` all bind reviewed main SHA
`94392cc57c7328525110a7e992c04d4dfc1eebff`, candidate
`c602593b4e23e784a6c9e2b912c3084dcfc9b9f3`, stage `pr-23`, provider/state
identities and hosted/screenshot proof. The reconciler artifact is retained,
but it is not promoted into a repository outer receipt while the aggregate
mutation lifecycle remains incomplete.

The PR-close teardown `31335980866` is the corresponding reviewed-main
readback. It agreed on the `pr-23` state/provider inventory and exact delete
projection, then stopped because the pinned Alchemy beta.64 dry-run returned
exit 1 with empty stderr. No destroy or absence claim exists; reconciler run
`31336548279` failed closed. At that historical point all four deployment
entries remained
`externalState.status: not-established`; no Production or rollback run is
admitted from that failed teardown epoch. The next owner is hosted beta.64 runner
requalification or a separately reviewed supported correction, not promotion
of the non-zero plan output.

### 2026-08-10 main-sourced Preview promotion

Default-branch SHA `bc2ac82f48cce67a6ee5b1b6caf9e8903bf9c182` planned candidate
`cbcb86878379cc2a126a8e48bee256aa33096c79` for `pr-24` in run `31337945701`.
The equal-replan/deploy run `31338052297` and completion reconciler
`31338154055` produced a strict API-bound workflow receipt with matching
candidate, source, plan/config/deployment/lockfile, account/state, Worker,
deployment/version, hosted and desktop/mobile screenshot identities. The
promoted receipt is
`docs/evidence/deployments/2026-08-10-preview-pr-24/workflow-receipt-31338052297.json`;
only `docs-preview-delivery` is now `externalState: established`.

This does not advance Production, rollback, Preview teardown or report-only.
The corresponding `pr-24` teardown run `31337384729` stopped at the pinned
beta.64 dry-run with no destroy or absence readback, so the Worker remains
present. The report-only schedule remains reviewer-gated and report-only.

### 2026-08-10 historical Production and report-only promotion

The reviewed default-branch Production epoch used source
`fef1dfca39d56d28b1f5956e4604af1cc659672b` and candidate
`cbcb86878379cc2a126a8e48bee256aa33096c79`. Plan run `31342982776`, deploy
run `31343083326`, rollback run `31343236244` and final redeploy
`31343392260` were each API-reconciled (`31343175981`, `31343339747` and
`31343498809`). The final Production receipt is
`docs/evidence/deployments/2026-08-10-production-prod-fef1dfc/workflow-receipt-31343392260.json`;
the nested rollback receipt preserves the prior/current version transition and
the accepted Preview recovery identity. The receipt is the only current
Production external-state admission; it does not imply a custom domain, DNS,
publication or byte-promotion claim.

The reviewed default-branch report-only run `31344401196` and reconciler
`31344453019` are promoted through the dedicated `reportPath` receipt at
`docs/evidence/deployments/2026-08-10-orphan-inventory-main-53d936/workflow-receipt-31344401196.json`.
It proves state/provider agreement and no mutation/deletion capability. The
report-only workflow remains protected/manual rather than unattended. Together
with the Preview, Production and teardown receipts, the register now reads
four `established` entries; the failed beta.64 dry-runs remain historical
non-claims.

### 2026-08-10 main-sourced Preview teardown promotion

Reviewed-main teardown run `31350160353` for closed PR #24 completed after the
parser, direct beta.64 entrypoint and freshness corrections. Its completion
reconciler `31350243582` API-read the completed source run and matching
artifact. The promoted receipt is
`docs/evidence/deployments/2026-08-10-preview-teardown-pr-24/workflow-receipt-31350160353.json`.
It binds the reviewed source/run/input, exact `pr-24` stage, equal
`preview-destroy` digest, account/state/config/deployment/lockfile identities,
and the post-destroy state-stage, Worker and former workers.dev URL absence
readbacks. The destroy projection contained exactly `DocsBuild` and
`DocsWebsite` deletes; no other resource or action was admitted.

The automation register now has four established entries. The failed teardown
runs `31343533595`, `31343687718`, `31347119364`, `31347842707`, `31348538146`
and `31349508145` remain retained non-claim history. This receipt still does
not establish current Preview availability, custom-domain/DNS, billing,
release, publication, byte promotion or future provider state.

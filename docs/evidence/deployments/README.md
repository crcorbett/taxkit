---
document_type: deployment-evidence-index
lifecycle: current
authority: canonical
owner: taxkit-docs-deployment-proof-owner
last_reviewed: 2026-09-24
review_trigger: docs deployment candidate, provider, stage, URL, proof, screenshot, teardown or rollback receipt change
---

# Docs deployment evidence

This route owns dated, sanitized observations for the docs Worker deployment.
It never turns an earlier observation into current provider truth.

## 2026-09-24 Alchemy beta.79 Production plan

The [sanitised plan receipt](./2026-09-24-alchemy-beta79-production-plan/receipt.json)
binds the reviewed workflow, separately approved fixed `prod` plan, successful
GitHub receipt check and one `DocsWebsite` Worker **update** projection. A
fresh account-matched Cloudflare read still found the existing Production
Worker on its earlier deployment version, and its root URL returned HTTP 200.
The state-store bootstrap completed, but its precise effects were not observed.
No Production Website apply or hosted proof ran; a deploy needs separate
approval of the exact plan digest.

## 2026-09-24 Alchemy beta.79 Preview deployment

The [sanitised deployment receipt](./2026-09-24-alchemy-beta79-preview-deploy/receipt.json)
binds the separately approved exact-digest `pr-78` apply, one Cloudflare
`DocsWebsite` Worker, the successful receipt reconciler, hosted HTTP/browser
proof and hash-checked desktop and mobile screenshots. An independent HTTP
request returned 200; account-matched state and Cloudflare inventory agreed
on one `pr-78` stage and Worker after the run. This is Preview evidence only;
Production, public custom-domain availability and manual teardown remain
outside the approved operation.

## 2026-09-24 Doppler automation-token metadata

The [sanitised metadata receipt](./2026-09-24-doppler-token-metadata/receipt.json)
records one read-only, unexpired service token in each fixed `ci`,
`stg_preview` and `prd` Doppler config, the expected secret names in those
configs, and the matching GitHub bridge secret names. GitHub does not expose
bridge values, so the exact token-to-bridge binding remains unproved.

## 2026-09-24 accepted Alchemy beta.79 Preview plan

The [sanitised hosted receipt](./2026-09-24-alchemy-beta79-preview-plan/receipt.json)
binds PR #79's merged workflow, its successful automatic `pr-79` cleanup, and
the successful `pr-78` plan for the exact merged PR #78 candidate. The plan
proposes one `DocsWebsite` Worker create and retains the digest needed for a
separately approved apply. Account-matched readback after planning found no
`pr-78` or `pr-79` stage or Worker. No Website apply, hosted browser proof or
Production operation was performed.

## 2026-09-24 merged-main Preview stops

The [sanitised failure receipt](./2026-09-24-alchemy-beta79-preview-stop/receipt.json)
binds PR #78's merged-main Quality result, the failed automatic `pr-78`
teardown and the failed first Preview plan run. Both runs completed the
mutation-capable state-store bootstrap; neither destroyed or applied the docs
Website. Read-only state and Cloudflare inventory later agreed with no
`pr-78` stage or Worker, and the state-store Worker settings returned HTTP 200.
The exact bootstrap effects and hosted plan projection cause remain unproved.

## 2026-09-24 Alchemy beta.79 development plan

The [sanitised receipt](./2026-09-24-alchemy-beta79-dev-plan/receipt.json)
binds a checkout-scoped personal Doppler login, a completed Cloudflare
state-store bootstrap with Worker HTTP 200 before and after, and an exact
clean-commit `dev_cooper` plan. The [two-line plan](./2026-09-24-alchemy-beta79-dev-plan/plan.txt)
proposes one `DocsWebsite` create. The bootstrap's precise mutation was not
observed. No Website apply, Preview, Production, hosted journey or merge was
attempted under this development-only approval.

## 2026-08-03 capability probe

The installed token-administration command was invoked with closed standard
input solely to test capability. It stopped at the supported Global API Key
prompt and exited `130` when interrupted; no credential value was supplied and
no provider mutation occurred. The current Alchemy OAuth profile lacks
API-token-write capability, and GitHub readback still reports no protected
environment, Actions secret or repository variable. The required provider-admin
action and secure token-custody contract are recorded in the
[docs deployment runbook](../../runbooks/docs-deployment.md) and active plan.
This observation is a capability stop, not workflow, Preview, Production,
teardown or rollback proof.

## 2026-08-03 Executor connector re-auth stop

The configured Executor Cloudflare connector was present but rejected the
first account-owned permission-group read with `connection_rejected` and
upstream HTTP `403` (reported 403/9109). No permission-group data, token value
or provider mutation was retained. The secure re-auth handoff must be
completed in the Executor UI before any live permission resolution or token
creation can proceed. This is not workflow, Preview, Production, teardown or
rollback proof.

## 2026-08-04 CI credential and environment capability

The secure provider connection successfully resolved account-owned permission
groups and created separate, expiring mutation and report-only credentials for
the TaxKit docs Worker and Alchemy Cloudflare state boundary. The sanitized
receipt is `2026-08-04-ci-capability/receipt.json`. It retains token names,
redacted ID prefixes/digests, account resource scope, exact permission groups,
expiry and revocation owner; no token value or request body is retained. The
state resources are the account `alchemy-state-store` Worker and
`StateStoreSecrets` Secrets Store. The provider readback required no R2, route
or DNS permission.

GitHub readback found exactly four reviewer-protected environments with only
direction-specific secret names. The Executor GitHub connector lacks an
environment-secret administration operation, so the authenticated repository
administrator path performed the attachment and names-only readback. Secret
values were not written to the checkout or any `.env.local` file.

This is a capability receipt only. It does not establish that a workflow has
run from the default branch, that Preview or Production is currently serving,
or that teardown, rollback, custom-domain/DNS, publication or release proof
exists. The earlier failed capability and re-auth receipts remain unchanged.

## 2026-08-31 Doppler bootstrap precondition

The sanitised
`2026-08-31-doppler-bootstrap-precondition/receipt.json` records the exact PR
head, missing TaxKit Doppler project and GitHub bridges, retained direct secret
names, measured account-owned Cloudflare permission groups and the failed
trusted Quality boundary. The retained Cloudflare mutation token was active at
the observation time, but its bearer value had no approved recoverable source.
The previously approved Doppler bootstrap therefore stopped before mutation
and now needs separate authority to create three TaxKit-only account-owned
replacement tokens. The receipt contains no secret value, token identifier,
hash, preview, cache or export. It proves neither a replacement credential nor
a Doppler, hosted deployment or provider result.

## 2026-08-31 Doppler bootstrap

The sanitized
[`2026-08-31-doppler-bootstrap/receipt.json`](./2026-08-31-doppler-bootstrap/receipt.json)
records the separately approved TaxKit-only bootstrap. It binds the exact
Doppler project/configs, masked key names, three read-only automation-token
identities, three GitHub bridge names, three active account-owned Cloudflare
token identities and the revoked interrupted token. It also records the
repository-scoped personal login, safe local checks, bounded failed attempts,
rollback and exact non-claims. No secret value, hash, preview, personal account
name, email, local machine path, export or fallback cache is retained.

The receipt proves creation and metadata readback only for those exact
credentials and stores. It also binds successful trusted Quality run
`33351826840`, attempt 2, to exact head `7a12205…`; the same-repository run did
not exercise the fork-only step. It does not prove Preview, teardown,
Production, rollback, deployment, DNS, publication or legacy-credential
removal.

## 2026-08-31 Doppler merged-main and PR 73 teardown

The sanitized
[`2026-08-31-doppler-merged-main/receipt.json`](./2026-08-31-doppler-merged-main/receipt.json)
records the separately approved merge of PR 73, the successful exact merged-main
Quality run `33365915627`, and the automatic exact-stage teardown run
`33365915649`. The teardown fetched only `taxkit/stg_preview`, accepted two
equal no-op plans for `DocsWebsite`, and read back both the `pr-73` Alchemy
stage and matching Cloudflare Worker as absent. Receipt-reconciliation run
`33366004914` independently bound the workflow artifact to merged commit
`aec5e220…`; a later read-only Cloudflare query also found no Worker carrying
both the TaxKit docs stack tag and `pr-73` stage tag.

This is merged-main Quality and absent-stage teardown proof only. It does not
prove a served Preview, hosted fork behaviour, Production, rollback, DNS,
publication or legacy-credential removal. The Alchemy bootstrap step was
mutation-capable under the approved envelope, although no stage Worker or state
resource needed deletion.

## 2026-08-31 Doppler hard cutover

The sanitized
[`2026-08-31-doppler-hard-cutover/receipt.json`](./2026-08-31-doppler-hard-cutover/receipt.json)
records Cooper's hard-cutover approval, deletion of the six direct GitHub
entries and revocation of the eight old TaxKit CI inventory/mutation
Cloudflare tokens. Names-only readback found only the three Doppler bridges,
the four locked TaxKit configs and the three intended current Cloudflare
tokens. No secret value, hash, preview, raw provider output, cache or local path
is retained.

This proves metadata deletion and absence for the named targets only. It does
not prove a served Preview, hosted fork, Production, rollback, DNS,
publication or package release.

## Local workerd

The DCD-001 command-owned ignored receipt is local-only and is bound to its
exact commit and deployment-input digests. It proves no provider state.

## Preview

The resumed 2026-08-02 capability epoch is retained at
`2026-08-02-authority-capability/receipt.json`. It records Cooper's renewed
TaxKit-only authority, the exact draft candidate, GitHub environment/secret
absence, the local Alchemy profile identity and scope digest, and the narrow
CI-token capability stop. It contains no credential value and does not
establish a workflow, Preview, Production, teardown or rollback outcome.

Each Preview directory binds one trusted PR head, stage, accepted plan digest,
provider Worker/deployment/version/assets/URL readback, hosted behavioral proof,
bounded desktop/mobile screenshot manifests, teardown or explicit stop, and
limitations. The initial
`2026-07-30-preview-preflight/authority-preflight.json` receipt stops before
state initialization or mutation because the exact local candidate is not a
GitHub PR head. The sibling `git-authority.json` records Cooper's successor
authority for the exact branch/push/draft-PR recovery; it is an authorization
receipt, not proof that any Git or provider mutation succeeded. The sibling
`git-readback.json` records the successful exact remote branch and draft-PR
identity that derives Preview stage `pr-1`; it proves no provider state.

`2026-07-30-preview-pr-1/` preserves the complete successor chain. The
accepted candidate is
`d9cb8945529fb72158e59ca0daf02a98e1e4de1a`; exact pre-deploy and
pre-destroy receipts bind Git, state, provider, source, lock, configuration
and deployment-input identities. An independently decoded sanitized
credential readback pins the account and scope-set digest used by both
mutation preflights without retaining any credential value. Two equal create
plans and two equal destroy plans selected only `DocsBuild` and `DocsWebsite`.
The dated provider readback binds the exact Worker, deployment/version,
assets, observability settings and provider URL. Hosted HTTP/browser proof and
one reviewed, byte-bound desktop/mobile screenshot pair passed before
exact-stage teardown. The teardown receipt then proves the Worker, hosted URL
and `pr-1` stage resources absent. The failed apply, superseded plans and the
insufficient `0d714e6…` observation remain disconfirming history; none
describes current provider state.

The resumed 2026-08-02 candidate
`aabe7b69de164906699fb4646a8ecc5058d46178` was deployed to the isolated
`pr-1` stage after two equal create plans. Its provider readback, hosted
HTTP/browser proof and reviewed desktop/mobile screenshots are retained in
`2026-08-02-preview-pr-1/provider-aabe7b6.json`,
`2026-08-02-preview-pr-1/hosted-proof-aabe7b6.json`,
`2026-08-02-preview-pr-1/screenshot-desktop-aabe7b6.json` and
`2026-08-02-preview-pr-1/screenshot-mobile-aabe7b6.json`. The candidate then
passed two equal delete dry-runs and exact-stage teardown; the matching Worker,
hosted URL and state resources were absent in the postcondition readback. The
destroy plan and teardown receipt remain candidate-bound in the same directory.
This is a dated Preview observation and does not establish current availability
after teardown, Production, rollback, custom-domain, DNS, release or
publication behavior.

## Production

`2026-07-30-production-prod/` binds Preview-accepted source `d9cb894…` to
fixed stage `prod`, its equal plan, preflight, stable provider Worker URL,
Alchemy/provider readback, full hosted proof and reviewed desktop/mobile
screenshots. It also retains the separately Preview-qualified `c99984c…`
successor, that Preview's teardown/absence, its Production update, and the
restored d9 readback. The latest dated provider observation served restored d9;
historical receipts do not establish current availability.

The resumed aabe candidate has a separate dated chain in the same directory:
`plan-aabe7b6.json`, `predeploy-aabe7b6.json`, `provider-aabe7b6.json`,
`hosted-proof-aabe7b6.json` and the two screenshot manifests. It proved a
same-source Production update against the fixed Worker URL. The subsequent
`rollback-aabe7b6-to-d9cb894/` hosted and screenshot receipts, together with
`rollback-plan-aabe7b6-to-d9cb894.json`,
`rollback-predeploy-aabe7b6-to-d9cb894.json` and
`rollback-provider-aabe7b6-to-d9cb894.json`, prove a normal source-bound
redeploy to d9 and a changed provider deployment/version with the same Worker
identity. The final dated provider observation is restored d9; neither chain
establishes current public availability or repeatable GitHub workflow proof.

## Rollback

`2026-07-30-production-prod/rollback-receipt-d9cb894.json` cross-binds the
initial, successor and restored provider identities. The same Worker URL and
Alchemy instance survived both updates, deployment/version identities changed,
and the restored state bundle equals the initial d9 bundle. The successor and
target share deployment-critical configuration and lock identity while their
path-bearing clean outputs differ. This is normal source-bound rollback proof,
not byte promotion, direct provider-version rollback or recovery from
deliberately broken content.

The resumed two-transition rehearsal is intentionally retained as a separate
current-epoch evidence set rather than being inserted into the immutable
historical rollback receipt. Its preflight, equal plan, provider readback,
hosted proof and screenshot manifests are claim-matched and validated by the
deployment checker, while the historical three-transition receipt remains
unchanged.

## 2026-08-05 default-branch workflow epoch

The merged implementation revision is
`1b6d36b765a5953f79b0932c127f01088603930f`. Default-branch Preview plan and
deploy runs `30962576035` and `30962743727` used candidate
`eafeaad6c283ae6949ccf67636f39bec199b4e94`, stage `pr-10` and accepted plan
digest `acb4f2eb005b68c5d2c1ad1d491cda8119010b92f558c0d05ee68b25ee62e437`.
The workflow's provider readback is retained with the `pr-10` evidence; the
hosted HTTP/browser and screenshot manifests are retained under
`2026-08-05-preview-pr-10/`. Corrected exact-stage teardown runs
`30964380634` (`pr-10`, digest
`f6eab33a87f5011c46fd24cd689872271ba4d0ac2c7e2fdf11010b188d21dd11`) and
`30964525980` (`pr-9`, digest
`42d417acbcb28da0d1e4fd9dbe4a7e04285c95f2963859ee8c9e4a105e2a1bc3`) prove
provider Worker and state absence. The earlier `30962555585` false no-op is
retained as disconfirming evidence. PR-close teardown `30966977503` safely
recorded an absent-stage no-op for `pr-12` at the merged PR-12 head.
The merge-era PR-close run `30968741396` independently converged absent
`pr-13` at default-branch candidate
`936f3326a6100582ecd8ffb88b299985bc8db875`; its equal no-op digest and
state/provider postcondition are retained in
`2026-08-05-preview-pr-13/teardown-noop-30968741396.json`.

Production plan/deploy runs `30964647432` and `30964781776` deployed the
Preview-qualified `eafeaad6…` source to fixed stage `prod`. Successor plan and
deploy runs `30965270740` and `30965398455` qualified `aabe7b69…`; rollback
plan and execution runs `30965691430` and `30965797032` restored the
`eafeaad6…` source through the normal source-bound graph. The current
Production Worker, deployment/version and Alchemy state identities are bound
by `2026-08-05-production-prod-eafeaad/` and
`2026-08-05-production-prod-aabe7b6/`; hosted proof, rollback proof and the
bounded desktop/mobile screenshot manifests are retained there. These are
claim-matched dated observations, not custom-domain, DNS, publication or
byte-promotion claims.

The first report-only orphan run `30966300887` stopped before inventory because
`GH_TOKEN` was not bound. The corrected run `30967000841` reached
`deployment-inventory` and stopped because the separate read-only Cloudflare
token cannot derive Alchemy beta.64's HTTP state-store bearer without the
mutation-capable bootstrap path. The two inconclusive receipts are
`2026-08-05-orphan-inventory/failed-30966300887.json` and
`2026-08-05-orphan-inventory/failed-30967000841.json`. No provider mutation or
secret disclosure occurred; scheduled orphan detection remains report-only and
inconclusive. The deployment automation register therefore remains
`not-established` even though the three mutation workflow classes have dated
success receipts.

Secrets, raw tokens, request bodies, credential values and unsanitized provider
output are forbidden. Historical release and harness evidence remains
unchanged.

## 2026-08-09 local bridge-retirement candidate

`2026-08-09-local-bridge-retirement/receipt.json` binds the clean committed
candidate `d649a14fe49122387e33a6de0547468e6a3e4967` to the docs-app
Cloudflare/workerd built proof. The candidate removes the docs-app Nitro/Vercel
bridge, makes `test:built` the canonical built proof, and preserves the
independent `apps/web` Nitro owner. SSR, assets, cache headers, 404 behavior,
hydration, server-function transport, no-document navigation, accessibility,
console cleanliness, runtime reuse, filesystem isolation and local upload
limits passed. This is local evidence only; it does not establish hosted
requalification for this candidate or the report-only Alchemy state boundary.

## 2026-08-10 local bridge-retirement parity correction

Committed candidate `24ce5de1c565107276e9524b8e9203b14cab9580` reran the
canonical `bun run --filter=docs test:cloudflare-built` proof after adding the
retained Nitro parity oracles that were absent from the prior receipt. The
receipt is `2026-08-10-local-bridge-retirement/receipt.json` and records
passing mobile navigation disclosure, reduced-motion suppression, pending
navigation and recoverable source-error rendering alongside the existing SSR,
assets, hydration, no-document navigation, server-function, 404,
accessibility, focus, console, runtime, filesystem and local limit checks.
This remains local workerd evidence only; it does not establish any provider,
hosted, Preview, Production, rollback, public, release or domain claim.

## 2026-08-09 report-only state-read candidate

The successor workflow candidate uses the protected
`ALCHEMY_STATE_STORE_CREDENTIALS_JSON` secret only in
`github-actions-report-only` to materialize the account-matched Alchemy cache
before the report-only inventory command. The workflow has no Alchemy login,
bootstrap, plan, deploy, destroy or state-write path. Beta.64's bearer is not
cryptographically read-only, so this candidate carries an explicit
operational-read-only limitation. A dated workflow receipt is required before
the automation register can advance from `not-established`; no state,
provider, absence or teardown claim is made by this candidate alone.

## 2026-08-09 report-only cache-ingress stop

The exact candidate `39f389c24f819046b2bd57e7cb3bd8674eed0941` passed Quality
and the protected report-only materialization step. The job's names-only probe
confirmed the expected home-relative cache file, keys, account-id length, URL
host and bearer length without exposing a value. The inventory process then
stopped at `deployment-inventory:missing-cache` because installed Alchemy
beta.64 returned no value from `CredentialsStore.read`.

The bounded failure receipt is
`2026-08-09-orphan-inventory/failed-31313055223.json`; the full workflow log and
artifact remain at run `31313055223`. This does not establish Alchemy state,
Cloudflare/provider agreement, an orphan set, teardown, hosted behavior or any
mutation. The report-only automation register therefore remains
`not-established`. The next owner is the Alchemy beta.64 cache-ingress boundary:
repair or replace it with a supported non-mutating state-read path, then rerun
from a fresh candidate. The earlier failed receipts remain unchanged.

## 2026-08-09 report-only public state-client successor

Candidate `9dd779d70ccf661081856c3b5f07474b406db7ba` replaces the nested
`Cloudflare.state()` construction in the report-only inventory owner with
Alchemy beta.64's public `makeHttpStateStore` service. The cache is decoded once
through the existing Schema boundary; a nested process may decode the same
protected JSON credential only when it cannot see that cache. The state client
exposes the inventory's read operations only, and the mutation/bootstrap
workflows are unchanged.
The local `bun run check:docs-deployment-inventory` proof returned
`state-provider-agree`, state-store version `7`, one `prod` stage and one
provider Worker. No credential value is retained.

The exact hosted successor run `31315231020` checked out this candidate but
remained queued without a runner or pending environment request and was
cancelled after the bounded wait. Its cancellation receipt is
`2026-08-09-orphan-inventory/cancelled-31315231020.json`. This supersedes the
cache-ingress repair as the current implementation owner, but it does not
establish hosted state/provider agreement; the report-only automation register
remains `not-established` and scheduled orphan detection remains inconclusive.

## 2026-08-09 report-only hosted successor

Candidate `70be77e64c93d20cd82c5e02e33db9c92a94f0d7` passed the protected
`github-actions-report-only` workflow in run `31316752464`. Cache materialization
and its names-only shape check passed, and the nested inventory command used the
bounded protected-JSON fallback when its process could not see the home-relative
cache. The Schema-decoded report returned `state-provider-agree`, state-store
version `7`, one `prod` stage, one matching Worker, no Preview stages and no
orphan candidates; the read-only artifact was uploaded successfully.

The claim-matched receipt is
`2026-08-09-orphan-inventory/report-31316752464.json`. This proves the exact
branch-bound report-only read and no mutation, not hosted application behavior,
deployment/version identity, teardown, rollback or future availability. The
automation register remains `not-established` until the reviewed workflow runs
from the default branch source; DCD-004 and DCD-005 therefore remain open.

## 2026-08-10 current candidate hosted epoch

The current b59e4ee candidate has separate dated Preview and Production
evidence. Preview `pr-15` includes equal plan/replan, Alchemy and Cloudflare
readback, hosted HTTP/browser/accessibility/console/cache-header proof and one
desktop/mobile screenshot pair under
`2026-08-10-preview-pr-15/`. The protected teardown run `31318663989` proves
the exact stage and former workers.dev URL absent. Because teardown executes
reviewed default-branch code, `teardown-workflow-b59e4ee.json` keeps the removed
candidate and reviewed implementation SHA as distinct identities.

Production uses fixed `prod` and retains the final b59e4ee deployment/readback,
hosted proof and screenshot pair under `2026-08-10-production-prod/`. The
`rollback/` directory retains the normal source-bound eafeaad redeploy,
provider/version readback, hosted proof and screenshot pair. The final
Production URL is the provider workers.dev URL; custom-domain, DNS, paid-plan,
release, publication and byte-promotion claims remain outside this evidence
epoch.

Protected report-only run `31319845724` passed for the open branch candidate and
returned state/provider agreement for one prod stage and Worker with no Preview
orphan. The wrapper receipt is
`2026-08-09-orphan-inventory/report-31319845724.json`; it remains branch-bound
until the reviewed default-branch workflow source is read back. No secret value
is retained in any evidence file.

## 2026-08-10 current default-branch Preview epoch

Reviewed default-branch SHA `94392cc57c7328525110a7e992c04d4dfc1eebff`
planned and deployed candidate `c602593b4e23e784a6c9e2b912c3084dcfc9b9f3`
for deterministic `pr-23`. Plan `31336277416` and deploy `31336358628` bound
the accepted/equal-replan digest, account/state, configuration,
deployment-input and lockfile identities. The successful deploy read back the
Worker, deployment/version transition and workers.dev URL, then passed the
hosted HTTP, SSR/assets, server-function, 404, hydration/navigation,
accessibility, cache/header, console and desktop/mobile screenshot checks.
The reconciler `31336453638` API-read the completed main workflow and retained
the exact workflow input/run, provider, hosted and screenshot artifact at
`https://github.com/crcorbett/taxkit/actions/runs/31336453638`. This is a
current Preview observation; it is not a Production, teardown, rollback,
custom-domain, DNS, publication or aggregate automation-establishment claim.

The PR-close teardown `31335980866` read back state/provider agreement and the
two expected delete actions for `pr-23`, but the pinned Alchemy beta.64
`destroy --dry-run` returned exit 1 with empty stderr. No destroy was attempted
and no absence receipt exists; the reconciler `31336548279` failed closed and
the Worker remains present. The earlier hosted-harness failure
`31336102494` and cancelled duplicate teardown dispatch `31336476804` remain
disconfirming/non-mutating history. Production and rollback were not attempted
after this stop. No secret value is retained in any evidence file.

## 2026-08-10 current main-sourced Preview promotion

After the merge of the reviewed workflow correction at default-branch SHA
`bc2ac82f48cce67a6ee5b1b6caf9e8903bf9c182`, Preview candidate
`cbcb86878379cc2a126a8e48bee256aa33096c79` was planned as deterministic
`pr-24`. Plan run `31337945701` produced the update projection and accepted
digest `1a9492fb7a656ddab44565fcc224e502d56dbd04287a31d53aefdb343af0278f`.
Deploy run `31338052297` completed the equal replan, provider/state readback and
hosted HTTP/browser contract. It binds deployment
`bd7c847d-150a-4f27-8d12-e5f5549f0186`, version
`e763909b-22ca-4ef2-a6f9-3de826291526`, prior version
`6b831c22-9f93-47a9-b0da-8227b56017a9`, stage `pr-24`, account/state identity
and the provider workers.dev URL. Hosted diagnostics were empty; SSR/assets,
server-function transport, malformed input, 404, no-reload navigation,
accessibility, cache/header, console and module-scoped runtime checks passed.
The retained desktop/mobile PNG digests are
`128c8f300d1911111fd3fc22a89289efc6961df29582421a53bd77e9ff8c82cf` and
`9ebc4108397d334eedff97d8ae79ddc103ee61a62bf87a995becf3715b32c945`.

The completion reconciler `31338154055` API-read the completed `main` workflow
and retained the exact workflow input/run, plan, provider, hosted and screenshot
artifacts. The promoted receipt is
`2026-08-10-preview-pr-24/workflow-receipt-31338052297.json`; it is the first
current default-branch positive Preview automation receipt and advances only
`docs-preview-delivery`. The `pr-24` teardown attempt
`31337384729` remains a failed/non-claim beta.64 dry-run with no destroy or
absence readback, so Production, rollback, teardown and report-only automation
entries remain unestablished. No secret value is retained in this evidence
epoch.

## 2026-08-10 current main-sourced Production and report-only epoch

The reviewed workflow source for this epoch is
`fef1dfca39d56d28b1f5956e4604af1cc659672b`, with accepted candidate
`cbcb86878379cc2a126a8e48bee256aa33096c79`. Production plan run `31342982776`
and deploy run `31343083326` were reconciled by `31343175981`. A normal
source-bound rollback run `31343236244` was reconciled by `31343339747`, and
final redeploy run `31343392260` was reconciled by `31343498809`. The durable
Production outer receipt is
`2026-08-10-production-prod-fef1dfc/workflow-receipt-31343392260.json`; the
nested rollback route retains the prior/current provider version transition,
accepted Preview recovery identity and its own hosted/screenshot proof.

The Production receipt binds account `f9f94270a4a5af8af7010d891020922d`, state
store `cloudflare-http`, fixed `prod` stage, Worker
`taxkitdocscloudflare-docswebsite-prod-ujphggiaxw5ryjev`, provider workers.dev
URL, deployment/version identities, plan/configuration/deployment-input and
lockfile digests. Hosted proof passed SSR/assets, content types and cache
headers, server-function transport and malformed input, direct/client 404,
hydration/navigation, accessibility, console cleanliness, runtime reuse and
bounded desktop/mobile screenshots. The image digests are
`128c8f300d1911111fd3fc22a89289efc6961df29582421a53bd77e9ff8c82cf` and
`9ebc4108397d334eedff97d8ae79ddc103ee61a62bf87a995becf3715b32c945`.
This is a dated workers.dev observation, not a custom-domain, DNS, billing,
release, publication, byte-promotion or future-state claim.

Two earlier Production attempts in the same source epoch (`31341748556` and
`31342478741`) reached provider mutation but failed their hosted proof
preconditions (rollback identity and accepted Preview identity respectively).
They are retained as failed workflow observations and are not promoted; the
source-bound rollback and final redeploy receipts above are the accepted
recovery chain.

The reviewed default-branch report-only run `31344401196` (reconciler
`31344453019`) used source
`53d93648a7b36713055d3edf69beb681c058386f` after the report credential wiring
correction. Its promoted outer receipt is
`2026-08-10-orphan-inventory-main-53d936/workflow-receipt-31344401196.json`.
The dedicated report proves state/provider agreement, an empty open-PR set,
`mutationCapability: none` and `automaticDeletion: prohibited`; it remains a
reviewer-gated/manual report-only observation, not unattended deletion
authority.

Preview teardown runs `31343533595` and `31343687718` are retained as failed,
non-claim observations: the exact stage/Worker inventory and two-resource
delete projection were read, but the pinned beta.64 dry-run returned non-zero
before destroy. No Preview absence receipt exists, and the Worker remains
present. The automation register consequently establishes Preview,
Production and report-only only; teardown and DCD-005 closeout remain open.

## 2026-08-10 current main-sourced Preview teardown promotion

Reviewed default-branch SHA `31212c48b873113c1bf854fd648f14562bd2fb96`
ran the exact closed-PR #24 teardown in workflow run `31350160353`; the
completion reconciler `31350243582` API-read the completed source run and its
matching artifact. The promoted receipt is
`2026-08-10-preview-teardown-pr-24/workflow-receipt-31350160353.json`.

The workflow performed two equal `preview-destroy` projections containing only
`DocsBuild` and `DocsWebsite` deletes, then read back state/provider agreement
before and after the destroy. The postcondition read back no `pr-24` state
stage, no `pr-24` Worker, and the former provider workers.dev URL as HTTP 404.
The receipt binds the exact candidate, reviewed workflow/run/input identities,
account, `cloudflare-http` state store, stage, plan/config/deployment/lockfile
digests and former Worker identity. Attempts and stderr metadata are retained
in the hosted artifact; no secret value is retained here.

This advances the exact `docs-preview-teardown` automation entry and closes
the prior beta.64 dry-run stop for this dated epoch. The earlier failed runs
`31343533595`, `31343687718`, `31347119364`, `31347842707`, `31348538146` and
`31349508145` remain immutable non-claim observations. The receipt does not
establish Preview availability, Production, rollback, custom-domain/DNS,
billing, release, publication, byte promotion or future provider state.

## 2026-08-10 local parity and verification exception

The local Cloudflare/workerd bridge-retirement receipt
`2026-08-10-local-bridge-retirement/receipt.json` is bound to committed
candidate `0791de2206fd241ead69e144742f48b6daa4318d`. The canonical
`bun run --filter=docs test:cloudflare-built` command passed all retained Nitro
parity oracles and the receipt records no provider, hosted, public, release or
domain claim.

The same candidate's exact `bun run verification` reached all preceding
repository, documentation, runbook, deployment, lint, format, skill, Quality,
Knip and type owners, then failed only HGI-205's fixed-port release-boundary
fixture because unrelated process PID `30035` owned `127.0.0.1:4173`. The
failure output was `Failed to start server. Is port 4173 in use?` followed by
the expected health timeout. No TaxKit file or provider state changed. This
dated note is an owner-bound environment baseline exception, not a full-green
verification claim; rerun the exact command after that process releases the
port before any stricter all-green closure.

The fresh independent review is retained at
`2026-08-10-local-bridge-retirement/independent-review-32ea78e.json`. It
confirms DCD-004 readiness and local parity, but records DCD-005 as
`not-ready` until the exact verification result and Cooper's lifecycle
acceptance are reconciled. It is a review receipt, not provider or publication
proof.

## 2026-08-10 successor verification readback (`e43afa8`)

The documentation-only successor candidate
`e43afa814dd431fdd1f946c309dafc99c31e07d4` reran the exact `bun run
verification` command. Every owner before HGI-205 passed; HGI-205 then failed
because unrelated PID `30035` from another checkout owned
`127.0.0.1:4173`, producing `Failed to start server. Is port 4173 in use?`
and the expected `/api/health` timeout. This is the exact current candidate's
non-green baseline result, not a waived or successful verification claim.

The exact candidate's GitHub Quality push run `31352338774` and pull-request
run `31352341451` both succeeded. Remote Quality and focused deployment gates
therefore pass, while DCD-005 remains open pending either release of the fixed
port and a green exact-candidate verification rerun or Cooper's explicit
acceptance of this named baseline exception, followed by lifecycle acceptance
and completed-plan archival. No process was terminated and no provider state or
credential was changed by this readback.

## 2026-08-10 current-head verification readback (`aa1bda1`)

The current evidence-only successor
`aa1bda1d4a2f47d796d095f86987eef1f3e799ff` reran `bun run verification` on
the exact current head. All owners before HGI-205 passed; HGI-205 failed with
the same unrelated PID `30035` holding `127.0.0.1:4173`, reporting `Failed to
start server. Is port 4173 in use?` and the health timeout. This confirms an
exact-current non-green baseline, not a successful or waived verification.

Quality push run `31352729103` and pull-request run `31352732147` both passed
for `aa1bda1`. DCD-005 therefore remains open pending release of the fixed port
and a green rerun, or Cooper's explicit acceptance of this exact-candidate
baseline exception, followed by lifecycle acceptance and completed-plan
archival. No process was terminated and no provider state changed.

## 2026-08-10 HGI-205 loopback isolation and verification

Commit `7bccb73a19d43b69610374cae6e8e3ff00d74790` adds a bounded
`TAXKIT_API_SMOKE_PORT` override to the API smoke owner, decodes it with the
existing API configuration Schema, preserves `4173` as the default and makes
the isolated HGI-205 fixture reserve an ephemeral loopback port. The API smoke
command was exercised on an alternate port with all public routes and the
external consumer passing.

The exact committed candidate's `bun run verification` passed every owner,
including HGI-205 (`12` tests, `88` expectations), production Knip and all
`23/23` Turbo type tasks. The prior PID `30035`/4173 failure remains immutable
historical evidence and is no longer a current verification blocker. This
correction changes only test-harness port isolation and its README/task
ownership; it makes no provider, credential, DNS, publication or API-route
claim. DCD-005 now awaits only fresh independent review, Cooper's lifecycle
acceptance and completed-plan archival.

## 2026-08-10 exact closeout candidate and independent review

The exact current closeout candidate is
`7deaf12d6168720493295801805d4e901d18ddeb`. It is a documentation/evidence
successor after the bounded HGI-205 loopback correction; deployment inputs,
lock/config/build identities and provider resources are unchanged. The exact
`bun run verification` command passed, and GitHub Quality push run
`31354493714` plus pull-request run `31354495495` both completed successfully
for this head.

The fresh read-only independent review is retained at
`2026-08-10-local-bridge-retirement/independent-review-7deaf12.json`. It
confirms DCD-004's four established automation receipts and five controls,
the local Cloudflare parity/retirement audit, focused gates and exact
verification, with no material implementation or proof-owner blocker. The
prior `independent-review-32ea78e.json` remains immutable historical evidence
for the earlier `not-ready` candidate. At that review point DCD-005 was still
`in_progress` pending lifecycle acceptance and archival; the successor
`c0cd1a9` acceptance is recorded below. This receipt does not add a new
provider, hosted, public-availability, custom-domain, DNS, release or
publication claim.

## 2026-08-10 DCD-005 lifecycle acceptance

The product-owner lifecycle acceptance for closeout candidate `c0cd1a9` is
retained at
`2026-08-10-local-bridge-retirement/lifecycle-acceptance-c0cd1a9.json`.
It accepts the completed DCD-005 implementation and active-plan archival after
exact verification, green remote Quality, fresh independent review, and
claim-matched DCD-004 receipts. It preserves the exact source/candidate
identities of existing provider and hosted evidence and adds no new deployment
or public-availability claim.

## 2026-08-20 failed Production hosted proof

Production deploy run `32296155483` mutated and read back the fixed `prod`
Worker for candidate `305bed06140407488986008469e78809251c88eb`. The sanitised
provider observation is
`2026-08-20-production-prod-305bed0/provider-readback-32296155483.json`.
The hosted browser proof failed with React hydration error `#418`, so this
directory deliberately contains no accepted hosted proof or screenshot
receipt. The failure observation records the exact workflow and provider
identities plus the non-claims. The next candidate's shared Fumadocs
`buildStart` correction must earn fresh Preview and Production receipts; this
failed observation remains unchanged history.

## 2026-08-20 native Alchemy candidate `7a23bf3`

The corrected native Alchemy candidate
`7a23bf3eb286a44f2e06775750105ffe9cc09d3e` was accepted by the merged
default-branch workflows at `72dea00022e3d196d7021ec0b677ea9631d6a4d5`.
Preview plan/deploy run `32301004640` and `32301180775` used stage `pr-51`,
accepted plan digest
`268d59fe8593e9ab0e35a576f03796cd3ad84427a10ad4d7cc10f66385ff944f`, and
read back Worker deployment `7c626c74-825a-45f4-b526-4ad8ff7e38cf`, version
`b6adab26-b5a2-4cb3-8d74-06603c729f0b` and its workers.dev URL. Hosted proof
passed with zero diagnostics, no document reload on client navigation, valid
server-function transport and malformed-input rejection, direct 404 handling,
accessibility/focus checks, cache-header checks and reviewed desktop/mobile
screenshots. The claim-matched receipts and images are in
`2026-08-20-preview-pr-51/`.

Production plan/deploy run `32301473695` and `32301629287` consumed that exact
Preview receipt, used fixed stage `prod`, and read back Worker deployment
`1f79f9c3-a326-408c-a0e1-85b439070793`, version
`e951d0cf-a5f4-48e7-aebf-03230562a980` and the fixed workers.dev URL. Hosted
proof passed with zero diagnostics and the same browser, transport,
accessibility and screenshot contract. The fixed Worker had previous version
`473a6e65-06f0-462b-8dc8-df34f8bc5ed2`; the recovery identity is
`production-32301629287`. The claim-matched receipts and images are in
`2026-08-20-production-prod-7a23bf3/`.

After Production acceptance, exact-stage teardown run `32300321743` removed
`pr-51` and manual current-workflow teardown run `32302090160` removed the
older accepted `pr-50`. Equal destroy plans, state readback and provider
readback prove each named stage and former Worker absent. The earlier
PR-close `pr-50` run `32295516940` is retained as a pre-mutation workflow-source
stop because it used the superseded default-branch revision; it made no
provider change. The successful absence receipts are in
`2026-08-20-preview-teardown-pr-51/` and
`2026-08-20-preview-teardown-pr-50/`.

This epoch proves only the recorded workers.dev observations and exact-stage
cleanup. It does not establish a custom domain, DNS, package publication,
release, byte promotion, or a permanent availability guarantee.

## 2026-08-20 final remote Quality readback and checkout reconciliation

PR #52 carried the documentation closeout at exact head
`1cbcf2d119527db65868c2fc42d196f1d31c606f` and merged to `main` as
`a86994a5e8cec1ba6220620e244afdc0d29eaed1`. Pull-request Quality run
`32304045477` completed successfully, including Chromium installation,
`check:quality-workflow` and `release:check -- --ci`. The duplicate
push-triggered Quality run `32304009721` completed as cancelled during
`playwright install --with-deps chromium`, with later steps skipped. It is a
bounded runner limitation and not a successful check or a code-failure claim;
the completed PR Quality success is the admission result.

Post-merge `main` Quality run `32305069327` passed for
`a86994a5e8cec1ba6220620e244afdc0d29eaed1`. Exact Preview teardown
`32305072590` and workflow-receipt reconciliation `32305214604` also passed.
The original checkout was fast-forwarded to the same remote SHA without a
reset or discard, and its pre-reconciliation dirty candidate remains
preserved in a local stash. This readback adds no provider, DNS, custom-domain,
publication, release, byte-promotion or permanent-availability claim.

## 2026-08-20 shared-environment automatic no-op promotion

PR #60 merged the machine-report and reconciler correction as
`34b065b6bbab695234628dffb7925d59fb6eaaee`. Automatic PR-close teardown run
`32367035323` started without approval, retained two equal no-op plans for
exact stage `pr-60`, and proved Alchemy state-stage and Cloudflare Worker
absence. Reconciliation run `32367125582` validated the completed source run.
The promoted evidence is in `2026-08-20-preview-teardown-pr-60/`.

The unused teardown approval environment was removed only after that proof.
The terminal receipt at
`../../documentation-audit/automatic-preview-teardown/APT-003-automatic-noop-and-retirement.json`
retains artifact identity, environment-list absence, unchanged Preview secret
names and unchanged Production reviewer protection. The accepted no-op proves
exact `pr-60` absence only; it does not claim deletion of a live Worker,
absence of other Preview stages, Production mutation, DNS, release or
publication.

## 2026-08-21 native Alchemy hard-cutover state reconciliation

The separately authorised Preview state reconciliation processed the five exact
legacy stages found by read-only inventory: `pr-15`, `pr-16`, `pr-17`, `pr-18`
and `pr-23`. Each recorded target retained its native `DocsWebsite` Worker;
the final sanitised inventory in run `32441944207` observed zero legacy stages
and state/provider agreement. The durable receipt is
`2026-08-21-native-alchemy-hard-cutover/legacy-state-cutover.json`.

The first `pr-15` apply had an incomplete same-run receipt after Alchemy
reported the deletion. The corrected `pr-16` pre-inventory confirmed the
resulting `pr-15` state before the remaining stages were processed. This is
provider/state observation for the recorded Preview operation only. It does
not claim a Production deployment or cutover, custom-domain/DNS, publication,
permanent availability, hosted proof or unrelated provider resources.

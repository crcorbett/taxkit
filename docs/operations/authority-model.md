---
document_type: authority-model
lifecycle: current
authority: canonical
owner: taxkit-authority-model-owner
last_reviewed: 2026-10-07
review_trigger: identity, release, Git, registry, deployment, provider, credential, or recovery change
---

# TaxKit operational authority

Capability is not authority. Repository access or a runnable command does not
identify the principal permitted to perform a consequential operation. Each
run must bind identity, operation, resource, environment, approval boundary,
duration or revocation, audit receipt, rollback precondition, and escalation.

The repository carries no standing authority for the operations below. Their
principal is `unknown`, so their status is `unknown-stop`:

| Operation | Principal | Status | Required authority receipt |
| --- | --- | --- | --- |
| `versioning` | `unknown` | `unknown-stop` | Named principal; exact package/version train; local checkout; approval scope and duration; before/after manifest receipt; identified revert target. |
| `commit` | `unknown` | `unknown-stop` | Named principal; exact paths, branch and message; approval duration; commit/tree readback; accepted semantic scope and revert owner. |
| `push` | `unknown` | `unknown-stop` | Named principal; remote, branch and expected commit; approval duration; remote SHA readback; prior remote state and recovery authority. |
| `tag` | `unknown` | `unknown-stop` | Named principal; provider, commit and immutable tag; approval duration; provider readback; provider-specific recovery. |
| `release` | `unknown` | `unknown-stop` | Named principal; provider, target commit and hosted release identity; approval duration; release readback; provider-specific recovery. |
| `registry-publication` | `unknown` | `unknown-stop` | Named principal; registry and exact package/version set; credential expiry/revocation; registry readback; deprecation/recovery plan. |
| `deployment` | `unknown` | `unknown-stop` | Named principal; provider-specific app/infrastructure target; environment and duration; provider/runtime readback; tested rollback and reconciliation. |
| `provider-access` | `unknown` | `unknown-stop` | Named principal and identity; exact provider operation/resource/environment; credential duration/revocation; provider receipt; provider-specific recovery. |
| `recovery-mutation` | `unknown` | `unknown-stop` | Named principal; exact recovery target/environment/operation; approval duration; pre/post identity; identified rollback artifacts. |

Read-only local diagnosis and static validation may proceed within the user's
stated task. When any required field is absent, stop before the operation and
escalate to the requesting repository owner. Never infer authority from prior
runs, tool capability, credentials being present, or evidence that a different
principal acted earlier.

The exact machine-checked records live in
`tools/documentation/runbook-contract.json`. That sidecar and this table must
agree; neither grants authority. Provider/registry/deployment claims require
current target-system readback by the authorized principal.

## Current old-docs retirement boundary

Native version-three plan preparation names `TaxKitAppsCloudflare`, the exact
account and Production zone, and the retained zone/settings plus app resources.
Preview omits Production DNS. The existing `cf` default profile supplied the
separately authorised 7 October GETs without credential creation. That read
capability does not authorise a native cloud plan's bootstrap effects, state
writes, domain attachment, apply, credential change or rollback. Checked
native source identities establish only the checked tracked-file snapshot.
They exclude provider state, environment, generated/dependency bytes and the
origin of supplied plan text. They do not grant bootstrap, plan or apply approval.
The [deployment runbook](../runbooks/docs-deployment.md) owns the pending native
procedure; local proof and old receipts grant no new operation authority.

Cooper's 7 October direction subsequently authorises native Preview and
Production deployments from this Mac. The active clean-slate plan records that
new authority; it does not broaden credentials, authorise unrelated resources or
permit a shared-store upgrade. Bind each exact candidate, stage, account,
resource graph, existing credential, plan, recovery and readback before apply.
The native bridge may resolve the existing TaxKit repository-scoped CLI login in
memory; it does not change the retired writer's custody contract or store a new
credential. Historical approvals below remain attached to their original work.

Cooper then separately approved adding `Zone DNS Settings Read`,
`Workers Routes Write` and `Dynamic URL Redirects Write` to the existing
Production token `taxkit-docs-production-20260831`, identity
`35bf3c96b36551ea663e62e5739b68e9`, only for zone
`15103853342ab9f18f7894b7fae39c39`. Independent readback preserved its full
earlier account policy, name, active status, issue date and 18 November expiry.
The token value, Preview token and Doppler configuration were not changed.
The [dated cloud receipt](../documentation-audit/clean-slate-foundation/2026-10-07-native-cloud-preparation.json)
records that exact change, its policy restoration procedure, both authorised
native applies and provider/public readback. It creates no standing authority
for further credential changes, shared-store upgrades or unrelated writes.

The current checkout retires the old docs workspace, writer workflows and
Alchemy Stack entry. The [retention manifest](../documentation-audit/clean-slate-foundation/2026-10-07-docs-retirement-manifest.json)
preserves exact original sources and dated provider recovery identities.
Historical deployment, credential and reconciliation approvals below remain
attached to their original operations. They do not authorise resuming a retired
writer, changing an old resource ID, deleting hosted resources or applying the
native API/Website graph. DEV-81 must supply its own approved operation and
readback. Repository retirement changes no provider or credential state.

## 2026-08-28 — Doppler repository authority and provider stop

The active Doppler configuration governance SPEC authorises repository
research, documentation, workflow/tool implementation, local verification,
coherent commits and pull-request/merge work after required checks. It does not
authorise creating, changing, rotating, revoking or deleting a Doppler project,
config, service token or secret, or a GitHub or Cloudflare credential.

The later dated receipts record the separately approved bootstrap and hard
cutover. They do not create standing credential authority. Any future token,
bridge, config or provider mutation must still name Cooper or another approved
TaxKit operator, the exact config and environment, least privilege, expiry,
rollback, revocation owner and names-only readback. Preview and Production are
separate operations when their authority differs.

Do not retrieve or record a value. A locally green workflow proves repository
shape only; it does not prove a Doppler config, bridge, hosted run or provider
result.

## 2026-08-31 — Doppler hard cutover

Cooper approved removal of the old direct credential paths as a hard cutover.
The operation deleted repository `TURBO_TOKEN` and `TURBO_TEAM`, deleted the
direct Cloudflare pair from the Preview and Production GitHub environments,
and revoked the eight old TaxKit CI inventory/mutation Cloudflare tokens dated
4 or 9 August 2026. Names-only readback found only the repository
`DOPPLER_CI_TOKEN`, the two environment `DOPPLER_PROVIDER_TOKEN` bridges and
the three active TaxKit Cloudflare tokens dated 31 August 2026.

Recovery must stay Doppler-only. Replace and prove the narrow token for the
same config, update only its matching bridge, read back metadata and then
revoke the failed token. Do not recreate a direct Turbo or Cloudflare GitHub
value. The sanitised receipt is
[`../evidence/deployments/2026-08-31-doppler-hard-cutover/receipt.json`](../evidence/deployments/2026-08-31-doppler-hard-cutover/receipt.json).
It grants no deployment, DNS, publication, package release or unrelated
provider authority.

## 2026-08-20 — Vercel Remote Cache qualification

TCC-001 has read-only authority to inspect the TaxKit repository, GitHub
Actions metadata and the currently authenticated Vercel identity. The dated
receipt is
[`../documentation-audit/ci-cache-efficiency/TCC-001-read-only-authority.json`](../documentation-audit/ci-cache-efficiency/TCC-001-read-only-authority.json).
It proves that GitHub and Vercel both identified the current user as
`crcorbett`, and that Vercel returned two possible teams. It does not choose a
team or grant cache mutation authority.

The initial readback found no repository-level or environment-level GitHub
Actions secret or variable matching `TURBO`, `VERCEL` or `CACHE`. The successor
authority below now replaces that initial stop only for the named cache work.
Existing deployment credentials and their historical authority still do not
grant this separate cache authority.

Cooper's 2026-08-20 successor approval names the complete active SPEC as the
bounded implementation goal and selects the `cooper-corbetts-projects` Hobby
team. The executable envelope is
[`../documentation-audit/ci-cache-efficiency/TCC-001-cache-authority.json`](../documentation-audit/ci-cache-efficiency/TCC-001-cache-authority.json).
It permits the dedicated TaxKit cache project and expiring cache credential,
the named GitHub Actions secrets/variables and environments, workflow cache
configuration, hosted verification and cache-only rollback needed by TCC-001
through TCC-005. It excludes deployment or publication created merely to host
the cache, unrelated Vercel resources, token disclosure, merge, release,
package publication, DNS and destructive provider cleanup outside the recorded
cache rollback.

Under that envelope, Vercel read back team
`team_1LX7ZujbijowTv8J9k0aU7nD`, the enabled team Remote Cache, and empty
project `prj_5AOSvL1mowN48x15MnwhvRWPZc9k`. The first project-scoped token
`taxkit-turbo-ci-2026-08-20` could not authenticate external CI Remote Cache
and was revoked on 2026-08-20 after replacement readback. The current token
`taxkit-turbo-ci-team-2026-08-20` is scoped to all projects in the selected
team and expires on 2026-11-18. GitHub reads back
`TURBO_TEAM=cooper-corbetts-projects` and the encrypted `TURBO_TOKEN` secret
name, last updated at `2026-08-20T02:31:29Z`. 1Password reads back the renamed
item `taxkit-turbo-ci-team-2026-08-20` in the Corbett Family `taxkit` vault.
The bearer was transferred directly, no repository content records its value,
and the system clipboard was cleared. Hosted pull-request run `32323001841`,
attempt 2, then reported Remote Cache enabled under read-only mode. PR #55
merged with Cooper's explicit approval. Main run `32337825523` then wrote and
reused the same eligible task hash, while pull-request run `32337381827`
reused it under `remote:r`. This accepts TCC-002 under the same expiry,
revocation and rollback boundary; it does not establish deployment,
publication or public availability.

Cooper's 2026-08-20 successor approval expands only the existing cache-token
use: token-bearing same-repository pull requests may now write deterministic
Turbo task artifacts and logs as well as read them. This accepts that trusted
same-repository pull-request code can access the existing team-scoped bearer.
Fork pull requests remain outside the authority, receive no repository secret
under the `pull_request` trigger and use local fallback. The successor creates
no token, project, deployment or publication authority. Rollback restores
pull-request remote read-only mode; suspected disclosure follows the existing
revocation owner and procedure.

TCC-003 uses the same approved repository-workflow authority for event-scoped
GitHub dependency caches. Pull requests and `main` use distinct Bun-package and
Playwright-Chromium keys, with GitHub ref scoping as another boundary. The
workflow can restore and save those cache entries only; it retains
`contents: read`, frozen install, Chromium system-package installation and the
complete Quality graph. Cache operations are non-fatal. This grants no GitHub
secret administration, deployment, publication, release or unrelated cache
deletion authority.

TCC-004 applies that cache-only authority to the reviewed docs Preview,
Production, exact-stage teardown and completed-run receipt workflows. They may
read and write the named Vercel Remote Cache and event-scoped Bun package
caches; the three browser workflows may also read and write their event-scoped
Chromium caches. This does not add Cloudflare, Alchemy, mutation, artifact,
hosted-proof or receipt-promotion authority. Those boundaries remain live under
the separate dated docs deployment envelope below. Cache-only rollback removes
the remote bindings and restore/save steps while preserving every install,
candidate, plan, provider and receipt command.

### 2026-08-20 — shared dependency-cache successor

Cooper approved the active Shared Dependency Cache and Checkout Upgrade SPEC.
It permits repository workflow, policy and documentation changes that remove
event name from Bun-package and Chromium keys. The paths remain limited to
public package downloads and browser binaries. GitHub may serve a matching
default-branch cache to a pull request, while its ref scope keeps pull-request
writes unavailable to `main` and sibling pull requests. Fork-readable caches
must never contain secrets, credentials, `node_modules`, provider state or
receipts. Frozen Bun installation, browser installation and every owning
command remain live. This successor changes cache lookup only; it adds no
provider, deployment, teardown, release or publication authority.

The same approval permits replacing all five exact checkout v4.2.0 pins with
the verified checkout v7.0.1 commit. Checkout only places reviewed Git source
in the runner workspace. Bun remains the repository runtime and package
manager. Hosted Quality proof must establish runner compatibility before
closeout; local policy proof cannot establish that external result.

### 2026-08-20 — automatic Preview teardown admission

Cooper approved automatic same-repository PR-close cleanup and rejected a new
manual-recovery environment. The repository change may bind Preview deploy and
exact-stage teardown to `taxkit-docs-preview`, remove that environment's
required reviewer rule, update the exact current automation owners and retain
fresh GitHub readback. The environment already contains only
`CLOUDFLARE_ACCOUNT_ID` and `CLOUDFLARE_API_TOKEN`; no value may enter the
checkout or evidence.

The automatic authority remains limited to reviewed default-branch code, a
closed same-repository PR against `main`, exact stage `pr-N`, the
`TaxKitDocsCloudflare/pr-N/DocsWebsite` resource, two equal destroy plans,
provider/state freshness and absence readback. Production, DNS, custom domains,
credentials, unrelated Workers, orphan deletion, release and publication stay
excluded. Production retains its required reviewer.

The accepted GitHub mutation read back zero Preview protection rules and the
unchanged secret names `CLOUDFLARE_ACCOUNT_ID` and `CLOUDFLARE_API_TOKEN`.
Production still requires `crcorbett`. The sanitized receipt is
[`../documentation-audit/automatic-preview-teardown/APT-001-github-environment-readback.json`](../documentation-audit/automatic-preview-teardown/APT-001-github-environment-readback.json).
Rollback restores the Preview reviewer rule and the former teardown environment
binding. Corrected automatic run `32367035323` and reconciliation run
`32367125582` produced accepted exact-`pr-60` no-op and absence receipts from
reviewed `main`. The unused environment was then removed and a non-creating
repository environment-list readback proved its absence. Preview retained its
two secret names and no reviewer; Production retained `crcorbett`. The run did
not delete a live Worker because `pr-60` was already absent.

### 2026-08-24 — Alchemy structure correction authority

Cooper accepted `ADS-001` through `ADS-004` as one repository implementation
goal. The repository authority includes coherent commits, hosted Quality, pull
request delivery and merge after the accepted checks pass. Provider authority
is narrower: it permits only the existing docs Preview plan/bootstrap/state and
provider readback needed for real beta.64 evidence. Production deploy or
rollback, DNS or custom-domain work, credential creation or rotation, broad
Cloudflare cleanup, publication and unrelated provider mutation remain
excluded.

The Preview and Production workflow principals may expose
`CLOUDFLARE_API_TOKEN` only to their exact bootstrap, plan and replan/apply
steps. The fixed Production plan, deploy and rollback operations share one
non-cancellable `prod` group; Preview and teardown retain their exact `pr-N`
group. A GitHub concurrency group does not bind a manual CLI process. Normal
manual mutation must stop while the matching workflow is queued or running.
Break-glass work requires a separately authorised sole-writer window, exact
stage and candidate preflight, retained result, and state/provider readback.
Interruption during bootstrap or mutation leaves the provider result unknown;
no retry is authorised until readback classifies that state.

## Dated TaxKit docs deployment envelope

The generic table remains the fail-closed default. Cooper's bounded 2026-07-30
approval is a dated exception only for this implementation goal and the exact
TaxKit docs resources in
`docs/evidence/deployments/2026-07-30-preview-preflight/authority-preflight.json`.
The approving principal is Cooper; the executing principal is the authorized
implementation thread using existing authenticated identities. The receipt
separates credential/account preflight, state bootstrap/adoption, Preview
plan/deploy/destroy, Production plan/deploy, normal rollback/redeploy and
Alchemy reconciliation.

That envelope expires on goal completion, explicit revocation or any
identity/safety mismatch. Cooper's successor Git exception is decoded from
`docs/evidence/deployments/2026-07-30-preview-preflight/git-authority.json`.
It admits one exact `codex/` branch, push, draft pull request and later coherent
accepted-slice pushes. Merge, force-push, branch deletion, conversion to ready,
credential disclosure, rotation or scope expansion, custom-domain/DNS work,
unrelated resources, publication and release remain excluded. Readback belongs
to the operation owner and must retain sanitized Git, account, stage, resource,
state, Worker/deployment/version, URL and postcondition identities.

The original preflight receipt remains a failed historical observation: the
exact local commit was not then a GitHub trusted PR head. The successor
authority permitted the narrow Git recovery. The Schema-decoded
`git-readback.json` receipt now establishes draft PR `#1`, exact head
`669a8f3bc484ddf5975f40940c8bdc14e6f1ba11` and deterministic stage `pr-1`;
it establishes no provider state.

The accepted DCD-002 requalification chain under
`docs/evidence/deployments/2026-07-30-preview-pr-1/` binds candidate
`d9cb8945529fb72158e59ca0daf02a98e1e4de1a` to separate pre-deploy,
deploy/proof, pre-destroy and destroy/absence envelopes. The executing
credential had a broad existing scope set; receipts retain only its sorted
scope digest and required-capability decision, while authority remained
limited to the exact TaxKit two-resource plans. Provider and Alchemy readback
agreed before each mutation, and the final receipt proves the exact Preview
Worker and stage absent. This consumed no Production, rollback, DNS,
publication or broader reconciliation authority. The earlier `0d714e6…`
observation remains historical because it did not retain both pre-mutation
envelopes.

The DCD-003 Production and normal rollback chain under
`docs/evidence/deployments/2026-07-30-production-prod/` consumed only the
already approved fixed `prod` Worker/assets operations and narrow Alchemy
state. Each create/update used a fresh equal plan and immediate credential,
account, stage, provider and state preflight. The successor was independently
qualified in `pr-1` and that stage was removed before its Production update.
Normal rollback used the same source-bound deploy graph and retained the fixed
Worker URL and Alchemy instance while creating a new deployment/version.
Production destroy, direct provider-version selection, custom-domain/DNS work,
credential disclosure or scope expansion remain outside that consumed
envelope. The broad existing OAuth grant remains a capability limitation, not
broader authority.

The resumed 2026-08-02 authority readback is retained at
`docs/evidence/deployments/2026-08-02-authority-capability/receipt.json` and
binds the same approving and executing principals to the named TaxKit docs
resources. It permitted the dated manual Preview, teardown, Production and
source-bound rollback observations retained under the deployment-evidence
route. The readback still found no protected GitHub environment, Actions
secret or repository variable, and no narrow CI token identity. At that
historical capability boundary the four workflow records remained
`not-established`; manual provider receipts did not substitute for protected
workflow proof. The smallest later capability
gate is one account-scoped mutation credential for the three mutation
environments and one read-only credential for report-only inventory, each
with account/resource scope, expiry and revocation-owner readback before
secret attachment. No empty environment or broad OAuth profile may be stored
as a substitute.

### 2026-08-04 — CI credential capability readback

The secure provider connection now resolves account-owned permission groups and
has produced two distinct, time-bounded credentials for this TaxKit-only
implementation goal. The redacted success receipt is
`docs/evidence/deployments/2026-08-04-ci-capability/receipt.json`; it records
the account, resource scope, permission-group identities, expiry and Cooper's
revocation ownership without a token value. The mutation credential is limited
to Workers Scripts Write, Workers Observability Write and Secrets Store Write;
the report-only credential has only the corresponding Read groups. R2, route,
DNS, domain and unrelated provider permissions are not present.

The same receipt records reviewer protection and names-only secret readback for
`taxkit-docs-preview`, `taxkit-docs-production`,
`taxkit-docs-preview-teardown` and `github-actions-report-only`. The Executor
GitHub connector did not expose environment-secret administration, so the
authenticated repository-admin path was used; this is an implementation
observation, not a new standing authority. Secret values remain outside the
repository and the broad local OAuth profile remains excluded from CI.

The mutation workflows use the same narrow mutation identity for one explicit
control-plane preparation: the supported Alchemy login command persists only
the environment-method selector, then the Cloudflare bootstrap command
refreshes the account-matched `cloudflare-state-store` cache on the ephemeral
runner before plan or teardown readback. This is bounded state bootstrap/
adoption authority, not an additional application resource or a report-only
permission. The report-only workflow cannot call that command and remains
unestablished until its independent state/provider read boundary is proven.

This capability epoch clears only the credential/environment gate. The
automation register stays `not-established` until the workflow files are on
the default branch and a fresh exact-candidate run supplies provider/state,
hosted, screenshot, teardown and rollback receipts. Merge, custom-domain/DNS,
publication and unrelated resources remain separate exclusions.

### 2026-08-04 — successor implementation authority

Cooper's current approval extends this implementation goal to the named
workflow and provider operations, PR-ready conversion and merge of PR `#1`,
provided every operation remains bound to the exact TaxKit candidate, account,
stage, resource, protected environment and receipt contract. The first
default-branch Preview dispatch may use the merged PR head only as the bounded
workflow-registration bootstrap required by GitHub; later Preview dispatches
remain open trusted draft-PR operations. Teardown may record a no-op when the
exact stage is absent. Custom-domain/DNS, unrelated resources, publication,
release and credential disclosure or scope expansion remain outside this
approval. Existing historical authority receipts are unchanged.

### 2026-08-05 — default-branch workflow readback and report-only boundary

The reviewed workflow files are now on default branch
`1b6d36b765a5953f79b0932c127f01088603930f`. Under the already recorded
Cooper envelope, Preview plan/deploy (`30962576035`/`30962743727`), corrected
exact-stage teardown (`30964380634`/`30964525980`), PR-close absent-stage
teardown (`30966977503`), Production plan/deploy pairs
(`30964647432`/`30964781776`, `30965270740`/`30965398455`) and normal
rollback (`30965691430`/`30965797032`) read back only the named TaxKit docs
stages/resources. Their sanitized provider, state, hosted and screenshot
receipts are routed under `docs/evidence/deployments/2026-08-05-*`.

The report-only class has not crossed its authority boundary. Run
`30966300887` stopped before inventory because `GH_TOKEN` was not bound; after
the owner correction, `30967000841` reached deployment inventory but a
read-only Cloudflare credential could not derive Alchemy beta.64's HTTP
state-store bearer without the mutation-capable bootstrap path. A successor
workflow may materialize an account-matched
`ALCHEMY_STATE_STORE_CREDENTIALS_JSON` cache and invoke only the inventory
reader. Because beta.64's bearer is not cryptographically read-only, the
successor must retain an operational-read-only limitation, deny every state
write and provider mutation command, and prove that denial in its workflow
contract. No mutation or secret disclosure occurred in the failed epoch. The
deployment register remains `not-established` until a successor run retains
the complete read-only receipt; this is a capability boundary, not a license
to widen the Cloudflare principal.

### 2026-08-10 — current provider and report-only readback

The current authorized implementation epoch retains claim-matched Preview,
exact-stage teardown, fixed Production and normal source-bound rollback
receipts under `docs/evidence/deployments/2026-08-10-*`. The receipts bind the
TaxKit account, exact stage/resource, equal plan digest, Alchemy state, Worker,
deployment/version, workers.dev URL and hosted/screenshot postconditions. The
PR-close teardown receipt keeps its reviewed default-branch implementation SHA
separate from the removed candidate; this is a required authority distinction,
not a second deployment resource.

Protected report-only run `31319845724` passed with the separate read-only
Cloudflare token and protected state-store credential, but its workflow source
was the open branch. It therefore remains an operational-read-only observation
and does not establish the aggregate automation class. A default-branch
readback is required before `externalState` can advance; no authority is
inferred for state bootstrap, deploy, destroy, rollback, DNS, release or
publication from this report.

### 2026-08-10 — current main-sourced Production and report-only authority

The current successor epoch has promoted the fixed Production, report-only and
exact-stage teardown classes separately. Production source
`fef1dfca39d56d28b1f5956e4604af1cc659672b` is represented by
`docs/evidence/deployments/2026-08-10-production-prod-fef1dfc/workflow-receipt-31343392260.json`;
its rollback child receipt is a distinct `production-rollback` operation and
does not broaden deploy authority. Report-only source
`53d93648a7b36713055d3edf69beb681c058386f` is represented by
`docs/evidence/deployments/2026-08-10-orphan-inventory-main-53d936/workflow-receipt-31344401196.json`;
its dedicated report path proves read-only state/provider agreement and no
deletion capability. The reviewed-main teardown source
`31212c48b873113c1bf854fd648f14562bd2fb96` is represented by
`docs/evidence/deployments/2026-08-10-preview-teardown-pr-24/workflow-receipt-31350160353.json`;
it proves exact-stage delete projection, pre-destroy freshness, state/Worker
absence and former workers.dev `404`. The earlier beta.64 dry-run remains a
historical non-claim. Custom-domain/DNS, unrelated resources, publication,
release and credential disclosure remain outside this envelope.

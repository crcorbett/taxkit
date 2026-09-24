---
document_type: execution-plan
lifecycle: current
authority: supporting
owner: taxkit-documentation-owner
last_reviewed: 2026-09-24
review_trigger: task progress, version, proof, provider authority, or lifecycle change
---

# Alchemy and Doppler modernisation

The [SPEC](../../product-specs/alchemy-doppler-modernisation.md) and
[task ledger](../../product-specs/alchemy-doppler-modernisation.tasks.json)
own the accepted target and order. This plan records progress and bounded
proof. Starting point: clean isolated worktree from
`origin/main` `d91d295477a3ac587499a2845afae5daa5768f18`.

| Task | State | Evidence and next action |
| --- | --- | --- |
| ADM-001 infrastructure owner | Locally verified; one-resource Preview deployment proved | Private source-only owner, root composition, imports, workflow input digests and docs changed together. Hosted `pr-78` readback found one state stage and one Cloudflare Worker; Production property parity remains unproved. |
| ADM-002 release upgrade | Locally verified; beta.79 hosted Preview passed | Exact Alchemy beta.79, Effect rc.117 and Vitest 5.0.1 installed. Local checks pass. The hosted Preview plan, equal replan, apply and browser proof passed; Production plan and hosted behaviour remain unproved. |
| ADM-003 Doppler reconciliation | Locally verified; service-token metadata checked; bridge binding open | The checkout-scoped personal login and custody check passed. Fixed `taxkit/dev` values matched the expected account without value output. Read-only Doppler metadata shows one read-only, unexpired token per `ci`, `stg_preview` and `prd`; GitHub bridge names match the expected locations. The unreadable GitHub values cannot be bound to exact token identities. |
| ADM-004 delivery | Merged; hosted Preview deployed and proved; Production open | PRs #78, #79 and #80 merged with Quality and exact-stage cleanup evidence. Preview run `35943710629` matched the accepted digest, deployed one `DocsWebsite` Worker and passed provider and hosted browser proof. Production plan, deploy and rollback proof remain open. |

## 2026-09-24 development authority and CLI correction

Cooper approved one checkout-scoped personal Doppler login and Alchemy
state-store bootstrap and plan for the TaxKit development stage. This approval
covers the Cloudflare state-store prerequisite and a plan of the single
`DocsWebsite` graph. It does not cover applying that Website plan, Preview or
Production deployment, teardown, or merging a pull request. The credential
source is `taxkit/dev`; the candidate is this branch's exact commit at the
time of the provider operation. The local Doppler login can be revoked with
`doppler login revoke --scope=./`. A bootstrap-created or changed state-store
requires account-matched provider readback and a separate reviewed recovery
decision before any teardown.

Installed Alchemy beta.79 source shows that `alchemy login` and
`alchemy cloudflare bootstrap` are retired compatibility commands that exit
non-zero. Its supported bootstrap command is
`alchemy provider cloudflare bootstrap`. Complete Cloudflare account and API
token environment values take precedence over profile credentials, including
under `CI=1`. The three hosted mutation workflows initially used that command with
`CI=1` and no profile-login step, retaining Doppler as their only Cloudflare
credential source. The workflow contract test, `check:docs` and
`check:runbooks` passed locally after this correction. The live development
capture below proves the current plan-reader form and the supported bootstrap
command in this account.

The [sanitised development receipt](../../evidence/deployments/2026-09-24-alchemy-beta79-dev-plan/receipt.json)
binds clean commit `0dd3cfc4857cdbffe947e25a400768b40bb71d0c`,
Alchemy beta.79, account `f9f94270a4a5af8af7010d891020922d` and
`dev_cooper`. The personal Doppler login passed custody validation. The
state-store Worker settings returned HTTP 200 before and after the supported
bootstrap command, which exited successfully. The exact clean-commit plan
parsed as one `DocsWebsite` **create**. Its two safe lines are retained in
[plan.txt](../../evidence/deployments/2026-09-24-alchemy-beta79-dev-plan/plan.txt),
SHA-256 `da20a6a0593162c6b97bbfdd888c9258e77cb3b0badef3798d594fd4a6c5c07d`.
The bootstrap's precise mutation, if any, was not observed. No Website apply
or hosted stage was run.

## 2026-09-24 merged-main teardown stop and cache correction

Cooper approved merging [PR #78](https://github.com/crcorbett/taxkit/pull/78)
before its first Preview plan, because the dispatch must use reviewed workflow
code on `main`. PR head `84d65144938b7b8b25672f070e790b74ec09237d`
passed Quality; squash merge `6b2a8578851872ed9de81b669c5de0b511821e92`
passed merged-main Quality. The PR-close teardown run
[`35936287064`](https://github.com/crcorbett/taxkit/actions/runs/35936287064)
completed the mutation-capable state-store bootstrap, then stopped before any
destroy because the inventory command found no cached state-store credential.
At that point, no Preview plan had been dispatched and no teardown artifact
was uploaded.

The separately approved Preview-only plan was then dispatched from merged
`main` as run [`35937015746`](https://github.com/crcorbett/taxkit/actions/runs/35937015746).
Its bootstrap succeeded, but the plan reader rejected the hosted output before
a plan receipt was written. The allowlisted artifact contains only the workflow
input and bootstrap receipts. The plan command exited successfully, while a
private local diagnostic plan parsed as one `DocsWebsite` create; that local
result does not establish the hosted output. After both stopped runs, read-only
Alchemy state and Cloudflare inventory agreed with no `pr-78` stage or Worker,
state-store version 7, and HTTP 200 for its Worker settings. The
[sanitised stop receipt](../../evidence/deployments/2026-09-24-alchemy-beta79-preview-stop/receipt.json)
retains the exact run and readback identities without raw provider output.

Installed Alchemy beta.79 writes that cache only when the bootstrap runs with
`CI=0`; complete Doppler-supplied Cloudflare environment credentials retain
priority in either mode. This follow-up changes the three mutation
workflow bootstrap commands to `CI=0`, keeps later inventory and plans under
`CI=1`, and updates the contract test and deployment owners. It also retains a
fixed, safe plan-reader reason in future errors because the hosted raw output
was intentionally not uploaded. The bootstrap's exact provider effects in the
failed runs remain unknown. No Website apply, accepted Preview plan, Production
operation or retry is claimed here.

## 2026-09-24 accepted hosted Preview plan

Cooper approved marking [PR #79](https://github.com/crcorbett/taxkit/pull/79)
ready, merging it, waiting for its automatic `pr-79` cleanup, then running one
new Preview-only bootstrap and plan for the merged PR #78 candidate. PR #79
head `57b270a624fbe64ef76bdc5768e85aeaefd46872` passed Quality and merged
as `976545a9ca8aa15f64963b2fa01dbbea4c6ef4d0`; merged-main Quality also
passed. [Automatic cleanup run `35939463603`](https://github.com/crcorbett/taxkit/actions/runs/35939463603)
compared equal destroy plans and read back no `pr-79` stage or Worker.

[Preview plan run `35939686472`](https://github.com/crcorbett/taxkit/actions/runs/35939686472)
used reviewed `main` workflow commit `976545a9ca8aa15f64963b2fa01dbbea4c6ef4d0`
and exact PR #78 candidate `84d65144938b7b8b25672f070e790b74ec09237d`.
The bootstrap and hosted plan passed. The allowlisted artifact
`10784398178` records one `TaxKitDocsCloudflare/pr-78/DocsWebsite`
`Cloudflare.Worker` **create** with accepted plan SHA-256
`7ef11dd43e8a5a20e14e4177d1db0dcfa02277a5538bd4457082bcbc5ca22e86`.
The replan/apply and hosted HTTP/browser steps were skipped for this plan
operation. Read-only account-matched state and Cloudflare inventory after the
run agreed that neither `pr-78` nor `pr-79` has a stage or Worker, with
state-store version 7. The [sanitised receipt](../../evidence/deployments/2026-09-24-alchemy-beta79-preview-plan/receipt.json)
retains identities, postconditions and limits. A separate exact-digest Preview
apply approval is required before deployment; this plan does not authorise
Production or prove served-site behaviour.

Documentation impact for this evidence slice: **Change required** for the
dated receipt, deployment evidence index, active task ledger and this plan;
**Preserve** for the SPEC target, deployment runbook, architecture, authority
model, historical failure receipt and public docs; **N/A** for package and
app READMEs, generated references, skills, workflows, tests and a Changeset
because this slice changes no executable or published behaviour.

## 2026-09-24 approved Preview deployment and hosted proof

Cooper separately approved one exact-digest `pr-78` Preview deployment. The
accepted plan run `35939686472` named PR #78 head
`84d65144938b7b8b25672f070e790b74ec09237d`, stage `pr-78`, one
`DocsWebsite` create and SHA-256
`7ef11dd43e8a5a20e14e4177d1db0dcfa02277a5538bd4457082bcbc5ca22e86`.
Before dispatch, account-matched state and Cloudflare inventory agreed that
the stage and Worker were absent. The provider-free deployment check passed;
no competing workflow writer was active.

[Preview deploy run `35943710629`](https://github.com/crcorbett/taxkit/actions/runs/35943710629)
used reviewed `main` workflow commit `7b983127ad7a9300904e2168a7cb4c52839d1a32`
and the exact accepted candidate. Its new plan and replan matched the accepted
digest and each other before apply. The run deployed one Worker at
[`taxkitdocscloudflare-docswebsiqmpqqa4magljz7gnjaxyppdn.coopercorbett.workers.dev`](https://taxkitdocscloudflare-docswebsiqmpqqa4magljz7gnjaxyppdn.coopercorbett.workers.dev),
deployment `0e749110-78f5-46c5-85dd-edd44361e9ff`, version
`71423cfd-2ca5-498a-a5a4-6d355713a140`. The hosted HTTP/browser step
passed and retained hash-checked desktop and mobile screenshots in provider
artifact `10785892606`. The separate receipt reconciler run
[`35943838280`](https://github.com/crcorbett/taxkit/actions/runs/35943838280)
accepted the exact candidate and source run. An independent HTTP request
returned 200, and account-matched state/Cloudflare inventory agreed on one
`pr-78` stage and one Worker after the run.

The [sanitised Preview deployment receipt](../../evidence/deployments/2026-09-24-alchemy-beta79-preview-deploy/receipt.json)
retains the plan and provider artifact identities, screenshot hashes, state
readback, URL and rollback recovery identity `preview-35943710629`. The
bootstrap's precise effects are not independently known. This Preview result
does not prove Production, public custom-domain availability or permanent
uptime. Manual exact-stage teardown of this closed PR needs a separately
approved destroy operation and absence readback.

Documentation impact for this deployment evidence: **Change required** for
the dated receipt, deployment evidence index, active task ledger and this
plan; **Preserve** for the SPEC target, runbook, authority model, deployment
architecture, historical plan/failure receipts and public docs; **N/A** for
package and app READMEs, generated references, skills, workflows, tests and a
Changeset because no repository runtime or published behaviour changed.

## 2026-09-24 Doppler token metadata readback

Read-only Doppler metadata listed one `read` service token in each fixed
automation config: `taxkit/ci`, `taxkit/stg_preview` and `taxkit/prd`. All three
expire on 18 November 2026. Names-only Doppler inventory still shows the
expected Turbo pair in `ci` and Cloudflare pair in `dev`, `stg_preview` and
`prd`. GitHub readback shows only `DOPPLER_CI_TOKEN` at repository level and
one `DOPPLER_PROVIDER_TOKEN` in each matching Preview and Production
environment. The successful Preview plan checked `stg_preview` identity; PR
#80's Quality checked `ci` identity. The [sanitised metadata receipt](../../evidence/deployments/2026-09-24-doppler-token-metadata/receipt.json)
records the exact names, access and expiry without bearer values or IDs.
GitHub does not reveal its secret values, so names and nearby timestamps do
not prove the exact bridge-token binding. Production's bridge has not been
exercised by this modernisation's hosted workflow.

Documentation impact for this metadata slice: **Change required** for the
dated receipt, deployment evidence index, task ledger and this plan;
**Preserve** for the SPEC, deployment runbook, authority model, architecture,
historical token receipts and public docs; **N/A** for packages, app READMEs,
generated references, skills, workflows, tests and a Changeset because no
source or provider configuration changed.

Documentation impact for this correction: **Change required** for three
workflow commands, the contract test, safe plan-reader error, deployment
architecture, runbook, automation register, this active plan and dated failure
evidence; **Preserve** for historical beta.64 receipts, authority model,
public docs and protected GitHub environments; **N/A** for package exports,
SDK/API contracts and a Changeset because no published package behaviour
changed.

Documentation impact for this slice: **Change required** for the three
workflows, their contract test and plan reader, deployment architecture,
automation register, dated evidence and index, task ledger and this active
plan; **Preserve** for the runbook's authority boundary,
historical completed plan, public docs and old beta.64 captures; **N/A** for
SDK/API contracts, package exports and a Changeset because no published package
behaviour changed.

## Research readback

- The starting root declares one `Cloudflare.Website.Vite("DocsWebsite")`.
  Stage and Website policy are in `apps/docs/src/lib/build`; deployment
  tooling imports that app path. The earlier local infrastructure package
  was not pushed and is absent from current main.
- Site has a private infrastructure package and a small root composition,
  with a larger Axiom and DNS graph that TaxKit does not need. DAW pins the
  release candidates used here but keeps its smaller graph app-owned.
- Exact local source clones match Alchemy tag `v2.0.0-beta.79` at
  `473c39591c7993a708199d0ef8f0d38416885dde` and Effect package
  `4.0.0-rc.117` at `14a3f140095fdebbff9162944fe7d4ea83e054e6`.
  Npm tags and Alchemy's rc.115+ peer constraint were read on 2026-09-23.
- Current workflows use fixed Doppler `ci`, `stg_preview` and `prd`
  config identities and named Cloudflare/Turbo outputs. This is source
  inspection, not a claim about current token validity or provider state.
- Read-only GitHub metadata through principal `crcorbett` on 2026-09-23
  showed repository secret name `DOPPLER_CI_TOKEN` and one
  `DOPPLER_PROVIDER_TOKEN` name in each of the Preview and Production
  environments. The separate teardown environment had no secret name.
  GitHub does not return write-only values; this does not prove the token
  contents, expiry, Doppler scope or Cloudflare access.
- `bun run check:doppler-custody` failed with safe reason `scoped-token`
  in this new worktree. Local cloud development needs its own
  checkout-scoped personal login before it can be claimed.

## SPEC review

Review on 2026-09-23 compared the draft with the package profile,
deployment tooling, app build assertions, release-source Website types and
the historical beta.64 capture owner. It added an explicit package-profile
update, kept infrastructure-only imports out of the app, and required fresh
version-matched plan evidence before hosted deployment. The reviewed SPEC
is current for repository implementation. No provider operation is approved
by this review.

## ADM-001 local proof

- `bunx bun@1.3.14 install --frozen-lockfile`: passed for the private
  package slice; exact pinned Bun binary reported `1.3.14`.
- `bun run --filter=@taxkit/infrastructure check-types` and
  `test`: passed, including 17 policy tests.
- `bun run test:docs-deployment`: 93 passed; the tracked-file input
  list includes the new package and teardown computes the same input roots.
- `bun run --filter=docs test`: 11 app tests and 14 hosted-proof
  boundary tests passed after the app was made independent of infrastructure.
- `bun run verification`: passed locally. Its isolated release-boundary
  test needed filesystem access for a nested temporary Bun install; the
  sandboxed run stopped at that install, while the permitted run passed.
- `bun run check:docs`, `bun run check:repository-paths`,
  `bun run knip`, `bun run knip:production`, lint and formatting passed.
  The skill-profile change has an intentionally updated SHA-256 receipt in
  `tools/skills/canonical-skill-baseline.json`.
- No Changeset is required for this slice: the new package is private and
  source-only, and no published package export or installed behaviour changed.

These are local source and test results. No Alchemy plan, Cloudflare
state, hosted Worker, Doppler token or public URL was checked by them.

## ADM-002 local proof and open boundary

- `bunx bun@1.3.14 install --frozen-lockfile`, `bun run verification`,
  `bun run test`, `bun run docs:build` and
  `bun run --filter=docs test:cloudflare-built` passed. The built Worker
  returned SSR 200, immutable asset 200 and missing-page 404 locally.
- `bun run release:check -- --ci` passed all nine ordered local checks,
  including the packed SDK consumer, standalone API smoke, browser route
  journey and Changeset status. This mode creates no release attempt or
  publication receipt. The non-CI mode correctly rejected the retained
  HGI-203 packet, whose journey-inventory digest already differs on
  `origin/main`; that packet is not a new candidate.
- Effect rc.117 requires `Schema.TaggedError`, upper-case primitive `Config`
  constructors and Bun's supplied HTTP server Layer. Alchemy beta.79 uses
  `workersDev: true` instead of the former Website `url` option. Current
  source and installed types were checked. Vitest 5's browser test runs React
  in its ordinary test mode and asserts only the two expected TanStack route
  warnings for rejected loader Effects.
- The generated OpenAPI document now names encoded component references with
  an `Encoded` suffix and nests the tax-year union one level deeper. The
  committed snapshot, API owner and Changeset record that change. API route
  paths, status codes and JSON field names were checked through route tests
  and standalone smoke.
- The retained beta.64 plan captures and failed-apply receipt remain bound to
  their historical version. The parser's current version constant is beta.79,
  and local parser tests pass. A further beta.79 source review found that an
  empty plan now says `Plan: no resources`; the current parser accepts that
  only for an already-absent teardown and rejects beta.64's old empty text.
  `bun run test:docs-deployment` passed 94 tests after the correction. At that
  point no fresh sanitised beta.79 provider plan capture had been obtained.
  The later development capture above qualifies the current parser for one
  `dev_cooper` create plan. Preview, Production and teardown still require
  their own authority and version-matched plan review.

## ADM-003 credential inventory

Read-only Doppler metadata on 2026-09-23 showed project `taxkit` and exactly
`ci`, `dev`, `stg_preview` and `prd` configurations. `doppler secrets
--only-names` showed the following names; Doppler's automatic
`DOPPLER_PROJECT`, `DOPPLER_CONFIG` and `DOPPLER_ENVIRONMENT` metadata also
appeared in each configuration. No secret value was read or printed.

| Config | Governed names | Exact consumer |
| --- | --- | --- |
| `ci` | `TURBO_TEAM`, `TURBO_TOKEN` | Trusted Quality, receipt, Preview and Production Turbo steps through repository `DOPPLER_CI_TOKEN`. |
| `dev` | `CLOUDFLARE_ACCOUNT_ID`, `CLOUDFLARE_API_TOKEN` | Local cloud development after checkout-scoped personal login; no service token bridge. |
| `stg_preview` | `CLOUDFLARE_ACCOUNT_ID`, `CLOUDFLARE_API_TOKEN` | Preview and teardown provider steps through the Preview environment `DOPPLER_PROVIDER_TOKEN`. |
| `prd` | `CLOUDFLARE_ACCOUNT_ID`, `CLOUDFLARE_API_TOKEN` | Production provider steps through the Production environment `DOPPLER_PROVIDER_TOKEN`. |

Read-only GitHub metadata showed only the repository `DOPPLER_CI_TOKEN` name
and separate `DOPPLER_PROVIDER_TOKEN` names in the protected Preview and
Production environments. Workflow source checks the fixed project/config
metadata before passing named outputs to consumers. The local adapter strips
ambient Doppler and provider values, selects only `taxkit/dev`, disables
fallback and Bun env-file loading, and accepts only the two Cloudflare names.
Before the approved login, this checkout's `check:doppler-custody` stopped
with safe reason `scoped-token`. It passed after the checkout-scoped personal
login. Metadata and that personal login do not prove bridge token scope,
expiry or value. No direct duplicate secret source was found to remove, and
no GitHub or Doppler automation setting was changed.

## Authority and limits

Repository implementation and local checks are authorised by this task.
Before bootstrap, plan or apply against Cloudflare, identify the exact
principal, operation, resource, environment, approval boundary, receipt,
rollback/revocation and readback under
[the authority model](../../operations/authority-model.md). Do not copy
secret values into this plan. Frozen install or a green local plan is not
hosted proof.

## Documentation impact

Use the SPEC ledger for `Change required`, `Preserve` and `N/A` rows.
Update the earliest durable owner within each task, run
`bun run check:docs` and `bun run check:runbooks` for changed operations,
and record exact command outcomes here.

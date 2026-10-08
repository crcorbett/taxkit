---
document_type: product-spec
lifecycle: implemented
authority: supporting
owner: taxkit-product-owner
last_reviewed: 2026-08-10
review_trigger: accepted TK-CF finding, dependency constraint, Cloudflare or Alchemy contract, deployment authority, proof boundary, or implementation discovery
successor: null
tombstone: false
---

# Docs Cloudflare and Alchemy deployment

## Overview

TaxKit will deploy the completed TanStack Start documentation application to
Cloudflare Workers through Alchemy. Preview and Production are both required
initial outcomes:

- a trusted pull request receives an isolated `pr-<number>` stage and provider
  Worker URL; and
- one fixed `prod` stage owns the stable provider Worker URL used for the
  initial public Production deployment.

A custom domain is a future successor. It must attach to the same Production
Worker identity and must not block or redefine the initial deployment
contract.

This SPEC is implemented after all five slices closed in dependency order.
DCD-002 dated evidence now establishes the sanitized Cloudflare account and
Workers subdomain identities, one exact-candidate Alchemy/Worker/assets
Preview requalification at candidate `d9cb894…`, including exact
pre-mutation readback, hosted proof, bounded screenshots and exact-stage
teardown. The Preview is no longer available. The earlier `0d714e6…`
observation remains disconfirming history. DCD-002 is accepted after full
repository gates and fresh independent corrected-boundary review. That
evidence does not establish a paid plan, future cost, Production deployment,
public-domain availability, rollback, release, publication or DNS state.
Implementation began from reviewed commit
`96a825cebd22798044678389851be6ee9154d1df`; the completed
[execution plan](../exec-plans/completed/docs-cloudflare-alchemy-deployment.md)
retains the implementation history, authority stops and closeout evidence.

The 2026-08-02 manual evidence epoch supersedes those earlier non-claims for
its own dated candidate only: candidate `aabe7b6…` was Preview-deployed,
hosted-verified, screenshot-reviewed and safely torn down; the same source
was updated at fixed Production, hosted-verified and screenshot-reviewed; and
a normal source-bound rollback restored `d9cb894…` with changed provider
deployment/version identity. The claim-matched receipts are routed through
`docs/evidence/deployments/`; they do not establish repeatable GitHub workflow
execution, current availability after teardown, custom-domain/DNS routing,
paid-plan/cost facts, release or publication. The older paragraph's
credential/environment non-claim is superseded by the dated 2026-08-04
capability receipt: the four protected environments and two narrow credential
identities now exist. At that earlier capability epoch workflow execution and
hosted receipts were still unestablished; the current default-branch workflow
epoch is recorded below. At that historical point DCD-004 remained in progress
and DCD-005 remained pending for the report-only state boundary, final parity
and bridge retirement.

The 2026-08-05 default-branch workflow epoch now proves the mutation path
under the protected environments: Preview plan/deploy runs
`30962576035`/`30962743727`, corrected exact-stage teardowns
`30964380634`/`30964525980`, PR-close absent-stage teardown `30966977503`,
Production plan/deploy runs `30964647432`/`30964781776` and
`30965270740`/`30965398455`, and normal rollback plan/execution
`30965691430`/`30965797032`. Candidate, stage, plan, provider/state, hosted
and bounded screenshot receipts are retained under
`docs/evidence/deployments/2026-08-05-*`. This advances the Preview,
Production and teardown observations but does not establish the report-only
orphan class: `30966300887` stopped before inventory because `GH_TOKEN` was
missing, and corrected run `30967000841` stopped because the read-only
Cloudflare credential cannot derive Alchemy beta.64's HTTP state-store bearer
without the mutation bootstrap path. At that historical point DCD-004
therefore remained in progress with an explicit report-only capability stop;
DCD-005 remained pending for the remaining parity, evidence and Nitro-bridge
retirement requirements.

The merge-era PR-close run `30968741396` independently converged absent
`pr-13` at default-branch candidate
`936f3326a6100582ecd8ffb88b299985bc8db875`; its equal no-op digest and
state/provider postcondition are retained under
`docs/evidence/deployments/2026-08-05-preview-pr-13/`. This does not change the
report-only stop or close either DCD task.

The 2026-08-09 local bridge-retirement candidate removes the docs app's Nitro
Vercel preset, `.vercel/output` harness, dual build-target signal and docs-only
Nitro dependency. `test:built` now runs the Cloudflare/workerd built contract;
`test:cloudflare-built` remains an explicit alias. Nitro remains only in the
independently owned `apps/web` build graph, so the root Nitro catalog and
shared output ignore entries are preserved. This implementation observation
does not establish hosted requalification for the retirement candidate, a
current Production URL, or the report-only Alchemy state boundary. At that
historical bridge-retirement point DCD-004 remained in progress and DCD-005
remained pending until those claims were resolved.

The 2026-08-09 report-only successor candidate
`9dd779d70ccf661081856c3b5f07474b406db7ba` now uses Alchemy beta.64's public
`makeHttpStateStore` after the existing Schema-decoded, account-matched cache
ingress. A nested process may decode the same protected JSON credential only
when it cannot see that cache, avoiding the nested `Cloudflare.state()` layer
while leaving all mutation/bootstrap paths unchanged. Local inventory proof
returned state/provider agreement, state-store version `7`, one `prod` stage
and one provider Worker. The exact hosted successor run `31315231020` remained
queued without a runner or pending environment request and was cancelled; its
receipt is retained under `docs/evidence/deployments/2026-08-09-orphan-inventory/`.
At that historical successor point hosted report-only state/provider agreement
remained unestablished, so DCD-004 and DCD-005 stayed open and the automation
register remained `not-established`.

The corrected branch-bound successor `70be77e64c93d20cd82c5e02e33db9c92a94f0d7`
passed the protected report-only workflow `31316752464`. It materialized and
validated the state credential, decoded the account-matched report through the
public Alchemy HTTP state client, returned state/provider agreement for one
`prod` stage and one Worker, and found no Preview stages or orphan candidates.
The receipt is retained at
`docs/evidence/deployments/2026-08-09-orphan-inventory/report-31316752464.json`.
This proves only the exact branch-bound report-only read and no mutation. At
that historical branch-bound point the automation register remained
`not-established` until the reviewed workflow ran from the default-branch
source; hosted application behavior, deployment/version identity, teardown and
rollback remained separate claims, so DCD-004 and DCD-005 stayed open.

The historical b59e4ee candidate passed the complete provider-bound
Preview, teardown, Production and normal rollback/redeploy observations. The
Preview receipts under `docs/evidence/deployments/2026-08-10-preview-pr-15/`
bind equal plan/replan, Alchemy state, Worker/deployment/version, hosted
HTTP/browser/accessibility/console/cache-header proof and bounded desktop/mobile
screenshots; teardown run `31318663989` proves the exact `pr-15` stage and
former workers.dev URL absent. The Production receipts under
`docs/evidence/deployments/2026-08-10-production-prod/` bind fixed `prod` to
the stable provider Worker and URL, with the same hosted/screenshot contract,
normal rollback to eafeaad and final b59e4ee redeploy. The teardown receipt
explicitly separates the deployed candidate from the reviewed default-branch
implementation commit used by the PR-close workflow. These are dated
workers.dev observations only; they do not establish custom-domain, DNS,
paid-plan, release, publication or byte-promotion behavior.

The protected report-only workflow run `31319845724` also passed for b59e4ee on
the open branch and returned state/provider agreement, one prod stage, one
Worker and no Preview/orphan candidates. Its wrapper receipt is
`docs/evidence/deployments/2026-08-09-orphan-inventory/report-31319845724.json`.
That receipt remains branch-bound and cannot establish the report-only
automation class. DCD-004 and DCD-005 remain open for the source-bound
lifecycle gates, fresh independent review and final closeout. No receipt is
promoted across candidates or source epochs.

The following paragraph records a superseded historical main-sourced Preview
epoch; its teardown stop and status are retained as dated trajectory evidence.
The current main-sourced Preview promotion is recorded in the dated evidence
route `docs/evidence/deployments/2026-08-10-preview-pr-24/`. Default-branch SHA
`bc2ac82f48cce67a6ee5b1b6caf9e8903bf9c182` planned and deployed candidate
`cbcb86878379cc2a126a8e48bee256aa33096c79` for deterministic `pr-24`; plan
`31337945701`, deploy `31338052297` and reconciler `31338154055` agree on the
equal-replan digest, account/state, Worker/deployment/version, hosted proof and
desktop/mobile PNG digests. Its strict outer receipt advances only
`docs-preview-delivery` to `externalState: established`. The corresponding
teardown run `31337384729` stopped at the pinned beta.64 dry-run without
destroy or absence readback; Production, rollback, teardown and report-only
remained unestablished at that historical point, and DCD-004 remained in
progress while DCD-005 remained pending.

The succeeding reviewed default-branch epoch records the current split claim
boundary. Production source
`fef1dfca39d56d28b1f5956e4604af1cc659672b` deployed accepted candidate
`cbcb86878379cc2a126a8e48bee256aa33096c79` to the fixed `prod` Worker. Plan
`31342982776`, deploy `31343083326`, source-bound rollback `31343236244` and
final redeploy `31343392260` were API-reconciled by `31343175981`,
`31343339747` and `31343498809`; the promoted receipt is
`docs/evidence/deployments/2026-08-10-production-prod-fef1dfc/workflow-receipt-31343392260.json`.
It binds provider/state, version-transition, hosted HTTP/browser and bounded
desktop/mobile screenshot proof. The report-only workflow also has a
reviewed-default-branch receipt: run `31344401196`, reconciler `31344453019`,
and outer receipt
`docs/evidence/deployments/2026-08-10-orphan-inventory-main-53d936/workflow-receipt-31344401196.json`.
That report proves state/provider agreement and no mutation/deletion
capability. Preview, Production, report-only and exact-stage teardown are now
established in the automation register through their separate current
receipts; the failed runs `31343533595` and `31343687718` remain historical
non-claims. DCD-004 and DCD-005 are completed at the accepted closeout
candidate `c0cd1a9…`; no custom-domain/DNS, billing, release, publication,
byte-promotion or public-domain claim is made.

The accepted closeout is recorded at
`docs/evidence/deployments/2026-08-10-local-bridge-retirement/lifecycle-acceptance-c0cd1a9.json`.
Candidate `c0cd1a9…` is a documentation/evidence successor of the reviewed
implementation candidate and preserves the frozen deployment inputs and all
source-bound provider/hosted receipts. Exact repository verification and both
Quality checks passed, and the fresh independent review at
`independent-review-7deaf12.json` found no material implementation or
proof-owner blocker. The execution plan is retained in completed history.

## Target and comparative evidence

TaxKit planning target:

- `origin/main`:
  `9c82bf9613b1342375ff670c46ee34cc8347af1d`;
- current local proof: Cloudflare/workerd generated output and the implemented
  `taxkit-docs-runtime` local journey; the historical Nitro/Vercel receipt is
  retained only as migration evidence; and
- current dependency baseline: Effect/Platform `4.0.0-beta.98`, TanStack Start
  `1.167.65`, TanStack Router `1.169.2`, Vite `8.0.14` from the lockfile, and
  Nitro `3.0.260429-beta`.

That baseline describes the reviewed starting revision. DCD-001's current
candidate uses the coordinated graph below plus
`@cloudflare/vite-plugin@1.47.0`, `wrangler@4.114.0`, and the plugin's exact
`workerd@1.20260722.1` dependency.

Reference implementation comparative target:

- `origin/main`:
  `0bdf6cd3e2c405b6ab1ce97a665b6fc26f20cc4c`;
- Alchemy `2.0.0-beta.64`;
- Effect, `@effect/platform-bun`, `@effect/platform-node`, and
  `@effect/vitest` `4.0.0-beta.100`; and
- a current `Cloudflare.Website.Vite` TanStack Start resource using
  `nodejs_compat`, compatibility date `2026-06-24`, Worker-first assets,
  Cloudflare remote state, and separate Preview/Production deployment
  composition.

The reference implementation is trajectory evidence, not TaxKit policy. TaxKit
must not copy its names, domains, provider identifiers, AOX/Axiom resources, credentials,
bindings, historical receipts, hard-coded proof inputs, or custom-domain
assumptions.

Official package metadata at this SPEC revision requires Alchemy
`2.0.0-beta.64` to use Effect and the optional Platform peers at
`>=4.0.0-beta.100`. The selected exact graph is therefore:

| Dependency                              | Target exact pin |
| --------------------------------------- | ---------------- |
| `alchemy`                               | `2.0.0-beta.64`  |
| `effect`                                | `4.0.0-beta.100` |
| `@effect/platform-bun`                  | `4.0.0-beta.100` |
| `@effect/platform-node`                 | `4.0.0-beta.100` |
| `@effect/vitest`                        | `4.0.0-beta.100` |
| `@effect/platform-node-shared` override | `4.0.0-beta.100` |
| `@effect/sql-d1` override               | `4.0.0-beta.100` |
| `@cloudflare/vite-plugin`               | `1.47.0`         |
| `wrangler`                              | `4.114.0`        |

The existing TanStack, React, Vite, Fumadocs, TypeScript and Effect language
service versions remain unchanged unless the first vertical slice produces a
specific incompatibility. No dependency may use `latest`.

The two overrides are required compatibility pins, not upgrade abstractions.
Without them, caret ranges in Platform Bun/Node and Alchemy resolve
`@effect/platform-node-shared` and `@effect/sql-d1` beta.102, whose peers
require Effect beta.102 and contradict the fixed Effect beta.100 baseline.
Their removal condition is an accepted coordinated Effect/Alchemy successor
whose frozen transitive peers resolve compatibly without overrides.

Relevant upstream contracts:

- [Alchemy TanStack Start](https://alchemy.run/cloudflare/frontend/tanstack-start/)
- [Alchemy Vite Website](https://alchemy.run/cloudflare/frontend/vite/)
- [Alchemy state store](https://alchemy.run/state-store/)
- [Cloudflare workers.dev](https://developers.cloudflare.com/workers/configuration/routing/workers-dev/)
- [Cloudflare Node compatibility](https://developers.cloudflare.com/workers/runtime-apis/nodejs/)
- [Cloudflare Worker limits](https://developers.cloudflare.com/workers/platform/limits/)

## Accepted-finding crosswalk

All accepted findings retain their investigation IDs. `TK-CF-009` is revised
by Cooper's dependency decision.

| Finding     | Accepted correction                                                                                                                                                                                                      | Requirements                               | Tasks                           |
| ----------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ | ------------------------------------------ | ------------------------------- |
| `TK-CF-001` | The Vercel Build Output is not the Cloudflare deployment artifact. Add an app-owned official Cloudflare Vite mode and root Alchemy prebuilt-Worker composition.                                                          | `DCD-003`, `DCD-004`                       | `DCD-001`, `DCD-005`            |
| `TK-CF-002` | Use a bounded dual-build migration. Retire Nitro only after local workerd, Preview, Production and rollback parity.                                                                                                      | `DCD-003`, `DCD-011`                       | `DCD-001`, `DCD-005`            |
| `TK-CF-003` | Keep app semantics app-owned and deployment composition root-owned. Reject a provider/infrastructure package.                                                                                                            | `DCD-003`, `DCD-009`                       | `DCD-001`, `DCD-002`, `DCD-004` |
| `TK-CF-004` | Make isolated Preview and fixed-stage Production mandatory initial outcomes using provider Worker URLs.                                                                                                                  | `DCD-005`, `DCD-007`                       | `DCD-002`, `DCD-003`            |
| `TK-CF-005` | Treat Alchemy state, stage locking, teardown and orphan inventory as an explicit bounded control-plane lifecycle.                                                                                                        | `DCD-008`, `DCD-009`                       | `DCD-002`, `DCD-004`            |
| `TK-CF-006` | Split provider/state/Preview/Production/teardown/rollback authority and Schema-decode config and receipts without exposing credentials.                                                                                  | `DCD-008`, `DCD-009`                       | `DCD-002`, `DCD-003`, `DCD-004` |
| `TK-CF-007` | Bind exact candidate, plan, provider readback, hosted behavior, screenshots and rollback in dated receipts.                                                                                                              | `DCD-005`, `DCD-006`, `DCD-007`, `DCD-010` | `DCD-002`, `DCD-003`, `DCD-005` |
| `TK-CF-008` | Qualify module-scoped runtime reuse, generated content, Node imports, filesystem absence and limits under workerd.                                                                                                       | `DCD-004`                                  | `DCD-001`, `DCD-005`            |
| `TK-CF-009` | Upgrade Effect/Platform and Alchemy together to the exact beta.100/beta.64 graph in the first Cloudflare slice and prove the whole affected repository.                                                                  | `DCD-002`                                  | `DCD-001`                       |
| `TK-CF-010` | Add the minimum deployment runbook, authority/control owners and separate small deployment-evidence route without rewriting historical evidence.                                                                         | `DCD-008`, `DCD-010`, `DCD-012`            | `DCD-002`, `DCD-004`, `DCD-005` |
| `TK-CF-011` | Keep custom domain/DNS/certificate work deferred; later attachment preserves the Production Worker identity.                                                                                                             | `DCD-001`, `DCD-007`, `DCD-011`            | `DCD-003`, `DCD-005`            |
| `TK-CF-012` | Reuse the reference implementation's exact-source, state, Worker/assets and proof principles while rejecting its private Website/Vite implementation detail, AOX, hard-coded provider identities, custom-domain coupling and unsafe concurrency. | `DCD-003`, `DCD-008`, `DCD-010`            | `DCD-001`, `DCD-004`, `DCD-005` |

Applicable harness invariants are `HC-OUTCOME-001`, `HC-CTX-001`,
`HC-BOUNDARY-001`, `HC-DOC-001`, `HC-PROOF-001`, `HC-AUTH-001`,
`HC-AUTO-001`, `HC-DEPENDENCY-001`, `HC-EVIDENCE-001`, and
`HC-LIFETIME-001`.

## Problem

`apps/docs/vite.config.ts` unconditionally installs the Nitro Vite plugin with
the Vercel preset. `apps/docs/scripts/test-built.tsx` imports the generated
`.vercel/output/functions/__server.func/index.mjs` and serves
`.vercel/output/static`. Turbo also records `.output/**` and
`.vercel/output/**` as production build outputs.

The source application already has the Web-standard Worker entry:

```ts
Current runtime source

request
  -> apps/docs/src/server.ts
    -> createStartHandler(defaultStreamHandler)
      -> TanStack Start routes and server functions
```

The missing boundary is the Cloudflare build/resource composition. The
accepted candidate uses the official Cloudflare Vite plugin to emit the Worker
module and assets, then passes that exact prebuilt output through Alchemy
`Command.Build` to `Cloudflare.Worker({ bundle: false })`; it does not consume
the Vercel Build Output API. Replacing the Nitro adapter immediately would also
remove TaxKit's only independent built SSR/hydration/navigation regression
oracle before workerd and provider proof exist.

The reviewed baseline had no deployment runbook, Cloudflare authority
envelopes, Alchemy state owner, mutating workflow controls, hosted screenshot
contract, provider-bound evidence route, or rollback receipt. DCD-002 admitted
the smallest runbook, authority/receipt owner, deployment journey inventory and
one provider-bound Preview/teardown chain. DCD-003 has now observed fixed
Production, a separately Preview-qualified successor, and normal source-bound
rollback to the accepted source with bounded screenshots and provider/state
readback. Owner reconciliation, broad verification and corrected-boundary
independent review accepted DCD-003. Repeatable workflows remain
capability-gated and are owned by DCD-004. The candidate branch now contains
the four deployment workflow owners and their focused admission test: three
mutation workflows plus one cancellable, read-only orphan inventory. DCD-004
has admitted the deployment-only Schema/control desired state, and the
2026-08-04 capability receipt now establishes the four protected GitHub
environments and separate narrow credential identities. The current
main-sourced Preview receipt establishes the Preview automation entry; the
later main-sourced Production and report-only receipts establish those two
entries independently, and the later teardown receipt establishes the fourth
entry. Quality's
authority remains
read-only and independently cancellable; its exact runner bootstrap was
corrected during DCD-004 to use the frozen app-local Playwright executable and
complete `main` comparison history after hosted failures exposed those missing
prerequisites.

The first default-branch workflow observations are part of the DCD-004
qualification boundary: action refs must be full immutable SHAs; PR-close
teardown must use the current default-branch implementation rather than a
stale pre-merge base SHA; and the workflow must install the pinned Playwright
browser and build the Cloudflare deployment input before hashing `dist`.
These corrections preserve the no-op-versus-delete teardown contract and add
no provider resource or authority.

The current reviewed-main Preview teardown promotion completes that previously
open automation boundary. Run `31350160353` at source SHA
`31212c48b873113c1bf854fd648f14562bd2fb96` and reconciler `31350243582`
retained the exact `pr-24` input, two equal delete projections, pre-destroy
freshness readback, post-destroy state/Worker absence and former workers.dev
URL `404` readback. Its outer receipt is
`docs/evidence/deployments/2026-08-10-preview-teardown-pr-24/workflow-receipt-31350160353.json`.
The four automation entries are now established for their separate claims;
the failed beta.64 teardown runs remain historical non-claims. DCD-004 and
DCD-005 are completed after the final parity, lifecycle and independent-review
acceptance recorded in the closeout evidence. Custom-domain/DNS, billing,
release, publication, byte-promotion and future-provider-state claims remain
excluded.

The workflow receipt boundary is strict. Raw hosted output is retained only as
diagnostic artifact material; the promoted receipt is filtered to the
`DeploymentWorkflowHostedProbe` Schema, and the workflow copies the referenced
desktop/mobile PNG bytes into the artifact route before recomputing their
digests. Provider readback carries account and state-store identity plus the
pre-mutation version where present. Production accepts only a successful
Preview run from the named workflow whose `accepted_preview_pr_number` exactly
matches the deterministic `pr-N` stage. Teardown checks live PR closure for
both event and manual dispatch, rejects every unexpected action, and invokes a
dedicated Schema-decoded absence checker. External-state admission decodes the
plan as well as provider/hosted/teardown receipts and rejects any cross-file
candidate, stage, plan, config, dependency, account/state, Worker, URL,
deployment/version, rollback or screenshot-byte mismatch.

The live mutation jobs and external-state admission invoke the same
operation-bound plan Schema checker before any apply or destroy. Plan-only receipts use `preview-plan` or
`production-plan`; a mutating equal-replan receipt switches to
`preview-equal-replan` or `production-equal-replan` before apply. Production
downloads and checks the accepted Preview plan/replan
artifact rather than trusting a caller-supplied digest. A promoted external
receipt must also name Schema-decoded GitHub run and workflow-input readbacks.
Preview, Production and report-only runs require a successful completed run
with the expected workflow name, exact workflow path, `refs/heads/main`,
`headBranch: main`, and `headSha` equal to the recorded workflow source commit.
Automatic PR-close teardown is the explicit source identity exception: its API
`headBranch`/`headSha` identify the closed PR run, while its `workflowCommit` and
`refs/heads/main` identify the reviewed implementation checked out by teardown;
the read-only reconciler verifies that commit exists and is an ancestor of
current `main` before it checks the artifact. The workflow-input readback binds
the same run/path, source commit, operation and exact deployment candidate
input; that input must equal the outer receipt's candidate. A default-branch
run may build a reviewed PR head, so the two identities are intentionally
distinct. Promotion rejects
hosted environment/stage mismatches
and any screenshot set other than exactly one desktop and one mobile image.
Report-only dispatch verifies the reviewed
default branch before installing dependencies or materialising its state bearer;
Preview validates a positive numeric PR number before provider bootstrap. A
normal rollback binds its recovery identity to the accepted Preview provider
receipt, making the accepted Preview target explicit rather than trusting
caller text alone.

The successor teardown runs `30896950134` (automatic PR-close) and
`30896963746` (manual `pr-1`) passed source checkout, frozen install, browser
setup, docs validation, exact build and equal destroy dry-runs, then stopped at
`check:docs-deployment-inventory` because the ephemeral runner had no cached
`cloudflare-state-store` credential. They executed no destroy or provider
mutation. The mutation workflows now materialize that account-matched cache
with the installed Alchemy `login` environment selector followed by the
Cloudflare bootstrap command under `CI=0` before planning or teardown, then run
inventory under `CI=1`; this keeps the postcondition readback read-only and
does not copy the local OAuth profile. The report-only workflow uses its
separate Cloudflare read token plus an account-matched
`ALCHEMY_STATE_STORE_CREDENTIALS_JSON` cache. Because beta.64 exposes one
bearer for both state reads and writes, this is an operational read-only
boundary enforced by the workflow's reachable commands and tests, not a
cryptographically read-only state token; that limitation remains explicit.

## Goals

- Upgrade the complete Effect/Platform baseline and add Alchemy at the exact
  accepted compatible pins in the first Cloudflare vertical slice.
- Add the smallest app-owned official Cloudflare build mode and root-owned
  `Command.Build` plus prebuilt `Cloudflare.Worker` composition.
- Execute the real emitted Worker bundle under workerd before provider access.
- Prove an isolated trusted-PR Preview at its read-back provider URL and safely
  tear it down or stop with a complete safety, identity or capability receipt.
- Prove one fixed Production stage at a stable provider Worker URL, including
  normal rollback/redeploy.
- Add repeatable Preview, Production and PR-close teardown workflows only after
  the first manual authorized vertical paths are understood.
- Bind source, config, plan, dependency, Alchemy state, Worker,
  deployment/version, hosted behavior and screenshots in dated evidence.
- Retire Nitro/Vercel and `.vercel/output` only after Cloudflare parity.
- Keep architecture, runbook, controls, README pointers and focused proof
  synchronized within each vertical slice.

## Non-goals

- A custom domain, DNS record, zone adoption, certificate or route.
- Cloudflare Pages.
- Multi-account, multi-region or multi-cloud design.
- Gradual rollout, traffic splitting or version aliases.
- A generic infrastructure/provider package or helper framework.
- Third-party observability or reference-specific AOX/Axiom machinery.
- Application KV, D1, R2, Durable Objects, Queues, Hyperdrive or Cron.
- Automatic orphan deletion.
- Speculative application secrets or public runtime configuration.
- A browser Effect runtime, raw provider-client escape hatch, generic provider
  callback API, or app route that performs provider operations.
- Expanding every hosted assertion into a release critical journey.
- Rewriting HGI-203, HGI-206, HFI, completed docs-app evidence, or completed
  execution plans.
- Package publication, versioning, tag, release or public-domain proof.

## Requirements

### `DCD-001` — claim boundaries and outcome

The accepted outcome is a Cloudflare Worker deployment contract for the docs
app with isolated Preview, fixed Production, safe teardown and normal rollback.
Local Vite, local workerd, Preview, Production, provider state, deployment
authority and future public-domain claims remain separate.

The initial public endpoint is the read-back Production `workers.dev` URL. A
future domain may attach to the same Worker but is not an acceptance condition
for this SPEC.

### `DCD-002` — coordinated Effect and Alchemy graph

The first implementation slice changes the root catalog and lockfile to the
exact beta.100/beta.64 graph listed above. It must:

- use frozen dependency installation after the lockfile is regenerated;
- verify npm integrity and Alchemy peer constraints against the accepted pins;
- run focused tests and the full affected repository graph;
- record any Effect API corrections at their existing semantic owners rather
  than adding compatibility wrappers; and
- constrain transitive Effect packages whose prerelease caret ranges would
  otherwise resolve beyond beta.100 and verify every resolved Effect peer; and
- stop if a repository owner cannot migrate without an additional dependency
  or architecture decision.

This is one dependency decision serving the first Cloudflare path, not a
standalone modernization programme. `alchemy@2.0.0-beta.64` remains a
prerelease carrying cost. Its owner must review an upstream peer/resource
contract change, a provider incident, a non-convergent plan, a security
advisory, or a stable Alchemy release. Removal means returning to the last
accepted dependency graph and removing the unaccepted Cloudflare composition;
retirement means a separately proved stable successor or removal of this
deployment route.

### `DCD-003` — build and resource ownership

`apps/docs` owns:

- Schema-decoded build mode;
- Cloudflare-compatible Vite resolution and SSR bundle policy;
- the smallest build-policy module only if `vite.config.ts` cannot keep the
  decoded branch readable; and
- the existing Web Fetch handler, generated source and runtime boundaries.

Root `alchemy.run.ts` owns:

- one stack name;
- `Cloudflare.providers()`;
- `Cloudflare.state()`;
- stage selection; and
- one public `Command.Build` resource named `DocsBuild` that runs the
  app-owned Cloudflare build without memoization; and
- one public `Cloudflare.Worker` logical resource named `DocsWebsite` that
  consumes the resulting `dist/server/index.js` and `dist/client` assets with
  `bundle: false`, compatibility date `2026-06-24`, `nodejs_compat`, default
  asset-first full-stack routing, and the initial observability policy.

The app always selects the exact official `@cloudflare/vite-plugin@1.47.0`;
`build:cloudflare` remains a compatibility alias for the canonical `build`
script. The root `Command.Build` consumes that emitted output. TaxKit does not
use the reference implementation's command-line heuristic, Alchemy's private
Distilled plugin, or the unsupported injected Website signal. The compatibility
date is a TaxKit candidate pin only after DCD-001 proves it under workerd; the
reference use is comparative evidence, not acceptance.

Initial observability uses only Cloudflare's built-in invocation logs, with
traces disabled, no custom fields, no request body, header, cookie, credential
or secret capture, and no third-party destination. DCD-001 must read back the
exact supported Worker option and document its sampling/persistence and
plan/cost semantics without provider access; DCD-002 must confirm the applied
provider setting. If beta.64 cannot express that bounded policy, observability
remains disabled and the gap is retained for DCD-005 rather than inheriting an
undocumented default.

Alchemy owns the physical Worker name. TaxKit must read it back and must not
hard-code a generated Worker name or URL.

Repository deployment commands and provider readback belong under
`tools/docs-deployment/**`. Add a tool-local named Effect service with
live/test Layers only if direct Cloudflare API calls are required. It must
expose named operations, immediately decode provider output, use branded
identities and tagged errors, and expose neither a raw client nor a generic
callback.

Build configuration and provider ingress use `Config.schema` or an
owner-composed `ConfigProvider`; no module manually parses semantic environment
primitives. Primary operations remain flat, lazy Effects at their real I/O
owners. Expected plan, provider, state and proof failures stay in typed tagged
error channels without `instanceof` policy.

Deployment work does not move frontend ownership. Server-function transport
restoration remains route-high, the direct route root owns outcome matching,
policy-owning containers own remote commands, and leaves receive readonly
values and callbacks. Browser code constructs no Effect runtime and receives
no provider or deployment client.

Do not add a package. `packages/docs-content` and `packages/docs-fumadocs`
remain deployment-neutral. DCD-001 workerd evidence did prove one owning
runtime-filesystem defect in `docs-content`: eager reachability of validation
policy imported generated-source filesystem logic into the Worker. The
earliest correction makes bundled navigation data deployment-neutral and
loads validation policy only for the build-time validation operation; no
Cloudflare concern enters either content package.

### `DCD-004` — local Worker qualification

The reviewed baseline had no workerd, Wrangler, Miniflare or Workers test pool
dependency, and Alchemy's Website resource built while preparing its resource.
The first slice therefore had to establish a supported provider-free seam
before claiming local Worker proof:

- select and exact-pin an official workerd-compatible harness dependency or
  tool supported by the accepted Cloudflare/Vite graph;
- identify the public Cloudflare/TanStack Worker module and asset output that
  is also the deployable prebuilt Worker input, rather than testing a parallel
  artifact;
- retain package integrity, lockfile reachability and a negative proof that no
  provider or remote-state access was required; and
- stop if beta.64 exposes no supported provider-free artifact seam.

The first implementation pass reached that stop on 2026-07-29. Exact
`alchemy@2.0.0-beta.64` source shows:

- `src/Cloudflare/Workers/WorkerProvider.ts` privately imports
  `./Vite.ts` and calls `viteBuild` while preparing the deployable Worker;
- `src/Cloudflare/Workers/LocalWorkerProvider.ts` calls `viteDev`, so
  `alchemy dev` exercises a Vite development server rather than the collected
  production Worker/assets result;
- `src/Cloudflare/Workers/index.ts` does not export the Vite build module; and
- the more-specific `./Cloudflare/*` package export maps
  `alchemy/Cloudflare/Workers/Vite` to a nonexistent `Vite/index` module, so
  both Bun and Node reject the apparent deep import before the package-wide
  wildcard can apply.

The exact package integrity is
`sha512-gjDKSezvKSR9SMcyb6OajAWHcMMOWwZo3l5MKYVeO6O1PktOz4KMncP05j1IWwryG6BAu8/a/s2shtsn6TeEsA==`.
Its exact Distilled Cloudflare graph is
`@distilled.cloud/cloudflare-vite-plugin@0.13.8` plus
`@distilled.cloud/cloudflare-runtime@0.13.8`, whose runtime pins
`workerd@1.20260704.1`. This evidence proves dependency identity and the
missing first-class seam; it does not prove a TaxKit Worker build or runtime.

Alchemy `2.0.0-beta.65` and upstream revision
`f998d999b039941ac7d529de1e6e545757c7454a` retain the same export and
provider split, so no published exact successor currently supplies the missing
seam.

Cooper accepted the material contract change on 2026-07-29 and reaffirmed it
on 2026-07-30. DCD-001 therefore uses the third evidence-backed choice below;
the other choices remain retained decision provenance:

- narrow the local claim to the documented `alchemy dev` development
  artifact;
- wait for an exact Alchemy release that publishes a build-only seam; or
- replace `Cloudflare.Website.Vite` with an exact-pinned official Cloudflare
  Vite build consumed through Alchemy's public `Command.Build` and
  `Cloudflare.Worker({ bundle: false })` prebuilt contract.

The third option replaces, rather than duplicates, Alchemy's Distilled Vite
plugin and is the accepted DCD-001 architecture.
Importing a file from inside `node_modules/alchemy` remains rejected: it would
bypass the package export contract and turn an internal file layout into
TaxKit policy.

The verified command is `bun run --filter=docs test:cloudflare-built`. It
builds the exact official-plugin output, copies only that `dist` tree to a
temporary proof root, runs Wrangler's provider-free dry-run upload validation,
starts the same output through local workerd, and executes HTTP and Playwright
oracles. It does not initialize Alchemy state or contact Cloudflare.

Local workerd proof must cover:

- initial SSR body and status before browser JavaScript;
- static asset status, content type and non-HTML body;
- server-function transport;
- direct HTTP 404 and framework-native not-found UI;
- hydration without warnings or errors;
- client navigation with a server-function request and no new document
  request;
- one module-scoped `ManagedRuntime` per isolate rather than per request;
- sequential and concurrent isolate reuse without request-state leakage;
- no runtime filesystem access;
- no unsupported Node API call;
- compressed upload size against the selected Cloudflare plan limit, plus
  local process-to-first-response and first-response timing recorded only as
  local readiness observations;
  and
- clean frozen dependency and Knip/Turbo reachability.

The selected compatibility date makes Cloudflare's Node compatibility,
including `node:fs` emulation and `process.env` population, available. Its
presence is not proof that the application is filesystem-independent or that
secret values cannot enter the bundle or logs. The current generated source
may retain build-time filesystem imports. Failure occurs if the emitted Worker
can execute a filesystem path at request time, contains unexpected public or
secret configuration, or carries an unacceptable bundle/startup cost. If that
happens, the earliest correction is the owning
`packages/docs-content/src/{service,live.layer,validation/policy}.ts` boundary;
the deployment layer must not hide it.

The current module-scoped runtime remains correct if instrumentation proves one
construction per isolate. The app-owned Worker entry recognizes only the exact
`x-taxkit-docs-runtime-proof: construction-count` request and then returns a
non-secret construction count and per-isolate random identifier. This is
temporary migration instrumentation, not a public API or availability
contract. Its carrying cost is one lazily generated identifier per isolate and
two response headers only for opted-in proof requests. It must be reviewed on
any runtime, Worker-entry, privacy or proof-channel change and retired in
DCD-005 after an equally strong non-public provider oracle exists; otherwise
its explicit bounded ownership remains until such an oracle exists.

Cloudflare exposes no dependable application shutdown hook. The current live
runtime graph contains `Layer.effect` and `Layer.succeed` only, with no scoped
acquisition, finalizer, timer, mandatory shutdown flush or long-lived handle.
That bounded code audit plus observed workerd descendant cleanup qualifies the
current lifetime; it does not claim a general host shutdown hook.

DCD-001's current local receipt records:

- normalized deployment-input digest
  `d775395d4e2040dbe105fce6618265c40b7056dcc8a346e90a603839a77ca56f`,
  composed from the Wrangler dry-run Worker modules excluding its generated
  README and the isolated client-asset tree rather than absolute-path-bearing
  generated config;
- Wrangler's dry-run upload at `515.37 KiB` compressed and approximately
  `3,062.48 KiB` uncompressed, with no bindings or stateful resources;
- `888.20 ms` from local Wrangler process launch to first response and
  `103.56 ms` for that response request, retained as local readiness
  observations only; Cloudflare CPU-startup and account-plan enforcement
  remain provider readback claims for DCD-002;
- SSR `200`, immutable static-asset caching, native `404`, three
  server-function requests during the browser journey, zero client-navigation
  document reloads, and zero console/page diagnostics;
- one module-scoped runtime construction and one isolate identity across nine
  concurrent requests, plus an observed pinned-workerd descendant and no
  surviving observed descendant after proof; and
- Chromium `148.0.7778.96` accessibility, hydration, navigation and
  server-function proof.

The first workerd attempt used Worker-first asset routing and returned an asset
`404`. Cloudflare's supported full-stack default is asset-first: matched
assets are served directly and unmatched paths invoke the Worker. TaxKit
therefore retains default routing and `_headers` owns immutable caching for
`/assets/*`. The generated bundle still contains build-only filesystem
branches from source validation and Fumadocs raw-source generation; the proof
requires the request-time path to consume processed bundled source, exercises
an isolated copy containing only `dist`, and fails on runtime filesystem
reachability. Presence of an unreachable string is not treated as runtime
leakage.

### `DCD-005` — isolated Preview

A trusted pull request uses branded stage identity `pr-<number>` and one
isolated Worker resource. Before mutation:

- the exact candidate remains the current trusted PR head;
- Quality and local workerd proof pass for that candidate;
- the Cloudflare account, plan and Workers subdomain are read back;
- Alchemy remote state is explicitly bootstrapped or adopted;
- the Preview principal, credential scope/duration/revocation, resource,
  environment, approval and teardown authority are recorded; and
- the authorized non-mutating plan operation emits a sanitized,
  candidate/stage/config-bound plan projection and digest for human review.

The sanitized projection is Schema-owned and canonical: it includes the exact
source, dependency, Alchemy version, compatibility/build configuration, stack,
stage and logical resource identity, excludes ANSI, timestamps and secrets,
and does not claim that Alchemy supplies a native stable digest. A later
protected deploy operation accepts that exact digest, reacquires the stage
lock, rechecks candidate freshness, replans and rejects inequality before
applying. Plan work is cancellable and non-mutating; apply is queued and
non-cancellable.

Alchemy state bootstrap or adoption must complete under its separate authority
envelope before this application plan. If the installed plan path can create,
adopt or update provider/state resources, it is not the non-mutating review
phase and must stop rather than combine plan approval with apply authority.
After apply, proof must bind source/config/manifest/lock/Alchemy digests,
Alchemy stack/stage/resource output, Worker name, provider URL, latest
deployment/version and hosted behavior. A provider response without matching
state and candidate identity is a failure.

Teardown uses the same stage lock and exact `pr-<number>` target. It must
read the current PR and provider/state identities before destroy and prove
absence afterwards. If teardown authority is missing, stop without broad
cleanup and retain the exact unresolved resource and escalation owner.

### `DCD-006` — hosted screenshot contract

Preview and Production each retain one representative desktop and one
representative mobile screenshot rather than duplicating the complete local
visual corpus.

Each environment's screenshot manifest must Schema-decode:

- exact source commit;
- environment and stage;
- read-back URL;
- Worker, deployment and version identity;
- source/config/plan/dependency digests;
- viewport;
- browser name and exact version;
- image path and SHA-256 digest;
- expected and observed visual state;
- reviewer and review time;
- limitations and non-claims; and
- the applicable rollback/recovery identity.

The capture is valid only for the named candidate/runtime/build/config set.
Any change to one of those inputs invalidates the applicable screenshot set.
A screenshot mismatch fails the visual claim and retains both the mismatch and
expected-state description.

Screenshots supplement but never replace HTTP status, SSR content, asset,
hydration, navigation-request, server-function, accessibility, console,
cache/header or provider-readback assertions. A visually correct image is an
explicit false green for those other claims.

### `DCD-007` — fixed Production and rollback

Production uses one branded `prod` stage, the same logical Worker resource
and a stable read-back `workers.dev` URL. It requires:

- accepted Preview evidence for the exact source/config/dependency identity;
- exact-SHA checkout and frozen installation;
- a separately reviewed Production plan projection/digest followed by a
  distinct exclusive Production mutation window and equal replan;
- a separately scoped Production principal;
- provider and Alchemy state readback;
- hosted HTTP/browser/accessibility/console/cache/header proof;
- bounded desktop/mobile screenshots; and
- an identified last-known-good candidate before mutation.

Production is a same-source rebuild unless byte identity is independently
proved. Promotion evidence must compare source, lockfile, package manifest,
Alchemy source, compatibility settings and build configuration, not claim that
the Preview bytes were promoted.

Cloudflare documents `workers.dev` as suitable for getting started and
recommends a route or custom domain for business-critical production traffic.
The fixed initial `workers.dev` endpoint remains an accepted product decision,
but Production authority must explicitly accept the account plan, subdomain,
cost/limits and this hostname-availability limitation. The later custom-domain
successor is the operational retirement trigger; it is not a blocker for the
initial Production slice.

Normal rollback redeploys a reverted or previously accepted exact candidate
through the same Production graph and repeats provider and hosted proof. Direct
Cloudflare version rollback is break-glass only, uses a separate authority
envelope, and requires immediate provider/Alchemy reconciliation.

The later custom-domain successor must preserve stack, stage, logical Worker
resource and Worker identity. Domain/DNS/certificate authority and receipts
remain outside this SPEC.

### `DCD-008` — repeatable workflows and controls

After one authorized Preview and Production path are understood, admit the
smallest three mutating workflow classes:

- Preview plan/deploy/proof;
- Production plan/deploy/proof; and
- PR-close Preview teardown.

Also admit one report-only orphan inventory. It may compare open PRs, Alchemy
stages and Cloudflare resources; it must not destroy anything.

The implementation-owned local command is
`bun run check:docs-deployment-orphans`. It emits a Schema-decoded,
provider-bound dated report with no write/deletion capability; the first
observation is retained separately from the still-unestablished hosted
automation class.

Each workflow must use exact-SHA checkout, pinned actions, frozen installation
and a two-phase contract. A cancellable, non-mutating plan operation emits the
candidate/stage/config-bound sanitized digest receipt. A separately invoked
protected deploy operation accepts that digest, reacquires a stage-scoped
`cancel-in-progress: false` mutation lock, rechecks freshness, replans, rejects
inequality, and only then applies. A newer mutation queues; it does not
interrupt an apply.

Alchemy beta.64 exposes no evidenced distributed remote-state lock. The
stage-scoped GitHub concurrency group is a repository orchestration lock, not
a provider lock. Manual DCD-002/DCD-003 operations therefore require one named
principal and an exclusive authority window, with provider/state drift
readback before and after mutation; any concurrent or out-of-band mutation is
a stop. Automated mutations remain subject to the same drift oracle.

Mutating admission belongs to the narrow target owner
`tools/docs-deployment/**`. It Schema-decodes automation/control records and
negative fixtures for deployment only; `tools/quality-workflow/**` and
`.github/workflows/quality.yml` remain unchanged read-only owners. Automation
records must name signal, immutable state, authority, convergence,
idempotence, cancellation, proof, stopping, recovery, escalation, carrying
cost, review trigger and retirement. Do not add a generic workflow framework
or lint rule.

Preview deploy credentials are available only to trusted same-repository pull
requests through a protected environment. Forks and untrusted candidates stop,
and no candidate code runs through `pull_request_target`. PR-close teardown
may use that event only if it checks out a reviewed default-branch
implementation commit, never the pull-request head, derives only the numeric
PR stage, and performs exact state/provider readback before destroy. A manual
teardown dispatch must first prove `GITHUB_REF=refs/heads/main` and the live
default-branch SHA; its Cloudflare credentials are step-scoped only after the
reviewed checkout, never job-scoped before source validation.

The equal replan applies the same exact-resource projection as the initial
plan and rejects every action/resource outside `DocsBuild` and `DocsWebsite`.
After mutation, the workflow Schema-checks provider inventory and the latest
Wrangler deployment/version against candidate, stage, plan, config, lockfile,
deployment-input, Worker and URL identities, then runs the shared hosted
HTTP/browser/screenshot proof owner. Production additionally requires a
successful `accepted_preview_run_id` from the default branch and decodes its
provider/hosted artifacts before its own plan or mutation. Teardown records a
separate exact stage/Worker absence receipt; an empty action list is accepted
only after target-specific preflight proves the stage was already absent. The
report-only inventory remains reviewer-gated/manual and fails closed at the
1,000-pull-request completeness bound. A future positive report-only admission
must name a dedicated `reportPath` decoded as
`DocsDeploymentOrphanInventoryReceipt`; the mutation provider-readback path is
not a substitute for that state/provider report. Its current GitHub source must
be the 1,000-row `isDraft`-aware command and remain below the completeness
bound; the historical 100-row report remains immutable evidence only.

The initial plan, equal replan and teardown projection are Schema-decoded in
the mutation job itself before the provider operation. Production preflight
downloads both the Preview provider/hosted artifact and its canonical plan
artifact, then checks their candidate, deterministic `pr-N` stage and digest
identity before it builds or mutates fixed Production.

### `DCD-009` — authority, state, config and secrets

Use one new canonical target-owned runbook,
`docs/runbooks/docs-deployment.md`. It contains distinct sections and
authority envelopes for:

- provider inventory;
- Alchemy state bootstrap/adoption and recovery;
- Preview plan/deploy/readback;
- Preview destroy;
- Production plan/deploy/readback;
- normal rollback, admitted as a separate `production-rollback` operation on
  the same protected Production principal and stage lock;
- break-glass version rollback; and
- Alchemy reconciliation.

One runbook is sufficient because these operations share the same docs
deployment target and recovery graph. The Alchemy state section must still
separate its account-wide resources, principal, lifecycle, backup/recovery,
drift, orphan detection and retirement from an application stage. The existing
four runbooks retain their substantive ownership; DCD-002 changes the canonical
contract from exactly four to exactly five.

Remote state carries an account-wide Worker, state Durable Object and secret
material plus ongoing drift/recovery work. Review it on an Alchemy upgrade,
state-schema change, provider disagreement, orphaned stage, credential
rotation, failed destroy or recovery incident. Retire it only after every
TaxKit stack has been destroyed or migrated with provider absence/readback and
a separately authorized state-resource retirement receipt. A non-convergent
plan, unrecoverable state, or unexplained resource is disconfirming evidence
and stops application mutation.

Provider credentials remain workflow/runbook inputs and are never Worker
bindings. Public `VITE_*` values require an explicit app-owned Schema and are
never secret. Non-public Worker bindings require Schema-backed Config and
redaction at ingress. The initial docs deployment has no evidenced runtime
binding or secret, so none is added speculatively.

Every consequential operation records principal, identity source, exact
operation/resource/environment, scope, duration/revocation, approval,
readback, rollback and escalation. Missing fields are a stop, not permission
to widen credentials.

### `DCD-010` — proof, evidence and false greens

Preserve `docs/verification/critical-journeys.json` and the immutable
HGI-203/HGI-206/HFI evidence. Create one small separate deployment claim owner,
`docs/verification/docs-deployment-journeys.json`, with exactly:

- `taxkit-docs-workerd`;
- `taxkit-docs-preview`;
- `taxkit-docs-production`; and
- `taxkit-docs-deployment-rollback`.

This supporting inventory does not join local release closure and does not
retroactively change `taxkit-docs-runtime`. Dated receipts and screenshot
manifests live below `docs/evidence/deployments/`; raw provider logs and secret
values do not.

The target-owned deployment proof policy must Schema-decode this inventory and
reconcile each journey ID with its dated receipt and oracle class. DCD-002
creates and backfills the focused validator invocation; DCD-005 reruns it.

Hosted false-green failures include:

- stale candidate or receipt;
- wrong Worker or stage;
- provider/state disagreement;
- wrong-host redirect;
- asset fallback returning HTML;
- screenshot-only acceptance;
- hydration or console warnings hidden by a screenshot;
- client navigation that issues a document request;
- absent server-function transport;
- unsafe or incomplete destroy;
- cache status claimed without a matching cache policy; and
- rollback that restores content without restoring expected provider identity.

### `DCD-011` — bridge lifetime and retirement

The docs-app Nitro/Cloudflare path was temporary. Its carrying cost was two
build graphs, two artifact contracts and duplicate built-proof maintenance.
The 2026-08-09 candidate retires that docs-app bridge after local parity. Nitro
and shared output entries remain only where `apps/web` still owns them; those
references are not docs deployment policy. Review the preserved app-owned
Nitro path after every adapter, TanStack, Vite, Effect, Alchemy or runtime
change.

The implementation retirement is accepted locally only when:

- the workerd journey covers all relevant built-harness behavior;
- accepted exact-candidate Preview and Production receipts exist;
- normal rollback/redeploy is accepted;
- Worker runtime, assets, headers/cache and console proof reach parity;
- the Cloudflare built harness becomes the sole docs-app local
  production-artifact oracle; and
- no docs package/content owner depends on the Vercel path.

The committed candidate `24ce5de1c565107276e9524b8e9203b14cab9580` now
requalifies the retained Nitro parity set through the sole Cloudflare built
harness. Its dated local receipt records passing mobile navigation disclosure,
reduced-motion suppression, pending navigation and recoverable source-error
rendering in addition to the existing SSR, assets, hydration, navigation,
server-function, 404, accessibility, focus, console, runtime, filesystem and
limit oracles. The final DCD-005 lifecycle gate is satisfied by the
primary-owner acceptance, active-plan archival and final parity/authority
review retained in the closeout evidence; those are lifecycle records, not
missing browser assertions.

Disconfirming evidence is a Cloudflare path that cannot reproduce an accepted
SSR, server-function, navigation, accessibility, error or lifecycle behavior
without an unaccepted architecture expansion. In that state, keep the bridge,
retain the failure and seek the smallest product decision.

### `DCD-012` — documentation and lifecycle

Every vertical slice updates its executable owner, architecture/README
pointers, controls, proof and task status together. Do not accumulate a final
documentation cleanup task.

Materially revised legacy `status: canonical` architecture owners migrate to
the current metadata contract. Architecture owns durable design; the new
runbook owns exact procedures; code/config/Schemas/workflows own desired state;
dated receipts own provider observations; and this SPEC/tasks own active
intent. Retire duplicated procedure prose after the runbook owns it.

Implementation began only after an active execution plan was created and
routed from `docs/exec-plans/active/README.md`. On accepted completion, that
plan moved to completed history and the SPEC/task/index lifecycle was updated;
this implemented SPEC has no active plan.

## Current and target trees

```text
Current
apps/docs/
  package.json
  vite.config.ts                  # TanStack + Cloudflare Vite plugin
  src/server.ts                   # Web Fetch handler
  src/lib/runtime.server.ts       # module-scoped ManagedRuntime
  scripts/test-cloudflare-built.tsx # workerd production-artifact oracle
packages/docs-content/            # deployment-neutral content/runtime owner
packages/docs-fumadocs/           # deployment-neutral Fumadocs owner
turbo.json                        # shared app output declarations
knip.production.json              # docs Vite entries, no Alchemy entry
```

```text
Target during migration
alchemy.run.ts
tsconfig.alchemy.json
apps/docs/
  vite.config.ts
  wrangler.jsonc
  public/_headers
  src/server.ts
  src/lib/build/cloudflare-stack.ts
  scripts/test-cloudflare-built.tsx
  package.json
packages/docs-content/
  src/navigation.ts                 # bundled navigation owner
  src/live.layer.ts                 # validation policy loaded only on demand
tools/docs-deployment/
  schemas.ts                        # stage, plan, authority, readback and proof
  deployment-specific automation/control policy
  provider boundary and command owners created by their owning task
.github/workflows/
  quality.yml                     # preserved read-only
  docs-preview.yml
  docs-production.yml
  docs-preview-teardown.yml
  docs-deployment-workflow-receipts.yml # completed-run read-only reconciliation
docs/runbooks/docs-deployment.md
docs/verification/docs-deployment-journeys.json
docs/evidence/deployments/
```

No new package is added. The exact tool filenames and executable command
invocations are backfilled by the task that proves them.

## Call and resource graphs

```ts
Local workerd: target

exact source + frozen lock
  -> apps/docs build (or build:cloudflare compatibility alias)
    -> @cloudflare/vite-plugin@1.47.0
      -> dist/server/index.js + dist/client
        -> Alchemy Command.Build("DocsBuild")
          -> Cloudflare.Worker("DocsWebsite", bundle: false)
        -> Wrangler dry-run + local workerd
          -> HTTP and Playwright oracles
          -> runtime-construction/filesystem/limit instrumentation
```

```ts
Preview: target

trusted PR head
  -> local Quality and workerd receipt
  -> branded pr-<number> stage
  -> authorized non-mutating sanitized plan + digest receipt
  -> acceptance under the recorded envelope
  -> exclusive stage window + equal replan
  -> Alchemy Cloudflare remote state
    -> Command.Build("DocsBuild")
    -> Cloudflare.Worker("DocsWebsite", bundle: false)
      -> isolated Worker + assets + workers.dev URL
  -> provider/state readback
  -> hosted HTTP/browser + desktop/mobile screenshot receipt
```

```ts
Production: target

accepted Preview source/config/dependency identity
  -> authorized fixed prod-stage plan + digest receipt
  -> acceptance + exclusive stage window + equal replan
  -> same Alchemy stack and Worker logical resource
    -> stable Production Worker + assets + workers.dev URL
  -> latest fully promoted deployment/version readback
  -> hosted HTTP/browser + desktop/mobile screenshot receipt
```

```ts
Teardown: target

closed PR + exact pr-<number> stage + teardown authority
  -> same stage mutation lock
  -> open-PR/state/provider preflight
  -> destroy plan
  -> exact-stage destroy
  -> state/provider absence readback
```

```ts
Normal rollback: target

failed Production receipt + last-known-good accepted candidate
  -> exact reverted/previous source
  -> Production plan + approval + equal replan
  -> fixed prod stage redeploy
  -> provider/state identity readback
  -> hosted behavior and bounded visual proof
```

## Failure and stop contract

| Failure                                          | Required response                                                                                                                           |
| ------------------------------------------------ | ------------------------------------------------------------------------------------------------------------------------------------------- |
| Incompatible beta.100/beta.64 graph              | Stop `DCD-001`, retain package/lock/test evidence, and seek a dependency decision; do not add compatibility wrappers or fall back silently. |
| No supported provider-free Worker seam           | Stop `DCD-001`, retain exact Alchemy/Vite source evidence, and do not test a parallel artifact or access provider state.                    |
| Worker build or Node compatibility failure       | Correct the earliest app/package runtime owner or stop with the unsupported API and bundle path.                                            |
| Runtime filesystem leakage                       | Correct `packages/docs-content` only if the workerd stack proves request-time reachability.                                                 |
| Per-request runtime construction or isolate leak | Correct the app runtime owner and keep Nitro bridge until the oracle passes.                                                                |
| Stale candidate                                  | Stop before plan/apply and retain the observed PR/SHA mismatch.                                                                             |
| Plan drift                                       | Reject apply when the accepted and current sanitized digests differ.                                                                        |
| Concurrent or out-of-band mutation               | Stop on provider/state drift; a GitHub concurrency group is not a distributed Alchemy lock.                                                 |
| Wrong Worker/stage                               | Stop proof and mutation; do not redirect the oracle to a convenient URL.                                                                    |
| Provider/state disagreement                      | Stop promotion/teardown and route reconciliation through the deployment runbook.                                                            |
| Unsafe destroy                                   | Retain the resource, stop, and escalate; never broaden a delete selector.                                                                   |
| Hosted false green                               | Reject the applicable claim and retain HTTP/browser/provider/screenshot evidence separately.                                                |
| Screenshot mismatch                              | Retain the mismatch, expected state and reviewer decision; do not override behavioral failures.                                             |
| Rollback mismatch                                | Stop closure until provider identity and hosted behavior match the rollback target.                                                         |
| Credential overreach or unknown revocation       | Stop before provider access and request a narrower authority envelope.                                                                      |

## Authority gates

| Gate                                                                                                                             | Must exist before                   |
| -------------------------------------------------------------------------------------------------------------------------------- | ----------------------------------- |
| Account, plan, Workers subdomain and read-only provider inventory receipt                                                        | First Preview plan                  |
| Alchemy state bootstrap/adoption principal and recovery identity                                                                 | First stateful plan/apply           |
| Preview deploy and separate destroy principals/scopes                                                                            | First Preview mutation              |
| Protected Preview environment and trusted-PR decision                                                                            | First Preview mutation              |
| Production principal, approver, stable Worker identity, account/plan/subdomain, workers.dev limitation and cost/limit acceptance | First Production mutation           |
| Last-known-good candidate and normal rollback authority                                                                          | First Production mutation           |
| GitHub workflow principals, protected environments and stage-lock policy                                                         | Repeatable automation               |
| Zone/hostname/DNS/certificate authority                                                                                          | Future custom-domain successor only |

These gates do not block writing or reviewing this SPEC.

Cooper, the TaxKit repository/product owner, satisfied the ordinary
implementation approval gate upfront on 2026-07-30 Australia/Melbourne for
this implementation thread and goal. The approved envelope covers existing
credential/account preflight; narrow Alchemy state bootstrap/adoption;
sanitized plan and equal replan; exact TaxKit docs Preview and fixed
Production Worker/assets create/update/deploy and readback; hosted proof and
bounded screenshots; exact Preview teardown and absence readback; and normal
source-bound Production rollback/redeploy. It lasts until this goal completes,
Cooper revokes it, or an identity/safety mismatch occurs. Credentials may be
used but never disclosed, rotated or broadened.

This grant does not satisfy factual preconditions. Unknown or contradictory
executing identity, account, plan, Workers subdomain, credential scope or
revocation, state/resource identity, unsafe drift, secret-exposure risk,
destroy scope beyond the named stage, or provider contradiction still stops
mutation. Custom-domain/DNS, unrelated resources, third-party observability,
package publication/release remains outside the provider envelope. Cooper's
2026-08-10 approval admits PR-ready conversion and merge after all
claim-matched gates pass; it does not waive exact identity or postcondition
checks.
Cooper's successor Git envelope admits only the exact candidate branch, push,
draft pull request/readback and later coherent accepted-slice pushes. The
2026-08-10 approval also admits PR-ready conversion and merge after every
claim-matched gate passes; force-push and branch deletion remain excluded.
Each DCD-002/DCD-003 receipt must restate and Schema-decode the applicable
operation, principal, resource, environment, duration, revocation, readback,
rollback and postconditions before mutation.

## Evidence and screenshot retention

Each dated deployment evidence directory contains only bounded, sanitized
manifests, receipts and the representative PNGs required by `DCD-006`. It
records retention owner, review trigger, carrying cost and retirement:

- owner: `taxkit-docs-deployment-operation-owner`;
- carrying cost: provider identity review plus at most two representative
  screenshots per accepted environment/candidate observation;
- review trigger: candidate/runtime/build/config/provider contract or rollback;
- retirement: a successor receipt explicitly supersedes an active observation;
  historical accepted/failed receipts remain addressable; and
- disconfirming evidence: digest/readback/oracle mismatch, expired artifact,
  absent reviewer or an image without its manifest.

Raw provider logs, credentials and mutable dashboards remain outside Git.

## Fixed downstream-impact ledger

| Surface                           | Decision                   | Paths and implementation obligation                                                                                                                                                                                                                                                                                                                                                                                                                                                                                      |
| --------------------------------- | -------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| SPEC/tasks/index                  | Change required            | This SPEC, `docs-cloudflare-alchemy-deployment.tasks.json`, and `docs/product-specs/index.md`; create an active plan only when `DCD-001` starts.                                                                                                                                                                                                                                                                                                                                                                         |
| Root manifest and lock            | Change required            | `package.json`, `bun.lock`; exact Effect/Platform beta.100 and Alchemy beta.64 graph.                                                                                                                                                                                                                                                                                                                                                                                                                                    |
| Docs app manifest/build/runtime   | Change required            | `apps/docs/package.json`, `vite.config.ts`, optional `src/lib/build/**`, `src/server.ts`, runtime owners and `scripts/test-built.tsx`; add the exact local harness dependency only after DCD-001 proves the supported seam and preserve route/React ownership.                                                                                                                                                                                                                                                           |
| Other workspace manifests         | Preserve                   | Catalog consumers receive beta.100 through the root catalog and require proportional qualification, not textual churn, unless the upgrade proves a workspace-owned manifest change.                                                                                                                                                                                                                                                                                                                                      |
| Content packages                  | Change required / Preserve | DCD-001 workerd proved an owning eager-filesystem-reachability defect in `packages/docs-content/**`; correct bundled navigation and lazy validation policy at that owner. Preserve `packages/docs-fumadocs/**` and keep both packages deployment-neutral.                                                                                                                                                                                                                                                                |
| Root deployment composition       | Change required            | New `alchemy.run.ts`; no infrastructure package.                                                                                                                                                                                                                                                                                                                                                                                                                                                                         |
| Turbo/Knip/ignore/lint boundaries | Change required / Preserve | Add root `alchemy.run.ts` reachability to `knip.json` and `knip.production.json`, admit only the exact new config/test/process boundary files in `oxlint.config.ts`, and ignore transient `.wrangler` and `.alchemy` output in `.gitignore`. Preserve `turbo.json` until bridge retirement requires it.                                                                                                                                                                                                                   |
| Architecture                      | Change required            | `docs/architecture/deployment.md`, `frontend.md`, `testing-and-quality.md`, `package-ownership.md`; migrate materially edited legacy metadata.                                                                                                                                                                                                                                                                                                                                                                           |
| Root/app/package READMEs          | Change required / Preserve | Update `apps/docs/README.md`; preserve root `README.md` because its existing `docs/README.md` pointer remains sufficient, and preserve docs-content/docs-fumadocs READMEs unless their runtime contract changes.                                                                                                                                                                                                                                                                                                 |
| Runbooks/router/profile           | Change required            | `docs/runbooks/docs-deployment.md`, `docs/runbooks/README.md`, `docs/runbooks/recovery.md`, `docs/README.md`, `docs/standards/tooling.md`, `tools/documentation/runbook-contract.json`, runbook Schemas/policy/tests, `docs/skill-profiles/docs-maintainer.md`, `docs/verification/repository-harness-profile.json`, `docs/verification/effectiveness.md`, `tools/skills/canonical-skill-baseline.json`, and a proportional successor entry in `docs/verification/harness-epochs.md`; preserve prior epoch and HFI receipts. |
| Authority                         | Change required            | `docs/operations/authority-model.md` and machine-checked runbook authority records; the report-only state bearer is an operational-read-only boundary and is denied state writes by workflow contract.                                                                                                                                                                                                                                                                                                                          |
| Automation/controls/CI            | Change required / Preserve | Deployment-only Schema/policy/fixtures under `tools/docs-deployment/**`, `docs/operations/automation-register.md`, `docs/standards/controls.md`, `.github/workflows/docs-*.yml`; `github-actions-report-only` materializes only `ALCHEMY_STATE_STORE_CREDENTIALS_JSON` before the inventory reader. Preserve Quality's independent read-only/cancellable authority; DCD-004 may narrowly correct `.github/workflows/quality.yml` and `tools/quality-workflow/**` when exact hosted receipts prove a prerequisite defect, without adding provider credentials or deployment steps. |
| Local/browser proof               | Change required            | Existing docs tests plus task-created workerd/provider commands under `tools/docs-deployment/**`; reuse the implemented browser harness.                                                                                                                                                                                                                                                                                                                                                                                 |
| Deployment journeys/evidence      | Change required            | New `docs/verification/docs-deployment-journeys.json` and `docs/evidence/deployments/**`; preserve current release journeys and immutable evidence.                                                                                                                                                                                                                                                                                                                                                                      |
| Screenshots                       | Change required            | Bounded Preview/Production PNGs plus Schema-decoded manifests under the dated deployment evidence route.                                                                                                                                                                                                                                                                                                                                                                                                                 |
| Secrets/config                    | Change required / N/A      | Add deployment/receipt Schemas and authority metadata; the report-only state credential is a protected GitHub environment secret, never repository/application runtime configuration. Application runtime secret or binding is N/A until evidenced. Never store values.                                                                                                                                                                                                                                              |
| DNS/custom domain                 | N/A                        | No zone, route, domain, certificate, hostname, DNS workflow or task. Preserve the future identity boundary in architecture only.                                                                                                                                                                                                                                                                                                                                                                                         |
| Application stateful services     | N/A                        | No KV, D1, R2, application Durable Object, Queue, Hyperdrive or Cron. Alchemy remote state is control-plane state only.                                                                                                                                                                                                                                                                                                                                                                                                  |
| Observability                     | Change required / N/A      | Root Worker composition explicitly enables bounded built-in invocation logs with persistence, while traces remain disabled; DCD-002 provider readback confirmed those exact settings. Custom telemetry and third-party destinations are N/A.                                                                                                                                                                                                                                                                        |
| New package/service/lint          | N/A unless proved          | No package or lint rule. Add a tool-local provider service only if direct readback needs a real substitution boundary.                                                                                                                                                                                                                                                                                                                                                                                                   |
| HGI/HFI/completed history         | Preserve                   | HGI-203, HGI-206, HFI and completed docs-app SPEC/tasks/plan/evidence remain unchanged.                                                                                                                                                                                                                                                                                                                                                                                                                                  |
| Release/Changesets                | Change required            | `packages/docs-content` behavior changes so ordinary Worker requests use bundled navigation without request-time filesystem access. Retain `.changeset/fresh-workers-render.md` as a patch Changeset; do not consume or publish it in this SPEC.                                                                                                                                                                                                                                                                         |
| Public docs copy/navigation       | Preserve                   | No MDX, navigation taxonomy, lifecycle or public copy change.                                                                                                                                                                                                                                                                                                                                                                                                                                                            |
| Skills/AGENTS                     | Change required / Preserve | Update only the TaxKit docs-maintainer repository profile because its exact runbook count changes; preserve `AGENTS.md` and other skills unless routing evidence proves a stale pointer.                                                                                                                                                                                                                                                                                                                                 |

## Progressive implementation slices

### Slice 1 — upgraded local Cloudflare candidate

Upgrade the exact Effect/Platform and Alchemy graph, add the app Cloudflare
mode and root prebuilt-Worker composition, run the emitted Worker under
workerd, and
retain Nitro as an independent oracle. Observable outcome: one frozen local
candidate passes SSR, assets, server functions, 404, hydration/navigation,
runtime reuse, filesystem and limit proof.

### Slice 2 — first end-to-end Preview

Add only the deployment runbook, authority/state/receipt owners required for a
separately authorized Preview. Plan, deploy, read back, prove and visually
review one isolated trusted-PR Worker. Teardown it safely or retain a precise
authority stop. Observable outcome: one exact candidate has a dated provider
Preview receipt and bounded screenshots.

### Slice 3 — first end-to-end Production

Use the accepted Preview source/config/dependency identity to deploy fixed
Production at its stable provider URL, prove it, capture screenshots and test
normal rollback/redeploy. Observable outcome: one accepted Production
deployment and one accepted recovery observation.

### Slice 4 — make delivery repeatable

Admit the three mutating workflows and report-only orphan inventory. Add
stage-scoped locks, protected environments, equal replans, exact-SHA checks,
receipts and PR-close teardown without changing Quality's read-only contract.
Observable outcome: repeatable provider operations enforce the same contracts
proved manually.

### Slice 5 — parity and bridge retirement

Close remaining cache/header/logging, failure, lifecycle, docs and evidence
gaps. Prove Preview/Production/rollback parity, then remove Nitro/Vercel and
dual-path assumptions. Observable outcome: Cloudflare is the sole production
build/deployment route and historical proof remains available.

## Verification contract

Only current repository commands are named here:

```text
bun install --frozen-lockfile
bun run docs:validate
bun run --filter=@taxkit/docs-content test
bun run --filter=@taxkit/docs-fumadocs test
bun run --filter=docs test
bun run --filter=docs test:browser
bun run --filter=docs test:built
bun run --filter=docs test:cloudflare-built
bun run --filter=docs test:cloudflare-hosted
bun run --filter=docs check-types
bun run check:docs-deployment:types
bun run check:docs-deployment-tools:types
bun run check:docs-deployment
bun run test:docs-deployment
bun run docs:build
bun run check:quality-workflow
bun run check:docs
bun run check:runbooks

bun run verification
git diff --check
```

Each task that creates a workerd, provider, screenshot, teardown or rollback
command must execute it successfully at its claimed boundary and replace its
descriptive ledger gate with the exact verified invocation before that task
can complete.

Local checks do not prove a hosted Preview, Production deployment, provider
state, public availability or rollback. The hosted command requires the exact
provider-read-back URL, Worker, deployment/version and candidate environment
values; its DCD-002 receipt is a dated Preview observation, not a reusable
local claim or current-availability proof. Provider proof requires separately
authorized readback and hosted journey receipts.

## Acceptance criteria

- All five vertical slices are accepted in dependency order.
- Effect/Platform beta.100 and Alchemy beta.64 are exact, frozen and
  repository-wide qualified.
- Preview and Production exist at read-back provider Worker URLs and are bound
  to exact candidates.
- Preview teardown and Production rollback have accepted readback.
- Desktop/mobile screenshot manifests satisfy `DCD-006` without substituting
  for behavioral proof.
- The deployment runbook, authority, automation, control and evidence owners
  agree.
- Quality remains independently read-only and cancellable.
- Custom-domain/DNS work and unnecessary resources remain absent.
- Nitro/Vercel and `.vercel/output` are removed only after Cloudflare parity.
- Historical HGI/HFI/docs-app evidence remains unchanged.
- The completed implementation records exact commands, receipts, limitations,
  non-claims, carrying costs and retirement state.

## References

- [Docs application architecture](./docs-application-architecture.md)
- [Deployment architecture](../architecture/deployment.md)
- [Frontend architecture](../architecture/frontend.md)
- [Testing and quality](../architecture/testing-and-quality.md)
- [Package ownership](../architecture/package-ownership.md)
- [Authority model](../operations/authority-model.md)
- [Runbook index](../runbooks/README.md)
- [Sibling implementation tasks](./docs-cloudflare-alchemy-deployment.tasks.json)

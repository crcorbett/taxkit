---
document_type: architecture
lifecycle: current
authority: canonical
owner: taxkit-architecture-owner
last_reviewed: 2026-08-28
review_trigger: deployment target, runtime adapter, provider resource, state, domain, or rollback change
---

# Deployment

The docs app has a locally qualified Cloudflare Worker build and an Alchemy
deployment composition. DCD-002 established one dated, exact-candidate Preview
observation and safely removed that isolated stage. DCD-003 deployed the same
accepted source to fixed stage `prod`, qualified a distinct successor through
Preview and Production, and restored the accepted source through the normal
Alchemy graph while preserving the Worker URL and state identity. Earlier
failed Preview attempts remain historical disconfirming evidence, not current
provider truth.

## Scope

This doc owns durable deployment and resource boundaries. Exact operator
steps belong in the target-owned deployment runbook; current implementation
intent and task state belong in the active SPEC and execution plan.

## Current runtime shape

- `apps/api` runs as a Bun HTTP server and serves `/api/*`.
- `apps/web` builds through Vite/TanStack Start and calls `apps/api` over HTTP.
- `apps/docs` owns one Cloudflare build mode. Exact
  `@cloudflare/vite-plugin@1.47.0` emits `dist/server/index.js`, its server
  modules and `dist/client` assets. The former docs-app Nitro/Vercel bridge was
  retired after local parity; `apps/web` remains a separate Nitro owner.
- Root `alchemy.run.ts` composes one `TaxKitDocsCloudflare` stack. Hosted workflow
  and evidence admission remains branded `pr-<number>` or `prod`; local
  `alchemy dev` separately admits only Alchemy's `dev_<user>` default without
  widening that deployment Schema. The root also owns the mutation composition's
  `Cloudflare.state()`, and one logical
  `Cloudflare.Website.Vite("DocsWebsite")` resource declared by private
  `@taxkit/infrastructure`. That package owns the stage Schema, logical
  identity and Website settings; root owns providers and remote state.
  Alchemy injects its
  Cloudflare Vite integration, builds the app, and owns the SSR Worker/assets
  lifecycle and physical Worker name. The separate read-only inventory owner uses Alchemy's public
  `makeHttpStateStore` after an Effect FileSystem/Schema boundary decodes the
  account-matched cache, with a protected, redacted JSON fallback only when a
  nested process cannot see that cache. Missing, malformed and unreadable
  credential input remain distinct safe failures; neither path can bootstrap,
  write or delete state.
  The beta.79 Vite memo also includes the lockfile and the sibling
  `docs-content` and `docs-fumadocs` package trees as native build inputs.
- The Worker uses compatibility date `2026-06-24`, `nodejs_compat`, default
  asset-first full-stack routing, a provider Worker URL, built-in invocation
  logs and disabled traces. Hashed `/assets/*` responses are immutable.
- The initial app has no runtime bindings, secrets or stateful application
  service. KV, D1, R2, Durable Objects, Queues, Hyperdrive, Cron, custom
  domains, DNS and third-party observability are absent.
- `tools/docs-deployment/automation-register.json` and `controls.json` own the
  Schema-decoded desired state for three workflow classes: Preview delivery,
  Production delivery and exact-stage Preview teardown. All three are
  `not-established` for the native one-resource graph until new matching
  provider receipts are promoted. Historical two-resource and orphan receipts
  remain evidence, not current automation state.
- Five workflow receipt executables are narrow Bun adapters. Each decodes one
  Config Schema from the host environment, reads receipt JSON and screenshot
  bytes through the shared Effect FileSystem/Crypto boundary in
  `workflow-check.boundary.ts`, preserves closed input/read/mismatch errors,
  logs only safe operation and invariant identities through Effect Console,
  and executes once through `BunRuntime.runMain`. Receipt decoding rejects
  excess properties. The executables contain no direct environment, Bun file,
  Promise, console or process-exit orchestration. This internal boundary does
  not change workflow commands, the provider graph or historical receipts.
- The four deployment and receipt workflows bind the approved Vercel Remote
  Cache in read/write mode because they execute reviewed, exact-source workflow
  code. Frozen Bun installation remains live and is preceded by a
  content-addressed package-download cache. Preview, Production and teardown
  also restore a content-addressed Playwright Chromium cache from the runner
  temporary directory, then still run the pinned browser install. GitHub ref
  scope isolates writes while allowing a matching default-branch cache to be
  restored. The provider-free docs build uses the existing Turbo `docs#build`
  task and its declared `dist/**` output.
  Receipt-file checks, Alchemy plans and mutations, provider inventory, hosted
  proof and receipt promotion enter through live or explicitly non-cacheable
  tasks; no cache result can replace their current input or postcondition.
- `@taxkit/api-http` builds as a package and exposes health, generated docs,
  OpenAPI JSON, metadata and public calculation route contracts.
- `@taxkit/sdk` builds as a private package for local and downstream
  validation. It has not been published to npm.

## Docs deployment graph

```text
frozen source and lock
  -> root provider and state composition
    -> @taxkit/infrastructure Website.Vite("DocsWebsite")
    -> Alchemy injects the Cloudflare Vite integration
    -> Vite builds the TanStack SSR Worker and client assets
    -> Alchemy applies one isolated pr-N or fixed prod website resource
    -> provider/state readback identifies the workers.dev URL
```

The local command copies only emitted output to a temporary directory, removes
checkout paths from the generated Wrangler config, strips provider credential
variables, runs Wrangler dry-run and then runs the same no-bundle module graph
under workerd. Local proof does not establish provider state or deployment.

The integrated local development call graph is separate:

```text
repository-scoped Doppler login and custody check
  -> fixed taxkit/dev adapter with ambient values and fallbacks disabled
    -> Bun and Alchemy dotenv loading disabled
      -> native alchemy dev
        -> Schema-decoded dev_<user> stack
          -> the same Website.Vite resource in local development mode
```

This command can contact Cloudflare and Alchemy state. It therefore still
needs the named local development operation and account authority in the
runbook. The adapter does not grant that authority, and deterministic fake
process tests do not prove provider access.

The repository-owned implementation and command map for deployment tooling is
[`../../tools/docs-deployment/README.md`](../../tools/docs-deployment/README.md).

`bun run check:docs-deployment-inventory` is the separate credentialed,
provider-bound readback owner. It compares exact `TaxKitDocsCloudflare` state
stages/resources with account Worker enumeration through public installed
Alchemy APIs, fails on disagreement and emits only sanitized identities and
non-claims. It is deliberately outside root verification and does not build,
plan, apply, destroy or prove hosted behavior.

Interactive use prints the encoded report. Workflows instead set
`TAXKIT_DOCS_DEPLOYMENT_INVENTORY_REPORT` so the Effect runtime writes the
machine-readable JSON directly to the named temporary file while Turbo keeps
its own status text in the job log. Preview, Production and teardown must not
parse Turbo's combined console output as provider evidence.

Ephemeral GitHub runners do not retain Alchemy's derived
`cloudflare-state-store` credential after a plan or apply. The three mutation
workflows therefore run the supported `alchemy cloudflare bootstrap` operation
with `CI=0` immediately before planning or teardown. A preceding supported
`alchemy login` with `CI=1` writes only the `method: "env"` profile selector.
Bootstrap is a mutation-capable control-plane operation: beta.79 may refresh
credentials, use a short-lived edge-preview Worker to read the secret, and
create or upgrade the state-store Worker before caching the account-matched
credential on that runner. The inventory command reads the resulting cache
under `CI=1`. This authority does not extend to the report-only workflow and no
local OAuth profile is copied into CI.

After bootstrap and plan complete, the closed `workflow-evidence` Effect
command writes a sanitised bootstrap receipt. It binds the exact candidate,
stage, workflow run, Alchemy `2.0.0-beta.79` and matching upstream source
commit to those three allowed effects. It records state-store facts before and
after as `not-observed`; successful bootstrap command completion is not a
claim that no provider mutation occurred or that provider state was read back.

The former scheduled GitHub/open-PR orphan classifier and nested subprocess
boundary are retired. They did not provide a contributor-neutral lifecycle
model. PR-close teardown remains the explicit Preview cleanup owner; retained
orphan reports are immutable historical observations only.

Preview deployment and exact-stage PR-close teardown share the
`taxkit-docs-preview` GitHub environment and its narrow
`DOPPLER_PROVIDER_TOKEN` bridge. Repository source requires that bridge to be a
read-only, expiring, single-config token for `taxkit/stg_preview`, verifies the
safe project/config outputs, and gives only the two named Cloudflare outputs to
the exact provider steps.
That environment has no required reviewer: the Preview dispatch or trusted
same-repository PR-close event supplies operation authority, while reviewed
source, exact `pr-N` decoding, the non-cancellable stage lock, equal plans and
provider/state readback enforce the target. Production keeps its separate
reviewer-protected environment. A GitHub environment controls credential
custody; Alchemy stage identity controls which infrastructure can change.

Preview places its Doppler-sourced `CLOUDFLARE_API_TOKEN` only on its named
bootstrap, plan and replan/apply steps; teardown exposes it only to bootstrap
and exact-stage destroy. Preview fetches the separate `taxkit/ci` bridge after
all cache saves and gives its Turbo outputs only to the provider-free
deployment check and docs build. Teardown does not fetch `ci`. Production uses
the same two-bridge shape with protected `taxkit/prd`: its Turbo outputs reach
only the four post-cache provider-free proof/build steps, and its Cloudflare
outputs reach only bootstrap, plan and equal-replan/apply. Checkout,
installation, hosted proof and artifact upload cannot read a provider token.

Preview, Production and teardown uploads are prepared in separate temporary
directories. A typed Effect owner admits only the named sanitised JSON and
screenshot files for that mode and rejects admitted JSON containing credential
names, deterministic sentinels or token shapes. Raw Alchemy plan/replan/destroy
output, provider stderr, intermediate inventories and raw hosted diagnostics
remain runner-local.
Production plan, deploy and rollback use the same fixed `prod` GitHub
concurrency group with cancellation disabled. Preview and teardown keep their
shared exact-`pr-N` non-cancellable group. These GitHub locks do not cover a
manual Alchemy CLI process. Normal manual mutation must stop while the matching
workflow is queued or running; break-glass recovery needs one separately
authorised sole writer and state/provider readback before any retry.

The accepted Preview requalification used candidate
`d9cb8945529fb72158e59ca0daf02a98e1e4de1a` at deterministic stage `pr-1`.
Alchemy created one prebuilt Worker/assets resource after two equal sanitized
plans. Cloudflare readback and hosted proof agreed on the physical Worker,
deployment/version, assets, provider URL, invocation-log persistence and
disabled traces. The `/assets/*` cache contract required the root composition
to pass the app-owned `_headers` file through the public Worker asset
configuration. Exact-stage destroy subsequently removed the Preview Worker
and stage resources. These dated observations prove neither current Preview
availability nor Production.

The earlier `0d714e6…` observation remains retained because it exposed the
asset-header correction, but it lacked complete pre-mutation and
candidate/screenshot/state bindings. It is trajectory evidence, not the
accepted Preview chain.

The accepted DCD-003 Production evidence first rebuilt exact Preview-qualified
source `d9cb894…` into fixed stage `prod`. Cloudflare and Alchemy readback
agreed on Worker
`taxkitdocscloudflare-docswebsite-prod-ujphggiaxw5ryjev`, stable provider URL,
assets, deployment/version and state instance. The full hosted and bounded
screenshot contract passed.

The normal rollback rehearsal then qualified repository successor `c99984c…`
through a temporary isolated `pr-1` Preview, removed that Preview, deployed it
through the same fixed Production graph, and redeployed `d9cb894…`. The two
Production updates retained the Worker name, URL and Alchemy instance while
creating distinct deployment/version identities; final state restored the
initial d9 bundle hash. Deployment-critical source configuration and lock
identity were unchanged, but path-bearing clean-build output differed, so this
is source-bound rollback evidence—not byte promotion or recovery from known
broken content.

Preview owns an isolated deterministic stage and is destroyed only through
exact-stage readback. Production owns the fixed `prod` stage and stable
provider URL. The latest dated readback observed restored `d9cb894…`; it is not
a timeless availability claim.
Custom-domain attachment is a future successor and must preserve the
Production Worker identity and deployment contract.

## 2026-08-05 workflow observation

The reviewed deployment workflows are on default branch
`1b6d36b765a5953f79b0932c127f01088603930f`. The Preview plan/deploy pair
`30962576035`/`30962743727` and corrected exact-stage teardowns
`30964380634`/`30964525980` supplied claim-matched state/provider receipts for
the `pr-10`/`pr-9` stages. The PR-close teardown `30966977503` safely produced
an absent-stage no-op for `pr-12`. Production plan/deploy pairs
`30964647432`/`30964781776` and `30965270740`/`30965398455` plus rollback
`30965691430`/`30965797032` supplied fixed-stage deployment, hosted,
screenshot and source-bound restore evidence. These are dated workflow
observations; they do not change the provider-neutral architecture or imply a
custom domain, DNS, publication or byte-promotion claim.

Merge-era PR-close run `30968741396` repeated the exact-stage no-op for `pr-13`
at default-branch candidate `936f3326a6100582ecd8ffb88b299985bc8db875` and
read back state/provider agreement with no matching Preview Worker. Its
sanitized receipt is retained under
`docs/evidence/deployments/2026-08-05-preview-pr-13/`.

The report-only orphan workflow has a separate unresolved boundary. Run
`30966300887` stopped before inventory because `GH_TOKEN` was missing; after
that owner correction, `30967000841` reached deployment inventory but could not
derive Alchemy beta.64's HTTP state-store bearer with the read-only Cloudflare
token. The mutation bootstrap path is not permitted for report-only inventory.
Therefore the deployment register remains `not-established` as an aggregate
state claim, and scheduled orphan detection remains an inconclusive,
non-mutating report rather than an absence or teardown signal.

## 2026-08-09 docs-app bridge-retirement observation

The clean candidate `d649a14fe49122387e33a6de0547468e6a3e4967` is the first
docs-app revision whose canonical `test:built` proof runs the Cloudflare Vite
output under local workerd. The docs-app Nitro/Vercel preset, target selector
and `.vercel/output` harness are removed; the independent `apps/web` Nitro
owner and shared root output declarations remain. The bounded local receipt is
`docs/evidence/deployments/2026-08-09-local-bridge-retirement/receipt.json`.
It proves the local artifact and behavior contract only. It does not establish
hosted requalification for this candidate or resolve the separate report-only
Alchemy state-store boundary.

## 2026-08-10 historical b59e4ee hosted deployment epoch

The b59e4ee candidate produced claim-matched provider and hosted evidence
for isolated Preview `pr-15`, exact-stage teardown, fixed Production and a
normal source-bound rollback/redeploy. Preview and Production both use the
provider-owned workers.dev URL; the stable Production Worker identity is
retained through rollback and final redeploy. The teardown workflow's reviewed
implementation SHA is recorded separately from the removed PR candidate
because PR-close recovery intentionally executes default-branch code.

This historical epoch does not establish custom-domain/DNS routing, a paid plan or cost,
byte promotion, release/publication or future availability. The report-only
workflow's branch-bound state/provider receipt remains separate from hosted
application proof and does not advance the automation register until a
reviewed default-branch source readback exists.

The workflow contract used in this historical epoch is intentionally narrower than the application graph:
Preview and Production derive a canonical plan projection, reject unexpected
Alchemy resources on both the initial plan and equal replan, then read back the
exact stage, Worker, account/state identity, deployment, version and
pre-mutation version before running the shared hosted proof owner. The hosted
workflow output is split into a retained raw diagnostic and a strict
Schema-decoded receipt; screenshot bytes are copied into the artifact route and
their digests are recomputed. Production consumes a successful,
Schema-decoded Preview workflow receipt, exact workflow path and deterministic
`pr-N` binding rather than trusting caller-supplied source or plan fields.
The hosted command itself reads every URL, stage, digest, identity, output path,
PR number and bounded retry value through Effect Config and owning Schemas
before Chromium starts. One Playwright host adapter is wrapped by
`Effect.tryPromise`; Effect Scope and `acquireRelease` close Chromium after
success, expected failure or interruption. Its focused local tests establish
only input rejection and resource cleanup, not GitHub, provider or public
behaviour.
The mutation jobs Schema-decode the initial plan, equal replan and teardown
projection, including the operation (`preview-plan`, `preview-equal-replan`,
`production-plan`, `production-equal-replan` or `preview-destroy`), before
apply/destroy; Production also downloads and checks the
accepted Preview plan artifact. A promoted external receipt must carry a
Schema-decoded successful `main` workflow-run readback whose expected workflow
name and path/ref/head match its workflow source commit. The readback records
the exact deployment candidate input separately, and that input must match the
outer receipt's candidate: a default-branch run may build a reviewed PR head,
so these two identities are intentionally distinct. The hosted receipt must
match stage semantics with exactly one desktop and one mobile screenshot.
The current workflow adapter keeps shared evidence meanings in one closed-mode
Effect command. It calculates tracked candidate identities, calls the existing
beta.79 plan projection owner, decodes the existing state/provider inventory
and bounded Wrangler deployment JSON, and Schema-encodes plan, bootstrap,
provider and GitHub output files. The command has no Alchemy, Wrangler or
GitHub execution capability. YAML still owns environment protection,
permissions, the exact non-cancellable lock, operation choice and provider
command order.
The plan parser and its proof move together. Beta.79's upstream
`formatPlanLines` emits `Plan: no resources` for an empty plan. The current
parser admits that text only for an already-absent teardown; it rejects the
former empty-plan text. Five real sanitised plan captures
under `tools/docs-deployment/fixtures/alchemy-beta.64/` bind create, update,
no-op, delete and already-absent destroy to Alchemy `2.0.0-beta.64` and exact
upstream commit `31edd3c4b2f0f3310fad07f5423aee20cf72be8d`. Their manifest records the
GitHub run and artefact route, redaction rule and raw/final digests. Tests
strictly decode the manifest, recompute fixture digests and reject version
drift, unexpected resources, unsupported actions and malformed lines. These
retained captures prove historical beta.64 output and digest custody. Four
shared action formats also pass the current parser; the old empty-plan format
does not. Neither upstream source nor these captures prove current provider
or hosted state.
Report-only dispatch is
forced to the reviewed default branch before installing dependencies or
materialising the state bearer, while Preview rejects non-numeric PR identity
before provider bootstrap. Rollback recovery identity is bound to the accepted
Preview provider receipt.
Teardown has a target-specific preflight and exact state/Worker absence
postcondition, including a distinct Schema-decoded absence receipt for a safe
no-op; both pull-request events and manual teardown recheck that the PR is
closed. The scheduled orphan workflow is reviewer-protected and remains a
report-only/manual signal; its 1,000-row pull-request bound fails closed when
inventory completeness is unknown. These controls are desired-state and
dated-receipt owners, not claims that the current branch or public domain is
available.

## 2026-08-10 historical main-sourced deployment epoch

The historical promoted epoch is represented by the exact Preview receipt
`docs/evidence/deployments/2026-08-10-preview-pr-24/workflow-receipt-31338052297.json`,
the fixed Production/rollback receipt
`docs/evidence/deployments/2026-08-10-production-prod-fef1dfc/workflow-receipt-31343392260.json`,
the report-only receipt
`docs/evidence/deployments/2026-08-10-orphan-inventory-main-53d936/workflow-receipt-31344401196.json`,
and the reviewed-main teardown receipt
`docs/evidence/deployments/2026-08-10-preview-teardown-pr-24/workflow-receipt-31350160353.json`.
That retired graph reported four established entries. Their receipts bind
source/input, stage, plan/configuration/lockfile, Alchemy state, provider
Worker/version/URL and the relevant hosted or absence postconditions. These
are dated workers.dev and report-only observations; custom-domain/DNS, billing,
publication, release, byte-promotion and future public availability remain
outside the claim envelope.

The native `Website.Vite` successor initially reset all three automation
entries to `not-established`. Later claim-matched default-branch receipts now
establish Preview, Production and exact-stage teardown separately. Local
migration checks alone still establish none of those provider results.

## Local runtime shape

Run the API, web app and docs app as separate local processes:

```sh
bun run --filter=api dev
bun run --filter=web dev
bun run --filter=docs dev
```

`apps/api` dev runs through portless as `https://api.taxkit.localhost`.
`apps/web` dev injects that URL into `TAXKIT_API_BASE_URL` and
`VITE_TAXKIT_API_BASE_URL` before serving through portless as
`https://taxkit.localhost`. `apps/docs dev` runs the Alchemy-managed Cloudflare
lifecycle. Use `bun run --filter=docs dev:vite` for the infrastructure-free
portless app at `https://docs.taxkit.localhost`. Production deployment should provide
equivalent API base URL environment values explicitly.

The focused Cloudflare candidate proof is:

```sh
bun run --filter=docs test:built
```

It proves the emitted no-bundle Worker and assets locally under real workerd;
`test:cloudflare-built` is an explicit alias. The former Nitro/Vercel receipt
remains historical migration evidence, not a live build path. Local agreement
does not prove provider or public availability.

## Guardrails

- Do not couple engine packages to deployment providers.
- Keep provider composition at root, one resource declaration in
  `@taxkit/infrastructure`, and app build semantics in `apps/docs`.
  Do not expose a raw provider client.
- Decode stage and provider readback representations at their ingress and keep
  physical names and URLs provider-owned.
- Treat `.wrangler/**` and `apps/docs/dist/**` as ignored generated output.
- Keep normal docs requests independent of repository files. Generated
  Fumadocs raw-text access and validation policy may retain Node filesystem
  code only behind their non-runtime operations.
- Keep server-only handlers behind explicit server exports.
- Keep local, workerd, Preview, Production, provider-state, rollback and future
  domain claims separate.
- Provider mutation requires the named authority, sanitized plan/equal replan,
  stage lock, readback and receipt defined by the deployment runbook.
- Treat workflow code, protected GitHub environments, credential identities and
  dated hosted receipts as separate establishment conditions. Do not infer any
  of them from the local automation register.

## Related docs

- [API and SDK](./api-and-sdk.md)
- [Frontend](./frontend.md)
- [Testing and quality](./testing-and-quality.md)
- [Docs deployment runbook](../runbooks/docs-deployment.md)
- [Dated deployment evidence](../evidence/deployments/README.md)

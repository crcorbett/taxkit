---
document_type: package-guide
lifecycle: current
authority: supporting
owner: taxkit-infrastructure-owner
last_reviewed: 2026-10-07
review_trigger: Alchemy resource, stage, provider, state, or package-export change
---

# TaxKit infrastructure

This private source-only package owns the native API/Website graph, stage
rules and checked secret selection. Root `alchemy.apps.run.ts` selects the
native cloud candidate; `alchemy.apps.local.run.ts` owns disposable local
apps. The package has no application runtime.

The old `./stack` source-only export now supplies a typed static retirement
marker. Root `alchemy.run.ts` exports that marker; the actual Alchemy importer
refuses it before session providers, remote state and planning. Alchemy startup
still creates local logs and an empty default profile. This is a deliberate
refusal, not a successful empty resource plan.

The explicit `./stage` and `./website` exports retain pure old identity/stage
metadata for historical receipt decoding and tests. They do not declare an old
provider graph. Original `TaxKitDocsCloudflare/DocsWebsite` source and deployed
recovery IDs remain addressable through the
[retention manifest](../../docs/documentation-audit/clean-slate-foundation/2026-10-07-docs-retirement-manifest.json).
The old asset-header byte check now belongs to that verified historical-source
proof. Current Website behaviour belongs to its freshly built native tests.

Run `bun run --filter=@taxkit/infrastructure check-types` and
`bun run --filter=@taxkit/infrastructure test` for local declaration proof.
Build `api` first with `bun run --filter=api build` when its compiled export has
changed. Shared old memo values remain readonly, including nested arrays;
compiler controls and the scoped native memo fixture preserve their contract.
These checks do not plan a provider operation, deploy or prove external state.
See [deployment architecture](../../docs/architecture/deployment.md) and
[the deployment runbook](../../docs/runbooks/docs-deployment.md).

## Native API/Website candidate

The explicit source-only `./apps-stack` and `./apps-secrets` exports are consumed
by `alchemy.apps.run.ts`. This candidate declares `TaxKitAppsCloudflare` with
`TaxKitApi` and `TaxKitWebsite`; the old `alchemy.run.ts`
operation refuses. The native provider procedure remains DEV-81 work.

The graph consumes the API app's `api/worker` export, provides its live native
entry once and binds the website privately to that same API resource as
`TAXKIT_API`. Each host receives its own address from native `Worker.URL` and
the other address from the peer's native Output. Absent peer URLs become null,
not invented addresses; runtime application Config remains the checked ingress.
The Website candidate now consumes the binding and checked public API origin.
The graph supplies origins, the native binding and an explicit host mode; it does not copy origins
into Vite browser build constants. The Website's native pair test covers local
runtime use. T003's local connection/containment review is complete; exact
candidate hosted readback and safe exported tracing remain separate proof.

Root native secret selection checks the existing `prod`, `pr-N` and
`dev_identity` stage rules. It selects Doppler project `taxkit`, respectively
`prd`, `stg_preview` and `dev`. The explicit disabled `Secrets.ProcessEnv`
entry prevents ambient application settings overriding that selection. Native
credential/profile selection remains upstream-owned. Do not combine this root
with `--env-file`: native Stack rejects that conflict before secret access.
No current docs secret-fetch or deployment procedure is redirected to this root.

The exact Alchemy beta.80 planner patch defers resource Outputs before walking
fresh or circular resource properties. Otherwise resolving API → Website → API
waits on its own cached work forever. The patch covers the selected source and
compiled entry points plus their generated source map. The native planner still
rejects cycles lacking `precreate`; provider diff and Apply remain upstream-owned.
Remove or requalify the patch when upstream fixes this exact defect.

The tests run native Stack/Plan with memory state and an explicit mock provider.
Credential/profile reads, network calls and provider writes fail if attempted.
They prove bounded first-create/no-change/update classification, the exact
private peer resource, self URLs, fresh Output evaluation, absent addresses and
secret precedence with a fixture replacing Doppler. They do not establish real
Cloudflare diff convergence, Doppler retrieval, cloud state or deployment.
See the [dated graph receipt](../../docs/documentation-audit/clean-slate-foundation/2026-10-05-native-app-graph.json).

## Disposable local apps

`alchemy.apps.local.run.ts` uses the same `declareNativeAppsStack` resource
graph with `Alchemy.localState()`. Its native context check rejects operations
other than development, remote provider mode and stages outside
`dev_native_apps` / `dev_native_apps_proof` before declaring either resource.
The root `dev` command supplies an empty owned env file and an isolated
`ALCHEMY_HOME`; it does not construct the cloud stack or Doppler secrets.
Native resources own the addresses, bindings and local Worker/Vite lifetimes.
The [Website README](../../apps/web/README.md) owns contributor setup and the
saved real-CLI development test. Local state is disposable development evidence,
not cloud provider or deployment proof.

## Calculator platform records

The API app export owns `ApiWorkerObservability`. The native apps graph uses it
for the API and declares the Website's separate disabled settings. Global
collection, invocation logs, stored logs and traces are all explicitly disabled,
with zero sampling. Omitting these properties would select Alchemy's default
invocation logs, which can contain caller URLs outside the app's fixed reporter.

Native mock plans and saved real local CLI state must both contain those settings.
Removing the API graph settings fails the saved local-state check. This proves
the declared local policy, not a Cloudflare upload or exported data. The
standalone Website's `wrangler.jsonc` carries matching disabled settings. The
existing docs app keeps its own policy. T009 still owes safe exported tracing;
disabling collection does not complete that requirement.


## Native calculation limiter configuration

`NativeAppsHostMode` defaults to `edge`. The graph binds that mode to both native
apps as `CALCULATOR_HOST_MODE`. The API app's native admission Layer registers
one 60/60 RateLimit binding and captures required checked
`CALCULATOR_RATE_NAMESPACE` through Alchemy's own Config/runtime bridge. A stage
operator must select an account-wide unique positive decimal value before any
authorised cloud plan/apply. No provider value or credential is selected here.

The guarded disposable root supplies `local-emulator` and isolated local
namespace `10075`. It cannot select a cloud stage or provider mode. API and
Website additionally require an HTTP loopback API origin before using their one
shared local allowance. Native graph tests keep create/no-change/update checks
and forbid provider writes. Their saved state uses Alchemy's own packed
Config representation, including the captured namespace, rather than omitting
new native settings from the no-change fixture.

The existing docs deployment runbook owns `DocsWebsite` only. It does not
authorise or supply an API/Website deployment procedure; T010/DEV-81 must settle
that operation's candidate, namespace readback, receipt and rollback before
provider approval. Local limiter tests cannot establish real edge or cloud state.

---
document_type: package-guide
lifecycle: current
authority: supporting
owner: taxkit-infrastructure-owner
last_reviewed: 2026-10-05
review_trigger: Alchemy resource, stage, provider, state, or package-export change
---

# TaxKit infrastructure

This private source-only package owns the current docs graph and the separate
API/Website candidate graph. Root `alchemy.run.ts` selects the Cloudflare provider
and state store, decodes the stage, and calls `declareDocsStack`. The docs app
owns Vite and the Worker code; it does not depend on this package.

Its explicit `./stage`, `./website` and `./stack` exports remain source-only:
callers need the repository's TypeScript-aware Alchemy/Bun toolchain. Shared
memo settings are readonly, including nested workspace arrays. The stack gives
Alchemy fresh arrays at the provider input because its current types require
writable arrays; callers must also copy these arrays before using a writable
provider input. Values, source selection and cache invalidation are preserved.

The stack keeps `TaxKitDocsCloudflare`, `DocsWebsite`, `dev_<user>`,
`pr-N` and `prod` stable. It has no runtime binding, custom domain,
database or Axiom resource. Deployment admission, state/provider readback and
receipts live in `tools/docs-deployment`.

Run `bun run --filter=@taxkit/infrastructure check-types` and
`bun run --filter=@taxkit/infrastructure test` for local declaration proof.
Build `api` first with `bun run --filter=api build` when its compiled app export
has changed. The root `bun run test` already builds dependency exports; a direct
package test does not. An older compiled API export cannot qualify a source edit.
The test command uses Bun-hosted Vitest and the native Effect runner. It checks
stage acceptance/rejection, bounded log settings and the actual app-owned asset
header file through native file/path services. Compiler controls require both
top-level and nested memo arrays to remain readonly. Canonical strict rules
cover all package source/tests, with no test runtime execution permission.
These commands do not plan, deploy or prove provider state. See
[`docs/architecture/deployment.md`](../../docs/architecture/deployment.md)
and [the deployment runbook](../../docs/runbooks/docs-deployment.md).


## Native API/Website candidate

The explicit source-only `./apps-stack` and `./apps-secrets` exports are consumed
by `alchemy.apps.run.ts`. This candidate declares `TaxKitAppsCloudflare` with
`TaxKitApi` and `TaxKitWebsite`; current docs operations still select
`alchemy.run.ts` and `TaxKitDocsCloudflare`.

The graph consumes the API app's `api/worker` export, provides its live native
entry once and binds the website privately to that same API resource as
`TAXKIT_API`. Each host receives its own address from native `Worker.URL` and
the other address from the peer's native Output. Absent peer URLs become null,
not invented addresses; runtime application Config remains the checked ingress.
The Website candidate now consumes the binding and checked public API origin.
The graph supplies only three Website runtime values; it does not copy origins
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

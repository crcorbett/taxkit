---
document_type: package-guide
lifecycle: current
authority: supporting
owner: taxkit-infrastructure-owner
last_reviewed: 2026-10-18
review_trigger: Alchemy resource, stage, provider, state, or package-export change
---

# TaxKit infrastructure

This private source-only package owns the native Website/API graph, stage
rules, native secret selection, the retained PostHog project and the
production-only telemetry stacks. Root `alchemy.run.ts` deploys the pair;
`alchemy.local.run.ts` runs it locally; `alchemy.posthog.run.ts` owns the
PostHog project; `alchemy.axiom.run.ts` and `alchemy.trace.run.ts` own the
Axiom and Cloudflare telemetry resources. Root `alchemy.apps.ts` joins the lightweight native declaration with the API
implementation; this package imports no application implementation.

| Export | Owns |
| --- | --- |
| `./apps-stack` | `declareNativeAppsInfrastructure` declares retained Production resources; `declareNativeAppsHosts` declares the Website using a supplied API Worker; `nativeApiHostProps` owns native API deployment settings. |
| `./api-worker` | Lightweight `TaxKitApiWorker` declaration and native-derived `TaxKitApiBinding`, with the native HTTP binding. |
| `./hostnames` | `HostName` and every Production hostname (`taxkit.dev`, `www.taxkit.dev`, `api.taxkit.dev`), written once with the derived `publicationOrigin`. Provider-free. |
| `./worker-settings` | Shared compatibility date/flags and `disabledWorkerObservability` policy. |
| `./secrets` | `deploymentSecrets`, the checked stage and its Doppler config. |
| `./stage` | Local `dev_<name>` stage and the `AppStage` union. Hosted `prod` and `pr-<number>` stages reuse [`@taxkit/observability/stage`](../observability/README.md). |
| `./posthog` | The retained PostHog project stack. |
| `./telemetry` | The `TaxKitObservability` and `TaxKitTraceExport` stack classes, their shared providers, state and secrets, the `prod`-only guard, Site's shared dataset names and the Production trace-export reference the apps graph reads. |
| `./axiom` | `declareTaxKitObservability`: the retained ingest token and four dashboards. |
| `./trace-export` | `declareTaxKitTraceExport`: the retained log and trace destinations. |

Run `bun run --filter=@taxkit/infrastructure test` and `bun run check-types`
for local declaration checks. The root graph proof is `tools/infrastructure/apps-stack.test.ts`, run with
`bun run test:tools`. These checks use memory state and refuse provider writes;
they do not plan against Cloudflare or deploy. See the
[deployment architecture](../../docs/architecture/deployment.md) and
[deployment runbook](../../docs/runbooks/deployment.md).

## Website/API graph

Root `alchemy.apps.ts` composes `TaxKitApiWorker.make` with the API-owned
`ApiWorkerNativeInit` and its `api/worker` entry. The infrastructure package owns
the lightweight native declaration without importing the app. The Website receives
the API's address Output and the private `TAXKIT_API` binding. Each host binds
its own address with native `Worker.URL`; absent addresses stay null and fail
the application's checked Config instead of being guessed. Local servers use
fixed strict ports (Website 3220, API 3221) so their addresses cannot swap across
restarts. An occupied port stops startup. The native development test checks the
actual API link and calculation target after live reload. Both receive the
fixed publication address `https://taxkit.dev`, derived from `./hostnames`
like the Production zone and custom domains. After both declarations, native
`api.bind("WebsiteOrigin", ...)` supplies the Website address to the API for MCP
browser admission. The installed native Worker provider resolves this address
cycle using precreation or existing attributes; no guessed address or planner
patch is needed. Graph tests cover creation, no change, updates and refusal
when a provider has no precreation support.

Both Workers declare version-scoped native caching. The Website's
`websiteBuildMemo` hashes shared package sources, manifests and authored
content, not tests, READMEs or CHANGELOGs; see the
[deployment architecture](../../docs/architecture/deployment.md#caching). In `prod` both
Workers export console logs only, at sampling rate 1, to the
`taxkit-axiom-logs` destination read from `TaxKitTraceExport/prod`; invocation
logs, Cloudflare persistence and traces stay off. Every other stage disables
all platform channels with `disabledWorkerObservability`.

`NativeAppsHostMode` defaults to `edge`. The API's admission Layer registers one
60-per-60-second RateLimit binding and reads `CALCULATOR_RATE_NAMESPACE` through
Alchemy's Config bridge. `deploymentSecrets` supplies `10078` for Production
and `10078<pr-number>` for each Preview, so stages never share counters.

In `prod` the graph adopts and retains the `taxkit.dev` zone, its DNS settings
five zone settings (TLS, HTTPS, Browser Integrity Check and security level),
DNSSEC and a bot policy that bans no user agent, as in Common Practice, attaches `taxkit.dev` (with a native `www.taxkit.dev`
redirect) to the Website and `api.taxkit.dev` to the API. Neither
Production Worker has a `workers.dev` address; Local and Preview graphs declare no
domains and keep their stable `workers.dev` address without version previews.
The native redirect provider treats a failed shared-ruleset read as absence;
the focused provider test records that limit.

## Local development

`alchemy.local.run.ts` uses the same graph with `Alchemy.localState()`. It
refuses anything other than `alchemy dev` in local provider mode at stage
`dev_native_apps` or `dev_native_apps_proof`, sets the `local-emulator` host
mode and the local rate namespace `10075`, and uses no Doppler or Cloudflare
credentials.

## Private Website calculation forwarding

One native `Alchemy.Random` resource, `TaxKitWebsiteForwardingKey`, owns 32
random bytes per stack/stage. Its redacted hex Output is bound as
`TAXKIT_WEBSITE_FORWARDING_KEY` to both Workers. Ordinary deploys preserve its
state identity. Hosted Alchemy state owns this key; Doppler continues owning
deployment credentials. Local development uses its isolated native local state.
The key is resolved through native runtime Config only when a calculation needs
it, never from deploy-time Doppler configuration. During an explicit rotation,
the API alone may bind `TAXKIT_WEBSITE_FORWARDING_PREVIOUS_KEY` to the previous
Random Output and accept either checked key. The Website sends the current key
only; a malformed previous binding fails forwarded admission closed. Normal
deployments declare no previous binding or additional key resource.

Only the Website server's canonical calculation POST adds the credential and
checked original caller key. The native Fetcher/HttpClient adapter carries the
generated HTTP contract to the API's default fetch host. The Website host sets
standard native `RequestInit.redirect: "manual"` before binding dispatch, so
redirect replies cannot replay the credential or original IP on another URL.
The generated client rejects undeclared redirect responses; no HTTP-over-RPC
method or legacy MCP Durable Object remains. Public HTTP, RPC, modern MCP and public
reads require no forwarding credential. Both hosts keep `nodejs_compat` for the
API's native constant-time verifier. The
[deployment runbook](../../docs/runbooks/deployment.md) owns deliberate key
rotation, old/new overlap and rollback. Rotation first introduces a new native
Random identity, binds the former Output to the API's previous-key field and
updates both current-key bindings with the API deployed before the Website.
After both hosts and old/new admission are verified, a second native update
removes the previous-key binding. Preserve the former resource/state for the
qualified rollback interval. Changing Random's byte count does not rotate an
existing value. Memory graph and boundary tests do not establish a successful
live rotation.

## Production telemetry stacks

Common Practice's split applies. Site's `CooperCorbettSiteCloudflare/prod`
stack owns the three shared Axiom datasets; TaxKit reads them by name for token
capabilities and dashboard queries, and through `Axiom.Dataset.ref` for the
destination endpoints. Two stacks with their own native Cloudflare state own
TaxKit's part, and both refuse every stage but `prod` before declaring a
resource:

- `TaxKitObservability` declares the retained `TaxKitTelemetryIngest` token
  (`taxkit-telemetry-ingest`, `ingest:create` only on `site-prod-logs`,
  `site-prod-traces` and `site-prod-metrics`) and four retained dashboards.
  Dashboard queries read only TaxKit's records in `site-prod-logs`, filtered
  by the `taxkit-api` and `taxkit-web` services, with the names
  `@taxkit/observability/host-telemetry` emits. Its output is the dashboard count.
- `TaxKitTraceExport` declares the retained `taxkit-axiom-logs` and
  `taxkit-axiom-traces` destinations. Each reads the token through
  `Axiom.ApiToken.ref` and sends it as a bearer header with `X-Axiom-Dataset`.
  Its outputs are the two names only; headers and destination configuration
  never become outputs.

Both use `Cloudflare.providers()`, `Axiom.providers()`, `Cloudflare.state()`
and `deploymentSecrets`, so the Axiom provider reads the TaxKit management key
`AXIOM_TOKEN` from `taxkit/prd`. It is an organisation API token, so no
organisation ID is set. Native state holds the ingest token value; treat it as
secret.

`telemetry.test.ts` compiles both stacks with memory state and write-refusing
providers. It checks the `prod`-only refusal, the planned and retained
resources, the token's exact capabilities, the dashboards' dataset and service
filters and absent URL/header/calculation fields, the destinations' datasets,
endpoints and bearer header from a synthetic token, and the name-only outputs.
`apps-stack.test.ts` checks the Production Workers' logs-only settings and that
a Production plan fails before the trace-export stack exists.

## Retained PostHog project

The explicit source-only `./posthog` export composes `alchemy.posthog.run.ts`.
The separate durable `TaxKitPostHog` stack accepts only `prod` and declares
one `TaxKitProject`, with display name `TaxKit` and exact ownership marker
`taxkit:posthog:shared:v1`. It uses the fixed US management host. Production
and deliberate controlled Previews share this project; each event retains its
checked application and exact stage for report filters. Filters do not isolate
access to events within the project. Neither PR nor local stages declare
projects. Native secrets select only `taxkit/prd`, with ambient app settings
disabled. Required `POSTHOG_ORGANISATION_ID` is a checked organisation identity;
`POSTHOG_MANAGEMENT_KEY` is a checked redacted personal management key.
Neither has a default. No credentials have been established by this candidate.

The private Distilled adapter exposes four closed project operations. It checks
every list page, count, identity and next destination, then reads every listed
project because the current SDK's list omits the ownership marker. Unrelated
nullable names and old token formats remain valid inventory. A matching name
without the exact marker is foreign; multiple matches, a missing page, changed
count, duplicate identity, forbidden read or vanished list item stop creation.
Inventory is capped at 1,000 projects, 20 pages and 30 seconds. One native HTTP
attempt reads at most 1 MiB; redirects refuse, credentials omit browser state,
and tracing is disabled. A project read has a complete five-second deadline.

Create runs under one Layer-owned write permit with a 75-second whole-operation
bound. A failed or uncertain create reads ownership again before any later
write; it never automatically repeats POST. Update checks ownership first,
changes only the managed name and ten supported privacy controls, and reads
back the same ID and capture key. Update is bounded to 15 seconds. Missing
retained projects and changed ownership refuse rather than silently replacing
history. The native removal policy retains; provider delete additionally
refuses even a forced call, and the bulk-delete scan skips this resource type.
Removing tracking state is not deletion of the retained provider project.

Alchemy requires error-free provider registration. The private live
provider Layer therefore defers fallible management acquisition to its first
lifecycle call and caches one Layer within the native stack's scope. Missing
or invalid keys remain named typed failures; no nested runtime or `orDie` is
introduced. Starting another native CLI run reacquires configuration.

The deterministic management Layer is test-only and is excluded only from the
Production unused-code inventory. It remains typechecked and linted. Controlled
SDK HTTP, native request-abort checks, a real loopback redirect, and native memory-state plans cover this
candidate. These are neither project capacity, credential-scope nor provider
change proof. Cross-process creation races remain a limitation of the provider
API; duplicate ownership fails on a subsequent complete inventory. The app stack still collects off
and has no PostHog project reference or management credentials in its bindings.
Browser sender choice, capture wiring, stored-event readback and any real
operation remain separately tracked T008 work. Metrics remain deferred.


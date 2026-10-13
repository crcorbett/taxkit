---
document_type: package-guide
lifecycle: current
authority: supporting
owner: taxkit-infrastructure-owner
last_reviewed: 2026-10-13
review_trigger: Alchemy resource, stage, provider, state, or package-export change
---

# TaxKit infrastructure

This private source-only package owns the native Website/API graph, stage
rules, native secret selection, the retained PostHog project and the
production-only telemetry stacks. Root `alchemy.run.ts` deploys the pair;
`alchemy.local.run.ts` runs it locally; `alchemy.posthog.run.ts` owns the
PostHog project; `alchemy.axiom.run.ts` and `alchemy.trace.run.ts` own the
Axiom and Cloudflare telemetry resources. The package has no application
runtime.

| Export | Owns |
| --- | --- |
| `./apps-stack` | `declareNativeAppsStack`: `TaxKitApi`, `TaxKitWebsite` and, in `prod`, the retained zone, DNS settings and zone settings (`productionZoneSettings`). |
| `./secrets` | `deploymentSecrets`, the checked stage and its Doppler config. |
| `./stage` | Stage Schemas: `prod`, `pr-<number>` and `dev_<name>`. |
| `./posthog` | The retained PostHog project stack. |
| `./telemetry` | The `TaxKitObservability` and `TaxKitTraceExport` stack classes, their shared providers, state and secrets, the `prod`-only guard, Site's shared dataset names and the Production trace-export reference the apps graph reads. |
| `./axiom` | `declareTaxKitObservability`: the retained ingest token and four dashboards. |
| `./trace-export` | `declareTaxKitTraceExport`: the retained log and trace destinations. |

Run `bun run --filter=@taxkit/infrastructure test` and `bun run check-types`
for local declaration checks. They use memory state and refuse provider writes;
they do not plan against Cloudflare or deploy. See the
[deployment architecture](../../docs/architecture/deployment.md) and
[deployment runbook](../../docs/runbooks/deployment.md).

## Website/API graph

The API is declared first from the `api/worker` export. The Website receives
the API's address Output and the private `TAXKIT_API` binding. Each host binds
its own address with native `Worker.URL`; absent addresses stay null and fail
the application's checked Config instead of being guessed. Both receive the
fixed publication address `https://taxkit.dev`. Nothing in the API depends on
the Website, so unpatched Alchemy plans the graph without a binding cycle.

Both Workers declare version-scoped native caching, and the Website's build memo
includes the shared packages so content changes rebuild it. In `prod` both
Workers export console logs only, at sampling rate 1, to the
`taxkit-axiom-logs` destination read from `TaxKitTraceExport/prod`; invocation
logs, Cloudflare persistence and traces stay off. Every other stage disables
all platform channels with `ApiWorkerObservability`.

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

## Native older-client conversation host

The API app's native composition registers `TaxKitMcpSessions`. The SDK adds its
Durable Object export and binding to the actual API resource. The Website does
not export this class. Graph tests check this distinction in their memory-only
create/no-change/update cases; no namespace ID or provider setting is invented.
The app owns one fixed-name host per stage, with bounded in-memory conversations
and native alarm expiry. Only alarm bookkeeping uses storage. The
[API owner](../../apps/api/README.md#native-remote-calculator-tools)
explains limits, private original-key forwarding, separate instance pools and
the documented modern five-second cancellation limit.

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
  `@taxkit/api-rpc/host-telemetry` emits. Its output is the dashboard count.
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


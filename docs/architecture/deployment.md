---
document_type: architecture
lifecycle: current
authority: canonical
owner: taxkit-architecture-owner
last_reviewed: 2026-10-13
review_trigger: Alchemy graph, stage, provider resource, state, domain, cache or rollback change
---

# Deployment

This owner describes the deployed resources and their boundaries. The
[deployment runbook](../runbooks/deployment.md) holds the commands.

## Website and API pair

`alchemy.run.ts` declares the `TaxKitAppsCloudflare` stack with Cloudflare
providers, `Cloudflare.state()` and the native secrets in
`@taxkit/infrastructure/secrets`. `@taxkit/infrastructure/apps-stack` declares:

| Resource | Owner | Notes |
| --- | --- | --- |
| `TaxKitApi` | native Effect Worker from `api/worker` | Its own address from `Worker.URL`. Production serves only `api.taxkit.dev`, with no `workers.dev` address; other stages keep the native `workers.dev` default. |
| `TaxKitWebsite` | `Cloudflare.Website.Vite` for `apps/web` | Its own address from `Worker.URL`; the API's address Output and the private `TAXKIT_API` binding. Production serves only `taxkit.dev`, with a native `www.taxkit.dev` redirect and no `workers.dev` address; other stages use their stable `workers.dev` address. No stage has version preview addresses. |
| `TaxKitProductionZone` | adopted and retained in `prod` only | Never created, replaced or deleted by the stack. |
| `TaxKitProductionDnsSettings` | retained in `prod` only | Matches the 7 October readback; registrar and records are not managed. |
| `TaxKitProduction*` zone settings | retained native `Cloudflare.Zone.Setting` in `prod` only | TLS 1.3 on with a TLS 1.2 minimum, Always Use HTTPS on, Browser Integrity Check off (it answers script user agents with error 1010) and the lowest security level, as in Common Practice. Retained: removing a setting from the stack leaves its live value in place. |
| `TaxKitProductionDnssec` | retained native `Cloudflare.DNS.Dnssec` in `prod` only | Signing active; Cloudflare Registrar publishes the DS record. |
| `TaxKitProductionBotManagement` | retained native `Cloudflare.BotManagement` in `prod` only | Bans no user agent: no Bot Fight Mode, AI-bot, crawler or content-bot blocking, and no Cloudflare-managed robots.txt. |

The graph is one-way: the API is declared first and has no Website address or
binding. Published pages and discovery documents use the fixed Production
publication address `https://taxkit.dev` (`TAXKIT_PUBLICATION_ORIGIN`) in every
stage. API endpoint entries in discovery documents use that stage's own API
address. The unpatched Alchemy planner plans this graph without a cycle.

`alchemy.local.run.ts` declares the same graph for local development in the
`dev_native_apps` stage with local state and local Worker emulation.

## Secrets and stages

`deploymentSecrets` decodes the stage first, then reads Doppler project `taxkit`
(`prd` for `prod`, `stg_preview` for `pr-<number>`, `dev` for `dev_*`), then an
ignored `.env`, and disables the shell environment. Each deployed stage gets a
separate calculator rate-limit namespace: `10078` for Production and `10078`
followed by the pull-request number for Preview. The stack name, stages and
resource IDs are the existing state identity and must not be renamed.

## Caching

Both Workers declare native Cloudflare Workers Cache scoped to their deployed
version: the API with `Cloudflare.cache({ crossVersionCache: false })` in its
native init and the Website with `cache: { enabled: true, crossVersionCache: false }`.
Response headers choose what is public; see the
[frontend](./frontend.md) and [API and SDK](./api-and-sdk.md) owners. Authored
content is an input to both Worker builds (the API bundles the public catalogue;
the Website memo includes the shared packages), so a content-only change
deploys new versions of both and starts new caches. Native gitignore rules do
not reach the memo's `../../packages/**` paths, so the stack names those
excludes itself; without them the hash follows linked `node_modules` into the
package store (about 1.2 million files) and the deploy runs out of memory.

## Observability

Production telemetry follows Common Practice's split. Site's production stack
(`CooperCorbettSiteCloudflare/prod`) owns the three shared Axiom datasets in the
Axiom Personal organisation: `site-prod-logs`, `site-prod-traces` and
`site-prod-metrics`. TaxKit references them and never declares, adopts or
changes them. Two production-only stacks, each with its own native Cloudflare
state, own TaxKit's part:

| Stack and entry point | Resource | Owner and policy |
| --- | --- | --- |
| `TaxKitObservability/prod` (`alchemy.axiom.run.ts`) | `TaxKitTelemetryIngest` | Retained `Axiom.ApiToken` named `taxkit-telemetry-ingest`, with `ingest:create` only on the three shared datasets. Axiom has no token update API: a changed prop replaces it and leaves the old token live for deliberate revocation. |
| `TaxKitObservability/prod` | `TaxKitRequestOverview`, `TaxKitRequestFailures`, `TaxKitRequestLatency`, `TaxKitTelemetryHealth` | Retained `Axiom.Dashboard`s (`taxkit-request-overview`, `taxkit-request-failures`, `taxkit-request-latency`, `taxkit-telemetry-health`). Every query reads `site-prod-logs` and filters to the `taxkit-api` and `taxkit-web` services. |
| `TaxKitTraceExport/prod` (`alchemy.trace.run.ts`) | `TaxKitAxiomLogs` | Retained `Cloudflare.Workers.ObservabilityDestination` named `taxkit-axiom-logs`: OTLP logs to Site's logs dataset, with the ingest token as its bearer header and `X-Axiom-Dataset`. Its outputs are the two destination names only. |
| `TaxKitTraceExport/prod` | `TaxKitAxiomTraces` | Retained destination named `taxkit-axiom-traces` for Site's traces dataset. No Worker attaches it (see below). |

Both stacks use `@taxkit/infrastructure/telemetry` for providers, state and
the ordinary native secrets, and refuse every stage but `prod`. The Axiom
provider reads the TaxKit management key `AXIOM_TOKEN` from `taxkit/prd`.

The Production API and Website read `TaxKitTraceExport/prod`'s persisted
outputs, so a Production plan fails until that stack exists. Each Production
Worker enables Workers logs at sampling rate 1, exports them to
`taxkit-axiom-logs`, and keeps invocation logs, Cloudflare log persistence and
automatic traces off. Every other stage keeps every platform channel off with
zero sampling (`ApiWorkerObservability`), so Preview and local runs export
nothing.

What leaves a Worker is therefore only its own console output: one fixed
`taxkit.request` record per request (service, closed route family, method,
outcome, status and status class, and response-ready time from the Workers
clock) and fixed `*.runtime.event` lines carrying service, level and time. The
Worker name and version arrive in Cloudflare's log envelope. Tax facts,
salaries, calculation inputs and results, report contents, URLs and query
strings, headers, cookies, IP addresses, rate keys, bodies and raw error
messages or causes are never fields. See
[ADR 0004](../adr/0004-limit-operational-observations.md).

Cloudflare's automatic traces record the full request URL with its query
string (`url.full`) and the user agent, and invocation logs can carry request
headers and caller details, all outside those fixed fields. TaxKit keeps them off, as Common Practice does for its
privacy-sensitive tracking Worker; its public Website and API enable them. No
supported setting removes those fields, so the trace destination exists ready
but unattached. Uncaught exceptions and framework console output still bypass
the fixed logger; check stored rows after each Production release (see the
runbook). Custom metrics are not sent.

## Retained analytics project

`alchemy.posthog.run.ts` composes the private infrastructure `./posthog` export.
`TaxKitPostHog/prod` owns one retained `TaxKitProject` identity. The project is
declared only for `prod` and its provider never deletes it. PostHog collection
remains postponed; the app graph references no analytics project. The
[infrastructure guide](../../packages/infrastructure/README.md) owns its details.

## Known limit

The native redirect provider treats a failed read of the zone's shared redirect
ruleset as an empty ruleset, and uploads the Worker before writing the redirect
rule. See the runbook's known limits before another owner adds redirect rules
to the zone.

## Related owners

- [Package ownership](package-ownership.md)
- [Configuration](configuration.md)
- [Testing and quality](testing-and-quality.md)
- [Dated deployment evidence](../evidence/deployments/README.md)

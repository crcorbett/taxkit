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
| `TaxKitApi` | native Effect Worker from `api/worker` | Its own address from `Worker.URL`; `api.taxkit.dev` in Production. |
| `TaxKitWebsite` | `Cloudflare.Website.Vite` for `apps/web` | Its own address from `Worker.URL`; the API's address Output and the private `TAXKIT_API` binding; `taxkit.dev` with a native `www.taxkit.dev` redirect in Production. |
| `TaxKitProductionZone` | adopted and retained in `prod` only | Never created, replaced or deleted by the stack. |
| `TaxKitProductionDnsSettings` | retained in `prod` only | Matches the 7 October readback; DNSSEC, registrar, TLS and records are not managed. |

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

Both Workers disable Cloudflare invocation logs, stored logs and traces, because
platform records can include caller URLs. Application diagnostics use fixed
safe fields only; see [ADR 0004](../adr/0004-limit-operational-observations.md).

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

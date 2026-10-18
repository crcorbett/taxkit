---
document_type: architecture
lifecycle: current
authority: canonical
owner: taxkit-configuration-owner
last_reviewed: 2026-10-18
review_trigger: config Schema, namespace, source selection or secret handling change
---

# Configuration

TaxKit configuration uses Effect `Config`, `ConfigProvider` and Schema.
Package-owned runtime contracts define reusable schemas. Apps compose those
schemas into runtime-specific configs and provide values from their own
environment sources.

## Ownership

Packages that own a runtime contract MUST export the reusable config Schema,
type and config fragments for that contract. If the package owns a public env
namespace, such as `SERVICE_*`, the package config fragment MUST own that
namespace too.

Apps MUST define runtime-specific config modules that compose package schemas
with app-local settings. Those modules own config sources such as process env
or Worker bindings, app-local defaults and runtime-specific provider selection.
They must not re-declare package-owned config keys or prefixes.

## Operator credentials

Doppler project `taxkit` holds operator-set credentials:

| Config | Used by | Values |
| --- | --- | --- |
| `prd` | the `prod` stage | Cloudflare account and Production token |
| `stg_preview` | `pr-<number>` stages | Cloudflare account and Preview token |
| `dev` | other `dev_*` stages of `alchemy.run.ts` | Cloudflare account and development token |
| `ci` | the Checks workflow | Turbo team and token |

`deploymentSecrets` in `@taxkit/infrastructure/secrets` decodes the stage first
(an unsupported stage fails with a fixed Config error before any credential is
read), then reads the stage's Doppler config, the stage's calculator rate-limit
namespace and an ignored `.env`; the shell environment is disabled. Deployment
commands run locally; the [deployment runbook](../runbooks/deployment.md) owns
how to pass the Doppler login. The Checks workflow reads `ci` through the
Doppler action, checks the project and config names and passes only the Turbo
values to its steps.

`alchemy.local.run.ts` runs only local emulation at the `dev_native_apps`
stage, with local state and no Doppler. The root `bun run dev` command sets an
isolated `ALCHEMY_HOME` and an empty env file
(`tools/apps-local/no-local-env`), so ambient `.env` values do not reach the
apps.

Host-created values, GitHub event data, portless values and Alchemy state
credentials stay with their own owners.

## Website settings

[Website server settings](../../apps/web/src/lib/config.server.ts) read only
the Website's own keys from the Worker bindings, through Alchemy's
`reifyBoundConfigProvider` over the selected keys:

- `WEBSITE_PUBLIC_ORIGIN`: the Website's own native `Worker.URL`.
- `API_PUBLIC_ORIGIN`: the API resource's address Output.
- `TAXKIT_PUBLICATION_ORIGIN`: the fixed Production site `https://taxkit.dev`,
  used for canonical and publication links in every stage.
- `CALCULATOR_HOST_MODE`: `edge` by default; the local root sets
  `local-emulator`.
- `TAXKIT_WEBSITE_FORWARDING_KEY`: private stage-owned native Alchemy Random
  Output, read only when a canonical server calculation POST executes.
- `POSTHOG_*`: analytics relay settings, read through the analytics package's
  Config. The current graph binds none, so the relay reports off.

Each origin is read with `Config.schema` and its owning Schema; deferred or
missing outputs do not become guessed URLs. `TAXKIT_API` is a native service
binding, not string configuration: an owning Schema checks the object
(`fetch`, `connect`) separately and keeps its receiver. The Website's narrow
host adapter enforces standard manual redirects, preserving the native signal
and receiver before the stock Alchemy HTTP conversion. The API verifies the
current key, or an explicitly configured previous key during rotation, before
accepting the separately decoded caller IP. Both headers are stripped before
domain dispatch. Neither credential reaches public settings, browser clients,
cached reads, machine RPC or MCP. Doppler owns deployment credentials; generated
forwarding-key custody remains in stage-scoped Alchemy state.
Settings errors contain only fixed safe fields.

## Browser configuration boundary

The root loader encodes the public settings (API, Website and publication
origins) into its loader data. The root route restores them and seeds
`publicSettingsAtom`, which stays alive for the registry's lifetime and gives
the browser `ApiClient` its base URL. No binding, credential or Effect Context
reaches the browser.

[Vite configuration](../../apps/web/vite.config.ts) sets `envPrefix: []`. There
is no build-time origin constant or browser ambient environment read. The local
Wrangler fixture owns test names/origins and generated Worker types; the apps
graph owns runtime bindings.

## API settings

The [HTTP package config owner](../../packages/api/http/src/config.ts) exports
`TaxKitHttpApiClientConfigSchema`, its derived type and keyed server/browser
config fragments under the `TAXKIT_API` and `VITE_TAXKIT_API` namespaces. Its
Schema uses `Schema.URLFromString`. The Website does not use it.

[API app config](../../apps/api/src/config.ts) checks the standalone host and
port: optional `API_PORT` falls back to `PORT` only when absent, and an invalid
supplied value remains an error.

The native API Worker reads `API_PUBLIC_ORIGIN` (its own `Worker.URL`) and
`TAXKIT_PUBLICATION_ORIGIN` through `apps/api/src/worker.config.ts` and the
origin Schemas in the app's `schemas.ts`. Native planning leaves resource
addresses deferred; first incoming use decodes and caches them. Missing or
invalid values produce a fixed Config error and an empty 503. The API reads no
Website address. `CALCULATOR_RATE_NAMESPACE` comes from the stage's secrets
provider.

Configuration modules own defaults and selection. Service contracts receive
canonical checked values. Raw credentials use `Schema.RedactedFromValue` at
string ingress; unwrap only at final construction of the private provider
client, never merely for a brand or diagnostic.

## Retained analytics project configuration

The separate `TaxKitPostHog/prod` stack reads only `taxkit/prd`. Its checked
`POSTHOG_ORGANISATION_ID` and redacted `POSTHOG_MANAGEMENT_KEY` have no defaults;
the US management host is fixed in the private adapter. Management credentials
are deployment-only and never Worker bindings or browser settings. The
[infrastructure owner](../../packages/infrastructure/README.md#retained-posthog-project)
describes the project. Application analytics are off.

## Platform logging and tracing

`apps/api/src/worker.ts` owns the disabled platform collection policy
(`ApiWorkerObservability`); `packages/infrastructure/src/apps-stack.ts` gives
it to both Workers in every stage but `prod`. Production Workers export only
their console logs to the `taxkit-axiom-logs` destination and keep invocation
logs, Cloudflare persistence and traces off, because those platform records
contain caller URLs, headers and caller details outside the fixed application
fields. The [deployment owner](deployment.md#observability) lists the
resources and exported fields.

## Guardrails

- MUST export schemas, types and keyed config fragments from package config
  entrypoints.
- Package config fragments MUST own package-specific config namespaces and env
  prefixes such as `SERVICE` or `VITE_SERVICE`.
- MUST compose package schemas from app-owned `config.server.ts` and
  `config.client.ts` modules when runtime values differ. Apps should spread
  package config fragments instead of re-declaring package-owned keys or
  prefixes.
- Apps SHOULD use `ConfigProvider.constantCase` at the runtime provider source
  when env names follow a screaming-snake convention.
- Avoid custom `ConfigProvider.mapInput` functions when package-owned
  `Config.nested(...)` fragments and app-level `constantCase` express the
  mapping.
- Do not export package `Config` values that hard-code app-specific env names;
  package-owned env namespaces are allowed and should live with the package
  config fragment.
- Keep one-off config error transformation inline at the runtime callsite.
- Use Effect `Config`, `ConfigProvider`, `Schema`, `Layer` and platform
  runtime primitives for configuration. Keep representation ingress at its
  exact config owner, and select only explicitly public keys for browser builds.
- Provider credentials and other semantic values use owner-named Schemas with
  `Config.schema`; use `Schema.Redacted` or `Schema.RedactedFromValue` according
  to the actual ingress representation. Do not expose primitive config values
  through service APIs or unwrap secrets before final adapter construction.
- Do not commit credentials, copy Cloudflare values into the shell or GitHub,
  or pass raw tokens as command arguments.

## Related Docs

- [Effect services](./effect-services.md)
- [Package ownership](./package-ownership.md)
- [API and SDK](./api-and-sdk.md)
- [Frontend](./frontend.md)
- [Deployment](./deployment.md)

---
document_type: architecture
lifecycle: current
authority: canonical
owner: taxkit-configuration-owner
last_reviewed: 2026-10-08
review_trigger: config Schema, namespace, source selection or secret custody change
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
or Vite env, app-local defaults and runtime-specific provider selection. They
must not re-declare package-owned config keys or prefixes.

## Governed operator configuration

Doppler is the owner for TaxKit's operator-set credentials and their related
environment identities. It is not the owner for host-created values, GitHub
event data, Alchemy-generated state credentials or TaxKit evidence paths.

The repository-defined environment map is:

| Purpose | Config | Values |
| --- | --- | --- |
| Credentialed local docs development | `taxkit/dev` | Cloudflare account and development token |
| Trusted Quality and receipt reconciliation | `taxkit/ci` | Turbo team and token |
| Preview and exact-stage teardown | `taxkit/stg_preview` | Cloudflare account and Preview token |
| Production and rollback | `taxkit/prd` | Cloudflare account and Production token |

Ordinary API/web development, portless values, `CI`, GitHub refs and runner
paths, Playwright paths, `TAXKIT_WORKFLOW_*` inputs, `ALCHEMY_PROFILE` and
Alchemy's state-store bearer/encryption values remain with their current
owners. No unused fixed staging config exists.

Local credentialed commands use a fixed repository adapter, not ambient
selection or a committed `.doppler.yaml`. The adapter strips ambient Doppler
and governed provider values, passes `--no-read-env`, `--no-fallback`,
`--no-check-version` and an exact `--only-secrets` list, then starts Bun with
`--no-env-file`. Alchemy receives an intentionally empty dotenv file. The
developer login is scoped to this checkout and must be a system-keyring
reference verified by the pass/fail-only custody command.

GitHub's reviewed target uses read-only, expiring service tokens bound to one
config. The `ci` bridge is repository-scoped; Preview and Production provider
bridges live in their different protected environments. Workflows verify safe
Doppler project/config metadata and pass only named action outputs to exact
consumer steps. Exact-claim OIDC needs a successor review and is not a second
current path.

All repository source paths are implemented. Preview and teardown select only
`taxkit/stg_preview`; Production and rollback select only `taxkit/prd` through
the reviewer-protected Production environment. Preview and Production select
`taxkit/ci` separately for their exact provider-free Turbo consumers after
cache saves, while teardown stays local-cache-only and cannot fetch `ci`.

The earlier Doppler implementation recorded establishment of the project,
configs and GitHub bridges, and removal of direct Turbo/Cloudflare entries after
replacement proof. That is historical provider evidence, not a fresh readback
from this checkout. Current source has no supported direct-value fallback;
provider custody and availability require the separate operational readback
owned by the [authority model](../operations/authority-model.md).

## Current package and app pattern

The [HTTP package config owner](../../packages/api/http/src/config.ts) exports
`TaxKitHttpApiClientConfigSchema`, its derived type and the keyed server/browser
config fragments. Its Schema uses `Schema.URLFromString`, so the encoded base
URL is a string and the canonical value is a `URL`. The fragment reads the
named URL through native `Config.URL` and constructs the owning Schema value.
Its `Config.nested` namespaces are `TAXKIT_API` and `VITE_TAXKIT_API`.

The Website now uses the RPC origin owner rather than the retained HTTP
client configuration. [Server settings](../../apps/web/src/lib/config.server.ts)
read `API_PUBLIC_ORIGIN` and `WEBSITE_PUBLIC_ORIGIN` through `Config.schema`.
Native resource addresses come from the app graph, with `Worker.URL` for self
and the peer Output for the other host. Config receives runtime binding values;
missing/deferred outputs do not become guessed URLs.

`TAXKIT_API` is a native SDK Fetcher object. Its methods are not string-tree
configuration, so an owning Schema checks that object separately before the
private live Layer adapts it. The application service exposes named operations,
never the native object. The adapter preserves its receiver and unrelated
adapter defects. Settings errors contain only fixed safe fields.

## Retained analytics project configuration

The separate `TaxKitPostHog/prod` candidate reads only `taxkit/prd` through
native Doppler secrets, with shell application settings disabled. Its checked
`POSTHOG_ORGANISATION_ID` and redacted `POSTHOG_MANAGEMENT_KEY` have no defaults;
the US management host is fixed in the private adapter. Management credentials
are deployment-only and never Worker bindings or browser settings. Current
application analytics remain configured off; declaring project resources does
not enable collection. The [infrastructure owner](../../packages/infrastructure/README.md#retained-posthog-project-candidate)
describes deferred acquisition and native lifecycle bounds.
One retained project ID and capture token serve Production and controlled
Previews. Checked application configuration still requires the matching
collection mode and exact event stage; ordinary Previews and local collection
remain off. Report filters use those event labels rather than separate projects.

The Website relay reuses the analytics package's checked runtime mode, numeric
project ID, region, stage and redacted capture token plus `WEBSITE_PUBLIC_ORIGIN`.
The existing server host supplies these through `ConfigProvider.fromUnknown(env)`.
Off requires no analytics key; invalid enabled settings produce a named failure
only on the relay route. Native output fixtures pack the numeric project ID as
a number, preserving the actual Alchemy Output contract. Management/query keys
are never Website settings or bindings. Current deployments remain off.

## Browser configuration boundary

The root TanStack server function returns Schema-encoded public settings only.
The root route restores the branded API origin and seeds the React Atom registry.
The public settings atom stays alive for that registry's lifetime, including an
idle form. Disposing the registry clears its values. No binding, credential or
Effect Context is serialised to the browser.

[Vite configuration](../../apps/web/vite.config.ts) sets `envPrefix: []`. There
is no public origin build constant or browser ambient environment read. The
local Wrangler fixture owns test names/origins and generated Worker types;
Alchemy's apps graph owns runtime resource bindings. The saved native pair test
checks the actual browser call and audits its built files separately from
provider/deployed configuration.

## Schema-owned settings

Use `Config.schema` with the owning Schema when loading semantic settings,
including provider identities, credentials, stages and checked command inputs.
[API app config](../../apps/api/src/config.ts) is another current example: the
host and port are checked by their owners; optional `API_PORT` falls back to
`PORT` only when absent. An invalid supplied primary value remains an error.

The native API Worker candidate uses `apps/api/src/worker.config.ts` and the
origin Schemas in the app's `schemas.ts`. Native planning leaves resource
addresses deferred; first incoming runtime use decodes and caches the bound
API/website origins once. Own origin is bound by native `Worker.URL`, while the
website origin must be a matching resource Output. Missing or invalid values
produce a fixed Config error and an empty unavailable response. No fallback
address, extra backend runtime or request-time Layer construction is used.

Configuration modules own defaults and selection. Service contracts receive
canonical checked values. Raw credentials use `Schema.RedactedFromValue` at
string ingress; unwrap only at final construction of the private provider
client, never merely for a brand or diagnostic.

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
- Do not use Doppler fallback files, Bun or Alchemy `.env` loading, raw token
  command arguments, broad GitHub secret injection, or `doppler configure
  debug` for governed commands.

## Related Docs

- [Effect services](./effect-services.md)
- [Package ownership](./package-ownership.md)
- [API and SDK](./api-and-sdk.md)
- [Frontend](./frontend.md)


## Native app root secret selection

`alchemy.apps.run.ts` selects native `Stack.secrets` using the infrastructure
package's `apps-secrets.boundary.ts`. Checked `prod` selects `taxkit/prd`,
`pr-N` selects `taxkit/stg_preview`, and `dev_identity` selects `taxkit/dev`.
Bad stages fail with a fixed Config error before profile, credential or HTTP
access. An explicitly disabled native `Secrets.ProcessEnv` entry keeps ambient
application keys from overriding the selected provider. Native profile/credential
selection keeps its own upstream semantics.

The precedence test replaces the remote Doppler Layer with checked fixture
providers and runs real native Stack configuration. It proves ordering and
ambient suppression, not Doppler download or credential access. Native Stack
also rejects `--env-file` when the root declares secrets. The existing docs
fetch bridge and its empty env-file remain their own operating contract; no
current docs command selects the candidate app root.

The separate `alchemy.apps.local.run.ts` root selects only disposable local
app development, without the cloud secret stack. Its owned comment-only env
file prevents loading ambient `.env` application values. The root command sets
an isolated local `ALCHEMY_HOME` and passes source/no-env options through native
Bun children. The saved test instead scrubs the process environment and scopes
an empty profile directory. Alchemy creates an empty default profile directory
but no credential JSON. These local bookkeeping files do not establish cloud
credential custody. The [Website README](../../apps/web/README.md) owns setup;
the current docs secret bridge remains separate.

## Calculator platform logging and tracing

`apps/api/src/worker.ts` owns the API's disabled platform collection policy;
`packages/infrastructure/src/apps-stack.ts` supplies that policy to the native
API and declares the Website's disabled policy. Both set global/log/trace
collection and persistence to false, invocation logs to false and sampling to
zero. The standalone Website config owns the matching Wrangler representation.
This explicit state avoids Alchemy's default invocation logs. Automatic URL
fields sit outside the fixed application logging policy, so that formatter
alone cannot establish privacy for platform records.

These settings are checked in native plans and saved local CLI resources.
Cloudflare upload metadata, retained storage and safe exports require separate
readback. T009 owns safe exported tracing and remains unmet; no competing trace
exporter is admitted. The docs app's existing logging policy remains separately
owned.

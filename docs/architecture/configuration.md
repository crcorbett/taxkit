---
document_type: architecture
lifecycle: current
authority: canonical
owner: taxkit-configuration-owner
last_reviewed: 2026-10-05
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

The [server app config](../../apps/web/src/lib/config.server.ts) composes the
package fragment rather than defining the HTTP setting again:

```ts
export const TaxKitWebServerConfig = Config.all({
  ...TaxKitHttpApiServerEnvConfig,
});
```

This excerpt describes package composition; the owning module also maps config
failure inline to the safe app error. Its native `ConfigProvider.fromEnv()` and
`ConfigProvider.constantCase` read `TAXKIT_API_BASE_URL` at server runtime.
`Config.nested`, `Config.Wrap` and `Config.URL` are supported by the installed
Effect 4 version. Use `typeof ConfigSchema.Type` for new schema-derived type
examples; the package's existing `Schema.Schema.Type` form remains supported.

## Browser configuration boundary

The [client config module](../../apps/web/src/lib/config.client.ts) composes
`TaxKitHttpApiViteEnvConfig`. Its provider receives only the build-selected
public input:

```ts
export const TaxKitWebClientConfigProviderLive = ConfigProvider.layer(
  ConfigProvider.fromEnv({ env: __TAXKIT_WEB_CLIENT_INPUT__ }).pipe(
    ConfigProvider.constantCase
  )
);
```

The [input owner](../../apps/web/src/lib/config.client-input.ts) defines and
constructs the checked input containing only optional `VITE_TAXKIT_API_BASE_URL`.
The [Vite config](../../apps/web/vite.config.ts) loads that input with native
`Config.schema` and replaces the typed constant during the build. It sets
`envPrefix: []` so Vite cannot automatically copy other prefixed environment
values into browser code. The URL is then read through the package-owned config
fragment. Do not pass the whole `import.meta.env` or process environment to the
browser provider.

The browser config test and built-bundle sentinel check prove that unrelated
credential markers do not reach the qualified browser bundle. This is local
build proof, separate from any hosted environment or provider configuration.

## Schema-owned settings

Use `Config.schema` with the owning Schema when loading semantic settings,
including provider identities, credentials, stages and checked command inputs.
[API app config](../../apps/api/src/config.ts) is another current example: the
host and port are checked by their owners; optional `API_PORT` falls back to
`PORT` only when absent. An invalid supplied primary value remains an error.

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

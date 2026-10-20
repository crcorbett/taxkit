---
document_type: package-readme
lifecycle: current
authority: canonical
owner: taxkit-analytics-owner
last_reviewed: 2026-10-17
review_trigger: analytics event, settings, service, export, transport or privacy change
---

# `@taxkit/analytics`

Private compiled analytics contracts, browser relay policy and successful hosted
calculator usage decoration. The current backend Layer sends only the catalogue ID and
name, fixed application/stage labels, an event UUID and timestamp. It never
accepts tax inputs, results, browser identity, request URLs or request headers.
Tax rule packages and local SDK calculations do not depend on this package.

## Exports

- `./schemas`: public Schemas, brands, and derived types.
- `./errors`: public typed failures.
- `./config`: checked collection mode and capture settings. Off needs no token;
  invalid enabled settings fail with `AnalyticsConfigurationError`.
- `./collection-policy`: one checked incoming-header policy used by the API and Website. Missing allows direct clients; malformed or denied flags and `DNT: 1` refuse collection.
- `./service`: public Effect service contract.
- `./live`: production Layer; compose only at an application/runtime boundary.
- `./test`: deterministic contract-level test Layer.
- `./relay/schemas`, `./relay/errors`, `./relay/service`: bounded relay metadata,
  failures and native HTTP service contract.
- `./relay/live`: static production relay Layer with checked Config.
- `./api-usage`: calculator service decorator and request-owned event collector.
- `./testing/fixtures`: narrow test fixtures.
- `./testing/observations`: narrow test observation types.

`BackendAnalyticsLive` is a static Layer that reads `AnalyticsSettingsConfig`
from the host ConfigProvider; tests replace that provider. The application supplies native `FetchHttpClient` and Effect `Crypto`. Each
backend send owns one scope and one five-second limit covering identity,
encoding, headers and the complete reply. Replies are limited to 64 KiB. A
request has one attempt, omits credentials, disables trace propagation and
refuses redirects. The native client's abort lifetime belongs to that scope,
including rejection before a response body is read. A successful bodyless reply
counts as accepted. Disabled or denied collection makes no request and generates
no UUID. `accepted` means a successful HTTP response; stored provider events
require separate readback.

The browser contract is shared so the Website adapter can keep its SDK private.
`WebsiteAnalyticsRelayLive` reads the same checked analytics collection/stage
settings and, only when enabled, `WEBSITE_PUBLIC_ORIGIN` through Content's
`DocsWebsiteOriginConfig`. The Website supplies its native ConfigProvider and HTTP client;
the package never imports app bindings or constructs a runner. The relay admits
only same-origin POSTs to `/ingest/e/`, the qualified JSON/text media types and
bounded retry counter. It forwards unchanged bytes once to the fixed US host,
strips caller headers and restricts provider response headers. Both complete
bodies are limited to 64 KiB within one five-second scoped operation; denied
collection reads no body and makes no request. This opaque transport does not
validate event payloads or decompress them; the browser event contract owns the
financial-input exclusion.

`ApiCalculatorAnalyticsLive` decorates the supplied calculator service after a
successful checked result. `ApiCalculatorEvents` is an optional request-owned
collector, limited to 64 allowed events. Metadata, failed calculations, denied
collection and calls without a collector produce no event. The decorator
preserves calculation results/errors and records only checked catalogue ID/name
and collection policy. The [API host](../../apps/api/README.md#analytics-candidate)
owns collection-header ingress, collector lifetime and delivery through native
`waitUntil`; native MCP registration must not retain request collectors. The
Website owns relay execution and its native request lifecycle. A test Layer is
substitution proof, not SDK or browser privacy proof.

## Documentation impact

Change required: this README, the repository
[package ownership](../../docs/architecture/package-ownership.md),
[Effect boundary owner](../../docs/architecture/effect-services.md) and
[completed plan](../../docs/exec-plans/completed/common-practice-foundation-review.md)
route these package capabilities and application composition. The focused relay
boundary tests move with their policy; API request integration tests continue to
exercise the package decorator through the host collector. Preserve: tax Schemas,
results, HTTP and SDK contracts, and published public documentation. This versioned private package follows the
[Changeset rules](../../docs/standards/versioning.md); package-facing changes
include their own Changeset outside the public tax/SDK release group.

## Runbook applicability

The [deployment runbook](../../docs/runbooks/deployment.md) owns deployment and
rollback; the PostHog project belongs to `@taxkit/infrastructure`. Tests use controlled
transports and synthetic capture tokens; they perform no provider operation.
Local and ordinary Preview collection must stay off. Production or a controlled
Preview requires checked settings and separately qualified app composition.

## Non-claims

These package checks do not prove the real browser SDK, app composition,
provider project ownership, ingestion, deployment, release publication or
exactly-once storage. Shared Axiom metrics remain deferred by Cooper.

---
document_type: package-readme
lifecycle: current
authority: canonical
owner: taxkit-analytics-owner
last_reviewed: 2026-10-07
review_trigger: analytics event, settings, service, export, transport or privacy change
---

# `@taxkit/analytics`

Private compiled contracts for the accepted page visit and successful hosted
calculator events. The current backend Layer sends only the catalogue ID and
name, fixed application/stage labels, an event UUID and timestamp. It never
accepts tax inputs, results, browser identity, request URLs or request headers.
Tax rule packages and local SDK calculations do not depend on this package.

## Exports

- `./schemas`: public Schemas, brands, and derived types.
- `./errors`: public typed failures.
- `./config`: checked collection mode and capture settings. Off needs no token;
  invalid enabled settings fail with `AnalyticsConfigurationError`.
- `./service`: public Effect service contract.
- `./live`: production Layer; compose only at an application/runtime boundary.
- `./test`: deterministic contract-level test Layer.
- `./testing/fixtures`: narrow test fixtures.
- `./testing/observations`: narrow test observation types.

The application supplies native `FetchHttpClient` and Effect `Crypto`. Each
backend send owns one scope and one five-second limit covering identity,
encoding, headers and the complete reply. Replies are limited to 64 KiB. A
request has one attempt, omits credentials, disables trace propagation and
refuses redirects. Disabled or denied collection makes no request and generates
no UUID. `accepted` means a successful HTTP response; stored provider events
require separate readback.

The browser contract is shared so the Website adapter can keep its SDK private.
That adapter and the Website relay remain T008 work in progress. The
[API application owner](../../apps/api/README.md#analytics-candidate) adds the
single successful-use operation; its actual native transport checks remain
separate from this package's tests. A test Layer is substitution proof, not SDK
or browser privacy proof.

## Documentation impact

Change required: this README, the repository
[package ownership](../../docs/architecture/package-ownership.md),
[Effect boundary owner](../../docs/architecture/effect-services.md) and
[active plan](../../docs/exec-plans/active/clean-slate-foundation.md) route these
contracts and pending application work. Preserve: tax Schemas, results, HTTP
and SDK contracts, public accepted documentation and the five existing runbook
procedures. This package is private and is not part of the published tax/SDK
closure, so its addition alone needs no Changeset.

## Runbook applicability

The [deployment runbook](../../docs/runbooks/docs-deployment.md) and
[recovery runbook](../../docs/runbooks/recovery.md) own later analytics resource
plans, authority, retained projects, recovery and readback. Tests use controlled
transports and synthetic capture tokens; they perform no provider operation.
Local and ordinary Preview collection must stay off. Production or a controlled
Preview requires checked settings and separately qualified app composition.

## Non-claims

These package checks do not prove the real browser SDK, app composition,
provider project ownership, ingestion, deployment, release publication or
exactly-once storage. Shared Axiom metrics remain deferred by Cooper.

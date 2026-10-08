# PostHog analytics in a separate Website and API

Use this when adding browser and backend analytics to the repository pattern.
This is an optional capability, not part of every generated scaffold. Start from
the questions, collection policy and accepted loss budget, then follow the
[Alchemy resource guide](../providers/posthog.md) and
[Effect browser adapter](../../../effect-client-wrapper/references/posthog-browser.md).
Keep product analytics separate from request logs, traces and operational metrics.
Apply the sibling [strict Effect policy](../../../strict-effect-ts/SKILL.md) to
schemas, services, adapters, infrastructure and tests; the SDK does not grant a
whole analytics folder an exception.

## Contents

- [Put each responsibility with its owner](#put-each-responsibility-with-its-owner)
- [Make the Effect contract reviewable](#make-the-effect-contract-reviewable)
- [Count backend work separately](#count-backend-work-separately)
- [Keep a browser relay on the owning Website](#keep-a-browser-relay-on-the-owning-website)
- [Verify the assembled capability](#verify-the-assembled-capability)

## Put each responsibility with its owner

Adapt these paths to the target repository; they are an ownership map rather
than a requirement to create every file:

```text
packages/analytics/src/
  schemas.ts                 checked settings, event vocabulary and brands
  errors.ts                  closed capture failures
  service.ts                 named browser/backend operations
  live.layer.ts              native backend HTTP capture
  test.layer.ts              deterministic service implementation
packages/infrastructure/src/posthog/
  schemas.ts / errors.ts / service.ts
  management.adapter.layer.ts  private Distilled operations and credentials
  resources.ts / dashboards.ts  resource lifecycle and desired chart catalogue
  bindings.egress.ts            checked stage-specific deployment outputs
apps/web/src/lib/analytics/
  browser.adapter.layer.ts   private SDK lifecycle
  capture.consumer.ts        synchronous checked before-send callback
  relay/
    schemas.ts / errors.ts / service.ts
    live.layer.ts            one native outbound HTTP attempt
    body.ingress.ts          bounded byte reader
    request.ingress.ts       checked Website HTTP request
    response.egress.ts       native response adaptation
apps/api/src/
  analytics.layer.ts         request-scoped collection and finalisation
alchemy.posthog.run.ts       composition-only resource stack
```

Packages import explicit package exports and never app internals. The existing
server runtime composes the relay service; the React-owned Atom runtime composes
the browser service. The native API entry composes backend capture with its
incoming request Effect fibre. No analytics package starts a runtime or shares
mutable per-request state across users.

## Make the Effect contract reviewable

- Public operations return `Effect.Effect<Success, AnalyticsError, never>` with
  Schema-derived inputs and outputs. Capture transport, configuration and SDK
  dependencies in the Layer; typecheck the real implementation against
  `Service.of`. Native request handlers may retain documented host requirements;
  those requirements must not leak into the shared analytics service.
- Use named `Effect.fn("Service.operation")` with a generator directly for
  sequential public work. Use `Effect.fnUntraced` for reusable private work that
  belongs to the caller's span. Keep pure total transformations plain. Split
  files by schema/error/service/transport ownership, not one helper per SDK call.
- Decode stage, host, token and collection mode with their owning Schema.
  Model enabled/disabled settings as a closed union: disabled needs no fake key
  or placeholder host. Invalid enabled settings are a named configuration
  failure, not configured-off. If startup must remain available, make the
  downgrade a reported policy at composition, separate from deliberate disable.
- Decode external absence to `Option` once and prefer `Option.match` for both
  branches. Do not access `.value`, inspect `_tag` or use unsafe extraction.
  Use `Boolean.match` for boolean choices and `Match.exhaustive` for closed
  states; do not introduce Option solely to hide a boolean decision. Return
  nullable values only at a host contract that explicitly requires them.
- Decode incoming data and encode owned outgoing payloads in their ingress and
  egress owners. No assertions, raw JSON, raw fetch, ambient environment reads,
  clocks, timers, random globals or raw Promise orchestration. The browser's
  named SDK adapter and synchronous consumer are the documented host exceptions;
  backend HttpClient and Distilled calls remain native Effect.
- Map expected SDK/HTTP/codec failures to closed Schema-tagged errors with safe
  operation/reason fields. Best-effort capture catches those named errors at
  its application owner. Do not erase configuration, permission or decode
  failure with blanket `Effect.option`/`Effect.ignore`, convert it with `orDie`,
  or catch all Causes to report success. Preserve interruption and defects.
  Discarding an invalid optional campaign field is a separate, explicit policy.
- Create `Ref`s and any concurrency limits during the intended Layer/request
  lifetime. Use scoped acquisition and bounded finalisers. No mutable module
  client, request accumulator, per-click runner or detached fibre. Logging and
  span fields use safe fixed names; event bodies and visitor IDs stay out.

## Count backend work separately

Collect a bounded set of domain outcomes in a request-local `Ref`, then send one
request-completed event and those outcomes together. Define whether health,
preflight, discovery and streamed responses count. Pick a truthful completion
point for streams and cancellation; do not count a stream twice or claim the
body was delivered merely because response headers exist.

Use native Effect `HttpClient` for capture rather than adding a server SDK solely
to send batches. Check and encode the owned wire Schema; distinguish accepted
HTTP responses, rejection and transport failure. Bound the entire send and keep
resources scoped. Use Effect Clock/Random for timing and event identity; do not
introduce ambient clocks or random globals. Worker CPU timing can differ from
provider-measured latency, so name the recorded duration accurately.

On native Alchemy Cloudflare Workers, use the installed
`WorkerExecutionContext.waitUntil(effect)` API for bounded background sends.
It extends request work and preserves the native Effect context without a new
runner in owned code. Call it while the native request context is valid. The
installed Alchemy implementation captures the calling services; it does not
extend every service's acquisition scope. Close over only dependencies that
remain alive for the send and open the HTTP send scope inside the background
Effect. Do not carry a soon-to-close request scope or raw host context into a
second runtime. Test request finalisation while the controlled send is pending.
It is not a persistent queue or a promise of delivery after termination.
Expected analytics failure should not change the application's response when
best-effort loss is the agreed policy. Keep fixed safe diagnostics and separate
backend request IDs from browser visitor IDs. Do not add retries without deciding
how duplicates are prevented and how long sends may live.

## Keep a browser relay on the owning Website

For a minimal browser client, an existing Website path such as `/ingest/e/` avoids
another Worker and cross-origin delivery to `api.<domain>`. A thin TanStack route
calls a native Effect HTTP program through the existing server runner. This is
fixed provider ingress for the Website's browser client, not a domain API or a
second Content/HTTP/RPC implementation. It is the narrow exception to keeping
backend machine routes out of the Website. A separate proxy Worker or API route
is valid when isolation or other requirements justify it; decide that explicitly.

Set the browser SDK's checked `api_host` to the Website path. Backend capture
can stay direct to its fixed regional ingestion host. The relay reduces direct
analytics-domain blocking even for explicit events; it cannot recover events
that never reach it or defeat every blocker. Preserve chosen privacy controls.

Qualify the pinned SDK's actual endpoint, media types, compression, query keys,
batch delay, retry policy and response handling. The source-derived SDK used
`/e/`, roughly three-second batches, gzip bytes labelled `text/plain`, plus JSON
and form fallbacks. Those are version-specific observations, not universal
PostHog endpoints. Enabling flags, replay or external scripts introduces paths
that this minimal relay deliberately does not support; revisit the protocol
before enabling them. Do not proxy arbitrary URLs or guessed assets.

Keep the relay small but check its real boundary:

- Fixed POST path, fixed regional upstream and allowed Website origin. Origin
  checking is a browser policy, not authentication for a public project token.
- Checked retry/compression query, rejecting duplicates and unknown keys.
  Use Schema optional-to-Option codecs and `Option.match`; encode query keys
  only at the outgoing boundary.
- Unchanged bytes, UUIDs and timestamps. Do not parse and rebuild SDK batches
  merely to forward them. The owning Schema checks protocol metadata and bounded
  bytes; the browser consumer separately owns allowed event properties.
- Native `Stream.limitBytes` bounds both request and reply even without
  Content-Length. Supply a typed failing fallback when the limit is crossed:
  `Stream.empty` would silently accept a truncated body. Test the exact limit
  and the crossing chunk; never forward a partially collected oversized batch.
  No manual mutable byte counter. Compressed-byte limits do not establish
  decompressed event size; the forwarding relay does not decompress.
- One scoped deadline covers request body, upstream headers and reply body.
  The source pattern chose 1 MiB per body and five seconds; choose limits for the
  target application's actual payloads and runtime constraints.
- Rebuild allowed headers. Strip caller cookies, auth, IP forwarding and trace
  headers; disable native HttpClient trace propagation. Configure the native
  transport for manual redirects before sending, then reject every 3xx response
  without forwarding its Location. Rejecting a final status is insufficient if
  the transport has already followed it. In the qualified FetchHttpClient,
  `RequestInit` is read at execution and its Layer uses `layerMergedContext` to
  carry acquisition settings into requests. Providing manual redirects to that
  Layer is supported; verify the actual call retains that setting and no caller
  overrides it. Do not add `followRedirects`.
- Preserve upstream success/error statuses and checked retry headers; return
  `no-store`. Do not report a failed provider attempt as successful delivery.

Keep SDK retries as the single retry owner for this design. Forward each attempt
once with no relay retry, durable queue or direct-send fallback unless explicitly
designed. Browser batching still leaves a loss window on tab closure. Give relay
requests their own telemetry category so they do not inflate API/domain counts.

## Verify the assembled capability

Typecheck live and test implementations at the same closed service contract.
Check the error channel and Layer input/output types; a signature made clean by
an assertion or `orDie` is not proof. Use `@effect/vitest` for Effect tests and
Effect FileSystem/ChildProcess for test work; no raw async setup or real sleeps.

Use the actual lint command and negative fixtures to reject SDK access outside
the browser adapter, Promise bridges outside named host adapters, misplaced
codecs, manual tag checks and unchecked optional extraction. Split large files
by their schemas/service/error/transport owners; do not create forwarding helpers.

Test unchanged bytes and supported formats, status handling, stripped headers,
exact/oversized bodies without Content-Length, a stalled incoming body, late
headers followed by a stalled reply, interruption and resource cleanup. Native
HttpClient may represent a bodyless response as a typed empty-body error; qualify
and handle that case without masking other stream failures. Prove one upstream
attempt and closed service requirements with deterministic Layers/TestClock.
Test redirect refusal with a real local native transport as well as a fake
HttpClient: a fake returning 302 cannot prove the real client never followed it.
Cover late completion after timeout, concurrent requests with separate state,
request-scope closure during background sending and safe drop diagnostics.

Reject an implementation until enabled/disabled configuration, each named error,
Schema round-trips, lifecycle, concurrency and the actual lint prohibitions have
been checked. Missing live delivery evidence must remain a stated non-claim.

Then follow the resource guide's delivery sequence: controlled enabled Preview,
fresh browser requests, exact stored UUIDs and backend events, temporary domain
blocking and client retries when relevant, restored privacy overrides and disabled
ordinary Preview, and separately authorised production plan/apply/readback.
Local tests, HTTP 200, provider state and stored-event queries are separate proof.
Keep a dated receipt in the application repository; do not copy its account IDs,
personal details, tokens or deployment-specific findings into reusable skills.

See [PostHog proxy guidance](https://posthog.com/docs/advanced/proxy) and
[native Alchemy Worker source](https://github.com/alchemy-run/alchemy/tree/main/packages/alchemy/src/Cloudflare/Workers).

# Hosted web telemetry: Alchemy, Effect and Axiom

Use separate Website and API Workers in one native Alchemy stack. TanStack is
the frontend; the native Effect API owns domain work and machine transports.
First qualify installed host/exporter APIs. Keep dated provider observations
in the receiving repository, not as permanent plugin guarantees.

## Keep execution with its host

The API builds application Layers once in Alchemy's instance Scope. Requests
execute in the incoming native Effect fibre, retaining the native tracer,
parent span, cancellation and request Scope. Do not add a ManagedRuntime or
Promise runner. Keep request services out of shared domain/cache construction;
streamed replies retain their resources until completion or cancellation.

Beta.79 workerd never closes its instance Scope because the host offers no
guaranteed isolate shutdown callback. This applies to all shared resources,
not only exporters. Resources needing reliable release belong to a request or
response-stream Scope; controlled instance-close tests prove ownership only.

Qualify failure reporting at the native API boundary too. Beta.79's native
HTTP mapper otherwise logs a raw Cause. Provide a safe reporter set to
`Http.safeHttpEffect` itself, with a direct service override that preserves the
incoming Scope. Keep rc.117's required synchronous callback fixed-field only;
use the current native loggers, an empty Cause and the supplied timestamp/fibre,
without forwarding original error metadata or adding a runner. Prove both safe
logs and native routing/cancellation responses. See the strict Effect
[logging owner](../../../strict-effect-ts/references/observability/logging-tracing-and-metrics.md).

The standard Website.Vite frontend keeps one server runner containing typed
client Layers. It calls its own stage's API through the narrow Cloudflare
service-binding adapter. Preserve the original body stream and forward the
Effect abort signal. Browser calls use the checked public API address.

Do not wrap TanStack in a custom backend Worker or pass Effect Context through
Register.server.requestContext. Remove request-service merging and borrowed
tracer-hook adaptations from this split design. For Website spans, qualify the
supported Cloudflare host span API in a private adapter, release it reliably
and degrade safely if unavailable. This does not prove cross-Worker parenting;
verify that separately if the application claims it.

## Choose three explicit signal paths

```text
Effect.fn / Effect.withSpan
  -> per-event Cloudflare tracer
     -> native platform trace + application children
        -> Alchemy-owned ObservabilityDestination -> Axiom traces

Effect.log* -> inherited event logger -> scoped OTLP export -> Axiom logs

Effect Metric update -> event registry -> scoped OTLP export -> Axiom metrics
```

Logs and metrics may use another qualified native or collector path. Select
one owner for each signal; do not add a duplicate exporter merely to make it
visible. Metrics are optional when existing logs or traces already answer the
question. Trace-derived counts require sampling and delivery limits to be stated.

For native traces, provide `Cloudflare.Telemetry()` and declare its compatible
date, sampling and destination through Alchemy. Export the native waterfall
through `Cloudflare.Workers.ObservabilityDestination`; do not simultaneously
provide an OTLP trace exporter that competes for Effect's `Tracer` service.
Platform tracing alone is not proof that the application's inner spans inherit it.

Use `Axiom.Telemetry` when the declared host supports its binding context.
Qualify native API binding inference separately from Website.Vite bindings.
The standard frontend declares its exact scoped OTLP bindings explicitly and
uses its existing runtime exporter path. Verify emitted bindings
and the plan; do not add a second Worker and service hop solely to obtain a binding
context. Revisit this choice when Website or telemetry binding support changes.

Keep datasets, destinations, ingest tokens and dashboards under their declared
Alchemy owners. Reference existing foreign resources without adopting them.
Read retained resource outputs and secrets through supported resource references;
never put a token in a stack output, proof file or dashboard.

## Declare bindings and identity deliberately

Decode stage and endpoint configuration with Config and owning Schemas. Keep
tokens redacted until the immediate private export boundary. Bind only the
selected stage, endpoints, scoped credentials, dataset names and service identity.
Never forward a deployment process's whole environment into the Worker.

Keep one vocabulary for emitted names and dashboard queries. Use stable service,
project and stage labels; filter Preview and Production explicitly. Revision
and trace/request IDs belong in safe logs or traces, not unbounded metric labels.
Do not put arbitrary paths, queries, request bodies or provider error text in tags.

When correlation needs an isolate identity, create it once during Worker init
while an event is being handled, using Effect's supported randomness and Ref.
Do not create it per request or at module scope. Keep event counters isolate-wide
and request data event-scoped. Make failure to obtain diagnostic identity degrade
telemetry without preventing the application response.

## Flush on the host's event lifetime

For the native API, register telemetry once with Alchemy and let its event
builder construct request exporter Layers with finalisers in the event scope. Alchemy
closes that scope through the Worker's completion integration (`waitUntil`).
A long export interval does not mean short requests wait that long: finalisation
flushes the batch. A disposable isolate-wide exporter cannot depend on an isolate
shutdown that the host may never deliver. Qualify Website middleware separately:
flushing before returning can add latency, and rendering after middleware
returns can emit logs after its exporter closes. Do not claim complete SSR log
retention without proving that later rendering is covered.

The API keeps its event logger, tracer, parent span and metric registry native.
The Website uses its existing middleware/exporter owner without lending an
Effect Context through TanStack. Preserve response stream lifetimes. Do not attach the export flush to the client disconnect signal.
Give exports and final warnings bounded time within the host completion limit.
Failure, rejection or timeout of telemetry must not fail the page response.

An exporter may log during its final flush. A sibling logger can already have
finished flushing by then. If those warnings must reach Axiom, construct the
warning logger as an exporter dependency so it finalises after that exporter,
with a separate bounded completion budget. Avoid recursive warning exports.

## Keep telemetry definitions and stack composition together

Define emitted names and query names in one dependency-light observability
module. A dashboard panel owns its chart and grid position; derive layout IDs
from its chart, and derive dashboard counts from the declared dashboard list.
Put reused query fragments in the dashboard query owner. Keep common provider
Layers, state configuration and stage checks in one infrastructure composition
owner when several stack entries use them. `Layer.mergeAll` is for independent
providers; dependency wiring uses `Layer.provide`/`provideMerge`. Inspect native
Alchemy source before overriding a diagnostic about its documented provider
composition, and record the narrow reason.

Shared dataset/stage Schemas belong to a dependency-light capability owner
when runtime code also needs them. Runtime telemetry must not import a
dashboard/build module merely to reach those definitions. Keep runtime values
separate from provider-only types; run the real Worker/browser build to check
the resulting imports. Keep decoded header values redacted individually and
unwrap only at the private exporter constructor. A formatted secret header is
still a secret.

## Match metric lifetime, encoding and aggregation

For a per-event exporter, its metric registry must describe the same event.
An isolate-wide cumulative registry combined with a fresh exporter per request
can resend previous requests under a new start time. Changing only to delta
does not fix that lifetime mismatch. Prefer a fresh registry per event and delta
export when the intended value is that event's contribution; use the same
registry for both handler updates and the exporter snapshot.

Axiom's documented `/v1/metrics` path accepts Protobuf, not JSON. Verify the
edge endpoint, dataset header and encoder against the installed exporter and
current provider documentation; do not reuse the log exporter settings blindly.
Also avoid repeating the same tag on resource and point attributes where the
backend flattens them into one namespace.

Backend behaviour matters after transport success. In the qualified integration,
multiple delta points for one series in the same second replaced one another;
cumulative queries also missed a new series' first sample. A bounded per-isolate
export slot distinguished burst exports, but its wrap can collide within one
backend time bucket and each slot adds series. It is a measured, capacity-limited
option, not a universal accuracy guarantee or a default scaffold requirement.

Choose the smallest design that meets the actual requirement: logs for request
counts, a qualified metric pipeline with explicit collision/loss limits, or an
owned durable aggregation pipeline when lossless counts justify its cost. Never
add unique request-ID metric labels as a quick fix. If metrics are required,
reconcile one controlled burst and one sequential run against stored points.

Read the exporter's response semantics. A successful HTTP response may include
partial rejection or warnings. Map those outcomes into safe, bounded diagnostics;
do not classify every non-empty response as failure or print raw provider bodies.
Read back stored values through the signal's supported query API. A transport
response and a matching backend total are different claims.

## Measure the quantity the chart names

Cloudflare's in-isolate clock can stay fixed during CPU work. A near-zero Effect
span or clock subtraction therefore does not prove a fast response. The native
root span can include background completion and telemetry export after the
visitor's response, so its whole duration is not automatically visitor latency.

Name charts after the measure: platform CPU time, startup lag, upstream I/O,
or browser/synthetic response time. Do not add CPU and overlapping I/O spans,
or subtract export duration from a root span, to invent an unmeasured latency.
Exclude telemetry export calls from application upstream-I/O charts. Check each
field on the deployed host before adopting a dashboard query.

## Read back a small, meaningful journey

Use ordinary verification and existing adapter tests. With deployment authority,
send one page request and one machine POST through Preview, then query safe
metadata for the exact deployment and bounded time window. Confirm native parent
and inner semantic spans, the application log and any claimed metric contribution.
Inspect streaming bodies and the expected status, not only response headers.

Record sampling, indexing delay and cache status. A Cloudflare cache hit may
skip the Worker entirely, so no application signal is expected; a controlled
cache-busted check can isolate Worker execution. Reconcile after the backend's
known delay before declaring loss. Configuration, ingestion and rendered dashboard
results remain separate observations. Do not add a permanent proof framework
where a small runbook journey and existing tests suffice.

## Sources and review triggers

Check these primary sources alongside installed types and pinned source clones:

- Alchemy `Cloudflare/Workers/{WorkerBridge,Telemetry,CloudflareTracer}.ts`,
  `Telemetry.ts`, `TelemetryRuntime.ts` and `Axiom/Telemetry.ts`.
- Effect `ManagedRuntime`, `OtlpLogger`, `OtlpMetrics` and OTLP exporter finalisation.
- [Axiom OpenTelemetry transport](https://axiom.co/docs/send-data/opentelemetry).
- [Cloudflare traces](https://developers.cloudflare.com/workers/observability/traces/)
  and [Workers security model](https://developers.cloudflare.com/workers/reference/security-model/).

Requalify on host, compatibility date, Effect/Alchemy exporter, backend ingestion
or query changes. Keep dated measurements and private session references in the
consumer repository's evidence; do not turn them into permanent provider guarantees.

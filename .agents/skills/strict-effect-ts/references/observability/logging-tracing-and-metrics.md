# Logging, Tracing, and Metrics

## Contents

- [One observability design](#one-observability-design)
- [Structured logging](#structured-logging)
- [Log levels](#log-levels)
- [Tracing](#tracing)
- [Metrics](#metrics)
- [Resource identity](#resource-identity)
- [Exporter Layers](#exporter-layers)
- [Failure policy](#failure-policy)
- [Proof](#proof)
- [Alchemy](#alchemy)

## One observability design

Treat logs, traces, and metrics as part of the service contract:

- what semantic operation is visible;
- what identity connects signals;
- which fields are safe;
- what cardinality is bounded;
- how exporters attach to the runtime;
- how ingestion is proved.

Do not scatter `console.log` and later wrap it with a logger.

## Structured logging

Use Effect logging and annotations. Prefer an event name plus typed safe fields:

- service/operation;
- environment/stage;
- resource/domain safe ID;
- outcome/error tag;
- attempt;
- duration;
- bounded count;
- source revision where useful.

Avoid:

- string-concatenated blobs;
- full objects;
- raw Errors/Causes;
- headers/cookies;
- provider responses;
- credentials;
- user content unless explicitly governed;
- high-volume per-item logging.

Define a safe error-to-fields function for each error union.

Native Alchemy beta.79 HTTP handling logs the raw Cause when no ErrorReporter
is visible to its failure mapper. A reporter provided only inside the route
does not reach that outer catch. At the API host boundary, qualify native
`Http.safeHttpEffect` around the handler and provide its checked reporter set
to that mapper with `Effect.provideService`. Build the reporter Layer once;
capture only `ErrorReporter.CurrentErrorReporters`, never the initialisation
Scope, logger or tracer. Avoid a new scoped Layer around each returned response.

Effect rc.117 requires a synchronous ErrorReporter callback. Keep this narrow
host exception explicit beside the callback. It may call the current native
loggers with fixed bounded fields, an empty Cause and the host-supplied fibre
and timestamp; it must ignore original error text, Causes, attributes and
provider payloads. Add no console call, ambient clock or extra runner. Test the
real handler with secret-like sentinels and original metadata, preserve native
404/499/503/500 handling, and prove the incoming request Scope is retained and
released. Requalify the native mapper and callback on Effect/Alchemy upgrades.

## Log levels

Use consistent semantics:

- debug/trace: bounded development diagnostics;
- info: lifecycle or meaningful state transition;
- warning: recovered degradation or operator attention;
- error: terminal operation failure;
- fatal: application/runtime cannot continue.

Do not log expected not-found/validation at error by default.

## Tracing

Create spans around:

- domain service operation;
- external provider/HTTP/database call;
- queue/message handling;
- infrastructure plan/apply/readback;
- meaningful stream stage.

Do not instrument every pure helper or Layer constructor.

Use stable span names. Attach safe low-cardinality operation attributes and high-cardinality identifiers only when trace backends and privacy policy permit them.

Public service methods use named `Effect.fn("Service.operation")`; private
Effect helpers normally use `Effect.fnUntraced` and stay within the caller's
span. A private external operation can own a separate named span. Keep pure
helpers plain and avoid extracting one-use helpers just to decorate them.
For contracts exposing an Effect value rather than a method, use the operation's
named `Effect.withSpan` without changing the public API into a fake method.

Propagate context across supported HTTP/RPC/queue boundaries. Do not leak it into untrusted channels without validation.

## Metrics

Use:

- counters for occurrences;
- histograms/timers for distributions;
- gauges for current bounded state;
- frequency/category metrics only with closed values.

Good labels:

- operation from a closed set;
- result tag;
- provider kind;
- environment;
- service.

Bad labels:

- user/resource/request ID;
- full URL;
- error message;
- revision on every metric;
- arbitrary stage/branch without a bounded policy.

## Resource identity

Attach runtime resource attributes such as:

- service name;
- service version/source revision;
- deployment environment;
- deployment stage;
- repository/application identity.

Keep request-level identity out of resource attributes.

If shared Axiom datasets are used, ensure logs/spans carry enough identity for stage/service/revision proof. Keep metric labels low-cardinality and use logs/traces for revision-level proof.

## Exporter Layers

Build logger/tracer/meter/exporter Layers at the application root:

- acquire endpoint/token through Config/Redacted;
- select transport and batching;
- scope exporter lifetime;
- flush on shutdown/host completion;
- avoid multiple duplicate exporters;
- separate server and browser policy;
- separate application and platform telemetry.

In Cloudflare Workers, connect completion to the platform lifecycle.

## Failure policy

Decide whether telemetry failure:

- is best-effort and annotated;
- degrades a feature;
- blocks startup because auditability is required.

Avoid recursive logging loops when the exporter fails. Never expose secrets in exporter errors.

## Proof

Test locally:

- Layer composition;
- log field safety;
- span structure;
- metric label bounds;
- exporter request formation.

For a live ingestion claim:

1. emit a unique bounded proof signal;
2. allow the documented ingestion delay;
3. query the backend by service/environment/stage and proof identity;
4. verify signal fields;
5. record only safe counts/IDs/time window.

An exporter HTTP success is not query proof.

## Alchemy

Infrastructure Effects use the same policy:

- span plan/apply/readback, not pure declarations;
- annotate stack/stage/resource/change class;
- never log state or credentials;
- use metrics for bounded operation outcomes;
- keep durable receipts separate from telemetry;
- query configured Axiom datasets independently after deployment.

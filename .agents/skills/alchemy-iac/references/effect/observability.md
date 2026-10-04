# Infrastructure Observability

## Observe semantic operations

Instrument:

- authority decode;
- provider preflight;
- plan classification;
- resource read;
- reconcile/create/update;
- delete/retain;
- provider readback;
- proof query/journey;
- receipt encoding;
- teardown.

Do not create noisy spans around pure data declarations or Layer construction.

## Structured logs

Use safe bounded fields:

- operation;
- stack;
- stage;
- environment;
- logical resource name;
- provider kind;
- provider safe ID;
- source revision;
- change class;
- attempt;
- result tag;
- duration.

Never log:

- credentials;
- Authorization headers;
- state payloads;
- secret bindings;
- full provider bodies;
- arbitrary error Causes;
- user data from telemetry queries.

Map typed errors to safe log fields deliberately.

## Tracing

Create a parent span for the authorised infrastructure operation and child spans for provider calls. Attach stable identity and change class.

Propagate trace context only through channels that are safe and supported. Do not place credentials or full desired state in attributes.

Mark retry attempts and timeouts. Avoid recording every polled status as a separate high-volume span; use events or bounded summaries.

## Metrics

Use low-cardinality measures:

- operation duration;
- provider request duration;
- changes by class;
- retries;
- readback mismatch count;
- blocked preflight count;
- residue count.

Do not label metrics by revision, URL, request ID, arbitrary resource name, or provider error message when cardinality is unbounded.

## Application telemetry wiring

When an Alchemy graph configures Effect telemetry:

- define application and platform sources separately;
- provide redacted endpoint/token Config;
- register telemetry at its owning host boundary; build event-scoped exporters
  and registries per event when the host requires event finalisation;
- set service/resource identity;
- integrate host completion such as Cloudflare `waitUntil`;
- test Layer wiring;
- generate a unique proof signal;
- query Axiom or the selected backend independently.

Transport success is not ingestion proof.

For a hosted TanStack/Effect application, follow
[hosted web telemetry](hosted-web-telemetry.md). It owns separate Website/API request lifetimes, the native trace destination, scoped log/metric exports, backend
aggregation limits and timing interpretation. Do not copy a CLI's telemetry
lifetime or span-duration dashboard into a Worker without qualifying the host.

## Receipts versus telemetry

Telemetry is diagnostic and can be sampled or retained according to provider policy. A receipt is a bounded durable proof artefact.

Do not make a log search the only receipt. Do not dump all telemetry into a receipt. Link them through safe operation/run/trace identifiers when allowed.

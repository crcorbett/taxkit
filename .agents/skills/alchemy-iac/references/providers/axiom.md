# Axiom

## Contents

- [Model the observability topology first](#model-the-observability-topology-first)
- [File conventions](#file-conventions)
- [Preflight before apply](#preflight-before-apply)
- [Credentials and tokens](#credentials-and-tokens)
- [Telemetry transport](#telemetry-transport)
- [Dashboard integrity](#dashboard-integrity)
- [Application and platform signals](#application-and-platform-signals)
- [Receipt fields](#receipt-fields)

## Model the observability topology first

Choose the dataset topology deliberately:

- one shared set of logs/metrics/traces datasets with strict identity filters;
- stage-isolated datasets;
- service-isolated datasets;
- a hybrid justified by retention, cost, access, or query policy.

Do not select a dataset count by convention. Inventory current datasets, entitlement/capacity, retention, access isolation, query ergonomics, and cost first. Choose the smallest topology that satisfies those requirements, then make it an explicit reviewed contract. Three shared signal datasets can be safer than nine stage-specific datasets when identity is strong and capacity is constrained; stage-specific datasets can be safer when access or retention requires physical isolation.

Do not let dashboard files silently determine dataset ownership, and do not invent one dataset per branch.

For shared datasets, require identity fields such as:

- application;
- service;
- environment;
- stage;
- repository;
- branch/ref;
- revision/deployment SHA.

Dashboards and proof queries must filter the relevant identity. Dataset name alone is insufficient.

## File conventions

```text
axiom.ts
datasets/
  definitions.ts
  logs.ts
  metrics.ts
  traces.ts
  index.ts
dashboards/
  definitions.ts
  index.ts
  runtime-health.ts
  request-health.ts
  deployment-proof.ts
```

Use `axiom.ts` for provider composition, tokens, and resource wiring. Put large declarative catalogues in their folders.

Each dataset definition should include:

- stable logical and physical name;
- description/owner;
- stage topology;
- retention policy where supported;
- expected signal type;
- required identity fields;
- removal policy.

Each dashboard definition should include:

- stable dashboard identity;
- dataset dependencies;
- chart groups;
- query text or typed query builder;
- required identity predicates;
- owner and purpose;
- safe deployment/proof inputs.

## Preflight before apply

Axiom limits can make a valid graph unappliable.

Before creating datasets, tokens, or dashboards:

1. classify credential kind and scope;
2. identify organisation;
3. list current datasets/dashboards where authorised;
4. inspect plan/entitlement/capacity where the API exposes it;
5. calculate requested additions;
6. reject ambiguous or insufficient capacity;
7. record only sanitised counts and safe IDs.

Do not repeatedly retry a known entitlement failure.

## Credentials and tokens

Separate:

- administrative credential used to create/configure resources;
- scoped ingestion token;
- scoped query/readback token;
- disposable proof token.

Grant only required datasets and capabilities. Never place tokens in Alchemy outputs, receipts, dashboard definitions, or source. Qualify a token with a bounded Action only when qualification has a clear, secret-negative result.

## Telemetry transport

Define logs, metrics, and traces separately. Verify endpoint/path, headers, encoding, and host completion semantics for the installed exporter.

For Cloudflare-hosted application signals, use the
[hosted web telemetry pattern](../effect/hosted-web-telemetry.md) for the native
trace destination, explicit Website bindings, event-scoped exports and backend
count/timing interpretation. Keep these runtime concerns separate from resource
creation and dashboard declarations.

An accepted OTLP request proves only that the transport endpoint responded. It does not prove:

- the event was indexed;
- it landed in the intended dataset;
- identity fields were preserved;
- a dashboard query matches it;
- the signal is available within the expected delay.

Run a provider query using a unique proof identity and bounded time window.

## Dashboard integrity

Validate before apply:

- every referenced dataset exists in desired state or is explicitly foreign;
- every query includes required environment/stage/service predicates;
- metric queries do not use high-cardinality labels;
- deployment proof queries include revision identity;
- dashboard names do not collide across stages;
- chart units and aggregations match the signal.

After apply, list/read dashboards and compare stable identity and dataset/query references. If the provider returns canonicalised definitions, compare semantic fields instead of raw JSON order.

## Application and platform signals

Keep application Effect telemetry distinct from Cloudflare/Vercel platform telemetry. A dashboard may combine them, but the source and identity must remain queryable. Do not treat platform request logs as proof that an application span or metric exporter works.

## Receipt fields

Include:

- organisation safe ID;
- stage/source identity;
- dataset safe names/IDs;
- dashboard safe names/IDs;
- credential class, never value;
- preflight capacity summary;
- provider readback timestamp;
- bounded query proof counts and time window;
- skipped claims.

Do not embed query results containing user data or full event bodies.

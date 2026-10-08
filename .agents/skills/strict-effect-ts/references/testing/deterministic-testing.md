# Deterministic Testing

## Contents

- [Test Layers](#test-layers)
- [Contract suites](#contract-suites)
- [Schema tests](#schema-tests)
- [Error tests](#error-tests)
- [Time](#time)
- [Concurrency](#concurrency)
- [Resources](#resources)
- [Observability](#observability)
- [Live tests](#live-tests)
- [Architecture tests](#architecture-tests)
- [Test quality gate](#test-quality-gate)

## Test Layers

Compose tests from deterministic Layers:

- memory persistence/provider;
- controlled HttpClient/fetch;
- test ConfigProvider;
- TestClock;
- deterministic Random/identifier service;
- in-memory logger/tracer/metrics collector;
- failure-injection control service.

Use the repository's installed Effect test integration. Keep test runtime and Layer scope aligned with suite isolation.

## Contract suites

Write a reusable contract suite for a service and run it against:

- memory Layer;
- controlled live adapter;
- local/ephemeral integration where appropriate.

The suite should prove domain semantics. Add adapter-specific tests for encoding, transport, and provider quirks.

## Schema tests

Test:

- valid boundary samples;
- each refinement/branch failure;
- exact unknown-key policy;
- encode/decode round-trip;
- redaction;
- version migration;
- maximum bounds;
- provider drift fixtures.

Use property-based testing for stable codecs and branded values where the installed tooling supports it.

## Error tests

Exercise every tagged expected error and every recovery branch. Assert on tags and safe fields, not rendered message text.

Prove:

- defects are not swallowed into expected failure;
- interruption remains interruption;
- low-level provider errors map correctly;
- retry uses only retryable tags;
- public protocol encoding is safe.

## Time

Use TestClock for:

- timeout;
- retry backoff;
- polling;
- cache expiry;
- scheduled work;
- stream delay/debounce/throttle;
- finaliser timing.

Do not use real sleeps. Advance time to precise decision points and assert intermediate state.

## Concurrency

Use Deferred, Queue, barriers, or test-control services to establish ordering. Test:

- concurrency maximum;
- fail-fast sibling interruption;
- collect-all policy;
- backpressure;
- cancellation;
- queue/pubsub shutdown;
- no orphan fibres;
- stream emits before completion.

Do not rely on race timing.

## Resources

Test acquisition/finalisation on:

- success;
- typed failure;
- defect;
- interruption;
- acquisition failure;
- nested resource cleanup order.

Record observations in an Effect-managed test service rather than global mutable variables.

## Observability

Capture logs/spans/metrics in a test Layer. Assert:

- semantic operation names;
- required identity;
- no secret fields/values;
- bounded metric labels;
- expected failure level/tag;
- exporter configured once;
- flush/finalisation.

Do not snapshot volatile timestamps or entire Causes.

## Live tests

Live network/provider tests require:

- explicit opt-in/authority;
- isolated stage/account/project where possible;
- least-privileged credentials;
- bounded timeout;
- exact readback;
- cleanup/residue reporting;
- no Production destruction.

Report a skipped live test as a non-claim, not a pass.

## Architecture tests

Add static checks for:

- raw `fetch`, environment access, `console`, timers, `Effect.run*`;
- forbidden provider imports outside `live.layer.ts`;
- package runtime ownership;
- generic client callback methods;
- unsafe export paths;
- receipt secret/path fields.

Exclude generated/vendor/host adapters through exact paths, not broad globs.

## Test quality gate

A strict Effect change is incomplete if tests cover only success. Require relevant decode failure, typed failure, timeout/retry, interruption, resource cleanup, and test Layer parity.

Extend the existing contract and adapter suites before creating another fixture
family. For an important assertion, temporarily introduce the fault it claims
to catch, confirm that it fails, then restore the code. Use an independent expected
value or a real interface comparison; do not mirror implementation logic in the
test. Include the owning framework route or mount when isolated handler tests
cannot detect missing wiring. These checks should replace weak duplicate tests,
not create a mandatory mutation framework or a test for every pure transformation.

# Testing And Validation

WhatTax calculations need deterministic tests, graph validation, API tests, SDK tests and package-boundary tests.

## Deterministic Calculation Tests

Use these layers of tests:

```txt
Unit tests
  individual rule builders

Golden tests
  ATO examples and known scenarios

Property tests
  monotonicity, threshold behaviour, no negative tax unless expected

Snapshot tests
  trace output for common scenarios

Date-boundary tests
  income year boundaries, FBT year boundaries and mid-year rule changes

Cross-package tests
  salary sacrifice + super + STSL + Medicare + net pay
```

Golden tests should live with the official rule pack they validate.

## Rule Package CI Gates

Every official rule package should run:

```txt
schema validation
source reference validation
effective-date overlap checks
graph cycle checks
duplicate provider checks
golden tests
trace snapshot tests
package export tests
```

Graph validation failures are build failures.

## API And SDK Tests

The reusable API and TypeScript SDK should test:

```txt
request schema decoding
response schema encoding
OpenAPI generation
SDK client compatibility
browser-safe SDK imports
server-only handler isolation
API and direct-engine result parity
```

## Boundary Tests

Every package with isolated export paths should have package export tests. These should prove:

- browser-safe exports do not import Node-only modules
- engine packages do not import application-layer code
- server-only adapters are only reachable through explicit server export paths
- generated build output preserves the intended boundaries

## Trace Tests

Trace snapshot tests should verify:

- rule ids
- source references
- inputs and outputs
- rounding modes
- ledger component status
- explanation order

Snapshots should be stable enough for review, but not so broad that unrelated formatting changes hide calculation changes.

## Reproducibility

Calculation runs should be reproducible from immutable inputs:

```txt
accepted fact versions
rule pack versions
parameter versions
scenario dates
policies
graph hash
```

If a run cannot be reproduced, it is not suitable as an audit artifact.

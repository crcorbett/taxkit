---
status: canonical
last_reviewed: 2026-05-23
source_of_truth: docs
confidence: medium
---

# Effect Services

WhatTax uses Effect services, layers, schemas and tagged errors as the default
shape for deterministic tax calculation boundaries.

## Scope

This doc owns cross-package Effect service conventions. Rule-specific service
contracts live with their owning rule packages and should link back here.

## Service Shape

Prefer package-owned `Context.Tag` services with explicit dependencies through
the Effect `R` channel. Do not hide rule, parameter or runtime dependencies in
module globals.

Core service categories:

- fact providers for accepted input facts
- parameter services for tax-year tables and constants
- rule layers that derive facts from facts and parameters
- calculator programs that require facts and return schema-backed reports
- API and SDK services that adapt transport inputs to engine inputs

## Guardrails

- Use `Effect.Schema` for boundary and persisted values.
- Use `Layer` composition for rule packs and scenario inputs.
- Keep parameter data separate from algorithms.
- Use tagged errors for expected domain failures.
- Avoid local DTO mirrors when an owning schema already exists.
- Keep engine services independent of React, request handlers and app state.

## Related Docs

- [Facts](./facts.md)
- [Rules and parameters](./rules-and-parameters.md)
- [Calculators](./calculators.md)
- [API and SDK](./api-and-sdk.md)

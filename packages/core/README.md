---
status: canonical
last_reviewed: 2026-05-23
source_of_truth: package-readme
confidence: low
---

# Core Packages

Planned home for shared deterministic WhatTax engine primitives. This directory
is currently documentation-only: it has no package manifest, source exports or
runtime code.

## Scope

`packages/core` should eventually group foundational packages for primitives,
facts, rule descriptors, graph metadata, traces, ledgers, common tagged errors
and Effect helpers.

## Main Areas

Planned subpackages:

- `primitives`
- `facts`
- `rules`
- `graph`
- `trace`

## Runtime Shape

When implemented, core packages should be deterministic and reusable. They
should not import app runtime code, React, HTTP handlers or filesystem
adapters.

## Guardrails

- Use Effect Schema for boundary values.
- Keep money and rounding explicit.
- Use package-owned descriptors and tagged errors.
- Keep engine inputs separate from application state.
- Add tests and package exports with each implemented subpackage.

## Related Docs

- `docs/architecture/package-ownership.md`
- `docs/architecture/facts.md`
- `docs/architecture/rules-and-parameters.md`
- `docs/architecture/graph-trace-ledgers.md`

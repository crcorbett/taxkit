---
status: canonical
last_reviewed: 2026-05-23
source_of_truth: docs
confidence: medium
---

# Testing and quality

WhatTax quality depends on deterministic calculation tests, package boundary
tests, graph validation, trace snapshots, API/SDK parity and build/type health.

## Scope

This doc owns cross-cutting quality expectations. Detailed rule-package test
requirements live in [Testing and validation](./testing-and-validation.md).

## Main areas

- rule-builder unit tests
- ATO golden tests and known scenarios
- property tests for thresholds and monotonicity
- date-boundary tests
- graph validation in CI
- trace snapshots
- package export and browser-safety tests
- API and SDK parity tests

## Current baseline

The current repo baseline is scaffold-level verification:

```bash
bun run verification
```

Root verification includes lint, format, Knip and workspace type checks. For
docs, that means `apps/docs` type checking also typechecks checked examples,
and dependent package builds run before type checks through Turbo. Heavier
docs runtime gates remain explicit package commands so normal local
verification does not rebuild and validate the whole docs corpus on every
change:

```bash
bun run docs:validate
bun run docs:build
bun run --filter=@whattax/docs-content test
```

Run those package-local docs gates whenever MDX content, Fumadocs source
wiring, docs examples, validation policy or docs rendering changes.

Public API route work should also capture contract evidence from the standalone
API app:

- generated OpenAPI route evidence from `/api/docs/openapi.json`
- at least one metadata route smoke check
- at least one successful calculation route smoke check
- at least one schema-guided error response with field paths and descriptor
  help
- Changeset status evidence for package-facing changes

## Guardrails

- A rule pack is incomplete without source references and golden tests.
- Graph validation failures should fail the build.
- API responses must stay schema-backed.
- Public docs content must validate through `@whattax/docs-content` before
  documentation/runtime slices are accepted.
- Browser-safe exports must not import Node-only modules.
- Oxlint can enforce restricted APIs, such as banned `Object.*` enumeration
  helpers, but it does not currently provide a safe built-in rule for banning
  functions below a minimum line count. Prefer review and architecture guidance
  for tiny one-off wrapper or mapper helpers.
- `bun run lint` includes custom Oxlint rules for repo-specific Effect
  conventions, including the ban on manual `_tag` object literals. Use
  `Data.TaggedClass`, `Data.TaggedError`, or `Schema.TaggedClass` instead.
- `bun run lint` also enforces service/runtime boundaries: `service.ts` files
  must not export `Live`, `Mock` or `Test` layers, and runtime execution must
  stay in app entrypoints, runtime files, server files or layer boundary files.
- Calculator service code under `packages/calculators/src` has stricter custom
  Oxlint rules that ban raw `typeof`, `instanceof`, `in`, `=== undefined`,
  conditional object-spread shaping and jurisdiction/tax-year `??` defaults.
  These rules enforce Schema, Option, Match and schema-owned optional fields for
  public calculator policy. The same scope also bans raw `null` comparison,
  nested wrapper-call composition, native array pipelines, native `Map`/`Set`,
  thrown exceptions, `async`/`await`/`new Promise`, ad hoc
  `JSON.parse`/`JSON.stringify` and hidden time/randomness so calculator
  services use pipe-first composition, Effect `Array`, `Chunk`, `HashMap`,
  `HashSet`, `Effect`, `Layer`, `Clock`, `Random` and schema codecs instead of
  vanilla JavaScript/TypeScript escape hatches.
- The boundary-only decoding rollout will add
  `whattax/no-decoding-outside-boundaries` as a repository-wide custom rule.
  The rule must report executable Effect Schema decoders, direct decoder
  helpers, decoder members, statically named computed members, decoder factory
  creation and statically traceable aliases. It must not report encoding,
  schema declarations or declarative APIs such as `Schema.decodeTo`.
- `oxlint.config.ts` owns one named, exact `decodingBoundaryFiles` allowlist.
  An override may disable only `whattax/no-decoding-outside-boundaries` for an
  exact reviewed file; it must not use `ignorePatterns`, package-wide globs,
  filename-pattern exemptions, broad test exemptions or nested configuration.
  Inline `oxlint-disable` and `eslint-disable` comments naming the rule are
  forbidden and must be checked from comment tokens, not raw repository text.
- Custom-rule tests must cover prohibited and allowed Effect decoder families,
  imports and aliases, descriptor/member decoders, static computed members,
  factory creation and extraction. They must also cover a TSX decoder attempt,
  negative cases for encoding and `Schema.decodeTo`, and real Oxlint CLI
  fixtures for both a prohibited file and an exact allowlisted file. Run those
  fixture commands with `--disable-nested-config`.
- The lint rule cannot determine whether a helper owns meaningful repeated
  policy. Use the boundary contract, compile-time tests, three documented
  audit passes and parent review to reject one-use decoder/error wrappers.
- Verification evidence should be recorded in specs, task lists or exec plans
  when work spans multiple packages.

## Related Docs

- [Testing and validation](./testing-and-validation.md)
- [Graph, trace and ledgers](./graph-trace-ledgers.md)
- [API and SDK](./api-and-sdk.md)

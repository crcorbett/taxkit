# Primary Sources and Version Policy

## Installed version wins

The canonical repository/package templates are qualified with Effect 4.0.0-rc.117 and matching ecosystem packages. A receiving repository may install another version. Its exact installed source and types select the implementation; the example snapshot does not authorise a dependency upgrade. API names, module paths, services, platform packages and unstable modules can change.

Before implementing:

1. inspect `package.json` and the lockfile;
2. inspect installed `effect` exports and declaration files;
3. inspect installed platform/unstable modules;
4. research the cloned Effect v4 source when available and record its commit/version, then reconcile each approach with installed source/types;
5. compile and test the chosen API, including Schema constructors/encoding, structural key equality and scoped cache cancellation when used.

Use the current RC APIs: `Context.Service`, `Schema.TaggedError`, `Service.of`
and two-argument `Layer.effect`. Public service methods use named `Effect.fn`;
private Effect helpers normally use `Effect.fnUntraced`. Keep one current API
generation in templates and examples. Registry tags and unpinned source can
select a different generation; always check the exact installation.

Inspect the installed `effect/package.json`, `Schema.d.ts` or source, lockfile, and matching changelog/migration guide. Keep all Effect ecosystem packages on the compatible version family required by that installation.

## Official Effect sources

- [Effect website](https://effect.website/)
- [Effect introduction](https://effect.website/docs/getting-started/introduction/)
- [Configuration](https://effect.website/docs/configuration)
- [Layers](https://effect.website/docs/requirements-management/layers)
- [Logging](https://effect.website/docs/observability/logging)
- [Tracing](https://effect.website/docs/observability/tracing)
- [Metrics](https://effect.website/docs/observability/metrics)
- [API reference routing](https://effect.website/docs/additional-resources/api-reference)
- [Current Effect source repository](https://github.com/Effect-TS/effect)

Follow official documentation links for the installed platform, Schema, Stream, Scope, Schedule, testing, and persistence packages.

## Secondary repository research

DeepWiki guidance for [Effect-TS/effect](https://deepwiki.com/Effect-TS/effect) informed the vanilla-TypeScript mapping and cross-domain architecture. Treat it as secondary explanatory material. It can lag an API rename: resolve disagreements through the installed package, pinned source, changelog, and official documentation.

## Reviewed practice

The policy incorporates recurring repository patterns:

- Context services with named semantic operations;
- public operations closed over live requirements;
- `service.ts`, `live.layer.ts`, `memory.layer.ts`, `errors.ts`, and `schemas.ts`;
- Schema-tagged serialisable errors;
- SDK clients private to Layers;
- Effect Platform HttpClient/process/filesystem integration;
- Config/Redacted at the application boundary;
- flat Effect programs and exhaustive Match;
- deterministic test Layers;
- application-owned runtimes;
- Effect logging/tracing/metrics with provider query proof.

## Deliberate corrections to generic guidance

This skill is stricter than generic migration advice:

- raw Promise, fetch, environment, timer, console, mutable collection, and SDK use are confined to named host/provider adapters;
- exporter transport success is not backend ingestion proof;
- a memory Layer is not live provider proof;
- provider typings never replace runtime Schema decoding;
- pure total leaf TypeScript remains valid and should not be wrapped ceremonially.

The October 2026 qualification also checks the v4 clone at
`4a05d4914fa2327a42bd75fe77c22c188becf3b4` (rc.115) and installed rc.117/stable
4.0.0 source. Schema constructors, Option wire encoding and ordinary structured
key equality agree for these selected approaches. ScopedCache cancellation does
not: rc.117 performs the first miss in its creating caller. Do not assume
Calico's separately tested stable last-reader contract applies to that snapshot.
Preserve the receiving service's lifetime contract and qualify its exact version.

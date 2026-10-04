# Package contract

## Ownership before files

Name the capability, its callers, its untrusted boundaries, its runtime owner,
and why an existing package cannot own it. A package is justified by a stable
semantic boundary, not by file count.

Compiled packages use `tsc -p tsconfig.build.json`, relative internal imports
with explicit `.js` endings, and explicit exports. Use the same endings in
tests; TypeScript and the source consumer resolve them to the matching `.ts`
files, while ordinary ESM consumers load the emitted `.js` files. Root exports
are absent by default; an intentional root
must remain contract-only. The source condition maps to `src`, `types` to
declarations, and `default` to `dist`. `publishConfig.exports` omits the source
condition. Source-only packages point both development/default resolution at
source and explain the bundler requirement in their package README.

Required Effect service paths:

```text
src/schemas.ts
src/errors.ts
src/service.ts
src/live.layer.ts
src/test.layer.ts
src/__testing__/fixtures.ts
src/__testing__/observations.ts
test/service.test.ts
```

Use `mock.layer.ts` only when its semantics are distinct from the deterministic
test Layer. Tests live under `test/`; `src/__testing__` contains reusable setup,
fixtures, and observations only.

Each package README names the semantic owner, public/live/test export paths,
downstream architecture/proof impact, runbook applicability, and explicit
non-claims. Repository profiles—not this global contract—name exact local
commands and document paths.

## Separate source, domain and transport owners

Authored content may live in a source-only package. It exports files and source
inventory; the domain package owns the validation Schemas and source loader,
service, named errors and live/test Layers. Apps supply bundler/host adapters.
Do not give the source package another runtime or duplicate domain definitions.
HTTP, RPC and MCP reuse explicit domain exports. Client exports must resolve
without importing handlers, the live source loader, renderer or MCP server.
Check the actual browser bundle as well as the export map.

## Export proof

Consumer fixtures must prove all four modes:

1. repository source condition resolves source;
2. TypeScript resolves emitted declarations;
3. default resolution uses built JavaScript;
4. packed/publish exports omit source-only paths and conditions.

Never rely only on checking that export keys exist.

`publishConfig.exports` is not a portable manifest rewrite: npm and Bun pack may
retain the development `exports` map, while other package managers may apply the
publish map. A publishable package therefore needs the repository's explicit
staged-manifest/prepack path and tarball inspection. Prove the actual publisher
used by that repository; do not infer a clean tarball from `publishConfig`.

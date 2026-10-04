# Package variants

## Effect service

The domain package owns Schemas, errors, semantic operations, production
implementation, and deterministic substitution. The service contract contains
named operations only. The live adapter may own Config and provider decoding;
the service contract never exposes a provider SDK.

Required exports: `./schemas`, `./errors`, `./service`, `./live`, `./test`, and
narrow `./testing/*` entries.

## RPC

RPC depends inward on an existing domain service. Keep separate modules for RPC
group/schema, handlers, application client service, HTTP server Layer,
host-supplied client Layer, and in-process test client. Required exports are
`./group`, `./handlers`, `./service`, `./server`, `./live`, and `./test`.

Handler tests prove typed success/failure. A transport integration test proves
serialization and HTTP mounting. Do not duplicate domain policy in handlers.

## HTTP API

HTTP API depends inward on the same domain service. Keep API/group/schema,
status mapping, handlers, server routes, contract-only client service, browser
Fetch Layer, and host-supplied server client Layer separate. Required exports are
`./api`, `./group`, `./handlers`, `./server`, `./client/service`,
`./client/browser` and `./client/live`.

In the separate Website/API design, frontend server loaders supply the native
client with a private service-binding HttpClient to the same-stage API. Browser
clients supply the checked public API address. No frontend client imports the
domain live Layer or server handlers. In-process transport belongs to tests,
not a Website backend fallback. Integration tests cover native HTTP/RPC error
round-trips, full-read deadlines and browser preflight headers.

## Build policies

The canonical renderer implements only **compiled internal**. Apply
**source-only** or **publishable** as an explicit audit/migration after selecting
the semantic variant and reading the repository's actual bundler/publisher
contract; do not pretend one generic manifest proves them.

- Compiled internal: source/types/default conditions; private workspace package.
- Source-only: no declaration/default dist promise; document the required
  TypeScript-aware bundler.
- Publishable: explicit `files`, a repository-owned staged manifest or prepack
  transformation for the actual publisher, packed-artifact consumer proof, and
  no repository-only source condition in the tarball contract. Do not assume
  npm or Bun rewrites `exports` from `publishConfig`.

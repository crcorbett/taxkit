# Bun, CLI, Workers, and Framework Hosts

## Contents

- [Bun and Node scripts](#bun-and-node-scripts)
- [CLI contract](#cli-contract)
- [Servers](#servers)
- [Cloudflare Workers](#cloudflare-workers)
- [Vercel serverless functions](#vercelserverless-functions)
- [Alchemy](#alchemy)
- [Framework callbacks](#framework-callbacks)
- [Tests](#tests)

## Bun and Node scripts

Write scripts as flat Effect programs:

```text
decode argv/config
  -> acquire services
  -> perform named operations
  -> encode/write result
  -> map exit status at root
```

Use Effect Platform filesystem/path/command/process services where installed. Keep `Bun.argv`, `Bun.env`, process signals, and exit codes at the host adapter.

Do not:

- mix async helpers with an Effect main;
- call `process.exit` deep in code;
- throw for usage errors;
- write files through raw APIs throughout the script;
- use `console` for machine-readable output.

Separate stdout data from structured diagnostic logging.

## CLI contract

Decode arguments into a Schema-owned command union. Match exhaustively. Return tagged usage/config/operation errors.

For mutating commands:

- distinguish plan/apply;
- require exact authority;
- support non-interactive behaviour;
- produce a bounded encoded receipt;
- expose truthful exit classes.

## Servers

The server bootstrap owns:

- Config provider;
- platform Layer;
- domain live Layers;
- observability;
- runtime/server Scope;
- signal-driven shutdown.

Routes adapt protocol to domain services. Do not instantiate dependencies or read environment in each route.

## Cloudflare Workers

The module export satisfies the Worker host. Keep it thin:

- bindings → typed Layer/Config;
- Request → decoded protocol;
- one request Effect;
- encoded Response;
- background completion tied to `waitUntil`;
- application runtime reused according to platform-safe lifecycle.

Model Durable Object, Queue, scheduled, and alarm handlers as separate host adapters calling named Effects. Do not share mutable request state.

For telemetry, flush through host completion and independently prove backend ingestion.

## Vercel/serverless functions

Use the same boundary:

- one function adapter;
- decode platform request/config;
- run domain Effect;
- encode platform response.

Do not assume a long-lived global runtime will always be reused, but make reuse safe when the host retains an isolate. Scope per-invocation resources correctly.

Deployment ownership and OIDC belong to `$alchemy-iac`/platform architecture, not the domain service.

## Alchemy

`alchemy.run.ts` is an application boundary:

- decode stage/authority;
- choose state/provider Layers;
- compose stack Effect;
- execute through the required Alchemy adapter;
- return encoded safe outputs.

Keep provider services, errors, Schemas, and lifecycle in packages/modules. Do not turn the root into a 500-line program.

## Framework callbacks

If a framework expects Promise:

- bridge one named Effect through the application runtime;
- translate cancellation/abort;
- encode results;
- map errors through a closed protocol;
- do not expose runtime/service to framework callers.

## Tests

Test the domain program separately from the adapter. Adapter tests cover:

- host input decoding;
- runtime bridge;
- abort/interruption;
- response/exit encoding;
- background completion;
- shutdown;
- no secret/config leakage.

# Cloudflare

## Contents

- [Ownership decisions](#ownership-decisions)
- [File ownership](#file-ownership)
- [Worker and asset semantics](#worker-and-asset-semantics)
- [Routes zones and domains](#routes-zones-and-domains)
- [Bindings and storage](#bindings-and-storage)
- [Website origin rules](#website-origin-rules)
- [Secrets](#secrets)
- [Observability](#observability)
- [State](#state)
- [Readback checklist](#readback-checklist)

## Ownership decisions

Declare which system owns each Cloudflare lifecycle:

- Worker or static-asset deployment;
- routes and custom domains;
- DNS/zone configuration;
- R2, D1, KV, Durable Objects, Queues, or Secrets Store;
- environment secrets and bindings;
- logs, metrics, traces, and observability destinations;
- remote state infrastructure.

Do not assume Alchemy owns all Cloudflare resources because it owns one Worker.

## File ownership

For a small graph:

```text
src/lib/build/cloudflare.ts
```

For a substantial graph:

```text
src/lib/build/cloudflare/
  stack.ts
  website.ts
  worker.ts
  storage.ts
  routes.ts
  secrets.ts
  observability.ts
```

Keep stage/config Schemas outside provider declarations when other providers share them.

## Worker and asset semantics

Make asset routing policy explicit. In particular, distinguish asset-first and Worker-first behaviour and test the intended choice. A deployed Worker and green CI do not prove that static assets return the correct content type or bypass the Worker.

Test:

- root document;
- hashed CSS and JavaScript assets;
- missing assets;
- API paths;
- redirects;
- cache headers;
- content types;
- route precedence.

Record compatibility date, compatibility flags, runtime limits, module format, and bundler inputs in a stable typed owner. Keep application and deployment configuration aligned through one contract or an invariant test.

## Routes, zones, and domains

Treat a zone or domain as foreign unless this repository creates and owns it.

- Read the target zone before applying routes.
- Adopt only under explicit authority.
- Default adopted zones and routes to retain.
- Restrict Production route adoption to the Production stage.
- Reject a route whose account/zone does not match the authority record.
- Read back the route pattern and bound Worker after apply.
- Prove the public host independently.

Do not infer route correctness from a Worker URL.

## Bindings and storage

Model each binding as typed desired state:

- binding name;
- resource kind;
- physical resource identity;
- stage/environment;
- creation/adoption policy;
- removal policy.

Assert that application code and deployment configuration use the same binding names. For Durable Objects, include class name, migration/tag policy, and deployment sequencing. For R2/D1/KV, make data retention explicit and default destructive deletion to forbidden until authorised.

## Website origin rules

An origin is the protocol and host, with an optional port, such as
`http://127.0.0.1:3210`. The deployed host owns that address. Applications must
never hard-code it or build it from a stage, Worker name, account subdomain,
custom domain or development port.

For Alchemy `2.0.0-beta.79`, use the native self URL binding on the host that
needs its own address:

```typescript
const website =
  yield *
  Cloudflare.Website.Vite("Website", {
    rootDir: "apps/web",
    env: { PUBLIC_ORIGIN: Cloudflare.Worker.URL },
  });

// The same binding works in a native Worker declaration.
const api =
  yield *
  Cloudflare.Worker("Api", {
    main: "./src/worker.ts",
    env: { PUBLIC_ORIGIN: Cloudflare.Worker.URL },
  });
```

Alchemy resolves this binding to the local development proxy during local
development, the deployed `workers.dev` address, or the configured custom
domain. Do not add separate local/cloud address formulas or a copied-address
fallback. For Vite browser code, a `VITE_`-prefixed self URL binding uses the
same native resolution before the client bundle is built.

It is valid to declare a chosen custom domain as infrastructure input, for
example `domain: "app.example.com"`. Keep the application's own
`PUBLIC_ORIGIN` bound to `Cloudflare.Worker.URL`; do not repeat that domain in
its environment or build `"https://" + domain` there. Aliases and incoming
request origins are separate from the host's configured canonical address.

For a different host, use that resource's native Output, such as `api.url`.
Pass the Output to the receiving resource; check its resolved value with the
owning Schema when application code reads the binding. If the native address
can be absent, preserve that absence as `null` for an env binding and reject it
with the Schema. Do not replace an absent Output with a guessed address.

Keep expected validation failures typed. Beta.79's `Output.mapEffect` callback
accepts no expected errors, so do not force Schema decoding into it with
`Effect.orDie`. `Output.map` may select a checked resource attribute or represent
absence; it must not reconstruct the hostname. Resolve and decode Outputs
separately before writing workflow or receipt values.

Check the selected Alchemy version's self URL, Vite, native Worker and local
provider APIs before copying this example. See the
[matching primary sources](../sources.md#cloudflare-website-origins).
Local source/type checks do not prove live domain routing.

## Separate Website and native API Workers

Use standard Website.Vite for the frontend and a native Effect Worker for the
API. The root stack deploys both with exact same-stage service/public bindings.
Preview has its own API; a Website preview parent does not authorise using the
Production API. Do not wrap TanStack in a backend Worker or recreate an API
runtime around the native incoming request fibre.

Check the installed Alchemy build/runtime mechanism before reading deployment
services in a Worker declaration. The qualified beta.79 runtime build guard
removes stack-only requirements from the uploaded entry. Test the real native
entry without those services, return from startup, then request and release
resources. A typecheck or successful upload alone does not prove startup.

Test browser CORS with the native client's actual headers and an actual browser
call. Tracing headers b3 and traceparent are part of the qualified client's
request; disabling tracing to avoid preflight is not a correction. Separate
remote MCP Origin validation from matching-origin Website WebMCP registration.

## Secrets

Prefer provider-managed secret references or Secrets Store bindings over plaintext workflow values.

- Acquire credentials through redacted Config.
- Validate secret binding names and stage.
- Never emit values in plans, logs, outputs, or receipts.
- Separate credential issuance from resource apply.
- Read back metadata or binding presence, never the secret.
- Revoke disposable credentials after lifecycle proof.

## Observability

Cloudflare platform observability and application telemetry are separate sources.

For Cloudflare-native logs or destinations:

- identify Worker/service/environment/stage;
- define retention and sampling;
- read back the destination/binding;
- query the downstream provider.

For Effect OTLP export:

- keep endpoint/token in a redacted binding;
- decode the binding at application ingress;
- attach one exporter Layer to the runtime;
- preserve `waitUntil` or the host completion mechanism;
- test transport wiring;
- query Axiom independently before claiming ingestion.

## State

If Cloudflare backs Alchemy state, document bootstrap and recovery. Do not create a circular dependency between the state backend and the graph it stores. Use a separate bootstrap stack or a tested provider-supported mechanism where necessary.

## Readback checklist

After apply, query the Cloudflare API for:

- account and zone identity;
- Worker/script/service name;
- deployment/version identifier where available;
- routes/domains;
- bindings and safe resource IDs;
- compatibility settings;
- observability configuration;
- storage resource presence.

Then run the public route/asset journey. Report any unavailable readback as a non-claim.

# Effect Services, Config, Schema, and Errors

## Contents

- [Apply strict Effect architecture](#apply-strict-effect-architecture)
- [Configuration](#configuration)
- [Schemas](#schemas)
- [Errors](#errors)
- [Services and Layers](#services-and-layers)
- [Execution boundary](#execution-boundary)

## Apply strict Effect architecture

Use `$strict-effect-ts` as the full policy. Infrastructure code is not exempt from typed boundaries because it runs in a deployment tool.

Keep these concerns separate:

```text
schemas.ts       external inputs, identities, plan and receipt codecs
errors.ts        closed expected error vocabulary
service.ts       named infrastructure operations
live.layer.ts    provider clients, transport, Config, state
memory.layer.ts  deterministic provider-free implementation
alchemy.run.ts   application runtime and graph composition
```

## Configuration

Use Config for:

- provider safe identifiers;
- endpoints;
- feature/authority inputs;
- secret acquisition through redacted values;
- timeouts and retry limits.

Refine with Schema when a value has domain meaning:

- stage;
- account/project/tenant ID;
- absolute URL;
- resource name;
- source revision;
- authority record.

Read `process.env` or `Bun.env` only in the root host adapter when a required Alchemy API cannot consume Config directly. Convert immediately into Config/Schema-owned values.

## Schemas

Define Schemas for:

- root inputs;
- provider requests and responses;
- custom Resource input/output/state;
- plan entries;
- inventory/readback;
- authority;
- receipt.

Decode provider payloads immediately. Encode owned outbound payloads and durable artefacts. Avoid hand-written DTO mirrors and casts.

Native Cloudflare Workflow tasks persist and replay their results. A typed task
return can therefore be a stored reply, not an in-memory service call. Research
the installed task/bridge contract: where it returns replayed data without a
codec, check the non-void payload once with its owning Schema on return before
passing it to typed services. Keep receipts small, encode persisted data and map
invalid replies to a safe named error at the host boundary.

## Errors

Use tagged expected errors such as:

- `InvalidInfrastructureConfig`;
- `AuthorityMismatch`;
- `ProviderIdentityMismatch`;
- `ProviderReadFailed`;
- `ProviderPayloadInvalid`;
- `CapacityBlocked`;
- `PlanRejected`;
- `ReconcileFailed`;
- `DeleteForbidden`;
- `ReadbackMismatch`;
- `ReceiptEncodingFailed`.

Include bounded safe context. Do not include secret values or raw payloads.

Distinguish missing, forbidden, transient, timeout, invalid response, and conflict. Provider recovery depends on the difference.

## Services and Layers

Expose semantic operations:

- `planStack`;
- `readInventory`;
- `classifyDrift`;
- `applyExpectedPlan`;
- `readBackResource`;
- `encodeReceipt`.

Do not expose:

- raw SDK clients;
- `request(method, path, body)`;
- generic client callbacks;
- arbitrary mutation functions.

Build transport and provider requirements into `live.layer.ts`. Public operations should normally have no remaining requirements.

## Execution boundary

Construct one runtime at the application/CLI/Alchemy root. Packages must not call `Effect.runPromise`, create a global runtime, or read process environment during import.

Alchemy callbacks that require a Promise should be the narrow adapter:

1. construct or retrieve the application runtime;
2. run one named Effect;
3. convert the typed error to the host-required failure shape;
4. release the runtime with the host lifecycle.

Do not let Promise orchestration spread inward.

## Immutable checked contracts

One Schema owns each data type, meaningful brand and whole-record refinement.
Reuse those owners across provider, graph, state and receipt codecs. Do not
decode checked typed internal records again or serialize an in-memory cache key.
Construct newly constrained values through the installed fallible constructor,
map its issue to a named operation error and keep explicit identity/completeness
checks. Option owns semantic absence; a source codec preserves saved nulls and
omissions. Reproduce durable encoding/version/hash compatibility before changing it.

Use immutable Effect Array/Record/HashMap/HashSet operations and exhaustive Match.
Pure graph transformations use folds/unfolds. Shared changing state belongs in
Ref or the installed transaction primitive, with pure immutable updates. A host
callback needs an exact documented operation allowance and lifecycle test; it
does not waive strict policy for the entire infrastructure file.

Research the cloned v4 source and then check installed source/types and actual
behaviour. Preserve the native host's request execution and cleanup; introducing
a Promise runner where the host already accepts Effect changes ownership.

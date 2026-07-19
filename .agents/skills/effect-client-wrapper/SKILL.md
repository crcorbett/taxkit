---
name: effect-client-wrapper
description: "Wrap third-party SDKs and provider clients behind TaxKit Effect services. Use when integrating a Promise-based SDK or external provider so named operations, canonical schemas, immediate boundary decoding, schema-tagged errors, Config, live/mock Layers, focused tests, and stale-pattern enforcement replace raw client escape hatches."
---

# Effect Client Wrapper

Wrap a third-party client inside one exact adapter and expose only owner-named
Effect operations. The SDK is an implementation detail, not a service API.

## Read First

Read:

1. `AGENTS.md`
2. `docs/architecture/effect-services.md`
3. `docs/architecture/configuration.md`
4. `docs/design-docs/abstraction-admission.md`
5. the owning package schemas, service conventions, lint scopes, and tests

Inspect the installed SDK and Effect versions locally. Use DeepWiki through
Executor MCP only for the upstream SDK/library when local types and official
source do not answer the question. Do not use DeepWiki to inspect TaxKit.

## Non-Negotiable Rules

- Expose named domain operations, never a generic SDK `use` callback.
- Never expose the raw client on the public service or return it to consumers.
- Reuse owner-named schemas and branded IDs; never publish raw `id: string`.
- Load semantic configuration with owner-named `Config.schema` fragments and
  app-owned `ConfigProvider` composition. Do not teach primitive semantic config.
- Encode canonical input at the provider egress and decode every SDK output
  immediately at provider ingress. An unchecked SDK result must never escape.
- Model public expected failures with `Schema.TaggedErrorClass`. Translate
  provider failures once without `instanceof`, raw `_tag` checks, or an
  `unknown` public error channel.
- Keep the primary operation flat, sequential, and composable. Use the locally
  installed Effect v4 `Effect.fn` for a meaningful named operation; do not split
  one path into encode/call/decode/map helpers used once.
- Provide explicit live and deterministic mock Layers. Tests replace the public
  service, not reach through it to the SDK.
- Keep SDK construction and `Redacted.value` at the final live-adapter edge.
- Add focused encode, provider-failure, malformed-output, live-adapter, and mock
  tests plus stale-pattern scans.

## Canonical Shape

The example below is intentionally generic, but every real name must come from
the provider/domain owner.

```ts
import { Config, Context, Effect, Layer, Redacted, Schema } from "effect";

export const CustomerId = Schema.NonEmptyString.pipe(
  Schema.brand("CustomerId")
);
export type CustomerId = typeof CustomerId.Type;

export const InvoiceId = Schema.NonEmptyString.pipe(Schema.brand("InvoiceId"));
export type InvoiceId = typeof InvoiceId.Type;

export const CreateInvoiceInput = Schema.Struct({
  customerId: CustomerId,
  totalMinorUnits: Schema.Int.check(Schema.isGreaterThan(0)),
});
export type CreateInvoiceInput = typeof CreateInvoiceInput.Type;

const ProviderCreateInvoiceRequest = Schema.Struct({
  customer_id: CustomerId,
  total_minor_units: Schema.Int.check(Schema.isGreaterThan(0)),
});

export const ProviderInvoice = Schema.Struct({
  invoiceId: InvoiceId,
  status: Schema.Literals(["pending", "paid"]),
});
export type ProviderInvoice = typeof ProviderInvoice.Type;

const ProviderApiKey = Schema.Redacted(Schema.NonEmptyString);
const ProviderConfig = Config.all({
  apiKey: Config.schema(ProviderApiKey).pipe(Config.nested("PROVIDER_API_KEY")),
});

export class ProviderRequestEncodingError extends Schema.TaggedErrorClass<ProviderRequestEncodingError>()(
  "ProviderRequestEncodingError",
  {
    operation: Schema.Literal("createInvoice"),
    message: Schema.NonEmptyString,
  }
) {}

export class ProviderTransportError extends Schema.TaggedErrorClass<ProviderTransportError>()(
  "ProviderTransportError",
  {
    operation: Schema.Literal("createInvoice"),
    message: Schema.NonEmptyString,
  }
) {}

export class ProviderResponseDecodingError extends Schema.TaggedErrorClass<ProviderResponseDecodingError>()(
  "ProviderResponseDecodingError",
  {
    operation: Schema.Literal("createInvoice"),
    message: Schema.NonEmptyString,
  }
) {}

export type ProviderClientError =
  | ProviderRequestEncodingError
  | ProviderTransportError
  | ProviderResponseDecodingError;

export interface ProviderClientShape {
  readonly createInvoice: (
    input: CreateInvoiceInput
  ) => Effect.Effect<ProviderInvoice, ProviderClientError>;
}

export class ProviderClient extends Context.Service<
  ProviderClient,
  ProviderClientShape
>()("@taxkit/provider/ProviderClient") {}

interface ProviderSdk {
  readonly invoices: {
    readonly create: (
      input: typeof ProviderCreateInvoiceRequest.Encoded
    ) => Promise<unknown>;
  };
}

export const makeProviderClientLive = (
  makeSdk: (apiKey: string) => ProviderSdk
) =>
  Layer.effect(
    ProviderClient,
    Effect.gen(function* makeProviderClient() {
      const config = yield* ProviderConfig;
      const sdk = makeSdk(Redacted.value(config.apiKey));

      return ProviderClient.of({
        createInvoice: Effect.fn("ProviderClient.createInvoice")(
          function* createInvoice(input) {
            const request = yield* Schema.encodeEffect(
              ProviderCreateInvoiceRequest
            )({
              customer_id: input.customerId,
              total_minor_units: input.totalMinorUnits,
            }).pipe(
              Effect.mapError(
                () =>
                  new ProviderRequestEncodingError({
                    operation: "createInvoice",
                    message: "Unable to encode the provider invoice request.",
                  })
              )
            );

            const rawResponse = yield* Effect.tryPromise({
              try: () => sdk.invoices.create(request),
              catch: () =>
                new ProviderTransportError({
                  operation: "createInvoice",
                  message: "The provider invoice request failed.",
                }),
            });

            return yield* Schema.decodeUnknownEffect(ProviderInvoice)(
              rawResponse
            ).pipe(
              Effect.mapError(
                () =>
                  new ProviderResponseDecodingError({
                    operation: "createInvoice",
                    message: "The provider returned an invalid invoice.",
                  })
              )
            );
          }
        ),
      });
    })
  );

export const ProviderClientMock = (
  createInvoice: ProviderClientShape["createInvoice"]
) => Layer.succeed(ProviderClient, ProviderClient.of({ createInvoice }));
```

The private `ProviderSdk` type and factory remain inside the live adapter module.
If the SDK constructor can throw, wrap construction at that same edge with a
schema-tagged configuration/initialization failure. Do not export an SDK factory
from the package contract merely to make the example reusable.

## Operation Design

Keep each named operation readable in this order:

```text
canonical decoded input
  -> Schema encoder at provider egress
    -> one SDK/provider call
      -> immediate Schema decoder at provider ingress
        -> canonical decoded output
```

Map each expected failure where its context is known. Keep provider payloads,
secrets, private paths, and SDK exception objects out of public errors and logs.
Use `Match` or tagged handlers for decoded provider/domain variants.

Do not automatically retry generic provider operations. A retry policy belongs
to a named idempotent operation with explicit error classification and tests.

## Layer And Test Contract

Require focused tests for:

1. canonical request encoding and exact provider call input
2. success output decoded into the owner schema-derived type
3. malformed provider output becoming `ProviderResponseDecodingError`
4. rejected Promise becoming the safe schema-tagged transport error
5. live Layer config/SDK construction at the final adapter edge
6. deterministic mock Layer substitution without SDK access
7. no secret or raw provider payload in diagnostics

Run the owning package typecheck, tests, build, root verification, and the
repository skill-policy stale scan.

## Stale-Pattern Audit

Scan fenced code examples and changed provider services. Reject:

- generic `use` methods or callback APIs accepting the SDK
- public `client` fields or raw SDK return values
- raw identifier fields instead of owner brands
- primitive semantic `Config` constructors where `Config.schema` owns the value
- `instanceof` provider branching
- Promise results returned without immediate Schema decoding
- public `unknown` error channels or provider exception objects
- live-only services with no deterministic mock Layer
- tiny encode/call/decode/error helper chains around one operation

Update the SPEC, task list, relevant READMEs, architecture docs, lint fixtures,
skill metadata, and verification commands whenever the wrapper establishes or
changes a durable repository pattern.

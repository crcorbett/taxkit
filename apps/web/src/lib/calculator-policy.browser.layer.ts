import { CollectionPolicyHeader } from "@taxkit/analytics/schemas";
import { Effect, Layer, Schema } from "effect";
import { HttpClient, HttpClientRequest } from "effect/http";

const BrowserDoNotTrack = Schema.Union([
  Schema.Literals(["1", "0", "unspecified"]),
  Schema.Null,
  Schema.Undefined,
]);

// Read the native browser preference at each dispatch, never when the client
// is acquired. A missing/refusing host or unexpected value refuses collection
// while leaving the tax request unchanged. This adds no identity or storage.
export const BrowserCalculatorPolicyLive = Layer.effect(
  HttpClient.HttpClient,
  Effect.gen(function* () {
    const client = yield* HttpClient.HttpClient;
    return client.pipe(
      HttpClient.mapRequestEffect((request) =>
        Effect.try(() => navigator.doNotTrack).pipe(
          Effect.flatMap(Schema.decodeUnknownEffect(BrowserDoNotTrack)),
          Effect.map((value) =>
            value === "1" ? ("deny" as const) : ("allow" as const)
          ),
          Effect.catchTag("UnknownError", () =>
            Effect.succeed("deny" as const)
          ),
          Effect.catchTag("SchemaError", () => Effect.succeed("deny" as const)),
          Effect.map((policy) =>
            HttpClientRequest.setHeader(request, CollectionPolicyHeader, policy)
          )
        )
      )
    );
  })
);

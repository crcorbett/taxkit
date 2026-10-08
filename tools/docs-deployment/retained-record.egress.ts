import { Crypto, Effect, Order, Record, Schema } from "effect";
import { sort as sortArray } from "effect/Array";
import { Hex } from "effect/encoding";

import { DocsDeploymentRecordDigestError } from "./schemas.js";

const JsonObject = Schema.Record(Schema.String, Schema.Json);
const JsonArray = Schema.Array(Schema.Json);
const JsonRepresentation = Schema.fromJsonString(Schema.Json);

const canonicalJson = (
  value: Schema.Json
): Effect.Effect<string, Schema.SchemaError> => {
  if (Schema.is(JsonArray)(value)) {
    return Effect.forEach(value, canonicalJson).pipe(
      Effect.map((children) => `[${children.join(",")}]`)
    );
  }
  if (Schema.is(JsonObject)(value)) {
    const entries = sortArray(
      Order.make<readonly [string, Schema.Json]>(([left], [right]) => {
        const comparison = left.localeCompare(right);
        if (comparison < 0) {
          return -1;
        }
        if (comparison > 0) {
          return 1;
        }
        return 0;
      })
    )(Record.toEntries<string, Schema.Json>(value));
    return Effect.forEach(entries, ([key, child]) =>
      Effect.all([
        Schema.encodeEffect(JsonRepresentation)(key),
        canonicalJson(child),
      ]).pipe(
        Effect.map(
          ([encodedKey, encodedChild]) => `${encodedKey}:${encodedChild}`
        )
      )
    ).pipe(Effect.map((children) => `{${children.join(",")}}`));
  }
  return Schema.encodeEffect(JsonRepresentation)(value);
};

export const deploymentRecordDigest = (value: Schema.Json) =>
  canonicalJson(value).pipe(
    Effect.mapError(
      () => new DocsDeploymentRecordDigestError({ reason: "encode" })
    ),
    Effect.flatMap((source) =>
      Crypto.Crypto.pipe(
        Effect.flatMap((crypto) =>
          crypto.digest("SHA-256", new TextEncoder().encode(source))
        ),
        Effect.map(Hex.encode),
        Effect.map((digest) => digest.toLowerCase()),
        Effect.mapError(
          () => new DocsDeploymentRecordDigestError({ reason: "digest" })
        )
      )
    )
  );

import { readFile, writeFile } from "node:fs/promises";

import { describe, expect, it } from "@effect/vitest";
import {
  Array as EffectArray,
  Config,
  ConfigProvider,
  Effect,
  Match,
  Option,
  Order,
  Record as EffectRecord,
  Schema,
} from "effect";
import { pipe } from "effect/Function";
import type { OpenApi } from "effect/unstable/httpapi";

import { taxKitOpenApiSpec } from "../src/openapi.js";

const snapshotUrl = new URL("../__snapshots__/openapi.json", import.meta.url);

const updateOpenApiSnapshot = Config.boolean(
  "UPDATE_TAXKIT_OPENAPI_SNAPSHOT"
).pipe(Config.withDefault(false));

const JsonArray = Schema.Array(Schema.Json);
const JsonObject = Schema.Record(Schema.String, Schema.Json);

const normalizeJsonValue = (value: Schema.Json): Schema.Json => {
  const normalizeJsonArray = (array: Schema.JsonArray): Schema.JsonArray =>
    EffectArray.map(array, normalizeJsonValue);
  const normalizeJsonObject = (object: Schema.JsonObject): Schema.JsonObject =>
    pipe(
      EffectRecord.toEntries(object),
      EffectArray.sortWith(([key]) => key, Order.String),
      EffectArray.map(([key, child]): readonly [string, Schema.Json] => [
        key,
        normalizeJsonValue(child),
      ]),
      EffectRecord.fromEntries
    );

  return Schema.decodeUnknownOption(JsonArray)(value).pipe(
    Option.match({
      onNone: () =>
        Schema.decodeUnknownOption(JsonObject)(value).pipe(
          Option.match({
            onNone: () => value,
            onSome: normalizeJsonObject,
          })
        ),
      onSome: normalizeJsonArray,
    })
  );
};

const normalizeOpenApiSpec = (spec: OpenApi.OpenAPISpec) =>
  Schema.decodeUnknownEffect(Schema.Json)(spec).pipe(
    Effect.map(normalizeJsonValue)
  );

const normalizedTaxKitOpenApiSpec = normalizeOpenApiSpec(taxKitOpenApiSpec);

const formatOpenApiSnapshot = (spec: OpenApi.OpenAPISpec) =>
  normalizeOpenApiSpec(spec).pipe(
    Effect.map((normalized) => `${JSON.stringify(normalized, null, 2)}\n`)
  );

const readOpenApiSnapshot = Effect.promise(() =>
  readFile(snapshotUrl, "utf-8")
).pipe(
  Effect.flatMap(Schema.decodeUnknownEffect(Schema.fromJsonString(Schema.Json)))
);

const writeOpenApiSnapshot = formatOpenApiSnapshot(taxKitOpenApiSpec).pipe(
  Effect.flatMap((snapshot) =>
    Effect.promise(() => writeFile(snapshotUrl, snapshot))
  ),
  Effect.asVoid
);

describe("TaxKit OpenAPI snapshot", () => {
  it.effect("matches the committed normalized OpenAPI contract snapshot", () =>
    Effect.gen(function* () {
      const shouldUpdate = yield* updateOpenApiSnapshot.parse(
        ConfigProvider.fromEnv()
      );

      yield* Match.value(shouldUpdate).pipe(
        Match.when(true, () => writeOpenApiSnapshot),
        Match.orElse(() =>
          Effect.all({
            normalized: normalizedTaxKitOpenApiSpec,
            snapshot: readOpenApiSnapshot,
          }).pipe(
            Effect.map(({ normalized, snapshot }) =>
              expect(normalized).toEqual(snapshot)
            )
          )
        )
      );
    })
  );
});

import { fileURLToPath } from "node:url";

import * as NodeFileSystem from "@effect/platform-node/NodeFileSystem";
import { describe, expect, it } from "@effect/vitest";
import {
  Array as EffectArray,
  Config,
  ConfigProvider,
  Effect,
  FileSystem,
  Match,
  Option,
  Order,
  Record as EffectRecord,
  Schema,
} from "effect";
import { pipe } from "effect/Function";
import type { OpenApi } from "effect/http-api";

import { taxKitOpenApiSpec } from "../src/openapi.js";

const snapshotUrl = new URL("../__snapshots__/openapi.json", import.meta.url);

const updateOpenApiSnapshot = Config.Boolean(
  "UPDATE_TAXKIT_OPENAPI_SNAPSHOT"
).pipe(Config.withDefault(false));

const JsonArray = Schema.Array(Schema.Json);
const JsonObject = Schema.Record(Schema.String, Schema.Json);

const normalizeJsonValue = (value: Schema.Json): Schema.Json =>
  Schema.decodeUnknownOption(JsonArray)(value).pipe(
    Option.match({
      onNone: () =>
        Schema.decodeUnknownOption(JsonObject)(value).pipe(
          Option.match({
            onNone: () => value,
            onSome: (object) =>
              pipe(
                EffectRecord.toEntries(object),
                EffectArray.sortWith(([key]) => key, Order.String),
                EffectArray.map(
                  ([key, child]): readonly [string, Schema.Json] => [
                    key,
                    normalizeJsonValue(child),
                  ]
                ),
                EffectRecord.fromEntries
              ),
          })
        ),
      onSome: (array) => EffectArray.map(array, normalizeJsonValue),
    })
  );

const normalizeOpenApiSpec = (spec: OpenApi.OpenAPISpec) =>
  Schema.decodeUnknownEffect(Schema.Json)(spec).pipe(
    Effect.map(normalizeJsonValue)
  );

const normalizedTaxKitOpenApiSpec = normalizeOpenApiSpec(taxKitOpenApiSpec);

const formatOpenApiSnapshot = (spec: OpenApi.OpenAPISpec) =>
  normalizeOpenApiSpec(spec).pipe(
    Effect.flatMap(
      Schema.encodeEffect(Schema.fromJsonString(Schema.Json, { space: 2 }))
    ),
    Effect.map((encoded) => `${encoded}\n`)
  );

const readOpenApiSnapshot = Effect.gen(function* () {
  const fs = yield* FileSystem.FileSystem;
  const source = yield* fs.readFileString(fileURLToPath(snapshotUrl));
  return yield* Schema.decodeEffect(Schema.fromJsonString(Schema.Json))(source);
});

const writeOpenApiSnapshot = Effect.gen(function* () {
  const fs = yield* FileSystem.FileSystem;
  const snapshot = yield* formatOpenApiSnapshot(taxKitOpenApiSpec);
  yield* fs.writeFileString(fileURLToPath(snapshotUrl), snapshot);
});

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
    }).pipe(Effect.provide(NodeFileSystem.layer))
  );
});

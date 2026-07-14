import { readFile, writeFile } from "node:fs/promises";

import { describe, expect, it } from "@effect/vitest";
import { Config, ConfigProvider, Effect, Match, Schema } from "effect";

import {
  formatOpenApiSnapshot,
  normalizedWhatTaxOpenApiSpec,
  whatTaxOpenApiSpec,
} from "../src/openapi.js";

const snapshotUrl = new URL("../__snapshots__/openapi.json", import.meta.url);

const updateOpenApiSnapshot = Config.boolean(
  "UPDATE_WHATTAX_OPENAPI_SNAPSHOT"
).pipe(Config.withDefault(false));

const readOpenApiSnapshot = Effect.promise(() =>
  readFile(snapshotUrl, "utf-8")
).pipe(
  Effect.flatMap(Schema.decodeUnknownEffect(Schema.fromJsonString(Schema.Json)))
);

const writeOpenApiSnapshot = formatOpenApiSnapshot(whatTaxOpenApiSpec).pipe(
  Effect.flatMap((snapshot) =>
    Effect.promise(() => writeFile(snapshotUrl, snapshot))
  ),
  Effect.asVoid
);

describe("WhatTax OpenAPI snapshot", () => {
  it.effect("matches the committed normalized OpenAPI contract snapshot", () =>
    Effect.gen(function* () {
      const shouldUpdate = yield* updateOpenApiSnapshot.parse(
        ConfigProvider.fromEnv()
      );

      yield* Match.value(shouldUpdate).pipe(
        Match.when(true, () => writeOpenApiSnapshot),
        Match.orElse(() =>
          Effect.all({
            normalized: normalizedWhatTaxOpenApiSpec,
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

import {
  Array as EffectArray,
  Effect,
  Order,
  Option,
  Record as EffectRecord,
  Schema,
} from "effect";
import { pipe } from "effect/Function";
import { OpenApi } from "effect/unstable/httpapi";

import { WhatTaxApi } from "./api.js";

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

export const whatTaxOpenApiSpec: OpenApi.OpenAPISpec =
  OpenApi.fromApi(WhatTaxApi);

const normalizeOpenApiSpec = (spec: OpenApi.OpenAPISpec) =>
  Schema.decodeUnknownEffect(Schema.Json)(spec).pipe(
    Effect.map(normalizeJsonValue)
  );

export const normalizedWhatTaxOpenApiSpec =
  normalizeOpenApiSpec(whatTaxOpenApiSpec);

export const formatOpenApiSnapshot = (spec: OpenApi.OpenAPISpec) =>
  normalizeOpenApiSpec(spec).pipe(
    Effect.map((normalized) => `${JSON.stringify(normalized, null, 2)}\n`)
  );

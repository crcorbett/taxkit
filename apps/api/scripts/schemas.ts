import { Schema } from "effect";

import { ApiServerConfigSourceSchema } from "../src/schemas.js";

export const ApiSmokeSettings = Schema.Struct({
  port: ApiServerConfigSourceSchema.fields.port,
  simulateDownstreamFailure: Schema.Boolean,
});
export const ApiSmokeArguments = Schema.Union([
  Schema.Tuple([]),
  Schema.Tuple([Schema.Literal("--simulate-downstream-failure")]),
]);
export const ApiSmokeConsumerParameters = Schema.Struct({
  annualTaxCalculatorId: Schema.Literal("au.income-tax.annual"),
  origin: Schema.String,
  simulateFailure: Schema.Boolean,
  takeHomeCalculatorId: Schema.Literal("au.pay.take-home"),
});
export const ApiSmokeConsumerManifest = Schema.Struct({
  name: Schema.Literal("taxkit-api-downstream-consumer"),
  private: Schema.Literal(true),
  scripts: Schema.Struct({ smoke: Schema.Literal("bun consumer.mjs") }),
  type: Schema.Literal("module"),
});
export const ApiSmokeConsumerEvidence = Schema.Struct({
  origin: Schema.String,
  routeEvidence: Schema.Array(Schema.String),
});
export const ApiSmokeOpenApiProjection = Schema.Struct({
  openapi: Schema.NonEmptyString,
  paths: Schema.Record(Schema.String, Schema.Unknown),
});
export class ApiSmokeRouteError extends Schema.TaggedError<ApiSmokeRouteError>()(
  "ApiSmokeRouteError",
  {
    reason: Schema.Literals(["request-or-response", "timeout"]),
    route: Schema.Literals([
      "health",
      "catalog",
      "calculate",
      "openapi",
      "public-content",
    ]),
  }
) {}
export class ApiSmokeValidationError extends Schema.TaggedError<ApiSmokeValidationError>()(
  "ApiSmokeValidationError",
  {
    message: Schema.Literals([
      "Invalid API smoke settings or arguments.",
      "Calculator catalog did not include au.pay.take-home.",
      "Calculate route returned the wrong calculator id.",
      "OpenAPI document did not include the calculate route.",
      "Public documentation replies did not match their owning page.",
      "Temp workspace must be outside the repo.",
      "Failed to prepare the external HTTP consumer.",
      "Failed to remove the external HTTP consumer workspace.",
      "Failed to start the API smoke process.",
    ]),
  }
) {}
export class ApiSmokeConsumerError extends Schema.TaggedError<ApiSmokeConsumerError>()(
  "ApiSmokeConsumerError",
  {
    exitCode: Schema.Option(Schema.Finite),
    reason: Schema.Literals([
      "start-or-read",
      "exit",
      "output-limit",
      "evidence",
      "timeout",
    ]),
  }
) {}

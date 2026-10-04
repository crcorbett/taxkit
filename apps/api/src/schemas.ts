import { CalculatorRpcOrigin } from "@taxkit/api-rpc/schemas";
import { Schema } from "effect";

const ApiServerHostSchema = Schema.NonEmptyString;

const ApiServerPortSchema = Schema.Int.check(
  Schema.isBetween({
    maximum: 65_535,
    minimum: 1,
  })
);

export const ApiServerConfigSourceSchema = Schema.Struct({
  host: ApiServerHostSchema,
  port: ApiServerPortSchema,
});

export const ApiServerTcpAddressSchema = Schema.TaggedStruct("TcpAddress", {
  hostname: ApiServerHostSchema,
  port: ApiServerPortSchema,
});

export const ApiServerConfigSchema = Schema.Struct({
  address: ApiServerTcpAddressSchema,
});

export type ApiServerConfigService = Schema.Schema.Type<
  typeof ApiServerConfigSchema
>;

export class ApiServerConfigError extends Schema.TaggedError<ApiServerConfigError>()(
  "ApiServerConfigError",
  { operation: Schema.Literal("settings") }
) {}

// Reuse the checked origin policy, with a distinct identity for the website.
const ApiWebsiteOrigin = CalculatorRpcOrigin.pipe(
  Schema.brand("ApiWebsiteOrigin")
);

export const ApiWorkerSettings = Schema.Struct({
  apiOrigin: CalculatorRpcOrigin,
  websiteOrigin: ApiWebsiteOrigin,
});

export type ApiWorkerSettings = typeof ApiWorkerSettings.Type;

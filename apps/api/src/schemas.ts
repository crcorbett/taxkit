import { CalculatorRpcOrigin } from "@taxkit/api-rpc/schemas";
import { DocsWebsiteOrigin } from "@taxkit/content/schemas";
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

export const ApiWorkerSettings = Schema.Struct({
  apiOrigin: CalculatorRpcOrigin,
  websiteOrigin: DocsWebsiteOrigin,
});

export type ApiWorkerSettings = typeof ApiWorkerSettings.Type;

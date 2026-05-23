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
